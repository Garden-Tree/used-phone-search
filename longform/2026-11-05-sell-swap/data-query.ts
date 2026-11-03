/**
 * 横動画「iPhoneを売って買い替えると、実質いくら？」の数字（読むだけ。買取の表は機種ごとの行だけ・在庫は件数と中央値の1行だけ。findMany で在庫の行は取らない）
 *
 * - 買取（表 BuybackPrice・週1回）: 3店の「きれいな状態」の容量ごとの値段・いちばん高い店・店の差（lib/buybackPrices.ts と同じ）
 * - 買い替え: 1つ上・2つ上の世代（lib/nextGeneration.ts）の同じ容量の中古の相場（中央値・在庫5件以上）− いちばん高い売値
 * - 買い直し: 同じ機種・同じ容量の中古の相場 − 売値（店の取り分の目安）
 * - 買取の更新日
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { getModelBuyback } from "@/lib/buybackPrices";
import { getMedianAt } from "@/lib/modelStats";
import { nextGeneration } from "@/lib/nextGeneration";
import { activeShops } from "@/lib/activeShops";

const MODELS = [
  "iPhone 11", "iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16",
  "iPhone 12 Pro", "iPhone 13 Pro", "iPhone 14 Pro", "iPhone 15 Pro",
  "iPhone SE (第2世代)", "iPhone 13 mini",
];
const MIN = 5;

async function main() {
  console.log(`集計 ${new Date().toISOString()}`);
  const shops = await activeShops();
  console.log(`店 ${shops.length}`);
  const upd = await prisma.buybackPrice.aggregate({ _max: { updatedAt: true }, _min: { updatedAt: true } });
  console.log(`買取の更新 ${upd._min.updatedAt?.toISOString()} 〜 ${upd._max.updatedAt?.toISOString()}`);

  for (const model of MODELS) {
    const rows = await getModelBuyback(model);
    if (rows.length === 0) { console.log(`\n${model}: 買取なし`); continue; }
    console.log(`\n■ ${model}`);
    for (const r of rows) {
      const prices = r.cells.map((c) => c.price);
      const spread = prices.length > 1 ? Math.max(...prices) - Math.min(...prices) : 0;
      const rebuy = await getMedianAt(model, r.storage);
      const line = [`  ${r.storage}GB 買取 ${r.cells.map((c) => `${c.shop}${c.price}`).join(" ")} 最高 ${r.best?.shop}${r.best?.price} 店の差 ${spread}`];
      if (rebuy.count >= MIN && rebuy.median !== null && r.best) line.push(`買い直し ${rebuy.median}（${rebuy.count}件）取り分 ${rebuy.median - r.best.price}`);
      let m = nextGeneration(model);
      for (let k = 1; m && k <= 2 && r.best; k++, m = nextGeneration(m)) {
        const at = await getMedianAt(m, r.storage);
        if (at.count >= MIN && at.median !== null) line.push(`${k}つ上 ${m} ${at.median}（${at.count}件）足す ${at.median - r.best.price}`);
      }
      console.log(line.join(" / "));
    }
  }
  process.exit(0);
}
main();
