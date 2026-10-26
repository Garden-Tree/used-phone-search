/** 横動画8本目「大きい画面の中古iPhone、どれを買う？」の数字（読むだけ。DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫の行は取らない） */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { appleRepair } from "@/lib/appleRepairPrices";
import { applePrice, applePriceStorages } from "@/lib/applePrices";
import { IPHONE_SPECS } from "@/lib/iphoneSpecs";

type Where = Prisma.DeviceInventoryWhereInput;

/** 大きい画面（6.5インチ以上）と、比べる無印・Pro */
const BIG = [
  "iPhone 11 Pro Max", "iPhone 12 Pro Max", "iPhone 13 Pro Max", "iPhone 14 Plus", "iPhone 14 Pro Max",
  "iPhone 15 Plus", "iPhone 15 Pro Max", "iPhone 16 Plus", "iPhone 16 Pro Max", "iPhone Air", "iPhone 17 Pro Max", "iPhone 18 Pro Max",
];
const SMALL = ["iPhone 13", "iPhone 13 Pro", "iPhone 14", "iPhone 14 Pro", "iPhone 15", "iPhone 15 Pro", "iPhone 16", "iPhone 16 Pro", "iPhone 17", "iPhone 17 Pro"];

async function main() {
  const shops = await activeShops();
  console.log(`店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  const iphone: Where = { isSoldOut: false, modelName: { startsWith: "iPhone" } };
  console.log(`iPhone 在庫 ${await prisma.deviceInventory.count({ where: iphone })}`);

  const market = await getModelMarket([...BIG, ...SMALL]);
  let bigTotal = 0;
  for (const m of [...BIG, ...SMALL]) {
    const where = await modelWhere(m);
    const r = market.get(m);
    if (BIG.includes(m)) bigTotal += r?.count ?? 0;
    const spec = IPHONE_SPECS[m];
    const groups = (await groupMinPrice(where, "storage")).map((g) => ({ gb: Number(g.key), count: g.count, min: g.minPrice })).sort((a, b) => a.gb - b.gb);
    const st: string[] = [];
    for (const g of groups) {
      if (g.count < 5) continue;
      const at: Where = { AND: [where, { storage: g.gb }] };
      const a85 = await prisma.deviceInventory.aggregate({ where: { AND: [at, { batteryHealth: { gte: 85 } }, { conditionRank: { notIn: ["J", "j", "ジャンク"] } }] }, _min: { price: true }, _count: { _all: true } });
      st.push(`${g.gb}GB 中${await medianPrice(at, g.count)} 安${g.min} ${g.count}件 85%以上の最安${a85._min.price ?? "-"}(${a85._count._all})`);
    }
    const rep = appleRepair(m);
    const news = applePriceStorages(m).map((gb) => `${gb}GB ${applePrice(m, gb)}`).join(" ");
    console.log(`\n== ${m}（${spec?.released} ${spec?.display}インチ ${spec?.chip} ${spec?.port}） 相場${r?.medianPrice}(${r?.medianStorage}GB) 最安${r?.minPrice} ${r?.count}件 電池交換${rep?.battery ?? "-"} 画面${rep?.screen ?? "-"} 新品 ${news || "-"}\n  ${st.join("\n  ")}`);
  }
  console.log(`\n大きい画面の在庫 合計 ${bigTotal}`);
}

main().finally(() => prisma.$disconnect());
