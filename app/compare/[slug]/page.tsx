import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DeviceCard from "@/app/components/DeviceCard";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { modelPagePath, seriesOf } from "@/lib/catalog";
import { COMPARE_PAIRS, comparePath, compareSlug, comparesFor, slugToPair } from "@/lib/compare";
import { getModelStats, type ModelStats, type PriceRow } from "@/lib/modelStats";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { yen, storageLabel } from "@/lib/format";
import { shopsFor } from "@/lib/shops";
import { SPEC_ROWS, specOf, specUrl } from "@/lib/iphoneSpecs";

// モデル別ページと同じく1時間ごとに再生成
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARE_PAIRS.map(([a, b]) => ({ slug: compareSlug(a, b) }));
}

type Props = { params: Promise<{ slug: string }> };

const RANK_ORDER = ["S", "A", "B", "C", "D", "J"];

/** 2モデルの最安値の差から、ひと言まとめを作る */
function verdict(a: string, b: string, sa: ModelStats, sb: ModelStats): string {
  if (sa.minPrice === null && sb.minPrice === null) return `現在、${a}・${b}ともに在庫がありません。`;
  if (sa.minPrice === null) return `現在 ${a} の在庫はなく、${b} は ${yen(sb.minPrice!)} から購入できます。`;
  if (sb.minPrice === null) return `現在 ${b} の在庫はなく、${a} は ${yen(sa.minPrice)} から購入できます。`;

  const diff = sb.minPrice! - sa.minPrice;
  if (diff === 0) return `${a} と ${b} の中古最安値はどちらも ${yen(sa.minPrice)} で同じです。`;
  const [cheap, pricey] = diff > 0 ? [a, b] : [b, a];
  const rate = Math.round((Math.abs(diff) / Math.max(sa.minPrice, sb.minPrice!)) * 100);
  return `中古の最安値は ${cheap} のほうが ${yen(Math.abs(diff))}（約${rate}%）安く、価格重視なら ${cheap}、新しさや性能を優先するなら差額を払って ${pricey} という選び方になります。`;
}

