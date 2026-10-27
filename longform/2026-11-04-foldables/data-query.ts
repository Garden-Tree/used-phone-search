/**
 * 横動画「折りたたみスマホ、どれを買う？Duo・Pixel・Galaxy を新品と中古の相場で比べる」の数字。読むだけ。
 *   npx tsx longform/2026-11-04-foldables/data-query.ts > longform/2026-11-04-foldables/data-query.log
 *
 * DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫（DeviceInventory）の行は取らない。
 *
 * - 対象: shorts/themes/foldbudget.ts の FOLD_MODELS（lib/galaxyCatalog.ts の Galaxy Z Fold・Z Flip と lib/pixelCatalog.ts の Fold）
 * - iPhone Duo の中古在庫: modelName に「Duo」を含む行の数（大小区別なし・売り切れも含む）。新品は ideas/2026-10-27-iphone-duo.md（Apple 公式・10/27）
 * - 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ数字）。容量ごとの中央値は在庫 MIN_ROW 件以上の容量だけ
 * - 1世代前: shorts/themes/fold.ts と同じ組・同じ容量の決め方（両方に在庫5件以上ある容量のうちいちばん小さい容量の中央値どうし）
 * - 予算別（macbook の回と同じ考え方）: 在庫 MIN_STOCK 件以上の機種のうち、相場が帯 (ひとつ前の予算, 予算] に入る機種を相場の高い順に。
 *   Pixel は Google のアップデート保証が終わった機種を除く（foldbudget と同じ）
 * - 画面の大きさ（外側・内側）は lib/galaxySpecs.ts（ドコモの製品仕様）・lib/pixelSpecs.ts（Google の技術仕様）。Pixel の保証の期限は lib/pixelCatalog.ts
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { SHOPS, findShop, shopsFor } from "@/lib/shops";
import { specOf } from "@/lib/iphoneSpecs";
import { GALAXY_RELEASED } from "@/lib/galaxyCatalog";
import { PIXEL_INFO, jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { storageLabel } from "@/lib/format";
import { FOLD_MODELS } from "@/shorts/themes/foldbudget";

type Where = Prisma.DeviceInventoryWhereInput;

/** iPhone Duo の新品（Apple 公式・税込・SIMフリー・10/27 確認。ideas/2026-10-27-iphone-duo.md） */
const DUO_PRICES: Record<number, number> = { 256: 364800, 512: 399800, 1024: 469800, 2048: 574800 };
/** 1世代前の組（shorts/themes/fold.ts と同じ） */
const PAIRS: [string, string][] = [
  ["Galaxy Z Fold8", "Galaxy Z Fold7"],
  ["Galaxy Z Fold7", "Galaxy Z Fold6"],
  ["Galaxy Z Fold6", "Galaxy Z Fold5"],
  ["Galaxy Z Flip8", "Galaxy Z Flip7"],
  ["Galaxy Z Flip7", "Galaxy Z Flip6"],
  ["Galaxy Z Flip6", "Galaxy Z Flip5"],
  ["Pixel 11 Pro Fold", "Pixel 10 Pro Fold"],
  ["Pixel 10 Pro Fold", "Pixel 9 Pro Fold"],
];
/** 予算（円）。帯は (前の予算, 予算] */
const BUDGETS = [50000, 100000, 150000, 200000, 300000];
/** 予算別に選ぶ機種の在庫の下限（foldbudget と同じ5件） */
const MIN_STOCK = 5;
/** 容量の行を出す最小件数 */
const MIN_ROW = 5;
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
const MONTH = "2026-10";

const yen = (n: number | null | undefined) => (n == null ? "-" : `${n.toLocaleString("ja-JP")}円`);
const released = (m: string) => GALAXY_RELEASED[m] ?? PIXEL_INFO[m]?.available ?? "-";
const age = (m: string) => {
  const [y, mo] = released(m).split("-").map(Number);
  return (y || 0) * 12 + (mo || 0);
};
const kind = (m: string) => (/Flip/.test(m) ? "Flip型" : "Fold型");
const screens = (m: string) => {
  const s = specOf(m);
  return s ? `外${s.display}・内${s.displayInner ?? "-"}インチ` : "画面-";
};

