/**
 * テーマ「折りたたみスマホ、1世代前にするといくら安い？」: 折りたたみスマホの連続する2世代（新しい方 → 1世代前）を、同じ容量の中古の相場（中央値）で比べた差のランキング → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: Galaxy Z Fold8→Fold7・Fold7→Fold6・Fold6→Fold5、Galaxy Z Flip8→Flip7・Flip7→Flip6・Flip6→Flip5、
 *   Pixel 11 Pro Fold→10 Pro Fold・10 Pro Fold→9 Pro Fold（PAIRS。機種名は lib/galaxyCatalog.ts・lib/pixelCatalog.ts の表記）
 * - 容量は、両方の機種で在庫が MIN_COUNT 件以上ある容量のうち、いちばん小さい容量。なければその組は出さない
 * - その容量の相場（中央値）どうしの差（新しい方 − 1世代前）の大きい順。率は新しい方の相場に対して。3組に満たなければ止める
 * DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { FoldRow, FoldScript } from "../types";

/** 比べる組（新しい方・1世代前） */
const PAIRS: [string, string][] = [
  ["Galaxy Z Fold8", "Galaxy Z Fold7"],
  ["Galaxy Z Fold7", "Galaxy Z Fold6"],
  ["Galaxy Z Fold6", "Galaxy Z Fold5"],
  ["Galaxy Z Flip8", "Galaxy Z Flip7"],
  ["Galaxy Z Flip7", "Galaxy Z Flip6"],
  ["Galaxy Z Flip6", "Galaxy Z Flip5"],
  ["Pixel 11 Pro Fold", "Pixel 10 Pro Fold"],
  ["Pixel 10 Pro Fold", "Pixel 9 Pro Fold"],
];
/** 相場が数件の在庫で決まらないように（その容量の在庫の件数） */
const MIN_COUNT = 5;
/** 動画・説明欄に出す数（3位・2位・1位） */
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
/** 約何万円（0.1万円単位で四捨五入。ナレーションの「約○.○万円」と同じ値） */
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_fold`;
/** "Galaxy Z Fold7" → "Fold7"、"Pixel 10 Pro Fold" → "10 Pro Fold"（組の2つ目・タイトル） */
export const foldShort = (model: string) => model.replace(/^Galaxy Z\s+|^Pixel\s+/, "");

type Side = { where: Awaited<ReturnType<typeof modelWhere>>; counts: Map<number, number> };
async function side(model: string): Promise<Side> {
  const where = await modelWhere(model);
  const counts = new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), g.count] as const));
  return { where, counts };
}
const medianAt = async (s: Side, storage: number) => (await medianPrice({ AND: [s.where, { storage }] }, s.counts.get(storage) ?? 0))!;

export async function buildFoldScript(date: string): Promise<FoldScript> {
  const rows: FoldRow[] = [];
  for (const [newer, older] of PAIRS) {
    const [a, b] = [await side(newer), await side(older)];
    const common = [...a.counts.keys()].filter((g) => (a.counts.get(g) ?? 0) >= MIN_COUNT && (b.counts.get(g) ?? 0) >= MIN_COUNT).sort((x, y) => x - y);
    if (common.length === 0) {
      console.log(`  対象外: ${newer}→${older}（両方に在庫${MIN_COUNT}件以上の容量がない）`);
      continue;
    }
    const gb = common[0];
    const [newerMedian, olderMedian] = [await medianAt(a, gb), await medianAt(b, gb)];
    const diff = newerMedian - olderMedian;
    const row: FoldRow = {
      newer, older, storage: storageLabel(gb, newer), storageGb: gb, newerMedian, olderMedian,
      newerCount: a.counts.get(gb)!, olderCount: b.counts.get(gb)!, diff, pct: Math.round((diff / newerMedian) * 1000) / 10,
    };
    console.log(`  候補: ${newer}→${older}（${row.storage}・在庫 ${row.newerCount}件／${row.olderCount}件） ${man(newerMedian)}円 → ${man(olderMedian)}円（差 ${man(diff)}円・${row.pct.toFixed(1)}%）`);
    // 1世代前の方が高い（差が0以下）組は「安くなる」と言えないので出さない
    if (diff <= 0) continue;
    rows.push(row);
  }
  // 差額の大きい順（同じ額なら率の大きい方）
  rows.sort((x, y) => y.diff - x.diff || y.pct - x.pct);
  if (rows.length < SHOWN) throw new Error(`両方に同じ容量の在庫が${MIN_COUNT}件以上あり、1世代前の方が安い組が ${rows.length} 組しかありません（${SHOWN}組以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];

  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（人が書き換える前提・1行16字以内・3行まで）
  const lines = ["折りたたみの中古は", "画面の折り目を", "確認しましょう"];

  const rawTitle = `${top.older}なら${foldShort(top.newer)}より${manYen(top.diff)}円安い！折りたたみスマホ1世代前ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `1世代前なら${manYen(top.diff)}円安い！折りたたみスマホ1世代前ランキング`;
  const rowText = (r: FoldRow, i: number) =>
    `${i + 1}位 ${r.newer}→${foldShort(r.older)}（${r.storage}） ${man(r.newerMedian)}円 → ${man(r.olderMedian)}円（−${man(r.diff)}円・−${r.pct.toFixed(1)}%）`;
  const description = [
    `折りたたみスマホを1世代前にすると、中古の相場でいくら安くなるかのランキングです。1位は${top.newer}→${top.older}（${top.storage}）で、1世代前にすると${man(top.diff)}円（−${top.pct.toFixed(1)}%）安くなります。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: Galaxy Z Fold（5〜8）・Galaxy Z Flip（5〜8）・Pixel Pro Fold（9〜11）の連続する2世代の組で、両方に在庫が${MIN_COUNT}件以上ある容量のうちいちばん小さい容量の相場どうしを比べ、差額（新しい方 − 1世代前）の大きい順。率は新しい方の相場に対して。データ: 大手中古ショップ${shopCount}店の在庫・相場＝同じ容量の中央値（${slash(date)}時点）。`,
    "",
    // 1位の1世代前（安い方）のページへ。utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.older}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.older)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "fold",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "最新と1世代前、どっちにする？",
      },
    },
    youtube: { title, description, hashtags: ["#折りたたみスマホ", "#Galaxy", "#Pixel"] },
  };
}
