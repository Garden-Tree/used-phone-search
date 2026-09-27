import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { IPAD_MODELS } from "@/lib/ipadCatalog";

// モデル名の「バリエーション」を表す語（この集合が一致するものだけをヒットさせる）
const VARIANT_WORDS = ["pro", "max", "plus", "mini"] as const;

type ParsedModel = {
  core: string; // 例: "7", "13", "16e", "x", "se", "air"
  variants: Set<string>; // 例: {"pro","max"}
  generation: string | null; // 例: "第3世代"（SE用）
};

/**
 * モデル名をトークンに分解する。
 * ショップごとの表記ゆれ（"iphone13" / "iPhoneSE 第2世代" / "iPhone SE (第3世代)" / "SE3"）を吸収する。
 */
function tokenize(name: string): string[] {
  let s = name.toLowerCase();
  const idx = s.indexOf("iphone");
  if (idx >= 0) s = s.slice(idx + "iphone".length);
  s = s
    .replace(/[()（）\[\]【】]/g, " ")
    .replace(/第\s*(\d)\s*世代/g, "第$1世代") // "第 3 世代" → "第3世代"
    .trim()
    .replace(/\bse\s?([23])(?![0-9])/g, "se 第$1世代")
    .replace(/^(\d+e?|se|air|x[sr]?)/, "$1 ") // "13pro" → "13 pro"
    .replace(/(第\d世代)/g, " $1 ");
  return s.split(/\s+/).filter(Boolean);
}

function parseModel(name: string): ParsedModel {
  const tokens = tokenize(name);
  return {
    core: tokens[0] ?? "",
    variants: new Set(tokens.filter((t) => (VARIANT_WORDS as readonly string[]).includes(t))),
    generation: tokens.find((t) => /^第\d世代$/.test(t)) ?? null,
  };
}

/** 検索クエリ（1モデル）と在庫のモデル名が同一モデルかを厳密に判定する */
export function matchesModel(query: string, modelName: string): boolean {
  // iPad は取り込み時に lib/ipadCatalog.ts の正式名にそろえている。
  // 正式名そのもので検索されたら完全一致（トークン判定だと「iPad (第6世代)」が「iPad mini (第6世代)」にも当たる）、
  // 「iPad Air」のような大まかな検索なら、語がすべて含まれる機種に当てる
  const ipadQuery = /^\s*ipad/i.test(query);
  if (ipadQuery || /^ipad/i.test(modelName)) {
    if (!ipadQuery) return false;
    const q = query.trim().toLowerCase();
    const name = modelName.trim().toLowerCase();
    if (IPAD_MODELS.some((m) => m.toLowerCase() === q)) return q === name;
    return /^ipad/.test(name) && q.split(/\s+/).every((word) => name.includes(word));
  }
  const q = parseModel(query);
  if (!q.core) return true;

  const d = parseModel(modelName);
  // 先頭トークンの完全一致で判定するため "7" が "17" に、"16" が "16e" にヒットしない
  if (d.core !== q.core) return false;
  if (q.generation && d.generation !== q.generation) return false;
  if (q.variants.size !== d.variants.size) return false;
  for (const v of q.variants) if (!d.variants.has(v)) return false;
  return true;
}

/** "iPhone 13,iPhone 14" のようなカンマ区切りクエリを配列に分解する */
export function splitModelQuery(modelQuery: string | null | undefined): string[] {
  if (!modelQuery) return [];
  return modelQuery.split(",").map((m) => m.trim()).filter(Boolean);
}

export type SearchParams = {
  /** resolveModelNames の結果。undefined ならモデルで絞り込まない */
  modelNames?: string[];
  shop?: string | null;
  sort?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  storage?: string | null;
  rank?: string | null;
  minBattery?: string | null;
};

