import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BudgetView, budgetMetadata } from "@/app/components/BudgetView";
import { BUDGETS, budgetSlug, slugToBudget } from "@/lib/budgets";

// 静的に生成して CDN から配信する。在庫は6時間ごとに更新
export const revalidate = 21600; // 6時間（在庫の取り込みと同じ間隔。Neon の計算時間を減らすため。2026-10-04）
export const dynamicParams = false;

export function generateStaticParams() {
  return BUDGETS.map((max) => ({ slug: budgetSlug(max) }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const max = slugToBudget((await params).slug);
  return max ? budgetMetadata(max, "iphone") : {};
}

export default async function BudgetPage({ params }: Props) {
  const max = slugToBudget((await params).slug);
  if (!max) notFound();
  return <BudgetView max={max} device="iphone" />;
}
