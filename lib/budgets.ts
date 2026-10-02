/**
 * 予算別ページ。「中古iPhone 3万円以下」「中古iPad 3万円以下」のような検索に向けて、
 * 予算内で買える機種を新しい順に並べる（iPhone は /budget/[slug]、iPad は /ipad/budget/[slug]、Pixel・Galaxy は /pixel/budget/[slug]・/galaxy/budget/[slug]）
 */
export type BudgetDevice = "iphone" | "ipad" | "pixel" | "galaxy";

export const BUDGETS = [10000, 20000, 30000, 40000, 50000, 70000, 100000];
// iPad は1万円以下の在庫（ジャンク品を除く）がほぼないので2万円から（9/30 時点で2万円以下は5機種）
export const IPAD_BUDGETS = [20000, 30000, 40000, 50000, 70000, 100000];

// Pixel は保証の残る機種の最安が 3万円前後から（9/30: 7a 27,800円・7 29,800円・8a 39,800円）
export const PIXEL_BUDGETS = [30000, 40000, 50000, 70000, 100000];

// Galaxy は Z Flip5・A55 5G の 4万円台から、Z Fold8 Ultra の 25万円台まで（9/30。楽天3店の A シリーズが入ると3万円以下も出る）
export const GALAXY_BUDGETS = [30000, 50000, 70000, 100000, 150000];

/** 予算別ページの見出しの「○万円以下で買える〜」の〜（機種ページ・他の種類の予算別ページからのリンクにも使う） */
export const BUDGET_NAMES: Record<BudgetDevice, string> = {
  iphone: "中古iPhone",
  ipad: "中古iPad",
  pixel: "中古Google Pixel",
  galaxy: "中古Galaxy",
};

export const budgetsOf = (device: BudgetDevice) =>
  device === "ipad" ? IPAD_BUDGETS : device === "pixel" ? PIXEL_BUDGETS : device === "galaxy" ? GALAXY_BUDGETS : BUDGETS;

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
