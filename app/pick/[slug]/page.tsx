import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DeviceCard from "@/app/components/DeviceCard";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { modelPagePath, seriesOf } from "@/lib/catalog";
import { getModelStats } from "@/lib/modelStats";
import { PICKS, findPick, pickPath, pickSearchHref } from "@/lib/picks";
import { SITE_NAME } from "@/lib/site";
import { yen } from "@/lib/format";

// 静的に生成して CDN から配信する（検索ページと違い、休止明けでも待たされない）。在庫は1時間ごとに更新
export const revalidate = 3600;
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

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <SiteHeader label="目的・予算から探す" />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-slate-400 mb-4">
          <Link href="/" className="hover:text-blue-600">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-600">{pick.title}</span>
        </nav>

        <h1 className="text-2xl md:text-4xl font-extrabold mb-3">{pick.title}</h1>
        <p className="text-slate-600 mb-4 leading-relaxed">{pick.lead}</p>
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
              {seriesOf(name) && (
                <p className="text-[11px] text-slate-400 mt-3 line-clamp-2">{seriesOf(name)!.badges.join("・")}</p>
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
            {PICKS.filter((p) => p.slug !== pick.slug).map((p) => (
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
