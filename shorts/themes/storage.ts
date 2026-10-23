/**
 * テーマ「容量を1つ上げると、中古iPhoneはいくら高い？」: 1機種で、いちばん小さい容量と1つ上の容量の中古の相場（中央値）の差のランキング → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 機種: iPhone 13〜17 の無印と Pro（MODELS）
 * - 容量は、在庫が MIN_COUNT 件以上ある容量のうちいちばん小さい容量（from）と、その次に大きい在庫 MIN_COUNT 件以上の容量（to）
 * - 差 = to の相場 − from の相場。率は from の相場に対して。**差の小さい順**（少ない上乗せで容量を倍にできる機種が上）。差が0以下の機種は出さない
 * DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { StorageRow, StorageScript } from "../types";

const MODELS = ["iPhone 13", "iPhone 13 Pro", "iPhone 14", "iPhone 14 Pro", "iPhone 15", "iPhone 15 Pro", "iPhone 16", "iPhone 16 Pro", "iPhone 17", "iPhone 17 Pro"];
const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_storage`;

async function rowOf(model: string): Promise<StorageRow | null> {
  const where = await modelWhere(model);
  const counts = new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), g.count] as const));
  const ok = [...counts.keys()].filter((g) => (counts.get(g) ?? 0) >= MIN_COUNT).sort((x, y) => x - y);
  if (ok.length < 2) {
    console.log(`  対象外: ${model}（在庫${MIN_COUNT}件以上の容量が2つない）`);
    return null;
  }
  const [fromGb, toGb] = ok;
  const median = async (gb: number) => (await medianPrice({ AND: [where, { storage: gb }] }, counts.get(gb)!))!;
  const [fromMedian, toMedian] = [await median(fromGb), await median(toGb)];
  const diff = toMedian - fromMedian;
  const row: StorageRow = {
    model, from: storageLabel(fromGb, model), to: storageLabel(toGb, model), fromGb, toGb, fromMedian, toMedian,
    fromCount: counts.get(fromGb)!, toCount: counts.get(toGb)!, diff, pct: Math.round((diff / fromMedian) * 1000) / 10,
  };
  console.log(`  候補: ${model} ${row.from} ${man(fromMedian)}円（${row.fromCount}件）→ ${row.to} ${man(toMedian)}円（${row.toCount}件）（差 ${man(diff)}円・${row.pct.toFixed(1)}%）`);
  return row;
}

export async function buildStorageScript(date: string): Promise<StorageScript> {
  const rows: StorageRow[] = [];
  for (const m of MODELS) {
    const r = await rowOf(m);
    if (r && r.diff > 0) rows.push(r);
  }
  // 差の小さい順（同じなら率の小さい方）
  rows.sort((x, y) => x.diff - y.diff || x.pct - y.pct);
  if (rows.length < SHOWN) throw new Error(`比べられる機種が ${rows.length} 機種しかありません（${SHOWN}機種以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）
  const lines = ["写真や動画が多いなら", "数千円の差で", "256GBが安心です"];

  const rawTitle = `${top.model}は+${man(top.diff)}円で${top.to}に！容量アップが安い中古iPhone`;
  const title = rawTitle.length <= 60 ? rawTitle : `+${man(top.diff)}円で容量が倍に！容量アップが安い中古iPhone`;
  const rowText = (r: StorageRow, i: number) =>
    `${i + 1}位 ${r.model}（${r.from}→${r.to}） ${man(r.fromMedian)}円 → ${man(r.toMedian)}円（+${man(r.diff)}円・+${r.pct.toFixed(1)}%）`;
  const description = [
    `中古iPhoneで、容量を1つ上げると相場がいくら上がるかを比べ、上乗せが少ない順に並べたランキングです。1位は${top.model}で、${top.from}から${top.to}にしても+${man(top.diff)}円（+${top.pct.toFixed(1)}%）です。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: iPhone 13〜17 の無印と Pro で、在庫が${MIN_COUNT}件以上あるいちばん小さい容量と、その次の容量の相場（中央値）を比べ、差の小さい順。率は小さい容量の相場に対して。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.model}の容量別の在庫と最安値: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "storage",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "あなたは何GB派？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
