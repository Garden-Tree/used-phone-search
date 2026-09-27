import type { Prisma } from "@prisma/client";
import { batteryOf, carrierOf, rankOf, stripPartNumber, toStorage, type RakutenItem } from "@/lib/rakutenCommon";
import { isKnownIphoneModel, normalizeModelPart } from "@/lib/iphoneModelName";

/** 楽天API経由で取り込むソフマップの在庫のショップ名 */
export const RAKUTEN_SOFMAP_SHOP = "ソフマップ（楽天市場店）";

// 商品名の例: 【中古】Apple(アップル) iPhone14 Pro 128GB ディープパープル MQ0F3J／A SIMフリー 【377-ud】
//             【中古】SoftBank iPhone SE 第2世代 64GB ホワイト MX9T2J／A SoftBank 【262-ud】
// ランク・キャリア・バッテリーは商品説明（〔商品ランクA〕〔キャリア〕docomoロック解除SIMフリー〔バッテリーの状態〕最大容量：82％）
// から fetch.php が rank / car / batt として抜き出して送ってくる
const NAME_RE = /^【(中古|未使用)[^】]*】\s*(?:Apple\s*\(アップル\)|docomo|au|SoftBank|Y!mobile|UQ\s*mobile|楽天モバイル)?\s*iPhone\s*(.+?)\s+(\d+)\s*(GB|TB)\s+(.*?)\s*(?:【[^】]*】)?\s*$/;

export function normalizeSofmapItem(
  item: RakutenItem,
): Prisma.DeviceInventoryCreateManyInput | null {
  const m = item.name.match(NAME_RE);
  if (!m || !item.url || !(item.price > 0)) return null;

  const [, condition, modelPart, size, unit, restRaw] = m;
  const modelName = `iPhone ${normalizeModelPart(modelPart)}`;
  if (!isKnownIphoneModel(modelName)) return null;
  const storage = toStorage(size, unit);

  // 色の後ろの型番（MQ0F3J／A）と、その後ろのキャリア表記を落とす
  const color = stripPartNumber(restRaw).replace(/\s*(?:SIMフリー|docomo|au|SoftBank).*$/, "").trim();
  const carrierSource = item.car ?? restRaw;


  return {
    manufacturer: "Apple",
    modelName,
    storage,
    color: color || "-",
    conditionRank: rankOf(item.rank, condition === "未使用"),
    batteryHealth: batteryOf(item),
    networkStatus: null,
    simUnlocked: /SIMフリー|解除/.test(carrierSource),
    carrier: carrierOf(carrierSource),
    shopName: RAKUTEN_SOFMAP_SHOP,
    price: item.price,
    url: item.url,
    isSoldOut: false,
  };
}
