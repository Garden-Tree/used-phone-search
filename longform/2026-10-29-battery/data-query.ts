/**
 * 横動画10本目「中古iPhoneのバッテリー、何%なら買っていい？」の数字（読むだけ。DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫の行は取らない）
 *
 * 電池の帯: 100 / 95〜99 / 90〜94 / 85〜89 / 80〜84 / 80%以上（ざっくり）/ 80%未満 / 数字なし
 * - lib/shops.ts の battery が over80 の店は「80%以上」を 80、「80%未満」を 79、未使用品を 100 で入れている。
 *   80〜84 には over80 の店の 80 を入れず、「80%以上（ざっくり）」として分ける（79 は 80%未満に入れてよい）
 * - ジャンク（J・ジャンク）は除く
 * - 比べる容量は、その機種でいちばん在庫が多い容量（サイトの相場と同じ決め方）。ただし SE (第3世代)・12 は 64GB がいちばん多いので、
 *   7本目の「64GBは選ばない」とそろえて 128GB（STORAGE）
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { activeShops } from "@/lib/activeShops";
import { ALIAS_SHOPS, SHOPS, findShop, type Shop } from "@/lib/shops";
import { appleRepair } from "@/lib/appleRepairPrices";

type Where = Prisma.DeviceInventoryWhereInput;
type Kind = Shop["battery"];

const MODELS = [
  "iPhone SE (第3世代)", "iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16", "iPhone 13 Pro", "iPhone 15 Pro",
];
/** いちばん多い容量の代わりに使う容量 */
const STORAGE: Record<string, number> = { "iPhone SE (第3世代)": 128, "iPhone 12": 128 };
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
const KINDS: Kind[] = ["exact", "over80", "none"];
const namesOf = (k: Kind) => [...SHOPS, ...ALIAS_SHOPS].filter((s) => s.battery === k).map((s) => s.name);
const OVER80 = namesOf("over80");

const BANDS: { key: string; label: string; where: Where; test: (b: number | null, kind: Kind | undefined) => boolean }[] = [
  { key: "100", label: "100%", where: { batteryHealth: 100 }, test: (b) => b === 100 },
  { key: "95-99", label: "95〜99%", where: { batteryHealth: { gte: 95, lte: 99 } }, test: (b) => b !== null && b >= 95 && b <= 99 },
  { key: "90-94", label: "90〜94%", where: { batteryHealth: { gte: 90, lte: 94 } }, test: (b) => b !== null && b >= 90 && b <= 94 },
  { key: "85-89", label: "85〜89%", where: { batteryHealth: { gte: 85, lte: 89 } }, test: (b) => b !== null && b >= 85 && b <= 89 },
  {
    key: "80-84", label: "80〜84%",
    where: { OR: [{ batteryHealth: { gte: 81, lte: 84 } }, { AND: [{ batteryHealth: 80 }, { shopName: { notIn: OVER80 } }] }] },
    test: (b, k) => b !== null && b >= 80 && b <= 84 && !(b === 80 && k === "over80"),
  },
  { key: "80+rough", label: "80%以上（ざっくり）", where: { AND: [{ batteryHealth: 80 }, { shopName: { in: OVER80 } }] }, test: (b, k) => b === 80 && k === "over80" },
  { key: "<80", label: "80%未満", where: { batteryHealth: { lt: 80 } }, test: (b) => b !== null && b < 80 },
  { key: "null", label: "数字なし", where: { batteryHealth: null }, test: (b) => b === null },
];

const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "-");