async function storageCounts(where: Where) {
  return new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), { count: g.count, min: g.minPrice }] as const));
}

async function main() {
  const all = await activeShops(SHOPS);
  const pixelShops = await activeShops(shopsFor("Pixel 10"));
  const galaxyShops = await activeShops(shopsFor("Galaxy S26"));
  console.log(`在庫がある店（全体） ${all.length}`);
  console.log(`Pixel を扱う店（在庫あり） ${pixelShops.length}: ${pixelShops.map((s) => s.label).join("・")}`);
  console.log(`Galaxy を扱う店（在庫あり） ${galaxyShops.length}: ${galaxyShops.map((s) => s.label).join("・")}`);

  // iPhone Duo
  const duo = await prisma.deviceInventory.groupBy({ by: ["isSoldOut"], where: { modelName: { contains: "Duo", mode: "insensitive" } }, _count: { _all: true } });
  console.log(`\niPhone Duo の在庫（売り切れも含む）: ${duo.length ? duo.map((d) => `${d.isSoldOut ? "売り切れ" : "販売中"} ${d._count._all}件`).join("・") : "0件"}`);
  console.log(`iPhone Duo 新品（Apple 公式・10/27）: ${Object.entries(DUO_PRICES).map(([gb, p]) => `${gb}GB ${yen(p)}`).join(" / ")}`);

  // 折りたたみ全体
  const foldWhere: Where = { isSoldOut: false, modelName: { in: FOLD_MODELS } };
  const total = await prisma.deviceInventory.count({ where: foldWhere });
  const byBrand = await prisma.deviceInventory.groupBy({ by: ["modelName"], where: foldWhere, _count: { _all: true } });
  const galaxyFold = byBrand.filter((r) => /Galaxy Z Fold/.test(r.modelName)).reduce((a, r) => a + r._count._all, 0);
  const galaxyFlip = byBrand.filter((r) => /Galaxy Z Flip/.test(r.modelName)).reduce((a, r) => a + r._count._all, 0);
  const pixelFold = byBrand.filter((r) => /^Pixel/.test(r.modelName)).reduce((a, r) => a + r._count._all, 0);
  console.log(`\n折りたたみ（FOLD_MODELS ${FOLD_MODELS.length}機種）の在庫 ${total}件: Galaxy Z Fold ${galaxyFold}・Galaxy Z Flip ${galaxyFlip}・Pixel の Fold ${pixelFold}`);
  const byShop = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: foldWhere, _count: { _all: true } });
  // 折りたたみの在庫がある店（別の売り場は親の店に合算。activeShops と同じ数え方）
  const foldShops = new Set<string>();
  for (const r of byShop) {
    const s = findShop(r.shopName);
    const parent = s?.alias ? findShop(s.alias) : s;
    if (parent && SHOPS.includes(parent)) foldShops.add(parent.label);
  }
  console.log(`折りたたみの在庫がある店 ${foldShops.size}: ${[...foldShops].join("・")}`);
  console.log(`店ごと: ${byShop.sort((a, b) => b._count._all - a._count._all).map((r) => `${r.shopName} ${r._count._all}`).join(" / ")}`);

  // 全機種の相場
  const market = await getModelMarket(FOLD_MODELS);
  const rows = [...market].sort(([, a], [, b]) => a.medianPrice - b.medianPrice);
  console.log(`\n== 折りたたみの相場（安い順。* は在庫${MIN_STOCK}件未満。Pixel は保証の期限）`);
  for (const m of FOLD_MODELS.filter((x) => !market.has(x))) console.log(`  ${m.padEnd(22)} 在庫なし`);
  for (const [m, r] of rows) {
    const until = updateUntil(m);
    console.log(
      `${r.count < MIN_STOCK ? "*" : " "} ${m.padEnd(22)} 相場${r.medianPrice}(${r.medianStorage ? storageLabel(r.medianStorage) : "-"}) 最安${r.minPrice} ${r.count}件` +
        ` ${kind(m)} ${screens(m)} ${jaMonth(released(m))}発売${until ? ` 保証${jaMonth(until)}まで（残り${updateYearsLeft(m, MONTH)}年）` : ""}`,
    );
  }

  // 予算の帯
  const cands = rows.filter(([m, r]) => r.count >= MIN_STOCK && !((updateYearsLeft(m, MONTH) ?? 1) <= 0));
  console.log(`\n== 予算の帯（在庫${MIN_STOCK}件以上・帯は前の予算〜予算・相場の高い順。BEST＝いちばん上）`);
  BUDGETS.forEach((b, i) => {
    const lo = i ? BUDGETS[i - 1] : 0;
    const band = cands.filter(([, r]) => r.medianPrice > lo && r.medianPrice <= b).sort(([a, ra], [bb, rb]) => rb.medianPrice - ra.medianPrice || age(bb) - age(a));
    console.log(`${lo / 10000}万超〜${b / 10000}万円: ${band.length ? band.map(([m, r], k) => `${k === 0 ? "BEST " : ""}${m} ${r.medianPrice}(${storageLabel(r.medianStorage ?? 0)}・${r.count}件)`).join(" / ") : "なし"}`);
  });

  // 1世代前
  console.log(`\n== 1世代前にすると（両方に在庫${MIN_ROW}件以上の容量のうちいちばん小さい容量の中央値どうし）`);
  for (const [newer, older] of PAIRS) {
    const [wa, wb] = [await modelWhere(newer), await modelWhere(older)];
    const [ca, cb] = [await storageCounts(wa), await storageCounts(wb)];
    const common = [...ca.keys()].filter((g) => g > 0 && (ca.get(g)?.count ?? 0) >= MIN_ROW && (cb.get(g)?.count ?? 0) >= MIN_ROW).sort((x, y) => x - y);
    if (!common.length) {
      console.log(`対象外: ${newer}→${older}（両方に在庫${MIN_ROW}件以上の容量がない）`);
      continue;
    }
    const gb = common[0];
    const a = (await medianPrice({ AND: [wa, { storage: gb }] }, ca.get(gb)!.count))!;
    const b = (await medianPrice({ AND: [wb, { storage: gb }] }, cb.get(gb)!.count))!;
    console.log(`${newer}→${older}（${storageLabel(gb)}・在庫 ${ca.get(gb)!.count}件／${cb.get(gb)!.count}件） ${a} → ${b}（差 ${a - b}円・${(((a - b) / a) * 100).toFixed(1)}%）`);
  }

  // 機種ごと（容量ごと）
  console.log(`\n== 機種ごと（容量ごとの中央値・最安・在庫・ジャンクを除いた数と中央値。在庫${MIN_ROW}件以上の容量は中央値つき）`);
  for (const m of FOLD_MODELS) {
    const r = market.get(m);
    if (!r) continue;
    const where = await modelWhere(m);
    const counts = [...(await storageCounts(where))].sort(([a], [b]) => a - b);
    const lines: string[] = [];
    for (const [gb, g] of counts) {
      const at: Where = { AND: [where, { storage: gb }] };
      const md = g.count >= MIN_ROW ? await medianPrice(at, g.count) : null;
      const nj: Where = { AND: [at, NOT_JUNK] };
      const njc = await prisma.deviceInventory.count({ where: nj });
      const njm = njc >= MIN_ROW ? await medianPrice(nj, njc) : null;
      lines.push(`${storageLabel(gb)} ${g.count}件 中${yen(md)} 安${yen(g.min)} | ジャンク除く ${njc}件 中${yen(njm)}${gb === r.medianStorage ? "  ←相場" : ""}`);
    }
    const shops = await prisma.deviceInventory.groupBy({ by: ["shopName"], where, _count: { _all: true } });
    console.log(`\n-- ${m}（${kind(m)}・${screens(m)}・${jaMonth(released(m))}発売） 相場${yen(r.medianPrice)}(${storageLabel(r.medianStorage ?? 0)}) 最安${yen(r.minPrice)} ${r.count}件`);
    console.log(`   ${lines.join("\n   ")}`);
    console.log(`   店: ${shops.sort((a, b) => b._count._all - a._count._all).map((s) => `${s.shopName} ${s._count._all}`).join(" / ")}`);
  }
}

main().finally(() => prisma.$disconnect());
