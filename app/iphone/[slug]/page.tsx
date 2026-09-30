import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DeviceCard from "@/app/components/DeviceCard";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import {
  ALL_CATALOG_MODELS,
  ALL_PAGE_MODELS,
  IPHONE_CATALOG,
  badgesOf,
  DEVICE_HUB,
  deviceOf,
  isIpad,
  modelPagePath,
  modelToSlug,
  seriesOf,
  siblingModels,
  slugToModel,
} from "@/lib/catalog";
import { getBatteryRows, getModelStats, getStorageRankMatrix, type PriceRow, type StorageRankMatrix } from "@/lib/modelStats";
import { SPEC_ROWS, specOf, specUrl } from "@/lib/iphoneSpecs";
import { IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { PIXEL_INFO, jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { GALAXY_RELEASED } from "@/lib/galaxyCatalog";
import { comparePath, comparesFor } from "@/lib/compare";
import { getPriceHistory } from "@/lib/priceHistory";
import PriceHistoryChart from "@/app/components/PriceHistoryChart";
import InspectionTips from "@/app/components/InspectionTips";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { yen, storageLabel } from "@/lib/format";
import { findShop, shopLabels, shopsFor } from "@/lib/shops";

// スクレイパーは6時間ごとに実行されるため、1時間ごとに再生成すれば十分新しい
export const revalidate = 3600;

// カタログ外のslugは404
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_PAGE_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}

type Props = { params: Promise<{ slug: string }> };

const searchHref = (model: string, extra: Record<string, string> = {}) =>
  `/search?${new URLSearchParams({ model, ...extra }).toString()}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const model = slugToModel(slug);
  if (!model) return {};

  const stats = await getModelStats(model);
  const title = `${model} 中古の相場・最安値【毎日更新】`;
  const shops = shopLabels(shopsFor(model));
  const description = stats.minPrice !== null
    ? `${model}の中古相場（中央値）は${yen(stats.medianPrice ?? stats.minPrice)}、最安値は${yen(stats.minPrice)}。${stats.shopCount}ショップ・${stats.count}件の在庫を容量・状態ランク別に比較。${shops}の価格を毎日更新。`
    : `${model}の中古在庫を${shops}から一括比較。容量・状態ランク別の最安値をまとめています。`;
  const path = modelPagePath(model);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path },
    // 在庫ゼロの薄いページはインデックスさせない
    robots: stats.count === 0 ? { index: false, follow: true } : undefined,
  };
}

function PriceTable({ title, rows, labelOf, hrefOf, baseline, note, subOf }: {
  title: string;
  rows: PriceRow[];
  labelOf: (key: string) => string;
  hrefOf: (key: string) => string;
  /** 渡すと、最安値の下に「この値段との差」を出す */
  baseline?: number | null;
  note?: string;
  /** 行の名前の下に小さく添える補足 */
  subOf?: (key: string) => string | undefined;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
      <h2 className="px-5 py-4 text-base font-bold text-slate-800 bg-slate-50 border-b border-slate-100">{title}</h2>
      {/* 行全体をリンクにする（ホバーで色が変わる範囲 = 押せる範囲） */}
      <div className="text-sm">
        <div className="grid grid-cols-[1fr_auto_4.5rem_1rem] gap-x-4 px-5 py-2 text-xs font-semibold text-slate-400">
          <span></span>
          <span className="text-right">最安値</span>
          <span className="text-right">在庫数</span>
          <span></span>
        </div>
        {rows.map((r) => (
          <Link
            key={r.key}
            href={hrefOf(r.key)}
            className="group grid grid-cols-[1fr_auto_4.5rem_1rem] gap-x-4 items-center px-5 py-3 border-t border-slate-100 hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none transition-colors"
          >
            <span className="min-w-0">
              <span className="block font-bold text-slate-700 group-hover:text-blue-600">{labelOf(r.key)}</span>
              {subOf?.(r.key) && <span className="block text-[11px] text-slate-400 leading-snug">{subOf(r.key)}</span>}
            </span>
            <span className="text-right">
              <span className="font-black text-red-600">{yen(r.minPrice)}</span>
              {baseline != null && (
                <span className="block text-xs text-slate-400">
                  {r.minPrice > baseline ? `+${(r.minPrice - baseline).toLocaleString()}円` : "最安値と同じ"}
                </span>
              )}
            </span>
            <span className="text-right text-slate-500">{r.count.toLocaleString()}件</span>
            <span className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-transform" aria-hidden>›</span>
          </Link>
        ))}
      </div>
      {note && <p className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">{note}</p>}
    </section>
  );
}

/** 容量 × 状態ランクの最安値。セルはその条件の検索結果へ */
function StorageRankTable({ model, matrix }: { model: string; matrix: StorageRankMatrix }) {
  if (matrix.storages.length === 0) return null;
  return (
    <section className="mb-10 bg-white rounded-3xl border border-slate-200 overflow-hidden">
      <h2 className="px-5 py-4 text-base font-bold text-slate-800 bg-slate-50 border-b border-slate-100">容量 × 状態ランクの最安値</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400">
              <th className="text-left font-semibold pl-5 pr-2 py-2"></th>
              {matrix.ranks.map((r) => <th key={r} className="text-right font-semibold px-2 py-2 whitespace-nowrap">ランク {r}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.storages.map((st) => (
              <tr key={st} className="border-t border-slate-100">
                <td className="pl-5 pr-2 py-2.5 font-bold text-slate-700 whitespace-nowrap">{storageLabel(st)}</td>
                {matrix.ranks.map((r) => {
                  const cell = matrix.cells.get(`${st}:${r}`);
                  return (
                    <td key={r} className="px-2 py-2.5 text-right whitespace-nowrap">
                      {cell ? (
                        <Link href={searchHref(model, { storage: String(st), rank: r })} className="group">
                          <span className="font-black text-red-600 group-hover:underline underline-offset-2">{yen(cell.minPrice)}</span>
                          <span className="block text-[11px] text-slate-400">{cell.count.toLocaleString()}件</span>
                        </Link>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">ランクの基準は店ごとに違います。金額を押すとその条件の在庫一覧へ移ります。</p>
    </section>
  );
}

// 店によってバッテリーの表記が違うので、表の数え方を書いておく（lib/shops.ts の battery）
// 注記に出すのは、その機種を扱っている店だけ（Pixel は3店など）
function batteryNote(model: string): string {
  const shops = shopsFor(model);
  const labelsWith = (battery: string) => shops.filter((s) => s.battery === battery).map((s) => s.label).join("・");
  const over80 = labelsWith("over80");
  const none = labelsWith("none");
  return `未使用品（ランクS）を含みます。${over80 ? `${over80}は「80%以上」表記のため80%の行だけに` : ""}${over80 && none ? "、" : over80 ? "入れています。" : ""}${none ? `${none}はバッテリーの記載を取り込めていないため未使用品以外は含みません。` : ""}`;
}

export default async function ModelPage({ params }: Props) {
  const { slug } = await params;
  const model = slugToModel(slug);
  if (!model) notFound();

  const [stats, history, batteryRows, matrix] = await Promise.all([
    getModelStats(model),
    getPriceHistory(slug),
    getBatteryRows(model),
    getStorageRankMatrix(model),
  ]);
  const spec = specOf(model);
  const hub = DEVICE_HUB[deviceOf(model)];
  const listPath = hub.path;
  const listName = hub.name;
  const pixel = PIXEL_INFO[model];
  const pixelUntil = updateUntil(model);
  // 保証の残り（ISR で1時間ごとに作り直すので、その時点の年月で計算する）
  const pixelLeft = updateYearsLeft(model, new Date().toISOString().slice(0, 7));
  const series = seriesOf(model);
  const siblings = siblingModels(model);
  const path = modelPagePath(model);

  // 前後のシリーズへの導線
  const seriesIdx = series ? IPHONE_CATALOG.indexOf(series) : -1;
  const neighborSeries = seriesIdx >= 0 ? [IPHONE_CATALOG[seriesIdx - 1], IPHONE_CATALOG[seriesIdx + 1]].filter(Boolean) : [];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: listName, item: `${SITE_URL}${listPath}` },
        { "@type": "ListItem", position: 3, name: `${model} 中古`, item: `${SITE_URL}${path}` },
      ],
    },
    ...(stats.minPrice !== null && stats.maxPrice !== null
      ? [{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${model}（中古）`,
          brand: { "@type": "Brand", name: hub.brand },
          itemCondition: "https://schema.org/UsedCondition",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "JPY",
            lowPrice: stats.minPrice,
            highPrice: stats.maxPrice,
            offerCount: stats.count,
            availability: "https://schema.org/InStock",
          },
        }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader label="価格比較" />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-slate-400 mb-4">
          <Link href="/" className="hover:text-blue-600">トップ</Link>
          <span className="mx-2">›</span>
          <Link href={listPath} className="hover:text-blue-600">{listName}</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-600">{model}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
          {model} 中古の相場・最安値
        </h1>
        <p className="text-slate-500 text-sm mb-4">
          大手中古ショップ{shopsFor(model).length}社の在庫をまとめて比較しています。
          {stats.lastUpdated && (
            <>最終更新: {stats.lastUpdated.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" })}</>
          )}
        </p>
        <AdDisclosure compact />

        {/* 紹介文（発売・スペックと、いまの中古相場） */}
        <p className="mt-5 text-slate-700 leading-relaxed">
          {spec && (
            <>{model}は{spec.released}発売（{spec.chip}・{spec.display}インチ{spec.panel}・{spec.port}）。</>
          )}
          {stats.minPrice !== null && stats.medianPrice !== null && (
            <>中古の最安値は<strong>{yen(stats.minPrice)}</strong>、相場（在庫の中央値）は<strong>{yen(stats.medianPrice)}</strong>で、{stats.shopCount}ショップに{stats.count.toLocaleString()}件の在庫があります。</>
          )}
          {pixel && pixelUntil && pixelLeft !== undefined
            ? (pixelLeft > 0
              ? <>Google のアップデート保証は販売開始（{jaMonth(pixel.available)}）から{pixel.updateYears}年で、<strong>{jaMonth(pixelUntil)}まで</strong>（残り約{pixelLeft}年）です。</>
              : <>Google のアップデート保証（販売開始から{pixel.updateYears}年・{jaMonth(pixelUntil)}まで）は終わっています。</>)
            : isIpad(model)
              ? (IPADOS27_MODELS.has(model) ? "iPadOS 27 に対応しています。" : "iPadOS 27 には対応していません。")
              : deviceOf(model) === "galaxy"
                ? (GALAXY_RELEASED[model] ? `日本では${jaMonth(GALAXY_RELEASED[model])}に発売されました。` : null)
                : (ALL_CATALOG_MODELS.includes(model) ? "iOS 27 に対応しています。" : "iOS 27 には対応していないため、サブ機・撮影用向けです。")}
        </p>

        {/* サマリー */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
          {[
            { label: "最安値", value: stats.minPrice !== null ? yen(stats.minPrice) : "-", accent: true },
            { label: "相場（中央値）", value: stats.medianPrice !== null ? yen(stats.medianPrice) : "-" },
            { label: "在庫数", value: `${stats.count.toLocaleString()}件` },
            { label: "取扱ショップ", value: `${stats.shopCount}店` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-black tracking-tight ${s.accent ? "text-red-600" : "text-slate-800"}`}>{s.value}</p>
            </div>
          ))}
        </section>
        <p className="-mt-3 mb-8 text-xs text-slate-400">
          相場＝販売中の在庫を安い順に並べた真ん中の値。最安値は1台だけの特価やジャンク品のことが多いので、買う値段の目安には相場を見てください。
        </p>

        <section className="mb-10 rounded-3xl border border-slate-200 p-5 md:p-6">
          <h2 className="text-lg md:text-xl font-bold mb-3">{model} 中古の最安値の推移</h2>
          <PriceHistoryChart history={history} model={model} />
        </section>

        {stats.count === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-slate-200 mb-10">
            <p className="text-slate-500 text-lg">現在、{model}の在庫はありません。</p>
            <p className="text-sm text-slate-400 mt-2">在庫は6時間ごとに更新されます。同じシリーズの他モデルもチェックしてみてください。</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
              <PriceTable title="容量別の最安値" rows={stats.byStorage} labelOf={storageLabel}
                hrefOf={(k) => searchHref(model, { storage: k })} />
              {/* 多くの店で最大容量は値段に反映されていないので、少し足すだけで状態のよい個体が買えることを見せる */}
              <PriceTable title="バッテリー最大容量別の最安値" rows={batteryRows} labelOf={(k) => `${k}%以上`}
                hrefOf={(k) => searchHref(model, { minBattery: k })} baseline={stats.minPrice} note={batteryNote(model)} />
              <PriceTable title="状態ランク別の最安値" rows={stats.byRank} labelOf={(k) => `ランク ${k}`}
                hrefOf={(k) => searchHref(model, { rank: k })} />
              <PriceTable title="ショップ別の最安値" rows={stats.byShop} labelOf={(k) => k}
                subOf={(k) => { const s = findShop(k); return s && `保証: ${s.warranty}／赤ロム: ${s.redRom}`; }}
                note="保証は各店の公式ページで確認した内容です（詳しくは「このサイトについて」）。"
                hrefOf={(k) => searchHref(model, { shop: k })} />
            </div>

            <StorageRankTable model={model} matrix={matrix} />

            <section className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold mb-4">いま一番安い{model}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {stats.cheapest.map((d) => <DeviceCard key={d.id} device={d} />)}
              </div>
              <div className="text-center mt-8">
                <Link href={searchHref(model)}
                  className="inline-flex items-center px-8 py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-blue-600 transition-colors">
                  {model}の在庫をすべて見る（{stats.count}件）&rarr;
                </Link>
              </div>
            </section>
          </>
        )}

        {/* 運営者（検品担当）の視点。iPhone のみ */}
        {deviceOf(model) === "iphone" && (
          <InspectionTips model={model} has64GB={stats.byStorage.some((r) => r.key === "64")} />
        )}

        {/* 基本スペック（確かめた機種だけ。lib/iphoneSpecs.ts） */}
        {spec && (
          <section className="mb-6 rounded-3xl border border-slate-200 p-5 md:p-6">
            <h2 className="text-lg font-bold mb-3">{model}の基本スペック</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {SPEC_ROWS.map((r) => (
                <div key={r.label} className="contents">
                  <dt className="text-slate-400 font-bold">{r.label}</dt>
                  <dd className="text-slate-800">{r.value(spec)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-slate-400">
              出典: <a href={specUrl(spec)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-blue-600">Apple「{model} - 技術仕様」</a>
            </p>
          </section>
        )}

        {/* Pixel のアップデート保証（Google 公式の年数と販売開始の年月から。lib/pixelCatalog.ts） */}
        {pixel && pixelUntil && (
          <section className="mb-6 rounded-3xl border border-slate-200 p-5 md:p-6">
            <h2 className="text-lg font-bold mb-3">{model}のアップデート保証</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-400 font-bold">販売開始</dt>
              <dd className="text-slate-800">{jaMonth(pixel.available)}（米国 Google ストア）</dd>
              <dt className="text-slate-400 font-bold">保証の年数</dt>
              <dd className="text-slate-800">販売開始から{pixel.updateYears}年（OS・セキュリティ）</dd>
              <dt className="text-slate-400 font-bold">保証の終わり</dt>
              <dd className="text-slate-800">{jaMonth(pixelUntil)}ごろ</dd>
            </dl>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              出典: Google「<a href="https://support.google.com/pixelphone/answer/4457705" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-blue-600">Pixel のアップデート保証期間</a>」
              「<a href="https://support.google.com/pixelphone/answer/15738422" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-blue-600">デバイスが利用可能になった時期</a>」。
              保証の終わりは、販売開始の年月に年数を足したものです。
            </p>
          </section>
        )}

        {/* モデルの特徴 */}
        {series && (
          <section className="mb-10 rounded-3xl bg-slate-50 p-6">
            <h2 className="text-lg font-bold mb-3">{model}の特徴</h2>
            <div className="flex flex-wrap gap-2">
              {badgesOf(model).map((b) => (
                <span key={b} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-slate-600 border border-slate-200">{b}</span>
              ))}
            </div>
          </section>
        )}

        {/* このモデルを含む比較 */}
        {comparesFor(model).length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-3">{model}と他モデルの中古価格を比較</h2>
            <div className="flex flex-wrap gap-2">
              {comparesFor(model).map(([x, y]) => (
                <Link key={comparePath(x, y)} href={comparePath(x, y)}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 border border-blue-100 text-blue-700 hover:border-blue-300 transition-colors">
                  {x} vs {y}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 関連モデル */}
        <section className="mb-4">
          <h2 className="text-lg font-bold mb-3">関連モデルの中古価格</h2>
          <div className="flex flex-wrap gap-2">
            {[...siblings, ...neighborSeries.flatMap((s) => s.models)].map((m) => (
              <Link key={m} href={modelPagePath(m)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                {m}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