async function main() {
  const shops = await activeShops();
  console.log(`店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  for (const k of KINDS) {
    const s = shops.filter((x) => x.battery === k);
    console.log(`  電池の表記 ${k}: ${s.length}店（${s.map((x) => x.label).join("・")}）`);
  }

  const iphone: Where = { isSoldOut: false, modelName: { startsWith: "iPhone" } };
  const total = await prisma.deviceInventory.count({ where: iphone });
  const junk = await prisma.deviceInventory.count({ where: { AND: [iphone, { conditionRank: { in: ["J", "j", "ジャンク"] } }] } });
  console.log(`iPhone 在庫 ${total}（ジャンク ${junk}）`);

  // iPhone 全体の電池の値 × 店（groupBy の集計行だけ）
  const all = await prisma.deviceInventory.groupBy({ by: ["shopName", "batteryHealth"], where: { AND: [iphone, NOT_JUNK] }, _count: { _all: true } });
  const allTotal = all.reduce((a, r) => a + r._count._all, 0);
  console.log(`\n== iPhone 全体（ジャンク以外 ${allTotal}件）の電池の帯`);
  for (const b of BANDS) {
    const n = all.filter((r) => b.test(r.batteryHealth, findShop(r.shopName)?.battery)).reduce((a, r) => a + r._count._all, 0);
    console.log(`  ${b.label}: ${n}件 ${pct(n, allTotal)}`);
  }
  for (const k of KINDS) {
    const rows = all.filter((r) => findShop(r.shopName)?.battery === k);
    const n = rows.reduce((a, r) => a + r._count._all, 0);
    const dist = BANDS.map((b) => `${b.key}:${rows.filter((r) => b.test(r.batteryHealth, k)).reduce((a, r) => a + r._count._all, 0)}`).join(" ");
    console.log(`  表記 ${k}: ${n}件 ${pct(n, allTotal)}  ${dist}`);
  }
  // 100% のうち未使用品（ランクS）
  const r100 = await prisma.deviceInventory.groupBy({ by: ["conditionRank"], where: { AND: [iphone, { batteryHealth: 100 }] }, _count: { _all: true } });
  const n100 = r100.reduce((a, r) => a + r._count._all, 0);
  console.log(`  電池100%のランク（${n100}件）: ${r100.sort((a, b) => b._count._all - a._count._all).map((r) => `${r.conditionRank}:${r._count._all}`).join(" ")}`);
  const rS = await prisma.deviceInventory.groupBy({ by: ["batteryHealth"], where: { AND: [iphone, { conditionRank: { in: ["S", "s"] } }] }, _count: { _all: true } });
  console.log(`  ランクS の電池: ${rS.sort((a, b) => b._count._all - a._count._all).slice(0, 8).map((r) => `${r.batteryHealth ?? "なし"}:${r._count._all}`).join(" ")}`);

  for (const m of MODELS) {
    const base: Where = { AND: [await modelWhere(m), NOT_JUNK] };
    const groups = await groupMinPrice(base, "storage");
    const most = groups.reduce((a, b) => (b.count > a.count || (b.count === a.count && Number(b.key) < Number(a.key)) ? b : a));
    const top = STORAGE[m] ? groups.find((x) => Number(x.key) === STORAGE[m])! : most;
    if (top !== most) console.log(`
（${m} はいちばん多いのが ${most.key}GB ${most.count}件。${top.key}GB で見る）`);
    const gb = Number(top.key);
    const at: Where = { AND: [base, { storage: gb }] };
    const n = top.count;
    const rep = appleRepair(m);
    console.log(`\n== ${m} ${gb}GB（ジャンク以外 ${n}件・中央値 ${await medianPrice(at, n)}・最安 ${top.minPrice}）電池交換 ${rep?.battery ?? "-"}`);

    const g = await prisma.deviceInventory.groupBy({ by: ["shopName", "batteryHealth"], where: at, _count: { _all: true } });
    for (const b of BANDS) {
      const rows = g.filter((r) => b.test(r.batteryHealth, findShop(r.shopName)?.battery));
      const c = rows.reduce((a, r) => a + r._count._all, 0);
      const w: Where = { AND: [at, b.where] };
      const med = c ? await medianPrice(w, c) : null;
      const mn = c ? (await prisma.deviceInventory.aggregate({ where: w, _min: { price: true } }))._min.price : null;
      // 店の表記ごと（5件以上だけ中央値）
      const byKind: string[] = [];
      for (const k of KINDS) {
        const kc = rows.filter((r) => findShop(r.shopName)?.battery === k).reduce((a, r) => a + r._count._all, 0);
        if (!kc) continue;
        const km = kc >= 5 ? await medianPrice({ AND: [w, { shopName: { in: namesOf(k) } }] }, kc) : null;
        byKind.push(`${k} ${kc}件${km !== null ? ` 中${km}` : ""}`);
      }
      console.log(`  ${b.label.padEnd(10)} ${String(c).padStart(4)}件 ${pct(c, n).padStart(6)} 中央${med ?? "-"} 最安${mn ?? "-"}  [${byKind.join(" / ")}]`);
    }
    for (const th of [95, 90, 85, 80]) {
      const w: Where = { AND: [at, { batteryHealth: { gte: th } }] };
      const a = await prisma.deviceInventory.aggregate({ where: w, _min: { price: true }, _count: { _all: true } });
      const med = a._count._all ? await medianPrice(w, a._count._all) : null;
      console.log(`  ${th}%以上: ${a._count._all}件 最安${a._min.price ?? "-"} 中央${med ?? "-"}${th === 80 ? "（over80 の店の「80%以上」を含む）" : ""}`);
    }
    // 100% を除いた 90% 以上・85% 以上（未使用品を除いた中古だけ）
    for (const th of [90, 85]) {
      const w: Where = { AND: [at, { batteryHealth: { gte: th, lte: 99 } }] };
      const a = await prisma.deviceInventory.aggregate({ where: w, _min: { price: true }, _count: { _all: true } });
      console.log(`  ${th}〜99%: ${a._count._all}件 最安${a._min.price ?? "-"} 中央${a._count._all ? await medianPrice(w, a._count._all) : "-"}`);
    }
    // 電池100%のランク
    const rk = await prisma.deviceInventory.groupBy({ by: ["conditionRank"], where: { AND: [at, { batteryHealth: 100 }] }, _count: { _all: true } });
    console.log(`  100%のランク: ${rk.sort((a, b) => b._count._all - a._count._all).map((r) => `${r.conditionRank}:${r._count._all}`).join(" ")}`);
    const s100: Where = { AND: [at, { batteryHealth: 100 }, { conditionRank: { in: ["S", "s"] } }] };
    const ns100: Where = { AND: [at, { batteryHealth: 100 }, { conditionRank: { notIn: ["S", "s"] } }] };
    const cs = await prisma.deviceInventory.count({ where: s100 });
    const cn = await prisma.deviceInventory.count({ where: ns100 });
    console.log(`  100%: ランクS ${cs}件 中${cs ? await medianPrice(s100, cs) : "-"} / S以外 ${cn}件 中${cn ? await medianPrice(ns100, cn) : "-"}`);
  }
  await prisma.$disconnect();
  process.exit(0);
}
main();
