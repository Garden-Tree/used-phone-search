import { yen } from "@/lib/format";
import type { PriceHistory, PricePoint } from "@/lib/priceHistory";

/**
 * 機種ページの「今買うのはあり？」「中古相場の推移」の文と表（2026-10-23〜）。
 * グラフ（PriceHistoryChart）は絵なので、検索や AI が読める文字と表でも同じ数字を出す。数字はすべて価格推移の記録（PriceSnapshot）から。
 * 推測は書かない: 結論は「値動き」「最新 OS への対応」「新品との差」の3つの事実から決まった文を選ぶだけ
 */

/** 値動きを「横ばい」とみなす幅（lib/buyNow.ts の数字タイルと同じ 2%） */
export const FLAT = 0.02;
/** 前日比・前週比を出すのに要る、その日とその前の日の在庫の件数（数件で相場が跳ねた日を比べない） */
export const MIN_COUNT_FOR_DIFF = 5;
/** 値動き（と結論）を言うのに要る、最初と最後の日の在庫の件数（在庫6件の新機種で「+45,000円上がった」と言い切らないように） */
export const MIN_COUNT_FOR_TREND = 10;

export type DailyRow = { date: string; minPrice: number; medianPrice: number; diff: number | null; count: number };
export type WeeklyRow = { date: string; minPrice: number; medianPrice: number; diff: number | null; count: number };
export type MonthlyRow = { month: string; avgMedian: number; low: number; high: number; days: number };
export type Trend = { from: PricePoint; to: PricePoint; days: number; diff: number; rate: number; minLow: number; minHigh: number };

/** 相場の容量（在庫がいちばん多い容量）の記録。なければ全容量の記録（古い順） */
export const seriesFor = (history: PriceHistory, storage: number | null): PricePoint[] =>
  (storage !== null && history[storage]?.length ? history[storage] : history[0]) ?? [];

