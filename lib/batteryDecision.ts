import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { APPLE_REPAIR_MODELS, appleRepair } from "@/lib/appleRepairPrices";
import { aisapoBattery } from "@/lib/aisapoPrices";
import type { MedianCell, TargetStorage } from "@/lib/batteryCalc";
import { getModelBuyback } from "@/lib/buybackPrices";
import { modelToSlug } from "@/lib/catalog";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { nextGeneration } from "@/lib/nextGeneration";

/**
 * /iphone/battery（バッテリーは交換と買い替えどっちが得？・2026-10-31〜）の数字。ビルドのたびに作り、計算はブラウザで行う。
 * - 交換: Apple 公式（lib/appleRepairPrices.ts）とアイサポ（lib/aisapoPrices.ts）の料金
 * - 買い替え: 1つ上・2つ上の世代（lib/nextGeneration.ts）の中古の相場。最大容量 80%以上・85%以上で絞った中央値も
 * - 売る: いまの iPhone の買取価格（3店のきれいな状態のいちばん高い値・lib/buybackPrices.ts）
 * 集計は DB 側（機種・容量ごとの件数と中央値の1件だけ）。在庫の行は取り出さない
 */

/** 中央値を出す最小の件数（ほかのページと同じ） */
const MIN_COUNT = 5;

export type BatteryModel = {
  model: string;
  slug: string;
  apple: number | null;
  aisapo: number | null;
  /** 容量ごとの買取価格（いちばん高い店） */
  buyback: { storage: number; price: number; shop: string }[];
  next1: string | null;
  next2: string | null;
};
export type BatteryData = { models: BatteryModel[]; targets: Record<string, TargetStorage[]> };

async function median(where: Prisma.DeviceInventoryWhereInput): Promise<MedianCell> {
  const count = await prisma.deviceInventory.count({ where });
  if (count < MIN_COUNT) return null;
  const m = await medianPrice(where, count);
  return m === null ? null : { median: m, count };
}

async function targetPrices(model: string): Promise<TargetStorage[]> {
  const where = await modelWhere(model);
  const storages = (await groupMinPrice(where, "storage")).filter((g) => g.count >= MIN_COUNT).map((g) => Number(g.key)).sort((a, b) => a - b);
  const out: TargetStorage[] = [];
  for (const storage of storages) {
    const at: Prisma.DeviceInventoryWhereInput = { AND: [where, { storage }] };
    out.push({
      storage,
      all: await median(at),
      b80: await median({ AND: [at, { batteryHealth: { gte: 80 } }] }),
      b85: await median({ AND: [at, { batteryHealth: { gte: 85 } }] }),
    });
  }
  return out;
}

export async function getBatteryData(): Promise<BatteryData> {
  const models: BatteryModel[] = [];
  for (const model of APPLE_REPAIR_MODELS) {
    const next1 = nextGeneration(model);
    const next2 = next1 ? nextGeneration(next1) : null;
    const buyback = (await getModelBuyback(model)).flatMap((r) => (r.best ? [{ storage: r.storage, price: r.best.price, shop: r.best.shop }] : []));
    models.push({ model, slug: modelToSlug(model), apple: appleRepair(model)?.battery ?? null, aisapo: aisapoBattery(model), buyback, next1, next2 });
  }
  const targets: Record<string, TargetStorage[]> = {};
  for (const t of new Set(models.flatMap((m) => [m.next1, m.next2]).filter((x): x is string => !!x))) {
    const rows = await targetPrices(t);
    if (rows.length > 0) targets[t] = rows;
  }
  return { models, targets };
}
