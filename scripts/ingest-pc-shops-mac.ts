/**
 * 中古パソコン専門店（PC WRAP・Qualit）の MacBook を DeviceInventory に取り込む（/mac のページに出る。2026-10-27〜）
 *   npx tsx scripts/ingest-pc-shops-mac.ts          # 取り込む（前回から11時間たっていない店は飛ばす。FORCE_PC=1 で無視）
 *   npx tsx scripts/ingest-pc-shops-mac.ts --dry    # 取り込まずに件数と先頭を出す
 *
 * - 店の一覧ページだけを2秒おきに1本ずつ読む（Windows の取得 scraper/pcwrap_scraper.py・qualit_scraper.py と同じ決まり。商品ページ・画像・説明文は使わない）
 * - 機種名・メモリ・SSD は楽天の MacBook と同じ読み取り（lib/macCatalog.ts の canonicalMacModel・parseMacSpec）。Intel 搭載機は落ちる
 * - 訳あり品（PC WRAP は動作に不具合・保証なし、Qualit は外観がランク外）は取り込まない
 * - ランクは scraper/pc_spec.py と同じ対応（PC WRAP 美麗＝A・特選＝B・標準＝C、Qualit は表記の S/A/B/C）
 * - リンクは A8（lib/affiliate.ts。店名で決まる）。店の情報（保証）は lib/shops.ts の MAC_ONLY_SHOPS
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { canonicalMacModel, parseMacSpec } from "@/lib/macCatalog";

type Row = Prisma.DeviceInventoryCreateManyInput;

const DRY = process.argv.includes("--dry");
const MIN_HOURS = 11;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, encoding = "utf-8"): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return new TextDecoder(encoding).decode(await res.arrayBuffer());
}

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();

function row(shopName: string, title: string, conditionRank: string, price: number, url: string): Row | null {
  const modelName = canonicalMacModel(title);
  const { memoryGB, ssdGB } = parseMacSpec(title);
  if (!modelName || memoryGB === null || ssdGB === null || !(price > 0)) return null;
  return {
    manufacturer: "Apple", modelName, storage: ssdGB, memoryGB, color: "-", conditionRank, batteryHealth: null,
    networkStatus: null, simUnlocked: false, carrier: null, shopName, price, url, isSoldOut: false,
  };
}

// PC WRAP: ノートで OS が Mac（os=42）・在庫あり。16件ずつ
const PCWRAP_RANKS: [string, string][] = [["美麗", "A"], ["特選", "B"], ["標準", "C"]];
async function pcwrap(): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 0; page < 20; page++) {
    const html = await get(`https://www.pcwrap.com/item/index/?category1=2&os=42&nojunk=true&stock_min=1&o=${page * 16}`);
    const lis = [...html.matchAll(/<li style="text-align: center;">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
    for (const li of lis) {
      const href = li.match(/href="\/?(item\/detail\/\d+)"/);
      const price = li.match(/￥([\d,]+)/);
      const specs = [...li.matchAll(/<span class="subspec">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
      const joined = specs.join(" / ");
      const rank = PCWRAP_RANKS.find(([k]) => joined.includes(`状態ランク:${k}`))?.[1];
      const fam = (specs[1] ?? "").match(/MACBOOK\s*(AIR|PRO)/i);
      const chip = joined.match(/APPLE\s+M([1-5])(?:\s+(PRO|MAX))?/i);
      const inch = joined.match(/(\d{2}(?:\.\d)?)\s*インチ/);
      const spec = joined.match(/メモリ\s*(\d+)GB\s*SSD\s*(\d+)(GB|TB)/);
      if (!href || !price || !rank || !fam || !chip || !inch || !spec) continue;
      const chipName = `M${chip[1]}${chip[2] ? ` ${chip[2][0]}${chip[2].slice(1).toLowerCase()}` : ""}`;
      const famName = fam[1].toUpperCase() === "AIR" ? "Air" : "Pro";
      const title = `MacBook ${famName} ${Math.floor(Number(inch[1]))}インチ ${chipName} ${spec[1]}GB/${spec[2]}${spec[3]}`;
      const r = row("PC WRAP", title, rank, Number(price[1].replace(/,/g, "")), `https://www.pcwrap.com/${href[1]}`);
      if (r) rows.push(r);
    }
    console.log(`[PC WRAP] o=${page * 16}: ${lis.length} 件中 ${rows.length} 件（累計）`);
    if (lis.length < 16) break;
    await sleep(2000);
  }
  return rows;
}

// Qualit: MacBook（ct25・EUC-JP）。売り切れが後ろにまとまるので、在庫のある商品がないページで止める
async function qualit(): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 1; page <= 10; page++) {
    const html = await get(`https://www.yrl-qualit.com/shopbrand/ct25/page${page}/recommend/`, "euc-jp");
    const items = [...html.matchAll(/<p class="name"><a href="(\/shopdetail\/\d+)\/[^"]*">([\s\S]*?)<\/a><\/p>([\s\S]*?)<em class="price">([\d,]+)<\/em>/g)];
    let inStock = 0;
    for (const [, path, rawTitle, rest, price] of items) {
      if (/売り切れ|SOLD ?OUT|品切れ/i.test(rest)) continue;
      inStock++;
      const title = text(rawTitle);
      const rank = title.match(/\[([SABC]):[^\]]+\]/)?.[1];
      if (!rank) continue; // 訳あり品・ランクの読めないもの
      const r = row("Qualit", title, rank, Number(price.replace(/,/g, "")), `https://www.yrl-qualit.com${path}/`);
      if (r) rows.push(r);
    }
    console.log(`[Qualit] page ${page}: ${items.length} 件（在庫あり ${inStock}）→ 累計 ${rows.length} 件`);
    if (items.length === 0 || inStock === 0) break;
    await sleep(2000);
  }
  return rows;
}

async function recentlyUpdated(shopName: string): Promise<boolean> {
  if (process.env.FORCE_PC === "1") return false;
  const r = await prisma.deviceInventory.aggregate({ where: { shopName }, _max: { updatedAt: true } });
  const last = r._max.updatedAt;
  return !!last && Date.now() - last.getTime() < MIN_HOURS * 3600 * 1000;
}

async function replace(shopName: string, rows: Row[]) {
  const existing = await prisma.deviceInventory.count({ where: { shopName } });
  // 取得が途中で切れたときに在庫を消さない（スクレイパーの洗い替えと同じ: 既存20件以上で半分未満なら止める）
  if (existing >= 20 && rows.length < existing * 0.5 && process.env.FORCE_REPLACE !== "1") {
    throw new Error(`[${shopName}] 取得 ${rows.length} 件が既存 ${existing} 件の半分未満のため中止`);
  }
  await prisma.$transaction([prisma.deviceInventory.deleteMany({ where: { shopName } }), prisma.deviceInventory.createMany({ data: rows })]);
  console.log(`[${shopName}] MacBook ${rows.length} 件を取り込みました`);
}

async function main() {
  let failed = false;
  for (const [shopName, scrape] of [["PC WRAP", pcwrap], ["Qualit", qualit]] as const) {
    try {
      if (!DRY && (await recentlyUpdated(shopName))) {
        console.log(`[${shopName}] 前回から ${MIN_HOURS} 時間たっていないので飛ばします`);
        continue;
      }
      const rows = await scrape();
      if (DRY) {
        rows.slice(0, 10).forEach((r) => console.log(r.modelName, r.memoryGB, r.storage, r.conditionRank, r.price, r.url));
        console.log(`[${shopName}] ${rows.length} 件（--dry: 取り込みなし）`);
        continue;
      }
      if (rows.length === 0) throw new Error(`[${shopName}] 0件`);
      await replace(shopName, rows);
    } catch (e) {
      console.error(e);
      failed = true;
    }
  }
  if (failed) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
