/**
 * 値動きの速報（X の投稿・ショートの候補）を価格推移の記録（PriceSnapshot）から探す。読むだけ（DB に書かない）
 *   npx tsx scripts/price-alerts.ts [--date YYYY-MM-DD] [--json]
 *
 * 相場はサイト共通の「在庫がいちばん多い容量の中央値」（対象日の記録で容量を決める。なければ全容量）。
 * 見つけるもの:
 *   1. 相場の値下がり・値上がり（7日。±2日以内でいちばん近い日と比べる。±3%以上・両日とも在庫20件以上）
 *   2. 最安値の更新（30日。前の30日の最安より1,000円以上安い・在庫5件以上）
 *   3. 新品（公式）との差の逆転（約7日前と比べて、中古の相場−新品の符号が変わった・両日とも在庫20件以上）
 *   4. 新しい機種の入荷（対象日にあって前の14日にない機種）＋カタログにない機種名（在庫の機種名ごとの件数。DB 側で集計）
 *   5. 要確認（直近8日の前日比 ±30%以上・在庫20件以上）→ 1〜3から外す
 * 何もなければ「なし」と出す（数を合わせない）。
 *
 * Neon の転送量を守るため、在庫の行は取らない。PriceSnapshot は
 *   ①対象日（以前でいちばん新しい日）を1行 ②その日の全行 ③35日分の相場の容量の行＋14日分の全容量の行
 * の3回（①は1行）。在庫（DeviceInventory）は機種名ごとの件数の groupBy を1回。
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { ALL_CATALOG_MODELS, ALL_DEVICE_PAGE_MODELS, deviceOf, modelPagePath, modelToSlug, type Device } from "@/lib/catalog";
import { ALL_STORAGE } from "@/lib/priceHistory";
import { applePrice } from "@/lib/applePrices";
import { officialPrice } from "@/lib/officialPrices";
import { storageLabel, yen } from "@/lib/format";
import { matchesModel } from "@/lib/modelMatch";

// ── しきい値 ─────────────────────────────────────────────
const MOVE_PCT = 3; // 7日の相場の変化（%）
const MOVE_MIN_COUNT = 20; // 7日の比較: 両日とも在庫この件数以上
const LOW_MIN_DROP = 1000; // 最安値の更新: 前の30日の最安より何円安いか
const LOW_MIN_COUNT = 5; // 最安値の更新: 対象日の在庫この件数以上（1件だけの外れ値を除く）
const LOW_MIN_DAYS = 7; // 最安値の更新: 前の30日のうち記録がこの日数以上（記録の始めたばかりは除く）
const NEW_MIN_COUNT = 20; // 新品との逆転: 両日とも在庫この件数以上（5件では数件の出入りで逆転する。10/18 の iPhone 18 Pro Max 2TB は在庫7→5件で「逆転」した）
const SPIKE_PCT = 30; // 要確認: 前日比（%）
const SPIKE_MIN_COUNT = 20; // 要確認: 両日とも在庫この件数以上
const SPIKE_DAYS = 8; // 要確認: 直近何日の前日比を見るか（7日の比較の期間）
const NEW_MODEL_DAYS = 14; // 新しい機種: 前の何日に記録がないか
const UNKNOWN_MIN_COUNT = 3; // カタログにない機種名: 在庫この件数以上だけ
const UNKNOWN_TOP = 10;

// ── 引数 ─────────────────────────────────────────────────
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const dateArg = (() => {
  const i = args.indexOf("--date");
  return i >= 0 ? args[i + 1] : undefined;
})();
if (dateArg !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
  console.error("使い方: npx tsx scripts/price-alerts.ts [--date YYYY-MM-DD] [--json]");
  process.exit(1);
}

// ── 日付 ─────────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const jstTodayIso = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const md = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;

// ── 表示 ─────────────────────────────────────────────────
const pct1 = (n: number) => Math.round(n * 10) / 10;
const signedYen = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toLocaleString()}円`;
const signedPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(1)}%`;
const capOf = (storage: number, model: string) => (storage === ALL_STORAGE ? "全容量" : storageLabel(storage, model));

/** X の重み付き文字数（.claude/skills/x-ops/xlen.py と同じ: URL=23、U+0000-10FF などは1、それ以外は2） */
function xWeight(text: string): number {
  let n = 0;
  for (const part of text.normalize("NFC").split(/(https?:\/\/\S+)/)) {
    if (/^https?:\/\//.test(part)) {
      n += 23;
      continue;
    }
    for (const ch of part) {
      const o = ch.codePointAt(0)!;
      n += o <= 0x10ff || (o >= 0x2000 && o <= 0x200d) || (o >= 0x2010 && o <= 0x201f) || (o >= 0x2032 && o <= 0x2037) ? 1 : 2;
    }
  }
  return n;
}

