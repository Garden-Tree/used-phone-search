import prisma from "@/lib/prisma";
import { buildWhere, filterByModels } from "@/lib/deviceSearch";

/**
 * 1モデル分の販売中在庫（価格昇順）。モデル別ページと価格推移の記録で共有する。
 * React に依存させないこと（GitHub Actions 上のスクリプトからも使う）
 */
export async function fetchModelInventory(model: string) {
  const rows = await prisma.deviceInventory.findMany({
    where: { AND: [buildWhere({ models: [model] }), { isSoldOut: false }] },
    orderBy: { price: "asc" },
  });
  return filterByModels(rows, [model]);
}

/** 昇順ソート済みの価格から最安値・中央値・件数を求める */
export function summarizePrices(sortedPrices: number[]) {
  if (sortedPrices.length === 0) return null;
  return {
    minPrice: sortedPrices[0],
    medianPrice: sortedPrices[Math.floor(sortedPrices.length / 2)],
    count: sortedPrices.length,
  };
}
