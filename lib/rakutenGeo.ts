import type { Prisma } from "@prisma/client";
import { networkStatusOf, rankOf, toStorage, type RakutenItem } from "@/lib/rakutenCommon";

/** 楽天API経由で取り込むゲオモバイルの在庫のショップ名 */
export const RAKUTEN_GEO_SHOP = "ゲオモバイル（楽天市場店）";

/** 旧スクレイパー（ec.geo-online.co.jp）で取り込んでいたゲオのショップ名 */
export const LEGACY_GEO_SHOP = "ゲオモバイル";


// 商品名の例: 【中古】【安心保証】 iPhone15 Pro[512GB] SIMロック解除 docomo ブルーチタニウム
const NAME_RE = /iPhone\s?([^[]+?)\s*\[(\d+)(GB|TB)\]\s*(.*)$/;

// 商品名のキャリア表記 → 他ショップと揃えた表記（長いものから順に判定）
const CARRIERS: [string, string][] = [
  ["SoftBank/Y!mobile", "SoftBank"],
  ["au/UQ mobile", "au"],
  ["au/UQmobile", "au"],
  ["UQモバイル", "au"],
  ["Y!mobile", "SoftBank"],
  ["SIMフリー", "国内版SIMフリー"],
  ["楽天モバイル", "楽天モバイル"],
  ["SoftBank", "SoftBank"],
  ["docomo", "docomo"],
  ["au/UQ", "au"],
  ["SB/YM", "SoftBank"],
  ["au", "au"],
];

/** 2021年秋以降発売のモデルは SIM ロックなしで販売されている */
function isSimLockFreeEra(model: string): boolean {
  const n = model.match(/^iPhone (\d+)/);
  if (n) return Number(n[1]) >= 13;
  return /Air|SE.*第3世代/.test(model);
}

/**
 * 楽天の商品1件を DeviceInventory の行にする。iPhone 本体として読み取れないものは null
 */
export function normalizeRakutenGeoItem(item: RakutenItem): Prisma.DeviceInventoryCreateManyInput | null {
  const m = item.name.match(NAME_RE);
  if (!m || !item.url || !(item.price > 0)) return null;

  const [, modelPart, size, unit, restRaw] = m;
  const modelName = `iPhone ${modelPart.trim()}`;
  const storage = toStorage(size, unit);

  let rest = restRaw.trim();
  const unlocked = rest.startsWith("SIMロック解除");
  if (unlocked) rest = rest.slice("SIMロック解除".length).trim();

  const carrierEntry = CARRIERS.find(([label]) => rest === label || rest.startsWith(`${label} `));
  const carrier = carrierEntry ? carrierEntry[1] : null;
  const color = carrierEntry ? rest.slice(carrierEntry[0].length).trim() : rest;

  const rank = rankOf(item.rank);
  const networkStatus = networkStatusOf(item);

  return {
    manufacturer: "Apple",
    modelName,
    storage,
    color: color || "-",
    conditionRank: rank,
    batteryHealth: null, // ゲオの楽天店は「バッテリーの消耗具合はわかりかねます」と表記しており値がない
    networkStatus,
    simUnlocked: carrier === "国内版SIMフリー" || unlocked || isSimLockFreeEra(modelName),
    carrier,
    shopName: RAKUTEN_GEO_SHOP,
    price: item.price,
    url: item.url,
    isSoldOut: false,
  };
}