const HASHTAG: Record<Device, string> = {
  iphone: "#中古iPhone",
  ipad: "#中古iPad",
  pixel: "#中古Pixel",
  galaxy: "#中古Galaxy",
  mac: "#中古MacBook",
  xperia: "#中古Xperia",
  aquos: "#中古AQUOS",
  watch: "#AppleWatch",
};

// ── 型 ───────────────────────────────────────────────────
type Row = { date: Date; modelSlug: string; storage: number; minPrice: number; medianPrice: number; count: number };
type Point = { date: string; min: number; median: number; count: number };

type MoveItem = { model: string; storage: number; storageLabel: string; fromDate: string; toDate: string; before: number; after: number; diff: number; pct: number; beforeCount: number; afterCount: number };
type LowItem = { model: string; storage: number; storageLabel: string; date: string; min: number; prevLow: number; prevLowDate: string; diff: number; count: number; median: number };
type FlipItem = { model: string; storage: number; storageLabel: string; fromDate: string; toDate: string; newPrice: number; before: number; after: number; gapBefore: number; gapAfter: number; beforeCount: number; afterCount: number; direction: "中古が新品より安くなった" | "中古が新品より高くなった" };
type NewModelItem = { model: string; storage: number; storageLabel: string; min: number; median: number; count: number; totalCount: number; newPrice: number | null };
type UnknownName = { modelName: string; count: number };
type SpikeItem = { model: string; storage: number; storageLabel: string; fromDate: string; toDate: string; before: number; after: number; pct: number; beforeCount: number; afterCount: number };
type Draft = { kind: string; model: string; text: string; weight: number };

