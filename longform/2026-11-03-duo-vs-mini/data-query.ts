/**
 * 横動画「iPhone Duo と新型 iPad mini、1台の値段で中古なら何が買える？」の数字（読むだけ。DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫の行は取らない）
 *
 * - 新品の値段は Apple 公式だけ: iPhone Duo は ideas/2026-10-27-iphone-duo.md（apple.com/jp/shop/buy-iphone/iphone-duo・10/27 確認。lib/applePrices.ts にはまだ入れていない）、
 *   新型 iPad mini（A20 Pro）は lib/ipadMiniA20.ts、iPhone 18 Pro Max は lib/applePrices.ts
 * - iPhone Duo の中古在庫: modelName に「Duo」を含む行の数（大小区別なし）
 * - 中古の機種: iPad mini (A17 Pro)・(第6世代)、大きい画面の iPhone は USB-C の Pro Max（15・16・17 Pro Max）。18 Pro Max は在庫が少なく新品より高いので比べるだけ
 * - 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトと同じ）。容量ごとの中央値は在庫5件以上の容量だけ（ジャンクも入れた数＝サイトと同じ。ジャンクを除いた数も並べる）
 *
 *   npx tsx longform/2026-11-03-duo-vs-mini/data-query.ts > longform/2026-11-03-duo-vs-mini/data-query.log
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { IPAD_SHOPS } from "@/lib/shops";
import { IPHONE_SPECS } from "@/lib/iphoneSpecs";
import { IPAD_SPECS } from "@/lib/ipadSpecs";
import { applePrice, applePriceStorages } from "@/lib/applePrices";
import { IPAD_MINI_A20_CHECKED, IPAD_MINI_A20_PRICES } from "@/lib/ipadMiniA20";

type Where = Prisma.DeviceInventoryWhereInput;

/** iPhone Duo の新品（Apple 公式・税込・SIMフリー・10/27 確認。ideas/2026-10-27-iphone-duo.md） */
const DUO_PRICES: Record<number, number> = { 256: 364800, 512: 399800, 1024: 469800, 2048: 574800 };
const IPADS = ["iPad mini (A17 Pro)", "iPad mini (第6世代)"];
const IPHONES = ["iPhone 15 Pro Max", "iPhone 16 Pro Max", "iPhone 17 Pro Max", "iPhone 18 Pro Max"];
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
const MIN_COUNT = 5;
const yen = (n: number | null | undefined) => (n == null ? "-" : `${n.toLocaleString("ja-JP")}円`);

