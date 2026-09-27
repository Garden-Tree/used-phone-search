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
const NOT_JUNK = { conditionRank: { notIn: ["J", "ジャンク"] } };

/** 予算内の在庫を機種ごとに集計する（機種は新しい順） */
export async function getBudgetModels(max: number): Promise<BudgetModelRow[]> {
  const groups = await prisma.deviceInventory.groupBy({
    by: ["modelName"],
    where: { isSoldOut: false, price: { lte: max }, ...NOT_JUNK },
    _min: { price: true },
    _count: { _all: true },
  });
  const byName = new Map(groups.map((g) => [g.modelName, g]));

  const rows: BudgetModelRow[] = [];
  for (const model of ALL_PAGE_MODELS) {
    const names = (await resolveModelNames([model])) ?? [];
    let minPrice = Infinity;
    let count = 0;
    for (const name of names) {
      const g = byName.get(name);
      if (!g) continue;
      count += g._count._all;
      minPrice = Math.min(minPrice, g._min.price ?? Infinity);
    }
    if (count > 0) rows.push({ model, minPrice, count, supported: ALL_CATALOG_MODELS.includes(model) });
  }
  return rows;
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
