/**
 * テーマ「予算ぴったりで買える中古Apple Watchは？」: budget・macbudget・ipadbudget と同じ選び方・同じ場面で Apple Watch を選ぶ → 台本（10/29〜）
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は lib/watchCatalog.ts の機種（WATCH_MODELS。Series 6 以降・Ultra 全世代・SE 全世代）
 * - ケース（DB の storage＝mm）は watchgen と同じ決め方: 機種ごとに在庫がいちばん多いサイズ（同じ数なら小さい方・サイズ不明は数えない。watchgen.ts の side）。
 *   相場＝そのサイズの中央値。そのサイズの在庫が MIN_COUNT 件以上の機種だけ
 * - 予算ごとの機種は budget と同じ（pickBudgetModels。帯 (max(前の予算, 予算−1万円), 予算] で相場がいちばん高い機種）。同じ相場なら新しい方（WATCH_CATALOG の並び）
 * - 予算は WATCH_SHORT_BUDGETS（相場を見て決めた。plan が帯ごとの候補を出すので、空の帯ができたら --budgets で見直す）
 * - 切り口: 各行と注目に watchOS 27 に対応するか（Apple 公式 apple.com/jp/watchos/。lib/watchCatalog.ts の watchOS27）。
 *   発売年は公式のページで確かめていない（watchCatalog.ts に持たない）ので出さない
 * - 注目（reveal）は WATCH_PICK_BUDGET（4つの予算の2番目）の行。出すのは相場（ケースのサイズつき）・在庫数（その機種の販売中の全在庫）・watchOS 27
 * DB は機種ごとのケースのサイズ別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { budgetLabel } from "@/lib/budgets";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import type { ModelMarket } from "@/lib/marketStats";
import { WATCH_MODELS, isWatchOS27 } from "@/lib/watchCatalog";
import { WATCH_SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { BudgetRow, BudgetScript } from "../types";
import { MIN_COUNT, bandsText, pickBudgetModels, type BudgetOpts } from "./budget";
import { medianOf, side } from "./watchgen";

/**
 * 動画に出す予算（4行）。10/29 の相場（ケースは在庫がいちばん多いサイズ）: SE 第1世代・Series 6 14,080円〜Ultra 4 141,980円。
 * 帯ごとの候補は 1万超〜2万 3機種・3万超〜4万 1機種（Series 9）・4万超〜5万 2機種・7万超〜8万 1機種（Ultra 2）で空にならない
 */
export const WATCH_SHORT_BUDGETS = [20000, 40000, 50000, 80000];
/** 注目にする予算（4つの予算の2番目。10/29 は watchOS 27 対応でいちばん安い Series の Series 9） */
export const WATCH_PICK_BUDGET = 40000;

const man = (n: number) => n.toLocaleString();
/** 新しさ（WATCH_MODELS は系統ごとに新しい順。系統をまたぐ比べは同じ相場のときだけ） */
const ageOf = (model: string) => -WATCH_MODELS.indexOf(model);
const os27 = (model: string) => (isWatchOS27(model) ? "watchOS 27対応" : "watchOS 27非対応");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_watchbudget`;

export async function buildWatchBudgetScript(date: string, opts: BudgetOpts = {}): Promise<BudgetScript> {
  const budgets = opts.budgets ?? WATCH_SHORT_BUDGETS;
  const pickBudget = opts.pick ?? WATCH_PICK_BUDGET;
  const cands: [string, ModelMarket][] = [];
  const total = new Map<string, number>();
  for (const model of WATCH_MODELS) {
    const s = await side(model);
    if (!s || s.count < MIN_COUNT) {
      console.log(`  対象外: ${model}（在庫がいちばん多いサイズの在庫 ${s?.count ?? 0}件）`);
      continue;
    }
    const med = await medianOf(s);
    cands.push([model, { medianPrice: med, medianStorage: s.size, minPrice: 0, count: s.count }]);
    total.set(model, s.total ?? s.count);
    console.log(`  候補: ${model}（${s.size}mm・${s.count}件／全${s.total}件） 相場 ${man(med)}円・${os27(model)}`);
  }
  const rows: (BudgetRow & { count: number })[] = pickBudgetModels(cands, ageOf, " Apple Watch ", budgets).map(({ budget, model, r }) => ({
    budget, label: budgetLabel(budget), model, storage: storageLabel(r.medianStorage!, model), median: r.medianPrice,
    released: "", spec: os27(model), count: total.get(model) ?? r.count,
  }));
  // 帯ごとの候補の数（予算の段を決め直すときの目安）
  budgets.forEach((b, i) => {
    const floor = Math.max(i ? budgets[i - 1] : 0, b - 10000);
    const band = cands.filter(([, r]) => r.medianPrice > floor && r.medianPrice <= b);
    console.log(`  帯 ${floor / 10000}万超〜${budgetLabel(b)}: ${band.length}機種（${band.map(([m, r]) => `${m.replace(/^Apple Watch /, "")} ${man(r.medianPrice)}`).join("・")}）`);
  });
  const { count, ...pickRow } = rows.find((r) => r.budget === pickBudget) ?? rows[1] ?? rows[0];
  const pick = { ...pickRow, count };

  const shopCount = (await activeShops(WATCH_SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。注目が watchOS 27 非対応なら、OS の更新の話。ほかは電池とバンド
  const lines = isWatchOS27(pick.model) ? ["中古のWatchは", "電池の最大容量を", "確認しましょう"] : ["watchOS 27に", "対応するかを", "確認しましょう"];

  const rawTitle = `${pick.label}なら${pick.model}！予算ぴったりで買える中古Apple Watch`;
  const title = rawTitle.length <= 60 ? rawTitle : `予算ぴったりで買える中古Apple Watch（${budgets.map(budgetLabel).join("・")}）`;
  const description = [
    `予算ごとに、相場で買えるいちばん上の中古Apple Watchです。${pick.label}なら${pick.model}（${pick.storage}・${pick.spec}・相場${man(pick.median)}円・在庫${man(pick.count)}台）。`,
    "",
    ...rows.map((r) => `${r.label}以下 ${r.model}（${r.storage}・${r.spec}） 相場${man(r.median)}円`),
    "",
    `選び方: 相場が予算の帯（${bandsText(budgets)}）に入る Apple Watch（Series 6 以降・Ultra・SE）のうち、相場がいちばん高い機種（在庫${MIN_COUNT}件以上）。ケースは機種ごとに在庫がいちばん多いサイズで、相場＝そのサイズの中央値。watchOS 27 の対応は Apple 公式（apple.com/jp/watchos/）。データ: 大手中古ショップ${shopCount}店の在庫（${date.replace(/-/g, "/")}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${pick.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(pick.model)}?${utm(date)}`,
    `Apple Watch 全機種の中古相場: https://used.gadelog.com/watch?${utm(date)}`,
  ].join("\n");

  return {
    theme: "watchbudget",
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
    youtube: { title, description, hashtags: ["#AppleWatch", "#中古"] },
  };
}
