/**
 * X の返信・投稿に使う相場をいまの在庫から引く（DB 側で集計。全件は取らない）
 *   npx tsx scripts/x-price.ts "iPhone 15" "iPhone 13 mini" "Pixel 8a"
 * 相場＝在庫がいちばん多い容量の中央値。新品は公式で確かめた値（lib/applePrices.ts・lib/officialPrices.ts）
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { getModelMarket } from "@/lib/marketStats";
import { applePrice } from "@/lib/applePrices";
import { officialPrice } from "@/lib/officialPrices";

const man = (v: number) => `${(Math.round(v / 1000) / 10).toFixed(1)}万円`;
const models = process.argv.slice(2);
if (!models.length) {
  console.error('使い方: npx tsx scripts/x-price.ts "iPhone 15" "Pixel 8a"');
  process.exit(1);
}

getModelMarket(models)
  .then((m) => {
    for (const k of models) {
      const r = m.get(k);
      if (!r) {
        console.log(`${k}: 在庫なし（機種名の表記を確かめる）`);
        continue;
      }
      const cap = r.medianStorage ? `${r.medianStorage}GB` : "容量不明";
      const np = r.medianStorage ? (applePrice(k, r.medianStorage) ?? officialPrice(k, r.medianStorage)) : null;
      console.log(
        `${k}: 最安 ${r.minPrice.toLocaleString()}円（${man(r.minPrice)}）／相場（${cap}）${r.medianPrice.toLocaleString()}円（約${man(r.medianPrice)}）／${r.count.toLocaleString()}件` +
          (np ? `／新品（公式・${cap}）${np.toLocaleString()}円` : ""),
      );
    }
  })
  .finally(() => prisma.$disconnect());
