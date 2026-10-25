import prisma from "@/lib/prisma";
import { ALL_PAGE_MODELS, IPHONE_CATALOG, modelToSlug } from "@/lib/catalog";
import { ALL_STORAGE, jstToday } from "@/lib/priceHistory";
import { applePrice, applePriceSource, applePriceStorages } from "@/lib/applePrices";
import { storageLabel } from "@/lib/format";
import { rethrowDuringBuild } from "@/lib/buildGuard";

/**
 * 月1回の中古iPhone相場レポート（/iphone/report/<YYYY-MM>・2026-11-01〜）の数字。
 * 1か月の相場の変化（月初と月末）・新品（Apple 公式）との差・Pro と無印の差（同じ容量）。
 *
 * 相場はサイト共通の「在庫がいちばん多い容量の中央値」（lib/modelInventory.ts の primaryMedian と同じ選び方）。
 * 在庫の行は取らない。日次の集計（PriceSnapshot・lib/priceHistory.ts）の、月初と月末の2日分（iPhone の機種 × 容量で数百行）だけを読む。
 * PriceSnapshot には Amazon の価格が入らないので、レポートにも入らない。終わった月の記録は書き換わらないので、何度ビルドしても同じ数字になる
 */

/** 最初のレポートの月（価格の記録は 2026-09-26〜。9月は月初の記録がないので出さない） */
export const REPORT_FIRST_MONTH = "2026-10";
/** 相場が数件の在庫で決まらないように（比べる2時点・2機種それぞれの在庫の件数） */
const MIN_COUNT = 5;
/** 1か月の変化を比べる機種: 月初・月末とも在庫がこの件数以上（発売直後など在庫が少ない機種は、数件の出入りで相場が大きく動くので）。20件未満は表に入れない */
const MOVE_MIN_COUNT = 20;
/** 値下がり・値上がりの表に出す機種の数 */
const TOP_MOVERS = 5;

const ymOf = (d: Date) => d.toISOString().slice(0, 7);
const nextYm = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return ymOf(new Date(Date.UTC(y, m, 1)));
};

/**
 * 公開するレポートの月（新しい順）。終わった月だけ（JST）。月の途中の月は出さない。
 * 開発時（next dev）だけ、REPORT_PREVIEW=1 で今月（途中まで）も出す
 */
export function reportMonths(now = new Date()): string[] {
  const current = ymOf(jstToday(now));
  const preview = process.env.NODE_ENV === "development" && process.env.REPORT_PREVIEW === "1";
  const out: string[] = [];
  for (let ym = REPORT_FIRST_MONTH; ym < current || (preview && ym === current); ym = nextYm(ym)) out.push(ym);
  return out.reverse();
}

/** 例: 2026年10月 */
export const monthJa = (ym: string) => `${Number(ym.slice(0, 4))}年${Number(ym.slice(5, 7))}月`;
/** レポートの公開日（翌月1日・YYYY-MM-DD） */
export const reportPublished = (ym: string) => `${nextYm(ym)}-01`;

export type MoveRow = { model: string; storage: number; start: number; end: number; startCount: number; endCount: number; diff: number; pct: number };
export type NewRow = { model: string; storage: number; used: number; count: number; newPrice: number; diff: number; pct: number; source: string };
export type ProRow = { base: string; pro: string; storage: number; baseMedian: number; proMedian: number; diff: number };

/** 1か月の変化を比べる在庫の件数（ページの注記用） */
export const REPORT_MOVE_MIN_COUNT = MOVE_MIN_COUNT;

export type MonthlyReport = {
  month: string;
  /** 比べた2日（YYYY-MM-DD）。記録がなければ null */
  startDate: string | null;
  endDate: string | null;
  /** 記録のある日数 */
  days: number;
  /** 月末が月の最終日より前（開発時の途中の月） */
  partial: boolean;
  /** 月末の iPhone の在庫の合計（全容量） */
  endStock: number;
  /** iOS 27 対応で、両方の日に在庫 MOVE_MIN_COUNT 件以上の機種（カタログの順） */
  moves: MoveRow[];
  down: MoveRow[];
  up: MoveRow[];
  newVsUsed: NewRow[];
  proVsBase: ProRow[];
};

type Cell = { median: number; min: number; count: number };

const memo = new Map<string, Promise<MonthlyReport>>();
/** ページと metadata で同じ集計を2回しないよう、ビルドのワーカーごとに月ごと1回だけ集計する */
export function getMonthlyReport(ym: string): Promise<MonthlyReport> {
  if (!memo.has(ym)) memo.set(ym, compute(ym));
  return memo.get(ym)!;
}

