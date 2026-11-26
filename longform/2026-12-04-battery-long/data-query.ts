/**
 * 横動画「電池が長持ちする中古iPhone」の数字。読むだけ（DB に書かない）。
 *   npx tsx longform/2026-12-04-battery-long/data-query.ts > longform/2026-12-04-battery-long/data-query.log
 * 在庫は aggregate・count と中央値の1行だけ（findMany しない）。ビデオ再生は Apple の技術仕様（11/26 に30機種を読んだ・outline.md）
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";

const VIDEO: Record<string, number> = {
  "iPhone 12": 17, "iPhone 12 Pro Max": 20, "iPhone 13": 19, "iPhone 13 Pro": 22, "iPhone 13 Pro Max": 28,
  "iPhone 14": 20, "iPhone 14 Plus": 26, "iPhone 14 Pro": 23, "iPhone 14 Pro Max": 29,
  "iPhone 15": 20, "iPhone 15 Plus": 26, "iPhone 15 Pro": 23, "iPhone 15 Pro Max": 29,
  "iPhone 16": 22, "iPhone 16 Plus": 27, "iPhone 16 Pro": 27, "iPhone 16 Pro Max": 33, "iPhone 16e": 26,
  "iPhone 17": 30, "iPhone Air": 27, "iPhone 17 Pro": 33, "iPhone 17 Pro Max": 39, "iPhone 17e": 26,
};
const NOT_JUNK: Prisma.DeviceInventoryWhereInput = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };

async function main() {
  console.log(`集計 ${new Date(Date.now() + 9 * 3600000).toISOString().replace("T", " ").slice(0, 16)} JST`);
  const models = Object.keys(VIDEO);
  const market = await getModelMarket(models);
  const rows = [];
  for (const m of models) {
    const r = market.get(m);
    if (!r?.medianPrice || !r.medianStorage) continue;
    const w = await modelWhere(m);
    const at: Prisma.DeviceInventoryWhereInput = { AND: [w, { storage: r.medianStorage }, NOT_JUNK] };
    const n = await prisma.deviceInventory.count({ where: at });
    const known = await prisma.deviceInventory.count({ where: { AND: [at, { batteryHealth: { not: null } }] } });
    const a85 = await prisma.deviceInventory.aggregate({ where: { AND: [at, { batteryHealth: { gte: 85 } }] }, _count: { _all: true }, _min: { price: true } });
    const w85: Prisma.DeviceInventoryWhereInput = { AND: [at, { batteryHealth: { gte: 85 } }] };
    const med85 = a85._count._all >= 5 ? await medianPrice(w85, a85._count._all) : null;
    rows.push({ m, h: VIDEO[m], gb: r.medianStorage, med: r.medianPrice, n, known, n85: a85._count._all, med85 });
  }
  rows.sort((a, b) => a.med - b.med);
  console.log("機種 | ビデオ再生 | 容量 | 相場 | 1万円あたり | 在庫 | 電池%が分かる | 85%以上（割合・中央値）");
  for (const r of rows) console.log(`${r.m} | ${r.h}時間 | ${r.gb}GB | ${r.med} | ${(r.h / (r.med / 10000)).toFixed(2)} | ${r.n} | ${r.known} | ${r.n85}（${r.n ? Math.round((r.n85 / r.n) * 100) : 0}%）${r.med85 ?? "-"}`);
  console.log("\n== 予算ごとに、相場が予算以下で、ビデオ再生がいちばん長い機種");
  for (const b of [40000, 70000, 90000, 120000, 150000, 200000]) {
    const c = rows.filter((r) => r.med <= b).sort((a, b2) => b2.h - a.h || a.med - b2.med)[0];
    console.log(`${b}: ${c ? `${c.m} ${c.h}時間 ${c.med}（${c.gb}GB）` : "-"}`);
  }
}
main().finally(() => prisma.$disconnect());
