/**
 * テーマ「新品より中古でいくら安い？」: Apple 公式の新品価格と、中古の相場（同じ容量の中央値）の差のランキング → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は Apple 公式の新品価格を確かめてある iPhone（lib/applePrices.ts。Apple が販売を終えた機種は入らない）
 * - 容量は、公式価格のある容量のうち中古の在庫がいちばん多い容量（同じ件数なら小さい容量。primaryMedian と同じ決め方）。
 *   その容量の在庫が MIN_COUNT 件以上の機種だけ
 * - 中古の値段は最安ではなく相場（その容量の中央値）。新品（Apple 公式・税込）− 中古の相場 の額が大きい順
 * - 中古の相場が新品以上（差が0以下）の機種は出さない（発売直後の機種で起きる）。3機種に満たなければ止める
 * DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { APPLE_PRICES_CHECKED, applePrice, applePriceStorages } from "@/lib/applePrices";
import { ALL_CATALOG_MODELS, modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { specOf } from "@/lib/iphoneSpecs";
import { groupMinPrice, modelWhere, primaryMedian } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { NewUsedRow, NewUsedScript } from "../types";

/** 相場が数件の在庫で決まらないように（その容量の在庫の件数） */
const MIN_COUNT = 5;
/** 動画・説明欄に出す数（3位・2位・1位） */
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
/** 何万円（0.1万円単位で切り捨て。多く見せない） */
const manYen = (n: number) => `${Math.floor(n / 1000) / 10}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_newused`;

export async function buildNewUsedScript(date: string): Promise<NewUsedScript> {
  const models = ALL_CATALOG_MODELS.filter((m) => applePriceStorages(m).length > 0);
  const rows: NewUsedRow[] = [];
  for (const model of models) {
    const where = await modelWhere(model);
    // 公式価格のある容量だけで「在庫がいちばん多い容量の中央値」を取る
    const byStorage = (await groupMinPrice(where, "storage")).filter((r) => applePrice(model, r.key) !== null);
    const primary = await primaryMedian(where, byStorage);
    if (!primary || primary.count < MIN_COUNT) {
      console.log(`  対象外: ${model}（公式価格のある容量の在庫 ${primary?.count ?? 0} 件）`);
      continue;
    }
    const newPrice = applePrice(model, primary.storage)!;
    const diff = newPrice - primary.price;
    console.log(`  候補: ${model}（${storageLabel(primary.storage, model)}・在庫${primary.count}件） 新品 ${man(newPrice)}円 → 中古の相場 ${man(primary.price)}円（差 ${man(diff)}円）`);
    if (diff <= 0) continue;
    rows.push({
      model, storage: storageLabel(primary.storage, model), storageGb: primary.storage, released: specOf(model)?.released ?? "",
      newPrice, usedMedian: primary.price, count: primary.count, diff, pct: Math.round((diff / newPrice) * 1000) / 10,
    });
  }
  // 差額の大きい順（同じ額なら率の大きい方）
  rows.sort((a, b) => b.diff - a.diff || b.pct - a.pct);
  if (rows.length < SHOWN) throw new Error(`新品の公式価格があり、在庫${MIN_COUNT}件以上で中古の相場が新品より安い iPhone が ${rows.length} 機種しかありません（${SHOWN}機種以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];

  const shopCount = (await activeShops(SHOPS)).length;
  const checked = slash(APPLE_PRICES_CHECKED);

  // 検品担当のひと言の下書き（人が書き換える前提・1行16字以内・3行まで）。新しい機種の中古は Apple の保証が残っていることが多い
  const lines = ["新しい機種の中古は", "保証の残りも", "確認しましょう"];

  const rawTitle = `${top.model}、中古なら新品より${manYen(top.diff)}円安い！新品と中古の差ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `中古なら新品より${manYen(top.diff)}円安い！新品と中古の差ランキング`;
  const description = [
    `新品（Apple公式）より中古でいくら安くなるかのランキングです。1位は${top.model}（${top.storage}）で、新品${man(top.newPrice)}円に対して中古の相場は${man(top.usedMedian)}円（−${man(top.diff)}円・−${top.pct.toFixed(1)}%）。`,
    "",
    ...items.map((r, i) => `${i + 1}位 ${r.model}（${r.storage}） 新品${man(r.newPrice)}円 → 中古の相場${man(r.usedMedian)}円（−${man(r.diff)}円・−${r.pct.toFixed(1)}%）`),
    "",
    `選び方: Apple公式で新品を売っている iPhone のうち、公式価格のある容量で中古の在庫がいちばん多い容量（在庫${MIN_COUNT}件以上）の相場を新品と比べ、差額の大きい順（中古の相場が新品以上の機種は除く）。データ: 大手中古ショップ${shopCount}店の在庫・相場＝同じ容量の中央値（${slash(date)}時点）・新品＝Apple公式（税込・${checked}確認）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "newused",
    date,
    shopCount,
    appleChecked: APPLE_PRICES_CHECKED,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "新品と中古、どっちにする？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
