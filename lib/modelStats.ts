import { cache } from "react";
import type { Device } from "@/app/components/DeviceCard";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere, primaryMedian, type PriceGroup } from "@/lib/modelInventory";
import { minBatteryWhere } from "@/lib/deviceSearch";
import { findShop } from "@/lib/shops";

export type PriceRow = PriceGroup;

export type ModelStats = {
  count: number;
  minPrice: number | null;
  maxPrice: number | null;
  /** 相場: 在庫がいちばん多い容量（medianStorage）の中央値（lib/modelInventory.ts の primaryMedian） */
  medianPrice: number | null;
  medianStorage: number | null;
  shopCount: number;
  lastUpdated: Date | null;
  byStorage: PriceRow[];
  byRank: PriceRow[];
  byShop: PriceRow[];
  cheapest: Device[];
};

const RANK_ORDER = ["S", "A", "B", "C", "D", "J", "ジャンク"];

/** 「a」と「A」のように大文字小文字だけ違うランクをまとめる */
function mergeUpper(rows: PriceRow[]): PriceRow[] {
  const map = new Map<string, PriceRow>();
  for (const r of rows) {
    const key = r.key.toUpperCase();
    const cur = map.get(key);
    if (!cur) map.set(key, { ...r, key });
    else {
      cur.count += r.count;
      cur.minPrice = Math.min(cur.minPrice, r.minPrice);
    }
  }
  return [...map.values()];
}

/**
 * モデル別ページ用の集計。売り切れを除いた在庫を対象にする（集計は DB 側。lib/modelInventory.ts の説明を参照）。
 * DBエラーは呼び出し側に投げる（ISRでは前回の正常なページが配信され続ける）
 * generateMetadata とページ本体で同じ集計を使うため cache で重複クエリを防ぐ
 */
export const getModelStats = cache(async (model: string): Promise<ModelStats> => {
  const where = await modelWhere(model);
  const [agg, byStorage, byRank, byShop, cheapest] = await Promise.all([
    prisma.deviceInventory.aggregate({
      where,
      _count: { _all: true },
      _min: { price: true },
      _max: { price: true, updatedAt: true },
    }),
    groupMinPrice(where, "storage"),
    groupMinPrice(where, "conditionRank"),
    groupMinPrice(where, "shopName"),
    prisma.deviceInventory.findMany({ where, orderBy: [{ price: "asc" }, { id: "asc" }], take: 6 }),
  ]);
  const count = agg._count._all;
  const primary = count > 0 ? await primaryMedian(where, byStorage) : null;

  return {
    count,
    minPrice: agg._min.price,
    maxPrice: agg._max.price,
    medianPrice: primary?.price ?? null,
    medianStorage: primary?.storage ?? null,
    // 「イオシス（楽天市場店）」は「イオシス」と同じ店として数える
    shopCount: new Set(byShop.map((r) => findShop(r.key)?.alias ?? r.key)).size,
    lastUpdated: agg._max.updatedAt,
    byStorage: byStorage.sort((a, b) => Number(a.key) - Number(b.key)),
    byRank: mergeUpper(byRank).sort(
      (a, b) => (RANK_ORDER.indexOf(a.key) + 99) % 99 - (RANK_ORDER.indexOf(b.key) + 99) % 99,
    ),
    byShop: byShop.sort((a, b) => a.minPrice - b.minPrice),
    cheapest,
  };
});

/**
 * 1機種・1容量の中央値と件数（iPhone の機種ページで「1つ上の世代」の相場を出す。10/27〜）。
 * 件数（count）と中央値の1行だけを取る（在庫の行は取らない）
 */
export const getMedianAt = cache(async (model: string, storage: number): Promise<{ count: number; median: number | null }> => {
  const where = { AND: [await modelWhere(model), { storage }] };
  const count = await prisma.deviceInventory.count({ where });
  return { count, median: await medianPrice(where, count) };
});

export type StorageMedianRow ={ storage: number; minPrice: number; medianPrice: number | null; count: number };

/**
 * 容量（Apple Watch はサイズ・MacBook は SSD）ごとの最安値・中央値・件数（機種ページの「容量別の相場」。10/25〜）。
 * 最安値と件数は getModelStats の byStorage をそのまま使い、中央値だけ容量ごとに1行取り出す（在庫の行は取らない。lib/modelInventory.ts の medianPrice）。
 * 相場の容量（medianStorage）の中央値は getModelStats で取ったものを使い、問い合わせを1回減らす
 */
export const getStorageMedians = cache(async (model: string): Promise<StorageMedianRow[]> => {
  const stats = await getModelStats(model);
  if (stats.byStorage.length === 0) return [];
  const where = await modelWhere(model);
  return Promise.all(
    stats.byStorage.map(async (r) => {
      const storage = Number(r.key);
      const median = storage === stats.medianStorage ? stats.medianPrice : await medianPrice({ AND: [where, { storage }] }, r.count);
      return { storage, minPrice: r.minPrice, medianPrice: median, count: r.count };
    }),
  );
});

