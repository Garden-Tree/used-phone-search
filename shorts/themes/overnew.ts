/**
 * テーマ「中古なのに新品より高い？ 新品との差がいちばん小さい中古iPhone」: 中古の相場 ÷ Apple 公式の新品価格 の高い順のランキング → 台本
 * newused（新品より安い額の大きい順）の裏返し。
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は Apple 公式の新品価格を確かめてある iPhone（lib/applePrices.ts。Apple が販売を終えた機種は入らない）
 * - 容量は newused と同じ: 公式価格のある容量のうち中古の在庫がいちばん多い容量（同じ件数なら小さい容量）。その容量の在庫が MIN_COUNT 件以上の機種だけ
 * - 中古の相場（その容量の中央値）÷ 新品（税込）の高い順。中古の相場が新品以上の機種も入れる（1位なら「新品より○円高い」）。3機種に満たなければ止める
 * DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { APPLE_PRICES_CHECKED, applePrice, applePriceSource, applePriceStorages } from "@/lib/applePrices";
import { ALL_CATALOG_MODELS, modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { specOf } from "@/lib/iphoneSpecs";
import { groupMinPrice, modelWhere, primaryMedian } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { OverNewRow, OverNewScript } from "../types";

const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_overnew`;

export async function buildOverNewScript(date: string): Promise<OverNewScript> {
  const models = ALL_CATALOG_MODELS.filter((m) => applePriceStorages(m).length > 0);
  const rows: OverNewRow[] = [];
  for (const model of models) {
    const where = await modelWhere(model);
    const byStorage = (await groupMinPrice(where, "storage")).filter((r) => applePrice(model, r.key) !== null);
    const primary = await primaryMedian(where, byStorage);
    if (!primary || primary.count < MIN_COUNT) {
      console.log(`  対象外: ${model}（公式価格のある容量の在庫 ${primary?.count ?? 0} 件）`);
      continue;
    }
    const newPrice = applePrice(model, primary.storage)!;
    const diff = newPrice - primary.price;
    const ratio = Math.round((primary.price / newPrice) * 1000) / 10;
    console.log(`  候補: ${model}（${storageLabel(primary.storage, model)}・在庫${primary.count}件） 新品 ${man(newPrice)}円・中古の相場 ${man(primary.price)}円（新品の${ratio.toFixed(1)}%・差 ${diff >= 0 ? "−" : "+"}${man(Math.abs(diff))}円）`);
    rows.push({
      model, storage: storageLabel(primary.storage, model), storageGb: primary.storage, released: specOf(model)?.released ?? "",
      newPrice, usedMedian: primary.price, count: primary.count, diff, pct: Math.round((diff / newPrice) * 1000) / 10, ratio,
    });
  }
  // 新品に対する中古の相場の割合の高い順（同じなら差の小さい方）
  rows.sort((a, b) => b.ratio - a.ratio || a.diff - b.diff);
  if (rows.length < SHOWN) throw new Error(`新品の公式価格があり、在庫${MIN_COUNT}件以上の iPhone が ${rows.length} 機種しかありません（${SHOWN}機種以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const over = top.diff < 0;

  const shopCount = (await activeShops(SHOPS)).length;
  const checked = slash(APPLE_PRICES_CHECKED);

  // 検品担当のひと言の下書き（1行16字以内・3行まで）
  const lines = over ? ["発売直後の中古は", "新品の値段と", "比べてから買いましょう"] : ["差が小さいなら", "保証のある新品も", "考えましょう"];

  const rowText = (r: OverNewRow, i: number) =>
    `${i + 1}位 ${r.model}（${r.storage}） 新品${man(r.newPrice)}円・中古の相場${man(r.usedMedian)}円（新品の${r.ratio.toFixed(1)}%・${r.diff >= 0 ? `−${man(r.diff)}円` : `新品より+${man(-r.diff)}円`}）`;
  const rawTitle = over
    ? `${top.model}は中古が新品より${man(-top.diff)}円高い！新品との差が小さい中古iPhone`
    : `${top.model}は中古でも新品の${top.ratio.toFixed(1)}%！新品との差が小さい中古iPhone`;
  const title = rawTitle.length <= 60 ? rawTitle : over ? `中古なのに新品より${man(-top.diff)}円高い！新品との差が小さい中古iPhone` : `中古でも新品の${top.ratio.toFixed(1)}%！新品との差が小さい中古iPhone`;
  const src = applePriceSource(top.model);
  const description = [
    `新品（Apple公式）と中古の相場の差が小さい順のランキングです。1位は${top.model}（${top.storage}）で、新品${man(top.newPrice)}円に対して中古の相場は${man(top.usedMedian)}円（新品の${top.ratio.toFixed(1)}%${over ? `・新品より${man(-top.diff)}円高い` : `・差${man(top.diff)}円`}）。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: Apple公式で新品を売っている iPhone のうち、公式価格のある容量で中古の在庫がいちばん多い容量（在庫${MIN_COUNT}件以上）の相場を新品と比べ、中古の相場÷新品の高い順（中古の相場が新品以上の機種も含む）。データ: 大手中古ショップ${shopCount}店の在庫・相場＝同じ容量の中央値（${slash(date)}時点）・新品＝Apple公式（税込・${checked}確認${src ? ` ${src}` : ""}）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "overnew",
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
        question: "この差なら 新品？中古？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
