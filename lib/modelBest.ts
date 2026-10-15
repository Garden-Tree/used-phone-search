import { cache } from "react";
import prisma from "@/lib/prisma";
import { modelWhere } from "@/lib/modelInventory";
import { minBatteryWhere } from "@/lib/deviceSearch";

/**
 * 機種ページの結論用: ランクB以上（S・A・B）でバッテリー85%以上（ランクSは表記がなくても含める。検索の絞り込みと同じ）の最安値。
 * DB で最安値の1件だけ取り出す（在庫の行を丸ごと取らない）
 */
export const getGoodConditionMin = cache(async (model: string): Promise<number | null> => {
  const where = await modelWhere(model);
  const agg = await prisma.deviceInventory.aggregate({
    where: { AND: [where, { conditionRank: { in: ["S", "A", "B", "s", "a", "b"] } }, minBatteryWhere(85)] },
    _min: { price: true },
  });
  return agg._min.price;
});

/**
 * MacBook の結論用（2026-10-15〜）: ランクB以上（S・A・B）の最安値。MacBook はバッテリーの表記がない店が多いので、バッテリーの条件は付けない。
 * DB で最安値の1件だけ取り出す
 */
export const getGoodRankMin = cache(async (model: string): Promise<number | null> => {
  const where = await modelWhere(model);
  const agg = await prisma.deviceInventory.aggregate({
    where: { AND: [where, { conditionRank: { in: ["S", "A", "B", "s", "a", "b"] } }] },
    _min: { price: true },
  });
  return agg._min.price;
});
