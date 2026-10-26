/**
 * テーマ「予算ぴったりで買える 大きい画面の中古iPhoneは？」: budget（iPhone）と同じ選び方・同じ場面で、画面 6.5インチ以上の iPhone だけから選ぶ → 台本（10/26〜）
 * 予算別（再生の多い型）と、大画面（plusmax）の組み合わせ
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は ALL_CATALOG_MODELS のうち lib/iphoneSpecs.ts の display が 6.5インチ以上の iPhone（BIG_MODELS: 11 Pro Max・12〜18 の Pro Max・14〜16 Plus・Air）。
 *   iPhone XS Max（6.5インチ）は iOS 27 に対応しないので除く。在庫が MIN_COUNT 件以上の機種
 * - 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ数字）
 * - 予算ごとの機種は budget と同じ（pickBudgetModels。帯 (下端, 予算] で相場がいちばん高い機種・同じなら発売年の新しい方）
 * - 予算は BIG_SHORT_BUDGETS（5万・8万・11万・15万円）。plan が帯ごとの候補を毎回出すので、空の帯ができたら見直す
 * - 注目（reveal）は BIG_PICK_BUDGET（8万円＝4つの予算の2番目）の行に固定。出すのは相場（容量つき）・在庫数
 * - この回の切り口: 各行と注目に画面の大きさ（「画面6.7インチ」。lib/iphoneSpecs.ts・Apple 公式）と発売年
 * DB は機種ごとの集計（groupBy と中央値の1行）だけ。在庫の行を丸ごと取らない
 */
import { getModelMarket } from "@/lib/marketStats";
import { budgetLabel } from "@/lib/budgets";
import { ALL_CATALOG_MODELS, modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { specOf } from "@/lib/iphoneSpecs";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { BudgetRow, BudgetScript } from "../types";
import { MIN_COUNT, bandsText, pickBudgetModels } from "./budget";

/** 「大きい画面」の下限（インチ。Apple 公式の技術仕様の値） */
export const BIG_DISPLAY = 6.5;
/** 対象の iPhone（画面 6.5インチ以上。XS Max は iOS 27 非対応なので除く） */
export const BIG_MODELS = ALL_CATALOG_MODELS.filter((m) => m !== "iPhone XS Max" && (specOf(m)?.display ?? 0) >= BIG_DISPLAY);
/** 動画に出す予算（4行） */
export const BIG_SHORT_BUDGETS = [50000, 80000, 110000, 150000];
/** 注目にする予算（4つの予算の2番目） */
export const BIG_PICK_BUDGET = 80000;

const man = (n: number) => n.toLocaleString();
const yearOf = (model: string) => Number(specOf(model)?.released.replace("年", "") ?? 0);
/** 「画面6.7インチ」（lib/iphoneSpecs.ts・Apple 公式） */
const specLine = (model: string) => {
  const d = specOf(model)?.display;
  return d ? `画面${d}インチ` : "";
};
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_bigbudget`;

export async function buildBigBudgetScript(date: string): Promise<BudgetScript> {
  const market = await getModelMarket(BIG_MODELS);
  const cands = [...market].filter(([m, r]) => r.count >= MIN_COUNT && specOf(m));
  const rows: (BudgetRow & { count: number })[] = pickBudgetModels(cands, yearOf, "大きい画面の iPhone", BIG_SHORT_BUDGETS).map(({ budget, model, r }) => ({
    budget, label: budgetLabel(budget), model, storage: r.medianStorage ? storageLabel(r.medianStorage, model) : "", median: r.medianPrice,
    released: specOf(model)!.released, spec: specLine(model), count: r.count,
  }));
  // 帯ごとの候補の数（予算の段を決め直すときの目安）
  BIG_SHORT_BUDGETS.forEach((b, i) => {
    const prev = i ? BIG_SHORT_BUDGETS[i - 1] : 0;
    const inBand = cands.filter(([, r]) => r.medianPrice > prev && r.medianPrice <= b);
    console.log(`  帯 ${prev ? `${budgetLabel(prev)}超` : ""}〜${budgetLabel(b)}: ${inBand.length}機種（${inBand.map(([m, r]) => `${m} ${man(r.medianPrice)}円・${r.count}件`).join("・")}）`);
  });
  const above = cands.filter(([, r]) => r.medianPrice > BIG_SHORT_BUDGETS[BIG_SHORT_BUDGETS.length - 1]);
  console.log(`  予算より上: ${above.map(([m, r]) => `${m} ${man(r.medianPrice)}円・${r.count}件`).join("・") || "なし"}`);
  const { count, ...pickRow } = rows.find((r) => r.budget === BIG_PICK_BUDGET) ?? rows[0];
  const pick = { ...pickRow, count };

  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。Apple の保証外の画面修理は Plus・Air 57,800円・Pro Max 64,800円で、
  // 無印（16 は 45,800円）より高い（lib/appleRepairPrices.ts）。ひと言には数字を出さない
  const lines = ["大きい画面は", "画面の修理代が", "高めです"];

  const rawTitle = `${pick.label}なら${pick.model}！予算ぴったりで買える大きい画面の中古iPhone`;
  const title = rawTitle.length <= 60 ? rawTitle : `予算ぴったりで買える大きい画面の中古iPhone（${BIG_SHORT_BUDGETS.map(budgetLabel).join("・")}）`;
  const bands = bandsText(BIG_SHORT_BUDGETS);
  const description = [
    `予算ごとに、相場で買えるいちばん上の「大きい画面（${BIG_DISPLAY}インチ以上）」の中古iPhoneです。${pick.label}なら${pick.model}（${pick.released}発売・${pick.storage}・${pick.spec}・相場${man(pick.median)}円・在庫${man(pick.count)}台）。`,
    "",
    ...rows.map((r) => `${r.label}以下 ${r.model}（${r.released}発売・${r.storage}・${r.spec}） 相場${man(r.median)}円`),
    "",
    `選び方: 相場が予算の帯（${bands}）に入る、画面${BIG_DISPLAY}インチ以上の iPhone（Plus・Pro Max・Air。iOS 27 に対応しない XS Max は除く）のうち、相場がいちばん高い機種（同じなら発売の新しい方・在庫${MIN_COUNT}件以上）。画面の大きさは Apple 公式の技術仕様。データ: 大手中古ショップ${shopCount}店の在庫（相場＝在庫がいちばん多い容量の中央値・${date.replace(/-/g, "/")}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${pick.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(pick.model)}?${utm(date)}`,
    `中古iPhoneの全機種の相場: https://used.gadelog.com/iphone?${utm(date)}`,
  ].join("\n");

  return {
    theme: "bigbudget",
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
