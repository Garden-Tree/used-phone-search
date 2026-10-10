import Link from "next/link";
import { Search } from "lucide-react";
import { ALL_DEVICE_PAGE_MODELS, IPHONE_CATALOG, modelPagePath } from "@/lib/catalog";
import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { PIXEL_MODELS } from "@/lib/pixelCatalog";
import { GALAXY_MODELS } from "@/lib/galaxyCatalog";
import { minPriceByModel } from "@/lib/budgetStats";
import { yen } from "@/lib/format";
import { comparePath } from "@/lib/compare";
import { GALAXY_PICKS, IPAD_PICKS, PIXEL_PICKS, pickPath, type Pick } from "@/lib/picks";
import { BUDGETS, GALAXY_BUDGETS, IPAD_BUDGETS, PIXEL_BUDGETS, budgetLabel, budgetPath, type BudgetDevice } from "@/lib/budgets";
import prisma from "@/lib/prisma";
import { SHOPS } from "@/lib/shops";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import PriceDrops from "@/app/components/PriceDrops";
import { getModelMarket, getPriceDrops, type ModelMarket } from "@/lib/marketStats";
import { rethrowDuringBuild } from "@/lib/buildGuard";
import { BUILD_TIME } from "@/lib/buildTime";

// ショップごとの在庫数を出す。ビルドのたびに作る
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

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
    rethrowDuringBuild(error);
    console.error("shop counts failed:", error);
    return new Map();
  }
}

/** 機種ごとの最安値（機種ページの「最安値」と同じく、ジャンク品も含む）。DB に届かないときは出さない */
async function modelPrices(): Promise<Map<string, { minPrice: number; count: number }>> {
  try {
    return await minPriceByModel({ isSoldOut: false }, ALL_DEVICE_PAGE_MODELS);
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("model prices failed:", error);
    return new Map();
  }
}

// 人気の機種（最安値・相場・在庫数を並べる。在庫のない機種は出さない）
const POPULAR_MODELS = ["iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16", "iPhone SE (第3世代)", "Pixel 8"];

