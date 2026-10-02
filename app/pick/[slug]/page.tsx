import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DeviceCard from "@/app/components/DeviceCard";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { badgesOf, modelPagePath } from "@/lib/catalog";
import { getModelStats } from "@/lib/modelStats";
import { PICKS, findPick, pickDevice, pickPath, pickSearchHref } from "@/lib/picks";
import { jaMonth, updateUntil } from "@/lib/pixelCatalog";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { yen } from "@/lib/format";

// 静的に生成して CDN から配信する（検索ページと違い、休止明けでも待たされない）。在庫は3時間ごとに更新
export const revalidate = 10800; // 3時間（Neon の計算時間を減らすため。2026-10-02）
export const dynamicParams = false;

export function generateStaticParams() {
  return PICKS.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pick = findPick(slug);
  if (!pick) return {};
  const path = pickPath(pick.slug);
  return {
    title: pick.seoTitle,
    description: pick.lead,
    alternates: { canonical: path },
    openGraph: { title: `${pick.seoTitle} | ${SITE_NAME}`, description: pick.lead, url: path, images: ["/opengraph-image"] },
  };
}

export default async function PickPage({ params }: Props) {
  const { slug } = await params;
  const pick = findPick(slug);
  if (!pick) notFound();

  const models = await Promise.all(
    pick.models.map(async (name) => ({ name, stats: await getModelStats(name) })),
  );
  const totalCount = models.reduce((n, m) => n + m.stats.count, 0);
  // 対象モデル全体で安い順。「目的から探す」人向けなので、動作保証のないジャンク品（ランクJ）は除く
  const cheapest = models
    .flatMap((m) => m.stats.cheapest)
    .filter((d) => !["J", "ジャンク"].includes(d.conditionRank.toUpperCase()))
    .sort((a, b) => a.price - b.price)
    .slice(0, 9);

  // パンくず（画面のパンくずと同じ並び。iPhone の目的別はトップの直下。名前は一覧ページの構造化データと揃える）
  const hub = pick.ipad ? { name: "中古iPadの相場一覧", path: "/ipad" }
    : pick.pixel ? { name: "中古Google Pixelの相場一覧", path: "/pixel" }
    : pick.galaxy ? { name: "中古Galaxyの相場一覧", path: "/galaxy" }
    : null;
  const crumbs = [
    { name: SITE_NAME, item: SITE_URL },
    ...(hub ? [{ name: hub.name, item: `${SITE_URL}${hub.path}` }] : []),
    { name: pick.title, item: `${SITE_URL}${pickPath(pick.slug)}` },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, ...c })),
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="目的・予算から探す" />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-slate-400 mb-4">
          <Link href="/" className="hover:text-blue-600">トップ</Link>
          <span className="mx-2">›</span>
          {pick.ipad && (
            <>
              <Link href="/ipad" className="hover:text-blue-600">中古iPad</Link>
              <span className="mx-2">›</span>
            </>
          )}
          {pick.pixel && (
            <>
              <Link href="/pixel" className="hover:text-blue-600">中古Google Pixel</Link>
              <span className="mx-2">›</span>
            </>
          )}
          {pick.galaxy && (
            <>
              <Link href="/galaxy" className="hover:text-blue-600">中古Galaxy</Link>
              <span className="mx-2">›</span>
            </>
          )}
          <span className="text-slate-600">{pick.title}</span>
        </nav>

        <h1 className="text-2xl md:text-4xl font-extrabold mb-3">{pick.title}</h1>
        <p className="text-slate-600 mb-4 leading-relaxed">{pick.lead}</p>
        {pick.source && (
          <p className="text-xs text-slate-400 mb-4">
            対象機種の出典: <a href={pick.source.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">{pick.source.label}</a>
          </p>
        )}
        <AdDisclosure compact />

        {/* 対象モデルごとの最安値。カード全体が機種別ページへのリンク */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 my-6">
          {models.map(({ name, stats }) => (
            <Link
              key={name}
              href={modelPagePath(name)}
              className="group rounded-3xl border border-slate-200 p-4 md:p-5 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
            >
              <p className="font-extrabold text-slate-800 group-hover:text-blue-600">{name}</p>
              <p className="text-xs font-bold text-slate-400 mt-3">中古の最安値</p>
              <p className="text-2xl font-black text-red-600 tracking-tight">
                {stats.minPrice !== null ? yen(stats.minPrice) : "在庫なし"}
              </p>
              <p className="text-xs text-slate-500 mt-1">{stats.count.toLocaleString()}件の在庫</p>
              {badgesOf(name).length > 0 && (
                <p className="text-[11px] text-slate-400 mt-3 line-clamp-2">{badgesOf(name).join("・")}</p>
              )}
              {updateUntil(name) && (
                <p className="text-[11px] text-slate-400 mt-3">アップデート保証 {jaMonth(updateUntil(name)!)}まで</p>
              )}
              <p className="text-xs font-bold text-blue-600 mt-3">価格まとめを見る &rarr;</p>
            </Link>
          ))}
        </section>

        {cheapest.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-1">いま安い順</h2>
            <p className="text-xs text-slate-400 mb-4">ジャンク品（ランクJ）を除いています</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {cheapest.map((d) => <DeviceCard key={d.id} device={d} />)}
            </div>
          </section>
        )}

        <div className="text-center mb-10">
          <Link
            href={pickSearchHref(pick)}
            className="inline-flex items-center px-8 py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-blue-600 transition-colors"
          >
            すべての在庫を見る（{totalCount.toLocaleString()}件）&rarr;
          </Link>
          <p className="text-xs text-slate-400 mt-3">容量・状態ランク・価格帯で絞り込めます</p>
        </div>

        {/* ほかの目的 */}
        <section className="mb-4">
          <h2 className="text-lg font-bold mb-3">ほかの目的から探す</h2>
          <div className="flex flex-wrap gap-2">
            {PICKS.filter((p) => p.slug !== pick.slug && pickDevice(p) === pickDevice(pick)).map((p) => (
              <Link key={p.slug} href={pickPath(p.slug)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                {p.title}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
