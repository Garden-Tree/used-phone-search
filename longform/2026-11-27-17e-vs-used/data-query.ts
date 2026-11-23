/**
 * 横動画「17e を新品で買うか、同じ値段の中古か」の数字。読むだけ（DB に書かない）。
 *   npx tsx longform/2026-11-27-17e-vs-used/data-query.ts > longform/2026-11-27-17e-vs-used/data-query.log
 * 在庫は aggregate と中央値の1行だけ（findMany しない）
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { activeShops } from "@/lib/activeShops";
import { applePrice, applePriceStorages, APPLE_PRICES_CHECKED } from "@/lib/applePrices";
import { appleRepair, APPLE_REPAIR_CHECKED } from "@/lib/appleRepairPrices";
import { specOf } from "@/lib/iphoneSpecs";

type Where = Prisma.DeviceInventoryWhereInput;
const PEERS = ["iPhone 17e", "iPhone 16e", "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max", "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 17", "iPhone Air"];
const STORAGES = [128, 256, 512];
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };

async function stat(where: Where) {
  const a = await prisma.deviceInventory.aggregate({ where, _count: { _all: true }, _min: { price: true } });
  const n = a._count._all;
  return { n, min: a._min.price, median: n ? await medianPrice(where, n) : null };
}

async function main() {
  const shops = await activeShops();
  console.log(`店 ${shops.length}・新品の確認日 ${APPLE_PRICES_CHECKED}・修理 ${APPLE_REPAIR_CHECKED}`);
  console.log(`\n== 機種 × 容量（中央値・最安・件数。ジャンク除く）／新品（Apple）`);
  for (const m of PEERS) {
    for (const s of STORAGES) {
      const w: Where = { AND: [await modelWhere(m), { isSoldOut: false, storage: s }, NOT_JUNK] };
      const r = await stat(w);
      if (!r.n) continue;
      const nw = applePriceStorages(m).includes(s) ? applePrice(m, s) : null;
      console.log(`${m} ${s}GB\t中央値 ${r.median?.toLocaleString()}\t最安 ${r.min?.toLocaleString()}\t${r.n}件${nw ? `\t新品 ${nw.toLocaleString()}` : ""}`);
    }
  }
  console.log(`\n== 電池85%以上（256GB）`);
  for (const m of ["iPhone 17e", "iPhone 15 Pro", "iPhone 16", "iPhone 16 Pro"]) {
    const w: Where = { AND: [await modelWhere(m), { isSoldOut: false, storage: 256, batteryHealth: { gte: 85 } }, NOT_JUNK] };
    const r = await stat(w);
    console.log(`${m}\t${r.n}件\t中央値 ${r.median?.toLocaleString()}`);
  }
  console.log(`\n== 公式の仕様・修理`);
  for (const m of ["iPhone 17e", "iPhone 15 Pro", "iPhone 16", "iPhone 16 Pro", "iPhone 15 Pro Max", "iPhone 17"]) {
    console.log(m, JSON.stringify(specOf(m)), "修理", JSON.stringify(appleRepair(m)));
  }
}
main().finally(() => prisma.$disconnect());
