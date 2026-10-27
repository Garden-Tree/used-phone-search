import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import PcItemRow, { type PcRowItem } from "@/app/components/PcItemRow";
import PcItemList from "@/app/components/PcItemList";
import PcPriceMatrix from "@/app/components/PcPriceMatrix";
import { affiliateLinkType, affiliateUrl } from "@/lib/affiliate";
import { yen } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import {
  bestWithin, cpuMemoryMatrix, getPcItems, pcBudgetPath, pcBudgetSlug, pcSlugToBudget,
  PC_BUDGETS, PC_BUDGET_MIN_INDEX_ITEMS, PC_SHOPS, type PcItem,
} from "@/lib/pcInventory";

// 予算別の中古ノートパソコン（/pc/budget/under-30000 など・2026-10-27〜）。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return PC_BUDGETS.map((max) => ({ slug: pcBudgetSlug(max) }));
}

type Props = { params: Promise<{ slug: string }> };

const man = (max: number) => `${max / 10000}万円`;
// 予算内で買える、まともに使える在庫（訳ありと Windows 11 非対応を除く）
const usable = (items: PcItem[], max: number) =>
  items.filter((p) => p.formFactor === "note" && p.price <= max && p.conditionRank !== "J" && p.win11);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const max = pcSlugToBudget((await params).slug);
  if (!max) return {};
  const n = usable(await getPcItems(), max).length;
  const title = `${man(max)}以内で買える中古ノートパソコン（Windows 11 対応）おすすめと相場【毎日更新】`;
  const description = `予算${man(max)}以内で買える中古のWindowsノートパソコン${n}件から、CPU・メモリ・SSDの条件がいい順におすすめを紹介。CPU×メモリ別の相場も専門店の在庫から毎日更新。`;
  const path = pcBudgetPath(max);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path },
    ...(n < PC_BUDGET_MIN_INDEX_ITEMS ? { robots: { index: false, follow: true } } : {}),
  };
}

const withLink = (p: PcItem): PcRowItem => {
  const href = affiliateUrl(p.shopName, p.url);
  return { ...p, href, linkType: affiliateLinkType(href) };
};

export default async function PcBudgetPage({ params }: Props) {
  const max = pcSlugToBudget((await params).slug);
  if (!max) notFound();
  const items = await getPcItems();
  const inBudget = usable(items, max);
  const best = bestWithin(items, "note", max, 5);
  const matrix = cpuMemoryMatrix(inBudget, "note", 2);
  const mem16 = inBudget.filter((p) => p.memoryGB >= 16).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "中古パソコン", item: `${SITE_URL}/pc` },
      { "@type": "ListItem", position: 3, name: `${man(max)}以内`, item: `${SITE_URL}${pcBudgetPath(max)}` },
    ],
  };

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="パソコン" />

      <main className="max-w-[1360px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <Link href="/pc" className="hover:text-brand-800">中古パソコン</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">{man(max)}以内</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">{man(max)}以内で買える中古ノートパソコン</h1>
        <p className="text-ink-sub mb-4 leading-relaxed">
          中古パソコン専門店（{PC_SHOPS.join("・")}）の在庫のうち、{yen(max)}以内で Windows 11 に対応するノートは <strong>{inBudget.length.toLocaleString()}件</strong>
          {inBudget.length > 0 && <>（うちメモリ16GB以上は {mem16.toLocaleString()}件）</>}です。訳あり品は除いています。
        </p>
        <nav aria-label="ほかの予算" className="flex flex-wrap gap-2 mb-4">
          {PC_BUDGETS.map((b) => (
            <Link
              key={b}
              href={pcBudgetPath(b)}
              className={`px-3 py-1.5 rounded-full text-sm border ${b === max ? "bg-brand-600 text-white border-brand-600" : "bg-white border-line hover:bg-ground"}`}
            >
              {man(b)}以内
            </Link>
          ))}
        </nav>
        <AdDisclosure compact />

        {best.length > 0 && (
          <section className="my-8">
            <h2 className="text-xl font-bold mb-1">{man(max)}以内でいちばん条件のいい5台</h2>
            <p className="text-xs text-ink-mute mb-3">CPU の新しさ→メモリ→SSD の順に並べ、同じ機種・構成はいちばん安い1件だけにしています。</p>
            <div className="bg-white rounded-xl border border-line overflow-hidden">
              {best.map((p, i) => <PcItemRow key={p.url} p={withLink(p)} first={i === 0} />)}
            </div>
          </section>
        )}

        {matrix.rows.length > 0 && (
          <section className="my-8">
            <h2 className="text-xl font-bold mb-1">{man(max)}以内の相場（CPU × メモリ）</h2>
            <p className="text-xs text-ink-mute mb-3">縦が CPU、横がメモリ。マスの大きい数字は、この予算内の在庫の相場（中央値）です。</p>
            <PcPriceMatrix m={matrix} />
          </section>
        )}

        {inBudget.length > 0 && (
          <section className="my-8">
            <h2 className="text-xl font-bold mb-3">{man(max)}以内の在庫（安い順）</h2>
            <PcItemList items={inBudget.map(withLink)} />
          </section>
        )}

        <p className="text-xs text-ink-mute leading-relaxed">
          価格は税込・取得時点のものです。状態ランクは店ごとの基準です。在庫・保証・付属品は各店のページでご確認ください。
          全体の相場は <Link href="/pc" className="underline hover:text-brand-800">中古パソコンの最安値・相場</Link> へ。
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
