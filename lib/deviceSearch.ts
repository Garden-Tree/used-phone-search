import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { findSearchDevice, matchesModel } from "@/lib/modelMatch";

// 照合と種類の切り替えは lib/modelMatch.ts（ブラウザでも使う）
export { SEARCH_DEVICES, findSearchDevice, matchesModel, splitModelQuery } from "@/lib/modelMatch";

export type SearchParams = {
  /** resolveModelNames の結果。undefined ならモデルで絞り込まない */
  modelNames?: string[];
  /** 機種の種類（iphone・ipad・pixel・galaxy）。機種の指定がないときの一覧の切り替え（2026-09-30〜） */
  device?: string | null;
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
  // ?device= があればその種類だけ（ショップ指定と組み合わせられる）。
  // ショップだけ指定の一覧はトップの在庫数（全種類の合計）と揃えるため全種類を含める
  const device = findSearchDevice(p.device);
  if (p.modelNames) and.push({ modelName: { in: p.modelNames } });
  else if (device) and.push({ modelName: { startsWith: device.prefix } });
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
