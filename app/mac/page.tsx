import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { getModelMarket } from "@/lib/marketStats";
import { hubSummary, hubWebPage } from "@/lib/hubSummary";
import { modelPagePath } from "@/lib/catalog";
import { MAC_INFO, MAC_MODELS } from "@/lib/macCatalog";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { medianLabel, yen } from "@/lib/format";
import { shopLabels, type Shop } from "@/lib/shops";
import { activeMacShops } from "@/lib/activeShops";

// 中古MacBook の機種一覧（2026-10-15〜）。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

const TITLE = "中古MacBookの相場・最安値を機種別に比較【毎日更新】";
// 店の数・店名は、いま MacBook の在庫がある店だけ（lib/activeShops.ts）
const describe = (shops: Shop[]) =>
  `中古MacBook（Air・Pro・Neo。macOS 27 Golden Gate に対応する Apple シリコン搭載モデル）の相場（中央値）・最安値・在庫数を機種別に比較。${shopLabels(shops.slice(0, 3))}など${shops.length}店の在庫から毎日更新。`;

export async function generateMetadata(): Promise<Metadata> {
  const description = describe(await activeMacShops());
  return {
    title: TITLE,
    description,
    alternates: { canonical: "/mac" },
    openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: "/mac" },
  };
}

// シリーズ（Neo・Air・Pro）ごとに、カタログの順（チップの新しい順）で並べる
const FAMILIES: { family: "Neo" | "Air" | "Pro"; title: string }[] = [
  { family: "Neo", title: "MacBook Neo" },
  { family: "Air", title: "MacBook Air" },
  { family: "Pro", title: "MacBook Pro" },
];

export default async function MacIndexPage() {
  const shops = await activeMacShops();
  // 相場（中央値）・最安値・件数。/pixel・機種ページと同じ集計
  const stats = await getModelMarket(MAC_MODELS);
  const total = [...stats.values()].reduce((n, r) => n + r.count, 0);

  // 冒頭の1文（/iphone と同じ形。AI の概要・「MacBook 中古 相場」の検索向け。10/28〜）
  const summary = hubSummary("MacBook", MAC_MODELS, stats, shops.length);

  const jsonLd = [{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "中古MacBookの相場一覧", item: `${SITE_URL}/mac` },
    ],
  }, ...hubWebPage("中古MacBookの相場一覧", "/mac", summary)];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="MacBook" />

      <main className="max-w-[1360px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">中古MacBook</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">中古MacBookの相場・最安値</h1>
        <p className="text-ink-sub mb-4 leading-relaxed">
          {shopLabels(shops)}の中古MacBook <strong>{total.toLocaleString()}件</strong>
          を機種別にまとめています。機種名から、メモリ・SSD別、状態別の最安値へ。
        </p>
        {summary && <p className="text-[13px] text-ink-mute mb-3 leading-relaxed">{summary}</p>}
        <p className="text-sm text-ink-mute mb-4 leading-relaxed">
          載せているのは、macOS 27 Golden Gate に対応する Apple シリコン搭載モデルと MacBook Neo です
          （Apple 公式「<a href="https://www.apple.com/jp/os/macos/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">macOS</a>」）。
          Intel 搭載のモデルは対象外です。メモリと SSD は購入後に増やせないので、同じ機種でも組み合わせごとに値段が違います。
        </p>
        <AdDisclosure compact />

        {FAMILIES.map(({ family, title }) => {
          const models = MAC_MODELS.filter((m) => MAC_INFO[m].family === family);
          return (
            <section key={family} className="my-8">
              <h2 className="text-xl font-bold mb-3">{title}</h2>
              <div className="bg-white rounded-xl border border-line overflow-hidden">
                {models.map((model, i) => {
                  const s = stats.get(model);
                  const info = MAC_INFO[model];
                  return (
                    <Link
                      key={model}
                      href={modelPagePath(model)}
                      className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-3 hover:bg-ground items-center ${i > 0 ? "border-t border-line-soft" : ""}`}
                    >
                      <span className="min-w-0">
                        <span className="block font-bold text-ink">{model} <span className="text-gray-300">›</span></span>
                        <span className="block text-[11px] text-ink-mute">{`${info.year}年発売・${info.chip}・${info.inch}インチ`}</span>
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
          );
        })}

        <p className="text-xs text-ink-mute leading-relaxed">
          発売年は Apple 公式の情報です。出典: Apple「<a href="https://support.apple.com/ja-jp/102869" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">MacBook Air の識別</a>」
          「<a href="https://support.apple.com/ja-jp/108052" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">MacBook Pro の識別</a>」
          「<a href="https://www.apple.com/jp/macbook-neo/specs/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">MacBook Neo の技術仕様</a>」
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
