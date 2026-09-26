/**
 * 当日の価格推移を記録する。スクレイピング完了後に GitHub Actions から実行する
 *   npx tsx scripts/snapshot-prices.ts
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { jstToday, recordPriceSnapshots } from "@/lib/priceHistory";

async function main() {
  const date = jstToday();
  const written = await recordPriceSnapshots(date);
  console.log(`価格推移を記録しました: ${date.toISOString().slice(0, 10)} / ${written} 件`);
}

main()
  .catch((error) => {
    console.error("価格推移の記録に失敗しました:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
