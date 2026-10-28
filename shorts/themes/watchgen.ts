/**
 * テーマ「Apple Watch、1世代前にするといくら安い？」: 連続する2世代の Apple Watch（新しい方 → 1世代前）の中古の相場（中央値）の差のランキング → 台本（10/27〜）
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: Ultra 4→3・3→2・2→Ultra、Series 12→11・11→10・10→9・9→8・8→7・7→6、SE 3→SE（第2世代）・SE（第2世代）→SE（第1世代）
 *   （PAIRS。機種名は lib/watchCatalog.ts の表記）
 * - ケースの大きさ（DB の storage＝mm）は、機種ごとに在庫がいちばん多い大きさ（同じ数なら小さい方）。Series は世代でケースが変わる（10 から 42・46mm、9 までは 41・45mm）ので
 *   同じ大きさでは比べられない。Ultra はどれも 49mm。画面の注記と説明欄に「ケースは在庫がいちばん多いサイズ」と書く
 * - その大きさの在庫が両方 MIN_COUNT 件以上ある組だけ。相場（中央値）どうしの差（新しい方 − 1世代前）の大きい順。率は新しい方の相場に対して。
 *   差が0以下の組は出さない。3組に満たなければ止める
 * 場面・行の型は fold・gen と同じ（FoldRow）。DB は機種ごとのケースの大きさ別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { WatchGenScript, FoldRow } from "../types";

/** 比べる組（新しい方・1世代前） */
const PAIRS: [string, string][] = [
  ["Apple Watch Ultra 4", "Apple Watch Ultra 3"],
  ["Apple Watch Ultra 3", "Apple Watch Ultra 2"],
  ["Apple Watch Ultra 2", "Apple Watch Ultra"],
  ["Apple Watch Series 12", "Apple Watch Series 11"],
  ["Apple Watch Series 11", "Apple Watch Series 10"],
  ["Apple Watch Series 10", "Apple Watch Series 9"],
  ["Apple Watch Series 9", "Apple Watch Series 8"],
  ["Apple Watch Series 8", "Apple Watch Series 7"],
  ["Apple Watch Series 7", "Apple Watch Series 6"],
  ["Apple Watch SE 3", "Apple Watch SE（第2世代）"],
  ["Apple Watch SE（第2世代）", "Apple Watch SE（第1世代）"],
];
const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_watchgen`;
/** "Apple Watch Ultra 3" → "Ultra 3"、"Apple Watch SE（第2世代）" → "SE（第2世代）"（行・棒の札・タイトル） */
export const watchShort = (model: string) => model.replace(/^Apple Watch\s+/, "");
/** 組のケースの大きさ（"49mm"、違えば "46mm／45mm"） */
export const sizeText = (r: FoldRow) => (r.olderStorage && r.olderStorage !== r.storage ? `${r.storage}／${r.olderStorage}` : r.storage);

export type Side = { where: Awaited<ReturnType<typeof modelWhere>>; size: number; count: number; total?: number } | null;
/** 在庫がいちばん多いケースの大きさ（同じ数なら小さい方）と、その件数（watchbudget も使う） */
export async function side(model: string): Promise<Side> {
  const where = await modelWhere(model);
  // ケースの大きさが分からない在庫（null）は数えない
  const all = await groupMinPrice(where, "storage");
  const groups = all.filter((g) => Number(g.key) > 0);
  if (!groups.length) return null;
  const top = groups.reduce((a, b) => (b.count > a.count || (b.count === a.count && Number(b.key) < Number(a.key)) ? b : a));
  // total: 販売中の全在庫（サイズを問わない。watchbudget の在庫数）
  return { where, size: Number(top.key), count: top.count, total: all.reduce((a, g) => a + g.count, 0) };
}
export const medianOf = async (s: NonNullable<Side>) => (await medianPrice({ AND: [s.where, { storage: s.size }] }, s.count))!;

export async function buildWatchGenScript(date: string): Promise<WatchGenScript> {
  const rows: FoldRow[] = [];
  for (const [newer, older] of PAIRS) {
    const [a, b] = [await side(newer), await side(older)];
    if (!a || !b || a.count < MIN_COUNT || b.count < MIN_COUNT) {
      console.log(`  対象外: ${newer}→${older}（在庫がいちばん多いサイズの在庫 ${a?.count ?? 0}件／${b?.count ?? 0}件。${MIN_COUNT}件以上が要る）`);
      continue;
    }
    const [newerMedian, olderMedian] = [await medianOf(a), await medianOf(b)];
    const diff = newerMedian - olderMedian;
    const row: FoldRow = {
      newer, older, storage: storageLabel(a.size, newer), storageGb: a.size, newerMedian, olderMedian,
      newerCount: a.count, olderCount: b.count, diff, pct: Math.round((diff / newerMedian) * 1000) / 10,
      ...(a.size !== b.size ? { olderStorage: storageLabel(b.size, older), olderStorageGb: b.size } : {}),
    };
    console.log(`  候補: ${newer}→${older}（${sizeText(row)}・在庫 ${row.newerCount}件／${row.olderCount}件） ${man(newerMedian)}円 → ${man(olderMedian)}円（差 ${man(diff)}円・${row.pct.toFixed(1)}%）`);
    if (diff > 0) rows.push(row);
  }
  rows.sort((x, y) => y.diff - x.diff || y.pct - x.pct);
  if (rows.length < SHOWN) throw new Error(`比べられる組が ${rows.length} 組しかありません（${SHOWN}組以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。中古の Watch はバンド・充電ケーブルが付かない在庫もある（店の表記で確かめる）
  const lines = ["中古のWatchは", "電池の最大容量と", "バンドの付属を確認"];

  const rawTitle = `${watchShort(top.newer)}→${watchShort(top.older)}で${manYen(top.diff)}円安い！Apple Watch 1世代前ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `1世代前で${manYen(top.diff)}円安い！中古Apple Watchの世代の差`;
  const rowText = (r: FoldRow, i: number) =>
    `${i + 1}位 ${r.newer}→${watchShort(r.older)}（${sizeText(r)}） ${man(r.newerMedian)}円 → ${man(r.olderMedian)}円（−${man(r.diff)}円・−${r.pct.toFixed(1)}%）`;
  const description = [
    `Apple Watch を1世代前にすると、中古の相場でいくら安くなるかのランキングです。1位は${top.newer}→${top.older}（${sizeText(top)}）で、1世代前にすると${man(top.diff)}円（−${top.pct.toFixed(1)}%）安くなります。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: Apple Watch Ultra・Series・SE の連続する2世代の組で、ケースは機種ごとに在庫がいちばん多いサイズ（Series は世代でケースの大きさが変わるため。Ultra はどれも49mm）。その在庫が両方${MIN_COUNT}件以上ある組の相場どうしを比べ、差の大きい順。率は新しい方の相場に対して。データ: 大手中古ショップ${shopCount}店の在庫・相場＝そのサイズの中央値（${slash(date)}時点）。`,
    "",
    // 1位の1世代前（安い方）のページへ。utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.older}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.older)}?${utm(date)}`,
    `Apple Watch 全機種の中古相場: https://used.gadelog.com/watch?${utm(date)}`,
  ].join("\n");

  return {
    theme: "watchgen",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "あなたは最新派？1世代前派？",
      },
    },
    youtube: { title, description, hashtags: ["#AppleWatch", "#中古"] },
  };
}
