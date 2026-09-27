import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DeviceCard from "@/app/components/DeviceCard";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { modelPagePath } from "@/lib/catalog";
import { BUDGETS, budgetLabel, budgetPath, budgetSlug, slugToBudget } from "@/lib/budgets";
import { cheapestUnder, getBudgetModels } from "@/lib/budgetStats";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { yen } from "@/lib/format";

// 静的に生成して CDN から配信する。在庫は1時間ごとに更新
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return BUDGETS.map((max) => ({ slug: budgetSlug(max) }));
}

type Props = { params: Promise<{ slug: string }> };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const max = slugToBudget(slug);
  if (!max) return {};
  const rows = await getBudgetModels(max);
  const newest = rows.find((r) => r.supported) ?? rows[0];
  const label = budgetLabel(max);
  const title = `${label}以下で買える中古iPhone｜予算内でいちばん新しい機種【毎日更新】`;
  const description = newest
    ? `${label}以下で買える中古iPhoneは${rows.length}機種・${rows.reduce((n, r) => n + r.count, 0).toLocaleString()}件。いちばん新しいのは${newest.model}（${yen(newest.minPrice)}〜）。大手中古ショップ7社の在庫から機種ごとの最安値を比較。`
    : `${label}以下で買える中古iPhoneを大手中古ショップ7社の在庫から探せます。`;
  const path = budgetPath(max);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, images: ["/opengraph-image"] },
    robots: rows.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function BudgetPage({ params }: Props) {
  const { slug } = await params;
  const max = slugToBudget(slug);
  if (!max) notFound();

  const label = budgetLabel(max);
  const rows = await getBudgetModels(max);
  const supported = rows.filter((r) => r.supported);
  const legacy = rows.filter((r) => !r.supported);
  const totalCount = rows.reduce((n, r) => n + r.count, 0);

  // 予算内で買える新しい機種（iOS 27 対応）それぞれの最安の在庫
  const picks = (await Promise.all(supported.slice(0, 6).map((r) => cheapestUnder(r.model, max)))).filter(
    (d) => d !== null,
  );

  const path = budgetPath(max);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: `${label}以下の中古iPhone`, item: `${SITE_URL}${path}` },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <SiteHeader label="予算から探す" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-slate-400 mb-4">
          <Link href="/" className="hover:text-blue-600">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-600">{label}以下の中古iPhone</span>
        </nav>

        <h1 className="text-2xl md:text-4xl font-extrabold mb-3">{label}以下で買える中古iPhone</h1>
        <p className="text-slate-600 mb-4 leading-relaxed">
          {rows.length > 0 ? (
            <>
              {label}以下で買える中古iPhoneは <strong>{rows.length}機種・{totalCount.toLocaleString()}件</strong>
              （ジャンク品を除く）。
              {supported[0] && (
                <>
                  最新の iOS 27 に対応した機種でいちばん新しいのは <strong>{supported[0].model}</strong>（{yen(supported[0].minPrice)}〜）です。
                </>
              )}
            </>
          ) : (
            <>いまは{label}以下の在庫がありません。</>
          )}
        </p>
        <AdDisclosure compact />

        {/* 予算の切り替え */}
        <div className="flex flex-wrap gap-2 my-6">
          {BUDGETS.map((b) => (
            <Link
              key={b}
              href={budgetPath(b)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                b === max
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {budgetLabel(b)}以下
            </Link>
          ))}
        </div>

        {supported.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-1">{label}以下で買える機種（新しい順）</h2>
            <p className="text-xs text-slate-400 mb-4">iOS 27 対応。機種名から容量別・状態別の価格まとめへ</p>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-3 bg-slate-50 text-xs font-bold text-slate-500">
                <span>機種</span>
                <span className="text-right">最安値</span>
                <span className="text-right w-16">在庫</span>
              </div>
              {supported.map((r) => (
                <Link
                  key={r.model}
                  href={modelPagePath(r.model)}
                  className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-3 border-t border-slate-100 hover:bg-blue-50 transition-colors items-center"
                >
                  <span className="font-bold text-slate-800">{r.model} <span className="text-slate-300">›</span></span>
                  <span className="text-right font-black text-red-600">{yen(r.minPrice)}</span>
                  <span className="text-right w-16 text-sm text-slate-500">{r.count.toLocaleString()}件</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {picks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-1">新しい機種の最安在庫</h2>
            <p className="text-xs text-slate-400 mb-4">上の表の新しい機種から、それぞれいちばん安い在庫</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {picks.map((d) => <DeviceCard key={d.id} device={d} />)}
            </div>
          </section>
        )}

        {legacy.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-1">iOS 27 非対応の旧機種</h2>
            <p className="text-xs text-slate-400 mb-3">最新の iOS や一部のアプリが使えないため、メイン機には向きません（サブ機・撮影用など）</p>
            <div className="flex flex-wrap gap-2">
              {legacy.map((r) => (
                <Link key={r.model} href={modelPagePath(r.model)}
                  className="px-4 py-2 rounded-xl text-sm bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                  {r.model} <span className="font-bold text-red-600">{yen(r.minPrice)}〜</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="text-center mb-4">
          <Link
            href={`/search?${new URLSearchParams({ maxPrice: String(max) }).toString()}`}
            className="inline-flex items-center px-8 py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-blue-600 transition-colors"
          >
            {label}以下の在庫をすべて見る &rarr;
          </Link>
          <p className="text-xs text-slate-400 mt-3">容量・状態ランク・バッテリー残量で絞り込めます</p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
