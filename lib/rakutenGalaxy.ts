import type { Prisma } from "@prisma/client";
import { batteryOf, carrierOf, networkStatusOf, rankOf, toStorage, type RakutenItem } from "@/lib/rakutenCommon";
import { canonicalGalaxyModel } from "@/lib/galaxyCatalog";

/**
 * 楽天市場店（ゲオ・じゃんぱら・ソフマップ）の Samsung Galaxy の商品1件を DeviceInventory の行にする（2026-09-30〜）。
 * 機種名は lib/galaxyCatalog.ts の表記にそろえる。カタログ外（2021年以前）・アクセサリなど読み取れないものは null
 *
 * - SIM ロック: 掲載する 2022年以降の機種は SIM ロックの原則禁止（2021年10月）より後の発売なので、キャリア版も含めて SIM フリーとして扱う
 * - キャリア: 国内の SIM フリー版（SM-xxxxQ など）は "国内版"（DeviceCard が「SIMフリー（国内版）」と表示）、キャリア版はキャリア名
 */

type Item = RakutenItem;
type Row = Prisma.DeviceInventoryCreateManyInput;

function row(item: Item, fields: Omit<Row, "manufacturer" | "price" | "url" | "isSoldOut" | "networkStatus" | "simUnlocked">): Row {
  return {
    manufacturer: "Samsung", networkStatus: networkStatusOf(item), simUnlocked: true,
    price: item.price, url: item.url, isSoldOut: false, ...fields,
  };
}

/** carrierOf の「国内版SIMフリー」は iPhone 向け（Apple版と表示される）なので、Galaxy では "国内版" にする */
function galaxyCarrier(raw: string): string | null {
  const c = carrierOf(raw);
  return c === "国内版SIMフリー" ? "国内版" : c;
}

/** 機種名の後ろに続く色（"Galaxy A55 5G オーサムライラック" → "オーサムライラック"） */
function colorAfterModel(modelPart: string): string {
  return modelPart
    .replace(/^.*?Galaxy\s?(?:S\s?\d{2}\s?(?:Ultra|FE|\+|Plus)?|Z\s?(?:Fold|Flip)\s?\d\s?(?:Ultra)?|A\s?\d{2}\s?(?:5G)?)(?![0-9A-Za-z])/i, "")
    .replace(/[[\]]/g, "")
    .trim();
}

// ゲオ: 【中古】【安心保証】 Galaxy A55 5G SCG27[128GB] au オーサムライラック
const GEO_RE = /(Galaxy[^[]*?)\s*\[(\d+)(GB|TB)\]\s*(.*)$/;

export function normalizeGeoGalaxy(shopName: string, item: Item): Row | null {
  const m = item.name.match(GEO_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, modelPart, size, unit, restRaw] = m;
  const modelName = canonicalGalaxyModel(modelPart);
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
    carrier: carrierMatch ? galaxyCarrier(carrierMatch[1]) : null,
    shopName,
  });
}

// じゃんぱら（メモリ → 容量の順に書かれる）:
//   【中古】SAMSUNG docomo 【SIMフリー】 Galaxy S24 Ultra チタニウムバイオレット 12GB 256GB SC-52E【秋葉5号】保証期間1ヶ月【ランクB】
//   【中古】SAMSUNG 国内版 【SIMフリー】 Galaxy S26 ブラック 12GB 256GB【ECセンター】保証期間1ヶ月【ランクA】
const JANPARA_RE = /^【(中古|未使用)】\s*SAMSUNG\s+(?:(\S+)\s+)?【([^】]+)】\s*(Galaxy.*?)\s+(?:\d+GB\s+)?(\d+)\s*(GB|TB)\b[^【]*【[^】]*】\s*保証期間[^【]*(?:【ランク([A-Z])】)?/;

export function normalizeJanparaGalaxy(shopName: string, item: Item): Row | null {
  const m = item.name.match(JANPARA_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, condition, carrierLabel = "", , modelPart, size, unit, rankRaw] = m;
  const modelName = canonicalGalaxyModel(modelPart);
  if (!modelName) return null;
  return row(item, {
    modelName,
    storage: toStorage(size, unit),
    color: colorAfterModel(modelPart) || "-",
    conditionRank: rankOf(rankRaw, condition === "未使用"),
    batteryHealth: batteryOf(item),
    carrier: galaxyCarrier(carrierLabel),
    shopName,
  });
}

// ソフマップ:
//   【中古】SAMSUNG(サムスン) Galaxy S24 256GB アンバーイエロー SC-51E docomo SIMフリー 【269-ud】
//   【中古】GALAXY(ギャラクシー) Galaxy S22 Ultra 256GB バーガンディ SCG14 au SIMフリー 【352-ud】
const SOFMAP_RE = /^【(中古|未使用)[^】]*】\s*(?:\S+?\([^)]*\))?\s*(Galaxy.*?)\s+(\d+)\s*(GB|TB)\s+(.*?)\s*(?:【[^】]*】)?\s*$/i;

export function normalizeSofmapGalaxy(shopName: string, item: Item): Row | null {
  const m = item.name.match(SOFMAP_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, condition, modelPart, size, unit, restRaw] = m;
  const modelName = canonicalGalaxyModel(modelPart);
  if (!modelName) return null;
  const [color = "-"] = restRaw.split(/\s+/);
  return row(item, {
    modelName,
    storage: toStorage(size, unit),
    color,
    conditionRank: rankOf(item.rank, condition === "未使用"),
    batteryHealth: batteryOf(item),
    // 型番（SM-F966QZKASJP など）の後ろに「docomo SIMフリー」のように書かれる。キャリアの記載がなければ国内版
    carrier: galaxyCarrier(item.car ?? restRaw.replace(/^\S+\s*/, "")),
    shopName,
  });
}
