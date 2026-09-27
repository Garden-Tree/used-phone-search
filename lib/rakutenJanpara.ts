import type { Prisma } from "@prisma/client";
import { batteryOf, carrierOf, rankOf, stripPartNumber, toStorage, type RakutenItem } from "@/lib/rakutenCommon";
import { isKnownIphoneModel, normalizeModelPart } from "@/lib/iphoneModelName";

/** 楽天API経由で取り込むじゃんぱらの在庫のショップ名 */
export const RAKUTEN_JANPARA_SHOP = "じゃんぱら（楽天市場店）";

// 商品名の例:
//   【中古】Apple au 【SIMロック解除済み】 iPhone 12 mini 128GB ブルー MGDP3J/A【京都】保証期間1ヶ月【ランクB】
//   【未使用】Apple 国内版 【SIMフリー】 iPhone Air 256GB スカイブルー MG2A4J/A【福岡筑紫】保証期間3ヶ月
//   【中古】Apple 海外版 【SIMフリー】 iPhone 16 Pro Max 256GB デザートチタニウム【ECセンター】保証期間1ヶ月【ランクB】
//   【中古】Apple docomo 【SIMロック解除済み】 iPhone SE（第2世代） 64GB ブラック MHGP3J/A（後期型番）【アリオ倉敷】保証期間1ヶ月【ランクA】
const NAME_RE = /^【(中古|未使用)】\s*Apple\s+(\S+)\s+【([^】]+)】\s*iPhone\s*(.+?)\s+(\d+)\s*(GB|TB)\s+(.*?)【[^】]*】\s*保証期間[^【]*(?:【ランク([A-Z])】)?/;

/**
 * じゃんぱら楽天市場店の商品1件を DeviceInventory の行にする。iPhone 本体として読み取れないものは null
 */
export function normalizeJanparaItem(item: RakutenItem): Prisma.DeviceInventoryCreateManyInput | null {
  const m = item.name.match(NAME_RE);
  if (!m || !item.url || !(item.price > 0)) return null;

  const [, condition, carrierLabel, simLabel, modelPart, size, unit, restRaw, rankRaw] = m;
  const modelName = `iPhone ${normalizeModelPart(modelPart)}`;
  if (!isKnownIphoneModel(modelName)) return null;
  const storage = toStorage(size, unit);

  // 色の後ろの型番（MGDP3J/A など）と「（後期型番）」などの注記を落とす
  const color = stripPartNumber(restRaw);

  return {
    manufacturer: "Apple",
    modelName,
    storage,
    color: color || "-",
    conditionRank: rankOf(rankRaw, condition === "未使用"),
    batteryHealth: batteryOf(item),
    networkStatus: null,
    simUnlocked: /SIMフリー|解除/.test(simLabel),
    carrier: carrierOf(carrierLabel),
    shopName: RAKUTEN_JANPARA_SHOP,
    price: item.price,
    url: item.url,
    isSoldOut: false,
  };
}
