/**
 * 横動画「ブラックフライデー、新品のセールと中古どっちが安い？」の数字。読むだけ（DB に書かない）。
 *   npx tsx longform/2026-11-26-blackfriday/data-query.ts > longform/2026-11-26-blackfriday/data-query.log
 *
 * DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫の行は取らない。
 * 中古の相場＝同じ容量の中央値（ジャンクも入る＝サイトの相場と同じ）。電池・ランクはジャンクを除く。
 * 新品のセール価格は Google ストアの公式（通常価格−値引き。11/19 に商品ページと特集ページで確認）。ゲオは公式のプレスリリース。
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { activeShops } from "@/lib/activeShops";
import { PIXEL_SHOPS, SHOPS } from "@/lib/shops";

type Where = Prisma.DeviceInventoryWhereInput;
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };

/** Google ストア ブラックフライデー（11/20 7:00〜12/3 6:59）。https://store.google.com/jp/magazine/black-friday-deals?hl=ja */
const SALE: { model: string; gb: number; regular: number; off: number; points: number }[] = [
  { model: "Pixel 10a", gb: 128, regular: 92800, off: 13920, points: 0 },
  { model: "Pixel 11", gb: 256, regular: 136800, off: 0, points: 22000 },
  { model: "Pixel 11 Pro", gb: 256, regular: 174800, off: 10000, points: 15000 },
  { model: "Pixel 11 Pro XL", gb: 256, regular: 207800, off: 20000, points: 25000 },
  { model: "Pixel 11 Pro Fold", gb: 256, regular: 279900, off: 0, points: 45000 },
];
/** 1世代前・安い方の中古（同じ容量で並べる） */
const OLDER: { model: string; gb: number }[] = [
  { model: "Pixel 9a", gb: 128 },
  { model: "Pixel 10", gb: 128 },
  { model: "Pixel 10 Pro", gb: 256 },
  { model: "Pixel 10 Pro XL", gb: 256 },
];
/** ゲオ BLACK FRIDAY SALE（11/21〜11/29）の目玉（中古・税込）。https://prtimes.jp/main/html/rd/p/000000270.000141539.html */
const GEO: { model: string; gb: number; price: number }[] = [
  { model: "iPhone 14", gb: 128, price: 52580 },
  { model: "iPhone SE (第3世代)", gb: 64, price: 25080 },
];

const jst = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 9 * 3600000).toISOString().replace("T", " ").slice(0, 16) : "-");
async function stat(where: Where) {
  const a = await prisma.deviceInventory.aggregate({ where, _count: { _all: true }, _min: { price: true } });
  const n = a._count._all;
  return { n, min: a._min.price, median: await medianPrice(where, n) };
}
async function at(model: string, gb: number) {
  const w: Where = { AND: [await modelWhere(model), { storage: gb }] };
  const all = await stat(w);
  const b85 = await stat({ AND: [w, NOT_JUNK, { batteryHealth: { gte: 85 } }] });
  const shops = (await groupMinPrice(w, "shopName")).length;
  return { ...all, b85, shops };
}

async function main() {
  const last = await prisma.deviceInventory.aggregate({ _max: { updatedAt: true } });
  console.log(`集計 ${jst(new Date())} JST`);
  console.log(`在庫の最終更新 ${jst(last._max.updatedAt)} JST`);
  console.log(`Pixel を扱う店（在庫あり） ${(await activeShops(PIXEL_SHOPS)).length}店・iPhone の店 ${(await activeShops(SHOPS)).length}店`);

  console.log("\n## 1 新品のセール vs 中古の相場（同じ容量）");
  for (const s of SALE) {
    const u = await at(s.model, s.gb);
    const sale = s.regular - s.off;
    const d = (u.median ?? 0) - sale;
    console.log(`${s.model} ${s.gb}GB 通常${s.regular} 値引き${s.off} セール${sale} ポイント${s.points} / 中古 ${u.n}件 ${u.shops}店 中${u.median} 安${u.min} / 中古−セール ${d}（${d > 0 ? "新品が安い" : "中古が安い"}）・ポイントを引くと ${d + s.points} / 電池85%以上 ${u.b85.n}件 中${u.b85.median}`);
  }

  console.log("\n## 2 1世代前・安い方の中古");
  for (const o of OLDER) {
    const u = await at(o.model, o.gb);
    console.log(`${o.model} ${o.gb}GB 中古 ${u.n}件 ${u.shops}店 中${u.median} 安${u.min} / 電池85%以上 ${u.b85.n}件 中${u.b85.median}`);
  }

  console.log("\n## 3 ゲオの目玉と、ふだんの相場（同じ容量）");
  for (const g of GEO) {
    const u = await at(g.model, g.gb);
    console.log(`${g.model} ${g.gb}GB ゲオ目玉 ${g.price} / 相場 ${u.n}件 中${u.median} 安${u.min} / 差 ${(u.median ?? 0) - g.price}`);
  }
  const geo = await stat({ shopName: { contains: "ゲオ" } });
  console.log(`ゲオの在庫（楽天のゲオ店・セール対象かは記載なし） ${geo.n}件`);
  await prisma.$disconnect();
}
main();
