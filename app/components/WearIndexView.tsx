import Link from "next/link";
import type { Metadata } from "next";
import { hubTitle } from "@/lib/hubSummary";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { getModelMarket } from "@/lib/marketStats";
import { modelPagePath } from "@/lib/catalog";
import { GALAXY_WATCH_CATALOG, GALAXY_WATCH_INFO, GALAXY_WATCH_MODELS, GALAXY_WATCH_SOURCE } from "@/lib/galaxyWatchCatalog";
import { PIXEL_WATCH_CATALOG, PIXEL_WATCH_INFO, PIXEL_WATCH_MODELS, PIXEL_WATCH_SOURCE } from "@/lib/pixelWatchCatalog";
import { SITE_NAME, SITE_URL, OG_BASE } from "@/lib/site";
import { medianLabel, yen } from "@/lib/format";
import { shopLabels, type Shop } from "@/lib/shops";
import { activeGalaxyWatchShops, activePixelWatchShops } from "@/lib/activeShops";

/**
 * 中古Galaxy Watch（/galaxy-watch）・中古Pixel Watch（/pixel-watch）の機種一覧（2026-11-13〜）。在庫はビルド（1日4回）のたびに更新。
 * 形は中古Apple Watch の一覧（app/watch/page.tsx）と同じ（機種名・ケースのサイズ・相場・最安値・件数）。
 * サイズ・通信方式は公式で確かめた値だけ（lib/galaxyWatchCatalog.ts・pixelWatchCatalog.ts）。発売年月・更新の期限は確かめられていないので載せない
 */
export type WearKind = "galaxy-watch" | "pixel-watch";

type Hub = {
  /** タイトル・OG 画像に出す名前 */
  label: string;
  path: string;
  /** 「中古Galaxy Watch」 */
  name: string;
  models: string[];
  catalog: { series: string; models: string[] }[];
  shops: () => Promise<Shop[]>;
  /** 載せている範囲（説明文のかっこの中） */
  range: string;
  /** 通信方式の呼び方（説明文） */
  carriers: string;
  /** 機種名の下の1行（サイズ・通信方式） */
  line: (model: string) => string;
  /** 一覧の上の注記 */
  note: string;
  source: { name: string; url: string };
};

const mm = (sizes: number[]) => sizes.map((x) => `${x}mm`).join("・");

export const WEAR_HUB: Record<WearKind, Hub> = {
  "galaxy-watch": {
    label: "Galaxy Watch",
    path: "/galaxy-watch",
    name: "中古Galaxy Watch",
    models: GALAXY_WATCH_MODELS,
    catalog: GALAXY_WATCH_CATALOG,
    shops: activeGalaxyWatchShops,
    range: "Watch4 以降・Classic・Ultra",
    carriers: "Bluetooth／LTE",
    line: (model) => `${mm(GALAXY_WATCH_INFO[model].sizes)}・${GALAXY_WATCH_INFO[model].carriers.join("／")}`,
    note: "載せているのは Galaxy Watch4 以降の、日本で売られているモデルです（Watch3 以前・Watch FE・海外版は対象外）。バンドの有無は載せていません。充電器が欠けている個体・バンドや充電器だけの商品は含めていません。",
    source: GALAXY_WATCH_SOURCE,
  },
  "pixel-watch": {
    label: "Pixel Watch",
    path: "/pixel-watch",
    name: "中古Pixel Watch",
    models: PIXEL_WATCH_MODELS,
    catalog: PIXEL_WATCH_CATALOG,
    shops: activePixelWatchShops,
    range: "初代〜Pixel Watch 5",
    carriers: "Wi-Fi／LTE",
    line: (model) => `${mm(PIXEL_WATCH_INFO[model].sizes)}・Wi-Fi／LTE・${PIXEL_WATCH_INFO[model].android}のスマートフォンに対応`,
    note: "載せているのは Google Pixel Watch の初代から Pixel Watch 5 までです。バンドの有無は載せていません。充電器が欠けている個体・バンドや充電器だけの商品は含めていません。",
    source: PIXEL_WATCH_SOURCE,
  },
};

const fallbackTitle = (hub: Hub) => `${hub.name}の相場・最安値を機種別に比較【毎日更新】`;

