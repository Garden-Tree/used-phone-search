import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { APPLE_REPAIR_MODELS, appleRepair } from "@/lib/appleRepairPrices";
import { aisapoBattery } from "@/lib/aisapoPrices";
import type { MedianCell, TargetStorage } from "@/lib/batteryCalc";
import { getModelBuyback } from "@/lib/buybackPrices";
import { modelToSlug } from "@/lib/catalog";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
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

/** 帯ごとの件数から中央値のセル（件数が足りなければ null）。中央値は行を1件だけ取り出す */
async function cell(where: Prisma.DeviceInventoryWhereInput, count: number): Promise<MedianCell> {
  if (count < MIN_COUNT) return null;
  const m = await medianPrice(where, count);
  return m === null ? null : { median: m, count };
}

/**
 * 1機種の容量ごとの相場（全体・電池80%以上・85%以上）。
 * 件数は容量×最大容量の groupBy 1回で数え、中央値の1件取りは並列に投げる（10/31: 1件ずつ順番に投げて書き出しが60秒を超えた）
 */
async function targetPrices(model: string): Promise<TargetStorage[]> {
  const where = await modelWhere(model);
  const groups = await prisma.deviceInventory.groupBy({ by: ["storage", "batteryHealth"], where, _count: { _all: true } });
  const counts = new Map<number, { all: number; b80: number; b85: number }>();
  for (const g of groups) {
    const c = counts.get(g.storage) ?? { all: 0, b80: 0, b85: 0 };
    const n = g._count._all;
    c.all += n;
    if (g.batteryHealth !== null && g.batteryHealth >= 80) c.b80 += n;
    if (g.batteryHealth !== null && g.batteryHealth >= 85) c.b85 += n;
    counts.set(g.storage, c);
  }
  const storages = [...counts].filter(([, c]) => c.all >= MIN_COUNT).sort((a, b) => a[0] - b[0]);
  return Promise.all(
    storages.map(async ([storage, c]) => {
      const at: Prisma.DeviceInventoryWhereInput = { AND: [where, { storage }] };
      const [all, b80, b85] = await Promise.all([
        cell(at, c.all),
        cell({ AND: [at, { batteryHealth: { gte: 80 } }] }, c.b80),
        cell({ AND: [at, { batteryHealth: { gte: 85 } }] }, c.b85),
      ]);
      return { storage, all, b80, b85 };
    }),
  );
}

export async function getBatteryData(): Promise<BatteryData> {
  const models: BatteryModel[] = await Promise.all(
    APPLE_REPAIR_MODELS.map(async (model) => {
      const next1 = nextGeneration(model);
      const next2 = next1 ? nextGeneration(next1) : null;
      const buyback = (await getModelBuyback(model)).flatMap((r) => (r.best ? [{ storage: r.storage, price: r.best.price, shop: r.best.shop }] : []));
      return { model, slug: modelToSlug(model), apple: appleRepair(model)?.battery ?? null, aisapo: aisapoBattery(model), buyback, next1, next2 };
    }),
  );
  const names = [...new Set(models.flatMap((m) => [m.next1, m.next2]).filter((x): x is string => !!x))];
  const rows = await Promise.all(names.map((t) => targetPrices(t)));
  const targets: Record<string, TargetStorage[]> = {};
  names.forEach((t, i) => {
    if (rows[i].length > 0) targets[t] = rows[i];
  });
  return { models, targets };
}
