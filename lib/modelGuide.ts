import { yen } from "@/lib/format";
import type { PriceHistory, PricePoint } from "@/lib/priceHistory";

/**
 * 機種ページの「今買うのはあり？」「中古相場の推移」の文と表（2026-10-23〜）。
 * グラフ（PriceHistoryChart）は絵なので、検索や AI が読める文字と表でも同じ数字を出す。数字はすべて価格推移の記録（PriceSnapshot）から。
 * 推測は書かない: 結論は「値動き」「最新 OS への対応」「新品との差」の3つの事実から決まった文を選ぶだけ
 */

/** 値動きを「横ばい」とみなす幅（lib/buyNow.ts の数字タイルと同じ 2%） */
const FLAT = 0.02;
/** 前日比を出すのに要る、その日とその前の日の在庫の件数（数件で相場が跳ねた日を比べない） */
const MIN_COUNT_FOR_DIFF = 5;
/** 値動き（と結論）を言うのに要る、最初と最後の日の在庫の件数（在庫6件の新機種で「+45,000円上がった」と言い切らないように） */
const MIN_COUNT_FOR_TREND = 10;

export type DailyRow = { date: string; minPrice: number; medianPrice: number; diff: number | null; count: number };
export type MonthlyRow = { month: string; avgMedian: number; low: number; high: number; days: number };
export type Trend = { from: PricePoint; to: PricePoint; days: number; diff: number; rate: number; minLow: number; minHigh: number };

/** 相場の容量（在庫がいちばん多い容量）の記録。なければ全容量の記録（古い順） */
export const seriesFor = (history: PriceHistory, storage: number | null): PricePoint[] =>
  (storage !== null && history[storage]?.length ? history[storage] : history[0]) ?? [];

const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

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

/** 値動きの1〜2文（例: 「直近30日（9/23→10/23）の相場（128GB）は 65,980円→65,980円で、ほぼ横ばいです。」） */
export function trendSentence(t: Trend, label: string): string {
  const head = `直近${t.days}日（${md(t.from.date)}→${md(t.to.date)}）の${label}は${yen(t.from.medianPrice)}→${yen(t.to.medianPrice)}で、`;
  const move = Math.abs(t.rate) <= FLAT
    ? "ほぼ横ばいです（変化は2%以内）。"
    : t.diff < 0
      ? `${yen(-t.diff)}（${(Math.abs(t.rate) * 100).toFixed(1)}%）下がりました。`
      : `${yen(t.diff)}（${(t.rate * 100).toFixed(1)}%）上がりました。`;
  const range = t.minLow === t.minHigh ? `この間の最安値は${yen(t.minLow)}でした。` : `この間の最安値は${yen(t.minLow)}〜${yen(t.minHigh)}で動いています。`;
  return head + move + range;
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
export function buyVerdict(p: { model: string; trend: Trend | null; supported?: boolean; osName?: string; newDiff?: number | null }): string {
  const parts: string[] = [];
  if (p.supported === false) parts.push(`${p.model}は${p.osName ?? "最新の OS"}に対応していないため、メインで長く使うより、サブ機や用途を絞った使い方向けです。`);
  if (p.trend && Math.abs(p.trend.rate) > FLAT) {
    parts.push(p.trend.diff < 0
      ? `相場はこの${p.trend.days}日で下がっています。急がないなら、もう少し様子を見る手もあります。`
      : `相場はこの${p.trend.days}日で上がっています。欲しいなら早めに探すのがおすすめです。`);
  } else if (p.trend) {
    parts.push("相場は落ち着いています。容量・バッテリー・状態ランクの条件が合う個体が見つかったときが買い時です。");
  }
  if (p.newDiff != null) {
    parts.push(p.newDiff > 0 ? `新品より最安で${yen(p.newDiff)}安く買えます。` : "中古の最安が新品と同じかそれ以上なので、新品も比べてください。");
  }
  return parts.join("");
}
