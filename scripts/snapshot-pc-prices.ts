/**
 * 中古パソコンの当日の相場を記録する（CPU × メモリごと。2026-10-27〜）。GitHub Actions で中古パソコンの取得の後に実行する
 *   npx tsx scripts/snapshot-pc-prices.ts
 * 同じ日に何度実行しても上書きされるだけ。表は数百件なので、在庫を読んで手元で集計する（lib/pcInventory.ts の cpuMemoryMatrix と同じ集計）
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { jstToday } from "@/lib/priceHistory";
import { cpuMemoryMatrix, getPcItems } from "@/lib/pcInventory";

async function main() {
  const date = jstToday();
  const items = await getPcItems();
  let written = 0;
  for (const formFactor of ["note", "desktop"]) {
    // 1件の条件も残す（推移は件数と一緒に見る）
    const m = cpuMemoryMatrix(items, formFactor, 1);
    for (const row of m.rows) {
      for (const [memoryGB, c] of row.cells) {
        await prisma.pcPriceSnapshot.upsert({
          where: { date_formFactor_cpuLabel_memoryGB: { date, formFactor, cpuLabel: row.label, memoryGB } },
          create: { date, formFactor, cpuLabel: row.label, memoryGB, minPrice: c.minPrice, medianPrice: c.medianPrice, count: c.count },
          update: { minPrice: c.minPrice, medianPrice: c.medianPrice, count: c.count },
        });
        written++;
      }
    }
  }
  console.log(`中古パソコンの相場を記録しました: ${date.toISOString().slice(0, 10)} / ${written} 件`);
}

main()
  .catch((error) => {
    console.error("中古パソコンの相場の記録に失敗しました:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
