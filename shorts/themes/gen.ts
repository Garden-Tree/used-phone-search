/**
 * テーマ「iPhone、1世代前にするといくら安い？」: 連続する2世代の iPhone（新しい方 → 1世代前）を、同じ容量の中古の相場（中央値）で比べた差のランキング → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: 無印 17→16・16→15・15→14・14→13・13→12、Pro 17 Pro→16 Pro・…・13 Pro→12 Pro（PAIRS）
 * - 容量は、両方の機種で在庫が MIN_COUNT 件以上ある容量のうち、いちばん小さい容量。なければその組は出さない
 * - その容量の相場（中央値）どうしの差（新しい方 − 1世代前）の大きい順。率は新しい方の相場に対して。差が0以下の組は出さない。3組に満たなければ止める
 * 場面・行の型は fold（折りたたみの1世代前）と同じ（FoldRow）。DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ
 */
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { FoldRow, GenScript } from "../types";

/** 比べる組（新しい方・1世代前） */
const PAIRS: [string, string][] = [
  ["iPhone 17", "iPhone 16"],
  ["iPhone 16", "iPhone 15"],
  ["iPhone 15", "iPhone 14"],
  ["iPhone 14", "iPhone 13"],
  ["iPhone 13", "iPhone 12"],
  ["iPhone 17 Pro", "iPhone 16 Pro"],
  ["iPhone 16 Pro", "iPhone 15 Pro"],
  ["iPhone 15 Pro", "iPhone 14 Pro"],
  ["iPhone 14 Pro", "iPhone 13 Pro"],
  ["iPhone 13 Pro", "iPhone 12 Pro"],
];
const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_gen`;
/** "iPhone 16 Pro" → "16 Pro"（組の2つ目・タイトル） */
const genShort = (model: string) => model.replace(/^iPhone\s+/, "");

type Side = { where: Awaited<ReturnType<typeof modelWhere>>; counts: Map<number, number> };
async function side(model: string): Promise<Side> {
  const where = await modelWhere(model);
  const counts = new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), g.count] as const));
  return { where, counts };
}
const medianAt = async (s: Side, storage: number) => (await medianPrice({ AND: [s.where, { storage }] }, s.counts.get(storage) ?? 0))!;

export async function buildGenScript(date: string): Promise<GenScript> {
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
    if (diff > 0) rows.push(row);
  }
  rows.sort((x, y) => y.diff - x.diff || y.pct - x.pct);
  if (rows.length < SHOWN) throw new Error(`比べられる組が ${rows.length} 組しかありません（${SHOWN}組以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。1世代前が 15 以降なら USB-C（Apple 公式の仕様）
  const olderGen = Number(top.older.match(/iPhone (\d+)/)?.[1] ?? 0);
  const lines = olderGen >= 15 ? ["1世代前でも", "USB-Cなので", "充電はそのままです"] : ["1世代前でも", "iOSの対応期間を", "確認しましょう"];

  const rawTitle = `${top.newer}→${genShort(top.older)}で${manYen(top.diff)}円安い！iPhone 1世代前ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `1世代前で${manYen(top.diff)}円安い！中古iPhoneの世代の差`;
  const rowText = (r: FoldRow, i: number) =>
    `${i + 1}位 ${r.newer}→${genShort(r.older)}（${r.storage}） ${man(r.newerMedian)}円 → ${man(r.olderMedian)}円（−${man(r.diff)}円・−${r.pct.toFixed(1)}%）`;
  const description = [
    `iPhone を1世代前にすると、中古の相場でいくら安くなるかのランキングです。1位は${top.newer}→${top.older}（${top.storage}）で、1世代前にすると${man(top.diff)}円（−${top.pct.toFixed(1)}%）安くなります。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: iPhone 12〜17 の無印・Pro の連続する2世代の組で、両方に在庫が${MIN_COUNT}件以上ある容量のうちいちばん小さい容量の相場どうしを比べ、差の大きい順。率は新しい方の相場に対して。データ: 大手中古ショップ${shopCount}店の在庫・相場＝同じ容量の中央値（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.older}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.older)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "gen",
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
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
