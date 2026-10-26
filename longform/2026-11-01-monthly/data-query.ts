/**
 * 横動画9本目「今月の中古iPhoneおすすめ」（毎月1日に作り直す）の数字。読むだけ。
 *   npx tsx longform/2026-11-01-monthly/data-query.ts [--days 30] > longform/2026-11-01-monthly/data-query.log
 *
 * DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫（DeviceInventory）の行は取らない。
 * 先月からの動きは価格推移の記録（PriceSnapshot・1日1行／機種×容量）の2日分だけ（lib/marketStats.ts の getPriceDrops と同じ取り方）。
 *
 * BEST5 の選び方（台本・説明欄と同じ。主観は入れない。shorts/themes/budget.ts の pickBudgetModels と同じ考え方）:
 * - 対象は iOS 27 対応の iPhone（lib/catalog.ts の ALL_CATALOG_MODELS）のうち、iPhone 12 シリーズ以降と SE (第3世代)
 *   （11 シリーズと SE 第2世代は除く。shorts/themes/budget.ts の isRecentEnough と同じ）で、在庫が MIN_STOCK 件以上の機種
 * - 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ数字）
 * - 予算 B ごとに、帯 (max(ひとつ前の予算, B−GAP), B] に相場が入る機種のうち、相場がいちばん高い機種（同じなら発売の新しい方）
 *   ＝その予算で買える、いちばん上の機種。帯が空なら「なし」と出す（台本を直す）
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket, type ModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { ALL_CATALOG_MODELS, modelToSlug } from "@/lib/catalog";
import { appleRepair } from "@/lib/appleRepairPrices";
import { applePrice, applePriceStorages } from "@/lib/applePrices";
import { specOf } from "@/lib/iphoneSpecs";
import { ALL_STORAGE } from "@/lib/priceHistory";

type Where = Prisma.DeviceInventoryWhereInput;

/** 予算（円）。帯は (max(前の予算, 予算−GAP), 予算] */
const BUDGETS = [40000, 50000, 70000, 100000, 150000];
/** 「予算ぴったり」の幅（shorts/themes/budget.ts の BUDGET_GAP と同じ 1万円） */
const GAP = 10000;
/** 在庫がこの件数以上の機種だけ（今月のおすすめなので、電池や店を選べるだけの在庫がある機種。10/26 の 12 Pro Max は260件で外れる） */
const MIN_STOCK = 300;
/** 先月との比較: 在庫の数が この倍率より変わった機種は「店の数が変わった」として比べない（9月は店が少なかった） */
const MOVE_COUNT_RATIO = 1.5;
/** 帯ごとに数字を出す機種の数（1位＋次点） */
const PER_BAND = 3;
/** 先月との比較: 対象日の何日前の記録と比べるか（その日以前でいちばん近い記録・3日以内）。--days 29 などで変える */
const daysArg = process.argv.indexOf("--days");
const MONTH_DAYS = daysArg > 0 ? Number(process.argv[daysArg + 1]) : 30;

const yearOf = (m: string) => Number(specOf(m)?.released.replace("年", "") ?? 0);
const isRecentEnough = (m: string) => yearOf(m) >= 2020 && m !== "iPhone SE (第2世代)";
const floorOf = (i: number) => Math.max(i > 0 ? BUDGETS[i - 1] : 0, BUDGETS[i] - GAP);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const DAY = 86400000;

