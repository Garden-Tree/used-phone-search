/**
 * テーマ「楽天モバイルの料金は使った量で3段階｜中古iPhone 14と2年でいくら？」（広告の回・楽天アフィリエイト。10/26〜）→ 台本
 * 横動画11本目「中古iPhone＋楽天モバイル、2年でいくら？」（longform/2026-10-31-rakuten-mobile）の案2（shorts-ideas.md）
 *
 * 数字（台本・説明欄・動画で同じ。主観は入れない）:
 * - 料金は Rakuten最強プラン（税込・割引なし）の3段: 3GBまで・20GBまで・無制限（TIERS。公式 SIM_PLANS の priceSource で確かめた値だけ・
 *   確かめた日は lib/simPlans.ts の SIM_PRICES_CHECKED）。いちばん下の段は SIM_PLANS の monthlyFrom と同じでなければ止める（見直し忘れ）
 * - 端末は中古の iPhone 14 の 128GB（ジャンクを除く）の相場＝中央値（横動画の data-query.ts と同じ決め方）
 * - 2年 = 相場 + 月額 × 24（24か月ずっと同じ段・端末は一括で買う想定）。手数料・通話料は入れない
 * - 差 = いちばん上の段の2年 − いちばん下の段の2年（＝ 月額の差 × 24。端末の相場は打ち消し合う）
 * 言わない・書かないこと（楽天アフィ・楽天モバイルの決まり。ideas/2026-10-26.md）: ポイント・キャンペーン・特典／「最安」「実質0円」「必ず安い」「無料」「お得」／
 *   ほかの会社の料金／すぐの解約・乗り換えの促し。楽天モバイルのリンクは横動画の説明欄だけ（ショートの説明欄・コメントには貼らない）
 * DB は容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import type { Prisma } from "@prisma/client";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SIM_PLANS, SIM_PRICES_CHECKED } from "@/lib/simPlans";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { RakutenMobileScript, SimTier } from "../types";

/** 料金の3段（税込・割引なし。公式の「通常料金」の表。家族割の 968円・2,068円・3,168円 と取り違えない） */
const TIERS: Pick<SimTier, "label" | "monthly">[] = [
  { label: "3GBまで", monthly: 1078 },
  { label: "20GBまで", monthly: 2178 },
  { label: "無制限", monthly: 3278 },
];
const PLAN = "Rakuten最強プラン";
const MONTHS = 24;
const MODEL = "iPhone 14";
const GB = 128;
/** 相場が数件の在庫で決まらないように（その容量の在庫の件数） */
const MIN_COUNT = 5;
const NOT_JUNK: Prisma.DeviceInventoryWhereInput = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_rakutenmobile`;

export async function buildRakutenMobileScript(date: string): Promise<RakutenMobileScript> {
  const sim = SIM_PLANS.find((p) => p.name === "楽天モバイル");
  if (!sim) throw new Error("lib/simPlans.ts に楽天モバイルがありません");
  if (sim.monthlyFrom !== TIERS[0].monthly) throw new Error(`lib/simPlans.ts の楽天モバイルの月額（${man(sim.monthlyFrom)}円）と、このテーマの3GBまで（${man(TIERS[0].monthly)}円）が違います。公式（${sim.priceSource}）で3段とも確かめ直してください`);

  const base: Prisma.DeviceInventoryWhereInput = { AND: [await modelWhere(MODEL), NOT_JUNK] };
  const groups = await groupMinPrice(base, "storage");
  const count = groups.find((g) => Number(g.key) === GB)?.count ?? 0;
  if (count < MIN_COUNT) throw new Error(`${MODEL} ${GB}GB（ジャンク以外）の在庫が ${count} 件しかありません（${MIN_COUNT}件以上必要）`);
  const median = (await medianPrice({ AND: [base, { storage: GB }] }, count))!;
  const most = groups.reduce((a, b) => (b.count > a.count ? b : a));
  console.log(`  ${MODEL} ${GB}GB（ジャンク以外）: ${count}件・相場 ${man(median)}円${Number(most.key) !== GB ? `（いちばん多いのは ${most.key}GB ${most.count}件）` : ""}`);

  const rows: SimTier[] = TIERS.map((t) => ({ ...t, twoYears: t.monthly * MONTHS, total: median + t.monthly * MONTHS }));
  rows.forEach((r) => console.log(`  2年 ${r.label}: ${man(median)}円 + ${man(r.monthly)}円×${MONTHS} = ${man(r.total)}円`));
  const diff = rows[rows.length - 1].total - rows[0].total;
  const device = { model: MODEL, storage: storageLabel(GB, MODEL), storageGb: GB, median, count };
  const shopCount = (await activeShops(SHOPS)).length;
  const checked = slash(SIM_PRICES_CHECKED);

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。どの段になるかは人による → 自分の使った量を見る
  const lines = ["まず iPhoneの設定の", "モバイル通信で", "今の使った量を見てね"];

  const title = `【PR】楽天モバイルは使った量で3段階｜中古${MODEL}と2年でいくら？`;
  const description = [
    // 広告の表示（説明欄の1行目・楽天アフィの決まり）
    "【PR】この動画は楽天アフィリエイトの広告を含みます。",
    "",
    `楽天モバイル（${PLAN}）の料金は、その月に使った量で3段階です。中古の${MODEL}（${device.storage}）の相場と合わせて、2年の合計を計算しました。`,
    "",
    `・月額（税込・割引なし）: ${rows.map((r) => `${r.label} ${man(r.monthly)}円`).join("・")}`,
    `・中古${MODEL} ${device.storage}の相場: ${man(median)}円`,
    `・2年の合計（相場＋月額×${MONTHS}・ずっと同じ段の場合）: ${rows.map((r) => `${r.label} ${man(r.total)}円`).join("・")}`,
    `・いちばん上と下の段の差: 2年で${man(diff)}円`,
    "",
    `相場＝大手中古ショップ${shopCount}店の在庫・${device.storage}・ジャンクを除く中央値（${slash(date)}時点）。料金＝楽天モバイル公式（税込・割引なし・${checked}確認）。各種手数料等・通話料は含みません。料金と条件は、申し込む前に楽天モバイルの公式ページで確かめてください。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）。楽天モバイルのリンクはここに貼らない
    `${MODEL}の店ごとの在庫と相場: https://used.gadelog.com${modelPagePath(MODEL)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "rakutenmobile",
    date,
    shopCount,
    pricesChecked: SIM_PRICES_CHECKED,
    scenes: {
      tiers: { plan: PLAN, months: MONTHS, rows },
      device,
      diff,
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["料金は申し込む日に公式で", "中古の相場はプロフィールから"],
        url: "used.gadelog.com",
        note: `料金は${checked}の楽天モバイル公式\n相場は大手中古ショップ${shopCount}店から`,
        question: "あなたは月に何GB使う？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone", "#楽天モバイル"] },
  };
}
