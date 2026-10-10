import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import PriceDrops from "@/app/components/PriceDrops";
import { ALL_CATALOG_MODELS, ALL_PAGE_MODELS, IPHONE_CATALOG, LEGACY_SERIES, modelPagePath } from "@/lib/catalog";
import { getModelMarket, getPriceDrops, type ModelMarket } from "@/lib/marketStats";
import { specOf } from "@/lib/iphoneSpecs";
import { SHOPS } from "@/lib/shops";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { yen } from "@/lib/format";

// 機種ページと同じくビルドのたびに作る（在庫の取り込みは6時間ごと）
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

const TITLE = "中古iPhoneの相場一覧【毎日更新】全機種の中古価格・最安値";
const DESCRIPTION =
  `中古iPhoneの相場（中央値）と最安値を全機種まとめて比較。大手中古ショップ${SHOPS.length}社の在庫から毎日更新。相場が安い順のランキングも。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/iphone" },
  // 画像は app/iphone/opengraph-image.tsx（相場一覧専用）
  openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: "/iphone" },
};

type Row = { model: string; market?: ModelMarket };

function MarketTable({ rows }: { rows: Row[] }) {
  return (
    <div className="bg-white rounded-xl border border-line overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-ground text-xs text-ink-mute">
          <tr>
            <th className="text-left font-semibold pl-4 pr-2 py-2">機種</th>
            <th className="text-right font-semibold px-2 py-2">相場</th>
            <th className="text-right font-semibold px-2 py-2">最安値</th>
            <th className="text-right font-semibold px-2 py-2 hidden sm:table-cell">在庫</th>
            <th className="text-left font-semibold px-2 py-2 hidden md:table-cell">発売</th>
            <th className="text-left font-semibold pl-2 pr-4 py-2 hidden md:table-cell">端子</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ model, market }) => {
            const spec = specOf(model);
            return (
              <tr key={model} className="border-t border-line-soft hover:bg-ground">
                <td className="pl-4 pr-2 py-2.5">
                  <Link href={modelPagePath(model)} className="font-bold text-ink hover:text-brand-800 whitespace-nowrap">{model}</Link>
                </td>
                <td className="px-2 py-2.5 text-right font-bold text-ink whitespace-nowrap">{market ? yen(market.medianPrice) : "-"}</td>
                <td className="px-2 py-2.5 text-right font-bold text-price whitespace-nowrap">{market ? yen(market.minPrice) : <span className="text-gray-300 font-normal">在庫なし</span>}</td>
                <td className="px-2 py-2.5 text-right text-ink-mute whitespace-nowrap hidden sm:table-cell">{market ? `${market.count.toLocaleString()}件` : "-"}</td>
                <td className="px-2 py-2.5 text-ink-mute whitespace-nowrap hidden md:table-cell">{spec?.released ?? "-"}</td>
                <td className="pl-2 pr-4 py-2.5 text-ink-mute whitespace-nowrap hidden md:table-cell">{spec?.port ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function IphoneIndexPage() {
  const [market, allDrops] = await Promise.all([getModelMarket(ALL_PAGE_MODELS), getPriceDrops(7, 20)]);
  const drops = allDrops.filter((d) => d.modelSlug.startsWith("iphone")).slice(0, 10);
  const rowOf = (model: string): Row => ({ model, market: market.get(model) });
  const total = [...market.values()].reduce((n, r) => n + r.count, 0);
  // 安い順は最新の iOS に対応する機種だけ（旧機種は安くても勧めにくい）。在庫が少ない機種は相場がぶれるので除く
  const cheapest = ALL_CATALOG_MODELS.map(rowOf)
    .filter((r): r is Required<Row> => !!r.market && r.market.count >= 10)
    .sort((a, b) => a.market.medianPrice - b.market.medianPrice)
    .slice(0, 10);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
    ],
  };

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="相場一覧" />

      <main className="max-w-[1120px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">中古iPhoneの相場一覧</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">中古iPhoneの相場一覧</h1>
        <p className="text-ink-sub mb-4 leading-relaxed">
          大手中古ショップ{SHOPS.length}社の中古iPhone <strong>{total.toLocaleString()}件</strong>から、機種ごとの相場（中央値）と最安値をまとめています。
          在庫は6時間ごとに更新しています。
        </p>
        <AdDisclosure compact />

        <details className="my-6 rounded-xl bg-ground p-4 text-sm text-ink-sub">
          <summary className="font-bold text-ink-sub cursor-pointer">「相場」の出し方</summary>
          <p className="mt-2 leading-relaxed">
            販売中の在庫の価格を安い順に並べた<strong>ちょうど真ん中の値（中央値）</strong>を相場としています。
            最安値は1台だけの特価やジャンク品のことが多く、実際に買う値段の目安にはなりにくいためです。
            容量・状態ランクはすべて含むので、容量ごとの相場は各機種のページで確認できます。
          </p>
        </details>

        <PriceDrops drops={drops} title="この1週間で値下がりした中古iPhone" />

        {cheapest.length > 0 && (
          <section className="my-8">
            <h2 className="text-xl md:text-2xl font-bold mb-1">相場が安い中古iPhone TOP{cheapest.length}</h2>
            <p className="text-xs text-ink-mute mb-4">iOS 27 に対応する機種のうち、在庫10件以上のもの</p>
            <MarketTable rows={cheapest} />
          </section>
        )}

        {IPHONE_CATALOG.map((series) => (
          <section key={series.series} className="my-8">
            <h2 className="text-lg md:text-xl font-bold mb-3">{series.series}</h2>
            <MarketTable rows={series.models.map(rowOf)} />
          </section>
        ))}

        <section className="my-8">
          <h2 className="text-lg md:text-xl font-bold mb-1">旧機種（iOS 27 非対応）</h2>
          <p className="text-xs text-ink-mute mb-3">最新の iOS が入らないため、サブ機・撮影用向けです</p>
          <MarketTable rows={LEGACY_SERIES.flatMap((s) => s.models).map(rowOf)} />
        </section>

        <p className="text-sm">
          <Link href="/ipad" className="font-bold text-brand-600 hover:underline underline-offset-4">中古iPadの相場はこちら &rarr;</Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
