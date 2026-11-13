/**
 * 横動画「中古iPhone 12は今買い？」の数字。読むだけ（DB に書かない）。
 *   npx tsx longform/2026-11-21-iphone12/data-query.ts > longform/2026-11-21-iphone12/data-query.log
 *
 * DB は groupBy・count・aggregate と、中央値の1行（findFirst＋skip）だけ。findMany で在庫（DeviceInventory）の行は取らない。
 * 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ・ジャンクも入る）。
 * 電池・ランク・店ごとの数字はジャンクを除く（NOT_JUNK）。容量ごとの数字は在庫5件以上の容量だけ。
 * 公式の値: iOS 27 対応（lib/catalog.ts）・スペック（lib/iphoneSpecs.ts）・電池交換と画面修理（lib/appleRepairPrices.ts）・新品（lib/applePrices.ts）
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { ALL_CATALOG_MODELS } from "@/lib/catalog";
import { appleRepair, APPLE_REPAIR_CHECKED } from "@/lib/appleRepairPrices";
import { applePrice, applePriceStorages, APPLE_PRICES_CHECKED } from "@/lib/applePrices";
import { specOf } from "@/lib/iphoneSpecs";
import { SHOPS, ALIAS_SHOPS, findShop } from "@/lib/shops";

type Where = Prisma.DeviceInventoryWhereInput;

const MIN = 5;
const MAIN = "iPhone 12";
/** 同じ 6.1インチの無印（12・14・15・16）と、別枠の SE 第3世代（4.7インチ） */
const PEERS = ["iPhone 11", "iPhone 12", "iPhone 12 mini", "iPhone 12 Pro", "iPhone 13", "iPhone 14", "iPhone SE (第3世代)"];
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
/** 「80%以上」としか書かない店（DB には 80）。80〜84% の区分からは外す */
const OVER80_SHOPS = [...SHOPS, ...ALIAS_SHOPS].filter((s) => s.battery === "over80").map((s) => s.name);
const jst = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 9 * 3600000).toISOString().replace("T", " ").slice(0, 16) : "-");
const parentName = (shopName: string) => { const s = findShop(shopName); return (s?.alias ? findShop(s.alias) : s)?.name ?? shopName; };

/** 件数・最安・中央値（中央値は1行だけ取る） */
async function stat(where: Where) {
  const a = await prisma.deviceInventory.aggregate({ where, _count: { _all: true }, _min: { price: true }, _max: { price: true } });
  const n = a._count._all;
  return { n, min: a._min.price, max: a._max.price, median: await medianPrice(where, n) };
}
const show = (s: { n: number; min: number | null; max: number | null; median: number | null }) => `${s.n}件 中${s.median ?? "-"} 安${s.min ?? "-"} 高${s.max ?? "-"}`;