async function main() {
  const shops = await activeShops();
  const ipadShops = await activeShops(IPAD_SHOPS);
  console.log(`iPhone の店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  console.log(`iPad の店 ${ipadShops.length}: ${ipadShops.map((s) => s.label).join("・")}`);
  console.log(`iPhone 在庫 ${await prisma.deviceInventory.count({ where: { isSoldOut: false, modelName: { startsWith: "iPhone" } } })}`);

  const duo = await prisma.deviceInventory.groupBy({
    by: ["isSoldOut"],
    where: { modelName: { contains: "Duo", mode: "insensitive" } },
    _count: { _all: true },
  });
  console.log(`\niPhone Duo の在庫（売り切れも含む）: ${duo.length ? duo.map((d) => `${d.isSoldOut ? "売り切れ" : "販売中"} ${d._count._all}件`).join("・") : "0件"}`);
  console.log(`iPhone Duo 新品（Apple 公式・10/27）: ${Object.entries(DUO_PRICES).map(([gb, p]) => `${gb}GB ${yen(p)}`).join(" / ")}`);
  console.log(`新型 iPad mini A20 Pro（Apple 公式・${IPAD_MINI_A20_CHECKED}・Wi-Fi）: ${Object.entries(IPAD_MINI_A20_PRICES).map(([gb, p]) => `${gb}GB ${yen(p)}`).join(" / ")}`);
  console.log(`iPhone 18 Pro Max 新品（lib/applePrices.ts）: ${applePriceStorages("iPhone 18 Pro Max").map((gb) => `${gb}GB ${yen(applePrice("iPhone 18 Pro Max", gb))}`).join(" / ")}`);

  const all = [...IPADS, ...IPHONES];
  const market = await getModelMarket(all);
  const med: Record<string, Record<number, number>> = {};
  for (const m of all) {
    const r = market.get(m);
    const spec = IPHONE_SPECS[m] ?? IPAD_SPECS[m];
    console.log(
      `\n== ${m}（${spec?.released}・${spec?.chip}・${spec?.display}インチ ${spec?.panel}）` +
        ` 相場 ${yen(r?.medianPrice)}（${r?.medianStorage}GB）・最安 ${yen(r?.minPrice)}・${r?.count ?? 0}件`,
    );
    const where = await modelWhere(m);
    const groups = (await groupMinPrice(where, "storage")).sort((a, b) => Number(a.key) - Number(b.key));
    med[m] = {};
    for (const g of groups) {
      const gb = Number(g.key);
      const at: Where = { AND: [where, { storage: gb }] };
      const md = g.count >= MIN_COUNT ? await medianPrice(at, g.count) : null;
      if (md) med[m][gb] = md;
      const nj: Where = { AND: [at, NOT_JUNK] };
      const njc = await prisma.deviceInventory.count({ where: nj });
      const njm = njc >= MIN_COUNT ? await medianPrice(nj, njc) : null;
      const w85: Where = { AND: [nj, { batteryHealth: { gte: 85 } }] };
      const a85 = await prisma.deviceInventory.aggregate({ where: w85, _min: { price: true }, _count: { _all: true } });
      const np = applePrice(m, gb);
      console.log(
        `  ${String(gb).padStart(4)}GB ${String(g.count).padStart(4)}件 中央値 ${yen(md)} 最安 ${yen(g.minPrice)}` +
          ` | ジャンク除く ${njc}件 中央値 ${yen(njm)} | 電池85%以上 ${a85._count._all}件 最安 ${yen(a85._min.price)}` +
          (np ? ` | 新品 ${yen(np)}` : "") +
          (gb === r?.medianStorage ? "  ←相場" : ""),
      );
    }
  }

  // Duo 256GB の値段で買える組み合わせ（相場どうし）
  const duo256 = DUO_PRICES[256];
  const mini = IPAD_MINI_A20_PRICES[128];
  console.log(`\n== Duo 256GB ${yen(duo256)} と比べる組み合わせ（新型 mini は Wi-Fi 128GB ${yen(mini)}・中古は相場）`);
  const combos: [string, number][] = [];
  for (const p of IPHONES.slice(0, 3)) {
    const r = market.get(p);
    if (!r) continue;
    combos.push([`新型 mini 128GB ＋ 中古 ${p} ${r.medianStorage}GB`, mini + r.medianPrice]);
    const a17 = market.get("iPad mini (A17 Pro)");
    if (a17) combos.push([`中古 mini A17 Pro ${a17.medianStorage}GB ＋ 中古 ${p} ${r.medianStorage}GB`, a17.medianPrice + r.medianPrice]);
    const m6 = market.get("iPad mini (第6世代)");
    if (m6) combos.push([`中古 mini 第6世代 ${m6.medianStorage}GB ＋ 中古 ${p} ${r.medianStorage}GB`, m6.medianPrice + r.medianPrice]);
  }
  const p18 = applePrice("iPhone 18 Pro Max", 256);
  if (p18) combos.push([`新品 18 Pro Max 256GB ＋ 新型 mini 128GB`, p18 + mini]);
  for (const [label, sum] of combos) console.log(`  ${label}: ${yen(sum)}（Duo との差 ${yen(duo256 - sum)}）`);

  await prisma.$disconnect();
  process.exit(0);
}
main();
