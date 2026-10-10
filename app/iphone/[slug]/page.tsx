import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowDown, ChevronDown } from "lucide-react";
import DeviceCard, { DeviceList, type Device } from "@/app/components/DeviceCard";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import {
  ALL_CATALOG_MODELS,
  ALL_DEVICE_PAGE_MODELS,
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
import { SPEC_ROWS, displayText, specOf, specSourceName, specUrl } from "@/lib/iphoneSpecs";
import { IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { PIXEL_INFO, jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { GALAXY_RELEASED } from "@/lib/galaxyCatalog";
import { comparePath, comparesFor } from "@/lib/compare";
import { getPriceHistory } from "@/lib/priceHistory";
import { BUDGET_NAMES, budgetLabel, budgetPath } from "@/lib/budgets";
import { smallestBudgetFor } from "@/lib/budgetStats";
import PriceHistoryChart from "@/app/components/PriceHistoryChart";
import InspectionTips, { inspectionTips } from "@/app/components/InspectionTips";
import { getGoodConditionMin } from "@/lib/modelBest";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { yen, storageLabel } from "@/lib/format";
import { findShop, shopLabels, shopsFor } from "@/lib/shops";

// スクレイパーの後にビルドするので、在庫はその時点のもの
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

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

const CARD = "bg-white border border-line rounded-xl";
const SEC = "mx-4 md:mx-0 mt-4";
const LINK = "text-brand-600 hover:text-brand-800";

/** 折りたたみ1つ分（ネイティブの details）。中身は閉じていても HTML に入る */
function Accordion({ title, hint, children, open }: { title: string; hint?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line-soft last:border-b-0">
      <summary className="min-h-12 flex items-center justify-between gap-3 px-3.5 text-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-ground">
        <span className="font-bold">{title}</span>
        <span className="flex items-center gap-1 text-xs text-ink-mute">
          {hint}
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="px-3.5 pb-3.5">{children}</div>
    </details>
  );
}

/** 条件ごとの最安値の一覧（行がその条件の検索結果へのリンク） */
function PriceList({ rows, labelOf, hrefOf, baseline, note }: {
  rows: PriceRow[];
  labelOf: (key: string) => string;
  hrefOf: (key: string) => string;
  /** 渡すと、最安値の下に「この値段との差」を出す */
  baseline?: number | null;
  note?: string;
}) {
  if (rows.length === 0) return <p className="text-xs text-ink-mute">在庫がありません。</p>;
  return (
    <div>
      {rows.map((r) => (
        <Link key={r.key} href={hrefOf(r.key)} className="flex items-center justify-between gap-3 py-2.5 border-t border-line-soft first:border-t-0 hover:bg-ground">
          <span className="flex flex-col min-w-0">
            <span className="text-[13px] font-bold">{labelOf(r.key)}</span>
            <span className="text-[11px] text-ink-mute">{r.count.toLocaleString()}件</span>
          </span>
          <span className="text-right whitespace-nowrap">
            <span className="text-[15px] font-bold text-price">{yen(r.minPrice)}</span>
            {baseline != null && (
              <span className="block text-[11px] text-ink-mute">
                {r.minPrice > baseline ? `+${(r.minPrice - baseline).toLocaleString()}円` : "最安値と同じ"}
              </span>
            )}
          </span>
        </Link>
      ))}
      {note && <p className="pt-2 border-t border-line-soft text-[11px] text-ink-mute leading-relaxed">{note}</p>}
    </div>
  );
}

// ランクの意味は目安（基準は店ごとに違う）。S・A・B・C 以外は説明を付けない
const RANK_HINT: Record<string, string> = { S: "未使用・新品同様", A: "美品", B: "小傷あり", C: "目立つ傷" };

/** 容量 × 状態ランクの最安値。セルはその条件の検索結果へ。行でいちばん安い金額は太字 */
function StorageRankTable({ model, matrix }: { model: string; matrix: StorageRankMatrix }) {
  if (matrix.storages.length === 0) return null;
  return (
    <section className={`${SEC} ${CARD} overflow-hidden`}>
      <h2 className="px-3.5 pt-3 pb-2 text-[15px] font-bold">容量 × ランクの最安値</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-normal pl-3.5 pr-2 py-1.5"></th>
              {matrix.ranks.map((r) => (
                <th key={r} className="text-right font-normal text-ink-mute px-2 py-1.5 whitespace-nowrap last:pr-3.5">
                  <span className="block text-ink font-bold text-xs">{r}</span>
                  {RANK_HINT[r] && <span className="block text-[10px]">{RANK_HINT[r]}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.storages.map((st) => {
              const best = Math.min(...matrix.ranks.flatMap((r) => matrix.cells.get(`${st}:${r}`)?.minPrice ?? []));
              return (
                <tr key={st} className="border-t border-line-soft">
                  <td className="pl-3.5 pr-2 py-2.5 font-bold whitespace-nowrap">{storageLabel(st)}</td>
                  {matrix.ranks.map((r) => {
                    const cell = matrix.cells.get(`${st}:${r}`);
                    return (
                      <td key={r} className="px-2 py-2.5 text-right whitespace-nowrap last:pr-3.5">
                        {cell ? (
                          <Link href={searchHref(model, { storage: String(st), rank: r })} className="flex flex-col text-price hover:underline underline-offset-2">
                            <span className={cell.minPrice === best ? "font-bold" : "font-medium"}>{cell.minPrice.toLocaleString()}</span>
                            <span className="text-[10px] font-normal text-ink-mute">{cell.count.toLocaleString()}件</span>
                          </Link>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-3.5 pt-2 pb-3 text-[11px] text-ink-mute">ランクの意味は目安で、基準は店ごとに違います。金額（円）を押すとその条件の在庫一覧へ移ります。太字は容量ごとの最安値です。</p>
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

/** 最安の個体を一言で（「ランクC・バッテリー80%未満」など）。電池の表記は在庫の行（DeviceCard）と同じ考え方 */
function describeDevice(d: Device): string {
  const h = d.batteryHealth;
  let bat = "";
  if (h !== null) {
    if (h === 100) bat = "・バッテリー100%";
    else if (findShop(d.shopName)?.battery === "over80") bat = h >= 80 ? "・バッテリー80%以上" : "・バッテリー80%未満";
    else bat = `・バッテリー${h}%`;
  }
  return `ランク${d.conditionRank}${bat}`;
}

export default async function ModelPage({ params }: Props) {
  const { slug } = await params;
  const model = slugToModel(slug);
  if (!model) notFound();

  const device = deviceOf(model);
  const [stats, history, batteryRows, matrix, budget, goodMin] = await Promise.all([
    getModelStats(model),
    getPriceHistory(slug),
    getBatteryRows(model),
    getStorageRankMatrix(model),
    smallestBudgetFor(model, device),
    getGoodConditionMin(model),
  ]);
  const spec = specOf(model);
  const hub = DEVICE_HUB[device];
  const listPath = hub.path;
  const listName = hub.name;
  const pixel = PIXEL_INFO[model];
  const pixelUntil = updateUntil(model);
  // 保証の残り（ビルドのたびに作り直すので、その時点の年月で計算する）
  const pixelLeft = updateYearsLeft(model, new Date().toISOString().slice(0, 7));
  const series = seriesOf(model);
  const siblings = siblingModels(model);
  const path = modelPagePath(model);
  const shopNum = shopsFor(model).length;

  // 同じシリーズのチップ（カタログの並び順）
  const chipModels = [model, ...siblings].sort((a, b) => ALL_DEVICE_PAGE_MODELS.indexOf(a) - ALL_DEVICE_PAGE_MODELS.indexOf(b));

  // 前後のシリーズへの導線
  const seriesIdx = series ? IPHONE_CATALOG.indexOf(series) : -1;
  const neighborSeries = seriesIdx >= 0 ? [IPHONE_CATALOG[seriesIdx - 1], IPHONE_CATALOG[seriesIdx + 1]].filter(Boolean) : [];

  const hasStock = stats.count > 0;
  const cheapest5 = stats.cheapest.slice(0, 5);
  const cheapestDevice = stats.cheapest[0];
  const isIphone = deviceOf(model) === "iphone";
  const has64GB = stats.byStorage.some((r) => r.key === "64");
  const tips = isIphone ? inspectionTips({ model, has64GB }) : [];
  const updatedText = stats.lastUpdated
    ? stats.lastUpdated.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    : null;

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

  // 最安値／相場／在庫。スマホは上の白い面に横3つ、PC は右の固定サマリーに縦
  const statCells = [
    { label: "最安値", value: stats.minPrice !== null ? yen(stats.minPrice) : "-", accent: true },
    { label: "相場（中央値）", value: stats.medianPrice !== null ? yen(stats.medianPrice) : "-" },
    { label: "在庫", value: `${stats.count.toLocaleString()}件`, sub: `${stats.shopCount}店` },
  ];
  const statBlock = (vertical: boolean) => (
    <div className={`grid border border-line rounded-xl ${vertical ? "grid-cols-1 divide-y divide-line" : "grid-cols-3 divide-x divide-line"}`}>
      {statCells.map((c) => (
        <div key={c.label} className={`px-3 py-2.5 flex ${vertical ? "justify-between items-baseline" : "flex-col gap-0.5"}`}>
          <span className="text-[11px] text-ink-mute">{c.label}</span>
          <span className={`text-[19px] font-bold leading-tight ${c.accent ? "text-price" : ""}`}>
            {c.value}
            {c.sub && <span className={`text-xs font-normal text-ink-mute ${vertical ? "ml-1" : "block"}`}>{vertical ? "・" : ""}{c.sub}</span>}
          </span>
        </div>
      ))}
    </div>
  );

  // 結論の1文。条件に合う在庫がなければ出さない
  const conclusion = goodMin !== null ? (
    <p className="text-sm leading-[1.7] text-gray-700">
      ランクB以上・バッテリー85%以上なら <strong className="text-ink">{yen(goodMin)}〜</strong>。
      {cheapestDevice && cheapestDevice.price < goodMin && <>最安値は{describeDevice(cheapestDevice)}の個体です。</>}
    </p>
  ) : null;

  const listButton = (
    <a href="#list" className="h-12 rounded-xl bg-brand-600 hover:bg-brand-800 text-white flex items-center justify-center gap-1.5 text-[15px] font-bold">
      安い順に在庫を見る
      <ArrowDown className="w-[18px] h-[18px]" aria-hidden="true" />
    </a>
  );

  return (
    <div className="min-h-screen bg-ground text-ink font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader label="価格比較" />

      <main className="max-w-[1120px] mx-auto pb-24 md:pb-10 md:px-4 md:pt-5 md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-6 md:items-start">
        <div className="min-w-0">
          <section className="bg-white px-4 pt-3 pb-4 flex flex-col gap-2.5 border-b border-line md:border md:rounded-xl">
            <nav aria-label="パンくずリスト" className="text-xs text-ink-mute">
              <Link href="/" className={LINK}>トップ</Link>
              <span className="mx-1.5">›</span>
              <Link href={listPath} className={LINK}>{listName}</Link>
              <span className="mx-1.5">›</span>
              <span>{model}</span>
            </nav>

            <h1 className="text-[22px] md:text-[26px] leading-[1.35] font-bold">{model} 中古の相場・最安値</h1>

            <div className="flex flex-col gap-1">
              <p className="text-xs text-ink-mute">
                {updatedText && <>更新 {updatedText} ・ </>}
                {shopNum}店を比較 ・ 運営: 中古スマホ店の検品担当
              </p>
              <AdDisclosure compact />
            </div>

            {chipModels.length > 1 && (
              <nav aria-label="同じシリーズの機種" className="flex gap-1.5 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
                {chipModels.map((m) =>
                  m === model ? (
                    <span key={m} aria-current="page" className="shrink-0 h-8 px-3 rounded-full bg-brand-800 text-white text-xs flex items-center">{m}</span>
                  ) : (
                    <Link key={m} href={modelPagePath(m)} className="shrink-0 h-8 px-3 rounded-full border border-gray-300 text-ink text-xs flex items-center hover:border-brand-600">{m}</Link>
                  ),
                )}
              </nav>
            )}

            {/* スマホ: ここに数字・結論・ボタン。PC は右の固定サマリーに出す */}
            <div className="md:hidden flex flex-col gap-2.5">
              {statBlock(false)}
              {conclusion}
              {hasStock && listButton}
            </div>

            {/* 紹介文（発売・スペックと、いまの中古相場） */}
            <p className="text-sm leading-[1.7] text-gray-700">
              {spec && (
                <>{model}は{spec.released}発売（{spec.chip}・{displayText(spec).replace(" ", "")}・{spec.port}）。</>
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
            <p className="text-[11px] text-ink-mute leading-relaxed">
              相場＝販売中の在庫を安い順に並べた真ん中の値。最安値は1台だけの特価やジャンク品のことが多いので、買う値段の目安には相場を見てください。
            </p>

            {/* この機種が買える予算（予算別ページへの導線。lib/budgetStats.ts の smallestBudgetFor） */}
            {budget && (
              <p className="text-[13px] text-ink-sub leading-[1.7]">
                {model}はジャンク品を除いて{yen(budget.minPrice)}から買えます。同じ予算のほかの機種は{" "}
                <Link href={budgetPath(budget.max, device)} className={`font-bold ${LINK} hover:underline underline-offset-2`}>
                  {budgetLabel(budget.max)}以下で買える{BUDGET_NAMES[device]}
                </Link>
                で比べられます。
              </p>
            )}
          </section>

          {!hasStock ? (
            <div className={`${SEC} ${CARD} text-center py-14 px-4`}>
              <p className="text-ink-sub text-base">現在、{model}の在庫はありません。</p>
              <p className="text-xs text-ink-mute mt-2">在庫は6時間ごとに更新されます。同じシリーズの他モデルもチェックしてみてください。</p>
            </div>
          ) : (
            <>
              {isIphone && tips.length > 0 && (
                <section className={`${SEC} bg-inspect-50 border border-inspect-line rounded-xl p-3.5 flex flex-col gap-1.5`}>
                  <span className="text-xs font-bold text-inspect-800">検品担当のひとこと</span>
                  <p className="text-[13px] leading-[1.7] text-gray-700">{tips[0].body}</p>
                  <a href="#points" className={`text-[13px] ${LINK}`}>検品で見る{tips.length}つのポイント ›</a>
                </section>
              )}

              <StorageRankTable model={model} matrix={matrix} />

              <section id="list" className={`${SEC} mt-5 flex flex-col gap-2 scroll-mt-16`}>
                <h2 className="text-[17px] font-bold">安い在庫</h2>
                <div className="flex gap-1.5 overflow-x-auto">
                  {[
                    { label: "すべて", href: searchHref(model), current: true },
                    { label: "バッテリー85%以上", href: searchHref(model, { minBattery: "85" }) },
                    { label: "ランクA", href: searchHref(model, { rank: "A" }) },
                  ].map((c) => (
                    <Link key={c.label} href={c.href}
                      className={`shrink-0 h-9 px-3.5 rounded-full border text-[13px] flex items-center ${
                        c.current ? "bg-brand-800 border-brand-800 text-white" : "bg-white border-gray-300 text-ink hover:border-brand-600"
                      }`}>
                      {c.label}
                    </Link>
                  ))}
                </div>
                <DeviceList>
                  {cheapest5.map((d) => <DeviceCard key={d.id} device={d} showModel={false} />)}
                  <Link href={searchHref(model)} className={`flex items-center justify-center h-12 text-sm font-bold ${LINK}`}>
                    {stats.count.toLocaleString()}件すべて見る ›
                  </Link>
                </DeviceList>
              </section>
            </>
          )}

          <section className={`${SEC} mt-5 ${CARD} p-3.5 flex flex-col gap-2`}>
            <h2 className="text-[15px] font-bold">最安値の推移</h2>
            <PriceHistoryChart history={history} model={model} />
          </section>

          {/* 運営者（検品担当）の視点。iPhone のみ */}
          {isIphone && (
            <div className={`${SEC} mt-5`}>
              <InspectionTips model={model} has64GB={has64GB} />
            </div>
          )}

          {hasStock && (
            <section className={`${SEC} mt-5 flex flex-col gap-2`}>
              <h2 className="text-[17px] font-bold">くわしく見る</h2>
              <div className={`${CARD} overflow-hidden`}>
                <Accordion title="バッテリー最大容量別の最安値" hint="80〜95%">
                  {/* 多くの店で最大容量は値段に反映されていないので、少し足すだけで状態のよい個体が買えることを見せる */}
                  <PriceList rows={batteryRows} labelOf={(k) => `${k}%以上`}
                    hrefOf={(k) => searchHref(model, { minBattery: k })} baseline={stats.minPrice} note={batteryNote(model)} />
                </Accordion>
                <Accordion title="状態ランク別の最安値" hint={stats.byRank.map((r) => r.key).join("・")}>
                  <PriceList rows={stats.byRank} labelOf={(k) => `ランク ${k}${RANK_HINT[k] ? `（${RANK_HINT[k]}の目安）` : ""}`}
                    hrefOf={(k) => searchHref(model, { rank: k })} />
                </Accordion>
                <Accordion title="ショップ別の最安値と保証" hint={`${stats.byShop.length}店`}>
                  <div>
                    {stats.byShop.map((r) => {
                      const s = findShop(r.key);
                      return (
                        <div key={r.key} className="py-2.5 border-t border-line-soft first:border-t-0">
                          <Link href={searchHref(model, { shop: r.key })} className="flex items-center justify-between gap-2 hover:bg-ground">
                            <span className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-[13px] font-bold">{r.key}</span>
                              {s && <span className="text-[11px] text-safe">{s.warrantyShort}・{s.redRomShort}</span>}
                            </span>
                            <span className="text-[15px] font-bold text-price whitespace-nowrap">{yen(r.minPrice)}</span>
                          </Link>
                          {s && <p className="mt-1 text-[11px] text-ink-mute leading-snug">保証: {s.warranty}／赤ロム: {s.redRom}</p>}
                        </div>
                      );
                    })}
                    <p className="pt-2 border-t border-line-soft text-[11px] text-ink-mute leading-relaxed">
                      保証は各店の公式ページで確認した内容です（詳しくは
                      <Link href="/about" className={`${LINK} underline underline-offset-2`}>「このサイトについて」</Link>）。
                    </p>
                  </div>
                </Accordion>
                {/* 基本スペック（確かめた機種だけ。lib/iphoneSpecs.ts） */}
                {spec && (
                  <Accordion title={`${model}の基本スペック`} hint={spec.released}>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                      {SPEC_ROWS.map((r) => (
                        <div key={r.label} className="contents">
                          <dt className="text-ink-mute font-bold">{r.label}</dt>
                          <dd>{r.value(spec)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-3 text-[11px] text-ink-mute">
                      出典: <a href={specUrl(spec)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">{specSourceName(spec, model)}</a>
                      {spec.extraSource && <>・<a href={spec.extraSource.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">{spec.extraSource.name}</a></>}
                    </p>
                  </Accordion>
                )}
                {/* Pixel のアップデート保証（Google 公式の年数と販売開始の年月から。lib/pixelCatalog.ts） */}
                {pixel && pixelUntil && (
                  <Accordion title={`${model}のアップデート保証`} hint={`${jaMonth(pixelUntil)}まで`}>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                      <dt className="text-ink-mute font-bold">販売開始</dt>
                      <dd>{jaMonth(pixel.available)}（米国 Google ストア）</dd>
                      <dt className="text-ink-mute font-bold">保証の年数</dt>
                      <dd>販売開始から{pixel.updateYears}年（OS・セキュリティ）</dd>
                      <dt className="text-ink-mute font-bold">保証の終わり</dt>
                      <dd>{jaMonth(pixelUntil)}ごろ</dd>
                    </dl>
                    <p className="mt-3 text-[11px] text-ink-mute leading-relaxed">
                      出典: Google「<a href="https://support.google.com/pixelphone/answer/4457705" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">Pixel のアップデート保証期間</a>」
                      「<a href="https://support.google.com/pixelphone/answer/15738422" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">デバイスが利用可能になった時期</a>」。
                      保証の終わりは、販売開始の年月に年数を足したものです。
                    </p>
                  </Accordion>
                )}
                {/* モデルの特徴 */}
                {series && (
                  <Accordion title={`${model}の特徴`}>
                    <div className="flex flex-wrap gap-1.5">
                      {badgesOf(model).map((b) => (
                        <span key={b} className="px-2.5 py-1 rounded-full text-xs bg-ground text-ink-sub border border-line">{b}</span>
                      ))}
                    </div>
                  </Accordion>
                )}
                <Accordion title="価格・在庫データの集め方" hint={`${shopNum}店・1日4回`}>
                  <p className="text-[13px] leading-[1.7] text-gray-700">
                    {shopNum}店の公開在庫を1日4回（6時間ごと）取得し、売り切れを除いた在庫をまとめています。
                    相場は販売中の在庫を安い順に並べた真ん中の値（中央値）で、最安値にはジャンク品が含まれることがあります。
                    価格・在庫は取得した時点のもので、売り切れや値下げが反映されるまで最大6時間ほどかかります。
                    詳しくは<Link href="/about" className={`${LINK} underline underline-offset-2`}>「このサイトについて」</Link>をご覧ください。
                  </p>
                </Accordion>
              </div>
            </section>
          )}

          {/* このモデルを含む比較 */}
          {comparesFor(model).length > 0 && (
            <section className={`${SEC} mt-5`}>
              <h2 className="text-[15px] font-bold mb-2">{model}と他モデルの中古価格を比較</h2>
              <div className="flex flex-wrap gap-1.5">
                {comparesFor(model).map(([x, y]) => (
                  <Link key={comparePath(x, y)} href={comparePath(x, y)}
                    className="h-9 px-3.5 rounded-full text-[13px] bg-brand-50 border border-brand-200 text-brand-800 flex items-center hover:border-brand-600">
                    {x} vs {y}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 関連モデル */}
          <section className={`${SEC} mt-5`}>
            <h2 className="text-[15px] font-bold mb-2">関連モデルの中古価格</h2>
            <div className="flex flex-wrap gap-1.5">
              {[...siblings, ...neighborSeries.flatMap((s) => s.models)].map((m) => (
                <Link key={m} href={modelPagePath(m)}
                  className="h-9 px-3.5 rounded-full text-[13px] bg-white border border-gray-300 text-ink flex items-center hover:border-brand-600">
                  {m}
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* PC: 右の固定サマリー */}
        <aside className="hidden md:flex flex-col gap-3 sticky top-[68px] bg-white border border-line rounded-xl p-4" aria-label={`${model}のサマリー`}>
          <p className="text-sm font-bold">{model}</p>
          {statBlock(true)}
          {conclusion}
          {hasStock && listButton}
        </aside>
      </main>

      {/* スマホ: 画面下に固定（機種名・最安値と、在庫へ） */}
      {hasStock && stats.minPrice !== null && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-10 bg-white border-t border-line px-4 pt-2 pb-2.5 flex items-center justify-between gap-2.5">
          <span className="text-[13px] font-bold min-w-0">
            {model} <span className="text-price whitespace-nowrap">{yen(stats.minPrice)}〜</span>
          </span>
          <a href="#list" className="shrink-0 h-11 px-4 rounded-xl bg-brand-600 text-white text-sm font-bold flex items-center">在庫を見る</a>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