async function popularMarket(): Promise<Map<string, ModelMarket>> {
  try {
    return await getModelMarket(POPULAR_MODELS);
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("popular market failed:", error);
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

// 機種の種類ごとの入口（件数は在庫の合計）
const DEVICE_HUBS: { label: string; path: string; models: string[] }[] = [
  { label: "iPhone", path: "/iphone", models: IPHONE_CATALOG.flatMap((s) => s.models) },
  { label: "iPad", path: "/ipad", models: IPAD_MODELS },
  { label: "Pixel", path: "/pixel", models: PIXEL_MODELS },
  { label: "Galaxy", path: "/galaxy", models: GALAXY_MODELS },
];

const pill =
  "min-h-10 inline-flex items-center px-3.5 bg-white border border-line rounded-full text-[13px] font-medium text-ink hover:border-brand-200 hover:text-brand-800";
const h2 = "text-[17px] font-bold";

export default async function Home() {
  const [counts, prices, drops, popular] = await Promise.all([shopCounts(), modelPrices(), getPriceDrops(7, 6), popularMarket()]);
  const total = SHOPS.reduce((n, s) => n + (counts.get(s.name) ?? 0), 0);
  const popularRows = POPULAR_MODELS.flatMap((m) => {
    const r = popular.get(m);
    return r ? [{ model: m, ...r }] : [];
  });

  return (
    <div className="min-h-screen text-ink">
      <SiteHeader />

      {/* ヒーロー: h1・説明・検索欄 */}
      <section className="bg-white border-b border-line">
        <div className="max-w-[1120px] mx-auto px-4 pt-[22px] pb-5 flex flex-col gap-3 md:items-start">
          <h1 className="text-[25px] md:text-4xl leading-[1.35] font-bold">
            中古スマホ一括検索
            <br />
            <span className="text-[19px] md:text-2xl">最安値を大手{SHOPS.length}店から一括比較</span>
          </h1>
          <p className="text-sm leading-relaxed text-ink-sub">
            大手中古ショップ{SHOPS.length}社の iPhone・iPad・Pixel・Galaxy の価格、状態ランク、容量、バッテリーを一括比較。
            {total > 0 && <>在庫 {total.toLocaleString()}件。</>}
            欲しいモデルの最安値をすぐに見つけられます。
          </p>
          <form action="/search" method="GET" className="flex gap-2 mt-0.5 w-full md:max-w-xl">
            <label htmlFor="q" className="sr-only">機種名</label>
            <input
              id="q"
              type="search"
              name="model"
              placeholder="機種名（例: iPhone 15 Pro）"
              className="flex-1 min-w-0 h-12 border-[1.5px] border-[#C7CBD4] rounded-xl px-3.5 text-base bg-white text-ink outline-none focus:border-brand-600"
            />
            <button type="submit" className="h-12 px-[18px] rounded-xl bg-brand-600 hover:bg-brand-800 text-white text-[15px] font-bold inline-flex items-center gap-1.5">
              <Search className="w-4 h-4" aria-hidden="true" />
              検索
            </button>
          </form>
          <Link href="/search" className="text-[13px] text-brand-600 hover:text-brand-800">
            iPhone の在庫をすべて見る ›
          </Link>
          <p className="text-xs text-ink-mute">
            更新 {BUILD_TIME} ・ <span className="border border-[#C7CBD4] rounded px-1">PR</span> アフィリエイト広告を利用しています
          </p>
        </div>
      </section>

      <main className="max-w-[1120px] mx-auto px-4 pb-4">
        {/* 人気の機種 */}
        {popularRows.length > 0 && (
          <section className="pt-[22px] flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className={h2}>人気の機種</h2>
              <Link href="/iphone" className="text-[13px] text-brand-600 hover:text-brand-800">全機種の相場 ›</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {popularRows.map((r) => (
                <Link key={r.model} href={modelPagePath(r.model)} className="bg-white border border-line rounded-xl p-3 flex flex-col gap-0.5 text-ink hover:border-brand-200">
                  <span className="text-sm font-bold">{r.model}</span>
                  <span className="text-xl font-bold text-price leading-[1.3]">
                    {yen(r.minPrice)}<span className="text-[11px] text-ink-mute font-normal"> 〜</span>
                  </span>
                  <span className="text-[11px] text-ink-mute">相場 {yen(r.medianPrice)} ・ {r.count.toLocaleString()}件</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 目的・予算から探す */}
        <section className="pt-[18px] flex flex-col gap-2.5">
          <h2 className={h2}>目的・予算から探す</h2>
          <div className="flex flex-wrap gap-2">
            <Link href={pickPath("cospa")} className={pill}>迷ったらこれ！長く使えるコスパ最強（iPhone 13・14）</Link>
            <Link href={pickPath("budget")} className={pill}>予算重視！とにかく安く使える（11・12・SE）</Link>
            <Link href={pickPath("camera")} className={pill}>オールドコンデジ代わりにエモい写真（7・8・X）</Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-ink-sub mr-1">iPhone を予算で探す</span>
            {BUDGETS.map((max) => (
              <Link key={max} href={budgetPath(max)} className={pill}>{budgetLabel(max)}以下</Link>
            ))}
          </div>
          {/* iPad・Pixel・Galaxy の目的別・予算別（9/30〜）。トップから直接たどれるようにして、Google に早く見つけてもらう */}
          {([
            ["iPad", IPAD_PICKS, IPAD_BUDGETS, "ipad"],
            ["Pixel", PIXEL_PICKS, PIXEL_BUDGETS, "pixel"],
            ["Galaxy", GALAXY_PICKS, GALAXY_BUDGETS, "galaxy"],
          ] as [string, Pick[], number[], BudgetDevice][]).map(([label, picks, budgets, device]) => (
            <div key={device} className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold text-ink-sub mr-1">{label} を目的・予算で探す</span>
              {picks.map((p) => (
                <Link key={p.slug} href={pickPath(p.slug)} className={pill}>{p.title}</Link>
              ))}
              {budgets.map((max) => (
                <Link key={max} href={budgetPath(max, device)} className={pill}>{budgetLabel(max)}以下</Link>
              ))}
            </div>
          ))}
        </section>

        {/* よく比較される機種 */}
        <section className="pt-[18px] flex flex-col gap-2.5">
          <h2 className={h2}>よく比較される機種</h2>
          <div className="flex flex-wrap gap-2">
            {FEATURED_COMPARES.map(([a, b]) => (
              <Link key={comparePath(a, b)} href={comparePath(a, b)} className={pill}>
                {a} <span className="text-ink-mute font-normal mx-1">vs</span> {b}
              </Link>
            ))}
          </div>
        </section>

        {/* 値下がり（1週間分の記録がたまってから出る） */}
        <div className="pt-3">
          <PriceDrops drops={drops} title="この1週間で値下がりした機種" />
        </div>

        {/* シリーズから探す: 種類ごとの入口と、iPhone のシリーズ別の機種一覧 */}
        <section className="pt-[18px] flex flex-col gap-2.5">
          <h2 className={h2}>シリーズから探す</h2>
          <div className="bg-white border border-line rounded-xl overflow-hidden grid grid-cols-2 md:grid-cols-4">
            {DEVICE_HUBS.map((h) => {
              const n = h.models.reduce((sum, m) => sum + (prices.get(m)?.count ?? 0), 0);
              return (
                <Link key={h.path} href={h.path} className="p-3.5 flex justify-between items-baseline gap-2 border-b border-r border-line-soft text-ink hover:bg-ground">
                  <span className="text-[15px] font-bold">中古{h.label} ›</span>
                  {n > 0 && <span className="text-xs text-ink-mute whitespace-nowrap">{n.toLocaleString()}件</span>}
                </Link>
              );
            })}
          </div>
          <h3 className="text-sm font-bold text-ink-sub mt-2">iPhone シリーズ別（iOS 27 対応モデル）</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {IPHONE_CATALOG.map((seriesGroup) => (
              <div key={seriesGroup.series} className="bg-white border border-line rounded-xl overflow-hidden">
                <div className="px-3.5 pt-3 pb-2 border-b border-line-soft">
                  <h4 className="text-[15px] font-bold">{seriesGroup.series}</h4>
                  <p className="text-[11px] text-ink-mute mt-0.5">{seriesGroup.badges.join("・")}</p>
                </div>
                <div>
                  {seriesGroup.models.map((model) => (
                    <Link
                      key={model}
                      href={modelPagePath(model)}
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-line-soft last:border-b-0 text-ink hover:bg-ground"
                    >
                      <span className="text-sm">{model}</span>
                      <span className="flex items-center gap-1.5">
                        {prices.has(model) && (
                          <span className="text-sm font-bold text-price">{yen(prices.get(model)!.minPrice)}〜</span>
                        )}
                        <span className="text-ink-mute" aria-hidden>›</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 比較している店 */}
        <section className="pt-[18px] flex flex-col gap-2.5">
          <h2 className={h2}>比較している{SHOPS.length}店</h2>
          <p className="text-xs text-ink-mute">
            {total > 0 && <>在庫 {total.toLocaleString()}件（iPhone・iPad・Pixel・Galaxy）。</>}店名を押すとその店の在庫を一覧できます
          </p>
          <ul className="bg-white border border-line rounded-xl px-3.5 py-1 grid grid-cols-2 md:grid-cols-4 gap-x-3.5">
            {SHOPS.map((shop) => {
              const count = counts.get(shop.name);
              return (
                <li key={shop.name} className="border-b border-line-soft">
                  <Link
                    href={`/search?${new URLSearchParams({ shop: shop.name }).toString()}`}
                    className="flex justify-between items-baseline gap-2 py-2 text-xs text-ink hover:text-brand-800"
                  >
                    <span>
                      {shop.label}
                      {shop.note && <span className="block text-[10px] text-ink-mute">{shop.note}</span>}
                    </span>
                    {count !== undefined && <span className="text-ink-mute whitespace-nowrap">{count.toLocaleString()}件</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/about#notation" className="text-[13px] text-brand-600 hover:text-brand-800">各店の保証・赤ロム保証の比較 ›</Link>
        </section>

        {/* 運営者 */}
        <section className="mt-[22px] p-4 bg-inspect-50 border border-inspect-line rounded-xl flex flex-col gap-1.5">
          <span className="text-xs font-bold text-inspect-800">運営者について</span>
          <span className="text-[13px] leading-[1.7] text-gray-700">
            中古スマホ店で検品を担当している GardenTree が運営しています。値段だけでなく、バッテリーや赤ロム保証など「買ってから困らない」ための情報を載せています。
          </span>
          <Link href="/about" className="text-[13px] text-brand-600 hover:text-brand-800">このサイトについて ›</Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
