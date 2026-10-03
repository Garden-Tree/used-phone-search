/**
 * 楽天市場店の在庫を取り込む（静的書き出し版）。
 * シンレンタルサーバーの rakuten-sync/fetch.php（output_dir を設定したとき）が書き出した <shopCode>.json.gz を、
 * GitHub Actions が SSH で取ってきてから実行する:
 *   npx tsx scripts/ingest-rakuten.ts <ディレクトリ> [--allow-shrink] [--allow-old]
 *   --allow-shrink … 件数が前回の半分未満でも洗い替える（安全装置を外す。品切れが本当に多いときだけ）
 *   --allow-old    … 前回取り込んだファイル・7時間より古いファイルも取り込む
 * 1ショップの失敗で他を止めない。前回取り込んだファイル（fetch.php の取得がまだ終わっていない回）は警告だけで、失敗にはしない
 * （止まったことは /health.json の24時間判定で気づく）
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
  const allowShrink = process.argv.includes("--allow-shrink");
  const allowOld = process.argv.includes("--allow-old");
  if (!dir) throw new Error("使い方: tsx scripts/ingest-rakuten.ts <ディレクトリ> [--allow-shrink] [--allow-old]");

  let failed = 0;
  for (const shopCode of Object.keys(RAKUTEN_SHOPS)) {
    const file = join(dir, `${shopCode}.json.gz`);
    if (!existsSync(file)) {
      console.error(`${shopCode}: ${file} がない`);
      failed++;
      continue;
    }
    const ageHours = (Date.now() - statSync(file).mtimeMs) / 3_600_000;
    if (!allowOld && ageHours > MAX_AGE_HOURS) {
      console.error(`${shopCode}: ファイルが ${ageHours.toFixed(1)} 時間前のもの（fetch.php が失敗している）。取り込まない`);
      failed++;
      continue;
    }
    // fetch.php の取得中（約25分）に Actions が始まると、前回取り込んだファイルが残っている。
    // その店の在庫の最終更新より古いファイルは取り込まない（取り込むと更新日時だけ新しくなり、監視が気づかない）
    const last = await prisma.deviceInventory.aggregate({
      where: { shopName: RAKUTEN_SHOPS[shopCode].shopName },
      _max: { updatedAt: true },
    });
    if (!allowOld && last._max.updatedAt && statSync(file).mtimeMs <= last._max.updatedAt.getTime()) {
      console.warn(`${shopCode}: 前回取り込んだファイル（${new Date(statSync(file).mtimeMs).toISOString()}）。次の回に取り込む`);
      continue;
    }
    try {
      const items: RakutenItem[] = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")).items;
      if (!Array.isArray(items)) throw new Error("items is not an array");
      const result = await replaceRakutenShop(shopCode, items, allowShrink);
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
