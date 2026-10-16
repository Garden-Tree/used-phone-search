import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SumahoBudgetView, sumahoBudgetMetadata } from "@/app/components/SumahoBudgetView";
import { SUMAHO_BUDGETS, budgetSlug, slugToSumahoBudget } from "@/lib/budgets";

// スマホ全体（iPhone・Pixel・Galaxy・Xperia・AQUOS）の予算別ページ。静的に書き出す。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
export const dynamicParams = false;

export function generateStaticParams() {
  return SUMAHO_BUDGETS.map((max) => ({ slug: budgetSlug(max) }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const max = slugToSumahoBudget((await params).slug);
  return max ? sumahoBudgetMetadata(max) : {};
}

export default async function SumahoBudgetPage({ params }: Props) {
  const max = slugToSumahoBudget((await params).slug);
  if (!max) notFound();
  return <SumahoBudgetView max={max} />;
}