async function compute(ym: string): Promise<MonthlyReport> {
  const out: MonthlyReport = { month: ym, startDate: null, endDate: null, days: 0, partial: false, endStock: 0, moves: [], down: [], up: [], newVsUsed: [], proVsBase: [] };
  const [y, m] = ym.split("-").map(Number);
  const monthStart = new Date(Date.UTC(y, m - 1, 1));
  const monthLast = new Date(Date.UTC(y, m, 0));
  const slugToModel = new Map(ALL_PAGE_MODELS.map((model) => [modelToSlug(model), model] as const));
  try {
    // 記録のある日（全容量の行で数える。31行まで）
    const dates = await prisma.priceSnapshot.groupBy({
      by: ["date"],
      where: { date: { gte: monthStart, lte: monthLast }, modelSlug: { in: [...slugToModel.keys()] }, storage: ALL_STORAGE },
      _sum: { count: true },
      orderBy: { date: "asc" },
    });
    if (dates.length === 0) return out;
    const first = dates[0].date;
    const last = dates[dates.length - 1].date;
    out.startDate = first.toISOString().slice(0, 10);
    out.endDate = last.toISOString().slice(0, 10);
    out.days = dates.length;
    out.partial = last.getTime() < monthLast.getTime();
    out.endStock = dates[dates.length - 1]._sum.count ?? 0;

    // 月初と月末の2日分の容量ごとの行
    const rows = await prisma.priceSnapshot.findMany({
      where: { date: { in: [first, last] }, modelSlug: { in: [...slugToModel.keys()] }, storage: { not: ALL_STORAGE } },
      select: { date: true, modelSlug: true, storage: true, medianPrice: true, minPrice: true, count: true },
    });
    // 日 → 機種 → 容量 → 集計
    const at = { start: new Map<string, Map<number, Cell>>(), end: new Map<string, Map<number, Cell>>() };
    for (const r of rows) {
      const model = slugToModel.get(r.modelSlug)!;
      const cell = { median: r.medianPrice, min: r.minPrice, count: r.count };
      // 月初と月末が同じ日（記録1日）なら両方に入れる
      if (r.date.getTime() === first.getTime()) (at.start.get(model) ?? at.start.set(model, new Map()).get(model)!).set(r.storage, cell);
      if (r.date.getTime() === last.getTime()) (at.end.get(model) ?? at.end.set(model, new Map()).get(model)!).set(r.storage, cell);
    }

    // 在庫がいちばん多い容量（同じなら小さい容量）。lib/modelInventory.ts の primaryMedian と同じ選び方
    const topStorage = (byStorage: Map<number, Cell> | undefined) => {
      if (!byStorage) return null;
      let best: { storage: number; cell: Cell } | null = null;
      for (const [storage, cell] of byStorage) {
        if (!best || cell.count > best.cell.count || (cell.count === best.cell.count && storage < best.storage)) best = { storage, cell };
      }
      return best;
    };

    // 1か月の変化: 月末の相場の容量で、月初の同じ容量と比べる。iOS 27 対応の機種だけ（/iphone の本表と同じ。旧機種が上位を占めないように）
    if (first.getTime() !== last.getTime()) {
      for (const model of IPHONE_CATALOG.flatMap((s) => s.models)) {
        const top = topStorage(at.end.get(model));
        const start = at.start.get(model)?.get(top?.storage ?? -1);
        if (!top || !start || top.cell.count < MOVE_MIN_COUNT || start.count < MOVE_MIN_COUNT) continue;
        const diff = top.cell.median - start.median;
        out.moves.push({ model, storage: top.storage, start: start.median, end: top.cell.median, startCount: start.count, endCount: top.cell.count, diff, pct: Math.round((diff / start.median) * 1000) / 10 });
      }
      out.down = out.moves.filter((r) => r.diff < 0).sort((a, b) => a.pct - b.pct || a.diff - b.diff).slice(0, TOP_MOVERS);
      out.up = out.moves.filter((r) => r.diff > 0).sort((a, b) => b.pct - a.pct || b.diff - a.diff).slice(0, TOP_MOVERS);
    }

    // 新品との差: Apple 公式の価格がある容量のうち、月末の在庫がいちばん多い容量（在庫5件以上）
    for (const model of ALL_PAGE_MODELS) {
      const byStorage = at.end.get(model);
      const source = applePriceSource(model);
      if (!byStorage || !source) continue;
      const cands = applePriceStorages(model)
        .map((storage) => ({ storage, cell: byStorage.get(storage) }))
        .filter((c): c is { storage: number; cell: Cell } => !!c.cell && c.cell.count >= MIN_COUNT)
        .sort((a, b) => b.cell.count - a.cell.count || a.storage - b.storage);
      const c = cands[0];
      if (!c) continue;
      const newPrice = applePrice(model, c.storage)!;
      const diff = newPrice - c.cell.median;
      out.newVsUsed.push({ model, storage: c.storage, used: c.cell.median, count: c.cell.count, newPrice, diff, pct: Math.round((diff / newPrice) * 1000) / 10, source });
    }

    // Pro と無印: 同じ世代の「iPhone N」と「iPhone N Pro」。両方に在庫5件以上のいちばん小さい容量（lib/priceFactors.ts の世代の比べ方と同じ）
    for (const base of ALL_PAGE_MODELS.filter((n) => /^iPhone \d+$/.test(n))) {
      const pro = `${base} Pro`;
      const [a, b] = [at.end.get(base), at.end.get(pro)];
      if (!a || !b) continue;
      const gb = [...a.keys()].filter((g) => (a.get(g)?.count ?? 0) >= MIN_COUNT && (b.get(g)?.count ?? 0) >= MIN_COUNT).sort((x, z) => x - z)[0];
      if (gb === undefined) continue;
      const [bm, pm] = [a.get(gb)!.median, b.get(gb)!.median];
      out.proVsBase.push({ base, pro, storage: gb, baseMedian: bm, proMedian: pm, diff: pm - bm });
    }
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("monthly report failed:", error);
  }
  return out;
}

