/**
 * 横動画「新型 PROLED の MacBook Pro、買う？今のミニLEDか中古の M5 Pro／M4 Pro にする？」の数字（読むだけ。DB は groupBy・count と、中央値の1行だけ。findMany で在庫の行は取らない）
 *
 * - 機種: MacBook Pro 14インチ・16インチの M5 Pro・M5 Max・M4 Pro・M4 Max・M3 Pro・M1 Pro（lib/macCatalog.ts の名前）と、参考に 14インチ M5（無印）。ジャンクを除く
 * - 容量（SSD）× メモリごと（在庫5件以上で中央値）に 件数・中央値・最安
 * - 新型の値段は ideas/2026-10-29-macbook-pro-proled.md（Apple 公式・10/29 確認）だけ。lib にはまだないので、ここに定数で写す
 *   差は「公式の開始価格 − 中古の同じ機種・同じ構成の中央値」。開始構成のメモリ・SSD は 14インチ M5 Pro だけ ideas に「24GB・1TB〜」とある
 *
 *   npx tsx longform/2026-10-31-mbp-proled/data-query.ts > longform/2026-10-31-mbp-proled/data-query.log 2>&1
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { activeMacShops } from "@/lib/activeShops";
import { MAC_INFO } from "@/lib/macCatalog";
import { MBP_M6_PRICE } from "@/lib/macbookProM6";

type Where = Prisma.DeviceInventoryWhereInput;

/** Apple 公式（税込・開始価格・ideas/2026-10-29-macbook-pro-proled.md） */
const OFFICIAL: Record<string, { proled: number; miniled: number }> = {
  "MacBook Pro 14インチ M5 Pro": { proled: 499800, miniled: 429800 },
  "MacBook Pro 14インチ M5 Max": { proled: 769800, miniled: 699800 },
  "MacBook Pro 16インチ M5 Pro": { proled: 599800, miniled: 519800 },
  "MacBook Pro 16インチ M5 Max": { proled: 829800, miniled: 749800 },
};

const MODELS = [
  "MacBook Pro 14インチ M5 Pro",
  "MacBook Pro 14インチ M5 Max",
  "MacBook Pro 16インチ M5 Pro",
  "MacBook Pro 16インチ M5 Max",
  "MacBook Pro 14インチ M4 Pro",
  "MacBook Pro 14インチ M4 Max",
  "MacBook Pro 16インチ M4 Pro",
  "MacBook Pro 16インチ M4 Max",
  "MacBook Pro 14インチ M3 Pro",
  "MacBook Pro 16インチ M3 Pro",
  "MacBook Pro 14インチ M1 Pro",
  "MacBook Pro 16インチ M1 Pro",
  "MacBook Pro 14インチ M5",
];
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
const MIN_ROW = 5;
const yen = (n: number) => n.toLocaleString();

async function main() {
  const shops = await activeMacShops();
  console.log(`Mac の店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  const macTotal = await prisma.deviceInventory.count({ where: { isSoldOut: false, modelName: { contains: "MacBook" }, ...NOT_JUNK } });
  console.log(`MacBook 在庫（ジャンク以外） ${macTotal}`);
  console.log(`参考: 新型 14インチ M6（Apple 公式）16GB／1TB ${yen(MBP_M6_PRICE)}円`);
  for (const [m, p] of Object.entries(OFFICIAL)) console.log(`公式 ${m}: PROLED ${yen(p.proled)}円・ミニLED ${yen(p.miniled)}円（差 ${yen(p.proled - p.miniled)}円）`);

  for (const m of MODELS) {
    const where: Where = { AND: [await modelWhere(m), { isSoldOut: false }, NOT_JUNK] };
    const total = await prisma.deviceInventory.count({ where });
    const shopsOf = await prisma.deviceInventory.groupBy({ by: ["shopName"], where, _count: { _all: true } });
    console.log(`\n== ${m}（${MAC_INFO[m]?.year ?? "-"}年・${MAC_INFO[m]?.chip ?? "-"}） ${total}件  店: ${shopsOf.map((s) => `${s.shopName} ${s._count._all}`).join("・") || "-"}`);
    if (total === 0) continue;
    const g = await prisma.deviceInventory.groupBy({ by: ["storage", "memoryGB"], where, _count: { _all: true }, _min: { price: true } });
    const off = OFFICIAL[m];
    for (const r of g.sort((a, b) => a.storage - b.storage || (a.memoryGB ?? 0) - (b.memoryGB ?? 0))) {
      const n = r._count._all;
      const at: Where = { AND: [where, { storage: r.storage, memoryGB: r.memoryGB }] };
      const med = n >= MIN_ROW ? await medianPrice(at, n) : null;
      const vs = med && off ? `  PROLED開始との差 ${yen(off.proled - med)}円・ミニLED開始との差 ${yen(off.miniled - med)}円` : "";
      const vsM6 = med && r.storage === 1024 ? `  M6(16GB/1TB)との差 ${yen(MBP_M6_PRICE - med)}円` : "";
      console.log(`  ${r.storage}GB・メモリ${r.memoryGB ?? "不明"}${r.memoryGB ? "GB" : ""} ${n}件 中${med?.toLocaleString() ?? "-"} 安${r._min.price?.toLocaleString()}${vs}${vsM6}`);
    }
    const ranks = await prisma.deviceInventory.groupBy({ by: ["conditionRank"], where, _count: { _all: true } });
    console.log(`  ランク: ${ranks.map((r) => `${r.conditionRank ?? "不明"} ${r._count._all}`).join("・")}`);
  }
  await prisma.$disconnect();
}

main();
