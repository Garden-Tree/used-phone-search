/**
 * 横動画「中古iPad、何世代まで買っていい？」の数字（読むだけ。findMany で在庫の行は取らない）
 *
 * - 機種ごと: 件数・店の数・最安・在庫がいちばん多い容量の中央値（lib/modelInventory.ts と同じ考え方）
 * - 容量ごと: 件数・最安・中央値（在庫5件以上）。中央値は findFirst + skip の1行だけ
 * - 検品の視点: 電池の数字がある件数・元の販売元（carrier）・ネットワーク利用制限・SIM ロック解除（どれも groupBy / count）
 * - 集計の時点: 販売中の在庫の updatedAt の最大（在庫の取り込みが止まっている間は実際の更新日時）
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere, primaryMedian } from "@/lib/modelInventory";
import { activeShops } from "@/lib/activeShops";
import { findShop } from "@/lib/shops";
import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { IPAD_SPECS, IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { pencilsFor, pencilNeedsAdapter } from "@/lib/ipadPencil";

const MODELS = [
  "iPad (第6世代)", "iPad (第7世代)", "iPad (第8世代)", "iPad (第9世代)", "iPad (第10世代)", "iPad (A16)",
  "iPad Air (第3世代)", "iPad Air (第4世代)", "iPad Air (第5世代)", "iPad Air 11インチ (M2)",
  "iPad mini (第5世代)", "iPad mini (第6世代)", "iPad mini (A17 Pro)",
  "iPad Pro 11インチ (第1世代)", "iPad Pro 11インチ (第2世代)", "iPad Pro 11インチ (第3世代)",
];
/** 検品の視点（電池・回線）まで細かく見る機種 */
const DETAIL = new Set(["iPad (第8世代)", "iPad (第9世代)", "iPad (第10世代)", "iPad Air (第5世代)"]);
const MIN = 5;

async function main() {
  console.log(`集計 ${new Date().toISOString()}`);
  const latest = await prisma.deviceInventory.aggregate({ where: { isSoldOut: false }, _max: { updatedAt: true } });
  console.log(`在庫の最終更新 ${latest._max.updatedAt?.toISOString()}`);
  console.log(`店（全機種） ${(await activeShops()).length}`);

  let ipadTotal = 0;
  const ipadShops = new Set<string>();
  for (const model of IPAD_MODELS) {
    const where = await modelWhere(model);
    for (const s of await groupMinPrice(where, "shopName")) {
      ipadTotal += s.count;
      ipadShops.add(s.key);
    }
  }
  // 別の売り場（イオシス公式⇔楽天 など）は親の店に合算して数える
  const parents = new Set([...ipadShops].map((n) => { const shop = findShop(n); return shop?.alias ?? shop?.name ?? n; }));
  console.log(`iPad 全機種 ${ipadTotal}件・${ipadShops.size}売り場・${parents.size}店（${[...parents].join("・")}）`);

  for (const model of MODELS) {
    const where = await modelWhere(model);
    const byStorage = await groupMinPrice(where, "storage");
    const byShop = await groupMinPrice(where, "shopName");
    const total = byStorage.reduce((a, r) => a + r.count, 0);
    const spec = IPAD_SPECS[model];
    const pencil = pencilsFor(model).join("・") + (pencilNeedsAdapter(model) ? "（第1世代はアダプタ）" : "");
    console.log(`\n■ ${model} ${spec?.released} ${spec?.chip} ${spec?.port} ${spec?.auth} ${spec?.display}型 / iPadOS 27 ${IPADOS27_MODELS.has(model) ? "対応" : "非対応"} / Pencil ${pencil}`);
    if (total === 0) { console.log("  在庫なし"); continue; }
    const primary = await primaryMedian(where, byStorage);
    const min = Math.min(...byStorage.map((r) => r.minPrice));
    console.log(`  ${total}件・${byShop.length}売り場・最安 ${min}・相場 ${primary?.price}（${primary?.storage}GB・${primary?.count}件）`);
    for (const r of [...byStorage].sort((a, b) => Number(a.key) - Number(b.key))) {
      const med = r.count >= MIN ? await medianPrice({ AND: [where, { storage: Number(r.key) }] }, r.count) : null;
      console.log(`  ${r.key}GB ${r.count}件 最安 ${r.minPrice} 中央値 ${med ?? `（${MIN}件未満）`}`);
    }
    if (!DETAIL.has(model) || !primary) continue;

    const at = { AND: [where, { storage: primary.storage }] };
    const withBattery = await prisma.deviceInventory.count({ where: { AND: [at, { batteryHealth: { not: null } }] } });
    console.log(`  電池: ${primary.storage}GB ${primary.count}件のうち数字あり ${withBattery}件`);
    const shopBattery = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: { AND: [at, { batteryHealth: { not: null } }] }, _count: { _all: true }, _min: { batteryHealth: true }, _max: { batteryHealth: true } });
    for (const s of shopBattery) console.log(`    ${s.shopName} ${s._count._all}件 ${s._min.batteryHealth}〜${s._max.batteryHealth}%`);
    const carrier = await prisma.deviceInventory.groupBy({ by: ["carrier"], where: at, _count: { _all: true }, _min: { price: true } });
    console.log(`  元の販売元: ${carrier.map((c) => `${c.carrier ?? "なし"} ${c._count._all}件（最安 ${c._min.price}）`).join(" / ")}`);
    // 回線の種類（carrier 列: Wi-Fiモデル／docomo・au・SoftBank・SIMフリー＝Cellular／null＝商品名に書いてない）ごとの中央値
    for (const c of carrier) {
      if (c._count._all < MIN) continue;
      const med = await medianPrice({ AND: [at, { carrier: c.carrier }] }, c._count._all);
      console.log(`    ${c.carrier ?? "なし"} ${c._count._all}件 中央値 ${med}`);
    }
    const cross = await prisma.deviceInventory.groupBy({ by: ["carrier", "networkStatus", "simUnlocked"], where: at, _count: { _all: true } });
    for (const c of cross) console.log(`    ${c.carrier ?? "なし"} 利用制限 ${c.networkStatus ?? "なし"} SIM解除 ${c.simUnlocked} ${c._count._all}件`);
    const unknown = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: { AND: [at, { carrier: null }] }, _count: { _all: true }, _min: { price: true } });
    console.log(`  回線の書いていない店: ${unknown.map((c) => `${c.shopName} ${c._count._all}件（最安 ${c._min.price}）`).join(" / ")}`);
    const network = await prisma.deviceInventory.groupBy({ by: ["networkStatus"], where: at, _count: { _all: true } });
    console.log(`  利用制限: ${network.map((c) => `${c.networkStatus ?? "なし"} ${c._count._all}件`).join(" / ")}`);
    const sim = await prisma.deviceInventory.groupBy({ by: ["simUnlocked"], where: at, _count: { _all: true } });
    console.log(`  SIMロック解除: ${sim.map((c) => `${c.simUnlocked} ${c._count._all}件`).join(" / ")}`);
    const rank = await groupMinPrice(at, "conditionRank");
    console.log(`  ランク: ${rank.map((c) => `${c.key} ${c.count}件`).join(" / ")}`);
  }
  process.exit(0);
}
main();