async function main() {
  console.log(`集計 ${jst(new Date())} JST`);
  const shops = await activeShops();
  console.log(`店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  const iphone: Where = { isSoldOut: false, modelName: { startsWith: "iPhone" } };
  const total = await prisma.deviceInventory.aggregate({ where: iphone, _count: { _all: true }, _max: { updatedAt: true } });
  console.log(`iPhone 在庫 ${total._count._all}・在庫の最終更新 ${jst(total._max.updatedAt)} JST`);
  console.log(`修理料金の確認日 ${APPLE_REPAIR_CHECKED}・新品価格の確認日 ${APPLE_PRICES_CHECKED}`);

  const market = await getModelMarket(PEERS);

  console.log(`\n== 1 機種ごと（サイトの相場と、容量ごと。容量ごとは在庫5件以上）`);
  const table = new Map<string, { gb: number; all: Awaited<ReturnType<typeof stat>>; nj: Awaited<ReturnType<typeof stat>>; b85: Awaited<ReturnType<typeof stat>> }[]>();
  for (const m of PEERS) {
    const where = await modelWhere(m);
    const r = market.get(m);
    const s = specOf(m);
    const rep = appleRepair(m);
    const news = applePriceStorages(m).map((gb) => `${gb}GB ${applePrice(m, gb)}`).join(" ");
    const shopRows = await prisma.deviceInventory.groupBy({ by: ["shopName"], where, _count: { _all: true } });
    const shopN = new Set(shopRows.map((x) => parentName(x.shopName))).size;
    console.log(`\n-- ${m}（${s?.released} ${s?.display}インチ ${s?.panel} ${s?.chip} ${s?.port} ${s?.auth}）iOS27 ${ALL_CATALOG_MODELS.includes(m) ? "対応" : "非対応"} 相場 ${r?.medianPrice ?? "-"}(${r?.medianStorage ?? "-"}GB) 最安 ${r?.minPrice ?? "-"} 全${r?.count ?? 0}件 ${shopN}店 電池交換 ${rep?.battery ?? "料金表になし"} 画面 ${rep?.screen ?? "料金表になし"} 新品 ${news || "-"}`);
    const groups = (await groupMinPrice(where, "storage")).map((g) => ({ gb: Number(g.key), count: g.count })).filter((g) => g.count >= MIN).sort((a, b) => a.gb - b.gb);
    const rows = [];
    for (const g of groups) {
      const at: Where = { AND: [where, { storage: g.gb }] };
      const all = await stat(at);
      const nj = await stat({ AND: [at, NOT_JUNK] });
      const b85 = await stat({ AND: [at, NOT_JUNK, { batteryHealth: { gte: 85 } }] });
      rows.push({ gb: g.gb, all, nj, b85 });
      console.log(`   ${g.gb}GB 全部: ${show(all)} / ジャンク除く: ${show(nj)} / 電池85%以上: ${show(b85)}（${((b85.n / nj.n) * 100).toFixed(1)}%）`);
    }
    table.set(m, rows);
  }
  const at = (m: string, gb: number) => table.get(m)?.find((r) => r.gb === gb);

  console.log(`\n== 2 iPhone 12 との差（同じ容量・全部の中央値＝サイトの相場と同じ取り方）`);
  for (const gb of [128, 256]) {
    const base = at(MAIN, gb);
    if (!base) continue;
    for (const m of PEERS.filter((x) => x !== MAIN)) {
      const y = at(m, gb);
      if (y) console.log(`${gb}GB ${MAIN} ${base.all.median} / ${m} ${y.all.median} 差 ${y.all.median! - base.all.median!}（電池85%以上どうし ${base.b85.median ?? "-"} / ${y.b85.median ?? "-"} 差 ${y.b85.median && base.b85.median ? y.b85.median - base.b85.median : "-"}）`);
    }
  }
  const a128 = at(MAIN, 128), a256 = at(MAIN, 256), a512 = at(MAIN, 512);
  if (a128 && a256) console.log(`\n容量の差 ${MAIN}: 256GB−128GB ${a256.all.median! - a128.all.median!}${a512 ? `・512GB−256GB ${a512.all.median! - a256.all.median!}` : ""}`);

  // ここから下は iPhone 13 の、在庫がいちばん多い容量（相場の容量）だけ
  const st = market.get(MAIN)?.medianStorage ?? 128;
  const base: Where = { AND: [await modelWhere(MAIN), { storage: st }, NOT_JUNK] };
  console.log(`\n== 3 ${MAIN} ${st}GB 電池（ジャンク除く）`);
  const bRows = await prisma.deviceInventory.groupBy({ by: ["batteryHealth", "shopName"], where: base, _count: { _all: true } });
  const dist = new Map<string, number>();
  for (const r of bRows) {
    const h = r.batteryHealth;
    const k = h === null ? "不明" : h === 80 && OVER80_SHOPS.includes(r.shopName) ? "80以上（店の表記）" : h >= 100 ? "100" : h >= 90 ? "90〜99" : h >= 85 ? "85〜89" : h >= 80 ? "80〜84" : "80未満";
    dist.set(k, (dist.get(k) ?? 0) + r._count._all);
  }
  console.log(`内訳: ${[...dist].map(([k, n]) => `${k} ${n}件`).join(" / ")}`);
  const exact80: Where = { OR: [{ batteryHealth: { gte: 81, lte: 84 } }, { batteryHealth: 80, shopName: { notIn: OVER80_SHOPS } }] };
  const tiers: [string, Where][] = [
    ["90%以上", { batteryHealth: { gte: 90 } }],
    ["85%以上", { batteryHealth: { gte: 85 } }],
    ["85〜89%", { batteryHealth: { gte: 85, lte: 89 } }],
    ["80〜84%（数値で書く店）", exact80],
    ["80%以上（店の表記）", { batteryHealth: 80, shopName: { in: OVER80_SHOPS } }],
    ["80〜84%＋80%以上の表記", { batteryHealth: { gte: 80, lte: 84 } }],
    ["80%未満", { batteryHealth: { lt: 80 } }],
    ["85%未満（数値あり）", { batteryHealth: { lt: 85 } }],
    ["不明", { batteryHealth: null }],
  ];
  for (const [name, w] of tiers) console.log(`${name}: ${show(await stat({ AND: [base, w] }))}`);
  const rep = appleRepair(MAIN)!;
  console.log(`Apple の電池交換 ${rep.battery}・画面修理 ${rep.screen}`);
  // 同じランクの中での電池の差（ランクで値段が変わる分をのぞく）
  for (const rank of ["A", "B", "C"]) {
    const rk: Where = { conditionRank: { in: [rank, rank.toLowerCase()] } };
    console.log(`ランク${rank}: 85%以上 ${show(await stat({ AND: [base, rk, { batteryHealth: { gte: 85 } }] }))} / 80〜84%（数値） ${show(await stat({ AND: [base, rk, exact80] }))} / 80%未満 ${show(await stat({ AND: [base, rk, { batteryHealth: { lt: 80 } }] }))}`);
  }

  console.log(`\n== 4 ${MAIN} ${st}GB 状態ランク（ジャンクも出す）`);
  const all13: Where = { AND: [await modelWhere(MAIN), { storage: st }] };
  const rankRows = await prisma.deviceInventory.groupBy({ by: ["conditionRank"], where: all13, _count: { _all: true }, _min: { price: true } });
  const rankKeys = [...new Set(rankRows.map((r) => r.conditionRank.toUpperCase()))];
  for (const k of rankKeys) console.log(`ランク${k}: ${show(await stat({ AND: [all13, { conditionRank: { in: [k, k.toLowerCase()] } }] }))}`);

  console.log(`\n== 5 ${MAIN} ${st}GB 店ごと（ジャンク除く・別の売り場は本店に合算・店名はログだけ。動画では出さない）`);
  const shopRows = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: base, _count: { _all: true }, _min: { price: true } });
  const byShop = new Map<string, { names: string[]; n: number; min: number }>();
  for (const r of shopRows) {
    const p = parentName(r.shopName);
    const cur = byShop.get(p) ?? { names: [], n: 0, min: Infinity };
    cur.names.push(r.shopName); cur.n += r._count._all; cur.min = Math.min(cur.min, r._min.price ?? Infinity);
    byShop.set(p, cur);
  }
  const shopList = [];
  for (const [p, v] of byShop) {
    const w: Where = { AND: [base, { shopName: { in: v.names } }] };
    const median = await medianPrice(w, v.n);
    const b = await stat({ AND: [w, { conditionRank: { in: ["B", "b"] } }] });
    shopList.push({ p, ...v, median, bMin: b.min, bMedian: b.median, bN: b.n });
  }
  shopList.sort((a, b) => a.min - b.min);
  shopList.forEach((s, i) => console.log(`最安の安い順 ${i + 1}位 ${s.p}: 最安${s.min} 中${s.median} ${s.n}件 / ランクB 最安${s.bMin ?? "-"} 中${s.bMedian ?? "-"} ${s.bN}件`));
  const byMedian = shopList.filter((s) => s.n >= MIN).sort((a, b) => a.median! - b.median!);
  console.log(`店ごとの中央値の安い順（在庫5件以上の${byMedian.length}店）: ${byMedian.map((s) => s.median).join(" / ")}`);
  if (shopList.length >= 5) console.log(`最安: 1位 ${shopList[0].min}・5位 ${shopList[4].min}・差 ${shopList[4].min - shopList[0].min}`);
  if (byMedian.length >= 5) console.log(`中央値: 1位 ${byMedian[0].median}・5位 ${byMedian[4].median}・差 ${byMedian[4].median! - byMedian[0].median!}・いちばん高い店 ${byMedian[byMedian.length - 1].median}`);
  const bShops = shopList.filter((s) => s.bN >= MIN).sort((a, b) => a.bMedian! - b.bMedian!);
  if (bShops.length >= 5) console.log(`ランクBの中央値（ランクB 5件以上の${bShops.length}店）: ${bShops.map((s) => s.bMedian).join(" / ")}・1位と5位の差 ${bShops[4].bMedian! - bShops[0].bMedian!}`);

  console.log(`\n== 6 ${MAIN}（全容量・ジャンク除く）利用制限・SIM・保証1年の店`);
  const allNj: Where = { AND: [await modelWhere(MAIN), NOT_JUNK] };
  const net = await prisma.deviceInventory.groupBy({ by: ["networkStatus"], where: allNj, _count: { _all: true } });
  console.log(`利用制限: ${net.map((r) => `${r.networkStatus ?? "記載なし"} ${r._count._all}件`).join(" / ")}`);
  const sim = await prisma.deviceInventory.groupBy({ by: ["simUnlocked"], where: allNj, _count: { _all: true } });
  console.log(`SIMフリー: ${sim.map((r) => `${r.simUnlocked} ${r._count._all}件`).join(" / ")}`);
  const yearShops = [...SHOPS, ...ALIAS_SHOPS].filter((s) => s.yearWarranty).map((s) => s.name);
  console.log(`保証1年の店（lib/shops.ts の yearWarranty）${yearShops.length}: ${st}GB ${show(await stat({ AND: [base, { shopName: { in: yearShops } }] }))} / うち電池85%以上 ${show(await stat({ AND: [base, { shopName: { in: yearShops } }, { batteryHealth: { gte: 85 } }] }))}`);
  const here = shopList.map((s) => findShop(s.p)).filter((s) => !!s);
  console.log(`${st}GB を売っている${here.length}店の赤ロム保証（lib/shops.ts）: ${here.map((s) => s!.redRomShort).join(" / ")}`);
  console.log(`同じく故障の保証: ${here.map((s) => s!.warrantyShort).join(" / ")}`);
  console.log(`同じく電池の書き方: 数値 ${here.filter((s) => s!.battery === "exact").length}店・80%以上だけ ${here.filter((s) => s!.battery === "over80").length}店・なし ${here.filter((s) => s!.battery === "none").length}店`);

  await prisma.$disconnect();
  process.exit(0);
}
main();
