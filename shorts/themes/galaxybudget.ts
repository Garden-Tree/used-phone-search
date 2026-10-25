/**
 * テーマ「予算ぴったりで買える中古Galaxyは？」: budget（iPhone）と同じ選び方・同じ場面で、折りたたみでない Galaxy（S・A シリーズ）だけから選ぶ → 台本（10/25〜）
 * 再生の多かった予算別（iPhone 1,081回・iPad 1,072回）と、Galaxy の出た折りたたみ（1,077回）から。折りたたみは foldbudget で出したので除く
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は lib/galaxyCatalog.ts の Galaxy のうち Z Fold・Z Flip を除く機種（GALAXY_BAR_MODELS）で、在庫が MIN_COUNT 件以上の機種
 * - 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ数字）
 * - 予算ごとの機種は budget と同じ（pickBudgetModels。帯 (前の予算, 予算] で相場がいちばん高い機種・同じなら発売の新しい方）
 * - 予算は GALAXY_SHORT_BUDGETS。plan が帯ごとの候補を毎回出すので、空の帯ができたら見直す
 * - 注目（reveal）は GALAXY_PICK_BUDGET（4つの予算の2番目。budget の「2番目の予算」と同じ決め方）の行に固定。出すのは相場（容量つき）・在庫数
 * - この回の切り口: 各行と注目に画面の大きさ（lib/galaxySpecs.ts の display。ドコモの製品仕様などで確かめた値）と日本での発売年月
 * DB は機種ごとの集計（groupBy と中央値の1行）だけ。在庫の行を丸ごと取らない
 */
import { getModelMarket } from "@/lib/marketStats";
import { budgetLabel } from "@/lib/budgets";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { specOf } from "@/lib/iphoneSpecs";
import { GALAXY_MODELS, GALAXY_RELEASED } from "@/lib/galaxyCatalog";
import { jaMonth } from "@/lib/pixelCatalog";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { BudgetRow, BudgetScript } from "../types";
import { MIN_COUNT, bandsText, pickBudgetModels } from "./budget";

/** 対象の Galaxy（折りたたみの Z Fold・Z Flip を除く S・A シリーズ） */
export const GALAXY_BAR_MODELS = GALAXY_MODELS.filter((m) => !/^Galaxy Z /.test(m));
/** 動画に出す予算（4行） */
// 3万・4万・7万・9万円: 10/24 の相場（2.7万・3.8万・6.2万・8.9万円）に予算が近く「ぴったり」に見えるように（ユーザーの指示）
export const GALAXY_SHORT_BUDGETS = [30000, 40000, 70000, 90000];
/** 注目にする予算（4つの予算の2番目） */
export const GALAXY_PICK_BUDGET = 40000;

const man = (n: number) => n.toLocaleString();
/** 発売の新しさ（"2024-04" → 2024*12+4） */
const ageOf = (model: string) => {
  const [y, m] = (GALAXY_RELEASED[model] ?? "0-0").split("-").map(Number);
  return y * 12 + m;
};
/** 「画面6.2インチ」（lib/galaxySpecs.ts） */
const specLine = (model: string) => {
  const d = specOf(model)?.display;
  return d ? `画面${d}インチ` : "";
};
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_galaxybudget`;

export async function buildGalaxyBudgetScript(date: string): Promise<BudgetScript> {
  const market = await getModelMarket(GALAXY_BAR_MODELS);
  const cands = [...market].filter(([, r]) => r.count >= MIN_COUNT);
  const rows: (BudgetRow & { count: number })[] = pickBudgetModels(cands, ageOf, "Galaxy", GALAXY_SHORT_BUDGETS).map(({ budget, model, r }) => ({
    budget, label: budgetLabel(budget), model, storage: r.medianStorage ? storageLabel(r.medianStorage, model) : "", median: r.medianPrice,
    released: jaMonth(GALAXY_RELEASED[model]), spec: specLine(model), count: r.count,
  }));
  // 帯ごとの候補の数（予算の段を決め直すときの目安）
  GALAXY_SHORT_BUDGETS.forEach((b, i) => {
    const prev = i ? GALAXY_SHORT_BUDGETS[i - 1] : 0;
    const inBand = cands.filter(([, r]) => r.medianPrice > prev && r.medianPrice <= b);
    console.log(`  帯 ${prev ? `${budgetLabel(prev)}超` : ""}〜${budgetLabel(b)}: ${inBand.length}機種（${inBand.map(([m, r]) => `${m} ${man(r.medianPrice)}円・${r.count}件`).join("・")}）`);
  });
  const above = cands.filter(([, r]) => r.medianPrice > GALAXY_SHORT_BUDGETS[GALAXY_SHORT_BUDGETS.length - 1]);
  console.log(`  予算より上: ${above.map(([m, r]) => `${m} ${man(r.medianPrice)}円・${r.count}件`).join("・") || "なし"}`);
  const { count, ...pickRow } = rows.find((r) => r.budget === GALAXY_PICK_BUDGET) ?? rows[0];
  const pick = { ...pickRow, count };

  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。Android はキャリア版と SIM フリー版があり、使える回線（バンド）が違う
  const lines = ["キャリア版は", "使う回線に対応か", "確認しましょう"];

  const rawTitle = `${pick.label}なら${pick.model}！予算ぴったりで買える中古Galaxy`;
  const title = rawTitle.length <= 60 ? rawTitle : `予算ぴったりで買える中古Galaxy（${GALAXY_SHORT_BUDGETS.map(budgetLabel).join("・")}）`;
  const bands = bandsText(GALAXY_SHORT_BUDGETS);
  const description = [
    `予算ごとに、相場で買えるいちばん上の中古Galaxy（S・A シリーズ）です。${pick.label}なら${pick.model}（${pick.released}発売・${pick.storage}・${pick.spec}・相場${man(pick.median)}円・在庫${man(pick.count)}台）。`,
    "",
    ...rows.map((r) => `${r.label}以下 ${r.model}（${r.released}発売・${r.storage}・${r.spec}） 相場${man(r.median)}円`),
    "",
    `選び方: 相場が予算の帯（${bands}）に入る Galaxy（折りたたみの Z Fold・Z Flip を除く）のうち、相場がいちばん高い機種（同じなら発売の新しい方・在庫${MIN_COUNT}件以上。帯に機種がなければ、相場が予算以下で発売のいちばん新しい機種）。画面の大きさはドコモの製品仕様など公式の値、発売は日本での発売月。データ: 大手中古ショップ${shopCount}店の在庫（相場＝在庫がいちばん多い容量の中央値・${date.replace(/-/g, "/")}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${pick.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(pick.model)}?${utm(date)}`,
    `中古Galaxyの全機種の相場: https://used.gadelog.com/galaxy?${utm(date)}`,
  ].join("\n");

  return {
    theme: "galaxybudget",
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
    youtube: { title, description, hashtags: ["#Galaxy", "#中古スマホ"] },
  };
}