async function main() {
  const shops = await activeShops();
  console.log(`店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  const iphone: Where = { isSoldOut: false, modelName: { startsWith: "iPhone" } };
  console.log(`iPhone 在庫 ${await prisma.deviceInventory.count({ where: iphone })}`);

  // 全機種の相場（iOS 27 対応）
  const market = await getModelMarket(ALL_CATALOG_MODELS);
  const all = [...market].sort(([, a], [, b]) => a.medianPrice - b.medianPrice);
  console.log(`\n== iOS 27 対応の iPhone ${all.length}機種（相場の安い順。* は対象外＝11 シリーズ・SE 第2世代、または在庫${MIN_STOCK}件未満）`);
  for (const [m, r] of all) {
    const out = !isRecentEnough(m) || r.count < MIN_STOCK ? "*" : " ";
    console.log(`${out} ${m.padEnd(20)} 相場${r.medianPrice}(${r.medianStorage}GB) 最安${r.minPrice} ${r.count}件 ${specOf(m)?.released ?? "-"}`);
  }

  // 3万円以下（BEST の対象外。11・SE 第2世代は古いので選ばないが、台本の予算別まとめで1行触れる）
  const under3 = all.filter(([, r]) => r.medianPrice <= 30000).map(([m, r]) => `${m} ${r.medianPrice}(${r.medianStorage}GB・${r.count}件・${specOf(m)?.released})`);
  console.log(`
3万円以下の相場（対象外も含む）: ${under3.join(" / ") || "なし"}`);

  // 帯ごとの1位と次点
  const cands: [string, ModelMarket][] = all.filter(([m, r]) => isRecentEnough(m) && r.count >= MIN_STOCK);
  const show = new Set<string>();
  console.log(`\n== 予算の帯（相場がいちばん高い機種＝BEST。在庫${MIN_STOCK}件以上・12 シリーズ以降と SE 第3世代）`);
  for (let i = 0; i < BUDGETS.length; i++) {
    const [lo, hi] = [floorOf(i), BUDGETS[i]];
    const band = cands.filter(([, r]) => r.medianPrice > lo && r.medianPrice <= hi)
      .sort(([a, ra], [b, rb]) => rb.medianPrice - ra.medianPrice || yearOf(b) - yearOf(a));
    console.log(`${lo / 10000}万超〜${hi / 10000}万円: ${band.length === 0 ? "なし" : band.slice(0, PER_BAND).map(([m, r], k) => `${k === 0 ? "BEST " : ""}${m} ${r.medianPrice}(${r.medianStorage}GB・${r.count}件)`).join(" / ")}`);
    band.slice(0, PER_BAND).forEach(([m]) => show.add(m));
    // 予算を少しこえる機種（相場が 予算〜予算+GAP。「あと少し出せば」の比較に使う）
    const over = cands.filter(([, r]) => r.medianPrice > hi && r.medianPrice <= hi + GAP).sort(([, a], [, b]) => a.medianPrice - b.medianPrice)[0];
    if (over) {
      console.log(`   予算を少しこえる: ${over[0]} ${over[1].medianPrice}(${over[1].medianStorage}GB・${over[1].count}件)`);
      show.add(over[0]);
    }
  }

  // 先月からの動き（PriceSnapshot。相場の容量どうし）
  const latestRow = await prisma.priceSnapshot.findFirst({ orderBy: { date: "desc" }, select: { date: true } });
  const firstRow = await prisma.priceSnapshot.findFirst({ orderBy: { date: "asc" }, select: { date: true } });
  const moves = new Map<string, string>();
  if (latestRow) {
    const latest = latestRow.date;
    const target = new Date(latest.getTime() - MONTH_DAYS * DAY);
    // 30日前以前でいちばん新しい記録の日（getPriceDrops と同じ）。3日より離れていたら比べない
    const pastRow = await prisma.priceSnapshot.findFirst({ where: { date: { lte: target } }, orderBy: { date: "desc" }, select: { date: true } });
    const past = pastRow && target.getTime() - pastRow.date.getTime() <= 3 * DAY ? pastRow.date : undefined;
    console.log(`\n== 先月からの動き（PriceSnapshot ${firstRow ? iso(firstRow.date) : "-"}〜${iso(latest)}。${past ? iso(past) : "比べる日なし"} → ${iso(latest)}・相場の容量どうし）`);
    // iPhone 全体の在庫の推移（全容量の行の合計・日ごと）。店が増えた日がわかる
    const totals = await prisma.priceSnapshot.groupBy({
      by: ["date"],
      where: { date: { gte: new Date(latest.getTime() - (MONTH_DAYS + 5) * DAY) }, storage: ALL_STORAGE, modelSlug: { startsWith: "iphone-" } },
      _sum: { count: true },
      orderBy: { date: "asc" },
    });
    console.log(`iPhone の在庫（記録の合計）: ${totals.map((t) => `${iso(t.date).slice(5)} ${t._sum.count}`).join(" / ")}`);
    if (past) {
      const pairs = [...show].map((m) => ({ modelSlug: modelToSlug(m), storage: market.get(m)!.medianStorage ?? ALL_STORAGE }));
      const rows = await prisma.priceSnapshot.findMany({
        where: { date: { in: [past, latest] }, OR: pairs },
        select: { date: true, modelSlug: true, storage: true, medianPrice: true, minPrice: true, count: true },
      });
      for (const m of show) {
        const slug = modelToSlug(m);
        const st = market.get(m)!.medianStorage ?? ALL_STORAGE;
        const a = rows.find((r) => r.modelSlug === slug && r.storage === st && r.date.getTime() === past.getTime());
        const b = rows.find((r) => r.modelSlug === slug && r.storage === st && r.date.getTime() === latest.getTime());
        if (!a || !b) {
          moves.set(m, "記録なし");
          continue;
        }
        const d = b.medianPrice - a.medianPrice;
        const ratio = b.count / a.count;
        const ok = ratio <= MOVE_COUNT_RATIO && ratio >= 1 / MOVE_COUNT_RATIO;
        moves.set(m, `${ok ? "" : "【比べない・在庫の数が大きく変わった】"}${a.medianPrice}→${b.medianPrice}（${d >= 0 ? "+" : ""}${d}円・${((d / a.medianPrice) * 100).toFixed(1)}%・在庫${a.count}→${b.count}）`);
      }
    }
  }

  // 帯の1位と次点の、容量ごとの数字
  console.log(`\n== 機種ごと（容量ごとの相場・最安・在庫・電池85%以上の最安と件数。在庫5件以上の容量だけ）`);
  for (const m of show) {
    const where = await modelWhere(m);
    const r = market.get(m)!;
    const spec = specOf(m);
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
    console.log(`\n-- ${m}（${spec?.released} ${spec?.display}インチ ${spec?.chip} ${spec?.port} ${spec?.auth}） 相場${r.medianPrice}(${r.medianStorage}GB) 最安${r.minPrice} ${r.count}件 先月から ${moves.get(m) ?? "-"} 電池交換${rep?.battery ?? "-"} 画面${rep?.screen ?? "-"} 新品 ${news || "-"}\n   ${st.join("\n   ")}`);
  }
}

main().finally(() => prisma.$disconnect());
