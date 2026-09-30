/**
 * 予算別ページ。「中古iPhone 3万円以下」「中古iPad 3万円以下」のような検索に向けて、
 * 予算内で買える機種を新しい順に並べる（iPhone は /budget/[slug]、iPad は /ipad/budget/[slug]、Pixel は /pixel/budget/[slug]）
 */
export type BudgetDevice = "iphone" | "ipad" | "pixel";

export const BUDGETS = [10000, 20000, 30000, 40000, 50000, 70000, 100000];
// iPad は1万円以下の在庫（ジャンク品を除く）がほぼないので2万円から（9/30 時点で2万円以下は5機種）
export const IPAD_BUDGETS = [20000, 30000, 40000, 50000, 70000, 100000];

// Pixel は保証の残る機種の最安が 3万円前後から（9/30: 7a 27,800円・7 29,800円・8a 39,800円）
export const PIXEL_BUDGETS = [30000, 40000, 50000, 70000, 100000];

export const budgetsOf = (device: BudgetDevice) =>
  device === "ipad" ? IPAD_BUDGETS : device === "pixel" ? PIXEL_BUDGETS : BUDGETS;

export const budgetSlug = (max: number) => `under-${max}`;
export const budgetPath = (max: number, device: BudgetDevice = "iphone") =>
  device === "iphone" ? `/budget/${budgetSlug(max)}` : `/${device}/budget/${budgetSlug(max)}`;

export function slugToBudget(slug: string, device: BudgetDevice = "iphone"): number | undefined {
  const m = slug.match(/^under-(\d+)$/);
  const max = m ? Number(m[1]) : NaN;
  return budgetsOf(device).includes(max) ? max : undefined;
}

/** 30000 → "3万円" */
export function budgetLabel(max: number): string {
  return max % 10000 === 0 ? `${max / 10000}万円` : `${max.toLocaleString()}円`;
}