/** 12345 → "1.2万円"（マイナスは「−」を付ける） */
const man = (n: number) => `${n < 0 ? "−" : ""}${(Math.round(Math.abs(n) / 1000) / 10).toFixed(1)}万円`;
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** -2.4 → "−2.4%"・3 → "+3.0%"・0 → "±0.0%" */
export const signedPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(1)}%`;
const jaDay = (iso: string) => `${Number(iso.slice(5, 7))}月${Number(iso.slice(8, 10))}日`;

/** 冒頭の要約（数字入り・1行ずつ。AI・メディアが引用しやすいよう、1行で意味が通る文にする）。ページ・metadata・構造化データで共通 */
export function reportSummary(r: MonthlyReport): string[] {
  if (!r.startDate || !r.endDate) return [];
  const lines: string[] = [];
  const span = `${jaDay(r.startDate)}〜${jaDay(r.endDate)}`;
  if (r.moves.length) {
    const downN = r.moves.filter((x) => x.diff < 0).length;
    const upN = r.moves.filter((x) => x.diff > 0).length;
    const mean = Math.round(avg(r.moves.map((x) => x.pct)) * 10) / 10;
    lines.push(`${monthJa(r.month)}（${span}）、iOS 27 に対応する中古iPhone ${r.moves.length}機種の相場は平均${signedPct(mean)}。値下がり${downN}機種・値上がり${upN}機種でした。`);
  }
  const d = r.down[0];
  if (d) lines.push(`いちばん値下がりしたのは${d.model}（${storageLabel(d.storage, d.model)}）で、${d.start.toLocaleString()}円→${d.end.toLocaleString()}円（${signedPct(d.pct)}・−${Math.abs(d.diff).toLocaleString()}円）。`);
  if (r.newVsUsed.length) {
    const cheaper = r.newVsUsed.filter((x) => x.diff > 0);
    const higher = r.newVsUsed.filter((x) => x.diff < 0).map((x) => x.model);
    const best = [...r.newVsUsed].sort((a, b) => b.pct - a.pct)[0];
    const range = cheaper.length === 1 ? `${cheaper[0].pct.toFixed(1)}%` : `${Math.min(...cheaper.map((x) => x.pct)).toFixed(1)}〜${Math.max(...cheaper.map((x) => x.pct)).toFixed(1)}%`;
    lines.push(cheaper.length
      ? `Apple 公式で新品を売っている${r.newVsUsed.length}機種のうち${cheaper.length}機種で、中古の相場は新品より${range}安い（差が最大は${best.model} ${storageLabel(best.storage, best.model)}の${best.diff.toLocaleString()}円）。` +
        (higher.length ? `${higher.join("・")}は中古の相場が新品より高い状態でした。` : "")
      : `Apple 公式で新品を売っている${r.newVsUsed.length}機種では、中古の相場が新品と同じか高い状態でした。`);
  }
  if (r.proVsBase.length) {
    const diffs = r.proVsBase.map((x) => x.diff);
    lines.push(`同じ容量で比べると、Pro は無印より平均${man(avg(diffs))}高い（${r.proVsBase.length}世代・${man(Math.min(...diffs))}〜${man(Math.max(...diffs))}）。`);
  }
  return lines;
}
