import { cache } from "react";
import prisma from "@/lib/prisma";
import { modelWhere } from "@/lib/modelInventory";
import { minBatteryWhere } from "@/lib/deviceSearch";
import { YEAR_WARRANTY_SHOPS } from "@/lib/shops";

/**
 * 充電器が付かない時計（networkStatus が "充電ケーブルなし" など。lib/watchCatalog.ts の missingCharger）は、条件つきの1台に選ばない（2026-11-13〜）。
 * 「ランクB以上」の枠は「これなら安心」という1台なので、別に買い足す物がある個体は入れない。スマホの行（〇・△・null）はどれも当たらない
 */
const HAS_CHARGER = { OR: [{ networkStatus: null }, { NOT: { networkStatus: { startsWith: "充電" } } }] };

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
    where: { AND: [where, { conditionRank: { in: ["S", "A", "B", "s", "a", "b"] } }, HAS_CHARGER] },
    _min: { price: true },
  });
  return agg._min.price;
});

/**
 * 機種ページの「安い在庫」に添える1台（2026-10-23〜）: 上の2つと同じ条件でいちばん安い在庫の行。
 * withBattery=false は MacBook・Apple Watch（ランクB以上だけ）。DB で1件だけ取り出す
 */
export const getGoodDevice = cache(async (model: string, withBattery: boolean) => {
  const where = await modelWhere(model);
  const and = [where, { conditionRank: { in: ["S", "A", "B", "s", "a", "b"] } }, HAS_CHARGER, ...(withBattery ? [minBatteryWhere(85)] : [])];
  return prisma.deviceInventory.findFirst({ where: { AND: and }, orderBy: [{ price: "asc" }, { id: "asc" }] });
});

/** 機種ページの「充電器は別に必要です」の行用: 充電器が付かない在庫の件数（Galaxy Watch・Pixel Watch の機種ページだけが呼ぶ。DB で数えるだけ） */
export const getMissingChargerCount = cache(async (model: string): Promise<number> => {
  const where = await modelWhere(model);
  return prisma.deviceInventory.count({ where: { AND: [where, { isSoldOut: false }, { networkStatus: { startsWith: "充電" } }] } });
});

/**
 * 予算別ページ用（2026-10-31〜）: getGoodDevice と同じ条件（ランクB以上・バッテリー85%以上）で、予算（max 円）以下でいちばん安い在庫の行。DB で1件だけ
 */
export const getGoodDeviceUnder = cache(async (model: string, max: number) => {
  const where = await modelWhere(model);
  return prisma.deviceInventory.findFirst({
    where: { AND: [where, { conditionRank: { in: ["S", "A", "B", "s", "a", "b"] } }, minBatteryWhere(85), { price: { lte: max } }] },
    orderBy: [{ price: "asc" }, { id: "asc" }],
  });
});

/**
 * 機種ページの「＋保証1年の店」の行（2026-11-01〜）: getGoodDevice と同じ条件で、保証が1年ある店（lib/shops.ts の yearWarranty）のうちいちばん安い在庫の行。DB で1件だけ
 */
export const getYearWarrantyDevice = cache(async (model: string, withBattery: boolean) => {
  const where = await modelWhere(model);
  const and = [where, { conditionRank: { in: ["S", "A", "B", "s", "a", "b"] } }, HAS_CHARGER, ...(withBattery ? [minBatteryWhere(85)] : []),
    { shopName: { in: YEAR_WARRANTY_SHOPS.map((s) => s.name) } }];
  return prisma.deviceInventory.findFirst({ where: { AND: and }, orderBy: [{ price: "asc" }, { id: "asc" }] });
});
