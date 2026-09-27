import type { Prisma } from "@prisma/client";
import type { RakutenGeoItem } from "@/lib/rakutenGeo";
import { isKnownIphoneModel, normalizeModelPart } from "@/lib/iphoneModelName";

/** 楽天API経由で取り込むソフマップの在庫のショップ名 */
export const RAKUTEN_SOFMAP_SHOP = "ソフマップ（楽天市場店）";

// 商品名の例: 【中古】Apple(アップル) iPhone14 Pro 128GB ディープパープル MQ0F3J／A SIMフリー 【377-ud】
//             【中古】SoftBank iPhone SE 第2世代 64GB ホワイト MX9T2J／A SoftBank 【262-ud】
// ランク・キャリア・バッテリーは商品説明（〔商品ランクA〕〔キャリア〕docomoロック解除SIMフリー〔バッテリーの状態〕最大容量：82％）
// から fetch.php が rank / car / batt として抜き出して送ってくる
const NAME_RE = /^【(中古|未使用)[^】]*】\s*(?:Apple\s*\(アップル\)|docomo|au|SoftBank|Y!mobile|UQ\s*mobile|楽天モバイル)?\s*iPhone\s*(.+?)\s+(\d+)\s*(GB|TB)\s+(.*?)\s*(?:【[^】]*】)?\s*$/;

const RANKS = new Set(["S", "A", "B", "C", "D", "J"]);

/** 「docomoロック解除SIMフリー」「SIMフリー」「au」などを他ショップと揃えた表記にする */
function normalizeCarrier(raw: string): string | null {
  if (/docomo|ドコモ/i.test(raw)) return "docomo";
  if (/SoftBank|ソフトバンク|Y!mobile/i.test(raw)) return "SoftBank";
  if (/au|UQ/i.test(raw)) return "au";
  if (/楽天/.test(raw)) return "楽天モバイル";
  if (/海外/.test(raw)) return "海外版SIMフリー";
  if (/SIMフリー/.test(raw)) return "国内版SIMフリー";
  return null;
}

export function normalizeSofmapItem(
  item: RakutenGeoItem & { batt?: number | null; car?: string | null },
): Prisma.DeviceInventoryCreateManyInput | null {
  const m = item.name.match(NAME_RE);
  if (!m || !item.url || !(item.price > 0)) return null;

  const [, condition, modelPart, size, unit, restRaw] = m;
  const modelName = `iPhone ${normalizeModelPart(modelPart)}`;
  if (!isKnownIphoneModel(modelName)) return null;
  const storage = unit === "TB" ? Number(size) * 1024 : Number(size);

  // 色の後ろの型番（MQ0F3J／A）と、その後ろのキャリア表記を落とす
  const color = restRaw.replace(/\s*[A-Z0-9]{4,6}(?:J|ZA|LL|CH)?[／/]A.*$/, "").replace(/\s*(?:SIMフリー|docomo|au|SoftBank).*$/, "").trim();
  const carrierSource = item.car ?? restRaw;

  const rank = condition === "未使用" ? "S" : item.rank && RANKS.has(item.rank) ? item.rank : "不明";
  const battery = typeof item.batt === "number" && item.batt > 0 && item.batt <= 100 ? item.batt : null;

  return {
    manufacturer: "Apple",
    modelName,
    storage,
    color: color || "-",
    conditionRank: rank,
    batteryHealth: battery,
    networkStatus: null,
    simUnlocked: /SIMフリー|解除/.test(carrierSource),
    carrier: normalizeCarrier(carrierSource),
    shopName: RAKUTEN_SOFMAP_SHOP,
    price: item.price,
    url: item.url,
    isSoldOut: false,
  };
}
