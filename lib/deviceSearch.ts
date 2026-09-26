import type { Prisma } from "@prisma/client";

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
  models: string[];
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

const contains = (s: string): Prisma.DeviceInventoryWhereInput => ({
  modelName: { contains: s, mode: "insensitive" },
});

/**
 * 1モデル分のDB条件。できるだけDB側で絞り込み（取得件数の無駄を減らす）、
 * 表記ゆれ由来の境界判定（"16" と "16e" など）は matchesModel で行う
 */
function modelWhere(query: string): Prisma.DeviceInventoryWhereInput {
  const { core, variants, generation } = parseModel(query);
  if (!core) return contains("iphone");

  // "iphone" を前置することで "7" が "17" に部分一致しないようにする
  const conds: Prisma.DeviceInventoryWhereInput[] = [
    { OR: [contains(`iphone ${core}`), contains(`iphone${core}`)] },
  ];
  for (const v of VARIANT_WORDS) {
    conds.push(variants.has(v) ? contains(v) : { NOT: contains(v) });
  }
  if (generation) {
    const n = generation.replace(/\D/g, "");
    conds.push({ OR: [contains(`第${n}`), contains(`第 ${n}`), contains(`se${n}`)] });
  }
  return { AND: conds };
}

/** DB側の絞り込み条件 */
export function buildWhere(p: SearchParams): Prisma.DeviceInventoryWhereInput {
  const and: Prisma.DeviceInventoryWhereInput[] = [];

  if (p.models.length > 0) and.push({ OR: p.models.map(modelWhere) });

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
    and.push({ OR: [{ batteryHealth: { gte: minBattery } }, { conditionRank: "S" }] });
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
  return [primary, { price: "asc" }];
}

export function filterByModels<T extends { modelName: string }>(devices: T[], models: string[]): T[] {
  if (models.length === 0) return devices;
  return devices.filter((d) => models.some((m) => matchesModel(m, d.modelName)));
}
