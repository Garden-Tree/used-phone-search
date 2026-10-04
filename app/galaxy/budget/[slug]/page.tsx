import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BudgetView, budgetMetadata } from "@/app/components/BudgetView";
import { GALAXY_BUDGETS, budgetSlug, slugToBudget } from "@/lib/budgets";

// Galaxy の予算別ページ（中身は iPhone と共通の BudgetView）。静的に生成して CDN から配信する。在庫は6時間ごとに更新
export const revalidate = 21600; // 6時間（在庫の取り込みと同じ間隔。Neon の計算時間を減らすため。2026-10-04）
export const dynamicParams = false;

export function generateStaticParams() {
  return GALAXY_BUDGETS.map((max) => ({ slug: budgetSlug(max) }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const max = slugToBudget((await params).slug, "galaxy");
  return max ? budgetMetadata(max, "galaxy") : {};
}

export default async function GalaxyBudgetPage({ params }: Props) {
  const max = slugToBudget((await params).slug, "galaxy");
  if (!max) notFound();
  return <BudgetView max={max} device="galaxy" />;
}
