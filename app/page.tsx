import Link from "next/link";
import { Search } from "lucide-react";
import { ALL_DEVICE_PAGE_MODELS, IPHONE_CATALOG, modelPagePath, slugToModel } from "@/lib/catalog";
import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { PIXEL_MODELS } from "@/lib/pixelCatalog";
import { GALAXY_MODELS } from "@/lib/galaxyCatalog";
import { MAC_MODELS } from "@/lib/macCatalog";
import { XPERIA_MODELS } from "@/lib/xperiaCatalog";
import { AQUOS_MODELS } from "@/lib/aquosCatalog";
import { WATCH_MODELS } from "@/lib/watchCatalog";
import { minPriceByModel } from "@/lib/budgetStats";
import { yen } from "@/lib/format";
import { monthJa, reportMonths } from "@/lib/monthlyReport";
import { comparePath } from "@/lib/compare";
import { IPHONE_PICKS, pickPath } from "@/lib/picks";
import { BUDGETS, GALAXY_BUDGETS, IPAD_BUDGETS, PIXEL_BUDGETS, budgetLabel, budgetPath } from "@/lib/budgets";
import prisma from "@/lib/prisma";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import { countPcItems, PC_MIN_INDEX_ITEMS } from "@/lib/pcInventory";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import PopularModels from "@/app/components/PopularModels";
import BudgetPicker, { type BudgetOption } from "@/app/components/BudgetPicker";
import { getModelMarket, getPriceDrops, shortDate, type ModelMarket } from "@/lib/marketStats";
import { rethrowDuringBuild } from "@/lib/buildGuard";
import { BUILD_TIME } from "@/lib/buildTime";
import { OFFICIAL_ACCOUNTS, SITE_NAME, SITE_URL } from "@/lib/site";

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
  { label: "MacBook", path: "/mac", models: MAC_MODELS },
  { label: "Xperia", path: "/xperia", models: XPERIA_MODELS },
  { label: "AQUOS", path: "/aquos", models: AQUOS_MODELS },
  { label: "Apple Watch", path: "/watch", models: WATCH_MODELS },
];

// シリーズのタイルの色（docs/design.md ではなく 10/16 の決定版の見本どおり）
const HUB_COLORS: Record<string, string> = {
  iPhone: "bg-[#312E81]",
  iPad: "bg-[#0F766E]",
  "Apple Watch": "bg-[#B45309]",
  Pixel: "bg-[#166534]",
  Galaxy: "bg-[#6D28D9]",
  MacBook: "bg-[#374151]",
  Xperia: "bg-[#1E40AF]",
  AQUOS: "bg-[#9A3412]",
};
// タイルの並び（見本: 件数の多い順ではなく固定）
const HUB_ORDER = ["iPhone", "iPad", "Apple Watch", "Pixel", "Galaxy", "MacBook", "Xperia", "AQUOS"];

// 末尾に名前を出す主な店（在庫がある店だけ）
const MAIN_SHOP_LABELS = ["イオシス", "じゃんぱら", "ソフマップ", "ゲオモバイル", "にこスマ", "ダイワンテレコム"];

const BUDGET_OPTIONS: BudgetOption[] = [
  { device: "iphone", label: "iPhone", budgets: BUDGETS },
  { device: "ipad", label: "iPad", budgets: IPAD_BUDGETS },
  { device: "pixel", label: "Pixel", budgets: PIXEL_BUDGETS },
  { device: "galaxy", label: "Galaxy", budgets: GALAXY_BUDGETS },
];

const h2 = "text-[17px] font-bold";
const card = "bg-white border border-line rounded-xl";

/** 在庫の総数を「7.1万」のように（1万未満はそのまま） */
const manLabel = (n: number) => (n >= 10000 ? `${(Math.floor(n / 1000) / 10).toFixed(1)}万` : n.toLocaleString());

