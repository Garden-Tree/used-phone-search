import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { getModelMarket } from "@/lib/marketStats";
import { isIpad, modelPagePath } from "@/lib/catalog";
import { COMPARE_PAIRS, comparePath } from "@/lib/compare";
import { IPAD_CATALOG, IPAD_MODELS } from "@/lib/ipadCatalog";
import { specOf } from "@/lib/iphoneSpecs";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { yen } from "@/lib/format";
import { IPAD_SHOPS, shopLabels } from "@/lib/shops";
import { IPAD_BUDGETS, budgetLabel, budgetPath } from "@/lib/budgets";
import { IPAD_PICKS, pickPath } from "@/lib/picks";

// iPad の機種一覧。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

const TITLE = "中古iPadの相場・最安値を機種別に比較【毎日更新】";
const DESCRIPTION =
  `中古iPad（iPad・iPad mini・iPad Air・iPad Pro）の相場（中央値）・最安値・在庫数を機種別に比較。${shopLabels(IPAD_SHOPS)}の在庫から毎日更新。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ipad" },
  openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: "/ipad" },
};


export default async function IpadIndexPage() {
  // 相場（中央値）・最安値・件数。/iphone・機種ページと同じ集計
  const stats = await getModelMarket(IPAD_MODELS);
  const total = [...stats.values()].reduce((n, r) => n + r.count, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "中古iPadの相場一覧", item: `${SITE_URL}/ipad` },
    ],
  };

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="iPad" />

      <main className="max-w-[1120px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">中古iPad</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">中古iPadの相場・最安値</h1>
        <p className="text-ink-sub mb-4 leading-relaxed">
          {shopLabels(IPAD_SHOPS)}の中古iPad <strong>{total.toLocaleString()}件</strong>
          を機種別にまとめています。機種名から容量別・状態別の最安値へ。
        </p>
        <AdDisclosure compact />

        {/* 目的・予算から探す（/pick/ipad-…・/ipad/budget/…） */}
        <section className="my-6">
          <h2 className="text-lg font-bold mb-3">目的から探す</h2>
          <div className="flex flex-wrap gap-2">
            {IPAD_PICKS.map((p) => (
              <Link key={p.slug} href={pickPath(p.slug)}
                className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                {p.title}
              </Link>
            ))}
          </div>
          <h2 className="text-lg font-bold mt-5 mb-3">予算から探す</h2>
          <div className="flex flex-wrap gap-2">
            {IPAD_BUDGETS.map((max) => (
              <Link key={max} href={budgetPath(max, "ipad")}
                className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                {budgetLabel(max)}以下
              </Link>
            ))}
          </div>
        </section>

        {/* iPad の比較ページ */}
        <section className="my-6">
          <h2 className="text-lg font-bold mb-3">よく比較される iPad</h2>
          <div className="flex flex-wrap gap-2">
            {COMPARE_PAIRS.filter(([a]) => isIpad(a)).map(([a, b]) => (
              <Link key={comparePath(a, b)} href={comparePath(a, b)}
                className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                {a} <span className="text-ink-mute font-medium">vs</span> {b}
              </Link>
            ))}
          </div>
        </section>

        {IPAD_CATALOG.map((series) => (
          <section key={series.series} className="my-8">
            <h2 className="text-xl font-bold mb-3">{series.series}</h2>
            <div className="bg-white rounded-xl border border-line overflow-hidden">
              {series.models.map((model, i) => {
                const s = stats.get(model);
                const spec = specOf(model);
                return (
                  <Link
                    key={model}
                    href={modelPagePath(model)}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-3 hover:bg-ground items-center ${i > 0 ? "border-t border-line-soft" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-bold text-ink">{model} <span className="text-gray-300">›</span></span>
                      {spec && <span className="block text-[11px] text-ink-mute">{`${spec.released}・${spec.chip}・${spec.port}`}</span>}
                    </span>
                    <span className="text-right">
                      {s && <><span className="block text-[10px] text-ink-mute">相場</span><span className="font-bold text-ink">{yen(s.medianPrice)}</span></>}
                    </span>
                    <span className="text-right">
                      {s ? <><span className="block text-[10px] text-ink-mute">最安値</span><span className="font-bold text-price">{yen(s.minPrice)}</span></> : <span className="text-gray-300 font-normal text-sm">在庫なし</span>}
                    </span>
                    <span className="text-right w-16 text-sm text-ink-mute">{(s?.count ?? 0).toLocaleString()}件</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}
