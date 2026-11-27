/** XR・XS の回: 替える先を 12・13 Pro・15 にした案の数字（読むだけ）。
 *   npx tsx longform/2026-12-02-xrxs-keep/data-query-pro.ts > longform/2026-12-02-xrxs-keep/data-query-pro.log */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
const PEERS = ["iPhone 12", "iPhone 13 Pro", "iPhone 15"];
async function main() {
  console.log(`集計 ${new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 16)} JST`);
  const market = await getModelMarket(PEERS);
  for (const m of PEERS) {
    const r = market.get(m);
    const where = await modelWhere(m);
    const by = [];
    for (const gb of [64, 128, 256]) {
      const w = { AND: [where, { storage: gb }] };
      const a = await prisma.deviceInventory.aggregate({ where: w, _count: { _all: true }, _min: { price: true } });
      if (a._count._all >= 5) by.push(`${gb}GB ${a._count._all}件 中${await medianPrice(w, a._count._all)} 安${a._min.price}`);
    }
    console.log(`${m} 相場 ${r?.medianPrice}(${r?.medianStorage}GB) 全${r?.count}件 / ${by.join(" / ")}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
