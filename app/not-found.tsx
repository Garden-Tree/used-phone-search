import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { modelPagePath } from "@/lib/catalog";
import { BUDGETS, budgetLabel, budgetPath } from "@/lib/budgets";

// 存在しない URL・カタログにない機種のページ。DB を使わない（在庫の集計が止まっていても出せるように）
export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: { index: false, follow: true },
};

// よく見られる機種（トップの「よく比較される機種」と同じ世代）
const POPULAR_MODELS = ["iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16", "iPhone SE (第3世代)", "iPhone 12"];

export default function NotFound() {
  return (
    <div className="min-h-screen text-ink">
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-sm font-bold text-ink-mute mb-2">404</p>
        <h1 className="text-2xl md:text-3xl font-bold mb-3">ページが見つかりませんでした</h1>
        <p className="text-ink-sub mb-8 leading-relaxed">
          URL が変わったか、掲載をやめた機種のページかもしれません。機種名で検索するか、下のページから探してください。
        </p>

        <form action="/search" method="GET" className="flex gap-2 mb-10">
          <input
            type="text"
            name="model"
            placeholder="例: iPhone 15 Pro"
            className="flex-1 min-w-0 px-3.5 h-12 border border-[#C7CBD4] rounded-xl text-base focus:border-brand-600 outline-none bg-white"
          />
          <button type="submit" className="px-[18px] h-12 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-800">
            検索
          </button>
        </form>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">よく見られている機種</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_MODELS.map((m) => (
              <Link key={m} href={modelPagePath(m)}
                className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                {m}
              </Link>
            ))}
            <Link href="/ipad"
              className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
              iPad
            </Link>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">予算で探す</h2>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((max) => (
              <Link key={max} href={budgetPath(max)}
                className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                {budgetLabel(max)}以下
              </Link>
            ))}
          </div>
        </section>

        <Link href="/" className="inline-block text-sm font-bold text-brand-600 hover:underline underline-offset-4">
          トップページへ &rarr;
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}
