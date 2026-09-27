/**
 * 予算別ページ（/budget/[slug]）。「中古iPhone 3万円以下」のような検索に向けて、
 * 予算内で買える機種を新しい順に並べる
 */
export const BUDGETS = [10000, 20000, 30000, 40000, 50000, 70000, 100000];

export const budgetSlug = (max: number) => `under-${max}`;
export const budgetPath = (max: number) => `/budget/${budgetSlug(max)}`;

export function slugToBudget(slug: string): number | undefined {
  const m = slug.match(/^under-(\d+)$/);
  const max = m ? Number(m[1]) : NaN;
  return BUDGETS.includes(max) ? max : undefined;
}

/** 30000 → "3万円" */
export function budgetLabel(max: number): string {
  return max % 10000 === 0 ? `${max / 10000}万円` : `${max.toLocaleString()}円`;
}
