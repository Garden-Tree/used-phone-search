import { storageLabel } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import type { ModelMarket } from "@/lib/marketStats";

/**
 * 種類ごとの一覧（/ipad・/pixel・/galaxy・/mac）の冒頭の1文と WebPage の構造化データ（2026-10-28〜）。
 * /iphone（10/23〜）と同じ形: 「<日付>時点の中古iPadの相場は、<機種>（容量）約X.X万円、…です」。
 * 「ipad 中古 相場」などの検索・AI の概要が機種ごとの金額の形で答えるので、同じ形で引用できるように。
 * 代表は在庫の多い順に最大 SUMMARY_MAX 機種（在庫5件以上）を選び、カタログの順に並べる。数字は表と同じ（在庫がいちばん多い容量の中央値）
 */
const SUMMARY_MAX = 6;
const MIN_COUNT = 5;

const man = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万円`;

export function hubSummary(kind: string, models: string[], stats: Map<string, ModelMarket>, shopNum: number): string | null {
  const picked = new Set(
    models
      .filter((m) => (stats.get(m)?.count ?? 0) >= MIN_COUNT)
      .sort((a, b) => stats.get(b)!.count - stats.get(a)!.count)
      .slice(0, SUMMARY_MAX),
  );
  if (picked.size === 0) return null;
  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const parts = models.filter((m) => picked.has(m)).map((m) => {
    const s = stats.get(m)!;
    return `${m}${s.medianStorage ? `（${storageLabel(s.medianStorage, m)}）` : ""}${man(s.medianPrice)}`;
  });
  return `${today}時点の中古${kind}の相場は、${parts.join("、")}です（大手中古ショップ${shopNum}社の在庫から、在庫がいちばん多い容量の中央値）。`;
}

export function hubWebPage(name: string, path: string, summary: string | null) {
  return summary
    ? [{ "@context": "https://schema.org", "@type": "WebPage", name, url: `${SITE_URL}${path}`, description: summary, dateModified: new Date().toISOString() }]
    : [];
}

/** タイトル用の短い機種名。頭の「iPhone」などとかっこを外す（「中古iPhoneはiPhone 13」と重なる・値段のかっこと重なるため）。「iPad mini (第6世代)」→「mini 第6世代」 */
export const shortModelName = (model: string) =>
  model.replace(/^(iPhone|iPad|Google Pixel|Pixel|Galaxy|Apple Watch|Xperia|AQUOS|MacBook)\s*/, "").replace(/\s*[(（](.+?)[)）]/g, " $1").trim();

/**
 * 種類ごとの一覧のタイトル（10/28〜）。検索結果で「いくらから買えるか」が見えるよう、いちばん安い値段と機種を頭に。
 * 値段は在庫5件以上の機種の最安値（在庫1件の外れ値で言い切らない）。candidates で対象を絞れる（/iphone は最新の iOS 対応の機種だけ）。
 * head を渡すと「<head>｜9,580円から（SE 第2世代）・41機種【毎日更新】」（/iphone は検索語「中古iPhone 相場一覧」を頭に残す）。
 * 予算別ページ（BudgetView の budgetMetadata）と同じ考え方。ideas/2026-10-28-analysis.md
 */
export function hubTitle(
  kind: string,
  models: readonly string[],
  stats: Map<string, ModelMarket>,
  fallback: string,
  candidates: readonly string[] = models,
  head?: string,
): string {
  const n = models.filter((m) => (stats.get(m)?.count ?? 0) > 0).length;
  const low = candidates
    .filter((m) => (stats.get(m)?.count ?? 0) >= MIN_COUNT)
    .sort((a, b) => stats.get(a)!.minPrice - stats.get(b)!.minPrice)[0];
  if (!low) return fallback;
  const from = `${stats.get(low)!.minPrice.toLocaleString()}円から（${shortModelName(low)}）`;
  if (head) return `${head}｜${from}・${n}機種【毎日更新】`;
  return `中古${kind}は${from}｜${n}機種の相場・最安値【毎日更新】`;
}
