/**
 * テーマ「予算ぴったりで買える中古iPhoneは？」: DB の集計 → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない。10/21 に「発売年がいちばん新しい」から変えた）:
 * - 対象は iOS 27 対応の iPhone（ALL_CATALOG_MODELS。drops と同じ）のうち iPhone 12 シリーズ以降（isRecentEnough）で、在庫が MIN_COUNT 件以上の機種
 *   iPhone 11・11 Pro・11 Pro Max（2019年）と iPhone SE (第2世代)（2020年・A13）は古すぎるので出さない（10/21 ユーザーの指示）。SE (第3世代)（2022年）は入れる
 * - 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ数字）
 * - 予算 B ごとに、ひとつ前の予算 P との帯 (P, B]（3万: 0〜3万・5万: 3万超〜5万・7万: 5万超〜7万・10万: 7万超〜10万）に
 *   相場が入る機種のうち、相場がいちばん高い機種（＝その予算でいちばん上の機種）。同じ相場なら発売年（lib/iphoneSpecs.ts）の新しい方
 *   （前のルール「相場が予算以下で発売年がいちばん新しい」だと、5万円の枠に相場3.3万円の SE 第3世代が入って分かりにくかった）
 * - 帯に機種がなければ、前のルール（相場が予算以下で発売年がいちばん新しい・同じ年なら相場の高い方）
 * - 注目（reveal）は PICK_BUDGET（5万円）の行の機種に固定。出すのは相場（容量つき）と在庫数（相場と同じ、販売中の全在庫）だけ。
 *   最安は出さない（3万円の行より安く見えて分かりにくいため）
 * DB は機種ごとの集計（groupBy と中央値の1行）だけ。在庫の行を丸ごと取らない
 */
import { getModelMarket, type ModelMarket } from "@/lib/marketStats";
import { budgetLabel, budgetPath } from "@/lib/budgets";
import { ALL_CATALOG_MODELS, modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { specOf } from "@/lib/iphoneSpecs";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { BudgetRow, BudgetScript } from "../types";

/** 動画に出す予算（4行）。lib/budgets.ts の BUDGETS（予算別ページ）の一部 */
export const SHORT_BUDGETS = [30000, 50000, 70000, 100000];
/** 注目にする予算（固定のルール。4つの予算の2番目） */
export const PICK_BUDGET = 50000;
/** 相場が数件の在庫で決まらないように */
export const MIN_COUNT = 5;

const man = (n: number) => n.toLocaleString();
const yearOf = (model: string) => Number(specOf(model)?.released.replace("年", "") ?? 0);
/** iPhone 12 シリーズ（2020年発売）より古い機種と SE (第2世代) を除く */
const MIN_YEAR = 2020;
const EXCLUDE = new Set(["iPhone SE (第2世代)"]);
const isRecentEnough = (model: string) => yearOf(model) >= MIN_YEAR && !EXCLUDE.has(model);
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_budget`;

/**
 * 予算ごとの機種（budget・pixelbudget で共通の選び方）。cands は対象の機種と相場（在庫 MIN_COUNT 件以上に絞ったもの）、
 * age は発売の新しさ（大きいほど新しい）。帯 (前の予算, 予算] で相場のいちばん高い機種（同じなら新しい方）、帯が空なら予算以下でいちばん新しい機種。
 * budgets は予算の並び（既定 SHORT_BUDGETS。ipadbudget は IPAD_SHORT_BUDGETS）
 */
export function pickBudgetModels(cands: [string, ModelMarket][], age: (model: string) => number, what: string, budgets: number[] = SHORT_BUDGETS): { budget: number; model: string; r: ModelMarket }[] {
  return budgets.map((budget, i) => {
    const prev = i > 0 ? budgets[i - 1] : 0;
    // 帯 (prev, budget] の中で相場のいちばん高い機種。同じ相場なら発売の新しい方
    const band = cands.filter(([, r]) => r.medianPrice > prev && r.medianPrice <= budget)
      .sort(([a, ra], [b, rb]) => rb.medianPrice - ra.medianPrice || age(b) - age(a));
    // 帯が空なら前のルール（予算以下で発売年がいちばん新しい・同じ年なら相場の高い方）
    const fallback = cands.filter(([, r]) => r.medianPrice <= budget)
      .sort(([a, ra], [b, rb]) => age(b) - age(a) || rb.medianPrice - ra.medianPrice);
    const hit = band[0] ?? fallback[0];
    if (!hit) throw new Error(`相場が ${budgetLabel(budget)} 以下の${what}がありません`);
    if (!band.length) console.warn(`注意: ${budgetLabel(budget)} の帯に機種がないので、予算以下で発売年のいちばん新しい機種にしました`);
    return { budget, model: hit[0], r: hit[1] };
  });
}

export async function buildBudgetScript(date: string): Promise<BudgetScript> {
  const market = await getModelMarket(ALL_CATALOG_MODELS);
  const cands = [...market].filter(([m, r]) => r.count >= MIN_COUNT && isRecentEnough(m));
  const rows: (BudgetRow & { count: number })[] = pickBudgetModels(cands, yearOf, " iOS 27 対応 iPhone ").map(({ budget, model, r }) => (
    { budget, label: budgetLabel(budget), model, storage: r.medianStorage ? storageLabel(r.medianStorage, model) : "", median: r.medianPrice, released: specOf(model)!.released, count: r.count }
  ));
  const { count, ...pickRow } = rows.find((r) => r.budget === PICK_BUDGET) ?? rows[0];
  const pick = { ...pickRow, count };

  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（人が書き換える前提・1行16字以内・3行まで）。予算で選ぶ人は古めの機種になりやすいので、バッテリーと利用制限
  const lines = ["予算内でも", "バッテリー85%以上と", "利用制限○を確認しましょう"];

  const rawTitle = `${pick.label}なら${pick.model}！予算ぴったりで買える中古iPhone`;
  const title = rawTitle.length <= 60 ? rawTitle : `予算ぴったりで買える中古iPhone（${SHORT_BUDGETS.map(budgetLabel).join("・")}）`;
  const description = [
    `予算ごとに、相場で買えるいちばん上の中古iPhoneです。${pick.label}なら${pick.model}（${pick.storage}・相場${man(pick.median)}円・在庫${man(pick.count)}台）。`,
    "",
    ...rows.map((r) => `${r.label}以下 ${r.model}（${r.released}発売・${r.storage}） 相場${man(r.median)}円`),
    "",
    `選び方: 相場が予算の帯（3万円以下・3万超〜5万・5万超〜7万・7万超〜10万円）に入る iPhone 12 シリーズ以降と SE (第3世代) のうち、相場がいちばん高い機種（同じなら発売の新しい方・在庫5件以上。帯に機種がなければ、相場が予算以下で発売年のいちばん新しい機種）。データ: 大手中古ショップ${shopCount}店の在庫（相場＝在庫がいちばん多い容量の中央値・${date.replace(/-/g, "/")}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${pick.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(pick.model)}?${utm(date)}`,
    `${pick.label}以下で買える中古iPhone: https://used.gadelog.com${budgetPath(PICK_BUDGET)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "budget",
    date,
    shopCount,
    scenes: {
      budgets: { rows: rows.map(({ count: _n, ...r }) => (void _n, r)) },
      pick,
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${date.replace(/-/g, "/")}`,
        question: "あなたの予算なら…？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
