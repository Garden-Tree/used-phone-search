import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { getModelMarket } from "@/lib/marketStats";
import { modelPagePath } from "@/lib/catalog";
import { AQUOS_CATALOG, AQUOS_MODELS } from "@/lib/aquosCatalog";
import { XPERIA_CATALOG, XPERIA_MODELS } from "@/lib/xperiaCatalog";
import { androidInfoOf } from "@/lib/androidInfo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { medianLabel, yen } from "@/lib/format";
import { shopLabels, type Shop } from "@/lib/shops";
import { OPPO_CATALOG, OPPO_MODELS } from "@/lib/oppoCatalog";
import { XIAOMI_CATALOG, XIAOMI_MODELS } from "@/lib/xiaomiCatalog";
import { activeAquosShops, activeOppoShops, activeXiaomiShops, activeXperiaShops } from "@/lib/activeShops";

/**
 * 中古Xperia（/xperia）・中古AQUOS（/aquos）の機種一覧（2026-10-15〜）。中身は同じなので1つの部品にして、
 * app/xperia/page.tsx・app/aquos/page.tsx から使う（/galaxy の一覧と同じ作り。目的別・予算別・比較ページはまだない）。
 * 中古OPPO（/oppo）・中古Xiaomi（/xiaomi）も同じ部品（2026-11-12〜）
 */
export type AndroidKind = "xperia" | "aquos" | "oppo" | "xiaomi";

export const ANDROID_HUB = {
  xperia: {
    label: "Xperia",
    path: "/xperia",
    name: "中古Xperia",
    models: XPERIA_MODELS,
    catalog: XPERIA_CATALOG,
    shops: activeXperiaShops,
    seriesNote: "Xperia 1・5・10・Ace の2021年以降の機種",
    since: "2021年以降の機種",
    releasedNote: "発売は日本での発売（ドコモ。au 先行の機種は au）",
    sourceNote: <>型番と OS・セキュリティ更新の方針は、Sony「<a href="https://www.sony.jp/xperia/product/index.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">Xperia の製品ページ</a>」「<a href="https://www.sony.jp/xperia/product/aer/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">セキュリティアップデート（AER）</a>」</>,
  },
  aquos: {
    label: "AQUOS",
    path: "/aquos",
    name: "中古AQUOS",
    models: AQUOS_MODELS,
    catalog: AQUOS_CATALOG,
    shops: activeAquosShops,
    seriesNote: "AQUOS R・sense・wish の2021年以降の機種",
    since: "2021年以降の機種",
    releasedNote: "発売は日本での発売（ドコモ。au 先行の機種は au）",
    sourceNote: <>型番と OS・セキュリティ更新の方針は、Sharp「<a href="https://k-tai.sharp.co.jp/support/osv/lineup.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">OS バージョンアップ情報</a>」「<a href="https://k-tai.sharp.co.jp/business/aer_models.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">AER（法人向け）</a>」</>,
  },
  // OPPO・Xiaomi（2026-11-12〜）。OS・セキュリティ更新の方針は日本向けの公式ページに見当たらないので載せない（lib/oppoCatalog.ts・xiaomiCatalog.ts）
  oppo: {
    label: "OPPO",
    path: "/oppo",
    name: "中古OPPO",
    models: OPPO_MODELS,
    catalog: OPPO_CATALOG,
    shops: activeOppoShops,
    seriesNote: "Find X・Reno・Reno A・A シリーズの2020年以降の機種",
    since: "2020年以降の機種",
    releasedNote: "発売は日本で最初に出た売り場の発売日（かっこ内が売り場）",
    sourceNote: <>型番は OPPO「<a href="https://www.oppo.com/jp/smartphones/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">スマートフォン</a>」の各機種のスペックと、au「<a href="https://www.au.com/support/service/mobile/manual/smartphone/oppo/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">OPPOの製品情報一覧</a>」・Y!mobile・ソフトバンクの製品ページ</>,
  },
  xiaomi: {
    label: "Xiaomi",
    path: "/xiaomi",
    name: "中古Xiaomi",
    models: XIAOMI_MODELS,
    catalog: XIAOMI_CATALOG,
    shops: activeXiaomiShops,
    seriesNote: "Xiaomi・Redmi・POCO の2020年以降の機種",
    since: "2020年以降の機種",
    releasedNote: "発売は日本で最初に出た売り場の発売日（かっこ内が売り場）",
    sourceNote: <>型番は au「<a href="https://www.au.com/support/service/mobile/manual/smartphone/xiaomi/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">Xiaomiの製品情報一覧</a>」とソフトバンクのオンラインマニュアル、発売は各社の発表と Xiaomi「<a href="https://www.mi.com/jp/" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">Xiaomi Japan</a>」</>,
  },
} as const;

/** 検索結果に出る説明文（店の数・店名は、いま在庫がある店だけ） */
export const androidDescribe = (kind: AndroidKind, shops: Shop[]) =>
  `${ANDROID_HUB[kind].name}（${ANDROID_HUB[kind].seriesNote}）の相場（中央値）・最安値・在庫数を機種別に比較。${shopLabels(shops.slice(0, 3))}など${shops.length}店の在庫から毎日更新。`;

/** "2025-10" → "2025年10月発売"、"2023" → "2023年発売"。au 先行の機種は注記を添える */
function releasedLabel(model: string): string | null {
  const info = androidInfoOf(model);
  if (!info?.released) return null;
  const [y, m] = info.released.split("-");
  // OPPO・Xiaomi の注記（「Y!mobile（2024年6月27日）」）は日付の括弧を落として売り場だけ
  const where = info.releasedNote?.replace(/（.*$/, "").trim();
  return `${m ? `${y}年${Number(m)}月` : `${y}年`}発売${where ? `（${where}）` : ""}`;
}

export default async function AndroidIndexView({ kind }: { kind: AndroidKind }) {
  const hub = ANDROID_HUB[kind];
  const shops = await hub.shops();
  // 相場（中央値）・最安値・件数。/galaxy・機種ページと同じ集計
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

      {/* 一覧は1列なので PC でも 860px に（全幅だと機種名と値段の間が 1000px 空いた。11/2） */}
      <main className="max-w-[892px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">{hub.name}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">{hub.name}の相場・最安値</h1>
        <p className="text-ink-sub mb-4 leading-relaxed">
          {shopLabels(shops)}の{hub.name} <strong>{total.toLocaleString()}件</strong>
          {`を機種別にまとめています（${hub.since}）。機種名から容量別・状態別の最安値へ。`}
        </p>
        <AdDisclosure compact />

        {hub.catalog.map((series) => (
          <section key={series.series} className="my-8">
            <h2 className="text-xl font-bold mb-3">{series.series}</h2>
            <div className="bg-white rounded-xl border border-line overflow-hidden">
              {series.models.map((model, i) => {
                const s = stats.get(model);
                const released = releasedLabel(model);
                return (
                  <Link
                    key={model}
                    href={modelPagePath(model)}
                    className={`grid grid-cols-[auto_auto_1fr] md:grid-cols-[1fr_8.5rem_7.5rem_4.5rem] gap-x-5 gap-y-1.5 px-5 py-3 hover:bg-ground items-center ${i > 0 ? "border-t border-line-soft" : ""}`}
                  >
                    <span className="min-w-0 col-span-3 md:col-span-1">
                      <span className="block font-bold text-ink">{model} <span className="text-gray-300">›</span></span>
                      {released && <span className="block text-[11px] text-ink-mute">{released}</span>}
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
          {`${hub.releasedNote}。`}{hub.sourceNote}。
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
