import Link from "next/link";
import { Smartphone, BatteryCharging, Camera, Sparkles, Zap, Search } from "lucide-react";
import { IPHONE_CATALOG, modelPagePath } from "@/lib/catalog";
import { comparePath } from "@/lib/compare";
import { pickPath } from "@/lib/picks";
import { BUDGETS, budgetLabel, budgetPath } from "@/lib/budgets";
import AdDisclosure from "@/app/components/AdDisclosure";
import prisma from "@/lib/prisma";

// ショップごとの在庫数を出すので、1時間ごとに再生成する
export const revalidate = 3600;

// 比較対象のショップ（表示順）。name は DeviceInventory.shopName
const SHOPS = [
  { name: "イオシス", label: "イオシス" },
  { name: "じゃんぱら（楽天市場店）", label: "じゃんぱら", note: "楽天市場店" },
  { name: "ゲオモバイル（楽天市場店）", label: "ゲオモバイル", note: "楽天市場店" },
  { name: "ソフマップ（楽天市場店）", label: "ソフマップ", note: "楽天市場店" },
  { name: "にこスマ", label: "にこスマ" },
  { name: "ダイワンテレコム", label: "ダイワンテレコム" },
  { name: "エムモバ", label: "エムモバ" },
];

/** ショップごとの在庫数。DB に届かないときもトップページは出す */
async function shopCounts(): Promise<Map<string, number>> {
  try {
    const rows = await prisma.deviceInventory.groupBy({
      by: ["shopName"],
      where: { isSoldOut: false },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.shopName, r._count._all]));
  } catch (error) {
    console.error("shop counts failed:", error);
    return new Map();
  }
}


// トップページに並べる比較（lib/compare.ts の COMPARE_PAIRS に含まれる組のみ）
const FEATURED_COMPARES: [string, string][] = [
  ["iPhone 13", "iPhone 14"],
  ["iPhone 14", "iPhone 15"],
  ["iPhone 15", "iPhone 16"],
  ["iPhone 15", "iPhone 15 Pro"],
  ["iPhone 16e", "iPhone 16"],
  ["iPhone 17", "iPhone Air"],
  ["iPhone SE (第2世代)", "iPhone SE (第3世代)"],
  ["iPhone SE (第3世代)", "iPhone 13 mini"],
];

