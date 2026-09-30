import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { Device } from "@/app/components/DeviceCard";
import { ALL_CATALOG_MODELS, ALL_PAGE_MODELS } from "@/lib/catalog";
import { resolveModelNames } from "@/lib/deviceSearch";
import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { IPADOS27_MODELS, IPAD_SPECS } from "@/lib/ipadSpecs";
import type { BudgetDevice } from "@/lib/budgets";
import { PIXEL_INFO, PIXEL_MODELS, updateYearsLeft } from "@/lib/pixelCatalog";

/** 予算別ページ（lib/budgets.ts）の集計 */

export type BudgetModelRow = {
  model: string;
  minPrice: number;
  count: number;
  /** iOS 27（iPad は iPadOS 27）に対応しているか。Pixel は Google のアップデート保証が残っているか */
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

// iPad は発売年の新しい順（同じ年はカタログの順＝Pro・Air・mini・無印）。発売年は Apple 公式で確かめた値（lib/ipadSpecs.ts）
const releasedYear = (model: string) => Number(IPAD_SPECS[model]?.released.replace("年", "") ?? 0);
const IPAD_BY_RELEASE = [...IPAD_MODELS].sort((a, b) => releasedYear(b) - releasedYear(a));
// Pixel は販売開始の年月の新しい順（lib/pixelCatalog.ts。Google 公式）
const PIXEL_BY_RELEASE = [...PIXEL_MODELS].sort((a, b) => PIXEL_INFO[b].available.localeCompare(PIXEL_INFO[a].available));

/** 予算内の在庫を機種ごとに集計する（機種は新しい順） */
export async function getBudgetModels(max: number, device: BudgetDevice = "iphone"): Promise<BudgetModelRow[]> {
  const models = device === "ipad" ? IPAD_BY_RELEASE : device === "pixel" ? PIXEL_BY_RELEASE : ALL_PAGE_MODELS;
  const now = new Date().toISOString().slice(0, 7);
  const isSupported = (m: string) =>
    device === "ipad" ? IPADOS27_MODELS.has(m)
    : device === "pixel" ? (updateYearsLeft(m, now) ?? 0) > 0
    : ALL_CATALOG_MODELS.includes(m);
  const byModel = await minPriceByModel({ isSoldOut: false, price: { lte: max }, ...NOT_JUNK }, models);
  return [...byModel].map(([model, r]) => ({ model, ...r, supported: isSupported(model) }));
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
