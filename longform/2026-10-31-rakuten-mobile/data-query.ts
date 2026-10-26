/**
 * 横動画11本目「中古iPhone＋楽天モバイル、2年でいくら？」の数字（読むだけ。DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫の行は取らない）
 *
 * - 機種: SE (第3世代)・13・14・15・16 の 128GB（ジャンクを除く）。SE 第3世代は64GBがいちばん多いが、7本目の「64GBは選ばない」とそろえて128GB
 * - 相場＝中央値。参考に電池85%以上の中央値と最安も出す
 * - 回線の料金は Rakuten最強プラン（税込・割引なし）: 3GBまで 1,078円・20GBまで 2,178円・無制限 3,278円
 *   （https://network.mobile.rakuten.co.jp/fee/saikyo-plan/ ・lib/simPlans.ts と同じ・10/26 確認）。各種手数料等は別
 * - 2年の総額 = 端末の相場 + 月額 × 24（端末は一括で買う想定。電話の通話料・手数料は入れない）
 */
import "dotenv/config";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { activeShops } from "@/lib/activeShops";

type Where = Prisma.DeviceInventoryWhereInput;

const MODELS = ["iPhone SE (第3世代)", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16"];
const GB = 128;
const NOT_JUNK: Where = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
const TIERS = [
  { label: "3GBまで", monthly: 1078 },
  { label: "20GBまで", monthly: 2178 },
  { label: "無制限", monthly: 3278 },
];
const MONTHS = 24;
const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;

async function main() {
  const shops = await activeShops();
  console.log(`店 ${shops.length}: ${shops.map((s) => s.label).join("・")}`);
  const iphone: Where = { isSoldOut: false, modelName: { startsWith: "iPhone" } };
  console.log(`iPhone 在庫 ${await prisma.deviceInventory.count({ where: iphone })}`);
  console.log(`\n回線（${MONTHS}か月）: ${TIERS.map((t) => `${t.label} ${yen(t.monthly)}×${MONTHS}=${yen(t.monthly * MONTHS)}`).join(" / ")}`);

  for (const m of MODELS) {
    const base: Where = { AND: [await modelWhere(m), NOT_JUNK] };
    const groups = await groupMinPrice(base, "storage");
    const most = groups.reduce((a, b) => (b.count > a.count || (b.count === a.count && Number(b.key) < Number(a.key)) ? b : a));
    const g = groups.find((x) => Number(x.key) === GB);
    if (!g) {
      console.log(`\n== ${m}: ${GB}GB の在庫なし`);
      continue;
    }
    const at: Where = { AND: [base, { storage: GB }] };
    const med = (await medianPrice(at, g.count))!;
    const w85: Where = { AND: [at, { batteryHealth: { gte: 85 } }] };
    const a85 = await prisma.deviceInventory.aggregate({ where: w85, _min: { price: true }, _count: { _all: true } });
    const med85 = a85._count._all ? await medianPrice(w85, a85._count._all) : null;
    console.log(
      `\n== ${m} ${GB}GB（ジャンク以外 ${g.count}件・中央値 ${yen(med)}・最安 ${yen(g.minPrice)}）` +
        `${most !== g ? `  ※いちばん多いのは ${most.key}GB ${most.count}件` : ""}`,
    );
    console.log(`  電池85%以上: ${a85._count._all}件 中央値 ${med85 !== null ? yen(med85) : "-"} 最安 ${a85._min.price !== null ? yen(a85._min.price) : "-"}`);
    for (const t of TIERS) {
      const total = med + t.monthly * MONTHS;
      console.log(`  2年 ${t.label.padEnd(6)}: ${yen(med)} + ${yen(t.monthly * MONTHS)} = ${yen(total)}（月あたり ${yen(Math.round(total / MONTHS))}）`);
    }
  }
  await prisma.$disconnect();
  process.exit(0);
}
main();
