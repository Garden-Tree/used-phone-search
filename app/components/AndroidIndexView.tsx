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
import { activeAquosShops, activeXperiaShops } from "@/lib/activeShops";

/**
 * 中古Xperia（/xperia）・中古AQUOS（/aquos）の機種一覧（2026-10-15〜）。中身は同じなので1つの部品にして、
 * app/xperia/page.tsx・app/aquos/page.tsx から使う（/galaxy の一覧と同じ作り。目的別・予算別・比較ページはまだない）
 */
export type AndroidKind = "xperia" | "aquos";

export const ANDROID_HUB = {
  xperia: {
    label: "Xperia",
    path: "/xperia",
    name: "中古Xperia",
    models: XPERIA_MODELS,
    catalog: XPERIA_CATALOG,
    shops: activeXperiaShops,
    seriesNote: "Xperia 1・5・10・Ace の2021年以降の機種",
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
    sourceNote: <>型番と OS・セキュリティ更新の方針は、Sharp「<a href="https://k-tai.sharp.co.jp/support/osv/lineup.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">OS バージョンアップ情報</a>」「<a href="https://k-tai.sharp.co.jp/business/aer_models.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">AER（法人向け）</a>」</>,
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
  return `${m ? `${y}年${Number(m)}月` : `${y}年`}発売${info.releasedNote === "au" ? "（au）" : info.releasedNote === "報道" ? "（報道）" : ""}`;
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

      <main className="max-w-[1360px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">{hub.name}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">{hub.name}の相場・最安値</h1>
        <p className="text-ink-sub mb-4 leading-relaxed">
          {shopLabels(shops)}の{hub.name} <strong>{total.toLocaleString()}件</strong>
          を機種別にまとめています（2021年以降の機種）。機種名から容量別・状態別の最安値へ。
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
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-3 hover:bg-ground items-center ${i > 0 ? "border-t border-line-soft" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-bold text-ink">{model} <span className="text-gray-300">›</span></span>
                      {released && <span className="block text-[11px] text-ink-mute">{released}</span>}
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
          発売は日本での発売（ドコモ。au 先行の機種は au）。{hub.sourceNote}。
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
