/**
 * テーマ「予算ぴったりで買える中古MacBookは？」: budget（iPhone）・pixelbudget・ipadbudget と同じ選び方・同じ場面で MacBook を選ぶ → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は MacBook のカタログ（lib/macCatalog.ts の MAC_MODELS。macOS 27 対応の Apple シリコン機と MacBook Neo だけ）で、在庫が MIN_COUNT 件以上の機種
 * - 相場＝在庫がいちばん多い容量（SSD）の中央値（getModelMarket。サイトの相場と同じ数字）
 * - 予算ごとの機種は budget と同じ（pickBudgetModels。帯 (前の予算, 予算] で相場がいちばん高い機種・同じなら発売年の新しい方）
 * - 予算は 10万・15万・20万・30万円（MAC_SHORT_BUDGETS）。10/23 時点で在庫5件以上の MacBook の相場は最安が MacBook Air M1 の 81,980円で、
 *   5万・7万円の帯は空（予算以下の機種もない）。10万円以下に2機種・10万超〜15万に4機種・15万超〜20万に7機種・20万超〜30万に7機種あり、空の帯ができない
 * - 注目（reveal）は MAC_PICK_BUDGET（15万円＝4つの予算の2番目。budget の「2番目の予算」と同じ決め方）の行に固定。出すのは相場（容量つき）・在庫数・チップ
 * - MacBook は名前だけでは世代が分かりにくいので、各行にチップ（M1・M2…。lib/macCatalog.ts の MAC_INFO）と発売年を添える（この回の切り口）
 * DB は機種ごとの集計（groupBy と中央値の1行）だけ。在庫の行を丸ごと取らない
 */
import { getModelMarket } from "@/lib/marketStats";
import { budgetLabel } from "@/lib/budgets";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { MAC_INFO, MAC_MODELS } from "@/lib/macCatalog";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { BudgetRow, BudgetScript } from "../types";
import { MIN_COUNT, bandsText, pickBudgetModels } from "./budget";

/** 動画に出す予算（4行）。MacBook は10万円から（上の説明） */
export const MAC_SHORT_BUDGETS = [100000, 150000, 200000, 300000];
/** 注目にする予算（4つの予算の2番目） */
export const MAC_PICK_BUDGET = 150000;

const man = (n: number) => n.toLocaleString();
/** 発売年 */
const yearOf = (model: string) => MAC_INFO[model]?.year ?? 0;
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_macbudget`;

export async function buildMacBudgetScript(date: string): Promise<BudgetScript> {
  const market = await getModelMarket(MAC_MODELS);
  const cands = [...market].filter(([m, r]) => r.count >= MIN_COUNT && MAC_INFO[m]);
  const rows: (BudgetRow & { count: number })[] = pickBudgetModels(cands, yearOf, " MacBook ", MAC_SHORT_BUDGETS).map(({ budget, model, r }) => ({
    budget, label: budgetLabel(budget), model, storage: r.medianStorage ? storageLabel(r.medianStorage, model) : "", median: r.medianPrice,
    released: `${MAC_INFO[model].year}年`, chip: MAC_INFO[model].chip, count: r.count,
  }));
  // 帯ごとの候補の数（予算の段を決め直すときの目安）
  MAC_SHORT_BUDGETS.forEach((b, i) => {
    const prev = i ? MAC_SHORT_BUDGETS[i - 1] : 0;
    console.log(`  帯 ${prev ? `${budgetLabel(prev)}超` : ""}〜${budgetLabel(b)}: ${cands.filter(([, r]) => r.medianPrice > prev && r.medianPrice <= b).length}機種`);
  });
  const { count, ...pickRow } = rows.find((r) => r.budget === MAC_PICK_BUDGET) ?? rows[0];
  const pick = { ...pickRow, count };

  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。Apple シリコンの MacBook はメモリを後から増やせない
  const lines = ["メモリは後から", "増やせないので", "容量を確認しましょう"];

  const rawTitle = `${pick.label}なら${pick.model}！予算ぴったりで買える中古MacBook`;
  const title = rawTitle.length <= 60 ? rawTitle : `予算ぴったりで買える中古MacBook（${MAC_SHORT_BUDGETS.map(budgetLabel).join("・")}）`;
  // 予算の帯の書き方（「10万円以下・10万超〜15万・15万超〜20万・20万超〜30万円」）
  const bands = bandsText(MAC_SHORT_BUDGETS);
  const description = [
    `予算ごとに、相場で買えるいちばん上の中古MacBookです。${pick.label}なら${pick.model}（${pick.chip}チップ・${pick.released}発売・${pick.storage}・相場${man(pick.median)}円・在庫${man(pick.count)}台）。`,
    "",
    ...rows.map((r) => `${r.label}以下 ${r.model}（${r.chip}チップ・${r.released}発売・${r.storage}） 相場${man(r.median)}円`),
    "",
    `選び方: 相場が予算の帯（${bands}）に入る MacBook（Apple シリコンの MacBook Air・Pro と MacBook Neo）のうち、相場がいちばん高い機種（同じなら発売の新しい方・在庫${MIN_COUNT}件以上。帯に機種がなければ、相場が予算以下で発売年のいちばん新しい機種）。相場7万円以下の MacBook がないため、予算は10万円から。データ: 大手中古ショップ${shopCount}店の在庫（相場＝在庫がいちばん多い容量の中央値・${date.replace(/-/g, "/")}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${pick.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(pick.model)}?${utm(date)}`,
    `中古MacBookの全機種の相場: https://used.gadelog.com/mac?${utm(date)}`,
  ].join("\n");

  return {
    theme: "macbudget",
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
    youtube: { title, description, hashtags: ["#MacBook", "#中古MacBook"] },
  };
}
