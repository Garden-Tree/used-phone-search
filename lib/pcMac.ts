import prisma from "@/lib/prisma";
import { modelPagePath } from "@/lib/catalog";
import { MAC_MODELS } from "@/lib/macCatalog";
import { medianPrice } from "@/lib/modelInventory";
import type { PcCell, PcMatrix } from "@/lib/pcInventory";

/**
 * /pc に出す MacBook（2026-10-27〜。ユーザー「すでに取り込んでいる Mac を /pc にも」）。在庫は DeviceInventory（/mac と同じ）。
 * 縦 機種 × 横 メモリの表。集計は DB 側（groupBy）で、中央値はマスごとに1行だけ読む（lib/modelInventory.ts の medianPrice）。
 * maxPrice を渡すと、その予算以内の在庫だけで数える（/pc/budget）
 */
// メモリの列（Mac は 8・16・18・24・32・36・48・64・96・128GB と多いので幅でまとめる。キーは幅の下限）
const BUCKETS: { min: number; label: string }[] = [
  { min: 8, label: "8GB" },
  { min: 16, label: "16〜18GB" },
  { min: 24, label: "24GB" },
  { min: 32, label: "32〜48GB" },
  { min: 64, label: "64GB以上" },
];
const bucketOf = (mem: number) => [...BUCKETS].reverse().find((b) => mem >= b.min)?.min ?? BUCKETS[0].min;

export async function getMacMatrix(maxPrice?: number, minRowCount = 3): Promise<PcMatrix> {
  const base = { isSoldOut: false, modelName: { startsWith: "MacBook" }, memoryGB: { not: null }, ...(maxPrice ? { price: { lte: maxPrice } } : {}) };
  try {
    const groups = await prisma.deviceInventory.groupBy({
      by: ["modelName", "memoryGB"],
      where: base,
      _count: { _all: true },
      _min: { price: true },
    });
    const totals = new Map<string, number>();
    for (const g of groups) totals.set(g.modelName, (totals.get(g.modelName) ?? 0) + g._count._all);
    // 行は /mac と同じ並び（MacBook Neo → 新しいチップの順）
    const models = MAC_MODELS.filter((m) => (totals.get(m) ?? 0) >= minRowCount);
    const memories = [...new Set(groups.filter((g) => models.includes(g.modelName)).map((g) => bucketOf(g.memoryGB as number)))].sort((a, b) => a - b);
    const rows = [];
    for (const model of models) {
      const cells = new Map<number, PcCell>();
      for (const min of memories) {
        const next = BUCKETS.find((b) => b.min > min)?.min;
        const inBucket = groups.filter((x) => x.modelName === model && bucketOf(x.memoryGB as number) === min);
        const count = inBucket.reduce((n, x) => n + x._count._all, 0);
        if (count === 0) continue;
        const minPrice = Math.min(...inBucket.map((x) => x._min.price ?? Infinity));
        const memoryGB = next ? { gte: min, lt: next } : { gte: min };
        const median = count > 1 ? ((await medianPrice({ ...base, modelName: model, memoryGB }, count)) ?? minPrice) : minPrice;
        cells.set(min, { count, minPrice, medianPrice: median });
      }
      rows.push({ label: model.replace(/^MacBook /, ""), cells, count: totals.get(model) ?? 0, href: modelPagePath(model) });
    }
    return { memories, rows, memoryLabels: new Map(BUCKETS.map((b) => [b.min, b.label])) };
  } catch (e) {
    console.warn("MacBook の表を作れませんでした", e);
    return { memories: [], rows: [] };
  }
}
