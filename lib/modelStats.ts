import { cache } from "react";
import type { Device } from "@/app/components/DeviceCard";
import { fetchModelInventory, summarizePrices } from "@/lib/modelInventory";

export type PriceRow = { key: string; minPrice: number; count: number };

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

function groupMin(devices: Device[], keyOf: (d: Device) => string): PriceRow[] {
  const map = new Map<string, PriceRow>();
  for (const d of devices) {
    const key = keyOf(d);
    const row = map.get(key);
    if (!row) map.set(key, { key, minPrice: d.price, count: 1 });
    else {
      row.count++;
      if (d.price < row.minPrice) row.minPrice = d.price;
    }
  }
  return [...map.values()];
}

/**
 * モデル別ページ用の集計。売り切れを除いた在庫を対象にする。
 * DBエラーは呼び出し側に投げる（ISRでは前回の正常なページが配信され続ける）
 * generateMetadata とページ本体で同じ集計を使うため cache で重複クエリを防ぐ
 */
export const getModelStats = cache(async (model: string): Promise<ModelStats> => {
  const devices = await fetchModelInventory(model);
  const summary = summarizePrices(devices.map((d) => d.price));
  const lastUpdated = devices.reduce<Date | null>(
    (max, d) => (!max || d.updatedAt > max ? d.updatedAt : max),
    null,
  );

  return {
    count: devices.length,
    minPrice: summary?.minPrice ?? null,
    maxPrice: devices.at(-1)?.price ?? null,
    medianPrice: summary?.medianPrice ?? null,
    shopCount: new Set(devices.map((d) => d.shopName)).size,
    lastUpdated,
    byStorage: groupMin(devices, (d) => String(d.storage)).sort((a, b) => Number(a.key) - Number(b.key)),
    byRank: groupMin(devices, (d) => d.conditionRank.toUpperCase()).sort(
      (a, b) => (RANK_ORDER.indexOf(a.key) + 99) % 99 - (RANK_ORDER.indexOf(b.key) + 99) % 99,
    ),
    byShop: groupMin(devices, (d) => d.shopName).sort((a, b) => a.minPrice - b.minPrice),
    cheapest: devices.slice(0, 6),
  };
});