/** 機種ページの「バッテリー別の最安値」の区切り（検索の絞り込みのボタンと同じ） */
export const BATTERY_THRESHOLDS = [80, 85, 90, 95];

/**
 * バッテリー最大容量が 80/85/90/95% 以上の在庫の最安値と件数（key は "90" など）。在庫のない区切りは除く。
 * 機種ページだけで使うので getModelStats（比較・目的別ページ・OG 画像でも使う）とは分けている
 */
export const getBatteryRows = cache(async (model: string): Promise<PriceRow[]> => {
  const where = await modelWhere(model);
  const rows = await Promise.all(
    BATTERY_THRESHOLDS.map(async (min) => {
      const agg = await prisma.deviceInventory.aggregate({
        where: { AND: [where, minBatteryWhere(min)] },
        _min: { price: true },
        _count: { _all: true },
      });
      return { key: String(min), minPrice: agg._min.price ?? 0, count: agg._count._all };
    }),
  );
  return rows.filter((r) => r.count > 0);
});

export type StorageRankMatrix = {
  /** 容量(GB)の昇順 */
  storages: number[];
  /** RANK_ORDER の順（在庫のあるランクだけ） */
  ranks: string[];
  /** `${storage}:${rank}` → 最安値と件数 */
  cells: Map<string, PriceRow>;
};

/**
 * 容量 × 状態ランクの最安値（機種ページの表）。DB で (容量, ランク) ごとに集計するので、返る行は組み合わせの数だけ
 */
export const getStorageRankMatrix = cache(async (model: string): Promise<StorageRankMatrix> => {
  const where = await modelWhere(model);
  const rows = await prisma.deviceInventory.groupBy({
    by: ["storage", "conditionRank"],
    where,
    _min: { price: true },
    _count: { _all: true },
  });
  const cells = new Map<string, PriceRow>();
  for (const r of rows) {
    const rank = r.conditionRank.toUpperCase();
    const key = `${r.storage}:${rank}`;
    const cur = cells.get(key);
    const price = r._min.price ?? 0;
    if (!cur) cells.set(key, { key: rank, minPrice: price, count: r._count._all });
    else {
      cur.count += r._count._all;
      cur.minPrice = Math.min(cur.minPrice, price);
    }
  }
  const storages = [...new Set(rows.map((r) => r.storage))].sort((a, b) => a - b);
  const ranks = [...new Set(rows.map((r) => r.conditionRank.toUpperCase()))].sort(
    (a, b) => (RANK_ORDER.indexOf(a) + 99) % 99 - (RANK_ORDER.indexOf(b) + 99) % 99,
  );
  return { storages, ranks, cells };
});

export type MemorySsdRankMatrix = {
  /** メモリ(GB)・SSD(GB) の組。メモリの昇順、同じメモリは SSD の昇順。メモリが読めない行（null）は 0 として末尾側に寄せず先頭に置く */
  combos: { memoryGB: number | null; storage: number }[];
  /** RANK_ORDER の順（在庫のあるランクだけ） */
  ranks: string[];
  /** `${memoryGB ?? ""}:${storage}:${rank}` → 最安値と件数 */
  cells: Map<string, PriceRow>;
};

export const macCellKey = (memoryGB: number | null, storage: number, rank: string) => `${memoryGB ?? ""}:${storage}:${rank}`;

/**
 * MacBook の機種ページの表（メモリ × SSD × 状態ランクの最安値。2026-10-15〜）。storage は SSD の容量。
 * DB で (メモリ, SSD, ランク) ごとに集計するので、返る行は組み合わせの数だけ
 */
export const getMemorySsdRankMatrix = cache(async (model: string): Promise<MemorySsdRankMatrix> => {
  const where = await modelWhere(model);
  const rows = await prisma.deviceInventory.groupBy({
    by: ["memoryGB", "storage", "conditionRank"],
    where,
    _min: { price: true },
    _count: { _all: true },
  });
  const cells = new Map<string, PriceRow>();
  for (const r of rows) {
    const rank = r.conditionRank.toUpperCase();
    const key = macCellKey(r.memoryGB, r.storage, rank);
    const cur = cells.get(key);
    const price = r._min.price ?? 0;
    if (!cur) cells.set(key, { key: rank, minPrice: price, count: r._count._all });
    else {
      cur.count += r._count._all;
      cur.minPrice = Math.min(cur.minPrice, price);
    }
  }
  const seen = new Set<string>();
  const combos: MemorySsdRankMatrix["combos"] = [];
  for (const r of rows) {
    const k = `${r.memoryGB ?? ""}:${r.storage}`;
    if (seen.has(k)) continue;
    seen.add(k);
    combos.push({ memoryGB: r.memoryGB, storage: r.storage });
  }
  combos.sort((a, b) => (a.memoryGB ?? 0) - (b.memoryGB ?? 0) || a.storage - b.storage);
  const ranks = [...new Set(rows.map((r) => r.conditionRank.toUpperCase()))].sort(
    (a, b) => (RANK_ORDER.indexOf(a) + 99) % 99 - (RANK_ORDER.indexOf(b) + 99) % 99,
  );
  return { combos, ranks, cells };
});
