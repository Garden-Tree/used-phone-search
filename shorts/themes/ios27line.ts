/**
 * テーマ「iOS 27 に対応する、いちばん安い中古iPhoneは？」: iOS 27 対応の iPhone を中古の相場の安い順に並べたランキング → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は iOS 27 対応の iPhone（lib/catalog.ts の IPHONE_CATALOG＝iPhone 11 以降と SE 第2世代以降。Apple 公式 apple.com/jp/ios/）
 * - 相場はサイトと同じ「在庫がいちばん多い容量の中央値」（lib/modelInventory.ts の primaryMedian＝getModelMarket と同じ決め方）。その容量の在庫が MIN_COUNT 件以上の機種だけ
 * - 相場の安い順（同じ額なら発売の新しい方）。3機種に満たなければ止める
 * - 1位には、同じ容量で比べた iOS 27 非対応（lib/catalog.ts の LEGACY_SERIES）のうち発売がいちばん新しい機種（その容量の在庫 MIN_COUNT 件以上・同じ年なら安い方）との差を添える。
 *   「1つ前の世代とほぼ同じ値段なのに OS で分かれる」を見せる（10/25 ユーザーと決定。いちばん安い機種だと iPhone 8 になり差が大きいだけ）
 * DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { ALL_CATALOG_MODELS, LEGACY_SERIES, modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { specOf } from "@/lib/iphoneSpecs";
import { groupMinPrice, medianPrice, modelWhere, primaryMedian } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { Ios27Legacy, Ios27Row, Ios27Script } from "../types";

/** iOS 27 の対応機種の出典（Apple 公式） */
export const IOS27_SOURCE = "https://www.apple.com/jp/ios/";
const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_ios27line`;
/** 発売の新しさ（"2022年" → 2022。分からなければ 0） */
const year = (model: string) => Number(specOf(model)?.released.match(/\d{4}/)?.[0] ?? 0);

export async function buildIos27LineScript(date: string): Promise<Ios27Script> {
  const rows: Ios27Row[] = [];
  for (const model of ALL_CATALOG_MODELS) {
    const p = await primaryMedian(await modelWhere(model));
    if (!p || p.count < MIN_COUNT) {
      console.log(`  対象外: ${model}（在庫がいちばん多い容量の在庫 ${p?.count ?? 0} 件）`);
      continue;
    }
    const storage = storageLabel(p.storage, model);
    console.log(`  候補: ${model}（${storage}・在庫${p.count}件） 相場 ${man(p.price)}円`);
    rows.push({ model, storage, storageGb: p.storage, median: p.price, count: p.count, released: specOf(model)?.released ?? "" });
  }
  rows.sort((a, b) => a.median - b.median || year(b.model) - year(a.model));
  if (rows.length < SHOWN) throw new Error(`在庫${MIN_COUNT}件以上の iOS 27 対応 iPhone が ${rows.length} 機種しかありません（${SHOWN}機種以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];

  // 1位と同じ容量の、iOS 27 非対応で発売がいちばん新しい機種（同じ年なら安い方）
  let legacy: Ios27Legacy | undefined;
  for (const model of LEGACY_SERIES.flatMap((s) => s.models)) {
    const where = await modelWhere(model);
    const count = (await groupMinPrice(where, "storage")).find((g) => Number(g.key) === top.storageGb)?.count ?? 0;
    if (count < MIN_COUNT) {
      console.log(`  非対応・対象外: ${model}（${top.storage}の在庫 ${count} 件）`);
      continue;
    }
    const median = (await medianPrice({ AND: [where, { storage: top.storageGb }] }, count))!;
    console.log(`  非対応の候補: ${model}（${top.storage}・在庫${count}件） 相場 ${man(median)}円`);
    if (!legacy || year(model) > year(legacy.model) || (year(model) === year(legacy.model) && median < legacy.median)) legacy = { model, storage: top.storage, median, count, diff: top.median - median };
  }

  const shopCount = (await activeShops(SHOPS)).length;
  // 検品担当のひと言の下書き（1行16字以内・3行まで）。いちばん安い対応機種は古いので、OS の対応が先に終わる
  const lines = ["OSの対応が", "終わる前に", "買い替えも計画を"];

  const rawTitle = `iOS 27対応でいちばん安い中古iPhoneは${top.model}！相場${man(top.median)}円`;
  const title = rawTitle.length <= 60 ? rawTitle : `iOS 27対応でいちばん安い中古iPhoneは？相場${man(top.median)}円`;
  const legacyText = legacy
    ? legacy.diff > 0
      ? `同じ${top.storage}で、iOS 27 非対応でいちばん新しい世代の${legacy.model}（相場${man(legacy.median)}円）との差は${man(legacy.diff)}円です。`
      : legacy.diff < 0
        ? `同じ${top.storage}の iOS 27 非対応でいちばん新しい世代の${legacy.model}（相場${man(legacy.median)}円）より${man(-legacy.diff)}円安くなっています。`
        : `同じ${top.storage}の iOS 27 非対応でいちばん新しい世代の${legacy.model}と同じ相場です。`
    : "";
  const description = [
    `iOS 27 に対応する中古iPhoneを、相場の安い順に並べたランキングです。1位は${top.model}（${top.storage}）で、相場は${man(top.median)}円。${legacyText}`,
    "",
    ...items.map((r, i) => `${i + 1}位 ${r.model}（${r.storage}） 相場${man(r.median)}円（在庫${r.count}件・${r.released}発売）`),
    ...(legacy ? [`参考 iOS 27 非対応 ${legacy.model}（${legacy.storage}） 相場${man(legacy.median)}円（在庫${legacy.count}件）`] : []),
    "",
    `選び方: iOS 27 対応の iPhone（iPhone 11 以降・SE 第2世代以降。Apple公式 ${IOS27_SOURCE}）で、在庫がいちばん多い容量（在庫${MIN_COUNT}件以上）の相場の安い順。非対応の機種は、1位と同じ容量で在庫${MIN_COUNT}件以上のうち発売がいちばん新しい機種（同じ年なら相場の安い方）。データ: 大手中古ショップ${shopCount}店の在庫・相場＝同じ容量の中央値（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "ios27line",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      ...(legacy ? { legacy } : {}),
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "あなたなら どれにする？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone", "#iOS27"] },
  };
}
