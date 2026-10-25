/**
 * テーマ「予算ぴったりで買える中古折りたたみスマホは？」: budget（iPhone）と同じ選び方・同じ場面で、Galaxy Z Fold・Flip と Pixel の Fold だけから選ぶ → 台本（10/24〜）
 * 再生の多かった2つ（予算別 iPhone 1,079回・折りたたみ1世代前 1,074回）を合わせた回
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は lib/galaxyCatalog.ts の Galaxy Z Fold・Z Flip と lib/pixelCatalog.ts の Fold（Pixel Fold・Pixel 9〜11 Pro Fold）で、在庫が MIN_COUNT 件以上の機種（FOLD_MODELS）。
 *   Pixel は Google のアップデート保証が作成月の時点で終わった機種を除く（pixelbudget と同じ）
 * - 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ数字）
 * - 予算ごとの機種は budget と同じ（pickBudgetModels。帯 (前の予算, 予算] で相場がいちばん高い機種・同じなら発売の新しい方）
 * - 予算は 5万・10万・15万・20万円（FOLD_SHORT_BUDGETS）。10/24 時点で在庫5件以上の折りたたみは相場 3.8万〜27.5万円で、
 *   5万円以下に2機種・5万超〜10万に4機種・10万超〜15万に3機種・15万超〜20万に3機種あり、空の帯ができない（plan が毎回出す）
 * - 注目（reveal）は FOLD_PICK_BUDGET（10万円＝4つの予算の2番目。budget の「2番目の予算」と同じ決め方）の行に固定。出すのは相場（容量つき）・在庫数
 * - この回の切り口: 各行と注目に「Fold型／Flip型」（機種名から）と開いたときの画面の大きさ（lib/galaxySpecs.ts・lib/pixelSpecs.ts の displayInner。
 *   Galaxy はドコモの製品仕様・Pixel は Google の技術仕様で確かめた値）と発売年月
 * DB は機種ごとの集計（groupBy と中央値の1行）だけ。在庫の行を丸ごと取らない
 */
