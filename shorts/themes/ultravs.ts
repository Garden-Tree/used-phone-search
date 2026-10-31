/**
 * テーマ「Apple Watch Ultra と Series、中古ならいくら違う？」: 同じ年に出た Ultra と Series の中古の相場（中央値）の差のランキング → 台本（11/2〜）
 * provs・plusvs と同じ台本の型（ProVsScript・theme "ultravs"）で、base＝Series・pro＝Ultra
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: 同じ発表会で出た Ultra と Series（PAIRS。機種名は lib/watchCatalog.ts の表記）。watchCatalog.ts は発売年を持たないので、
 *   組は Apple Newsroom の発表で確かめた（2026-10-31）:
 *     2022/9 Ultra・Series 8 https://www.apple.com/newsroom/2022/09/introducing-apple-watch-ultra/ ・ https://www.apple.com/newsroom/2022/09/apple-introduces-the-advanced-new-apple-watch-series-8/
 *     2023/9 Ultra 2・Series 9 https://www.apple.com/newsroom/2023/09/apple-unveils-apple-watch-ultra-2/ ・ https://www.apple.com/newsroom/2023/09/apple-introduces-the-advanced-new-apple-watch-series-9/
 *     2025/9 Ultra 3・Series 11 https://www.apple.com/newsroom/2025/09/introducing-apple-watch-ultra-3/ ・ https://www.apple.com/newsroom/2025/09/apple-debuts-apple-watch-series-11-featuring-groundbreaking-health-insights/
 *     2026/9 Ultra 4・Series 12 https://www.apple.com/newsroom/2026/09/apple-unveils-apple-watch-ultra-4/ ・ https://www.apple.com/newsroom/2026/09/introducing-apple-watch-series-12-with-the-all-new-health-sensing-system/
 *   2024 の Series 10 は同じ年の新しい Ultra がないので入れない
 * - ケースは watchgen と同じ決め方（機種ごとに在庫がいちばん多いサイズ・同じ数なら小さい方）。そのサイズの在庫が両方 MIN_COUNT 件以上ある組だけ。
 *   Ultra はどれも 49mm なので、行のサイズは「49／45mm」（Ultra／Series）
 * - 差（Ultra − Series）の大きい順。率は Series の相場に対して。差0以下の組は外して plan のログに「★注意」。SHOWN 組に満たなければ止める
 * DB は機種ごとのケースのサイズ別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { activeWatchShops } from "@/lib/activeShops";
import type { ProVsRow, ProVsScript } from "../types";
import { medianOf, side, watchShort } from "./watchgen";

/** 比べる組（Series・Ultra）。同じ年に発表された組（上の出典） */
const PAIRS: [string, string][] = [
  ["Apple Watch Series 8", "Apple Watch Ultra"],
  ["Apple Watch Series 9", "Apple Watch Ultra 2"],
  ["Apple Watch Series 11", "Apple Watch Ultra 3"],
  ["Apple Watch Series 12", "Apple Watch Ultra 4"],
];
const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_ultravs`;
/** "Ultra 2／Series 9" */
const pairText = (r: ProVsRow) => `${watchShort(r.pro)}／${watchShort(r.base)}`;

export async function buildUltraVsScript(date: string): Promise<ProVsScript> {
  const rows: ProVsRow[] = [];
  for (const [base, pro] of PAIRS) {
    const [b, p] = [await side(base), await side(pro)];
    if (!b || !p || b.count < MIN_COUNT || p.count < MIN_COUNT) {
      console.log(`  対象外: ${pro}／${base}（在庫がいちばん多いサイズの在庫 ${p?.count ?? 0}件／${b?.count ?? 0}件。${MIN_COUNT}件以上が要る）`);
      continue;
    }
    const [baseMedian, proMedian] = [await medianOf(b), await medianOf(p)];
    const diff = proMedian - baseMedian;
    const storage = p.size === b.size ? storageLabel(p.size, pro) : `${p.size}／${storageLabel(b.size, base)}`;
    const row: ProVsRow = { base, pro, storage, storageGb: p.size, baseMedian, proMedian, baseCount: b.count, proCount: p.count, diff, pct: Math.round((diff / baseMedian) * 1000) / 10 };
    console.log(`  候補: ${pairText(row)}（${storage}・在庫 ${row.proCount}件／${row.baseCount}件） Series ${man(baseMedian)}円・Ultra ${man(proMedian)}円（差 ${man(diff)}円・${row.pct.toFixed(1)}%）`);
    if (diff <= 0) {
      console.log(`  ★注意: ${pro}の相場が${base}以下（差 ${man(diff)}円）。ランキングから外しました（人が確かめてください）`);
      continue;
    }
    rows.push(row);
  }
  rows.sort((x, y) => y.diff - x.diff || y.pct - x.pct);
  if (rows.length < SHOWN) throw new Error(`比べられる Ultra と Series の組が ${rows.length} 組しかありません（${SHOWN}組以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeWatchShops()).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。仕様の数字は出さず、中古で見るところだけ（ケースのサイズ・電池の最大容量）
  const lines = ["UltraもSeriesも", "ケースのサイズと", "電池の%を確認しましょう"];

  const rawTitle = `Apple Watch ${watchShort(top.pro)}は${watchShort(top.base)}より${manYen(top.diff)}円高い！UltraとSeriesの差ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `Ultraは${manYen(top.diff)}円高い！中古Apple Watch UltraとSeriesの差`;
  const rowText = (r: ProVsRow, i: number) =>
    `${i + 1}位 ${pairText(r)}（${r.storage}） Ultra ${man(r.proMedian)}円・Series ${man(r.baseMedian)}円（差+${man(r.diff)}円・+${r.pct.toFixed(1)}%）`;
  const description = [
    `同じ年に出た Apple Watch の Ultra と Series を、中古の相場で比べた差のランキングです。1位は${top.pro}と${top.base}（${top.storage}）で、Ultraの方が${man(top.diff)}円（+${top.pct.toFixed(1)}%）高くなっています。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: 同じ年に発表された Ultra と Series の組（Apple Newsroom の発表）で、ケースは機種ごとに在庫がいちばん多いサイズ（Ultra はどれも49mm）。その在庫が両方${MIN_COUNT}件以上ある組の相場どうしを比べ、差額（Ultra − Series）の大きい順。率は Series の相場に対して。データ: 大手中古ショップ${shopCount}店の在庫・相場＝そのサイズの中央値（${slash(date)}時点）。`,
    "",
    // 1位の Series（安い方）のページへ。utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.base}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.base)}?${utm(date)}`,
    `Apple Watch 全機種の中古相場: https://used.gadelog.com/watch?${utm(date)}`,
  ].join("\n");

  return {
    theme: "ultravs",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "あなたはUltra派？Series派？",
      },
    },
    youtube: { title, description, hashtags: ["#AppleWatch", "#中古"] },
  };
}
