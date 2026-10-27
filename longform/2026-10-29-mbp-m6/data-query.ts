/**
 * 横動画「新型MacBook Pro M6、買う？中古のM5・M4にする？」の数字（読むだけ。DB は groupBy・count と、中央値の1行だけ。findMany で在庫の行は取らない）
 *
 * - 機種: MacBook Pro 14インチ M5・M4・M3・M5 Pro と、安い Pro の M1 Pro（14インチ）・13インチ M1（lib/macCatalog.ts の名前）。ジャンクを除く
 * - 容量（SSD）× メモリごと（在庫5件以上）に 件数・中央値・最安
 * - 新型 M6 の値段・仕様は lib/macbookProM6.ts（Apple 公式・10/28 確認）だけ。差額は「新型 16GB／1TB − 中古の同じ構成の中央値」
 *
 *   npx tsx longform/2026-10-29-mbp-m6/data-query.ts > longform/2026-10-29-mbp-m6/data-query.log
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { activeMacShops } from "@/lib/activeShops";
import { MAC_INFO } from "@/lib/macCatalog";
import { MBP_M6_CHECKED, MBP_M6_PRICE } from "@/lib/macbookProM6";

type Where = Prisma.DeviceInventoryWhereInput;

const MODELS = [
  "MacBook Pro 14インチ M5 Pro",
  "MacBook Pro 14インチ M5",
  "MacBook Pro 14インチ M4",
  "MacBook Pro 14インチ M3",
  "MacBook Pro 14インチ M1 Pro",
  "MacBook Pro 13インチ M1",
];
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
const MIN_ROW = 5;

async function main() {
  const shops = await activeMacShops();
  console.log(`Mac の店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  const macTotal = await prisma.deviceInventory.count({ where: { isSoldOut: false, modelName: { contains: "MacBook" }, ...NOT_JUNK } });
  console.log(`MacBook 在庫（ジャンク以外） ${macTotal}`);
  console.log(`新型 M6（Apple 公式・${MBP_M6_CHECKED}）16GB／1TB ${MBP_M6_PRICE.toLocaleString()}円`);

  for (const m of MODELS) {
    const where: Where = { AND: [await modelWhere(m), { isSoldOut: false }, NOT_JUNK] };
    const total = await prisma.deviceInventory.count({ where });
    const shopsOf = await prisma.deviceInventory.groupBy({ by: ["shopName"], where, _count: { _all: true } });
    console.log(`\n== ${m}（${MAC_INFO[m]?.year ?? "-"}年・${MAC_INFO[m]?.chip ?? "-"}） ${total}件  店: ${shopsOf.map((s) => `${s.shopName} ${s._count._all}`).join("・")}`);
    const g = await prisma.deviceInventory.groupBy({ by: ["storage", "memoryGB"], where, _count: { _all: true }, _min: { price: true } });
    for (const r of g.sort((a, b) => a.storage - b.storage || (a.memoryGB ?? 0) - (b.memoryGB ?? 0))) {
      const n = r._count._all;
      const at: Where = { AND: [where, { storage: r.storage, memoryGB: r.memoryGB }] };
      const med = n >= MIN_ROW ? await medianPrice(at, n) : null;
      const vsNew = med && r.storage === 1024 && r.memoryGB === 16 ? `  新型との差 ${(MBP_M6_PRICE - med).toLocaleString()}円（${(((MBP_M6_PRICE - med) / MBP_M6_PRICE) * 100).toFixed(1)}%）` : "";
      console.log(`  ${r.storage}GB・メモリ${r.memoryGB ?? "不明"}${r.memoryGB ? "GB" : ""} ${n}件 中${med?.toLocaleString() ?? "-"} 安${r._min.price?.toLocaleString()}${vsNew}`);
    }
    // ランクの内訳（未使用品 S が相場を押し上げていないか）
    const ranks = await prisma.deviceInventory.groupBy({ by: ["conditionRank"], where, _count: { _all: true } });
    console.log(`  ランク: ${ranks.map((r) => `${r.conditionRank ?? "不明"} ${r._count._all}`).join("・")}`);
  }
  await prisma.$disconnect();
}

main();
