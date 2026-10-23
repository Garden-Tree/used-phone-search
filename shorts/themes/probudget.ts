/**
 * テーマ「予算ぴったりで買える中古iPhone Proは？」: budget（iPhone）と同じ選び方・同じ場面で、Pro と Pro Max だけから選ぶ → 台本（10/24〜）
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は iPhone 13 Pro 以降の Pro・Pro Max（PRO_MODELS。12 Pro 以前は出さない）で、在庫が MIN_COUNT 件以上の機種
 * - 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ数字）
 * - 予算ごとの機種は budget と同じ（pickBudgetModels。帯 (前の予算, 予算] で相場がいちばん高い機種・同じなら発売年の新しい方）
 * - 予算は 7万・10万・15万・20万円（PRO_SHORT_BUDGETS）。10/24 時点で在庫5件以上の Pro の相場は最安が iPhone 13 Pro の 65,980円で、
 *   5万円以下の帯は空。7万円以下に1機種・7万超〜10万に2機種・10万超〜15万に3機種・15万超〜20万に3機種あり、空の帯ができない（plan が毎回出す）
 * - 注目（reveal）は PRO_PICK_BUDGET（10万円＝4つの予算の2番目。budget の「2番目の予算」と同じ決め方）の行に固定。出すのは相場（容量つき）・在庫数
 * - この回の切り口: 各行と注目に画面の大きさと端子（「6.1インチ・Lightning」。lib/iphoneSpecs.ts・Apple 公式）。
 *   Pro は 14 Pro まで Lightning、15 Pro から USB-C で、同じ予算帯でも端子が分かれる
 * DB は機種ごとの集計（groupBy と中央値の1行）だけ。在庫の行を丸ごと取らない
 */
import { getModelMarket } from "@/lib/marketStats";
import { budgetLabel } from "@/lib/budgets";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { specOf } from "@/lib/iphoneSpecs";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { BudgetRow, BudgetScript } from "../types";
import { MIN_COUNT, pickBudgetModels } from "./budget";

/** 対象の Pro・Pro Max（13 Pro 以降。18 は在庫が MIN_COUNT 件以上なら入る） */
export const PRO_MODELS = [13, 14, 15, 16, 17, 18].flatMap((g) => [`iPhone ${g} Pro`, `iPhone ${g} Pro Max`]);
/** 動画に出す予算（4行）。Pro は7万円から（上の説明） */
export const PRO_SHORT_BUDGETS = [70000, 100000, 150000, 200000];
/** 注目にする予算（4つの予算の2番目） */
export const PRO_PICK_BUDGET = 100000;

const man = (n: number) => n.toLocaleString();
const yearOf = (model: string) => Number(specOf(model)?.released.replace("年", "") ?? 0);
/** 画面の大きさと端子（Apple 公式の技術仕様。lib/iphoneSpecs.ts） */
const specLine = (model: string) => {
  const sp = specOf(model);
  return sp ? `${sp.display}インチ・${sp.port}` : "";
};
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_probudget`;

export async function buildProBudgetScript(date: string): Promise<BudgetScript> {
  const market = await getModelMarket(PRO_MODELS);
  const cands = [...market].filter(([m, r]) => r.count >= MIN_COUNT && specOf(m));
  const rows: (BudgetRow & { count: number })[] = pickBudgetModels(cands, yearOf, " iPhone Pro ", PRO_SHORT_BUDGETS).map(({ budget, model, r }) => ({
    budget, label: budgetLabel(budget), model, storage: r.medianStorage ? storageLabel(r.medianStorage, model) : "", median: r.medianPrice,
    released: specOf(model)!.released, spec: specLine(model), count: r.count,
  }));
  // 帯ごとの候補の数（予算の段を決め直すときの目安）
  PRO_SHORT_BUDGETS.forEach((b, i) => {
    const prev = i ? PRO_SHORT_BUDGETS[i - 1] : 0;
    const inBand = cands.filter(([, r]) => r.medianPrice > prev && r.medianPrice <= b);
    console.log(`  帯 ${prev ? `${budgetLabel(prev)}超` : ""}〜${budgetLabel(b)}: ${inBand.length}機種（${inBand.map(([m, r]) => `${m} ${man(r.medianPrice)}円`).join("・")}）`);
  });
  const { count, ...pickRow } = rows.find((r) => r.budget === PRO_PICK_BUDGET) ?? rows[0];
  const pick = { ...pickRow, count };

  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。注目の機種が Lightning なら端子、USB-C なら電池
  const lines = specOf(pick.model)?.port === "Lightning"
    ? ["14 Proまでは", "Lightning端子です", "ケーブルも確認しましょう"]
    : ["Proでも中古は", "バッテリー85%以上を", "選びましょう"];

  const rawTitle = `${pick.label}なら${pick.model}！予算ぴったりで買える中古iPhone Pro`;
  const title = rawTitle.length <= 60 ? rawTitle : `予算ぴったりで買える中古iPhone Pro（${PRO_SHORT_BUDGETS.map(budgetLabel).join("・")}）`;
  // 予算の帯の書き方（「7万円以下・7万超〜10万・10万超〜15万・15万超〜20万円」）
  const bands = PRO_SHORT_BUDGETS.map((b, i) => (i === 0 ? `${budgetLabel(b)}以下` : `${PRO_SHORT_BUDGETS[i - 1] / 10000}万超〜${b / 10000}万${i === PRO_SHORT_BUDGETS.length - 1 ? "円" : ""}`)).join("・");
  const description = [
    `予算ごとに、相場で買えるいちばん上の中古iPhone Pro・Pro Maxです。${pick.label}なら${pick.model}（${pick.released}発売・${pick.storage}・${pick.spec}・相場${man(pick.median)}円・在庫${man(pick.count)}台）。`,
    "",
    ...rows.map((r) => `${r.label}以下 ${r.model}（${r.released}発売・${r.storage}・${r.spec}） 相場${man(r.median)}円`),
    "",
    `選び方: 相場が予算の帯（${bands}）に入る iPhone 13 Pro 以降の Pro・Pro Max のうち、相場がいちばん高い機種（同じなら発売の新しい方・在庫${MIN_COUNT}件以上。帯に機種がなければ、相場が予算以下で発売年のいちばん新しい機種）。相場5万円以下の Pro がないため、予算は7万円から。画面の大きさと端子は Apple 公式の技術仕様。データ: 大手中古ショップ${shopCount}店の在庫（相場＝在庫がいちばん多い容量の中央値・${date.replace(/-/g, "/")}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${pick.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(pick.model)}?${utm(date)}`,
    `中古iPhoneはどこで買う？（店ごとの比較）: https://used.gadelog.com/iphone/where-to-buy?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "probudget",
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
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhonePro"] },
  };
}
