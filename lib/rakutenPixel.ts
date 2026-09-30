import type { Prisma } from "@prisma/client";
import { batteryOf, carrierOf, networkStatusOf, rankOf, toStorage, type RakutenItem } from "@/lib/rakutenCommon";
import { canonicalPixelModel } from "@/lib/pixelCatalog";

/**
 * 楽天市場店（ゲオ・じゃんぱら・ソフマップ）の Google Pixel の商品1件を DeviceInventory の行にする（2026-09-30〜）。
 * 機種名は lib/pixelCatalog.ts の Google の表記にそろえる。Pixel 5a 以前・アクセサリなど読み取れないものは null
 *
 * - SIM ロック: 掲載する Pixel 6 以降は 2021年10月（SIM ロックの原則禁止）より後の発売なので、キャリア版も含めて SIM フリーとして扱う
 * - キャリア: 国内の SIM フリー版は "Google"（DeviceCard が「SIMフリー（Google版）」と表示）、キャリア版はキャリア名
 */

type Item = RakutenItem;
type Row = Prisma.DeviceInventoryCreateManyInput;

function row(item: Item, fields: Omit<Row, "manufacturer" | "price" | "url" | "isSoldOut" | "networkStatus" | "simUnlocked">): Row {
  return {
    manufacturer: "Google", networkStatus: networkStatusOf(item), simUnlocked: true,
    price: item.price, url: item.url, isSoldOut: false, ...fields,
  };
}

/** carrierOf の「国内版SIMフリー」は iPhone 向け（Apple版と表示される）なので、Pixel では "Google" にする */
function pixelCarrier(raw: string): string | null {
  const c = carrierOf(raw);
  return c === "国内版SIMフリー" ? "Google" : c;
}

/** 機種名の後ろに続く色（"Pixel Fold ポーセリン" → "ポーセリン"、"Pixel 11 [Obsidian]" → "Obsidian"） */
function colorAfterModel(modelPart: string): string {
  return modelPart
    .replace(/^.*?Pixel\s?(?:\d{1,2}\s?(?:a|Pro\s?Fold|Pro\s?XL|Pro)?|Fold)(?![0-9A-Za-z])/i, "")
    .replace(/[[\]]/g, "")
    .trim();
}

// ゲオ: 【中古】【安心保証】 Google Pixel 8a[128GB] docomo ポーセリン
//       【中古】【安心保証】 Google Pixel 10[256GB] SIMフリー オブシディアン
const GEO_RE = /(Pixel[^[]*?)\s*\[(\d+)(GB|TB)\]\s*(.*)$/;

export function normalizeGeoPixel(shopName: string, item: Item): Row | null {
  const m = item.name.match(GEO_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, modelPart, size, unit, restRaw] = m;
  const modelName = canonicalPixelModel(modelPart);
  if (!modelName) return null;
  const rest = restRaw.trim().replace(/^SIMロック解除\s*/, "");
  const carrierMatch = rest.match(/^(SIMフリー|docomo|au|SoftBank|楽天モバイル|Y!mobile|UQ\s*(?:mobile|モバイル))\s*/i);
  const color = carrierMatch ? rest.slice(carrierMatch[0].length) : rest;
  return row(item, {
    modelName,
    storage: toStorage(size, unit),
    color: color.trim() || "-",
    conditionRank: rankOf(item.rank),
    batteryHealth: null, // ゲオの楽天店はバッテリーの記載がない
    carrier: carrierMatch ? pixelCarrier(carrierMatch[1]) : null,
    shopName,
  });
}

// じゃんぱら（メモリ → 容量の順に書かれる）:
//   【中古】Google au 【SIMフリー】 Pixel 8a ベイ 8GB 128GB G576D【ECセンター】保証期間1ヶ月【ランクC】
//   【中古】Google 海外版 【SIMフリー】 Pixel 10 Pro 16GB 128GB【仙台駅東口】保証期間1ヶ月【ランクA】
//   【未使用】Google 【SIMフリー】 Pixel 11 [Obsidian] 12GB 256GB【仙台イービーンズ】保証期間3ヶ月
const JANPARA_RE = /^【(中古|未使用)】\s*Google\s+(?:(\S+)\s+)?【([^】]+)】\s*(Pixel.*?)\s+(?:\d+GB\s+)?(\d+)\s*(GB|TB)\b[^【]*【[^】]*】\s*保証期間[^【]*(?:【ランク([A-Z])】)?/;

export function normalizeJanparaPixel(shopName: string, item: Item): Row | null {
  const m = item.name.match(JANPARA_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, condition, carrierLabel = "", , modelPart, size, unit, rankRaw] = m;
  const modelName = canonicalPixelModel(modelPart);
  if (!modelName) return null;
  return row(item, {
    modelName,
    storage: toStorage(size, unit),
    color: colorAfterModel(modelPart) || "-",
    conditionRank: rankOf(rankRaw, condition === "未使用"),
    batteryHealth: batteryOf(item),
    carrier: pixelCarrier(carrierLabel),
    shopName,
  });
}

// ソフマップ:
//   【中古】GOOGLE(グーグル) Google Pixel 6a 128GB セージ GB17L au SIMフリー 【305-ud】
//   【中古】GOOGLE(グーグル) Google Pixel 10a 128GB Berry PIXEL10A128 SIMフリー 【196-ud】
const SOFMAP_RE = /^【(中古|未使用)[^】]*】\s*(?:GOOGLE\s*\(グーグル\))?\s*(?:Google\s+)?(Pixel.*?)\s+(\d+)\s*(GB|TB)\s+(.*?)\s*(?:【[^】]*】)?\s*$/;

export function normalizeSofmapPixel(shopName: string, item: Item): Row | null {
  const m = item.name.match(SOFMAP_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, condition, modelPart, size, unit, restRaw] = m;
  const modelName = canonicalPixelModel(modelPart);
  if (!modelName) return null;
  const [color = "-"] = restRaw.split(/\s+/);
  return row(item, {
    modelName,
    storage: toStorage(size, unit),
    color,
    conditionRank: rankOf(item.rank, condition === "未使用"),
    batteryHealth: batteryOf(item),
    carrier: pixelCarrier(item.car ?? restRaw),
    shopName,
  });
}
