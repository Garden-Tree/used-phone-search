import { cache } from "react";
import prisma from "@/lib/prisma";
import { modelWhere } from "@/lib/modelInventory";
import { findShop } from "@/lib/shops";

/**
 * 機種ページの図（店ごとの横棒・内訳の積み上げ棒・価格帯バー）用の集計。
 * Neon の転送量を使い切らないよう、在庫の行は取らず DB の groupBy / aggregate だけで集計する
 */

export type ShopBarRow = {
  /** 画面に出す店名（lib/shops.ts の label。alias は本店にまとめる） */
  label: string;
  /** 店で絞った検索に渡す shopName（本店があれば本店。本店に在庫がなく alias だけのときは alias の名前） */
  shopName: string;
  minPrice: number;
  count: number;
};

/** 店ごとの最安値と件数（安い順）。「イオシス（楽天市場店）」は「イオシス」に合算する */
export const getShopBars = cache(async (model: string): Promise<ShopBarRow[]> => {
  const where = await modelWhere(model);
  const rows = await prisma.deviceInventory.groupBy({ by: ["shopName"], where, _min: { price: true }, _count: { _all: true } });
  const map = new Map<string, ShopBarRow & { hasParent: boolean }>();
  for (const r of rows) {
    const price = r._min.price ?? 0;
    if (price <= 0) continue;
    const shop = findShop(r.shopName);
    const parent = shop?.alias ?? r.shopName;
    const label = shop?.label ?? r.shopName;
    const isParent = !shop?.alias;
    const cur = map.get(parent);
    if (!cur) {
      map.set(parent, { label, shopName: r.shopName, minPrice: price, count: r._count._all, hasParent: isParent });
    } else {
      cur.count += r._count._all;
      cur.minPrice = Math.min(cur.minPrice, price);
      if (isParent && !cur.hasParent) {
        cur.shopName = r.shopName;
        cur.hasParent = true;
      }
    }
  }
  return [...map.values()]
    .map(({ hasParent, ...row }) => { void hasParent; return row; })
    .sort((a, b) => a.minPrice - b.minPrice);
});

export type BatteryBucketKey = "b90" | "b85" | "b80" | "over80" | "low" | "unknown";
export type Breakdown = {
  /** ランクごとの件数（大文字にそろえる） */
  ranks: { key: string; count: number }[];
  /** バッテリーの区分ごとの件数 */
  battery: Record<BatteryBucketKey, number>;
  /** バッテリーの値を持つ在庫（不明を除く）の数。0 のときはバッテリーの内訳を出さない */
  batteryKnown: number;
  total: number;
};

/**
 * ランクとバッテリーの内訳。groupBy は2回（ランク、バッテリー×店）。
 * 「80%以上」としか書かない店（battery: over80）の 80 は実際の値ではないので、別の区分「80%以上（店の表記）」に入れる
 */
export const getBreakdown = cache(async (model: string): Promise<Breakdown> => {
  const where = await modelWhere(model);
  const [rankRows, batteryRows] = await Promise.all([
    prisma.deviceInventory.groupBy({ by: ["conditionRank"], where, _count: { _all: true } }),
    prisma.deviceInventory.groupBy({ by: ["batteryHealth", "shopName"], where, _count: { _all: true } }),
  ]);

  const rankMap = new Map<string, number>();
  for (const r of rankRows) {
    const k = r.conditionRank.toUpperCase();
    rankMap.set(k, (rankMap.get(k) ?? 0) + r._count._all);
  }
  const ranks = [...rankMap.entries()].map(([key, count]) => ({ key, count }));

  const battery: Record<BatteryBucketKey, number> = { b90: 0, b85: 0, b80: 0, over80: 0, low: 0, unknown: 0 };
  let batteryKnown = 0;
  let total = 0;
  for (const r of batteryRows) {
    const n = r._count._all;
    total += n;
    const h = r.batteryHealth;
    if (h === null) { battery.unknown += n; continue; }
    if (h === 80 && findShop(r.shopName)?.battery === "over80") { batteryKnown += n; battery.over80 += n; continue; }
    batteryKnown += n;
    if (h >= 90) battery.b90 += n;
    else if (h >= 85) battery.b85 += n;
    else if (h >= 80) battery.b80 += n;
    else battery.low += n;
  }
  return { ranks, battery, batteryKnown, total };
});

/** ランクSの最高値（価格帯バーの右端）。ランクSがなければ null */
export const getRankSMax = cache(async (model: string): Promise<number | null> => {
  const where = await modelWhere(model);
  const agg = await prisma.deviceInventory.aggregate({
    where: { AND: [where, { conditionRank: { in: ["S", "s"] } }] },
    _max: { price: true },
  });
  return agg._max.price;
});
