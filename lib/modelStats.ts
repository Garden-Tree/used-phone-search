import { cache } from "react";
import type { Device } from "@/app/components/DeviceCard";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere, type PriceGroup } from "@/lib/modelInventory";
import { minBatteryWhere } from "@/lib/deviceSearch";

export type PriceRow = PriceGroup;

export type ModelStats = {
  count: number;
  minPrice: number | null;
  maxPrice: number | null;
  medianPrice: number | null;
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

  return {
    count,
    minPrice: agg._min.price,
    maxPrice: agg._max.price,
    medianPrice: await medianPrice(where, count),
    shopCount: byShop.length,
    lastUpdated: agg._max.updatedAt,
    byStorage: byStorage.sort((a, b) => Number(a.key) - Number(b.key)),
    byRank: mergeUpper(byRank).sort(
      (a, b) => (RANK_ORDER.indexOf(a.key) + 99) % 99 - (RANK_ORDER.indexOf(b.key) + 99) % 99,
    ),
    byShop: byShop.sort((a, b) => a.minPrice - b.minPrice),
    cheapest,
  };
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
