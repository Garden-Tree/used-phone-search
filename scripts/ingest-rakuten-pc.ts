/**
 * 楽天市場店（ソフマップ・じゃんぱら・イオシス）の中古ノートパソコンを PcInventory に取り込む（2026-10-27〜）。
 * シンレンタルサーバーの rakuten-sync/fetch.php が置いた <shopCode>-pc.json.gz を、scripts/ci-deploy.sh fetch-rakuten が取ってきてから実行する:
 *   npx tsx scripts/ingest-rakuten-pc.ts <ディレクトリ> [--dry] [--allow-shrink] [--allow-old]
 *   --dry … 取り込まずに、読めた件数・読めなかった商品名の例を出す
 * 読み取りは lib/rakutenPc.ts。店ごとに洗い替える（PcInventory の shopName の行だけ）。
 * 安全装置はスマホの取り込み（lib/rakutenIngest.ts）と同じ考え方: 前回の半分未満なら中止・7時間より古いファイルと前回取り込んだファイルは取り込まない
 */
import "dotenv/config";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import prisma from "@/lib/prisma";
import { RAKUTEN_PC_SHOPS } from "@/lib/rakutenPc";
import type { RakutenItem } from "@/lib/rakutenCommon";

const MAX_AGE_HOURS = 7;

async function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  const dry = args.includes("--dry");
  const allowShrink = args.includes("--allow-shrink");
  const allowOld = args.includes("--allow-old");
  if (!dir) throw new Error("使い方: tsx scripts/ingest-rakuten-pc.ts <ディレクトリ> [--dry] [--allow-shrink] [--allow-old]");

  let failed = 0;
  for (const [shopCode, shop] of Object.entries(RAKUTEN_PC_SHOPS)) {
    const file = join(dir, `${shopCode}-pc.json.gz`);
    if (!existsSync(file)) {
      // fetch.php の PC の取得が始まる前（〜10/27）や、PC だけ取れなかった回。スマホの取り込みには関係ないので警告だけ
      console.warn(`${shopCode}: ${file} がない`);
      continue;
    }
    const mtime = statSync(file).mtimeMs;
    const ageHours = (Date.now() - mtime) / 3_600_000;
    if (!dry && !allowOld && ageHours > MAX_AGE_HOURS) {
      console.warn(`${shopCode}: ファイルが ${ageHours.toFixed(1)} 時間前のもの。取り込まない`);
      continue;
    }
    try {
      const items: RakutenItem[] = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")).items;
      if (!Array.isArray(items)) throw new Error("items is not an array");
      const rows = items.map(shop.normalize).filter((r): r is NonNullable<typeof r> => r !== null);
      // 同じ商品 URL は1行に
      const unique = [...new Map(rows.map((r) => [r.url, r])).values()];
      console.log(`${shopCode}: ${items.length} 件中 ${unique.length} 件を読めた`);
      if (dry) {
        const missed = items.filter((i) => !rows.some((r) => r.url === i.url)).slice(0, 15);
        for (const m of missed) console.log(`  読めない: ${m.name.slice(0, 120)}${m.spec ? ` | ${m.spec.slice(0, 80)}` : ""}`);
        for (const r of unique.slice(0, 5)) console.log(`  例: ${r.productName} | ${r.cpu} | ${r.memoryGB}GB ${r.storageType} ${r.storageGB}GB | ${r.screenInch ?? "-"}型 | ${r.conditionRank} | ${r.price}円`);
        continue;
      }
      const last = await prisma.pcInventory.aggregate({ where: { shopName: shop.shopName }, _max: { updatedAt: true }, _count: { _all: true } });
      if (!allowOld && last._max.updatedAt && mtime <= last._max.updatedAt.getTime()) {
        console.warn(`${shopCode}: 前回取り込んだファイル。次の回に取り込む`);
        continue;
      }
      const existing = last._count._all;
      if (!allowShrink && existing >= 20 && unique.length < existing * 0.5) {
        console.error(`${shopCode}: ${unique.length} 件が前回 ${existing} 件の半分未満のため中止（--allow-shrink で取り込める）`);
        failed++;
        continue;
      }
      await prisma.$transaction([
        prisma.pcInventory.deleteMany({ where: { shopName: shop.shopName } }),
        prisma.pcInventory.createMany({ data: unique }),
      ]);
      console.log(`${shopCode}: ${shop.shopName} を ${unique.length} 件に洗い替えた（前回 ${existing} 件）`);
    } catch (error) {
      console.error(`${shopCode}: ${String(error)}`);
      failed++;
    }
  }
  await prisma.$disconnect();
  if (failed > 0) process.exitCode = 1;
}

main();