export default async function Home() {
  const counts = await shopCounts();
  const total = SHOPS.reduce((n, s) => n + (counts.get(s.name) ?? 0), 0);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-200 pb-20">

      {/* 1. Hero Section */}
      <section className="relative pt-4 pb-4 md:pt-8 md:pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">


          <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-1 leading-tight text-slate-900">
            中古スマホ一括検索
          </h1>

          <div className="mb-12">
            <a href="https://gadelog.com" target="_blank" rel="noopener noreferrer" className="text-xs font-black text-slate-400 hover:text-blue-600 transition-colors tracking-[0.3em] uppercase">
              POWERED BY GADELOG.COM
            </a>
          </div>

          <p className="text-xl md:text-4xl font-bold text-slate-700 mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              あなたにピッタリの中古スマホを見つけよう
            </span>
          </p>

          <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-6">
            大手中古ショップ7社の iPhone・iPad の価格、状態ランク、容量、バッテリーを一括比較。<br className="hidden md:block" />
            欲しいモデルの最安値を一瞬で見つけ出します。
          </p>

          {/* New Search CTA */}
          <div className="max-w-4xl mx-auto mb-12">
            <form action="/search" method="GET" className="relative group">
              <input
                type="text"
                name="model"
                placeholder="例: iPhone 15 Pro, SE 第3世代..."
                className="w-full pl-14 pr-32 py-5 bg-white border-2 border-slate-200 rounded-[2rem] text-lg font-medium shadow-sm group-hover:shadow-md focus:shadow-lg focus:border-blue-500 transition-all outline-none"
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <button
                type="submit"
                className="absolute right-2 top-2 bottom-2 px-6 bg-slate-900 text-white rounded-[1.5rem] font-bold hover:bg-blue-600 transition-colors"
              >
                検索
              </button>
            </form>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href="/search" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors underline underline-offset-4">
                すべての在庫から探す &rarr;
              </Link>
            </div>
          </div>

          {/* 比較対象のショップと在庫数 */}
          <p className="text-xs font-bold text-slate-400 tracking-[0.15em] mb-4">
            比較対象の大手中古ショップ {SHOPS.length}社{total > 0 && <>・在庫 {total.toLocaleString()}件（iPhone・iPad）</>}
          </p>
          <ul className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-4xl mx-auto">
            {SHOPS.map((shop) => {
              const count = counts.get(shop.name);
              return (
                <li key={shop.name}>
                  <Link
                    href={`/search?${new URLSearchParams({ shop: shop.name }).toString()}`}
                    className="inline-flex items-baseline gap-1.5 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    <span className="text-sm font-black">{shop.label}</span>
                    {shop.note && <span className="text-[10px] font-bold text-slate-400">{shop.note}</span>}
                    {count !== undefined && <span className="text-xs font-bold text-slate-400">{count.toLocaleString()}件</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 2. Shortcuts Section */}
      <section className="max-w-6xl mx-auto px-4 mb-8 relative z-10">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            目的・予算から探す
          </h2>

          {/* Scrollable on mobile, grid on desktop */}
          <div className="flex overflow-x-auto pb-6 -mx-4 px-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:mx-0 md:px-0 gap-4 md:gap-6 snap-x hide-scrollbar">

            {/* Shortcut 1 */}
            <Link href={pickPath("cospa")} className="snap-start min-w-[280px] md:min-w-0 group flex-1 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
                <BatteryCharging className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2 leading-tight">迷ったらこれ！<br />長く使えるコスパ最強</h3>
                <p className="text-blue-100 text-xs md:text-sm mb-6 font-medium">対象: iPhone 13, 14</p>
                <div className="inline-flex items-center text-sm font-bold bg-white text-blue-600 px-4 py-2 rounded-full group-hover:bg-blue-50 transition-colors shadow-sm">
                  探す <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            </Link>

            {/* Shortcut 2 */}
            <Link href={pickPath("budget")} className="snap-start min-w-[280px] md:min-w-0 group flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
                <Zap className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2 leading-tight">予算重視！<br />とにかく安く使える</h3>
                <p className="text-emerald-100 text-xs md:text-sm mb-6 font-medium">対象: iPhone 11, 12, SE (第2/第3世代)</p>
                <div className="inline-flex items-center text-sm font-bold bg-white text-emerald-600 px-4 py-2 rounded-full group-hover:bg-emerald-50 transition-colors shadow-sm">
                  探す <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            </Link>

            {/* Shortcut 3 */}
            <Link href={pickPath("camera")} className="snap-start min-w-[280px] md:min-w-0 group flex-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
                <Camera className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2 leading-tight">オールドコンデジ代わりに📸<br />エモい写真</h3>
                <p className="text-amber-100 text-xs md:text-sm mb-6 font-medium">対象: iPhone 7, 8, X</p>
                <div className="inline-flex items-center text-sm font-bold bg-white text-amber-600 px-4 py-2 rounded-full group-hover:bg-amber-50 transition-colors shadow-sm">
                  探す <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            </Link>

          </div>

          {/* 予算別ページ */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-500 mr-1">予算で探す:</span>
            {BUDGETS.map((max) => (
              <Link key={max} href={budgetPath(max)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                {budgetLabel(max)}以下
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* よく比較される機種 */}
      <section className="max-w-6xl mx-auto px-4 mb-10 relative z-10">
        <h2 className="text-xl md:text-2xl font-bold mb-4">よく比較される機種</h2>
        <div className="flex flex-wrap gap-2">
          {FEATURED_COMPARES.map(([a, b]) => (
            <Link key={comparePath(a, b)} href={comparePath(a, b)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm">
              {a} <span className="text-slate-400 font-medium">vs</span> {b}
            </Link>
          ))}
        </div>
      </section>

      {/* iPad */}
      <section className="max-w-6xl mx-auto px-4 mb-10 relative z-10">
        <Link href="/ipad"
          className="group flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 hover:border-blue-300 hover:bg-blue-50 transition-colors">
          <div>
            <p className="text-lg md:text-xl font-bold text-slate-800 group-hover:text-blue-600">中古iPadの最安値を見る</p>
            <p className="text-xs md:text-sm text-slate-500 mt-1">iPad・iPad mini・iPad Air・iPad Pro を機種別に比較</p>
          </div>
          <span className="text-2xl text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-transform" aria-hidden>›</span>
        </Link>
      </section>

      {/* 3. Catalog Grid Section */}
      <main className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-slate-500" />
            シリーズから探す（iOS 27対応モデル）
          </h2>
        </div>

        {/* Changed to a denser grid: 1-2 cols on mobile, 3-4 cols on PC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {IPHONE_CATALOG.map((seriesGroup) => (
            <div
              key={seriesGroup.series}
              className="group bg-white rounded-2xl md:rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200/80 flex flex-col h-full"
            >
              {/* Card Header */}
              <div className="p-5 md:p-6 relative overflow-hidden bg-slate-50/50 border-b border-slate-100 flex flex-col min-h-[7rem]">
                <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${seriesGroup.gradient}`}></div>

                <div className="relative z-10">
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-800">
                    {seriesGroup.series}
                  </h3>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mt-auto pt-3 relative z-10">
                  {seriesGroup.badges.map((badge) => (
                    <span key={badge} className="inline-flex items-center px-2 py-1 rounded-md text-[10px] md:text-xs font-semibold bg-white text-slate-600 border border-slate-200 shadow-sm">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

              {/* Models List */}
              <div className="p-4 flex-grow bg-white">
                <div className="flex flex-col gap-2">
                  {seriesGroup.models.map((model) => (
                    <Link
                      key={model}
                      href={modelPagePath(model)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group/link border border-transparent hover:border-slate-100"
                    >
                      <span className="text-sm font-medium text-slate-700 group-hover/link:text-blue-600 transition-colors">
                        {model}
                      </span>
                      <span className="text-slate-300 group-hover/link:text-blue-500 transition-colors group-hover/link:translate-x-1 transform duration-200">
                        &rarr;
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 mt-8 pt-8 border-t border-slate-100 text-center">
        <AdDisclosure />
        <p className="text-sm text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} 中古スマホ一括検索
        </p>
        <p className="text-xs text-slate-300 mt-2">
          powered by <a href="https://gadelog.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors font-bold underline underline-offset-2">gadelog.com</a>
        </p>
      </footer>

      {/* Hide scrollbar styles for the horizontal scroll section */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
