/**
 * 横動画「今は買うな｜中古iPhone 地雷N台・正解N台【2026年11月】」の数字。読むだけ（DB に書かない）。
 *   npx tsx longform/2026-11-06-jirai/data-query.ts > longform/2026-11-06-jirai/data-query.log
 *
 * DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫（DeviceInventory）の行は取らない。
 * 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ）。容量ごとの数字は在庫5件以上の容量だけ。
 * 公式の値: iOS 27 対応（lib/catalog.ts）・スペック（lib/iphoneSpecs.ts）・電池交換と画面修理（lib/appleRepairPrices.ts）・新品（lib/applePrices.ts）
 *
 * このログから、outline.md の決まりで地雷と正解を選ぶ。
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { ALL_CATALOG_MODELS, ALL_PAGE_MODELS } from "@/lib/catalog";
import { appleRepair } from "@/lib/appleRepairPrices";
import { applePrice, applePriceStorages } from "@/lib/applePrices";
import { specOf } from "@/lib/iphoneSpecs";
import { nextGeneration } from "@/lib/nextGeneration";
import { findShop } from "@/lib/shops";

type Where = Prisma.DeviceInventoryWhereInput;
type Row = { gb: number; median: number; min: number; count: number; b85: number; b85min: number | null };

const MIN = 5;
/** Apple Intelligence（16以降の全部と 15 Pro・15 Pro Max。6本目 10/25 に apple.com/jp/ios/ で確認） */
const AI_MODELS = /^iPhone (1[6-8]|Air|15 Pro)/;
const jst = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 9 * 3600000).toISOString().replace("T", " ").slice(0, 16) : "-");

