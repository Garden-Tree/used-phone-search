import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BudgetView, budgetMetadata } from "@/app/components/BudgetView";
import { GALAXY_BUDGETS, budgetSlug, slugToBudget } from "@/lib/budgets";

// Galaxy の予算別ページ（中身は iPhone と共通の BudgetView）。静的に書き出す。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
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
