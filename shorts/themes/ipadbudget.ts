/**
 * テーマ「予算ぴったりで買える中古iPadは？」: budget（iPhone）・pixelbudget と同じ選び方・同じ場面で iPad を選ぶ → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 対象は iPad のカタログ（lib/ipadCatalog.ts の IPAD_MODELS）のうち、iPadOS 27 に対応している機種（lib/ipadSpecs.ts の IPADOS27_MODELS・Apple 公式）で、
 *   在庫が MIN_COUNT 件以上の機種（iPad 第8世代以前・Air 第3世代・mini 第5世代・Pro 第1世代 11インチ/第3世代 12.9インチ以前は出さない）
 * - 相場＝在庫がいちばん多い容量の中央値（getModelMarket。サイトの相場と同じ数字）
 * - 予算ごとの機種は budget と同じ（pickBudgetModels。帯 (前の予算, 予算] で相場がいちばん高い機種・同じなら発売年の新しい方）。
 *   ただし予算は 5万・7万・10万・15万円（IPAD_SHORT_BUDGETS）。相場3万円以下の iPad は 10/23 時点ですべて iPadOS 27 非対応（第8世代 25,916円・mini 第5世代 28,800円など）で、
 *   iPadOS 27 対応のいちばん安い iPad (第9世代) が 43,670円のため、3万円の行は作れない（帯が空のうえ予算以下の機種もない）
 * - 注目（reveal）は PICK_BUDGET（5万円）の行に固定。出すのは相場（容量つき）・在庫数・使える Apple Pencil
 * - iPad は機種で使える Apple Pencil が違う（lib/ipadPencil.ts・Apple 公式の互換性の表）ので、各行に添える（この回の切り口）
 * DB は機種ごとの集計（groupBy と中央値の1行）だけ。在庫の行を丸ごと取らない
 */
import { getModelMarket } from "@/lib/marketStats";
import { budgetLabel, budgetPath } from "@/lib/budgets";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { IPAD_SPECS, IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { pencilNeedsAdapter, pencilsFor } from "@/lib/ipadPencil";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { BudgetRow, BudgetScript } from "../types";
import { MIN_COUNT, PICK_BUDGET, pickBudgetModels } from "./budget";

/** 動画に出す予算（4行）。iPad は 5万円から（上の説明）。注目は PICK_BUDGET（5万円）で budget と同じ */
export const IPAD_SHORT_BUDGETS = [50000, 70000, 100000, 150000];

const man = (n: number) => n.toLocaleString();
/** 発売年（"2021年" → 2021） */
const yearOf = (model: string) => Number(IPAD_SPECS[model]?.released.replace("年", "") ?? 0);
/** 使える Apple Pencil（新しい順・"USB-C／第1世代"）。公式の表にない機種は空 */
const pencilOf = (model: string) => pencilsFor(model).join("／");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_ipadbudget`;

export async function buildIpadBudgetScript(date: string): Promise<BudgetScript> {
  const market = await getModelMarket(IPAD_MODELS);
  const old = IPAD_MODELS.filter((m) => !IPADOS27_MODELS.has(m) && (market.get(m)?.count ?? 0) >= MIN_COUNT);
  if (old.length) console.log(`  対象外（iPadOS 27 非対応・在庫${MIN_COUNT}件以上）: ${old.join("・")}`);
  const cands = [...market].filter(([m, r]) => r.count >= MIN_COUNT && IPADOS27_MODELS.has(m));
  const rows: (BudgetRow & { count: number })[] = pickBudgetModels(cands, yearOf, " iPadOS 27 対応 iPad ", IPAD_SHORT_BUDGETS).map(({ budget, model, r }) => ({
    budget, label: budgetLabel(budget), model, storage: r.medianStorage ? storageLabel(r.medianStorage, model) : "", median: r.medianPrice,
    released: IPAD_SPECS[model].released, pencil: pencilOf(model) || undefined, count: r.count,
  }));
  const { count, ...pickRow } = rows.find((r) => r.budget === PICK_BUDGET) ?? rows[0];
  const pick = { ...pickRow, count };

  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。iPad は機種で使える Apple Pencil が違う（lib/ipadPencil.ts）
  const lines = ["iPadは機種ごとに", "使えるPencilが", "違います"];

  const rawTitle = `${pick.label}なら${pick.model}！予算ぴったりで買える中古iPad`;
  const title = rawTitle.length <= 60 ? rawTitle : `予算ぴったりで買える中古iPad（${IPAD_SHORT_BUDGETS.map(budgetLabel).join("・")}）`;
  // 予算の帯の書き方（「5万円以下・5万超〜7万・7万超〜10万・10万超〜15万円」）
  const bands = IPAD_SHORT_BUDGETS.map((b, i) => (i === 0 ? `${budgetLabel(b)}以下` : `${IPAD_SHORT_BUDGETS[i - 1] / 10000}万超〜${b / 10000}万${i === IPAD_SHORT_BUDGETS.length - 1 ? "円" : ""}`)).join("・");
  const pen = (r: BudgetRow) => (r.pencil ? `・Apple Pencil ${r.pencil}${pencilNeedsAdapter(r.model) ? "（第1世代はUSB-Cアダプタが必要）" : ""}` : "");
  const description = [
    `予算ごとに、相場で買えるいちばん上の中古iPadです。${pick.label}なら${pick.model}（${pick.storage}・相場${man(pick.median)}円・在庫${man(pick.count)}台${pen(pick)}）。`,
    "",
    ...rows.map((r) => `${r.label}以下 ${r.model}（${r.released}発売・${r.storage}） 相場${man(r.median)}円${pen(r)}`),
    "",
    `選び方: 相場が予算の帯（${bands}）に入る iPad のうち、相場がいちばん高い機種（同じなら発売の新しい方・在庫${MIN_COUNT}件以上。帯に機種がなければ、相場が予算以下で発売年のいちばん新しい機種）。iPadOS 27 に対応していない機種（iPad 第8世代以前など${old.length ? `。今回は ${old.join("・")}` : ""}）は除いています（相場3万円以下の iPad はすべて非対応のため、予算は5万円から）。使える Apple Pencil は Apple 公式の「Apple Pencil の互換性」から。データ: 大手中古ショップ${shopCount}店の在庫（相場＝在庫がいちばん多い容量の中央値・${date.replace(/-/g, "/")}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${pick.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(pick.model)}?${utm(date)}`,
    `${pick.label}以下で買える中古iPad: https://used.gadelog.com${budgetPath(PICK_BUDGET, "ipad")}?${utm(date)}`,
    `中古iPadの全機種の相場: https://used.gadelog.com/ipad?${utm(date)}`,
  ].join("\n");

  return {
    theme: "ipadbudget",
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
    youtube: { title, description, hashtags: ["#iPad", "#中古iPad"] },
  };
}
