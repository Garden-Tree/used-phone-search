/**
 * 横動画「M1 MacBook Air、2026年でもまだ使える？」の数字（読むだけ。DB は groupBy・count と、中央値の1行だけ。findMany で在庫の行は取らない）
 *
 * - M1 Air: 件数・店・メモリ×SSD ごとの件数・中央値・最安・ランク・電池（最大容量の書いてある在庫だけ）
 * - 比べる機種: Air 13インチ M2〜M5・MacBook Neo・Pro 13インチ M1（lib/macCatalog.ts の名前）。ジャンクを除く
 * - M1 Air の相場の推移（PriceSnapshot・256GB と全容量。メモリは分けられない）
 *
 *   npx tsx longform/2026-11-03-m1-air/data-query.ts > longform/2026-11-03-m1-air/data-query.log 2>&1
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { activeMacShops } from "@/lib/activeShops";
import { MAC_INFO } from "@/lib/macCatalog";
import { modelToSlug } from "@/lib/catalog";

type Where = Prisma.DeviceInventoryWhereInput;

const M1 = "MacBook Air M1";
const OTHERS = [
  "MacBook Air 13インチ M2",
  "MacBook Air 13インチ M3",
  "MacBook Air 13インチ M4",
  "MacBook Air 13インチ M5",
  "MacBook Neo",
  "MacBook Pro 13インチ M1",
];
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
const MIN_ROW = 5;

async function show(m: string, detail = false) {
  const where: Where = { AND: [await modelWhere(m), { isSoldOut: false }, NOT_JUNK] };
  const total = await prisma.deviceInventory.count({ where });
  if (total === 0) return console.log(`\n== ${m} 0件`);
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
  if (!detail) return;

  // 8GB・256GB のランクごと（在庫5件以上で中央値）
  const base: Where = { AND: [where, { storage: 256, memoryGB: 8 }] };
  const rk = await prisma.deviceInventory.groupBy({ by: ["conditionRank"], where: base, _count: { _all: true }, _min: { price: true } });
  for (const r of rk) {
    const n = r._count._all;
    const med = n >= MIN_ROW ? await medianPrice({ AND: [base, { conditionRank: r.conditionRank }] }, n) : null;
    console.log(`  8GB・256GB ランク${r.conditionRank} ${n}件 中${med?.toLocaleString() ?? "-"} 安${r._min.price?.toLocaleString()}`);
  }
  // 電池（最大容量の書いてある在庫）
  const withBat = await prisma.deviceInventory.count({ where: { AND: [where, { batteryHealth: { not: null } }] } });
  console.log(`  電池の%がある在庫 ${withBat}件`);
  const bands: [string, number, number][] = [["90-100", 90, 100], ["85-89", 85, 89], ["80-84", 80, 84], ["〜79", 0, 79]];
  for (const [label, lo, hi] of bands) {
    const w: Where = { AND: [where, { batteryHealth: { gte: lo, lte: hi } }] };
    const n = await prisma.deviceInventory.count({ where: w });
    const w8: Where = { AND: [base, { batteryHealth: { gte: lo, lte: hi } }] };
    const n8 = await prisma.deviceInventory.count({ where: w8 });
    const med8 = n8 >= MIN_ROW ? await medianPrice(w8, n8) : null;
    console.log(`  電池${label}% ${n}件（うち 8GB・256GB ${n8}件 中${med8?.toLocaleString() ?? "-"}）`);
  }
  // 店ごとの 8GB・256GB
  const sh = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: base, _count: { _all: true }, _min: { price: true } });
  for (const s of sh) {
    const n = s._count._all;
    const med = n >= MIN_ROW ? await medianPrice({ AND: [base, { shopName: s.shopName }] }, n) : null;
    console.log(`  8GB・256GB ${s.shopName} ${n}件 中${med?.toLocaleString() ?? "-"} 安${s._min.price?.toLocaleString()}`);
  }
}

async function main() {
  const shops = await activeMacShops();
  console.log(`Mac の店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  const base: Where = { isSoldOut: false, ...NOT_JUNK };
  const macTotal = await prisma.deviceInventory.count({ where: { ...base, modelName: { contains: "MacBook" } } });
  console.log(`MacBook 在庫（ジャンク以外） ${macTotal}`);
  await show(M1, true);
  for (const m of OTHERS) await show(m);

  const slug = modelToSlug(M1);
  console.log(`\n== 推移 ${slug}`);
  const snaps = await prisma.priceSnapshot.findMany({ where: { modelSlug: slug, storage: { in: [0, 256] } }, orderBy: { date: "asc" }, select: { date: true, storage: true, minPrice: true, medianPrice: true, count: true } });
  for (const s of snaps) console.log(`  ${s.date.toISOString().slice(0, 10)} ${s.storage === 0 ? "全容量" : s.storage + "GB"} 中${s.medianPrice.toLocaleString()} 安${s.minPrice.toLocaleString()} ${s.count}件`);
  await prisma.$disconnect();
}

main();
