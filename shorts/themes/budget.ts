/**
 * テーマ「○万円で買える中古iPhone、いちばん新しいのは？」: DB の集計 → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は iOS 27 対応の iPhone（ALL_CATALOG_MODELS。drops と同じ）で、在庫が MIN_COUNT 件以上の機種
 * - 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ数字）
 * - 予算ごとに「相場が予算以下」の機種のうち、発売年（lib/iphoneSpecs.ts の released。Apple 公式で確かめた値）がいちばん新しい機種。
 *   同じ年なら相場の高い方（＝その予算でいちばん上のモデル）
 * - 注目（reveal）は PICK_BUDGET（5万円）の行の機種に固定。最安と在庫数はジャンク品を除く（予算別ページ /budget/under-N と同じ条件）
 * DB は機種ごとの集計（groupBy と中央値の1行）だけ。在庫の行を丸ごと取らない
 */
import { getModelMarket } from "@/lib/marketStats";
import { NOT_JUNK, minPriceByModel } from "@/lib/budgetStats";
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
const MIN_COUNT = 5;

const man = (n: number) => n.toLocaleString();
const yearOf = (model: string) => Number(specOf(model)?.released.replace("年", "") ?? 0);
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_budget`;

export async function buildBudgetScript(date: string): Promise<BudgetScript> {
  const market = await getModelMarket(ALL_CATALOG_MODELS);
  const cands = [...market].filter(([m, r]) => r.count >= MIN_COUNT && yearOf(m) > 0);
  const rows: BudgetRow[] = [];
  for (const budget of SHORT_BUDGETS) {
    const fit = cands.filter(([, r]) => r.medianPrice <= budget)
      .sort(([a, ra], [b, rb]) => yearOf(b) - yearOf(a) || rb.medianPrice - ra.medianPrice);
    if (!fit.length) throw new Error(`相場が ${budgetLabel(budget)} 以下の iOS 27 対応 iPhone がありません`);
    const [model, r] = fit[0];
    rows.push({ budget, label: budgetLabel(budget), model, storage: r.medianStorage ? storageLabel(r.medianStorage, model) : "", median: r.medianPrice, released: specOf(model)!.released });
  }
  const pickRow = rows.find((r) => r.budget === PICK_BUDGET) ?? rows[0];
  const nj = (await minPriceByModel({ isSoldOut: false, ...NOT_JUNK }, [pickRow.model])).get(pickRow.model);
  if (!nj) throw new Error(`${pickRow.model} のジャンク品を除く在庫がありません`);
  const pick = { ...pickRow, minPrice: nj.minPrice, count: nj.count };

  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（人が書き換える前提・1行16字以内・3行まで）。予算で選ぶ人は古めの機種になりやすいので、バッテリーと利用制限
  const lines = ["予算内でも", "バッテリー85%以上と", "利用制限○を確認しましょう"];

  const rawTitle = `${pick.label}なら${pick.model}！予算で買えるいちばん新しい中古iPhone`;
  const title = rawTitle.length <= 60 ? rawTitle : `予算で買えるいちばん新しい中古iPhone（${SHORT_BUDGETS.map(budgetLabel).join("・")}）`;
  const description = [
    `予算ごとに、相場で買えるいちばん新しい中古iPhoneです。${pick.label}なら${pick.model}（${pick.storage}・相場${man(pick.median)}円）。`,
    "",
    ...rows.map((r) => `${r.label}以下 ${r.model}（${r.released}発売・${r.storage}） 相場${man(r.median)}円`),
    "",
    `${pick.model}はジャンク品を除いて在庫${man(pick.count)}台・最安${man(pick.minPrice)}円（${date.replace(/-/g, "/")}時点）。`,
    "",
    `選び方: iOS 27 対応の iPhone のうち、相場が予算以下で発売年がいちばん新しい機種（同じ年なら相場の高い方）。データ: 大手中古ショップ${shopCount}店の在庫（相場＝在庫がいちばん多い容量の中央値）。`,
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
      budgets: { rows },
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