async function main() {
  const target = dateArg ?? jstTodayIso();
  const targetDate = new Date(`${target}T00:00:00Z`);
  const slugToModel = new Map(ALL_DEVICE_PAGE_MODELS.map((m) => [modelToSlug(m), m] as const));
  let queries = 0;
  let rowsRead = 0;

  // ① 対象日（指定日以前でいちばん新しい記録の日）
  const latestRow = await prisma.priceSnapshot.findFirst({ where: { date: { lte: targetDate } }, orderBy: { date: "desc" }, select: { date: true } });
  queries++;
  rowsRead += latestRow ? 1 : 0;
  if (!latestRow) {
    console.log(`${target} 以前の価格の記録がありません`);
    return;
  }
  const latest = latestRow.date;
  const latestIso = iso(latest);
  const since = addDays(latest, -35);

  // ② 対象日の全行（相場の容量を決める・新しい機種）
  const latestRows: Row[] = await prisma.priceSnapshot.findMany({
    where: { date: latest },
    select: { date: true, modelSlug: true, storage: true, minPrice: true, medianPrice: true, count: true },
  });
  queries++;
  rowsRead += latestRows.length;

  // 機種ごとの相場の容量（在庫がいちばん多い容量・同じなら小さい容量。lib/modelInventory.ts の primaryMedian と同じ）。容量の行がなければ全容量
  const primary = new Map<string, Row>();
  const totalOf = new Map<string, Row>();
  for (const r of latestRows) {
    if (!slugToModel.has(r.modelSlug)) continue;
    if (r.storage === ALL_STORAGE) {
      totalOf.set(r.modelSlug, r);
      continue;
    }
    const cur = primary.get(r.modelSlug);
    if (!cur || r.count > cur.count || (r.count === cur.count && r.storage < cur.storage)) primary.set(r.modelSlug, r);
  }
  for (const [slug, r] of totalOf) if (!primary.has(slug)) primary.set(slug, r);

  // ③ 35日分の相場の容量の行と、14日分の全容量の行（全容量は新しい機種の判定に使う）
  const pairs = [...primary.entries()].filter(([, r]) => r.storage !== ALL_STORAGE).map(([slug, r]) => ({ modelSlug: slug, storage: r.storage }));
  const hist: Row[] = await prisma.priceSnapshot.findMany({
    where: { date: { gte: since, lt: latest }, OR: [{ storage: ALL_STORAGE, date: { gte: addDays(latest, -NEW_MODEL_DAYS) } }, ...pairs] },
    select: { date: true, modelSlug: true, storage: true, minPrice: true, medianPrice: true, count: true },
  });
  queries++;
  rowsRead += hist.length;

  // 機種 → 相場の容量の推移（古い順・対象日を含む）
  const series = new Map<string, Point[]>();
  const seenBefore = new Set<string>(); // 前の14日に全容量の記録がある機種
  const newSince = addDays(latest, -NEW_MODEL_DAYS);
  for (const r of hist) {
    if (r.storage === ALL_STORAGE && r.date >= newSince) seenBefore.add(r.modelSlug);
    const p = primary.get(r.modelSlug);
    if (!p || r.storage !== p.storage) continue;
    (series.get(r.modelSlug) ?? series.set(r.modelSlug, []).get(r.modelSlug)!).push({ date: iso(r.date), min: r.minPrice, median: r.medianPrice, count: r.count });
  }
  for (const [slug, p] of primary) {
    const s = series.get(slug) ?? series.set(slug, []).get(slug)!;
    s.push({ date: latestIso, min: p.minPrice, median: p.medianPrice, count: p.count });
    s.sort((a, b) => a.date.localeCompare(b.date));
  }

  // 約7日前の比較日: latest−7 に最も近い記録の日（±2日以内）。機種ごとに選ぶ（記録の抜けに合わせて）
  const weekAgo = iso(addDays(latest, -7));
  const nearWeekAgo = (s: Point[]): Point | null => {
    let best: Point | null = null;
    let bestGap = Infinity;
    for (const p of s) {
      if (p.date === latestIso) continue;
      const gap = Math.abs(new Date(`${p.date}T00:00:00Z`).getTime() - new Date(`${weekAgo}T00:00:00Z`).getTime()) / DAY;
      // 同じ近さなら古い方（7日以上の間隔）
      if (gap <= 2 && gap < bestGap) {
        best = p;
        bestGap = gap;
      }
    }
    return best;
  };

  // 5. 要確認: 直近 SPIKE_DAYS 日の前日比（記録の連続した2日）
  const spikeFrom = iso(addDays(latest, -SPIKE_DAYS));
  const spikes: SpikeItem[] = [];
  const spikeSlugs = new Set<string>();
  for (const [slug, s] of series) {
    const model = slugToModel.get(slug)!;
    const storage = primary.get(slug)!.storage;
    const recent = s.filter((p) => p.date >= spikeFrom);
    for (let i = 1; i < recent.length; i++) {
      const [a, b] = [recent[i - 1], recent[i]];
      if (a.count < SPIKE_MIN_COUNT || b.count < SPIKE_MIN_COUNT) continue;
      const pct = ((b.median - a.median) / a.median) * 100;
      if (Math.abs(pct) < SPIKE_PCT) continue;
      spikes.push({ model, storage, storageLabel: capOf(storage, model), fromDate: a.date, toDate: b.date, before: a.median, after: b.median, pct: pct1(pct), beforeCount: a.count, afterCount: b.count });
      spikeSlugs.add(slug);
    }
  }

  // 1. 7日の値下がり・値上がり／3. 新品との差の逆転
  const moves: MoveItem[] = [];
  const flips: FlipItem[] = [];
  const compareDates = new Set<string>();
  for (const [slug, s] of series) {
    if (spikeSlugs.has(slug)) continue;
    const model = slugToModel.get(slug)!;
    const storage = primary.get(slug)!.storage;
    const now = s[s.length - 1];
    const then = nearWeekAgo(s);
    if (!then) continue;
    compareDates.add(then.date);
    const diff = now.median - then.median;
    const pct = (diff / then.median) * 100;
    if (Math.abs(pct) >= MOVE_PCT && now.count >= MOVE_MIN_COUNT && then.count >= MOVE_MIN_COUNT) {
      moves.push({ model, storage, storageLabel: capOf(storage, model), fromDate: then.date, toDate: now.date, before: then.median, after: now.median, diff, pct: pct1(pct), beforeCount: then.count, afterCount: now.count });
    }
    if (storage !== ALL_STORAGE) {
      const newPrice = applePrice(model, storage) ?? officialPrice(model, storage);
      if (newPrice !== null && now.count >= NEW_MIN_COUNT && then.count >= NEW_MIN_COUNT) {
        const [gapBefore, gapAfter] = [then.median - newPrice, now.median - newPrice];
        if (Math.sign(gapBefore) !== Math.sign(gapAfter) && gapAfter !== 0) {
          flips.push({
            model, storage, storageLabel: capOf(storage, model), fromDate: then.date, toDate: now.date, newPrice,
            before: then.median, after: now.median, gapBefore, gapAfter, beforeCount: then.count, afterCount: now.count,
            direction: gapAfter < 0 ? "中古が新品より安くなった" : "中古が新品より高くなった",
          });
        }
      }
    }
  }
  const drops = moves.filter((m) => m.diff < 0).sort((a, b) => a.pct - b.pct || a.diff - b.diff);
  const rises = moves.filter((m) => m.diff > 0).sort((a, b) => b.pct - a.pct || b.diff - a.diff);

  // 2. 最安値の更新（30日）
  const lowFrom = iso(addDays(latest, -30));
  const lows: LowItem[] = [];
  for (const [slug, s] of series) {
    if (spikeSlugs.has(slug)) continue;
    const model = slugToModel.get(slug)!;
    const storage = primary.get(slug)!.storage;
    const now = s[s.length - 1];
    const prev = s.filter((p) => p.date >= lowFrom && p.date < latestIso);
    if (now.count < LOW_MIN_COUNT || prev.length < LOW_MIN_DAYS) continue;
    const low = prev.reduce((a, b) => (b.min < a.min ? b : a));
    if (now.min < low.min && low.min - now.min >= LOW_MIN_DROP) {
      lows.push({ model, storage, storageLabel: capOf(storage, model), date: now.date, min: now.min, prevLow: low.min, prevLowDate: low.date, diff: now.min - low.min, count: now.count, median: now.median });
    }
  }
  lows.sort((a, b) => a.diff / a.prevLow - b.diff / b.prevLow);

  // 4. 新しい機種の入荷（対象日にあって、前の14日に全容量の記録がない）
  //    記録の初日から14日たたないうちは、全機種が「新しい」に見えるので出さない
  const firstHist = hist.reduce<Date | null>((a, r) => (!a || r.date < a ? r.date : a), null);
  const enoughHistory = !!firstHist && firstHist <= newSince;
  const newModels: NewModelItem[] = [];
  if (enoughHistory) {
    for (const [slug, total] of totalOf) {
      if (seenBefore.has(slug)) continue;
      const model = slugToModel.get(slug)!;
      const p = primary.get(slug)!;
      newModels.push({
        model, storage: p.storage, storageLabel: capOf(p.storage, model), min: total.minPrice, median: p.medianPrice, count: p.count, totalCount: total.count,
        newPrice: p.storage === ALL_STORAGE ? null : (applePrice(model, p.storage) ?? officialPrice(model, p.storage)),
      });
    }
  }

  // 4b. カタログにない機種名（いまの在庫。機種名ごとの件数を DB で集計。行は取らない）。対象日を過去にしたときは出さない（在庫はいまのものしかない）
  let unknownNames: UnknownName[] | null = null;
  const isToday = latestIso >= iso(addDays(new Date(`${jstTodayIso()}T00:00:00Z`), -1));
  if (isToday) {
    const groups = await prisma.deviceInventory.groupBy({ by: ["modelName"], where: { isSoldOut: false }, _count: { _all: true } });
    queries++;
    rowsRead += groups.length;
    unknownNames = groups
      .filter((g) => g._count._all >= UNKNOWN_MIN_COUNT && !ALL_DEVICE_PAGE_MODELS.some((m) => matchesModel(m, g.modelName)))
      .map((g) => ({ modelName: g.modelName, count: g._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, UNKNOWN_TOP);
  }

  // ── X の下書き（強いものから2本まで。優先: 新機種 > 新品との逆転 > 最安値 > 7日の値下がり。同じ機種は1本だけ） ──
  const v = latestIso.replace(/-/g, "");
  const urlOf = (model: string) => `https://used.gadelog.com${modelPagePath(model)}?utm_source=x&utm_medium=social&utm_campaign=post&v=${v}`;
  const tagOf = (model: string) => HASHTAG[deviceOf(model)];
  /** 必須の行と、長いときに後ろから削る行。280 以内になるまで削る */
  const fit = (kind: string, model: string, head: string[], optional: string[], tail: string[]): Draft | null => {
    const opt = [...optional];
    for (;;) {
      const text = [...head, ...opt, ...tail].join("\n").replace(/\n{3,}/g, "\n\n");
      const weight = xWeight(text);
      if (weight <= 280) return { kind, model, text, weight };
      if (opt.length === 0) return null;
      opt.pop();
    }
  };
  const candidates: (() => Draft | null)[] = [];
  for (const n of newModels) {
    candidates.push(() =>
      fit("新しい機種の入荷", n.model,
        [`【中古に初入荷】${n.model}`, "", `中古の在庫が出はじめました（${n.totalCount}件）`, `最安 ${yen(n.min)}`, `相場（${n.storageLabel}）${yen(n.median)}`],
        [...(n.newPrice ? [`新品（公式）${yen(n.newPrice)}`] : []), "", "出たばかりの機種は", "数が増えると下がりやすいです"],
        ["", "今すぐ買いますか？待ちますか？", urlOf(n.model), tagOf(n.model)]),
    );
  }
  for (const f of flips) {
    const cheaper = f.gapAfter < 0;
    candidates.push(() =>
      fit("新品との差の逆転", f.model,
        [cheaper ? `【中古が新品より安くなりました】` : `【中古が新品より高くなりました】`, `${f.model}（${f.storageLabel}）`, "", `中古の相場 ${yen(f.before)}→${yen(f.after)}`, `新品（公式）${yen(f.newPrice)}`, `差 ${signedYen(f.gapAfter)}（${md(f.fromDate)}は${signedYen(f.gapBefore)}）`],
        ["", cheaper ? "保証の長さを考えると" : "この差なら", cheaper ? "まだ新品と迷う差です" : "新品を選ぶ手もあります"],
        ["", cheaper ? "この差なら中古にしますか？" : "中古と新品、どちらにしますか？", urlOf(f.model), tagOf(f.model)]),
    );
  }
  for (const l of lows) {
    candidates.push(() =>
      fit("最安値の更新", l.model,
        [`【30日でいちばん安い】${l.model}`, "", `最安 ${yen(l.min)}（${l.storageLabel}）`, `30日の最安 ${yen(l.prevLow)}より${signedYen(l.diff)}`, `相場は${yen(l.median)}・在庫${l.count}件`],
        ["", "最安の1台は", "状態ランクとバッテリーも確認を"],
        ["", "この値段なら買いますか？", urlOf(l.model), tagOf(l.model)]),
    );
  }
  for (const d of drops) {
    candidates.push(() =>
      fit("7日の値下がり", d.model,
        [`【1週間で値下がり】${d.model}`, "", `相場（${d.storageLabel}）`, `${md(d.fromDate)} ${yen(d.before)}`, `${md(d.toDate)} ${yen(d.after)}`, `${signedYen(d.diff)}（${signedPct(d.pct)}）`],
        [`在庫${d.afterCount}件の中央値です`, "", d.model.startsWith("iPhone") ? "バッテリー85%以上で選ぶのが安心" : "状態ランクとバッテリーも確認を"],
        ["", "そろそろ買い時だと思いますか？", urlOf(d.model), tagOf(d.model)]),
    );
  }
  const drafts: Draft[] = [];
  for (const make of candidates) {
    if (drafts.length >= 2) break;
    const d = make();
    if (d && !drafts.some((x) => x.model === d.model)) drafts.push(d);
  }

  // ── ショートの候補（drops は iOS 27 対応の iPhone だけ・3機種以上） ──
  const iphoneSet = new Set(ALL_CATALOG_MODELS);
  const iphoneDrops = drops.filter((d) => iphoneSet.has(d.model));
  const short = iphoneDrops.length >= 3
    ? { command: "npx tsx shorts/make-short.tsx drops plan --days 7", note: `iOS 27 対応の iPhone の値下がり ${iphoneDrops.length}機種（台本は実行した日の記録で作られる）` }
    : { command: null, note: `候補なし（値下がりが3機種に満たない。iOS 27 対応の iPhone は ${iphoneDrops.length}機種）` };

  const result = {
    target,
    latestDate: latestIso,
    compareDates: [...compareDates].sort(),
    models: primary.size,
    drops, rises, lows, flips, newModels, unknownNames, spikes,
    drafts,
    short,
    stats: { queries, rowsRead },
  };

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // ── テキスト ──
  const out: string[] = [];
  const line = (s = "") => out.push(s);
  const section = (title: string, rows: string[], none = "なし") => {
    line(`■ ${title}`);
    if (rows.length === 0) line(`  ${none}`);
    else for (const r of rows) line(`  ${r}`);
    line();
  };
  const cd = result.compareDates;
  line(`値動きの速報  対象日 ${latestIso}${latestIso !== target ? `（指定 ${target} の記録がないので直前の日）` : ""}`);
  line(`比較日 ${cd.length ? (cd.length === 1 ? cd[0] : `${cd[0]}〜${cd[cd.length - 1]}`) : "なし（7日前±2日の記録がない）"}  機種 ${primary.size}  ` +
    `値下がり ${drops.length}・値上がり ${rises.length}・最安値 ${lows.length}・新品との逆転 ${flips.length}・新機種 ${newModels.length}・要確認 ${spikes.length}`);
  line(`（相場＝対象日に在庫がいちばん多い容量の中央値。DB 読み取り ${queries}回・約${rowsRead}行）`);
  line();
  const moveRow = (m: MoveItem) => `${m.model}（${m.storageLabel}） ${yen(m.before)}→${yen(m.after)}  ${signedYen(m.diff)}（${signedPct(m.pct)}）  在庫 ${m.beforeCount}→${m.afterCount}件  ${md(m.fromDate)}→${md(m.toDate)}`;
  section(`相場の値下がり（7日・${MOVE_PCT}%以上・在庫${MOVE_MIN_COUNT}件以上）`, drops.map(moveRow));
  section(`相場の値上がり（7日・${MOVE_PCT}%以上・在庫${MOVE_MIN_COUNT}件以上）`, rises.map(moveRow));
  section(`最安値の更新（30日・${LOW_MIN_DROP.toLocaleString()}円以上・在庫${LOW_MIN_COUNT}件以上）`,
    lows.map((l) => `${l.model}（${l.storageLabel}） 最安 ${yen(l.prevLow)}（${md(l.prevLowDate)}）→${yen(l.min)}  ${signedYen(l.diff)}（${signedPct((l.diff / l.prevLow) * 100)}）  在庫${l.count}件・相場${yen(l.median)}`));
  section("新品（公式）との差の逆転（約7日前と比べて）",
    flips.map((f) => `${f.model}（${f.storageLabel}） ${f.direction}  新品 ${yen(f.newPrice)}  中古の相場 ${yen(f.before)}→${yen(f.after)}  差 ${signedYen(f.gapBefore)}→${signedYen(f.gapAfter)}  在庫 ${f.beforeCount}→${f.afterCount}件`));
  section(`新しい機種の入荷（前の${NEW_MODEL_DAYS}日に記録なし）`,
    newModels.map((n) => `${n.model} 在庫${n.totalCount}件  最安 ${yen(n.min)}  相場（${n.storageLabel}）${yen(n.median)}（${n.count}件）${n.newPrice ? `  新品（公式）${yen(n.newPrice)}` : ""}`),
    enoughHistory ? "なし" : `判定できない（記録が${NEW_MODEL_DAYS}日分ない）`);
  section(`カタログにない機種名（いまの在庫・${UNKNOWN_MIN_COUNT}件以上・多い順に${UNKNOWN_TOP}まで）`,
    unknownNames ? unknownNames.map((u) => `${u.modelName}  ${u.count}件`) : [],
    unknownNames ? "なし" : "対象日が過去なので見ない（在庫はいまのものだけ）");
  section(`要確認（前日比 ±${SPIKE_PCT}%以上・在庫${SPIKE_MIN_COUNT}件以上。1〜3から除いた）`,
    spikes.map((s) => `${s.model}（${s.storageLabel}） ${md(s.fromDate)} ${yen(s.before)}→${md(s.toDate)} ${yen(s.after)}  ${signedPct(s.pct)}  在庫 ${s.beforeCount}→${s.afterCount}件`));

  line("■ X の下書き（型④ 値動き速報。投稿の直前に数字を取り直す・貼り付けずに type で打つ）");
  if (drafts.length === 0) line("  なし（速報にする値動きがない。いつもの型を回す）");
  drafts.forEach((d, i) => {
    line(`  ── ${i + 1}本目: ${d.kind}・${d.model}（${d.weight}/280）`);
    for (const t of d.text.split("\n")) line(`  ${t}`);
    line();
  });
  if (drafts.length) line();
  line("■ ショートの候補");
  line(`  ${short.command ? `${short.command}  … ${short.note}` : short.note}`);
  console.log(out.join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
