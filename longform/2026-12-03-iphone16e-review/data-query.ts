/**
 * 横動画「iPhone 16e を1年半使った」の数字。読むだけ（DB に書かない）。
 *   npx tsx longform/2026-12-03-iphone16e-review/data-query.ts > longform/2026-12-03-iphone16e-review/data-query.log
 *
 * 在庫（DeviceInventory）は groupBy・count・aggregate と中央値の1行だけ。買取（BuybackPrice）は 13 の行だけ（数十行）。
 * 公式の値: iOS 27 対応（lib/catalog.ts）・スペック（lib/iphoneSpecs.ts）・修理（lib/appleRepairPrices.ts）・新品（lib/applePrices.ts）
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { ALL_CATALOG_MODELS } from "@/lib/catalog";
import { appleRepair, APPLE_REPAIR_CHECKED } from "@/lib/appleRepairPrices";
import { applePrice, applePriceStorages, APPLE_PRICES_CHECKED } from "@/lib/applePrices";
import { specOf } from "@/lib/iphoneSpecs";

type Where = Prisma.DeviceInventoryWhereInput;
const MAIN = "iPhone 16e";
const PEERS = ["iPhone SE (第3世代)", "iPhone 14", "iPhone 15", "iPhone 16", "iPhone 16e", "iPhone 17", "iPhone 17e", "iPhone Air"];
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
const jst = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 9 * 3600000).toISOString().replace("T", " ").slice(0, 16) : "-");

async function stat(where: Where) {
  const a = await prisma.deviceInventory.aggregate({ where, _count: { _all: true }, _min: { price: true } });
  const n = a._count._all;
  return { n, min: a._min.price, median: await medianPrice(where, n) };
}

async function main() {
  console.log(`集計 ${jst(new Date())} JST`);
  const shops = await activeShops();
  const iphone: Where = { isSoldOut: false, modelName: { startsWith: "iPhone" } };
  const total = await prisma.deviceInventory.aggregate({ where: iphone, _count: { _all: true }, _max: { updatedAt: true } });
  console.log(`店 ${shops.length}・iPhone 在庫 ${total._count._all}・最終更新 ${jst(total._max.updatedAt)} JST`);
  console.log(`修理の確認日 ${APPLE_REPAIR_CHECKED}・新品の確認日 ${APPLE_PRICES_CHECKED}`);

  const market = await getModelMarket(PEERS);
  console.log(`\n== 1 機種ごと（相場＝在庫がいちばん多い容量の中央値）・128GB と 256GB の中央値`);
  for (const m of PEERS) {
    const r = market.get(m);
    const s = specOf(m);
    const rep = appleRepair(m);
    const where = await modelWhere(m);
    const by = [];
    for (const gb of [128, 256]) {
      const x = await stat({ AND: [where, { storage: gb }] });
      if (x.n >= 5) by.push(`${gb}GB ${x.n}件 中${x.median} 安${x.min}`);
    }
    const news = applePriceStorages(m).map((gb) => `${gb}GB ${applePrice(m, gb)}`).join(" ");
    console.log(`-- ${m}（${s?.released} ${s?.display}インチ ${s?.chip} ${s?.port} ${s?.auth}）iOS27 ${ALL_CATALOG_MODELS.includes(m) ? "対応" : "非対応"} 相場 ${r?.medianPrice ?? "-"}(${r?.medianStorage ?? "-"}GB) 全${r?.count ?? 0}件 / ${by.join(" / ")} / 電池交換 ${rep?.battery ?? "-"} 画面 ${rep?.screen ?? "-"} / 新品 ${news || "-"}`);
  }

  console.log(`\n== 2 ${MAIN} の買取（全店・全グレード）`);
  const bb = await prisma.buybackPrice.findMany({ where: { model: MAIN }, select: { shopName: true, storage: true, gradeLabel: true, carrier: true, price: true, updatedAt: true }, orderBy: [{ storage: "asc" }, { price: "desc" }] });
  for (const b of bb) console.log(`${b.storage}GB ${b.shopName} ${b.gradeLabel}${b.carrier ? `（${b.carrier}）` : ""} ${b.price}円 更新 ${jst(b.updatedAt)}`);

  console.log(`\n== 3 ${MAIN} 128GB の電池（ジャンク除く・在庫の電池の分布＝中古で買う人の目安）`);
  const base: Where = { AND: [await modelWhere(MAIN), { storage: 128 }, NOT_JUNK] };
  for (const [name, w] of [["90%以上", { batteryHealth: { gte: 90 } }], ["85〜89%", { batteryHealth: { gte: 85, lte: 89 } }], ["80〜84%", { batteryHealth: { gte: 80, lte: 84 } }], ["80%未満", { batteryHealth: { lt: 80 } }], ["不明", { batteryHealth: null }]] as [string, Where][]) {
    const x = await stat({ AND: [base, w] });
    console.log(`${name}: ${x.n}件 中${x.median ?? "-"}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
