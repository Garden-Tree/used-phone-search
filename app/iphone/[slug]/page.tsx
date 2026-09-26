import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DeviceCard from "@/app/components/DeviceCard";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import {
  ALL_PAGE_MODELS,
  IPHONE_CATALOG,
  modelPagePath,
  modelToSlug,
  seriesOf,
  siblingModels,
  slugToModel,
} from "@/lib/catalog";
import { getModelStats, type PriceRow } from "@/lib/modelStats";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// スクレイパーは6時間ごとに実行されるため、1時間ごとに再生成すれば十分新しい
export const revalidate = 3600;

// カタログ外のslugは404
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_PAGE_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}

type Props = { params: Promise<{ slug: string }> };

const yen = (n: number) => `${n.toLocaleString()}円`;
const storageLabel = (gb: string) => (Number(gb) >= 1024 ? `${Number(gb) / 1024}TB` : `${gb}GB`);
const searchHref = (model: string, extra: Record<string, string> = {}) =>
  `/search?${new URLSearchParams({ model, ...extra }).toString()}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const model = slugToModel(slug);
  if (!model) return {};

  const stats = await getModelStats(model);
  const title = `${model} 中古の最安値・価格比較`;
  const description = stats.minPrice !== null
    ? `${model}の中古最安値は${yen(stats.minPrice)}。${stats.shopCount}ショップ・${stats.count}件の在庫を容量・状態ランク別に比較。イオシス、ゲオモバイル、にこスマなど大手中古ショップの価格を毎日更新。`
    : `${model}の中古在庫を大手中古ショップ5社から一括比較。容量・状態ランク別の最安値をまとめています。`;
  const path = modelPagePath(model);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path },
    // 在庫ゼロの薄いページはインデックスさせない
    robots: stats.count === 0 ? { index: false, follow: true } : undefined,
  };
}

function PriceTable({ title, rows, labelOf, hrefOf }: {
  title: string;
  rows: PriceRow[];
  labelOf: (key: string) => string;
  hrefOf: (key: string) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
      <h2 className="px-5 py-4 text-base font-bold text-slate-800 bg-slate-50 border-b border-slate-100">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-400">
            <th className="text-left font-semibold px-5 py-2"></th>
            <th className="text-right font-semibold px-5 py-2">最安値</th>
            <th className="text-right font-semibold px-5 py-2">在庫数</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-5 py-3 font-bold text-slate-700">
                <Link href={hrefOf(r.key)} className="hover:text-blue-600 underline-offset-4 hover:underline">
                  {labelOf(r.key)}
                </Link>
              </td>
              <td className="px-5 py-3 text-right font-black text-red-600">{yen(r.minPrice)}</td>
              <td className="px-5 py-3 text-right text-slate-500">{r.count}件</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function ModelPage({ params }: Props) {
  const { slug } = await params;
  const model = slugToModel(slug);
  if (!model) notFound();

  const stats = await getModelStats(model);
  const series = seriesOf(model);
  const siblings = siblingModels(model);
  const path = modelPagePath(model);

  // 前後のシリーズへの導線
  const seriesIdx = series ? IPHONE_CATALOG.indexOf(series) : -1;
  const neighborSeries = [IPHONE_CATALOG[seriesIdx - 1], IPHONE_CATALOG[seriesIdx + 1]].filter(Boolean);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: `${model} 中古`, item: `${SITE_URL}${path}` },
      ],
    },
    ...(stats.minPrice !== null && stats.maxPrice !== null
      ? [{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${model}（中古）`,
          brand: { "@type": "Brand", name: "Apple" },
          itemCondition: "https://schema.org/UsedCondition",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "JPY",
            lowPrice: stats.minPrice,
            highPrice: stats.maxPrice,
            offerCount: stats.count,
            availability: "https://schema.org/InStock",
          },
        }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader label="価格比較" />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-slate-400 mb-4">
          <Link href="/" className="hover:text-blue-600">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-600">{model}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
          {model} 中古の最安値・価格比較
        </h1>
        <p className="text-slate-500 text-sm mb-4">
          大手中古ショップ5社の在庫をまとめて比較しています。
          {stats.lastUpdated && (
            <>最終更新: {stats.lastUpdated.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" })}</>
          )}
        </p>
        <AdDisclosure compact />

        {/* サマリー */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
          {[
            { label: "最安値", value: stats.minPrice !== null ? yen(stats.minPrice) : "-", accent: true },
            { label: "価格の中央値", value: stats.medianPrice !== null ? yen(stats.medianPrice) : "-" },
            { label: "在庫数", value: `${stats.count}件` },
            { label: "取扱ショップ", value: `${stats.shopCount}店` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-black tracking-tight ${s.accent ? "text-red-600" : "text-slate-800"}`}>{s.value}</p>
            </div>
          ))}
        </section>

        {stats.count === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-slate-200 mb-10">
            <p className="text-slate-500 text-lg">現在、{model}の在庫はありません。</p>
            <p className="text-sm text-slate-400 mt-2">在庫は6時間ごとに更新されます。同じシリーズの他モデルもチェックしてみてください。</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
              <PriceTable title="容量別の最安値" rows={stats.byStorage} labelOf={storageLabel}
                hrefOf={(k) => searchHref(model, { storage: k })} />
              <PriceTable title="状態ランク別の最安値" rows={stats.byRank} labelOf={(k) => `ランク ${k}`}
                hrefOf={(k) => searchHref(model, { rank: k })} />
              <PriceTable title="ショップ別の最安値" rows={stats.byShop} labelOf={(k) => k}
                hrefOf={(k) => searchHref(model, { shop: k })} />
            </div>

            <section className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold mb-4">いま一番安い{model}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {stats.cheapest.map((d) => <DeviceCard key={d.id} device={d} />)}
              </div>
              <div className="text-center mt-8">
                <Link href={searchHref(model)}
                  className="inline-flex items-center px-8 py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-blue-600 transition-colors">
                  {model}の在庫をすべて見る（{stats.count}件）&rarr;
                </Link>
              </div>
            </section>
          </>
        )}

        {/* モデルの特徴 */}
        {series && (
          <section className="mb-10 rounded-3xl bg-slate-50 p-6">
            <h2 className="text-lg font-bold mb-3">{series.series}の特徴</h2>
            <div className="flex flex-wrap gap-2">
              {series.badges.map((b) => (
                <span key={b} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-slate-600 border border-slate-200">{b}</span>
              ))}
            </div>
          </section>
        )}

        {/* 関連モデル */}
        <section className="mb-4">
          <h2 className="text-lg font-bold mb-3">関連モデルの中古価格</h2>
          <div className="flex flex-wrap gap-2">
            {[...siblings, ...neighborSeries.flatMap((s) => s.models)].map((m) => (
              <Link key={m} href={modelPagePath(m)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                {m}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
