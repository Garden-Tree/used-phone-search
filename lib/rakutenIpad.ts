import type { Prisma } from "@prisma/client";
import type { RakutenGeoItem } from "@/lib/rakutenGeo";
import { canonicalIpadModel } from "@/lib/ipadCatalog";

/**
 * 楽天市場店（ゲオ・じゃんぱら・ソフマップ）の iPad の商品1件を DeviceInventory の行にする。
 * 機種名は lib/ipadCatalog.ts の正式名にそろえる。読み取れないもの（アクセサリなど）は null
 */

type Item = RakutenGeoItem & { batt?: number | null; car?: string | null };
type Row = Prisma.DeviceInventoryCreateManyInput;

/** Wi-Fi モデルの carrier の値（DeviceCard が「Wi-Fiモデル」と表示する） */
export const WIFI_MODEL = "Wi-Fiモデル";

const RANKS = new Set(["S", "A", "B", "C", "D", "J"]);

function toStorage(size: string, unit: string): number {
  return unit === "TB" ? Number(size) * 1024 : Number(size);
}

function battery(item: Item): number | null {
  return typeof item.batt === "number" && item.batt > 0 && item.batt <= 100 ? item.batt : null;
}

/** 「docomo」「auロック解除SIMフリー」「SIMフリー」などを他ショップと揃えた表記にする */
function carrierOf(raw: string): string | null {
  if (/docomo|ドコモ/i.test(raw)) return "docomo";
  if (/SoftBank|ソフトバンク|Y!mobile/i.test(raw)) return "SoftBank";
  if (/\bau\b|au\/|UQ|^au/i.test(raw)) return "au";
  if (/楽天/.test(raw)) return "楽天モバイル";
  if (/海外/.test(raw)) return "海外版SIMフリー";
  if (/国内版|SIMフリー/.test(raw)) return "国内版SIMフリー";
  return null;
}

// 色の後ろの型番（MK2L3J/A・MXE42J／A）以降を落とす
const stripPartNumber = (s: string) => s.replace(/\s*[A-Z0-9]{4,6}(?:J|ZA|LL|CH)?[／/]A.*$/, "").trim();

function row(item: Item, fields: Omit<Row, "manufacturer" | "price" | "url" | "isSoldOut" | "networkStatus">): Row {
  return { manufacturer: "Apple", networkStatus: null, price: item.price, url: item.url, isSoldOut: false, ...fields };
}

// じゃんぱら:
//   【中古】Apple 【Wi-Fi】 iPad（第9世代/2021） 64GB シルバー MK2L3J/A【神戸】保証期間1週間【ランクC】
//   【中古】Apple docomo 【SIMフリー】 iPad mini（第6世代/2021） 64GB スペースグレイ MK893J/A【戸塚】保証期間1ヶ月【ランクB】
//   【未使用】Apple 【Wi-Fi】 11インチ iPad Air（M4/2026) 128GB スペースグレイ MH304J/A【秋葉4号】保証期間6ヶ月
const JANPARA_RE = /^【(中古|未使用)】\s*Apple\s+(?:(\S+)\s+)?【([^】]+)】\s*(.*?iPad.*?)\s+(\d+)\s*(GB|TB)\s+(.*?)【[^】]*】\s*保証期間[^【]*(?:【ランク([A-Z])】)?/;

export function normalizeJanparaIpad(shopName: string, item: Item): Row | null {
  const m = item.name.match(JANPARA_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, condition, carrierLabel = "", simLabel, modelPart, size, unit, restRaw, rankRaw] = m;
  const modelName = canonicalIpadModel(modelPart);
  if (!modelName) return null;
  const wifi = /Wi-?Fi/i.test(simLabel) && !carrierLabel;
  return row(item, {
    modelName,
    storage: toStorage(size, unit),
    color: stripPartNumber(restRaw).replace(/\s*(標準ガラス|Nano-textureガラス)$/, "") || "-",
    conditionRank: condition === "未使用" ? "S" : rankRaw && RANKS.has(rankRaw) ? rankRaw : "不明",
    batteryHealth: battery(item),
    simUnlocked: wifi || /SIMフリー|解除/.test(simLabel),
    carrier: wifi ? WIFI_MODEL : carrierOf(carrierLabel),
    shopName,
  });
}

