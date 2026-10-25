/** 横動画7本目「中古iPhone、買ってはいけない条件」の数字（読むだけ。DB は groupBy・count・aggregate と、中央値・最安の1行だけ。findMany で在庫の行は取らない） */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { appleRepair } from "@/lib/appleRepairPrices";
import { applePrice, applePriceStorages } from "@/lib/applePrices";

type Where = Prisma.DeviceInventoryWhereInput;

const MODELS = [
  "iPhone SE (第2世代)", "iPhone SE (第3世代)", "iPhone 11", "iPhone 12", "iPhone 12 mini", "iPhone 13", "iPhone 13 mini",
  "iPhone 13 Pro", "iPhone 14", "iPhone 14 Pro", "iPhone 15", "iPhone 15 Pro", "iPhone 16", "iPhone 16e",
];
const NEW_MODELS = ["iPhone 16", "iPhone 17e", "iPhone 17", "iPhone Air", "iPhone 18 Pro", "iPhone 18 Pro Max"];

async function band(where: Where) {
  const count = await prisma.deviceInventory.count({ where });
  return { count, median: count ? await medianPrice(where, count) : null };
}
const fmt = (b: { count: number; median: number | null }) => `${b.median ?? "-"}(${b.count})`;

async function main() {
  const shops = await activeShops();
  console.log(`店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);

  const iphone: Where = { isSoldOut: false, modelName: { startsWith: "iPhone" } };
  const total = await prisma.deviceInventory.count({ where: iphone });
  console.log(`iPhone 在庫 ${total}`);
  const ranks = await prisma.deviceInventory.groupBy({ by: ["conditionRank"], where: iphone, _count: { _all: true } });
  console.log("ランク", ranks.map((r) => `${r.conditionRank}:${r._count._all}`).join(" "));
  const net = await prisma.deviceInventory.groupBy({ by: ["networkStatus"], where: iphone, _count: { _all: true } });
  console.log("利用制限", net.map((r) => `${r.networkStatus}:${r._count._all}`).join(" "));
  const bNull = await prisma.deviceInventory.count({ where: { AND: [iphone, { batteryHealth: null }] } });
  const bLow = await prisma.deviceInventory.count({ where: { AND: [iphone, { batteryHealth: { lt: 80 } }] } });
  const b85 = await prisma.deviceInventory.count({ where: { AND: [iphone, { batteryHealth: { gte: 85 } }] } });
  console.log(`電池 表記なし ${bNull}・80%未満 ${bLow}・85%以上 ${b85}`);
  const byShopNull = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: { AND: [iphone, { batteryHealth: null }] }, _count: { _all: true } });
  console.log("表記なしの店", byShopNull.map((r) => `${r.shopName}:${r._count._all}`).join(" "));
  const byShopAll = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: iphone, _count: { _all: true } });
  console.log("店ごとの iPhone", byShopAll.map((r) => `${r.shopName}:${r._count._all}`).join(" "));

  const market = await getModelMarket(MODELS);
  for (const m of MODELS) {
    const where = await modelWhere(m);
    const r = market.get(m);
    const groups = (await groupMinPrice(where, "storage")).map((g) => ({ gb: Number(g.key), count: g.count, min: g.minPrice })).sort((a, b) => a.gb - b.gb);
    const st: string[] = [];
    for (const g of groups) {
      if (g.count < 5) continue;
      st.push(`${g.gb}GB 中${await medianPrice({ AND: [where, { storage: g.gb }] }, g.count)} 安${g.min} ${g.count}件`);
    }
    console.log(`\n== ${m} 相場${r?.medianPrice}(${r?.medianStorage}GB) 最安${r?.minPrice} ${r?.count}件 電池交換${appleRepair(m)?.battery ?? "表になし"}\n  ${st.join(" / ")}`);
    const gb = groups.some((g) => g.gb === 128 && g.count >= 5) ? 128 : r?.medianStorage ?? 128;
    const at: Where = { AND: [where, { storage: gb }] };
    const bands = {
      null: await band({ AND: [at, { batteryHealth: null }] }),
      lt80: await band({ AND: [at, { batteryHealth: { lt: 80 } }] }),
      eq80: await band({ AND: [at, { batteryHealth: 80 }] }),
      b81_84: await band({ AND: [at, { batteryHealth: { gte: 81, lte: 84 } }] }),
      b85_89: await band({ AND: [at, { batteryHealth: { gte: 85, lte: 89 } }] }),
      b90_99: await band({ AND: [at, { batteryHealth: { gte: 90, lte: 99 } }] }),
      b85_99: await band({ AND: [at, { batteryHealth: { gte: 85, lte: 99 } }] }),
      b100: await band({ AND: [at, { batteryHealth: 100 }] }),
    };
    console.log(`  ${gb}GB 電池 ` + Object.entries(bands).map(([k, v]) => `${k}:${fmt(v)}`).join(" "));
    const rk: string[] = [];
    for (const k of ["S", "A", "B", "C", "D", "J"]) {
      const b = await band({ AND: [at, { conditionRank: { in: [k, k.toLowerCase(), ...(k === "J" ? ["ジャンク"] : [])] } }] });
      if (b.count) rk.push(`${k}:${fmt(b)}`);
    }
    console.log(`  ${gb}GB ランク ${rk.join(" ")}`);
    const cheapest = await prisma.deviceInventory.findMany({
      where: at, orderBy: [{ price: "asc" }, { id: "asc" }], take: 3,
      select: { price: true, conditionRank: true, batteryHealth: true, shopName: true, networkStatus: true },
    });
    console.log(`  ${gb}GB 最安3件 ` + cheapest.map((c) => `${c.price} ${c.conditionRank} 電池${c.batteryHealth ?? "なし"} ${c.shopName} 制限${c.networkStatus ?? "-"}`).join(" | "));
    const a85 = await prisma.deviceInventory.aggregate({ where: { AND: [at, { batteryHealth: { gte: 85 } }, { conditionRank: { notIn: ["J", "j", "ジャンク"] } }] }, _min: { price: true }, _count: { _all: true } });
    console.log(`  ${gb}GB 電池85%以上・ジャンク以外の最安 ${a85._min.price}（${a85._count._all}件）`);
  }

  console.log("\n== 新品（Apple 公式）と中古");
  for (const m of NEW_MODELS) {
    const where = await modelWhere(m);
    for (const gb of applePriceStorages(m)) {
      const b = await band({ AND: [where, { storage: gb }] });
      const min = await prisma.deviceInventory.aggregate({ where: { AND: [where, { storage: gb }] }, _min: { price: true } });
      const np = applePrice(m, gb)!;
      console.log(`${m} ${gb}GB 新品${np} 中古 中${b.median} 安${min._min.price} ${b.count}件 差(中−新)${b.median !== null ? b.median - np : "-"}`);
    }
  }
  await prisma.$disconnect();
  process.exit(0);
}
main();
