import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BudgetView, budgetMetadata } from "@/app/components/BudgetView";
import { IPAD_BUDGETS, budgetSlug, slugToBudget } from "@/lib/budgets";

// iPad の予算別ページ（中身は iPhone と共通の BudgetView）。静的に生成して CDN から配信する。在庫は3時間ごとに更新
export const revalidate = 10800; // 3時間（Neon の計算時間を減らすため。2026-10-02）
export const dynamicParams = false;

export function generateStaticParams() {
  return IPAD_BUDGETS.map((max) => ({ slug: budgetSlug(max) }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const max = slugToBudget((await params).slug, "ipad");
  return max ? budgetMetadata(max, "ipad") : {};
}

export default async function IpadBudgetPage({ params }: Props) {
  const max = slugToBudget((await params).slug, "ipad");
  if (!max) notFound();
  return <BudgetView max={max} device="ipad" />;
}