// ソフマップ:
//   【中古】Apple(アップル) iPad Pro 11インチ 第2世代 256GB スペースグレイ MXE42J／A SIMフリー 【269-ud】
//   【中古】Apple(アップル) iPad mini(A17 Pro) 256GB スペースグレイ MXNA3J／A Wi-Fi 【258-ud】
const SOFMAP_RE = /^【(中古|未使用)[^】]*】\s*(?:Apple\s*\(アップル\))?\s*(iPad.*?)\s+(\d+)\s*(GB|TB)\s+(.*?)\s*(?:【[^】]*】)?\s*$/;

export function normalizeSofmapIpad(shopName: string, item: Item): Row | null {
  const m = item.name.match(SOFMAP_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, condition, modelPart, size, unit, restRaw] = m;
  const modelName = canonicalIpadModel(modelPart);
  if (!modelName) return null;
  const tail = restRaw.replace(/^.*?[A-Z0-9]{4,6}(?:J|ZA|LL|CH)?[／/]A\s*/, "");
  const wifi = /Wi-?Fi/i.test(tail) && !/SIM|Cellular|docomo|au|SoftBank/i.test(tail);
  const carrierSource = item.car ?? tail;
  return row(item, {
    modelName,
    storage: toStorage(size, unit),
    color: stripPartNumber(restRaw).replace(/\s*(Wi-?Fi|SIMフリー).*$/, "") || "-",
    conditionRank: condition === "未使用" ? "S" : item.rank && RANKS.has(item.rank) ? item.rank : "不明",
    batteryHealth: battery(item),
    simUnlocked: wifi || /SIMフリー|解除/.test(carrierSource),
    carrier: wifi ? WIFI_MODEL : carrierOf(carrierSource),
    shopName,
  });
}

// ゲオ: 【中古】【安心保証】 iPad 10.2インチ 第8世代[32GB] Wi-Fiモデル シルバー
const GEO_RE = /(iPad[^[]*?)\s*\[(\d+)(GB|TB)\]\s*(.*)$/;

export function normalizeGeoIpad(shopName: string, item: Item): Row | null {
  const m = item.name.match(GEO_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, modelPart, size, unit, restRaw] = m;
  const modelName = canonicalIpadModel(modelPart);
  if (!modelName) return null;
  let rest = restRaw.trim();
  const wifi = /^Wi-?Fiモデル/i.test(rest);
  rest = rest.replace(/^Wi-?Fi\s*\+\s*Cellular(モデル)?\s*|^Wi-?Fiモデル\s*|^Cellular(モデル)?\s*/i, "");
  const unlocked = rest.startsWith("SIMロック解除");
  if (unlocked) rest = rest.slice("SIMロック解除".length).trim();
  const carrierMatch = rest.match(/^(SIMフリー|docomo|au|SoftBank|楽天モバイル|Y!mobile|UQ\s*mobile)\s*/i);
  const color = carrierMatch ? rest.slice(carrierMatch[0].length) : rest;
  return row(item, {
    modelName,
    storage: toStorage(size, unit),
    color: color.trim() || "-",
    conditionRank: item.rank && RANKS.has(item.rank) ? item.rank : "不明",
    batteryHealth: null, // ゲオの楽天店はバッテリーの記載がない
    simUnlocked: wifi || unlocked || carrierMatch?.[1] === "SIMフリー",
    carrier: wifi ? WIFI_MODEL : carrierMatch ? carrierOf(carrierMatch[1]) : null,
    shopName,
  });
}
