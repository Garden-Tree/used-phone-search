/**
 * 横動画「中古MacBook、いま買うならどれ？」の数字。読むだけ。
 *   npx tsx longform/2026-11-02-macbook/data-query.ts > longform/2026-11-02-macbook/data-query.log
 *
 * DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫（DeviceInventory）の行は取らない。
 *
 * 予算別の選び方（台本・説明欄と同じ。主観は入れない。shorts/themes/budget.ts の pickBudgetModels・macbudget.ts と同じ考え方）:
 * - 対象は lib/macCatalog.ts の MAC_MODELS（macOS 27 対応の Apple シリコンの MacBook Air・Pro と MacBook Neo）で、在庫が MIN_STOCK 件以上の機種
 * - 相場＝在庫がいちばん多い容量（SSD）の中央値（getModelMarket。サイトの相場と同じ数字）
 * - 予算 B ごとに、帯 (ひとつ前の予算, B] に相場が入る機種のうち、相場がいちばん高い機種（同じなら発売の新しい方）
 *   ＝その予算で買える、いちばん上の機種。帯が空なら「なし」と出す（台本を直す）
 * - 予算は 10万・12万・15万・20万円。10/27: 相場8万円以下の機種がない（いちばん安い Air M1 が 81,980円）ので 8万円は外した。
 *   iPhone の「予算−1万円より上」の幅は使わない（MacBook は機種の間の値段が開き、18万超〜20万円などの帯が空になる）
 * 1世代前: shorts/themes/macgen.ts と同じ組・同じ容量の決め方（両方に在庫5件以上ある SSD のうちいちばん小さい容量の中央値どうし）
 * メモリ: DB の memoryGB（商品名から読んだ値。lib/macCatalog.ts の parseMacSpec。読めない在庫は null）
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket, type ModelMarket } from "@/lib/marketStats";
import { activeMacShops } from "@/lib/activeShops";
import { MAC_INFO, MAC_MODELS } from "@/lib/macCatalog";
import { storageLabel } from "@/lib/format";

type Where = Prisma.DeviceInventoryWhereInput;

/** 予算（円）。帯は (前の予算, 予算] */
const BUDGETS = [100000, 120000, 150000, 200000];
/** 「予算を少しこえる」機種を出す幅 */
const OVER = 20000;
/** 在庫がこの件数以上の機種だけ（店や状態を選べるだけの在庫） */
const MIN_STOCK = 30;
/** 帯ごとに数字を出す機種の数（1位＋次点） */
const PER_BAND = 3;
/** 容量・メモリの行を出す最小件数 */
const MIN_ROW = 5;

/** 1世代前の組（shorts/themes/macgen.ts と同じ） */
const PAIRS: [string, string][] = [
  ["MacBook Air 13インチ M5", "MacBook Air 13インチ M4"],
  ["MacBook Air 13インチ M4", "MacBook Air 13インチ M3"],
  ["MacBook Air 13インチ M3", "MacBook Air 13インチ M2"],
  ["MacBook Air 13インチ M2", "MacBook Air M1"],
  ["MacBook Air 15インチ M5", "MacBook Air 15インチ M4"],
  ["MacBook Air 15インチ M4", "MacBook Air 15インチ M3"],
  ["MacBook Air 15インチ M3", "MacBook Air 15インチ M2"],
];

const yearOf = (m: string) => MAC_INFO[m]?.year ?? 0;
const chipOf = (m: string) => MAC_INFO[m]?.chip ?? "-";
const floorOf = (i: number) => (i > 0 ? BUDGETS[i - 1] : 0);
const JUNK = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };

async function storageCounts(where: Where) {
  return new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), { count: g.count, min: g.minPrice }] as const));
}

/** 機種・容量のメモリ別（件数・中央値・最安） */
async function memoryRows(where: Where, gb: number) {
  const at: Where = { AND: [where, { storage: gb }] };
  const rows = await prisma.deviceInventory.groupBy({ by: ["memoryGB"], where: at, _count: { _all: true }, _min: { price: true } });
  const out: string[] = [];
  for (const r of rows.sort((a, b) => (a.memoryGB ?? 0) - (b.memoryGB ?? 0))) {
    const n = r._count._all;
    const med = n >= MIN_ROW ? await medianPrice({ AND: [at, { memoryGB: r.memoryGB }] }, n) : null;
    out.push(`${r.memoryGB === null ? "メモリ不明" : `${r.memoryGB}GB`} ${n}件${med ? ` 中${med}` : ""} 安${r._min.price}`);
  }
  return out.join(" / ");
}

