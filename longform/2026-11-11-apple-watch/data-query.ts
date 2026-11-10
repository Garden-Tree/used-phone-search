/**
 * 横動画「中古Apple Watch、いま買うならどれ？（SE・Series・Ultra）」の数字。読むだけ（DB に書かない）。
 *   npx tsx longform/2026-11-11-apple-watch/data-query.ts > longform/2026-11-11-apple-watch/data-query.log
 *
 * DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫の行は取らない。
 * 相場＝機種ごとに在庫がいちばん多いケースのサイズ（mm）の中央値（shorts/themes/watchgen.ts の side・medianOf。ショートと同じ決め方）。
 * 公式の値: ケースのサイズ・watchOS 27 の対応・Ultra は Cellular だけ・必要な iPhone（lib/watchCatalog.ts）
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice } from "@/lib/modelInventory";
import { WATCH_INFO, WATCH_MODELS, WATCHOS27_IPHONE } from "@/lib/watchCatalog";
import { activeWatchShops } from "@/lib/activeShops";
import { medianOf, side } from "../../shorts/themes/watchgen";

const jst = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 9 * 3600000).toISOString().replace("T", " ").slice(0, 16) : "-");
const WATCH = { isSoldOut: false, modelName: { startsWith: "Apple Watch" } };

async function main() {
  console.log(`集計 ${jst(new Date())} JST`);
  const total = await prisma.deviceInventory.aggregate({ where: WATCH, _count: { _all: true }, _max: { updatedAt: true } });
  const shops = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: WATCH, _count: { _all: true } });
  const active = await activeWatchShops();
  console.log(`Apple Watch 在庫 ${total._count._all}・${shops.length}売り場・在庫がある店（activeWatchShops）${active.length}店・在庫の最終更新 ${jst(total._max.updatedAt)} JST`);
  console.log(`  売り場: ${shops.map((s) => `${s.shopName} ${s._count._all}`).join("・")}`);
  console.log(`watchOS 27 に必要な iPhone: ${WATCHOS27_IPHONE}`);

  // 電池の最大容量が書いてある在庫
  const bat = await prisma.deviceInventory.count({ where: { ...WATCH, batteryHealth: { not: null } } });
  const bat80 = await prisma.deviceInventory.count({ where: { ...WATCH, batteryHealth: { gte: 80 } } });
  const bat85 = await prisma.deviceInventory.count({ where: { ...WATCH, batteryHealth: { gte: 85 } } });
  console.log(`電池の最大容量の記載あり ${bat}件（80%以上 ${bat80}件・85%以上 ${bat85}件）`);
  const byCarrier = await prisma.deviceInventory.groupBy({ by: ["carrier"], where: WATCH, _count: { _all: true } });
  console.log(`通信方式: ${byCarrier.map((c) => `${c.carrier} ${c._count._all}`).join("・")}`);

  console.log("\n機種 | 系統 | 公式のサイズ | watchOS 27 | 相場のサイズ | 件数(そのサイズ) | 全在庫 | 相場 | 最安(そのサイズ) | 電池記載 | 電池85%以上");
  for (const m of WATCH_MODELS) {
    const i = WATCH_INFO[m];
    const s = await side(m);
    if (!s) { console.log(`${m} | 在庫なし`); continue; }
    const med = s.count > 0 ? await medianOf(s) : null;
    const atSize = { AND: [s.where, { storage: s.size }] };
    const agg = await prisma.deviceInventory.aggregate({ where: atSize, _min: { price: true } });
    const b = await prisma.deviceInventory.count({ where: { AND: [s.where, { batteryHealth: { not: null } }] } });
    const b85 = await prisma.deviceInventory.count({ where: { AND: [s.where, { batteryHealth: { gte: 85 } }] } });
    console.log([m, i.family, i.sizes.map((x) => `${x}mm`).join("/"), i.watchOS27 ? "対応" : "非対応", `${s.size}mm`, s.count, s.total, med, agg._min.price, b, b85].join(" | "));
    // サイズ別（5件以上）
    for (const g of (await groupMinPrice(s.where, "storage")).filter((g) => Number(g.key) > 0 && g.count >= 5)) {
      const gm = await medianPrice({ AND: [s.where, { storage: Number(g.key) }] }, g.count);
      console.log(`    ${g.key}mm 中央値 ${gm} 最安 ${g.minPrice} ${g.count}件`);
    }
    // 相場のサイズでの通信方式別（5件以上）
    const cs = await prisma.deviceInventory.groupBy({ by: ["carrier"], where: atSize, _count: { _all: true }, _min: { price: true } });
    for (const c of cs.filter((c) => c._count._all >= 5)) {
      const cm = await medianPrice({ AND: [atSize, { carrier: c.carrier }] }, c._count._all);
      console.log(`    ${s.size}mm ${c.carrier} 中央値 ${cm} 最安 ${c._min.price} ${c._count._all}件`);
    }
  }
}
main().finally(() => prisma.$disconnect());
