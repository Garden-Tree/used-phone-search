import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { getModelMarket } from "@/lib/marketStats";
import { modelPagePath } from "@/lib/catalog";
import { WATCH_CATALOG, WATCH_INFO, WATCH_MODELS, isWatchOS27 } from "@/lib/watchCatalog";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { medianLabel, yen } from "@/lib/format";
import { shopLabels, type Shop } from "@/lib/shops";
import { activeWatchShops } from "@/lib/activeShops";

// 中古Apple Watch の機種一覧（2026-10-15〜）。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

const TITLE = "中古Apple Watchの相場・最安値を世代別に比較【毎日更新】";
// 店の数・店名は、いま Apple Watch の在庫がある店だけ（lib/activeShops.ts）
const describe = (shops: Shop[]) =>
  `中古Apple Watch（Series 6 以降・Ultra・SE）の相場（中央値）・最安値・在庫数を世代別に比較。ケースのサイズ（mm）・通信方式（GPS／GPS+Cellular）別。${shopLabels(shops.slice(0, 3))}など${shops.length}店の在庫から毎日更新。`;

export async function generateMetadata(): Promise<Metadata> {
  const description = describe(await activeWatchShops());
  return {
    title: TITLE,
    description,
    alternates: { canonical: "/watch" },
    openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: "/watch" },
  };
}

// 系統（Series・Ultra・SE）ごとに、カタログの順（新しい順）で並べる
const FAMILY_TITLES: Record<string, string> = {
  "Apple Watch Series": "Apple Watch Series",
  "Apple Watch Ultra": "Apple Watch Ultra",
  "Apple Watch SE": "Apple Watch SE",
};

export default async function WatchIndexPage() {
  const shops = await activeWatchShops();
  // 相場（中央値）・最安値・件数。/mac・機種ページと同じ集計
  const stats = await getModelMarket(WATCH_MODELS);
  const total = [...stats.values()].reduce((n, r) => n + r.count, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "中古Apple Watchの相場一覧", item: `${SITE_URL}/watch` },
    ],
  };

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="Apple Watch" />

      <main className="max-w-[1360px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">中古Apple Watch</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">中古Apple Watchの相場・最安値</h1>
        <p className="text-ink-sub mb-4 leading-relaxed">
          {shopLabels(shops)}の中古Apple Watch <strong>{total.toLocaleString()}件</strong>
          を世代別にまとめています。世代から、ケースのサイズ（mm）別・状態別の最安値へ。
        </p>
        <p className="text-sm text-ink-mute mb-4 leading-relaxed">
          載せているのは Series 6 以降・Ultra・SE です（Series 5 以前は対象外）。
          watchOS 27 に対応しているかは Apple 公式（
          <a href="https://www.apple.com/jp/watchos/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">watchOS</a>
          ）のとおりで、対応する機種は Series 9〜12・Ultra 2〜4・SE 3 です。使うには iOS 27 の iPhone 11 以降、または iPhone SE（第2世代以降）が必要です。
          バンドの有無は載せていません。
        </p>
        <AdDisclosure compact />

        {WATCH_CATALOG.map((series) => (
          <section key={series.series} className="my-8">
            <h2 className="text-xl font-bold mb-3">{FAMILY_TITLES[series.series] ?? series.series}</h2>
            <div className="bg-white rounded-xl border border-line overflow-hidden">
              {series.models.map((model, i) => {
                const s = stats.get(model);
                const info = WATCH_INFO[model];
                return (
                  <Link
                    key={model}
                    href={modelPagePath(model)}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-3 hover:bg-ground items-center ${i > 0 ? "border-t border-line-soft" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-bold text-ink">{model} <span className="text-gray-300">›</span></span>
                      <span className="block text-[11px] text-ink-mute">
                        {info.sizes.map((x) => `${x}mm`).join("・")}・{isWatchOS27(model) ? "watchOS 27 に対応" : "watchOS 27 には非対応"}
                      </span>
                    </span>
                    <span className="text-right">
                      {s && <><span className="block text-[10px] text-ink-mute">{medianLabel(s.medianStorage, model)}</span><span className="font-bold text-ink">{yen(s.medianPrice)}</span></>}
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

        <p className="text-xs text-ink-mute leading-relaxed">
          ケースのサイズは Apple 公式の情報です（発売年は公式のページにないので載せていません）。出典: Apple「
          <a href="https://support.apple.com/ja-jp/108056" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">Apple Watch を識別する</a>」
          「<a href="https://www.apple.com/jp/watchos/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">watchOS の対応機種</a>」
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
