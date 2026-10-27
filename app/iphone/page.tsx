import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import VideoEmbed from "@/app/components/VideoEmbed";
import { VIDEOS } from "@/lib/videos";
import PopularModels from "@/app/components/PopularModels";
import AdDisclosure from "@/app/components/AdDisclosure";
import PriceDrops from "@/app/components/PriceDrops";
import { ALL_CATALOG_MODELS, ALL_PAGE_MODELS, IPHONE_CATALOG, LEGACY_SERIES, modelPagePath } from "@/lib/catalog";
import { getModelMarket, getPriceDrops, type ModelMarket } from "@/lib/marketStats";
import { specOf } from "@/lib/iphoneSpecs";
import { activeShops } from "@/lib/activeShops";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { storageLabel, yen } from "@/lib/format";
import { monthJa, reportMonths } from "@/lib/monthlyReport";

// 機種ページと同じくビルドのたびに作る（在庫の取り込みは6時間ごと）
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

// 検索は「iphone 中古 相場 一覧」「iphone 中古相場」が多い（10/17 の GSC）ので、その語を先頭に
const TITLE = "中古iPhone 相場一覧【全機種・毎日更新】中古価格と最安値";
// 店の数は、いま在庫がある店だけ（lib/activeShops.ts）
const describe = (shopNum: number) =>
  `中古iPhoneの相場（中央値）と最安値を全機種まとめて比較。大手中古ショップ${shopNum}社の在庫から毎日更新。相場が安い順のランキングも。`;

export async function generateMetadata(): Promise<Metadata> {
  const description = describe((await activeShops()).length);
  return {
    title: TITLE,
    description,
    alternates: { canonical: "/iphone" },
    // 画像は app/iphone/opengraph-image.tsx（相場一覧専用）
    openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: "/iphone" },
  };
}

type Row = { model: string; market?: ModelMarket };

/** 冒頭の1文に出す代表の機種（古い順。よく検索される無印と SE） */
const SUMMARY_MODELS = ["iPhone SE (第3世代)", "iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16", "iPhone 17"];