import { getModelMarket } from "@/lib/marketStats";
import { budgetLabel } from "@/lib/budgets";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { specOf } from "@/lib/iphoneSpecs";
import { GALAXY_MODELS, GALAXY_RELEASED } from "@/lib/galaxyCatalog";
import { PIXEL_INFO, PIXEL_MODELS, jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { BudgetRow, BudgetScript } from "../types";
import { MIN_COUNT, bandsText, pickBudgetModels, type BudgetOpts } from "./budget";

/** 対象の折りたたみ（Galaxy Z Fold・Z Flip と Pixel の Fold） */
export const FOLD_MODELS = [...GALAXY_MODELS.filter((m) => /^Galaxy Z (Fold|Flip)/.test(m)), ...PIXEL_MODELS.filter((m) => /Fold$/.test(m))];
/** 動画に出す予算（4行）。上の説明 */
export const FOLD_SHORT_BUDGETS = [50000, 100000, 150000, 200000];
/** 注目にする予算（4つの予算の2番目） */
export const FOLD_PICK_BUDGET = 100000;

const man = (n: number) => n.toLocaleString();
/** 発売の年月（"2023-09"） */
const releasedYm = (model: string) => GALAXY_RELEASED[model] ?? PIXEL_INFO[model]?.available ?? "0-0";
/** 発売の新しさ（"2023-09" → 2023*12+9） */
const ageOf = (model: string) => {
  const [y, m] = releasedYm(model).split("-").map(Number);
  return y * 12 + m;
};
/** 「Flip型・開いて6.7インチ」（型は機種名の Fold／Flip。画面は開いたときの内側。lib/galaxySpecs.ts・lib/pixelSpecs.ts） */
const specLine = (model: string) => {
  const inner = specOf(model)?.displayInner;
  const kind = /Flip/.test(model) ? "Flip型" : "Fold型";
  return inner ? `${kind}・開いて${inner}インチ` : kind;
};
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_foldbudget`;

export async function buildFoldBudgetScript(date: string, opts: BudgetOpts = {}): Promise<BudgetScript> {
  const budgets = opts.budgets ?? FOLD_SHORT_BUDGETS;
  const pickBudget = opts.pick ?? FOLD_PICK_BUDGET;
  const month = date.slice(0, 7);
  const market = await getModelMarket(FOLD_MODELS);
  const cands = [...market].filter(([m, r]) => {
    const left = updateYearsLeft(m, month);
    if (left !== undefined && left <= 0) {
      console.log(`  対象外: ${m}（アップデート保証が ${jaMonth(updateUntil(m)!)} で終了）`);
      return false;
    }
    return r.count >= MIN_COUNT;
  });
  const rows: (BudgetRow & { count: number })[] = pickBudgetModels(cands, ageOf, "折りたたみスマホ", budgets).map(({ budget, model, r }) => ({
    budget, label: budgetLabel(budget), model, storage: r.medianStorage ? storageLabel(r.medianStorage, model) : "", median: r.medianPrice,
    released: jaMonth(releasedYm(model)), spec: specLine(model), count: r.count,
  }));
  // 帯ごとの候補の数（予算の段を決め直すときの目安）
  budgets.forEach((b, i) => {
    const prev = i ? budgets[i - 1] : 0;
    const inBand = cands.filter(([, r]) => r.medianPrice > prev && r.medianPrice <= b);
    console.log(`  帯 ${prev ? `${budgetLabel(prev)}超` : ""}〜${budgetLabel(b)}: ${inBand.length}機種（${inBand.map(([m, r]) => `${m} ${man(r.medianPrice)}円・${r.count}件`).join("・")}）`);
  });
  const { count, ...pickRow } = rows.find((r) => r.budget === pickBudget) ?? rows[0];
  const pick = { ...pickRow, count };

  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。fold と同じく折りたたみならではの確認（折り目・ヒンジ）
  const lines = ["折りたたみの中古は", "折り目とヒンジを", "確認しましょう"];

  const rawTitle = `${pick.label}なら${pick.model}！予算ぴったりで買える中古折りたたみスマホ`;
  const title = rawTitle.length <= 60 ? rawTitle : `予算ぴったりで買える中古折りたたみスマホ（${budgets.map(budgetLabel).join("・")}）`;
  const bands = bandsText(budgets);
  const description = [
    `予算ごとに、相場で買えるいちばん上の中古折りたたみスマホ（Galaxy Z Fold・Z Flip・Pixel の Fold）です。${pick.label}なら${pick.model}（${pick.released}発売・${pick.storage}・${pick.spec}・相場${man(pick.median)}円・在庫${man(pick.count)}台）。`,
    "",
    ...rows.map((r) => `${r.label}以下 ${r.model}（${r.released}発売・${r.storage}・${r.spec}） 相場${man(r.median)}円`),
    "",
    `選び方: 相場が予算の帯（${bands}）に入る Galaxy Z Fold・Z Flip と Pixel の Fold のうち、相場がいちばん高い機種（同じなら発売の新しい方・在庫${MIN_COUNT}件以上。帯に機種がなければ、相場が予算以下で発売のいちばん新しい機種）。Pixel は Google のアップデート保証が終わった機種を除いています。開いたときの画面の大きさは Galaxy がドコモの製品仕様、Pixel が Google の技術仕様。データ: 大手中古ショップ${shopCount}店の在庫（相場＝在庫がいちばん多い容量の中央値・${date.replace(/-/g, "/")}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${pick.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(pick.model)}?${utm(date)}`,
    `中古Galaxyの全機種の相場: https://used.gadelog.com/galaxy?${utm(date)}`,
    `中古Pixelの全機種の相場: https://used.gadelog.com/pixel?${utm(date)}`,
  ].join("\n");

  return {
    theme: "foldbudget",
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
    youtube: { title, description, hashtags: ["#折りたたみスマホ", "#Galaxy"] },
  };
}
