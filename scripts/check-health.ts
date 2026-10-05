/**
 * データ更新の監視（GitHub Actions のビルド前に実行）。問題があれば一覧を出して終了コード 1 にする
 * （Actions の失敗通知で気づける。サイトの書き出し・配置はそのまま続ける）
 */
import "dotenv/config";
import { checkHealth } from "@/lib/health";
import prisma from "@/lib/prisma";

async function main() {
  const report = await checkHealth();
  for (const s of report.shops ?? []) {
    console.log(`${s.shop}: ${s.count}件 / ${s.ageHours ?? "?"}時間前 ${JSON.stringify(s.devices)}`);
  }
  console.log(`価格推移の最終記録日: ${report.lastPriceSnapshot ?? "-"}`);
  if (!report.ok) {
    console.error("問題あり:\n" + report.problems.map((p) => `- ${p}`).join("\n"));
    process.exitCode = 1;
  }
  await prisma.$disconnect();
}

main();
