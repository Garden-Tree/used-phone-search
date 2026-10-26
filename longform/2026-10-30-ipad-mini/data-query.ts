/**
 * 横動画「新型iPad mini、買う？中古の旧型にする？」の数字（読むだけ。DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫の行は取らない）
 *
 * - 機種: iPad mini (A17 Pro)・(第6世代)・(第5世代)（lib/ipadCatalog.ts の名前）。ジャンクを除く
 * - 容量ごと（在庫5件以上）に 件数・中央値・最安。相場＝在庫がいちばん多い容量の中央値（サイトと同じ）
 * - 電池85%以上: 電池の数字が85以上と書いてある在庫（店によって書き方が違う。lib/shops.ts の battery）
 * - 新型 A20 Pro の値段は lib/ipadMiniA20.ts（Apple 公式・10/27 確認）だけ。差額は「新品の同じ容量 − 中古の中央値」
 *
 *   npx tsx longform/2026-10-30-ipad-mini/data-query.ts > longform/2026-10-30-ipad-mini/data-query.log
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { activeShops } from "@/lib/activeShops";
import { IPAD_SHOPS } from "@/lib/shops";
import { IPAD_SPECS, IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { pencilsFor } from "@/lib/ipadPencil";
import { IPAD_MINI_A20_CHECKED, IPAD_MINI_A20_PRICES } from "@/lib/ipadMiniA20";

type Where = Prisma.DeviceInventoryWhereInput;

const MODELS = ["iPad mini (A17 Pro)", "iPad mini (第6世代)", "iPad mini (第5世代)"];
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
const MIN_COUNT = 5;
const yen = (n: number | null | undefined) => (n == null ? "-" : `${n.toLocaleString("ja-JP")}円`);

async function main() {
  const shops = await activeShops(IPAD_SHOPS);
  console.log(`iPad の店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  console.log(`iPad 在庫 ${await prisma.deviceInventory.count({ where: { isSoldOut: false, modelName: { contains: "iPad" } } })}`);
  console.log(
    `\n新型 A20 Pro（Apple 公式・${IPAD_MINI_A20_CHECKED}・Wi-Fi）: ${Object.entries(IPAD_MINI_A20_PRICES).map(([gb, p]) => `${gb}GB ${yen(p)}`).join(" / ")}`,
  );

  for (const m of MODELS) {
    const spec = IPAD_SPECS[m];
    console.log(
      `\n== ${m}  ${spec?.released}・${spec?.chip}・${spec?.display}インチ ${spec?.panel}・${spec?.port}・${spec?.auth}` +
        `・iPadOS 27 ${IPADOS27_MODELS.has(m) ? "対応" : "非対応"}・Pencil ${pencilsFor(m).join("/")}`,
    );
    const base: Where = { AND: [await modelWhere(m), NOT_JUNK] };
    const groups = (await groupMinPrice(base, "storage")).sort((a, b) => Number(a.key) - Number(b.key));
    const total = groups.reduce((s, g) => s + g.count, 0);
    if (total === 0) {
      console.log("  在庫なし");
      continue;
    }
    const top = groups.reduce((a, b) => (b.count > a.count || (b.count === a.count && Number(b.key) < Number(a.key)) ? b : a));
    console.log(`  ジャンク以外 ${total}件・いちばん多い容量 ${top.key}GB・全体の最安 ${yen(Math.min(...groups.map((g) => g.minPrice)))}`);
    for (const g of groups) {
      const gb = Number(g.key);
      const at: Where = { AND: [base, { storage: gb }] };
      const med = g.count >= MIN_COUNT ? await medianPrice(at, g.count) : null;
      const w85: Where = { AND: [at, { batteryHealth: { gte: 85 } }] };
      const a85 = await prisma.deviceInventory.aggregate({ where: w85, _min: { price: true }, _count: { _all: true } });
      const med85 = a85._count._all >= MIN_COUNT ? await medianPrice(w85, a85._count._all) : null;
      const known = await prisma.deviceInventory.count({ where: { AND: [at, { batteryHealth: { not: null } }] } });
      const newPrice = IPAD_MINI_A20_PRICES[gb];
      console.log(
        `  ${String(gb).padStart(4)}GB ${String(g.count).padStart(4)}件 中央値 ${yen(med)} 最安 ${yen(g.minPrice)}` +
          ` | 電池の数字あり ${known}件・85%以上 ${a85._count._all}件 中央値 ${yen(med85)} 最安 ${yen(a85._min.price)}` +
          (newPrice && med ? ` | 新型 ${yen(newPrice)} との差 ${yen(newPrice - med)}` : "") +
          (g === top ? "  ←相場" : ""),
      );
    }
  }
  await prisma.$disconnect();
  process.exit(0);
}
main();
