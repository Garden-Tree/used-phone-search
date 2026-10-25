/**
 * テーマ「予算ぴったりで買える中古Pixelは？」: budget（iPhone）と同じ選び方・同じ場面で Google Pixel を選ぶ → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は Pixel のカタログ（lib/pixelCatalog.ts の PIXEL_MODELS）のうち、Google のアップデート保証が終わっていない機種（作成月の時点で updateYearsLeft > 0）で、
 *   在庫が MIN_COUNT 件以上の機種（10/22 は Pixel 6・6 Pro が 2026年10月で終了のため出さない）
 * - 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ数字）
 * - 予算ごとの機種は budget と同じ（pickBudgetModels。帯 (前の予算, 予算] で相場がいちばん高い機種・同じなら販売開始の新しい方）
 * - 注目（reveal）は PICK_BUDGET（5万円）の行に固定。出すのは相場（容量つき）・在庫数・アップデート保証の終わり
 * - Pixel は機種でアップデート保証の年数が違う（8 以降は7年・6〜7 と Fold は5年）ので、各行にアップデート保証の終わりを添える（この回の切り口）
 * DB は機種ごとの集計（groupBy と中央値の1行）だけ。在庫の行を丸ごと取らない
 */
import { getModelMarket } from "@/lib/marketStats";
import { budgetLabel, budgetPath } from "@/lib/budgets";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { PIXEL_INFO, PIXEL_MODELS, jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { BudgetRow, BudgetScript } from "../types";
import { MIN_COUNT, PICK_BUDGET, SHORT_BUDGETS, bandsText, pickBudgetModels, type BudgetOpts } from "./budget";

const man = (n: number) => n.toLocaleString();
/** 販売開始の新しさ（"2024-05" → 2024*12+5） */
const ageOf = (model: string) => {
  const [y, m] = (PIXEL_INFO[model]?.available ?? "0-0").split("-").map(Number);
  return y * 12 + m;
};
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_pixelbudget`;

export async function buildPixelBudgetScript(date: string, opts: BudgetOpts = {}): Promise<BudgetScript> {
  const budgets = opts.budgets ?? SHORT_BUDGETS;
  const pickBudget = opts.pick ?? PICK_BUDGET;
  const month = date.slice(0, 7);
  const market = await getModelMarket(PIXEL_MODELS);
  const ended: string[] = [];
  const cands = [...market].filter(([m, r]) => {
    const left = updateYearsLeft(m, month);
    if (left !== undefined && left <= 0) {
      ended.push(m);
      console.log(`  対象外: ${m}（アップデート保証が ${jaMonth(updateUntil(m)!)} で終了）`);
    }
    return r.count >= MIN_COUNT && left !== undefined && left > 0;
  });
  const rows: (BudgetRow & { count: number })[] = pickBudgetModels(cands, ageOf, " Pixel（アップデート保証あり）", budgets).map(({ budget, model, r }) => ({
    budget, label: budgetLabel(budget), model, storage: r.medianStorage ? storageLabel(r.medianStorage, model) : "", median: r.medianPrice,
    released: jaMonth(PIXEL_INFO[model].available), updateUntil: updateUntil(model)!, count: r.count,
  }));
  const { count, ...pickRow } = rows.find((r) => r.budget === pickBudget) ?? rows[0];
  const pick = { ...pickRow, count };

  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。Pixel はアップデート保証の年数が機種で違う（5年・7年。lib/pixelCatalog.ts）
  const lines = ["Pixelは機種ごとに", "アップデート期限を", "確認しましょう"];

  const rawTitle = `${pick.label}なら${pick.model}！予算ぴったりで買える中古Pixel`;
  const title = rawTitle.length <= 60 ? rawTitle : `予算ぴったりで買える中古Pixel（${budgets.map(budgetLabel).join("・")}）`;
  const description = [
    `予算ごとに、相場で買えるいちばん上の中古Google Pixelです。${pick.label}なら${pick.model}（${pick.storage}・相場${man(pick.median)}円・在庫${man(pick.count)}台・アップデート保証は${jaMonth(pick.updateUntil!)}まで）。`,
    "",
    ...rows.map((r) => `${r.label}以下 ${r.model}（${r.released}発売・${r.storage}） 相場${man(r.median)}円・アップデート保証 ${jaMonth(r.updateUntil!)}まで`),
    "",
    `選び方: 相場が予算の帯（${bandsText(budgets)}）に入る Pixel のうち、相場がいちばん高い機種（同じなら販売開始の新しい方・在庫${MIN_COUNT}件以上。帯に機種がなければ、相場が予算以下でいちばん新しい機種）。${ended.length ? `Google のアップデート保証が終わった機種（${ended.join("・")}）は除いています。` : "Google のアップデート保証が終わった機種は除いています。"}アップデート保証の期限は Google 公式の「販売開始から5年／7年」から。データ: 大手中古ショップ${shopCount}店の在庫（相場＝在庫がいちばん多い容量の中央値・${date.replace(/-/g, "/")}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${pick.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(pick.model)}?${utm(date)}`,
    `${pick.label}以下で買える中古Pixel: https://used.gadelog.com${budgetPath(pick.budget, "pixel")}?${utm(date)}`,
    `中古Pixelの全機種の相場: https://used.gadelog.com/pixel?${utm(date)}`,
  ].join("\n");

  return {
    theme: "pixelbudget",
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
    youtube: { title, description, hashtags: ["#Pixel", "#中古スマホ"] },
  };
}