async function main() {
  const shops = await activeMacShops();
  console.log(`MacBook の在庫がある店（activeMacShops） ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  const mac: Where = { isSoldOut: false, modelName: { startsWith: "MacBook" } };
  const macTotal = await prisma.deviceInventory.count({ where: mac });
  console.log(`MacBook 在庫（modelName が MacBook で始まる・Intel も含む） ${macTotal}`);

  // 全機種の相場（macOS 27 対応）
  const market = await getModelMarket(MAC_MODELS);
  const all = [...market].sort(([, a], [, b]) => a.medianPrice - b.medianPrice);
  const inCatalog = all.reduce((a, [, r]) => a + r.count, 0);
  console.log(`\n== macOS 27 対応の MacBook ${all.length}機種・在庫 ${inCatalog}件（相場の安い順。* は在庫${MIN_STOCK}件未満）`);
  for (const [m, r] of all) {
    console.log(`${r.count < MIN_STOCK ? "*" : " "} ${m.padEnd(26)} 相場${r.medianPrice}(${r.medianStorage ? storageLabel(r.medianStorage) : "-"}) 最安${r.minPrice} ${r.count}件 ${chipOf(m)} ${yearOf(m)}年`);
  }

  // 帯ごとの1位と次点
  const cands: [string, ModelMarket][] = all.filter(([, r]) => r.count >= MIN_STOCK);
  const show = new Set<string>();
  console.log(`\n== 予算の帯（相場がいちばん高い機種＝BEST。在庫${MIN_STOCK}件以上・帯は前の予算〜予算）`);
  for (let i = 0; i < BUDGETS.length; i++) {
    const [lo, hi] = [floorOf(i), BUDGETS[i]];
    const band = cands.filter(([, r]) => r.medianPrice > lo && r.medianPrice <= hi)
      .sort(([a, ra], [b, rb]) => rb.medianPrice - ra.medianPrice || yearOf(b) - yearOf(a));
    console.log(`${lo / 10000}万超〜${hi / 10000}万円: ${band.length === 0 ? "なし" : band.slice(0, PER_BAND).map(([m, r], k) => `${k === 0 ? "BEST " : ""}${m} ${r.medianPrice}(${storageLabel(r.medianStorage ?? 0)}・${r.count}件)`).join(" / ")}`);
    band.slice(0, PER_BAND).forEach(([m]) => show.add(m));
    const over = cands.filter(([, r]) => r.medianPrice > hi && r.medianPrice <= hi + OVER).sort(([, a], [, b]) => a.medianPrice - b.medianPrice)[0];
    if (over) {
      console.log(`   予算を少しこえる: ${over[0]} ${over[1].medianPrice}(${storageLabel(over[1].medianStorage ?? 0)}・${over[1].count}件)`);
      show.add(over[0]);
    }
  }

  // 1世代前（Air）
  console.log(`\n== MacBook Air を1世代前にすると（両方に在庫${MIN_ROW}件以上の SSD のうちいちばん小さい容量の中央値どうし）`);
  for (const [newer, older] of PAIRS) {
    const [wa, wb] = [await modelWhere(newer), await modelWhere(older)];
    const [ca, cb] = [await storageCounts(wa), await storageCounts(wb)];
    const common = [...ca.keys()].filter((g) => g > 0 && (ca.get(g)?.count ?? 0) >= MIN_ROW && (cb.get(g)?.count ?? 0) >= MIN_ROW).sort((x, y) => x - y);
    if (common.length === 0) {
      console.log(`対象外: ${newer}→${older}（両方に在庫${MIN_ROW}件以上の容量がない）`);
      continue;
    }
    const gb = common[0];
    const a = (await medianPrice({ AND: [wa, { storage: gb }] }, ca.get(gb)!.count))!;
    const b = (await medianPrice({ AND: [wb, { storage: gb }] }, cb.get(gb)!.count))!;
    console.log(`${newer}→${chipOf(older)}（${storageLabel(gb)}・在庫 ${ca.get(gb)!.count}件／${cb.get(gb)!.count}件） ${a} → ${b}（差 ${a - b}円・${(((a - b) / a) * 100).toFixed(1)}%）`);
    show.add(newer);
    show.add(older);
  }

  // 店ごとの在庫（MacBook の在庫がある店だけ）
  const catalogWhere: Where = { AND: [mac, { modelName: { in: MAC_MODELS } }] };
  const byShop = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: catalogWhere, _count: { _all: true } });
  console.log(`
== 店ごとの在庫（macOS 27 対応の MacBook）
${byShop.sort((a, b) => b._count._all - a._count._all).map((r) => `${r.shopName} ${r._count._all}`).join(" / ")}`);

  // 同じ値段がまとまっている在庫（同じ商品の色・構成ちがいが別の行になっていないか。機種×容量で、値段の種類が少ないもの）
  console.log(`
== 値段の種類（機種×容量で在庫20件以上。在庫の数に比べて値段の種類が少ないと、同じ商品が並んでいる）`);
  for (const m of [...cands.map(([m]) => m)]) {
    const where = await modelWhere(m);
    for (const [gb, g] of await storageCounts(where)) {
      if (g.count < 20) continue;
      const prices = await prisma.deviceInventory.groupBy({ by: ["price"], where: { AND: [where, { storage: gb }] }, _count: { _all: true } });
      const top = prices.reduce((a, b) => (b._count._all > a._count._all ? b : a));
      if (top._count._all / g.count >= 0.3) {
        const shopsAt = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: { AND: [where, { storage: gb }, { price: top.price }] }, _count: { _all: true } });
        console.log(`${m} ${storageLabel(gb)}: 在庫${g.count}件・値段${prices.length}種類・いちばん多い値段 ${top.price}円が${top._count._all}件（${shopsAt.map((s) => `${s.shopName} ${s._count._all}`).join("・")}）`);
      }
    }
  }

  // メモリの内訳（MacBook 全体。memoryGB が読めた在庫）
  const mem = await prisma.deviceInventory.groupBy({ by: ["memoryGB"], where: catalogWhere, _count: { _all: true } });
  console.log(`\n== メモリの内訳（macOS 27 対応の MacBook 全体・商品名から読めた値）\n${mem.sort((a, b) => (a.memoryGB ?? 0) - (b.memoryGB ?? 0)).map((r) => `${r.memoryGB ?? "不明"}${r.memoryGB ? "GB" : ""} ${r._count._all}件`).join(" / ")}`);

  // 電池の表記（batteryHealth が書いてある在庫の数・店ごと）
  const bat = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: catalogWhere, _count: { _all: true, batteryHealth: true } });
  console.log(`\n== 電池の最大容量が書いてある在庫（店ごと・書いてある件数／在庫）\n${bat.sort((a, b) => b._count._all - a._count._all).map((r) => `${r.shopName} ${r._count.batteryHealth}/${r._count._all}`).join(" / ")}`);
  const b85 = await prisma.deviceInventory.count({ where: { AND: [catalogWhere, { batteryHealth: { gte: 85 } }, JUNK] } });
  const bAny = await prisma.deviceInventory.count({ where: { AND: [catalogWhere, { batteryHealth: { not: null } }] } });
  console.log(`電池が書いてある ${bAny}件のうち 85%以上 ${b85}件`);

  // 機種ごと（容量ごと・メモリ別）
  console.log(`\n== 機種ごと（容量ごとの相場・最安・在庫・電池85%以上の件数とその最安・メモリ別。在庫${MIN_ROW}件以上の容量だけ）`);
  for (const m of show) {
    const r = market.get(m);
    if (!r) {
      console.log(`\n-- ${m}: 在庫なし`);
      continue;
    }
    const where = await modelWhere(m);
    const counts = [...(await storageCounts(where))].sort(([a], [b]) => a - b);
    const lines: string[] = [];
    for (const [gb, g] of counts) {
      if (g.count < MIN_ROW) continue;
      const at: Where = { AND: [where, { storage: gb }] };
      const a85 = await prisma.deviceInventory.aggregate({ where: { AND: [at, { batteryHealth: { gte: 85 } }, JUNK] }, _min: { price: true }, _count: { _all: true } });
      lines.push(`${storageLabel(gb)} 中${await medianPrice(at, g.count)} 安${g.min} ${g.count}件 85%以上${a85._count._all}件(最安${a85._min.price ?? "-"})\n      メモリ: ${await memoryRows(where, gb)}`);
    }
    console.log(`\n-- ${m}（${chipOf(m)}・${yearOf(m)}年・${MAC_INFO[m]?.inch}インチ） 相場${r.medianPrice}(${storageLabel(r.medianStorage ?? 0)}) 最安${r.minPrice} ${r.count}件\n   ${lines.join("\n   ")}`);
  }
}

main().finally(() => prisma.$disconnect());
