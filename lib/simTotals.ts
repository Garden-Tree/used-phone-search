import { cache } from "react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";

/**
 * /sim「中古スマホ＋格安SIM、2年でいくら？」（10/27〜）の端末側の数字。
 * 横動画11本目（longform/2026-10-31-rakuten-mobile/data-query.ts）と同じ決め方: 128GB・ジャンクを除いた販売中在庫の中央値。
 * DB は count と中央値の1行だけ（在庫の行は取らない）。2年の総額＝この中央値＋代表の段（lib/simPlans.ts の repTier）の月額×24
 */
export const SIM_TOTAL_MODELS = ["iPhone SE (第3世代)", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16", "Pixel 8a", "Pixel 9a"];
export const SIM_TOTAL_STORAGE = 128;
export const SIM_TOTAL_MONTHS = 24;
/** 冒頭の1行に使う機種（動画と同じ） */
export const SIM_HEADLINE_MODEL = "iPhone 14";
/** これより在庫が少ない機種は表に出さない（中央値がぶれる） */
const MIN_COUNT = 5;

const NOT_JUNK: Prisma.DeviceInventoryWhereInput = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };

export type SimTotalRow = { model: string; count: number; median: number };

export const getSimTotalRows = cache(async (): Promise<SimTotalRow[]> => {
  const rows = await Promise.all(
    SIM_TOTAL_MODELS.map(async (model) => {
      const where: Prisma.DeviceInventoryWhereInput = { AND: [await modelWhere(model), NOT_JUNK, { storage: SIM_TOTAL_STORAGE }] };
      const count = await prisma.deviceInventory.count({ where });
      const median = count >= MIN_COUNT ? await medianPrice(where, count) : null;
      return median === null ? null : { model, count, median };
    }),
  );
  return rows.filter((r): r is SimTotalRow => r !== null);
});

/** 「約11.8万円」（1,000円の位を四捨五入） */
export const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万円`;
