/**
 * テーマ「電池90%台だと、中古iPhoneはいくら高い？」: 1機種の同じ容量で、バッテリー最大容量 90%台と 80%台の中古の相場（中央値）の差のランキング → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 機種: iPhone 12〜16 の無印と Pro（MODELS）。容量はその機種で在庫がいちばん多い容量（サイトの相場と同じ容量。同じ件数なら小さい方）
 * - 電池は DB の batteryHealth。90%台＝90〜99、80%台＝81〜89。100 は未使用品・新品交換品が多く、80 は「80%以上」とだけ書く店の値（lib/shops.ts の over80）なので、
 *   どちらも入れない。数値を書かない店（battery: none）の在庫は null なので入らない＝電池の%を数字で出している店の在庫だけで比べる
 * - 差 = 90%台の相場 − 80%台の相場。率は 80%台の相場に対して。差の大きい順。差が0以下の機種は出さない。どちらかの在庫が MIN_COUNT 件未満の機種は出さない
 * - small（plan --small・10/29〜）: 差の**小さい順**（差0も入れる。80%台の方が高い機種は出さない）。「90%台も80%台も同じ値段」を出す回。
 *   数件の値付けで差0にならないよう、どちらの帯も在庫 SMALL_MIN_COUNT 件以上
 * DB は機種ごとの容量の集計（groupBy）・件数（count）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import { APPLE_REPAIR_CHECKED, APPLE_REPAIR_SOURCE, appleRepair } from "@/lib/appleRepairPrices";
import type { BatteryRow, BatteryScript } from "../types";

/** 比べる機種（古い順） */
const MODELS = ["iPhone 12", "iPhone 12 Pro", "iPhone 13", "iPhone 13 Pro", "iPhone 14", "iPhone 14 Pro", "iPhone 15", "iPhone 15 Pro", "iPhone 16", "iPhone 16 Pro"];
/** 電池の帯（両端を含む） */
export const BATTERY_HI = { min: 90, max: 99 } as const;
export const BATTERY_LO = { min: 81, max: 89 } as const;
/** 相場が数件の在庫で決まらないように（その容量・電池の帯の在庫の件数） */
const MIN_COUNT = 5;
/** small の回の在庫の下限（差0を数件の値付けで言わない。unused の20件と同じ考え） */
const SMALL_MIN_COUNT = 20;
/** 動画・説明欄に出す数（3位・2位・1位） */
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
/** 約何万円（0.1万円単位で四捨五入。ナレーションの「約○.○万円」と同じ値） */
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_battery`;

async function band(at: Prisma.DeviceInventoryWhereInput, b: { min: number; max: number }) {
  const where: Prisma.DeviceInventoryWhereInput = { AND: [at, { batteryHealth: { gte: b.min, lte: b.max } }] };
  const count = await prisma.deviceInventory.count({ where });
  return { count, median: count ? (await medianPrice(where, count))! : 0 };
}

async function rowOf(model: string, min = MIN_COUNT): Promise<BatteryRow | null> {
  const where = await modelWhere(model);
  const byStorage = await groupMinPrice(where, "storage");
  if (byStorage.length === 0) return null;
  const top = byStorage.reduce((a, b) => (b.count > a.count || (b.count === a.count && Number(b.key) < Number(a.key)) ? b : a));
  const gb = Number(top.key);
  const at: Prisma.DeviceInventoryWhereInput = { AND: [where, { storage: gb }] };
  const [hi, lo] = [await band(at, BATTERY_HI), await band(at, BATTERY_LO)];
  const storage = storageLabel(gb, model);
  if (hi.count < min || lo.count < min) {
    console.log(`  対象外: ${model}（${storage}・90%台 ${hi.count}件・80%台 ${lo.count}件。どちらも${min}件以上必要）`);
    return null;
  }
  const diff = hi.median - lo.median;
  const repair = appleRepair(model)?.battery;
  const row: BatteryRow = { model, storage, storageGb: gb, hiMedian: hi.median, loMedian: lo.median, hiCount: hi.count, loCount: lo.count, diff, pct: Math.round((diff / lo.median) * 1000) / 10, ...(repair ? { repair } : {}) };
  console.log(`  候補: ${model}（${storage}） 90%台 ${man(hi.median)}円（${hi.count}件）・80%台 ${man(lo.median)}円（${lo.count}件） → 差 ${man(diff)}円・${row.pct.toFixed(1)}%`);
  return row;
}

export async function buildBatteryScript(date: string, small = false): Promise<BatteryScript> {
  const min = small ? SMALL_MIN_COUNT : MIN_COUNT;
  const rows: BatteryRow[] = [];
  for (const model of MODELS) {
    const r = await rowOf(model, min);
    // 80%台の方が高い機種は「高くなる」と言えないので出さない（small は差0まで入れる）
    if (r && (small ? r.diff >= 0 : r.diff > 0)) rows.push(r);
    else if (r && r.diff < 0) console.log(`  ★注意: ${model} は80%台の方が高い（${man(r.diff)}円）。出さない`);
  }
  rows.sort(small ? (x, y) => x.diff - y.diff || x.pct - y.pct : (x, y) => y.diff - x.diff || y.pct - x.pct);
  if (rows.length < SHOWN) throw new Error(`電池90%台・80%台に在庫が${min}件以上ある機種が ${rows.length} 機種しかありません（${SHOWN}機種以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeShops(SHOPS)).length;
  // 電池の%を数字で出している店（lib/shops.ts の battery: exact）。この店の在庫だけで比べていることを説明欄に書く
  const exactShops = (await activeShops(SHOPS)).filter((s) => s.battery === "exact").map((s) => s.label);

  // 1位の差が Apple 公式の電池交換より安いか（「80%台を買って交換するより、90%台を買う方が安い」と言えるか）
  const cheaper = top.repair !== undefined && top.diff < top.repair;
  // 検品担当のひと言の下書き（1行16字以内・3行まで）
  const lines = small ? ["差が小さい機種は", "迷わず", "90%台を選びましょう"]
    : cheaper ? ["差額が電池交換より", "安いなら", "90%台が得です"] : ["差額と電池交換の", "費用を比べて", "選びましょう"];

  const rawTitle = small
    ? (top.diff === 0 ? `${top.model}は電池90%台も80%台も同じ${man(top.hiMedian)}円！` : `${top.model}は電池90%台でも+${man(top.diff)}円だけ！`) + "電池の差が小さい中古iPhone"
    : cheaper
    ? `${top.model}、電池90%台との差は${man(top.diff)}円！電池交換より安い`
    : `${top.model}は電池90%台だと${man(top.diff)}円高い！電池の差ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : small ? "電池90%台も80%台も同じ値段？差が小さい中古iPhone" : `電池90%台だと${man(top.diff)}円高い！中古iPhoneの電池の差`;
  const rowText = (r: BatteryRow, i: number) =>
    `${i + 1}位 ${r.model}（${r.storage}） 90%台 ${man(r.hiMedian)}円・80%台 ${man(r.loMedian)}円（差+${man(r.diff)}円・+${r.pct.toFixed(1)}%）`;
  const description = [
    small
      ? `同じ機種・同じ容量の中古iPhoneで、バッテリー最大容量が90%台と80%台の相場の差が小さい順のランキングです。1位は${top.model}（${top.storage}）で、${top.diff === 0 ? `90%台も80%台も相場は同じ${man(top.hiMedian)}円` : `差は${man(top.diff)}円（+${top.pct.toFixed(1)}%）だけ`}です。差が小さい機種は、ほぼ同じ値段で電池の良い方を選べます。`
      : `同じ機種・同じ容量の中古iPhoneで、バッテリー最大容量が90%台と80%台の相場がいくら違うかのランキングです。1位は${top.model}（${top.storage}）で、90%台の方が${man(top.diff)}円（+${top.pct.toFixed(1)}%）高くなっています。`,
    "",
    ...items.map(rowText),
    ...(top.repair ? ["", `参考: ${top.model}の Apple 公式の電池交換は ${man(top.repair)}円（保証対象外・税込・${slash(APPLE_REPAIR_CHECKED)}確認 ${APPLE_REPAIR_SOURCE.battery}）。`] : []),
    "",
    `選び方: iPhone 12〜16 の無印と Pro で、在庫がいちばん多い容量の、電池90〜99%と81〜89%の相場（中央値）を比べ、${small ? "差の小さい順（80%台の方が高い機種は除く）" : "差の大きい順"}（それぞれ在庫${min}件以上）。率は80%台の相場に対して。電池の%を数字で出している店（${exactShops.join("・")}）の在庫だけで比べています（「80%以上」とだけ書く店・100%は除く）。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.model}の電池別の在庫と最安値: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "battery",
    ...(small ? { order: "small" as const } : {}),
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: small ? "同じ値段なら90%台にしますか？" : "あなたなら90%台？80%台？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
