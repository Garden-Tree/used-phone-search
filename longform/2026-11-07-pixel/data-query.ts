/**
 * 横動画「安いPixelほど損？」の数字。読むだけ（DB に書かない）。
 *   npx tsx longform/2026-11-07-pixel/data-query.ts > longform/2026-11-07-pixel/data-query.log
 *
 * DB は groupBy・count・aggregate と、中央値の1行だけ。findMany で在庫の行は取らない。
 * 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ）。
 * 公式の値: アップデート保証と発売（lib/pixelCatalog.ts）・スペック（lib/pixelSpecs.ts）・新品（lib/officialPrices.ts）
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { PIXEL_INFO, PIXEL_MODELS } from "@/lib/pixelCatalog";
import { PIXEL_SPECS } from "@/lib/pixelSpecs";
import { officialPrice } from "@/lib/officialPrices";

const NOW = { y: 2026, m: 11 };
const jst = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 9 * 3600000).toISOString().replace("T", " ").slice(0, 16) : "-");

function endOf(model: string) {
  const { available, updateYears } = PIXEL_INFO[model];
  const [y, m] = available.split("-").map(Number);
  const end = { y: y + updateYears, m };
  return { end: `${end.y}/${end.m}`, months: (end.y - NOW.y) * 12 + end.m - NOW.m, updateYears };
}

async function main() {
  console.log(`集計 ${jst(new Date())} JST`);
  const total = await prisma.deviceInventory.aggregate({ where: { isSoldOut: false, modelName: { startsWith: "Pixel" } }, _count: { _all: true }, _max: { updatedAt: true } });
  const shops = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: { isSoldOut: false, modelName: { startsWith: "Pixel" } }, _count: { _all: true } });
  console.log(`Pixel 在庫 ${total._count._all}・${shops.length}売り場・在庫の最終更新 ${jst(total._max.updatedAt)} JST`);

  const models = PIXEL_MODELS.filter((m) => !/Fold/.test(m));
  const market = await getModelMarket(models);
  console.log("機種 | 画面 | チップ | 保証 | 残り月 | 相場 | 容量 | 件数 | 最安 | 1年あたり | 電池85%以上の件数 | 最安(85%以上)");
  for (const m of models) {
    const e = endOf(m);
    const mk = market.get(m);
    if (!mk) { console.log(`${m} | 在庫なし`); continue; }
    const where = await modelWhere(m);
    const a85 = await prisma.deviceInventory.aggregate({ where: { AND: [where, { storage: mk.medianStorage ?? undefined }, { batteryHealth: { gte: 85 } }, { conditionRank: { notIn: ["J", "ジャンク"] } }] }, _count: { _all: true }, _min: { price: true } });
    const yearly = e.months > 0 ? Math.round((mk.medianPrice / e.months) * 12) : null;
    const s = PIXEL_SPECS[m];
    console.log([m, `${s?.display}インチ`, s?.chip, `${e.end}(${e.updateYears}年)`, e.months, mk.medianPrice, `${mk.medianStorage}GB`, mk.count, mk.minPrice, yearly ?? "切れ", a85._count._all, a85._min.price ?? "-"].join(" | "));
    const rows = (await groupMinPrice(where, "storage")).filter((g) => g.count >= 5);
    for (const g of rows) {
      const med = await medianPrice({ AND: [where, { storage: Number(g.key) }] }, g.count);
      console.log(`    ${g.key}GB 中央値 ${med} 最安 ${g.minPrice} ${g.count}件 新品 ${officialPrice(m, Number(g.key)) ?? "-"}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