/** 検索結果に出る説明文（店の数・店名は、いま在庫がある店だけ。まだ在庫のある店がないときは店の文を出さない） */
const describe = (hub: Hub, shops: Shop[]) =>
  `${hub.name}（${hub.range}）の相場（中央値）・最安値・在庫数を機種別に比較。ケースのサイズ（mm）・通信方式（${hub.carriers}）別。${shops.length > 0 ? `${shopLabels(shops)}の在庫から毎日更新。` : "毎日更新。"}`;

export async function wearMetadata(kind: WearKind): Promise<Metadata> {
  const hub = WEAR_HUB[kind];
  // タイトルの頭に、いちばん安い値段と機種（lib/hubSummary.ts の hubTitle。在庫5件以上の機種がなければ決まった題）
  const market = await getModelMarket([...hub.models]);
  const title = hubTitle(hub.label, hub.models, market, fallbackTitle(hub));
  const description = describe(hub, await hub.shops());
  return {
    title,
    description,
    alternates: { canonical: hub.path },
    openGraph: { ...OG_BASE, title: `${title} | ${SITE_NAME}`, description, url: hub.path },
    // 在庫が1件もないあいだ（取り込み前）の薄い一覧はインデックスさせない（機種ページと同じ。サイトマップにも入れない）
    robots: market.size === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function WearIndexView({ kind }: { kind: WearKind }) {
  const hub = WEAR_HUB[kind];
  const shops = await hub.shops();
  // 相場（中央値）・最安値・件数。/watch・機種ページと同じ集計
  const stats = await getModelMarket(hub.models);
  const total = [...stats.values()].reduce((n, r) => n + r.count, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: `${hub.name}の相場一覧`, item: `${SITE_URL}${hub.path}` },
    ],
  };

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label={hub.label} />

      {/* 一覧は1列なので PC でも 860px に（/watch と同じ） */}
      <main className="max-w-[892px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">{hub.name}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">{hub.name}の相場・最安値</h1>
        <p className="text-ink-sub mb-4 leading-relaxed">
          {/* 在庫のある店がまだない（取り込み前）ときは店名と「の」を出さない */}
          {shops.length > 0 && `${shopLabels(shops)}の`}{hub.name} <strong>{total.toLocaleString()}件</strong>
          を機種別にまとめています。機種から、ケースのサイズ（mm）別・状態別の最安値へ。
        </p>
        <p className="text-sm text-ink-mute mb-4 leading-relaxed">{hub.note}</p>
        <AdDisclosure compact />

        {hub.catalog.map((series) => (
          <section key={series.series} className="my-8">
            <h2 className="text-xl font-bold mb-3">{series.series}</h2>
            <div className="bg-white rounded-xl border border-line overflow-hidden">
              {series.models.map((model, i) => {
                const s = stats.get(model);
                return (
                  <Link
                    key={model}
                    href={modelPagePath(model)}
                    className={`grid grid-cols-[auto_auto_1fr] md:grid-cols-[1fr_8.5rem_7.5rem_4.5rem] gap-x-5 gap-y-1.5 px-5 py-3 hover:bg-ground items-center ${i > 0 ? "border-t border-line-soft" : ""}`}
                  >
                    <span className="min-w-0 col-span-3 md:col-span-1">
                      <span className="block font-bold text-ink">{model} <span className="text-gray-300">›</span></span>
                      <span className="block text-[11px] text-ink-mute">{hub.line(model)}</span>
                    </span>
                    <span className="whitespace-nowrap md:text-right">
                      {s && <><span className="block text-[10px] text-ink-mute">{medianLabel(s.medianStorage, model)}</span><span className="font-bold text-ink">{yen(s.medianPrice)}</span></>}
                    </span>
                    <span className="whitespace-nowrap md:text-right">
                      {s ? <><span className="block text-[10px] text-ink-mute">最安値</span><span className="font-bold text-price">{yen(s.minPrice)}</span></> : <span className="text-gray-300 font-normal text-sm">在庫なし</span>}
                    </span>
                    <span className="text-right self-end whitespace-nowrap text-sm text-ink-mute">{(s?.count ?? 0).toLocaleString()}件</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <p className="text-xs text-ink-mute leading-relaxed">
          ケースのサイズ・通信方式は公式の情報です（発売年月は公式で確かめられていないので載せていません）。出典:{" "}
          <a href={hub.source.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">{hub.source.name}</a>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
