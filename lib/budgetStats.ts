import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { Device } from "@/app/components/DeviceCard";
import { ALL_CATALOG_MODELS, ALL_PAGE_MODELS } from "@/lib/catalog";
import { resolveModelNames } from "@/lib/deviceSearch";

/** 予算別ページ（lib/budgets.ts）の集計 */

export type BudgetModelRow = {
  model: string;
  minPrice: number;
  count: number;
  /** iOS 27 に対応しているか（旧機種は false） */
  supported: boolean;
};

// 「予算で探す」人向けなので、動作保証のないジャンク品は除く
export const NOT_JUNK = { conditionRank: { notIn: ["J", "ジャンク"] } };

/**
 * 条件に合う在庫を、指定した機種ごとに「最安値・件数」へまとめる（在庫のない機種は除く・順序は models のまま）。
 * DB では modelName ごとに集計し、表記ゆれ（resolveModelNames）を機種へまとめるのは JS 側
 */
export async function minPriceByModel(where: Prisma.DeviceInventoryWhereInput, models: string[]): Promise<Map<string, { minPrice: number; count: number }>> {
  const groups = await prisma.deviceInventory.groupBy({
    by: ["modelName"],
    where,
    _min: { price: true },
    _count: { _all: true },
  });
  const byName = new Map(groups.map((g) => [g.modelName, g]));

  const result = new Map<string, { minPrice: number; count: number }>();
  for (const model of models) {
    const names = (await resolveModelNames([model])) ?? [];
    let minPrice = Infinity;
    let count = 0;
    for (const name of names) {
      const g = byName.get(name);
      if (!g) continue;
      count += g._count._all;
      minPrice = Math.min(minPrice, g._min.price ?? Infinity);
    }
    if (count > 0) result.set(model, { minPrice, count });
  }
  return result;
}

/** 予算内の在庫を機種ごとに集計する（機種は新しい順） */
export async function getBudgetModels(max: number): Promise<BudgetModelRow[]> {
  const byModel = await minPriceByModel({ isSoldOut: false, price: { lte: max }, ...NOT_JUNK }, ALL_PAGE_MODELS);
  return [...byModel].map(([model, r]) => ({ model, ...r, supported: ALL_CATALOG_MODELS.includes(model) }));
}

/** 指定した機種の、予算内でいちばん安い在庫 */
export async function cheapestUnder(model: string, max: number): Promise<Device | null> {
  const names = await resolveModelNames([model]);
  if (!names?.length) return null;
  return prisma.deviceInventory.findFirst({
    where: { modelName: { in: names }, isSoldOut: false, price: { lte: max }, ...NOT_JUNK },
    orderBy: [{ price: "asc" }, { id: "asc" }],
  });
}