// 機種以外の列は PC で幅を固定する（シリーズごとの表で列の位置がそろうように）
function MarketTable({ rows }: { rows: Row[] }) {
  return (
    <div className="bg-white rounded-xl border border-line overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-ground text-xs text-ink-mute">
          <tr>
            <th className="text-left font-semibold pl-4 pr-2 py-2">機種</th>
            <th className="text-right font-semibold px-2 py-2 md:w-32">相場</th>
            <th className="text-right font-semibold px-2 py-2 md:w-32">最安値</th>
            <th className="text-right font-semibold px-2 py-2 hidden sm:table-cell md:w-24">在庫</th>
            <th className="text-left font-semibold px-2 py-2 hidden md:table-cell md:w-24">発売</th>
            <th className="text-left font-semibold pl-2 pr-4 py-2 hidden md:table-cell md:w-28">端子</th>
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
                <td className="px-2 py-2.5 text-right font-bold text-ink whitespace-nowrap">{market ? <>{yen(market.medianPrice)}{market.medianStorage ? <span className="block text-[10px] font-normal text-ink-mute">{storageLabel(market.medianStorage, model)}</span> : null}</> : "-"}</td>
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
  const shopNum = (await activeShops()).length;
  // 月次の相場レポート（終わった月があるときだけ。最初は 2026-11-01 に10月分）
  const latestReport = reportMonths()[0];
  const [market, allDrops] = await Promise.all([getModelMarket(ALL_PAGE_MODELS), getPriceDrops(7, 20)]);
  const drops = allDrops.filter((d) => d.modelSlug.startsWith("iphone")).slice(0, 10);
  const rowOf = (model: string): Row => ({ model, market: market.get(model) });
  const total = [...market.values()].reduce((n, r) => n + r.count, 0);
  // 安い順は最新の iOS に対応する機種だけ（旧機種は安くても勧めにくい）。在庫が少ない機種は相場がぶれるので除く
  const cheapest = ALL_CATALOG_MODELS.map(rowOf)
    .filter((r): r is Required<Row> => !!r.market && r.market.count >= 10)
    .sort((a, b) => a.market.medianPrice - b.market.medianPrice)
    .slice(0, 10);

  // 冒頭の1文（AI の概要が「13 は約5.1万円、14 は約6.6万円…」の形で答えるので、同じ形で引用できるように。10/23〜）。
  // 代表の機種は在庫5件以上のものだけ。相場は在庫がいちばん多い容量の中央値（表と同じ数字）
  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const man = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万円`;
  const picks = SUMMARY_MODELS.map(rowOf).filter((r): r is Required<Row> => !!r.market && r.market.count >= 5);
  const summary = picks.length > 0
    ? `${today}時点の中古iPhoneの相場は、${picks.map((r) => `${r.model.replace(/^iPhone\s+/, "")}${r.market.medianStorage ? `（${storageLabel(r.market.medianStorage, r.model)}）` : ""}${man(r.market.medianPrice)}`).join("、")}です（大手中古ショップ${shopNum}社の在庫から、在庫がいちばん多い容量の中央値）。`
    : null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
      ],
    },
    ...(summary
      ? [{ "@context": "https://schema.org", "@type": "WebPage", name: "中古iPhoneの相場一覧", url: `${SITE_URL}/iphone`, description: summary, dateModified: new Date().toISOString() }]
      : []),
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="相場一覧" />

      <main className="max-w-[1360px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">中古iPhoneの相場一覧</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">中古iPhoneの相場一覧</h1>
        <p className="text-ink-sub mb-4 leading-relaxed">
          大手中古ショップ{shopNum}社の中古iPhone <strong>{total.toLocaleString()}件</strong>から、機種ごとの相場（中央値）と最安値をまとめています。
          在庫は6時間ごとに更新しています。
        </p>
        {summary && <p className="text-[13px] text-ink-mute mb-3 leading-relaxed">{summary}</p>}
        <p className="text-sm mb-4">
          <Link href="/iphone/price-factors" className="font-bold text-brand-600 hover:underline underline-offset-4">電池・状態ランク・容量・世代で、値段はいくら違う？ &rarr;</Link>
        </p>
        <p className="text-sm mb-4">
          <Link href="/iphone/price-drop" className="font-bold text-brand-600 hover:underline underline-offset-4">中古iPhoneは1か月でいくら下がる？発売からの年数別 &rarr;</Link>
        </p>
        <p className="text-sm mb-4">
          <Link href="/iphone/where-to-buy" className="font-bold text-brand-600 hover:underline underline-offset-4">中古iPhoneはどこで買う？店ごとの在庫・保証・電池表記の比較 &rarr;</Link>
        </p>
        {latestReport && (
          <p className="text-sm mb-4">
            <Link href={`/iphone/report/${latestReport}`} className="font-bold text-brand-600 hover:underline underline-offset-4">中古iPhone相場レポート {monthJa(latestReport)}（1か月の値下がり・新品との差） &rarr;</Link>
          </p>
        )}
        <AdDisclosure compact />

        <details className="my-6 rounded-xl bg-ground p-4 text-sm text-ink-sub">
          <summary className="font-bold text-ink-sub cursor-pointer">「相場」の出し方</summary>
          <p className="mt-2 leading-relaxed">
            機種ごとに<strong>在庫がいちばん多い容量</strong>の販売中の在庫を安い順に並べ、<strong>ちょうど真ん中の値（中央値）</strong>を相場としています（相場の下に小さく書いた容量）。
            容量をまぜると在庫の多い容量の値段に引っぱられ、最安値は1台だけの特価やジャンク品のことが多いためです。
            状態ランクはすべて含みます。ほかの容量の値段は各機種のページで確認できます。
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

        <PopularModels />

        {/* 予算別のおすすめを解説した横動画（10/21 公開） */}
        <VideoEmbed video={VIDEOS.iphoneDore} heading="予算別のおすすめを動画で見る" className="my-8" />

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
