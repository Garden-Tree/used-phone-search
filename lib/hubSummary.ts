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
