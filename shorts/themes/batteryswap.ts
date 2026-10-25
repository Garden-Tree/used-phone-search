/**
 * テーマ「電池交換を足すと、1つ上の世代と同じ値段？」: 中古の相場＋Apple 公式の電池交換の料金と、1つ上の世代の同じ容量の相場を比べたランキング → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: 古い方 → 1つ上の世代（PAIRS。無印・mini・Plus・Pro・Pro Max・e・SE の同じ系統）。古い方は iOS 27 対応で、Apple 公式の電池交換の料金（lib/appleRepairPrices.ts）がある機種だけ
 * - 容量は、両方の機種で在庫が MIN_COUNT 件以上ある容量のうち、いちばん小さい容量（gen と同じ）。なければその組は出さない
 * - 合計 = 古い方の相場（その容量の中央値）＋電池交換（保証対象外・税込）。差 = 1つ上の世代の相場 − 合計
 * - 差の絶対値の小さい順（「ほぼ同じ値段」の組が1位）。3組に満たなければ止める
 * DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import { APPLE_REPAIR_CHECKED, APPLE_REPAIR_SOURCE, appleRepair } from "@/lib/appleRepairPrices";
import type { BatterySwapRow, BatterySwapScript } from "../types";

/** 比べる組（古い方・1つ上の世代） */
const PAIRS: [string, string][] = [
  ["iPhone 11", "iPhone 12"],
  ["iPhone 12", "iPhone 13"],
  ["iPhone 13", "iPhone 14"],
  ["iPhone 14", "iPhone 15"],
  ["iPhone 15", "iPhone 16"],
  ["iPhone 16", "iPhone 17"],
  ["iPhone 12 mini", "iPhone 13 mini"],
  ["iPhone 14 Plus", "iPhone 15 Plus"],
  ["iPhone 15 Plus", "iPhone 16 Plus"],
  ["iPhone 12 Pro", "iPhone 13 Pro"],
  ["iPhone 13 Pro", "iPhone 14 Pro"],
  ["iPhone 14 Pro", "iPhone 15 Pro"],
  ["iPhone 15 Pro", "iPhone 16 Pro"],
  ["iPhone 16 Pro", "iPhone 17 Pro"],
  ["iPhone 17 Pro", "iPhone 18 Pro"],
  ["iPhone 12 Pro Max", "iPhone 13 Pro Max"],
  ["iPhone 13 Pro Max", "iPhone 14 Pro Max"],
  ["iPhone 14 Pro Max", "iPhone 15 Pro Max"],
  ["iPhone 15 Pro Max", "iPhone 16 Pro Max"],
  ["iPhone 16 Pro Max", "iPhone 17 Pro Max"],
  ["iPhone 17 Pro Max", "iPhone 18 Pro Max"],
  ["iPhone 16e", "iPhone 17e"],
  ["iPhone SE (第2世代)", "iPhone SE (第3世代)"],
];
const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_batteryswap`;
/** "iPhone 13 Pro" → "13 Pro"、"iPhone SE (第3世代)" → "SE (第3世代)" */
export const swapShort = (model: string) => model.replace(/^iPhone\s+/, "");

type Side = { where: Awaited<ReturnType<typeof modelWhere>>; counts: Map<number, number> };
async function side(model: string): Promise<Side> {
  const where = await modelWhere(model);
  const counts = new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), g.count] as const));
  return { where, counts };
}
const medianAt = async (s: Side, storage: number) => (await medianPrice({ AND: [s.where, { storage }] }, s.counts.get(storage) ?? 0))!;

export async function buildBatterySwapScript(date: string): Promise<BatterySwapScript> {
  const rows: BatterySwapRow[] = [];
  for (const [older, newer] of PAIRS) {
    const battery = appleRepair(older)?.battery;
    if (!battery) {
      console.log(`  対象外: ${older}（Apple 公式の電池交換の料金がない）`);
      continue;
    }
    const [a, b] = [await side(older), await side(newer)];
    const common = [...a.counts.keys()].filter((g) => (a.counts.get(g) ?? 0) >= MIN_COUNT && (b.counts.get(g) ?? 0) >= MIN_COUNT).sort((x, y) => x - y);
    if (common.length === 0) {
      console.log(`  対象外: ${older}→${newer}（両方に在庫${MIN_COUNT}件以上の容量がない）`);
      continue;
    }
    const gb = common[0];
    const [olderMedian, newerMedian] = [await medianAt(a, gb), await medianAt(b, gb)];
    const total = olderMedian + battery;
    const row: BatterySwapRow = {
      older, newer, storage: storageLabel(gb, older), storageGb: gb, olderMedian, battery, total, newerMedian,
      olderCount: a.counts.get(gb)!, newerCount: b.counts.get(gb)!, gap: newerMedian - total,
    };
    console.log(`  候補: ${older}→${newer}（${row.storage}・在庫 ${row.olderCount}件／${row.newerCount}件） ${man(olderMedian)}円＋電池 ${man(battery)}円＝${man(total)}円 vs ${man(newerMedian)}円（差 ${row.gap >= 0 ? "+" : "−"}${man(Math.abs(row.gap))}円）`);
    rows.push(row);
  }
  rows.sort((x, y) => Math.abs(x.gap) - Math.abs(y.gap) || x.total - y.total);
  if (rows.length < SHOWN) throw new Error(`比べられる組が ${rows.length} 組しかありません（${SHOWN}組以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。1つ上の世代の方が安いなら、交換より買い替え
  const lines = top.gap >= 0 ? ["差がこれだけなら", "1つ上の世代も", "検討しましょう"] : ["電池交換するより", "1つ上の世代が", "安く買えます"];

  const gapText = (r: BatterySwapRow) => (r.gap >= 0 ? `${swapShort(r.newer)}の方が${man(r.gap)}円高い` : `${swapShort(r.newer)}の方が${man(-r.gap)}円安い`);
  const rawTitle = `${top.older}＋電池交換と${swapShort(top.newer)}の差は${man(Math.abs(top.gap))}円！1つ上の世代と比べたランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `電池交換を足すと1つ上と${man(Math.abs(top.gap))}円差！中古iPhone`;
  const rowText = (r: BatterySwapRow, i: number) =>
    `${i + 1}位 ${r.older}（${r.storage}） ${man(r.olderMedian)}円＋電池交換${man(r.battery)}円＝${man(r.total)}円 vs ${r.newer} ${man(r.newerMedian)}円（${gapText(r)}）`;
  const description = [
    `中古iPhoneの相場に Apple 公式の電池交換の料金を足すと、1つ上の世代と比べてどれくらい違うかのランキング（差の小さい順）です。1位は${top.older}（${top.storage}）で、${man(top.olderMedian)}円＋電池交換${man(top.battery)}円＝${man(top.total)}円。${top.newer}の相場${man(top.newerMedian)}円との差は${man(Math.abs(top.gap))}円（${gapText(top)}）です。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: iOS 27 対応の iPhone と1つ上の世代の組（無印・mini・Plus・Pro・Pro Max・e・SE）で、両方に在庫が${MIN_COUNT}件以上ある容量のうちいちばん小さい容量の相場（中央値）を比べ、古い方の相場＋電池交換と1つ上の世代の相場の差が小さい順。電池交換は Apple 公式の料金（保証対象外・税込・${slash(APPLE_REPAIR_CHECKED)}確認 ${APPLE_REPAIR_SOURCE.battery}）。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.older}の電池別の在庫と最安値: https://used.gadelog.com${modelPagePath(top.older)}?${utm(date)}`,
    `${top.newer}の在庫と最安値: https://used.gadelog.com${modelPagePath(top.newer)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "batteryswap",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "電池交換？それとも1つ上？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone", "#電池交換"] },
  };
}
