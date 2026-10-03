/**
 * 楽天市場店の在庫を取り込む（静的書き出し版）。
 * シンレンタルサーバーの rakuten-sync/fetch.php（output_dir を設定したとき）が書き出した <shopCode>.json.gz を、
 * GitHub Actions が SSH で取ってきてから実行する:
 *   npx tsx scripts/ingest-rakuten.ts <ディレクトリ> [--force]
 * ファイルが古い（前回の取り込みに使ったもの）ときは取り込まない。1ショップの失敗で他を止めない
 */
import "dotenv/config";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { replaceRakutenShop } from "@/lib/rakutenIngest";
import { RAKUTEN_SHOPS, type RakutenItem } from "@/lib/rakutenShops";
import prisma from "@/lib/prisma";

// fetch.php は6時間ごと。これより古いファイルは前回分なので取り込まない
const MAX_AGE_HOURS = 7;

async function main() {
  const dir = process.argv[2];
  const force = process.argv.includes("--force");
  if (!dir) throw new Error("使い方: tsx scripts/ingest-rakuten.ts <ディレクトリ> [--force]");

  let failed = 0;
  for (const shopCode of Object.keys(RAKUTEN_SHOPS)) {
    const file = join(dir, `${shopCode}.json.gz`);
    if (!existsSync(file)) {
      console.error(`${shopCode}: ${file} がない`);
      failed++;
      continue;
    }
    const ageHours = (Date.now() - statSync(file).mtimeMs) / 3_600_000;
    if (ageHours > MAX_AGE_HOURS) {
      console.error(`${shopCode}: ファイルが ${ageHours.toFixed(1)} 時間前のもの（fetch.php が失敗している）。取り込まない`);
      failed++;
      continue;
    }
    try {
      const items: RakutenItem[] = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")).items;
      if (!Array.isArray(items)) throw new Error("items is not an array");
      const result = await replaceRakutenShop(shopCode, items, force);
      console.log(`${shopCode}: ${JSON.stringify(result)}`);
      if (!result.ok) failed++;
    } catch (error) {
      console.error(`${shopCode}: ${String(error)}`);
      failed++;
    }
  }
  await prisma.$disconnect();
  if (failed > 0) process.exitCode = 1;
}

main();
