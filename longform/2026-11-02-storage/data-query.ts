/**
 * 横動画「中古iPhone、128GBで足りる？」の数字（読むだけ。DB は groupBy・count と、中央値の1行だけ。findMany で在庫の行は取らない）
 *
 * - 機種ごとに容量別の件数・最安（groupMinPrice）と中央値（medianPrice・在庫5件以上の容量だけ）。ジャンクも含む（サイトの相場と同じ数え方）
 * - 128→256GB・256→512GB の中古の相場の差
 * - 買取価格（表 BuybackPrice・週1回・約1,400行の小さい表。lib/buybackPrices.ts と同じく機種ごとに必要な行だけ）: 3店の「きれいな状態」の最高値を容量ごとに
 * - 新品の差は lib/applePrices.ts（Apple 公式で確かめた値）だけ
 * - iPhone 全体の容量の内訳（groupBy storage）
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { activeShops } from "@/lib/activeShops";
import { applePrice, applePriceStorages, APPLE_PRICES_CHECKED } from "@/lib/applePrices";
import { BUYBACK_SHOPS } from "@/lib/buybackPrices";

const MODELS = [
  "iPhone SE (第3世代)", "iPhone 13", "iPhone 13 Pro", "iPhone 14", "iPhone 14 Pro", "iPhone 15", "iPhone 15 Pro",
  "iPhone 16e", "iPhone 16", "iPhone 16 Pro", "iPhone 17e", "iPhone 17", "iPhone 17 Pro",
];
const MIN = 5;
const GOOD = BUYBACK_SHOPS.map((s) => ({ shopName: s.name, grade: s.good }));

async function main() {
  console.log(`集計 ${new Date().toISOString()}`);
  const shops = await activeShops();
  console.log(`店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);

  const iphone = { isSoldOut: false, modelName: { startsWith: "iPhone" } };
  const total = await prisma.deviceInventory.count({ where: iphone });
  const bySt = await prisma.deviceInventory.groupBy({ by: ["storage"], where: iphone, _count: { _all: true } });
  console.log(`\niPhone 在庫 ${total}`);
  for (const r of bySt.sort((a, b) => a.storage - b.storage)) {
    console.log(`  ${r.storage}GB: ${r._count._all}件 ${((r._count._all / total) * 100).toFixed(1)}%`);
  }

  console.log(`\n新品（Apple 公式・${APPLE_PRICES_CHECKED} 確認）`);
  for (const m of ["iPhone 16", "iPhone 17e", "iPhone 17", "iPhone Air", "iPhone 18 Pro"]) {
    const st = applePriceStorages(m);
    console.log(`  ${m}: ${st.map((g) => `${g}GB ${applePrice(m, g)}`).join(" / ")}`);
  }

  for (const m of MODELS) {
    const where = await modelWhere(m);
    const groups = (await groupMinPrice(where, "storage")).sort((a, b) => Number(a.key) - Number(b.key));
    const med: Record<number, number | null> = {};
    const parts: string[] = [];
    for (const g of groups) {
      const gb = Number(g.key);
      med[gb] = g.count >= MIN ? await medianPrice({ AND: [where, { storage: gb }] }, g.count) : null;
      parts.push(`${gb}GB ${g.count}件 中央${med[gb] ?? "-"} 最安${g.minPrice}`);
    }
    console.log(`\n== ${m}`);
    console.log(`  ${parts.join(" / ")}`);
    const gap = (a: number, b: number) => (med[a] && med[b] ? `${a}→${b} +${med[b]! - med[a]!}（+${(((med[b]! - med[a]!) / med[a]!) * 100).toFixed(1)}%）` : null);
    console.log(`  差: ${[gap(64, 128), gap(128, 256), gap(256, 512)].filter(Boolean).join(" / ") || "-"}`);

    // 買取（きれいな状態の最高値）
    const bb = await prisma.buybackPrice.findMany({ where: { model: m, OR: GOOD }, select: { storage: true, shopName: true, price: true, updatedAt: true } });
    if (bb.length) {
      const sts = [...new Set(bb.map((r) => r.storage))].sort((a, b) => a - b);
      const best = sts.map((s) => {
        const rows = bb.filter((r) => r.storage === s).sort((a, b) => b.price - a.price);
        return `${s}GB ${rows[0].price}（${rows[0].shopName}）[${rows.map((r) => `${r.shopName}${r.price}`).join(" ")}]`;
      });
      const upd = bb.reduce((a, r) => (r.updatedAt > a ? r.updatedAt : a), bb[0].updatedAt);
      console.log(`  買取: ${best.join(" / ")}  更新 ${upd.toISOString().slice(0, 10)}`);
    }
  }
  await prisma.$disconnect();
  process.exit(0);
}
main();
