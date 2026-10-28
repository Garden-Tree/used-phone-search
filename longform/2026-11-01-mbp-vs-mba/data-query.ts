/**
 * 横動画「MacBook Pro と MacBook Air、何が違って、いくら違って、誰はどっち？」の数字（読むだけ。DB は groupBy・count と、中央値の1行だけ。findMany で在庫の行は取らない）
 *
 * - 機種: MacBook Air（13・15インチ・M1〜M5）と MacBook Pro（13インチ M1・M2／14・16インチ M1 Pro〜M5 Pro／14インチ M3〜M5 無印）。lib/macCatalog.ts の名前。ジャンクを除く
 *   14インチ M6 はまだ catalog にない（中古の在庫なし）。新品の値は lib/macbookProM6.ts
 * - 機種ごとに 件数・店・容量（SSD）× メモリごと（在庫5件以上で中央値）に 件数・中央値・最安
 * - 新品の値は script.md の冒頭に出典つきで書く（Apple 公式で確かめた値だけ）
 *
 *   npx tsx longform/2026-11-01-mbp-vs-mba/data-query.ts > longform/2026-11-01-mbp-vs-mba/data-query.log 2>&1
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { activeMacShops } from "@/lib/activeShops";
import { MAC_INFO } from "@/lib/macCatalog";
import { MBP_M6_CHECKED, MBP_M6_PRICE } from "@/lib/macbookProM6";

type Where = Prisma.DeviceInventoryWhereInput;

const AIR = [
  "MacBook Air M1",
  "MacBook Air 13インチ M2",
  "MacBook Air 13インチ M3",
  "MacBook Air 13インチ M4",
  "MacBook Air 13インチ M5",
  "MacBook Air 15インチ M2",
  "MacBook Air 15インチ M3",
  "MacBook Air 15インチ M4",
  "MacBook Air 15インチ M5",
];
const PRO = [
  "MacBook Pro 13インチ M1",
  "MacBook Pro 13インチ M2",
  "MacBook Pro 14インチ M1 Pro",
  "MacBook Pro 14インチ M2 Pro",
  "MacBook Pro 14インチ M3",
  "MacBook Pro 14インチ M3 Pro",
  "MacBook Pro 14インチ M4",
  "MacBook Pro 14インチ M4 Pro",
  "MacBook Pro 14インチ M5",
  "MacBook Pro 14インチ M5 Pro",
  "MacBook Pro 16インチ M1 Pro",
  "MacBook Pro 16インチ M2 Pro",
  "MacBook Pro 16インチ M3 Pro",
  "MacBook Pro 16インチ M4 Pro",
  "MacBook Pro 16インチ M5 Pro",
];
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
const MIN_ROW = 5;

async function show(m: string) {
  const where: Where = { AND: [await modelWhere(m), { isSoldOut: false }, NOT_JUNK] };
  const total = await prisma.deviceInventory.count({ where });
  if (total === 0) {
    console.log(`\n== ${m} 0件`);
    return;
  }
  const shopsOf = await prisma.deviceInventory.groupBy({ by: ["shopName"], where, _count: { _all: true } });
  console.log(`\n== ${m}（${MAC_INFO[m]?.year ?? "-"}年・${MAC_INFO[m]?.chip ?? "-"}） ${total}件  店: ${shopsOf.map((s) => `${s.shopName} ${s._count._all}`).join("・")}`);
  const g = await prisma.deviceInventory.groupBy({ by: ["storage", "memoryGB"], where, _count: { _all: true }, _min: { price: true } });
  for (const r of g.sort((a, b) => a.storage - b.storage || (a.memoryGB ?? 0) - (b.memoryGB ?? 0))) {
    const n = r._count._all;
    const at: Where = { AND: [where, { storage: r.storage, memoryGB: r.memoryGB }] };
    const med = n >= MIN_ROW ? await medianPrice(at, n) : null;
    console.log(`  ${r.storage}GB・メモリ${r.memoryGB ?? "不明"}${r.memoryGB ? "GB" : ""} ${n}件 中${med?.toLocaleString() ?? "-"} 安${r._min.price?.toLocaleString()}`);
  }
  const ranks = await prisma.deviceInventory.groupBy({ by: ["conditionRank"], where, _count: { _all: true } });
  console.log(`  ランク: ${ranks.map((r) => `${r.conditionRank ?? "不明"} ${r._count._all}`).join("・")}`);
}

async function main() {
  const shops = await activeMacShops();
  console.log(`Mac の店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  const base: Where = { isSoldOut: false, ...NOT_JUNK };
  const macTotal = await prisma.deviceInventory.count({ where: { ...base, modelName: { contains: "MacBook" } } });
  const airTotal = await prisma.deviceInventory.count({ where: { ...base, modelName: { contains: "MacBook Air" } } });
  const proTotal = await prisma.deviceInventory.count({ where: { ...base, modelName: { contains: "MacBook Pro" } } });
  console.log(`MacBook 在庫（ジャンク以外） ${macTotal}（modelName に Air ${airTotal}・Pro ${proTotal}）`);
  console.log(`新型 14インチ M6（Apple 公式・${MBP_M6_CHECKED}）16GB／1TB ${MBP_M6_PRICE.toLocaleString()}円`);

  console.log("\n######## MacBook Air");
  for (const m of AIR) await show(m);
  console.log("\n######## MacBook Pro");
  for (const m of PRO) await show(m);
  await prisma.$disconnect();
}

main();