function toInt(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 検索クエリに該当する、DB 上の実際のモデル名の一覧を返す。
 * DB のモデル名は表記ゆれ込みでも100種類程度なので、全種類を取得して matchesModel で厳密に照合し、
 * 結果を modelName IN (...) として DB に渡す。こうすると絞り込みが DB だけで完結し、
 * ページ送り（skip/take）が正確になる（"iPhone 17" の検索で安い 17e が上位を埋めて0件になる問題の対策）
 */
export async function resolveModelNames(models: string[]): Promise<string[] | undefined> {
  if (models.length === 0) return undefined;
  const names = await allModelNames();
  return names.filter((name) => models.some((m) => matchesModel(m, name)));
}

// モデル名の一覧はスクレイピング時（6時間ごと）にしか増減しないので、数分間メモリに保持する
const MODEL_NAMES_TTL_MS = 5 * 60 * 1000;
let modelNamesCache: { names: string[]; expiresAt: number } | null = null;

async function allModelNames(): Promise<string[]> {
  if (modelNamesCache && modelNamesCache.expiresAt > Date.now()) return modelNamesCache.names;
  // findMany の distinct は全行を取得してから JS 側で重複を除くため遅い（約1.8万行で数秒）。
  // groupBy は SQL の GROUP BY になり、DB 側で集約される
  const rows = await prisma.deviceInventory.groupBy({ by: ["modelName"] });
  const names = rows.map((r) => r.modelName);
  modelNamesCache = { names, expiresAt: Date.now() + MODEL_NAMES_TTL_MS };
  return names;
}

/**
 * バッテリー最大容量が min% 以上。ランクS（未使用品）はバッテリーの表記がなくても含める。
 * 検索の絞り込み（minBattery）と機種ページの「バッテリー別の最安値」で同じ条件を使う（件数がそろうように）
 */
export function minBatteryWhere(min: number): Prisma.DeviceInventoryWhereInput {
  return { OR: [{ batteryHealth: { gte: min } }, { conditionRank: "S" }] };
}

/** DB側の絞り込み条件 */
export function buildWhere(p: SearchParams): Prisma.DeviceInventoryWhereInput {
  const and: Prisma.DeviceInventoryWhereInput[] = [];

  // 機種もショップも指定がない一覧（/search・予算別ページからのリンク）は iPhone だけにする。
  // ショップ指定の一覧はトップの在庫数（iPhone・iPad の合計）と揃えるため iPad も含める
  if (p.modelNames) and.push({ modelName: { in: p.modelNames } });
  else if (!p.shop || p.shop === "all") and.push({ modelName: { startsWith: "iPhone" } });

  if (p.shop && p.shop !== "all") and.push({ shopName: p.shop });

  const minPrice = toInt(p.minPrice);
  const maxPrice = toInt(p.maxPrice);
  if (minPrice !== undefined || maxPrice !== undefined) {
    and.push({ price: { gte: minPrice, lte: maxPrice } });
  }

  const storage = toInt(p.storage);
  if (storage !== undefined) and.push({ storage });

  if (p.rank) and.push({ conditionRank: p.rank });

  if (p.sort === "battery_desc" || p.sort === "battery_asc") {
    and.push({ batteryHealth: { not: null } });
  }

  const minBattery = toInt(p.minBattery);
  if (minBattery !== undefined) {
    and.push(minBatteryWhere(minBattery));
  }

  return { AND: and };
}

export function buildOrderBy(sort: string | null | undefined): Prisma.DeviceInventoryOrderByWithRelationInput[] {
  const primary: Prisma.DeviceInventoryOrderByWithRelationInput = (() => {
    switch (sort) {
      case "price_desc": return { price: "desc" };
      case "battery_desc": return { batteryHealth: "desc" };
      case "battery_asc": return { batteryHealth: "asc" };
      default: return { price: "asc" };
    }
  })();
  // 同じ価格の商品が多いので、最後に id で順序を確定させてページ送りを安定させる
  return [primary, { price: "asc" }, { id: "asc" }];
}