/** 2モデルの行（容量・ランク）を突き合わせた比較表の行 */
function mergeRows(ra: PriceRow[], rb: PriceRow[], order: (k: string) => number) {
  const keys = Array.from(new Set([...ra, ...rb].map((r) => r.key))).sort((x, y) => order(x) - order(y));
  return keys.map((key) => ({
    key,
    a: ra.find((r) => r.key === key),
    b: rb.find((r) => r.key === key),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pair = slugToPair(slug);
  if (!pair) return {};
  const [a, b] = pair;
  const [sa, sb] = await Promise.all([getModelStats(a), getModelStats(b)]);

  const title = `${a} と ${b} 中古はどっちがお得？相場・価格比較`;
  const prices = [
    sa.minPrice !== null ? `${a}は${yen(sa.minPrice)}` : null,
    sb.minPrice !== null ? `${b}は${yen(sb.minPrice)}` : null,
  ].filter(Boolean).join("、");
  const description = `${a}と${b}の中古相場を大手中古ショップ${shopsFor(a).length}社の在庫から比較。${prices ? `最安値は${prices}から。` : ""}容量別・状態ランク別の最安値と差額をまとめています。`;
  const path = comparePath(a, b);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path },
    // どちらかの在庫がゼロだと比較として成り立たないのでインデックスさせない
    robots: sa.count === 0 || sb.count === 0 ? { index: false, follow: true } : undefined,
  };
}

function Cell({ row }: { row?: PriceRow }) {
  return row ? (
    <>
      <span className="font-black text-red-600 whitespace-nowrap">{yen(row.minPrice)}</span>
      <span className="block text-xs text-slate-400">{row.count.toLocaleString()}件</span>
    </>
  ) : (
    <span className="text-slate-300">在庫なし</span>
  );
}

function CompareTable({ title, rows, labelOf, a, b }: {
  title: string;
  rows: ReturnType<typeof mergeRows>;
  labelOf: (k: string) => string;
  a: string;
  b: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden mb-6">
      <h2 className="px-5 py-4 text-base font-bold text-slate-800 bg-slate-50 border-b border-slate-100">{title}</h2>
      {/* スマホ幅では列が収まらないことがあるので、表だけ横にスクロールできるようにする */}
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="text-left font-semibold pl-4 pr-2 sm:px-5 py-2"></th>
            <th className="text-right font-semibold px-2 sm:px-5 py-2">{a}</th>
            <th className="text-right font-semibold px-2 sm:px-5 py-2">{b}</th>
            <th className="text-right font-semibold pl-2 pr-4 sm:px-5 py-2">差額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const diff = r.a && r.b ? r.b.minPrice - r.a.minPrice : null;
            return (
              <tr key={r.key} className="border-t border-slate-100">
                <td className="pl-4 pr-2 sm:px-5 py-3 font-bold text-slate-700 whitespace-nowrap">{labelOf(r.key)}</td>
                <td className="px-2 sm:px-5 py-3 text-right"><Cell row={r.a} /></td>
                <td className="px-2 sm:px-5 py-3 text-right"><Cell row={r.b} /></td>
                <td className="pl-2 pr-4 sm:px-5 py-3 text-right text-slate-600 whitespace-nowrap">
                  {diff === null ? "-" : `${diff > 0 ? "+" : diff < 0 ? "-" : "±"}${Math.abs(diff).toLocaleString()}円`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </section>
  );
}

/** 2機種のスペックの違い（両方のスペックを確かめてある機種どうしのときだけ。違う項目は太字） */
function SpecTable({ a, b }: { a: string; b: string }) {
  const sa = specOf(a);
  const sb = specOf(b);
  if (!sa || !sb) return null;
  return (
    <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden mb-10">
      <h2 className="px-5 py-4 text-base font-bold text-slate-800 bg-slate-50 border-b border-slate-100">スペックの違い</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="text-left font-semibold pl-4 pr-2 sm:px-5 py-2"></th>
              <th className="text-left font-semibold px-2 sm:px-5 py-2">{a}</th>
              <th className="text-left font-semibold pl-2 pr-4 sm:px-5 py-2">{b}</th>
            </tr>
          </thead>
          <tbody>
            {SPEC_ROWS.map((r) => {
              const va = r.value(sa);
              const vb = r.value(sb);
              const diff = va !== vb ? "font-bold text-slate-900" : "text-slate-500";
              return (
                <tr key={r.label} className="border-t border-slate-100">
                  <td className="pl-4 pr-2 sm:px-5 py-2.5 font-bold text-slate-400 whitespace-nowrap">{r.label}</td>
                  <td className={`px-2 sm:px-5 py-2.5 ${diff}`}>{va}</td>
                  <td className={`pl-2 pr-4 sm:px-5 py-2.5 ${diff}`}>{vb}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
        出典: Apple の技術仕様（
        <a href={specUrl(sa)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-blue-600">{a}</a>・
        <a href={specUrl(sb)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-blue-600">{b}</a>）
      </p>
    </section>
  );
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  const pair = slugToPair(slug);
  if (!pair) notFound();
  const [a, b] = pair;
  const [sa, sb] = await Promise.all([getModelStats(a), getModelStats(b)]);
  const path = comparePath(a, b);

  const storageRows = mergeRows(sa.byStorage, sb.byStorage, Number);
  const rankRows = mergeRows(sa.byRank, sb.byRank, (k) => (RANK_ORDER.indexOf(k) + 99) % 99);

  // 関連する比較（どちらかのモデルを含む別の組）
  const related = Array.from(
    new Map([...comparesFor(a), ...comparesFor(b)].map((p) => [compareSlug(...p), p])).values(),
  ).filter(([x, y]) => compareSlug(x, y) !== slug).slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: `${a} と ${b} の比較`, item: `${SITE_URL}${path}` },
    ],
  };

  const models = [
    { name: a, stats: sa },
    { name: b, stats: sb },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="中古価格の比較" />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-slate-400 mb-4">
          <Link href="/" className="hover:text-blue-600">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-600">{a} と {b} の比較</span>
        </nav>

        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3">
          {a} と {b}<br className="md:hidden" /> 中古はどっちがお得？
        </h1>
        <p className="text-slate-600 mb-4 leading-relaxed">{verdict(a, b, sa, sb)}</p>
        <AdDisclosure compact />

        {/* 2モデルのサマリーを横に並べる */}
        <section className="grid grid-cols-2 gap-3 md:gap-6 my-6">
          {models.map(({ name, stats }) => (
            <div key={name} className="rounded-3xl border border-slate-200 p-4 md:p-6">
              <h2 className="text-base md:text-2xl font-extrabold mb-3">
                <Link href={modelPagePath(name)} className="hover:text-blue-600">{name}</Link>
              </h2>
              <p className="text-xs font-bold text-slate-400">中古の最安値</p>
              <p className="text-2xl md:text-4xl font-black text-red-600 tracking-tight mb-3">
                {stats.minPrice !== null ? yen(stats.minPrice) : "在庫なし"}
              </p>
              <dl className="text-xs md:text-sm text-slate-600 space-y-1">
                <div className="flex justify-between"><dt>相場（中央値）</dt><dd className="font-bold">{stats.medianPrice !== null ? yen(stats.medianPrice) : "-"}</dd></div>
                <div className="flex justify-between"><dt>在庫数</dt><dd className="font-bold">{stats.count.toLocaleString()}件</dd></div>
                <div className="flex justify-between"><dt>取扱ショップ</dt><dd className="font-bold">{stats.shopCount}店</dd></div>
              </dl>
              {seriesOf(name) && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {seriesOf(name)!.badges.map((badge) => (
                    <span key={badge} className="px-2 py-1 rounded-md text-[10px] md:text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">{badge}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>

        <CompareTable title="容量別の最安値" rows={storageRows} labelOf={storageLabel} a={a} b={b} />
        <CompareTable title="状態ランク別の最安値" rows={rankRows} labelOf={(k) => `ランク ${k}`} a={a} b={b} />
        <p className="text-xs text-slate-400 mb-10">差額は「{b} − {a}」の最安値の差です。</p>

        <SpecTable a={a} b={b} />

        {/* それぞれの最安の在庫 */}
        {models.map(({ name, stats }) => stats.cheapest.length > 0 && (
          <section key={name} className="mb-10">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-xl font-bold">いま一番安い{name}</h2>
              <Link href={modelPagePath(name)} className="text-sm font-bold text-blue-600 hover:underline underline-offset-4">
                {name}の価格まとめ &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.cheapest.slice(0, 3).map((d) => <DeviceCard key={d.id} device={d} />)}
            </div>
          </section>
        ))}

        {related.length > 0 && (
          <section className="mb-4">
            <h2 className="text-lg font-bold mb-3">ほかの比較</h2>
            <div className="flex flex-wrap gap-2">
              {related.map(([x, y]) => (
                <Link key={compareSlug(x, y)} href={comparePath(x, y)}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                  {x} vs {y}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
