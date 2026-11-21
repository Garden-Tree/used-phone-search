/**
 * 保存版「中古iPhoneの選び方 完全ガイド」の数字。読むだけ（DB に書かない）。
 *   npx tsx --env-file=.env --tsconfig tsconfig.json longform/2026-12-05-iphone-guide/data-query.ts > longform/2026-12-05-iphone-guide/data-query.log
 *
 * 在庫（DeviceInventory）は groupBy・count・aggregate と中央値だけ（findMany で全件は読まない）。
 * 公式の値: iOS 27 対応（lib/catalog.ts）・修理（lib/appleRepairPrices.ts）・新品（lib/applePrices.ts）・店の保証（lib/shops.ts）
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { ALL_CATALOG_MODELS } from "@/lib/catalog";
import { appleRepair, APPLE_REPAIR_CHECKED } from "@/lib/appleRepairPrices";
import { applePrice, APPLE_PRICES_CHECKED } from "@/lib/applePrices";
import { SHOPS } from "@/lib/shops";

type Where = Prisma.DeviceInventoryWhereInput;
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
const jst = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 9 * 3600000).toISOString().replace("T", " ").slice(0, 16) : "-");

async function stat(where: Where) {
  const a = await prisma.deviceInventory.aggregate({ where, _count: { _all: true }, _min: { price: true } });
  const n = a._count._all;
  return { n, min: a._min.price, median: n ? await medianPrice(where, n) : null };
}
const at = async (model: string, gb: number, extra: Where = {}) => stat({ AND: [await modelWhere(model), { storage: gb }, NOT_JUNK, extra] });

// 予算別の候補（BEST5 と同じ決め方: iOS 27 対応の 12 シリーズ以降と SE 第3世代・在庫300件以上・予算から1万円以内で相場がいちばん高い）
const BUDGET_MODELS = ["iPhone SE (第3世代)", "iPhone 12 mini", "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max", "iPhone 13 mini", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max", "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max", "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max", "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max", "iPhone 16e", "iPhone 17", "iPhone 17e", "iPhone Air", "iPhone 17 Pro"];
const BUDGETS = [40000, 50000, 70000, 100000, 150000];

async function main() {
  console.log(`集計 ${jst(new Date())} JST`);
  const shops = await activeShops();
  const iphone: Where = { isSoldOut: false, modelName: { startsWith: "iPhone" } };
  const total = await prisma.deviceInventory.aggregate({ where: iphone, _count: { _all: true }, _max: { updatedAt: true } });
  console.log(`店 ${shops.length}・iPhone 在庫 ${total._count._all}・最終更新 ${jst(total._max.updatedAt)} JST`);
  console.log(`修理の確認日 ${APPLE_REPAIR_CHECKED}・新品の確認日 ${APPLE_PRICES_CHECKED}`);

  console.log(`\n== 1 何世代まで（iOS 27・相場は在庫がいちばん多い容量の中央値・64GB と 128GB）`);
  for (const m of ["iPhone XR", "iPhone XS", "iPhone 11", "iPhone SE (第2世代)", "iPhone 12", "iPhone SE (第3世代)", "iPhone 13"]) {
    const s64 = await at(m, 64), s128 = await at(m, 128);
    const rep = appleRepair(m);
    console.log(`${m} iOS27 ${ALL_CATALOG_MODELS.includes(m) ? "対応" : "非対応"} / 64GB ${s64.n}件 中${s64.median ?? "-"} / 128GB ${s128.n}件 中${s128.median ?? "-"} / 電池交換 ${rep?.battery ?? "-"}`);
  }

  console.log(`\n== 2 電池（128GB・ジャンク除く）: 帯ごとの件数と中央値・最安と電池85%以上の最安`);
  for (const m of ["iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15"]) {
    const bands: [string, Where][] = [["90%以上", { batteryHealth: { gte: 90 } }], ["85〜89%", { batteryHealth: { gte: 85, lte: 89 } }], ["80〜84%", { batteryHealth: { gte: 80, lte: 84 } }], ["80%未満", { batteryHealth: { lt: 80 } }], ["不明", { batteryHealth: null }]];
    const out = [];
    for (const [name, w] of bands) { const x = await at(m, 128, w); out.push(`${name} ${x.n}件 中${x.median ?? "-"}`); }
    const all = await at(m, 128), ok = await at(m, 128, { batteryHealth: { gte: 85 } });
    console.log(`${m} 128GB: ${out.join(" / ")} / 最安 ${all.min}・85%以上の最安 ${ok.min}・85%以上 ${ok.n}件 中${ok.median} / 電池交換 ${appleRepair(m)?.battery ?? "-"}`);
  }

  console.log(`\n== 3 容量（中央値・ジャンク除く）`);
  for (const [m, a, b] of [["iPhone 12", 64, 128], ["iPhone SE (第3世代)", 64, 128], ["iPhone 13", 128, 256], ["iPhone 14", 128, 256], ["iPhone 15", 128, 256], ["iPhone 16", 128, 256]] as [string, number, number][]) {
    const x = await at(m, a), y = await at(m, b);
    console.log(`${m}: ${a}GB ${x.n}件 中${x.median} → ${b}GB ${y.n}件 中${y.median}（差 ${x.median && y.median ? y.median - x.median : "-"}）`);
  }

  console.log(`\n== 4 新品（Apple）と中古（同じ容量の中央値）`);
  for (const [m, gb] of [["iPhone 17e", 256], ["iPhone 17", 256], ["iPhone Air", 256], ["iPhone 18 Pro", 256], ["iPhone 16", 128]] as [string, number][]) {
    const x = await at(m, gb);
    const p = applePrice(m, gb);
    console.log(`${m} ${gb}GB 新品 ${p ?? "-"} / 中古 ${x.n}件 中${x.median ?? "-"}（差 ${p && x.median ? x.median - p : "-"}）`);
  }

  console.log(`\n== 5 店（在庫のある店・lib/shops.ts）`);
  const names = new Set(shops.map((s: any) => (typeof s === "string" ? s : s.name)));
  const rows = SHOPS.filter((s) => names.has(s.name));
  for (const s of rows) console.log(`${s.label}${s.note ? `（${s.note}）` : ""} 電池 ${s.battery} / 保証 ${s.warranty} / 赤ロム ${s.redRom}${s.yearWarranty ? " / 保証1年" : ""}`);
  console.log(`赤ロム保証の記載あり ${rows.filter((s) => s.redRom && !/なし|記載なし/.test(s.redRom)).length}店 / 電池を%で ${rows.filter((s) => s.battery === "exact").length}店 / 保証1年 ${rows.filter((s) => s.yearWarranty).length}店`);
  const byShop = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: iphone, _count: { _all: true } });
  console.log("店ごとの iPhone 在庫: " + byShop.sort((a, b) => b._count._all - a._count._all).slice(0, 8).map((r) => `${r.shopName} ${r._count._all}`).join(" / "));

  console.log(`\n== 6 予算別（在庫300件以上・予算から1万円以内で相場がいちばん高い）`);
  const market = await getModelMarket(BUDGET_MODELS);
  for (const b of BUDGETS) {
    const c = BUDGET_MODELS.map((m) => ({ m, r: market.get(m) })).filter((x) => x.r && x.r.count >= 300 && x.r.medianPrice <= b && x.r.medianPrice > b - 10000).sort((x, y) => y.r!.medianPrice - x.r!.medianPrice);
    console.log(`${b / 10000}万円: ${c.slice(0, 3).map((x) => `${x.m}（${x.r!.medianStorage}GB）中${x.r!.medianPrice}・${x.r!.count}件`).join(" / ") || "なし"}`);
  }

  console.log(`\n== 7 状態ランク A と C（128GB・各店の表記）`);
  for (const m of ["iPhone 13", "iPhone 14", "iPhone 15"]) {
    const a = await at(m, 128, { conditionRank: { in: ["A", "a"] } }), c = await at(m, 128, { conditionRank: { in: ["C", "c"] } });
    console.log(`${m} 128GB: A ${a.n}件 中${a.median} / C ${c.n}件 中${c.median}（差 ${a.median && c.median ? a.median - c.median : "-"}）`);
  }
  console.log(`\n== 8 Apple Intelligence（16 以降・15 Pro）でいちばん安い: 16e 128GB`);
  const e = await at("iPhone 16e", 128);
  console.log(`16e 128GB ${e.n}件 中${e.median}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
