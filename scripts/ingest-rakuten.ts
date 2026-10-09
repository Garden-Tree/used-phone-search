/**
 * 楽天市場店の在庫を取り込む（静的書き出し版）。
 * シンレンタルサーバーの rakuten-sync/fetch.php（output_dir を設定したとき）が書き出した <shopCode>.json.gz を、
 * GitHub Actions が SSH で取ってきてから実行する:
 *   npx tsx scripts/ingest-rakuten.ts <ディレクトリ> [--allow-shrink] [--allow-old] [--family yahoo]
 *   --allow-shrink … 件数が前回の半分未満でも洗い替える（安全装置を外す。品切れが本当に多いときだけ）
 *   --allow-old    … 前回取り込んだファイル・7時間より古いファイルも取り込む
 *   --family amazon … Amazon 整備済み品（AMAZON_SHOPS。ディレクトリは scripts/fetch-amazon.ts の出力 amazon.json.gz）。
 *                    Amazon の価格は24時間を超えて出せないので、ファイルが20時間より古いときは取り込まず、Amazon の在庫を売り切れ扱いにして隠す
 *   --family yahoo … 楽天（RAKUTEN_SHOPS）の代わりに Yahoo!ショッピングの店（YAHOO_SHOPS）を取り込む。
 *                    ディレクトリは scripts/fetch-yahoo.ts の出力（<ストアID>.json.gz）。洗い替え・安全装置・前回ファイルの判定は同じ
 * 1ショップの失敗で他を止めない。前回取り込んだファイル（fetch.php の取得がまだ終わっていない回）は警告だけで、失敗にはしない
 * （止まったことは /health.json の24時間判定で気づく）
 */
import "dotenv/config";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { replaceRakutenShop, shopsOf, type ShopFamily } from "@/lib/rakutenIngest";
import type { RakutenItem } from "@/lib/rakutenShops";
import prisma from "@/lib/prisma";

// fetch.php は6時間ごと。これより古いファイルは前回分なので取り込まない
const MAX_AGE_HOURS = 7;
// Amazon の価格は24時間を超えて表示できない（Creators API の規約）。ビルドまでの時間を見込んで20時間
const AMAZON_MAX_AGE_HOURS = 20;

/** Amazon の在庫のうち、最後の取り込みが20時間より前のものを売り切れ扱いにして隠す（価格は24時間を超えて出せない）。新しい行は触らない */
async function hideStaleAmazon(shopName: string) {
  const before = new Date(Date.now() - AMAZON_MAX_AGE_HOURS * 3_600_000);
  const hidden = await prisma.deviceInventory.updateMany({ where: { shopName, isSoldOut: false, updatedAt: { lt: before } }, data: { isSoldOut: true } });
  if (hidden.count > 0) console.error(`${shopName}: 古い Amazon の在庫 ${hidden.count} 件を隠した`);
}

async function main() {
  const args = process.argv.slice(2);
  const familyIndex = args.indexOf("--family");
  const familyArg = familyIndex >= 0 ? args[familyIndex + 1] : "";
  const family: ShopFamily = familyArg === "yahoo" ? "yahoo" : familyArg === "amazon" ? "amazon" : "rakuten";
  // --family がないとき familyIndex は -1 なので、先頭の引数を除外しないようにする（10/9 朝に3回失敗した原因）
  const dir = args.find((a, i) => !a.startsWith("--") && !(familyIndex >= 0 && i === familyIndex + 1));
  const SHOPS = shopsOf(family);
  const allowShrink = process.argv.includes("--allow-shrink");
  const allowOld = process.argv.includes("--allow-old");
  if (!dir) throw new Error("使い方: tsx scripts/ingest-rakuten.ts <ディレクトリ> [--allow-shrink] [--allow-old] [--family yahoo|amazon]");

  let failed = 0;
  for (const shopCode of Object.keys(SHOPS)) {
    const file = join(dir, `${shopCode}.json.gz`);
    if (!existsSync(file)) {
      // Actions の実行環境にはファイルが残らないので、fetch-amazon.ts が失敗した回は「ファイルがない」になる。
      // Amazon はこのとき、最後の取り込みが20時間より前なら在庫を隠す
      if (family === "amazon" && !allowOld) await hideStaleAmazon(SHOPS[shopCode].shopName);
      console.error(`${shopCode}: ${file} がない`);
      failed++;
      continue;
    }
    const ageHours = (Date.now() - statSync(file).mtimeMs) / 3_600_000;
    if (family === "amazon" && !allowOld && ageHours > AMAZON_MAX_AGE_HOURS) {
      // 古い価格を出し続けないよう、取り込まずに売り切れ扱いにする（次に取得が成功した回の取り込みで置き換わる）
      console.error(`${shopCode}: ファイルが ${ageHours.toFixed(1)} 時間前のもの（fetch-amazon.ts が失敗している）。取り込まない`);
      await hideStaleAmazon(SHOPS[shopCode].shopName);
      failed++;
      continue;
    }
    if (family !== "amazon" && !allowOld && ageHours > MAX_AGE_HOURS) {
      console.error(`${shopCode}: ファイルが ${ageHours.toFixed(1)} 時間前のもの（fetch.php・fetch-yahoo.ts が失敗している）。取り込まない`);
      failed++;
      continue;
    }
    // fetch.php の取得中（約25分）に Actions が始まると、前回取り込んだファイルが残っている。
    // その店の在庫の最終更新より古いファイルは取り込まない（取り込むと更新日時だけ新しくなり、監視が気づかない）
    // 1つのショップ名を複数の店で分け合うとき（ニューズドテック）は、この店の商品 URL の行で見る
    // （ショップ名で見ると、同じ回に先に取り込んだもう1店の更新日時でこの店のファイルが「前回の分」に見える）
    const shop = SHOPS[shopCode];
    const last = await prisma.deviceInventory.aggregate({
      where: shop.sharedShopName
        ? { shopName: shop.shopName, url: { startsWith: `https://item.rakuten.co.jp/${shopCode}/` } }
        : { shopName: shop.shopName },
      _max: { updatedAt: true },
    });
    if (!allowOld && last._max.updatedAt && statSync(file).mtimeMs <= last._max.updatedAt.getTime()) {
      console.warn(`${shopCode}: 前回取り込んだファイル（${new Date(statSync(file).mtimeMs).toISOString()}）。次の回に取り込む`);
      continue;
    }
    try {
      const items: RakutenItem[] = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")).items;
      if (!Array.isArray(items)) throw new Error("items is not an array");
      const result = await replaceRakutenShop(shopCode, items, allowShrink, family);
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