async function main() {
  console.log(`集計 ${jst(new Date())} JST`);
  const shops = await activeShops();
  console.log(`店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  const iphone: Where = { isSoldOut: false, modelName: { startsWith: "iPhone" } };
  const total = await prisma.deviceInventory.aggregate({ where: iphone, _count: { _all: true }, _max: { updatedAt: true } });
  console.log(`iPhone 在庫 ${total._count._all}・在庫の最終更新 ${jst(total._max.updatedAt)} JST`);

  const market = await getModelMarket(ALL_PAGE_MODELS);
  const table = new Map<string, Row[]>();
  for (const m of ALL_PAGE_MODELS) {
    const where = await modelWhere(m);
    const groups = (await groupMinPrice(where, "storage")).map((g) => ({ gb: Number(g.key), count: g.count, min: g.minPrice })).filter((g) => g.count >= MIN).sort((a, b) => a.gb - b.gb);
    const rows: Row[] = [];
    for (const g of groups) {
      const at: Where = { AND: [where, { storage: g.gb }] };
      const a85 = await prisma.deviceInventory.aggregate({ where: { AND: [at, { batteryHealth: { gte: 85 } }, { conditionRank: { notIn: ["J", "j", "ジャンク"] } }] }, _min: { price: true }, _count: { _all: true } });
      const median = await medianPrice(at, g.count);
      if (median !== null) rows.push({ gb: g.gb, median, min: g.min, count: g.count, b85: a85._count._all, b85min: a85._min.price });
    }
    table.set(m, rows);
  }
  const at = (m: string, gb: number) => table.get(m)?.find((r) => r.gb === gb);

  console.log(`\n== 機種ごと（在庫5件以上の容量だけ）`);
  for (const m of ALL_PAGE_MODELS) {
    const r = market.get(m);
    const s = specOf(m);
    const rep = appleRepair(m);
    const news = applePriceStorages(m).map((gb) => `${gb}GB ${applePrice(m, gb)}`).join(" ");
    console.log(`\n-- ${m}（${s?.released} ${s?.display}インチ ${s?.panel} ${s?.chip} ${s?.port} ${s?.auth}）iOS27 ${ALL_CATALOG_MODELS.includes(m) ? "対応" : "非対応"} AI ${AI_MODELS.test(m) ? "○" : "×"} 相場 ${r?.medianPrice ?? "-"}(${r?.medianStorage ?? "-"}GB) 最安 ${r?.minPrice ?? "-"} 全${r?.count ?? 0}件 電池交換 ${rep?.battery ?? "料金表になし"} 画面 ${rep?.screen ?? "料金表になし"} 新品 ${news || "-"}`);
    for (const x of table.get(m) ?? []) {
      const pct = ((x.b85 / x.count) * 100).toFixed(1);
      console.log(`   ${x.gb}GB 中${x.median} 安${x.min} ${x.count}件 電池85%以上 ${x.b85}件(${pct}%) 最安${x.b85min ?? "-"}`);
    }
  }

  console.log(`\n== A iOS 27 非対応と、iOS 27 対応の安い機種（同じ容量）`);
  for (const m of ALL_PAGE_MODELS.filter((x) => !ALL_CATALOG_MODELS.includes(x))) {
    for (const x of table.get(m) ?? []) {
      const near = ["iPhone SE (第2世代)", "iPhone 11", "iPhone SE (第3世代)", "iPhone 12", "iPhone 12 mini"].map((n) => {
        const y = at(n, x.gb);
        return y ? `${n} ${y.median}(差${y.median - x.median}・${y.count}件)` : null;
      }).filter(Boolean);
      console.log(`${m} ${x.gb}GB 中${x.median} ${x.count}件 / ${near.join(" / ") || "比べる容量なし"}`);
    }
  }

  console.log(`\n== B iOS 27 対応・電池交換の料金表になし`);
  for (const m of ALL_CATALOG_MODELS.filter((x) => !appleRepair(x))) {
    const n = nextGeneration(m);
    console.log(`${m} ${(table.get(m) ?? []).map((x) => {
      const y = n ? at(n, x.gb) : undefined;
      return `${x.gb}GB 中${x.median} ${x.count}件${y ? ` 1つ上 ${n} ${y.median}(差${y.median - x.median}・${y.count}件)` : ""}`;
    }).join(" / ")}`);
  }

  console.log(`\n== C 新品（Apple 公式・SIMフリー・税込）と中古の相場（同じ容量・在庫5件以上）`);
  for (const m of ALL_CATALOG_MODELS) {
    for (const gb of applePriceStorages(m)) {
      const x = at(m, gb);
      if (x) console.log(`${m} ${gb}GB 新品${applePrice(m, gb)} 中${x.median} 安${x.min} ${x.count}件 新品−相場 ${applePrice(m, gb)! - x.median}`);
    }
  }

  console.log(`\n== D 1つ上の世代との差（同じ容量・両方在庫5件以上）・電池交換を足すと`);
  for (const m of ALL_PAGE_MODELS) {
    const n = nextGeneration(m);
    if (!n) continue;
    const sameChip = specOf(m)?.chip === specOf(n)?.chip;
    const rep = appleRepair(m);
    for (const x of table.get(m) ?? []) {
      const y = at(n, x.gb);
      if (!y) continue;
      const plus = rep ? x.median + rep.battery : null;
      console.log(`${m}→${n} ${x.gb}GB ${x.median}→${y.median} 差${y.median - x.median} チップ ${specOf(m)?.chip}→${specOf(n)?.chip}${sameChip ? "【同じ】" : ""} 端子 ${specOf(m)?.port}→${specOf(n)?.port} 電池交換を足す ${plus ?? "-"}${plus !== null && plus >= y.median ? "【1つ上以上】" : ""}`);
    }
  }

  console.log(`\n== 同じチップの機種（iOS 27 対応・128GB があれば 128GB）`);
  const chips = new Map<string, string[]>();
  for (const m of ALL_CATALOG_MODELS) {
    const c = specOf(m)?.chip;
    if (c) chips.set(c, [...(chips.get(c) ?? []), m]);
  }
  for (const [c, ms] of chips) {
    console.log(`${c}: ${ms.map((m) => {
      const x = at(m, 128);
      return `${m} ${x ? `128GB ${x.median}(${x.count}件・85%以上${x.b85}件)` : `${market.get(m)?.medianStorage ?? "-"}GB ${market.get(m)?.medianPrice ?? "-"}(${market.get(m)?.count ?? 0}件)`}`;
    }).join(" / ")}`);
  }

  console.log(`\n== その機能がいちばん安い機種（iOS 27 対応・128GB 以上で在庫300件以上の容量の相場が安い順に3つ）`);
  const FEATURES: [string, (m: string) => boolean][] = [
    ["Face ID", (m) => specOf(m)?.auth === "Face ID"],
    ["有機EL", (m) => specOf(m)?.panel === "有機EL"],
    ["A15 Bionic 以降のチップ（Face ID）", (m) => specOf(m)?.auth === "Face ID" && !/A1[34]/.test(specOf(m)?.chip ?? "")],
    ["USB-C", (m) => specOf(m)?.port === "USB-C"],
    ["Apple Intelligence", (m) => AI_MODELS.test(m)],
  ];
  for (const [name, ok] of FEATURES) {
    const c = ALL_CATALOG_MODELS.filter(ok).flatMap((m) => (table.get(m) ?? []).filter((x) => x.gb >= 128 && x.count >= 300).map((x) => ({ m, ...x }))).sort((a, b) => a.median - b.median).slice(0, 3);
    console.log(`${name}: ${c.map((x) => `${x.m} ${x.gb}GB ${x.median}(${x.count}件・85%以上${x.b85}件 ${((x.b85 / x.count) * 100).toFixed(1)}%)`).join(" / ")}`);
  }

  // 地雷と正解の選定（outline.md の決まりそのまま。主観は入れない）
  const catalog = ALL_CATALOG_MODELS;
  const legacy = ALL_PAGE_MODELS.filter((m) => !catalog.includes(m));
  const primaryRow = (m: string) => { const st = market.get(m)?.medianStorage; return st ? at(m, st) : undefined; };
  console.log(`\n== 選定 地雷の条件1: iOS 27 非対応で、同じ容量の iOS 27 対応のいちばん安い機種との差が2,000円未満（高いものも含む）`);
  for (const m of legacy) {
    const x = primaryRow(m);
    if (!x) continue;
    const best = catalog.map((n) => ({ n, y: at(n, x.gb) })).filter((p) => p.y).sort((a, b) => a.y!.median - b.y!.median)[0];
    if (best && best.y!.median - x.median < 2000) console.log(`${m} ${x.gb}GB ${x.median}（全${market.get(m)?.count}件）/ ${best.n} ${best.y!.median} 差 ${best.y!.median - x.median}`);
  }
  console.log(`\n== 選定 地雷の条件2: iOS 27 対応だが、Apple の電池交換の料金表にない`);
  for (const m of catalog.filter((n) => !appleRepair(n))) console.log(`${m} 相場 ${market.get(m)?.medianPrice}(${market.get(m)?.medianStorage}GB) 全${market.get(m)?.count}件`);
  console.log(`\n== 選定 地雷の条件3: 中古の相場が Apple の新品より高い（相場の容量）`);
  for (const m of catalog) {
    const x = primaryRow(m);
    const np = x ? applePrice(m, x.gb) : null;
    if (x && np !== null && x.median > np) console.log(`${m} ${x.gb}GB 新品 ${np} 相場 ${x.median} 中古が +${x.median - np} 全${market.get(m)?.count}件 最安 ${x.min}`);
  }
  // 11/6 変更: 動画の条件4は同じ大きさの画面どうしで見る（6.5インチ以上の USB-C の線は 15 Plus）。下のログは全機種の線のまま
  console.log(`\n== 選定 地雷の条件4: 128GB の在庫が5件以上ある機種の128GB の相場で、USB-C・Apple Intelligence の線（その機能がいちばん安い機種の128GB）まであと5,000円未満（線より高い機種は条件の外として別に出す）`);
  const LINES: [string, (m: string) => boolean][] = [["USB-C", (m) => specOf(m)?.port === "USB-C"], ["Apple Intelligence", (m) => AI_MODELS.test(m)]];
  for (const [name, ok] of LINES) {
    const line = catalog.filter(ok).map((m) => ({ m, y: at(m, 128) })).filter((p) => p.y && p.y.count >= 300).sort((a, b) => a.y!.median - b.y!.median)[0];
    if (!line) continue;
    console.log(`${name} の線: ${line.m} 128GB ${line.y!.median}`);
    for (const m of catalog.filter((n) => !ok(n))) {
      const x = at(m, 128); // at は在庫5件以上の容量だけ
      if (!x) continue;
      const info = `${m} 128GB ${x.median}（${x.count}件・85%以上${x.b85}件 ${((x.b85 / x.count) * 100).toFixed(1)}%）`;
      if (x.median < line.y!.median && line.y!.median - x.median < 5000) console.log(`  ${info}あと ${line.y!.median - x.median}`);
      else if (x.median >= line.y!.median) console.log(`  条件の外（線より高い）: ${info}線より +${x.median - line.y!.median}`);
    }
  }
  console.log(`\n== 選定 正解: iOS 27 対応・電池交換の料金表にある・128GB以上で在庫300件以上・電池85%以上の在庫100件以上のうち、その機能がいちばん安い容量`);
  const TIERS: [string, (m: string) => boolean][] = [["Face ID", (m) => specOf(m)?.auth === "Face ID"], ["USB-C", (m) => specOf(m)?.port === "USB-C"], ["Apple Intelligence", (m) => AI_MODELS.test(m)]];
  for (const [name, ok] of TIERS) {
    const c = catalog.filter((m) => ok(m) && appleRepair(m)).flatMap((m) => (table.get(m) ?? []).filter((x) => x.gb >= 128 && x.count >= 300 && x.b85 >= 100).map((x) => ({ m, ...x }))).sort((a, b) => a.median - b.median)[0];
    if (c) console.log(`${name}: ${c.m} ${c.gb}GB ${c.median}（${c.count}件・85%以上${c.b85}件 ${((c.b85 / c.count) * 100).toFixed(1)}%・最安${c.b85min}）電池交換 ${appleRepair(c.m)?.battery} 画面 ${appleRepair(c.m)?.screen}`);
  }

  // 動画に出す機種を、何店で売っているか（別の売り場は親の店に合算。lib/activeShops.ts と同じ数え方）
  console.log(`\n== 何店で売っているか（相場の容量・在庫がある店の数）`);
  for (const m of ["iPhone XR", "iPhone SE (第2世代)", "iPhone 11 Pro", "iPhone 12", "iPhone 14 Pro", "iPhone 15", "iPhone 15 Plus", "iPhone 16e", "iPhone 17e", "iPhone 18 Pro", "iPhone 13"]) {
    const st = market.get(m)?.medianStorage;
    if (!st) continue;
    const rows = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: { AND: [await modelWhere(m), { storage: st }] }, _count: { _all: true } });
    const names = new Set(rows.map((r) => { const s = findShop(r.shopName); return (s?.alias ? findShop(s.alias) : s)?.name ?? r.shopName; }));
    console.log(`${m} ${st}GB ${names.size}店`);
  }
  await prisma.$disconnect();
  process.exit(0);
}
main();