/** 直近 days 日の値動き（記録が7日分以上あり、最初と最後の日の在庫が MIN_COUNT_FOR_TREND 件以上のときだけ） */
export function trendOf(points: PricePoint[], days = 30): Trend | null {
  if (points.length < 7) return null;
  const to = points[points.length - 1];
  const since = new Date(`${to.date}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - days);
  const win = points.filter((p) => new Date(`${p.date}T00:00:00Z`) >= since);
  if (win.length < 7) return null;
  const from = win[0];
  if (from.count < MIN_COUNT_FOR_TREND || to.count < MIN_COUNT_FOR_TREND) return null;
  const span = Math.round((Date.parse(to.date) - Date.parse(from.date)) / 86_400_000);
  const diff = to.medianPrice - from.medianPrice;
  return {
    from, to, days: span, diff, rate: from.medianPrice > 0 ? diff / from.medianPrice : 0,
    minLow: Math.min(...win.map((p) => p.minPrice)), minHigh: Math.max(...win.map((p) => p.minPrice)),
  };
}

/** 値動きを矢印と金額で（「↘ −2,300円」）。2% 以内は横ばい（→） */
export function moveOf(diff: number, base: number): { text: string; tone: "up" | "down" | "flat" } {
  const flat = base > 0 ? Math.abs(diff / base) <= FLAT : diff === 0;
  const signed = `${diff > 0 ? "+" : diff < 0 ? "−" : "±"}${Math.abs(diff).toLocaleString()}円`;
  return flat ? { text: `→ ${signed}`, tone: "flat" } : diff < 0 ? { text: `↘ ${signed}`, tone: "down" } : { text: `↗ ${signed}`, tone: "up" };
}

/** 日ごとの表（新しい順・n 日分）。前日比は、その日と前の日の件数が MIN_COUNT_FOR_DIFF 以上のときだけ */
export function dailyRows(points: PricePoint[], n = 30): DailyRow[] {
  const rows: DailyRow[] = points.map((p, i) => {
    const prev = points[i - 1];
    const ok = prev && p.count >= MIN_COUNT_FOR_DIFF && prev.count >= MIN_COUNT_FOR_DIFF;
    return { date: p.date, minPrice: p.minPrice, medianPrice: p.medianPrice, diff: ok ? p.medianPrice - prev.medianPrice : null, count: p.count };
  });
  return rows.slice(-n).reverse();
}

const DAY_MS = 86_400_000;

/**
 * 週ごとの表（新しい順・最大 weeks 行。10/25〜）。1行目は最新の記録、2行目以降は 7・14・21…日前にいちばん近い日の記録。
 * 近い日が3日より離れている（記録が始まったばかり・途切れ）か、同じ日をもう選んでいたら、そこで止める。
 * 前週比は、その週と前の週の件数が MIN_COUNT_FOR_DIFF 以上のときだけ。行が2つ未満なら空（表は出さない）
 */
export function weeklyRows(points: PricePoint[], weeks = 8): WeeklyRow[] {
  if (points.length < 2) return [];
  const t = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
  const last = points[points.length - 1];
  const picked: PricePoint[] = [last];
  for (let k = 1; k < weeks; k++) {
    const target = t(last.date) - k * 7 * DAY_MS;
    let best = points[0];
    for (const p of points) if (Math.abs(t(p.date) - target) < Math.abs(t(best.date) - target)) best = p;
    if (Math.abs(t(best.date) - target) > 3 * DAY_MS || picked.includes(best)) break;
    picked.push(best);
  }
  if (picked.length < 2) return [];
  return picked.map((p, i) => {
    const older = picked[i + 1];
    const ok = older && p.count >= MIN_COUNT_FOR_DIFF && older.count >= MIN_COUNT_FOR_DIFF;
    return { date: p.date, minPrice: p.minPrice, medianPrice: p.medianPrice, diff: ok ? p.medianPrice - older.medianPrice : null, count: p.count };
  });
}

/**
 * 週ごとの表の見出しに添える値動き（最古の行→最新の行。表の期間は最大8週）。両端の件数が MIN_COUNT_FOR_TREND 未満なら null
 */
export function weeklyMove(rows: WeeklyRow[]): { weeks: number; diff: number; base: number } | null {
  if (rows.length < 2) return null;
  const to = rows[0];
  const from = rows[rows.length - 1];
  if (from.count < MIN_COUNT_FOR_TREND || to.count < MIN_COUNT_FOR_TREND || from.medianPrice <= 0) return null;
  return { weeks: rows.length - 1, diff: to.medianPrice - from.medianPrice, base: from.medianPrice };
}

/** 「今買うべき？」の1行。label は左の見出し、value は数字・記号だけ */
export type BuyFact = { label: string; value: string; tone?: "up" | "down" | "flat" };

/**
 * 「<機種>の中古、今買うべき？」の行（10/25〜。10/27〜 文ではなく数字と記号だけ）。最安値・相場・件数は要約カードにあるので出さない。
 * データがない行は出さない（値動きは trendOf と同じ条件・OS は確かめた種類だけ・電池85%以上は在庫があるとき）
 */
export function buyFacts(p: {
  trend: Trend | null;
  /** 最新 OS・アップデート（「iOS 27」「○」など。確かめた種類だけ） */
  os: BuyFact[];
  /** バッテリー85%以上の在庫の最安と件数 */
  battery85: { minPrice: number; count: number } | null;
}): BuyFact[] {
  const facts: BuyFact[] = [];
  const t = p.trend;
  if (t && t.from.medianPrice > 0) {
    const m = moveOf(t.diff, t.from.medianPrice);
    facts.push({ label: `${t.days}日の相場`, value: m.text, tone: m.tone });
  }
  facts.push(...p.os);
  if (p.battery85 && p.battery85.count > 0) {
    facts.push({ label: "電池85%以上", value: `${yen(p.battery85.minPrice)}〜（${p.battery85.count.toLocaleString()}件）` });
  }
  return facts;
}

/** 月ごとの表（新しい順）。平均相場＝その月の日ごとの相場の平均、幅＝日ごとの相場の最小〜最大 */
export function monthlyRows(points: PricePoint[]): MonthlyRow[] {
  const by = new Map<string, PricePoint[]>();
  for (const p of points) (by.get(p.date.slice(0, 7)) ?? by.set(p.date.slice(0, 7), []).get(p.date.slice(0, 7))!).push(p);
  return [...by.entries()].map(([month, ps]) => ({
    month,
    avgMedian: Math.round(ps.reduce((n, p) => n + p.medianPrice, 0) / ps.length),
    low: Math.min(...ps.map((p) => p.medianPrice)),
    high: Math.max(...ps.map((p) => p.medianPrice)),
    days: ps.length,
  })).sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * 「今買うのはあり？」の結論（1〜2文）。
 * - 最新 OS に対応していない（supported === false）ときは、それを先に言う
 * - 値動き: 2% を超えて下がっていれば「待つ手もある」、上がっていれば「早めに」、横ばいなら「条件の良い個体が見つかったら」
 * - 新品との差: 中古の最安が新品以上なら新品も比べる、安ければその差
 */
export function buyVerdict(p: { model: string; trend: Trend | null; supported?: boolean; osName?: string; newDiff?: number | null }): string[] {
  const parts: string[] = [];
  if (p.supported === false) parts.push(`${p.osName ?? "最新の OS"}に非対応。メインよりサブ機向けです。`);
  if (p.trend && Math.abs(p.trend.rate) > FLAT) {
    parts.push(p.trend.diff < 0
      ? `相場は下がり気味。急がないなら様子見も手です。`
      : `相場は上がり気味。欲しいなら早めがおすすめです。`);
  } else if (p.trend) {
    parts.push("相場は落ち着いています。条件の合う個体が見つかったときが買い時です。");
  }
  if (p.newDiff != null) {
    parts.push(p.newDiff > 0 ? `新品より最安で${yen(p.newDiff)}安く買えます。` : "中古の最安が新品以上なので、新品も比べてください。");
  }
  return parts;
}