export default async function Home() {
  const [counts, prices, drops, popular, pcCount] = await Promise.all([shopCounts(), modelPrices(), getPriceDrops(7, 6), popularMarket(), countPcItems()]);
  // 店の数・一覧は、いま在庫がある店だけ（lib/activeShops.ts）
  const shops = await activeShops();
  const latestReport = reportMonths()[0];
  const total = SHOPS.reduce((n, s) => n + (counts.get(s.name) ?? 0), 0);
  const popularRows = POPULAR_MODELS.flatMap((m) => {
    const r = popular.get(m);
    return r ? [{ model: m, ...r }] : [];
  });
  // 人気の機種の横軸: 表示機種の相場の最大値 × 1.15
  const axisMax = Math.max(1, ...popularRows.map((r) => Math.max(r.medianPrice, r.minPrice))) * 1.15;

  const hubs = HUB_ORDER.flatMap((label) => {
    const h = DEVICE_HUBS.find((x) => x.label === label);
    if (!h) return [];
    return [{ ...h, n: h.models.reduce((sum, m) => sum + (prices.get(m)?.count ?? 0), 0) }];
  });

  // 値下がり（記録が足りないときは空で、節ごと出さない）。カタログから外した機種は除く
  const dropRows = drops.flatMap((d) => {
    const model = slugToModel(d.modelSlug);
    return model ? [{ ...d, model }] : [];
  });
  const maxRate = Math.max(1, ...dropRows.map((d) => d.rate));

  // よく比較される機種: 両方の最安値があるものから3つ（差は2機種の最安値の差）
  const compareCards = FEATURED_COMPARES.flatMap(([a, b]) => {
    const pa = prices.get(a)?.minPrice;
    const pb = prices.get(b)?.minPrice;
    return pa !== undefined && pb !== undefined ? [{ a, b, diff: Math.abs(pa - pb) }] : [];
  }).slice(0, 3);

  const mainShops = MAIN_SHOP_LABELS.filter((l) => shops.some((s) => s.label === l));
  const restShops = shops.length - mainShops.length;

  // サイトと運営の公式アカウント（sameAs）。Organization はトップだけに置く
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        sameAs: OFFICIAL_ACCOUNTS,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        inLanguage: "ja",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader />

      {/* 冒頭: h1・数字タイル・検索欄 */}
      <section className="bg-white border-b border-line">
        <div className="max-w-[1360px] mx-auto px-4 pt-[18px] pb-4 flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-x-10 md:items-center md:py-8">
          <div className="flex flex-col gap-3 md:row-span-2">
            <h1 className="text-[22px] md:text-4xl leading-[1.3] font-bold">
              中古スマホの最安値を
              <br />
              {shops.length}店からまとめて
            </h1>
            <p className="hidden md:block text-[11px] text-ink-mute">
              更新 {BUILD_TIME} ・ <span className="border border-[#C7CBD4] rounded px-1">PR</span> アフィリエイト広告を利用しています
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full">
            <div className="bg-brand-50 rounded-xl py-2.5 px-2 flex flex-col items-center">
              <span className="text-xl font-bold text-brand-900">{shops.length}</span>
              <span className="text-[10px] text-ink-sub">店</span>
            </div>
            {total > 0 && (
              <div className="bg-brand-50 rounded-xl py-2.5 px-2 flex flex-col items-center">
                <span className="text-xl font-bold text-brand-900">{manLabel(total)}</span>
                <span className="text-[10px] text-ink-sub">件の在庫</span>
              </div>
            )}
            <div className="bg-brand-50 rounded-xl py-2.5 px-2 flex flex-col items-center">
              <span className="text-xl font-bold text-brand-900">4回</span>
              <span className="text-[10px] text-ink-sub">毎日更新</span>
            </div>
          </div>
          <form action="/search" method="GET" className="flex gap-2 w-full">
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
          <p className="md:hidden text-[11px] text-ink-mute">
            更新 {BUILD_TIME} ・ <span className="border border-[#C7CBD4] rounded px-1">PR</span> アフィリエイト広告を利用しています
          </p>
        </div>
      </section>

      <main className="max-w-[1360px] mx-auto px-4 pb-6">
        {/* シリーズのタイル */}
        <nav aria-label="シリーズから探す" className="pt-4 grid grid-cols-4 md:grid-cols-8 gap-2">
          {hubs.map((h) => (
            <Link
              key={h.path}
              href={h.path}
              className={`${HUB_COLORS[h.label]} text-white rounded-xl py-3 px-1.5 flex flex-col items-center gap-0.5 hover:opacity-90`}
            >
              <span className="text-[13px] font-bold">{h.label === "Apple Watch" ? "Watch" : h.label}</span>
              {h.n > 0 && <span className="text-[10px] opacity-85">{h.n.toLocaleString()}</span>}
            </Link>
          ))}
        </nav>

        {/* 中古パソコン（2026-10-27〜）。タイルは8つで固定なので、その下に1行で */}
        {pcCount >= PC_MIN_INDEX_ITEMS && (
          <Link href="/pc" className={`${card} mt-2 px-3.5 py-2.5 flex items-center justify-between text-sm hover:bg-ground`}>
            <span className="font-bold text-ink">中古パソコン（Windows・MacBook）の最安値・相場</span>
            <span className="text-xs text-ink-mute">{pcCount.toLocaleString()}件 ›</span>
          </Link>
        )}

        {/* 人気の機種 */}
        {popularRows.length > 0 && (
          <section className="pt-5 flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className={h2}>人気の機種</h2>
              <Link href="/iphone" className="text-xs text-brand-600 hover:text-brand-800">全機種の相場 ›</Link>
            </div>
            <div className={`${card} px-3.5 py-3 flex flex-col gap-2.5`}>
              <div className="flex gap-3 text-[10px] text-ink-mute">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-price rounded-sm" />最安値</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-[#CBD5E1] rounded-sm" />相場まで</span>
                <span className="ml-auto">横軸 0〜{Math.round(axisMax / 10000)}万円</span>
              </div>
              <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-x-8">
                {popularRows.map((r) => {
                  const minW = (r.minPrice / axisMax) * 100;
                  const gapW = (Math.max(r.medianPrice - r.minPrice, 0) / axisMax) * 100;
                  return (
                    <Link key={r.model} href={modelPagePath(r.model)} className="flex flex-col gap-[3px] text-ink">
                      <span className="flex justify-between gap-2 text-xs">
                        <span className="font-bold">{r.model}</span>
                        <span className="text-right">
                          <span className="text-price font-bold">{yen(r.minPrice)}</span>
                          <span className="text-ink-mute"> / {yen(r.medianPrice)} ・ {r.count.toLocaleString()}件</span>
                        </span>
                      </span>
                      <span className="flex h-2.5 rounded-[5px] overflow-hidden bg-line-soft">
                        <span className="bg-price" style={{ width: `${minW}%` }} />
                        <span className="bg-[#CBD5E1]" style={{ width: `${gapW}%` }} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <PopularModels />

        {/* 予算と値下がり（PC は横並び） */}
        <div className="md:grid md:grid-cols-2 md:gap-x-6">
        {/* 予算から探す */}
        <section className="pt-5 flex flex-col gap-2.5">
          <h2 className={h2}>予算から探す</h2>
          <BudgetPicker options={BUDGET_OPTIONS} />
          {/* JS が無いときの予算リンク（クローラーにも見える） */}
          <noscript>
            <div className="flex flex-col gap-1 text-xs">
              {BUDGET_OPTIONS.map((o) => (
                <p key={o.device} className="flex flex-wrap gap-x-3">
                  <span className="font-bold text-ink-sub">{o.label}</span>
                  {o.budgets.map((max) => (
                    <Link key={max} href={budgetPath(max, o.device)} className="text-brand-600">{budgetLabel(max)}以下</Link>
                  ))}
                </p>
              ))}
            </div>
          </noscript>
        </section>

          {dropRows.length > 0 && (
            <section className="pt-5 flex flex-col gap-2.5">
              <h2 className={h2}>この1週間の値下がり</h2>
              <div className={`${card} px-3.5 py-3 flex flex-col gap-[9px]`}>
                {dropRows.map((d) => (
                  <Link key={d.modelSlug} href={modelPagePath(d.model)} className="grid grid-cols-[120px_1fr_52px] items-center gap-2 text-ink">
                    <span className="text-xs font-bold truncate">{d.model}</span>
                    <span className="flex h-3 rounded-md overflow-hidden bg-line-soft">
                      <span className="bg-safe" style={{ width: `${(d.rate / maxRate) * 100}%` }} />
                    </span>
                    <span className="text-xs text-safe font-bold text-right">−{d.rate.toFixed(1)}%</span>
                  </Link>
                ))}
                <p className="text-[10px] text-ink-mute">
                  {shortDate(dropRows[0].fromDate)} → {shortDate(dropRows[0].toDate)} の相場（中央値）の下げ幅。在庫がいちばん多い容量で比較 ・{" "}
                  <Link href="/iphone" className="text-brand-600 hover:text-brand-800">すべて見る ›</Link>
                </p>
              </div>
            </section>
          )}
        </div>

          {compareCards.length > 0 && (
            <section className="pt-5 flex flex-col gap-2.5">
              <h2 className={h2}>よく比較される機種</h2>
              <div className="grid grid-cols-3 gap-2">
                {compareCards.map(({ a, b, diff }) => (
                  <Link key={comparePath(a, b)} href={comparePath(a, b)} className={`${card} p-2.5 flex flex-col gap-1 text-ink hover:border-brand-200`}>
                    <span className="text-[11px] font-bold">{shortModel(a)} vs {shortModel(b)}</span>
                    <span className="text-[10px] text-ink-mute">最安の差</span>
                    <span className="text-sm font-bold">{yen(diff)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

        {/* 末尾: 比較している店・目的から探す・運営者 */}
        <section className="pt-5 flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-ink-sub">
            <span>比較している{shops.length}店:</span>
            {mainShops.map((l, i) => (
              <span key={l}>{i > 0 && "・"}{l}</span>
            ))}
            {restShops > 0 && (
              <span>
                ・<Link href="/about#notation" className="text-brand-600 hover:text-brand-800">ほか{restShops}店</Link>
              </span>
            )}
            <Link href="/iphone/where-to-buy" className="text-brand-600 hover:text-brand-800 ml-1.5">中古iPhoneはどこで買う？ ›</Link>
            {/* 月次の相場レポート（終わった月があるときだけ） */}
            {latestReport && <Link href={`/iphone/report/${latestReport}`} className="text-brand-600 hover:text-brand-800 ml-1.5">中古iPhone相場レポート {monthJa(latestReport)} ›</Link>}
          </p>
          {/* iPhone の目的別ページ（/pick/…）へのリンクはここだけ。消すと孤立する */}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-sub">
            <span>iPhone を目的から探す:</span>
            {IPHONE_PICKS.map((p) => (
              <Link key={p.slug} href={pickPath(p.slug)} className="text-brand-600 hover:text-brand-800">{p.title}</Link>
            ))}
          </p>
          <p className="text-[11px] text-ink-mute">
            運営: 中古スマホ店の検品担当 ・ <Link href="/about" className="text-brand-600 hover:text-brand-800">このサイトについて</Link>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/** "iPhone 13" → "13"（比較カードの短い表記） */
function shortModel(model: string): string {
  return model.replace(/^iPhone /, "");
}
