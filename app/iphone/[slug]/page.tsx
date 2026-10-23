import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowDown, Check, ChevronDown } from "lucide-react";
import DeviceCard, { DeviceList, type Device } from "@/app/components/DeviceCard";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
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
import { getBatteryRows, getMemorySsdRankMatrix, getModelStats, getStorageRankMatrix, macCellKey, type MemorySsdRankMatrix, type PriceRow, type StorageRankMatrix } from "@/lib/modelStats";
import { MAC_INFO } from "@/lib/macCatalog";
import { WATCH_INFO, WATCHOS27_IPHONE, isWatchOS27 } from "@/lib/watchCatalog";
import { SPEC_ROWS, specOf, specSourceName, specUrl } from "@/lib/iphoneSpecs";
import { IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { PIXEL_INFO, jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { GALAXY_RELEASED } from "@/lib/galaxyCatalog";
import { androidInfoOf, codeRows, isAndroidJp, releasedSentence, supportSentence, updateRows, updateSource } from "@/lib/androidInfo";
import { comparePath, comparesFor } from "@/lib/compare";
import { getPriceHistory } from "@/lib/priceHistory";
import { BUDGET_NAMES, budgetLabel, budgetPath, type BudgetDevice } from "@/lib/budgets";
import { smallestBudgetFor } from "@/lib/budgetStats";
import PriceHistoryChart from "@/app/components/PriceHistoryChart";
import PriceBand from "@/app/components/PriceBand";
import StatTiles from "@/app/components/StatTiles";
import HeatCells, { type HeatRow } from "@/app/components/HeatCells";
import ShopBars from "@/app/components/ShopBars";
import StackedBar from "@/app/components/StackedBar";
import Sparkline, { recentPoints } from "@/app/components/Sparkline";
import InspectionTips, { inspectionTips } from "@/app/components/InspectionTips";
import { getGoodConditionMin, getGoodRankMin } from "@/lib/modelBest";
import { getBuyNowNotes, getBuyNowStats } from "@/lib/buyNow";
import { getBreakdown, getRankSMax, getShopBars, type Breakdown, type ShopBarRow } from "@/lib/modelBreakdown";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { medianLabel, yen, storageLabel } from "@/lib/format";
import { findShop, shopsFor } from "@/lib/shops";
import { activeShopsFor } from "@/lib/activeShops";
import { appleCheckedJa, applePriceSource, newVsUsed } from "@/lib/applePrices";
import { newVsUsedOfficial, officialCheckedJa, officialPriceSource } from "@/lib/officialPrices";
import NewVsUsedSection from "@/app/components/NewVsUsedSection";
import RepairOrReplace from "@/app/components/RepairOrReplace";
import IpadGuide from "@/app/components/IpadGuide";
import { buildFaq, buildSummary, modelDescription } from "@/lib/modelFaq";
import { BUYBACK_PROGRAMS, REPAIR_PROGRAMS } from "@/lib/buyback";
import ModelGuide, { type SourceItem } from "@/app/components/ModelGuide";
import { buyVerdict, dailyRows, monthlyRows, seriesFor, trendOf, trendSentence } from "@/lib/modelGuide";
import { sameBudgetModels } from "@/lib/sameBudget";
import { SIM_PLANS } from "@/lib/simPlans";

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
  // 検索は「機種名 中古 最安値」がほとんどなので、タイトルに最安値の金額を入れる（10/17〜。在庫がないときは従来の形）。
  // 公式で新品を売っている機種は「相場」の代わりに新品との差（いちばん小さい容量の最安と公式価格）を入れる（10/23〜。
  // 18 Pro Max などの新しい機種は表示が多いのに 10位前後でクリックが少なく、新品との差を知りたい検索が多いと見た）
  const nv = stats.count === 0 ? [] : deviceOf(model) === "iphone" ? newVsUsed(model, stats.byStorage) : newVsUsedOfficial(model, stats.byStorage);
  const nvMin = nv[0];
  const tail = nvMin ? (nvMin.diff > 0 ? `新品より${yen(nvMin.diff)}安い` : `新品${yen(nvMin.newPrice)}と比較`) : "相場";
  const title = stats.minPrice !== null ? `${model} 中古の最安値 ${yen(stats.minPrice)}〜｜${tail}【毎日更新】` : `${model} 中古の相場・最安値【毎日更新】`;
  const description = modelDescription(model, stats);
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
const LINK = "text-brand-600 hover:text-brand-800";

/** 折りたたみ1つ分（ネイティブの details）。中身は閉じていても HTML に入る */
function Accordion({ title, hint, badge, children, open }: { title: string; hint?: string; badge?: number; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line-soft last:border-b-0">
      <summary className="min-h-12 flex items-center justify-between gap-3 px-3.5 text-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-ground">
        <span className="flex items-center gap-2.5">
          {badge !== undefined && (
            <span className="w-7 h-7 rounded-lg bg-inspect-50 border border-inspect-line text-inspect-700 flex items-center justify-center text-xs font-bold" aria-hidden="true">{badge}</span>
          )}
          <span className="font-bold">{title}</span>
        </span>
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

/** 容量（Apple Watch はサイズ）× ランクの最安値 → ヒートマップの行。セルは今までと同じ検索へのリンク */
function storageHeat(model: string, matrix: StorageRankMatrix): HeatRow[] {
  return matrix.storages.map((st) => ({
    label: storageLabel(st, model),
    cells: matrix.ranks.map((r) => {
      const cell = matrix.cells.get(`${st}:${r}`);
      return cell ? { minPrice: cell.minPrice, count: cell.count, href: searchHref(model, { storage: String(st), rank: r }) } : null;
    }),
  }));
}

/** MacBook のメモリ／SSD × ランクの最安値 → ヒートマップの行（メモリ・SSD は購入後に増やせない） */
function memorySsdHeat(model: string, matrix: MemorySsdRankMatrix): HeatRow[] {
  return matrix.combos.map((c) => ({
    label: `${c.memoryGB ? `${c.memoryGB}GB / ` : ""}${storageLabel(c.storage)}`,
    cells: matrix.ranks.map((r) => {
      const cell = matrix.cells.get(macCellKey(c.memoryGB, c.storage, r));
      return cell
        ? { minPrice: cell.minPrice, count: cell.count, href: searchHref(model, { ...(c.memoryGB ? { memory: String(c.memoryGB) } : {}), storage: String(c.storage), rank: r }) }
        : null;
    }),
  }));
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
  // MacBook（2026-10-15〜）: 容量×ランクの代わりにメモリ／SSD×ランク、結論はバッテリーの条件なし、予算別ページはまだない
  const mac = device === "mac";
  // Apple Watch（2026-10-15〜）: サイズ（mm）×ランクの表、結論はバッテリーの条件なし（MacBook と同じ）、予算別・検品・買取・回線の枠は出さない
  const watch = device === "watch";
  // Xperia・AQUOS・Apple Watch（2026-10-15〜）も予算別ページはまだない
  const budgetDevice: BudgetDevice | null = device === "mac" || device === "xperia" || device === "aquos" || device === "watch" ? null : device;
  const emptyMatrix: StorageRankMatrix = { storages: [], ranks: [], cells: new Map() };
  const [stats, history, batteryRows, matrix, macMatrix, budget, goodMin, buyNowNotes, statTiles] = await Promise.all([
    getModelStats(model),
    getPriceHistory(slug),
    getBatteryRows(model),
    mac ? Promise.resolve(emptyMatrix) : getStorageRankMatrix(model),
    mac ? getMemorySsdRankMatrix(model) : Promise.resolve(null),
    budgetDevice ? smallestBudgetFor(model, budgetDevice) : Promise.resolve(null),
    mac || watch ? getGoodRankMin(model) : getGoodConditionMin(model),
    getBuyNowNotes(model),
    getBuyNowStats(model),
  ]);
  // 図の集計（在庫があるときだけ。どれも DB 側の groupBy / aggregate）
  const emptyBreakdown: Breakdown = { ranks: [], battery: { b90: 0, b85: 0, b80: 0, over80: 0, low: 0, unknown: 0 }, batteryKnown: 0, total: 0 };
  const [shopRows, breakdown, rankSMax]: [ShopBarRow[], Breakdown, number | null] = stats.count > 0
    ? await Promise.all([getShopBars(model), getBreakdown(model), getRankSMax(model)])
    : [[], emptyBreakdown, null];
  const heatRanks = mac && macMatrix ? macMatrix.ranks : matrix.ranks;
  const heatRows = mac && macMatrix ? memorySsdHeat(model, macMatrix) : storageHeat(model, matrix);
  const sparkPoints = recentPoints(history[0] ?? []);
  const spec = specOf(model);
  const macInfo = MAC_INFO[model];
  const watchInfo = WATCH_INFO[model];
  const hub = DEVICE_HUB[device];
  const listPath = hub.path;
  const listName = hub.name;
  const pixel = PIXEL_INFO[model];
  const pixelUntil = updateUntil(model);
  // 保証の残り（ビルドのたびに作り直すので、その時点の年月で計算する）
  const nowYm = new Date().toISOString().slice(0, 7);
  const pixelLeft = updateYearsLeft(model, nowYm);
  // Xperia・AQUOS（2026-10-15〜）: メーカーの公式資料の値（型番・OS 更新・セキュリティ更新。lib/androidInfo.ts）
  const androidInfo = androidInfoOf(model);
  const androidUpdates = updateRows(model, nowYm);
  const androidCodes = codeRows(model);
  const series = seriesOf(model);
  const siblings = siblingModels(model);
  const path = modelPagePath(model);
  const shopNum = (await activeShopsFor(model)).length;

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

  // 「いつまで使えるか」は、このページに出している確認済みの情報（Pixel のアップデート保証・iOS/iPadOS の対応）がある機種だけ
  const supportAnswer: string | null =
    pixel && pixelUntil && pixelLeft !== undefined
      ? (pixelLeft > 0
        ? `Google のアップデート保証は販売開始（${jaMonth(pixel.available)}）から${pixel.updateYears}年で、${jaMonth(pixelUntil)}までです（残り約${pixelLeft}年）。`
        : `Google のアップデート保証（販売開始から${pixel.updateYears}年・${jaMonth(pixelUntil)}まで）は終わっています。`)
      : isIpad(model)
        ? (IPADOS27_MODELS.has(model) ? `${model}は iPadOS 27 に対応しています。` : `${model}は iPadOS 27 には対応していません。`)
        : mac
          ? `${model}は macOS 27 Golden Gate に対応しています。`
        : watch
          ? (isWatchOS27(model) ? `${model}は watchOS 27 に対応しています（Apple 公式）。使うには、${WATCHOS27_IPHONE}が必要です。` : `${model}は watchOS 27 には対応していません（Apple 公式）。`)
        : isAndroidJp(model)
          ? supportSentence(model, nowYm)
        : isIphone
          ? (ALL_CATALOG_MODELS.includes(model) ? `${model}は iOS 27 に対応しています。` : `${model}は iOS 27 には対応していないため、サブ機・撮影用向けです。`)
          : null;
  // 新品（Apple 公式）との差。公式価格を確かめた機種だけ（lib/applePrices.ts）。容量ごとの最安は上の集計（stats.byStorage）をそのまま使う
  // 新品（公式）との差。iPhone は Apple 公式、Pixel・Galaxy は Google ストア・Samsung 公式（lib/officialPrices.ts）
  const newRows = !hasStock ? [] : isIphone ? newVsUsed(model, stats.byStorage) : newVsUsedOfficial(model, stats.byStorage);
  const newSource = isIphone
    ? (() => { const u = applePriceSource(model); return u ? { name: "Apple 公式", url: u } : null; })()
    : officialPriceSource(model);
  const newCheckedJa = isIphone ? appleCheckedJa() : officialCheckedJa();
  const faqs = hasStock && stats.minPrice !== null
    ? buildFaq({
        model, isIphone, isMac: mac, isWatch: watch, minPrice: stats.minPrice, medianPrice: stats.medianPrice, medianStorage: stats.medianStorage,
        cheapestNote: cheapestDevice ? describeDevice(cheapestDevice) : null,
        goodMin, count: stats.count, shopCount: stats.shopCount, updatedText, byShop: stats.byShop, supportAnswer, newVsUsed: newRows, newSourceName: newSource?.name, newCheckedJa,
        battery85: isIphone ? (() => { const b = batteryRows.find((r) => r.key === "85"); return b ? { minPrice: b.minPrice, count: b.count } : null; })() : null,
        byRank: isIphone ? stats.byRank : undefined,
        ios27: isIphone ? ALL_CATALOG_MODELS.includes(model) : undefined,
      })
    : [];

  // ページ冒頭の1文（日付は更新時刻と同じ stats.lastUpdated の日付。なければ今日（JST））
  const summaryDate = (stats.lastUpdated ?? new Date()).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const minStorageRow = [...stats.byStorage].filter((r) => r.count > 0).sort((a, b) => a.minPrice - b.minPrice)[0];
  const summary = hasStock && stats.minPrice !== null
    ? buildSummary({
        model, dateText: summaryDate, minPrice: stats.minPrice, minStorage: minStorageRow && stats.byStorage.length > 1 ? storageLabel(minStorageRow.key, model) : null,
        medianPrice: stats.medianPrice, medianStorage: stats.medianStorage, shopCount: stats.shopCount, count: stats.count, newVsUsed: newRows, newSourceName: newSource?.name,
      })
    : null;

  // 「今買うのはあり？」「中古相場の推移」「同じ予算の他機種」「データの出典」（2026-10-23〜。lib/modelGuide.ts・components/ModelGuide.tsx）
  const medianSeries = seriesFor(history, stats.medianStorage);
  const trend = trendOf(medianSeries);
  const mLabel = medianLabel(stats.medianStorage, model);
  // 最新 OS への対応（確かめた情報がある種類だけ。なければ結論に入れない）
  const supported: boolean | undefined = isIphone ? ALL_CATALOG_MODELS.includes(model)
    : isIpad(model) ? IPADOS27_MODELS.has(model)
    : watch ? isWatchOS27(model)
    : pixel && pixelLeft !== undefined ? pixelLeft > 0
    : undefined;
  const osName = isIphone ? "iOS 27" : isIpad(model) ? "iPadOS 27" : watch ? "watchOS 27" : pixel ? "Google のアップデート保証" : undefined;
  const newMin = newRows[0];
  const verdict = hasStock ? buyVerdict({ model, trend, supported, osName, newDiff: newMin ? newMin.diff : null }) : [];
  const same = hasStock && stats.medianPrice !== null ? await sameBudgetModels(model, stats.medianPrice) : [];
  const guideSources: SourceItem[] = [
    { label: "在庫", text: `大手中古ショップ${shopNum}店の販売中の在庫${hasStock ? `（いま${stats.shopCount}店・${stats.count.toLocaleString()}件${updatedText ? `・${updatedText}時点` : ""}）` : ""}。1日4回取得` },
    { label: "相場", text: "在庫がいちばん多い容量の中央値（真ん中の値段）。最安値にはジャンク品を含むことがあります" },
    { label: "推移", text: "相場と最安値を毎日記録（Amazon 整備済み品は含めない）" },
    ...(newSource && newRows.length > 0 ? [{ label: "新品価格", text: `${newSource.name}（税込・${newCheckedJa}確認）`, href: newSource.url }] : []),
    ...(spec ? [{ label: "スペック", text: specSourceName(spec, model), href: specUrl(spec) }] : []),
  ];

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
    // ページの更新日と要約（AI の検索が引用するときに日付と数字をそのまま取れるように。10/23〜）
    ...(summary
      ? [{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `${model} 中古の相場・最安値`,
          url: `${SITE_URL}${path}`,
          description: summary,
          ...(stats.lastUpdated ? { dateModified: stats.lastUpdated.toISOString() } : {}),
        }]
      : []),
    ...(faqs.length > 0
      ? [{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }]
      : []),
  ];


  // ---- 要約（スマホは上のカード、PC は右の固定サマリー。同じ部品を2か所に出す） ----
  const hasPrices = hasStock && stats.minPrice !== null && stats.medianPrice !== null;
  const rankMin = new Map(stats.byRank.map((r) => [r.key, r.minPrice]));
  const rankSMin = rankMin.get("S") ?? null;

  // 在庫0件のときの数字（今までの表示）
  const statCells = [
    { label: "最安値", value: stats.minPrice !== null ? yen(stats.minPrice) : "-", accent: true },
    { label: medianLabel(stats.medianStorage, model), value: stats.medianPrice !== null ? yen(stats.medianPrice) : "-" },
    { label: "在庫", value: `${stats.count.toLocaleString()}件`, sub: `${stats.shopCount}店` },
  ];
  const statBlock = (vertical: boolean) => (
    <div className={`grid border border-line rounded-xl bg-white ${vertical ? "grid-cols-1 divide-y divide-line" : "grid-cols-3 divide-x divide-line"}`}>
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

  const listButton = (
    <a href="#list" className="h-12 rounded-xl bg-brand-600 hover:bg-brand-800 text-white flex items-center justify-center gap-1.5 text-sm font-bold">
      安い順に在庫を見る
      <ArrowDown className="w-[18px] h-[18px]" aria-hidden="true" />
    </a>
  );

  const priceBand = hasPrices ? <PriceBand min={stats.minPrice!} median={stats.medianPrice!} rankSMin={rankSMin} rankSMax={rankSMax} /> : null;

  // 安心ライン: 条件に合う在庫がなければ出さない（MacBook・Apple Watch はバッテリーの条件なし）
  const safeLine = (pc: boolean) =>
    goodMin === null ? null : (
      <div className={`bg-[#ECFDF5] border border-[#A7F3D0] flex items-center gap-2.5 ${pc ? "rounded-[10px] px-3 py-2.5" : "rounded-xl px-3.5 py-3"}`}>
        {!pc && <Check className="w-[22px] h-[22px] text-safe shrink-0" aria-hidden="true" />}
        <div className="flex flex-col">
          <span className="text-[11px] text-[#065F46]">{mac || watch ? "ランクB以上なら" : "ランクB以上・バッテリー85%以上なら"}</span>
          <Link href={mac || watch ? searchHref(model, { minRank: "B" }) : searchHref(model, { minRank: "B", minBattery: "85" })} className="text-lg font-bold text-safe hover:underline underline-offset-2">
            {yen(goodMin)}〜
          </Link>
        </div>
      </div>
    );

  const summaryCard = (pc: boolean) => (
    <div className={`bg-white border border-line rounded-xl flex flex-col ${pc ? "p-4 gap-3.5" : "p-3.5 gap-3"}`}>
      {pc && <p className="text-sm font-bold">{model}</p>}
      {pc ? (
        <>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-ink-mute">最安値</span>
            <span className="text-4xl font-bold text-price leading-[1.1]">{stats.minPrice!.toLocaleString()}<span className="text-[15px]">円</span></span>
          </div>
          <div className="flex justify-between">
            <div className="flex flex-col"><span className="text-[11px] text-ink-mute">{medianLabel(stats.medianStorage, model)}</span><span className="text-xl font-bold">{yen(stats.medianPrice!)}</span></div>
            <div className="flex flex-col items-end"><span className="text-[11px] text-ink-mute">在庫</span><span className="text-xl font-bold">{stats.count.toLocaleString()}件 <span className="text-[11px] font-normal text-ink-mute">{stats.shopCount}店</span></span></div>
          </div>
        </>
      ) : (
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col"><span className="text-[11px] text-ink-mute">最安値</span><span className="text-[32px] font-bold text-price leading-[1.1]">{stats.minPrice!.toLocaleString()}<span className="text-sm">円</span></span></div>
          <div className="flex flex-col items-end"><span className="text-[11px] text-ink-mute">{medianLabel(stats.medianStorage, model)}</span><span className="text-xl font-bold leading-[1.1]">{stats.medianPrice!.toLocaleString()}<span className="text-xs">円</span></span></div>
        </div>
      )}
      {priceBand}
      <StatTiles tiles={statTiles} />
      {pc && safeLine(true)}
      {listButton}
    </div>
  );

  // ---- 回線・買取（PR）のタイル。リンク・data-shop-click・rel は今までと同じ。1x1 の計測画像は下で1回だけ出す ----
  const showSim = hasStock && (device === "iphone" || device === "pixel" || device === "galaxy" || device === "xperia" || device === "aquos");
  const showBuyback = hasStock && !mac && !watch;
  const showRepair = hasStock && device === "iphone";
  const PR_BADGE = <span className="text-[10px] font-normal text-ink-mute border border-line rounded px-1 py-px leading-none">PR</span>;
  const prTiles = (extra: string) =>
    showSim || showBuyback ? (
      <div className={`grid gap-2 items-start ${showSim && showBuyback ? "grid-cols-2" : "grid-cols-1"} ${extra}`}>
        {showSim && (
          <div className="bg-white border border-line rounded-xl p-3 flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10px] text-ink-mute">回線も見直す {PR_BADGE}</span>
            {SIM_PLANS.map((p) => (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="sponsored nofollow noopener"
                data-shop-click=""
                data-shop={`${p.name}（回線）`}
                data-model={model}
                data-link-type={p.linkType}
                className="flex flex-col py-1 hover:bg-ground rounded"
              >
                <span className="text-[13px] font-bold text-ink">{p.name} <span className="text-ink-mute" aria-hidden="true">›</span></span>
                <span className="text-[10px] text-ink-mute leading-snug">{p.text}</span>
              </a>
            ))}
            <span className="text-[10px] text-ink-mute leading-snug">料金・対応機種は各社の公式ページで確認してください。</span>
          </div>
        )}
        {showBuyback && (
          <div className="bg-white border border-line rounded-xl p-3 flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[10px] text-ink-mute">今のスマホを売る {PR_BADGE}</span>
            {BUYBACK_PROGRAMS.map((p) => (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="sponsored nofollow noopener"
                data-shop-click=""
                data-shop={`${p.name}（買取）`}
                data-model={model}
                data-link-type="a8"
                className="flex flex-col py-1 hover:bg-ground rounded"
              >
                <span className="text-[13px] font-bold text-ink">{p.name} <span className="text-ink-mute" aria-hidden="true">›</span></span>
                <span className="text-[10px] text-ink-mute leading-snug">{p.text}</span>
              </a>
            ))}
          </div>
        )}
        {showRepair && (
          <div className={`bg-white border border-line rounded-xl p-3 flex flex-col gap-1 ${showSim && showBuyback ? "col-span-2" : ""}`}>
            <span className="flex items-center gap-1.5 text-[10px] text-ink-mute">修理で済ませるなら {PR_BADGE}</span>
            {REPAIR_PROGRAMS.map((p) => (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="sponsored nofollow noopener"
                data-shop-click=""
                data-shop={`${p.name}（修理）`}
                data-model={model}
                data-link-type="a8"
                className="flex flex-col py-1 hover:bg-ground rounded"
              >
                <span className="text-[13px] font-bold text-ink">{p.name} <span className="text-ink-mute" aria-hidden="true">›</span></span>
                <span className="text-[10px] text-ink-mute leading-snug">{p.text}</span>
              </a>
            ))}
            <span className="text-[10px] text-ink-mute leading-snug">修理代は、このページの中古の相場と比べて決めるのがおすすめです。</span>
          </div>
        )}
      </div>
    ) : null;

  // ---- 図のカード ----
  const heatTitle = mac ? "メモリ／SSD × ランクの最安値" : watch ? "サイズ × ランクの最安値" : "容量 × ランクの最安値";
  const showHeat = hasStock && heatRows.length > 0;
  const showShops = hasStock && shopRows.length > 2;
  const showSpark = sparkPoints.length >= 2;

  const priceLists = (
    <>
      {/* MacBook・Apple Watch はバッテリーの表記がない店が多いので、在庫がなければ出さない */}
      {!((mac || watch) && batteryRows.length === 0) && (
        <Accordion title="バッテリー最大容量別の最安値" hint="80〜95%">
          {/* 多くの店で最大容量は値段に反映されていないので、少し足すだけで状態のよい個体が買えることを見せる */}
          <PriceList rows={batteryRows} labelOf={(k) => `${k}%以上`}
            hrefOf={(k) => searchHref(model, { minBattery: k })} baseline={stats.minPrice} note={batteryNote(model)} />
        </Accordion>
      )}
      <Accordion title="状態ランク別の最安値" hint={stats.byRank.map((r) => r.key).join("・")}>
        <PriceList rows={stats.byRank} labelOf={(k) => `ランク ${k}${RANK_HINT[k] ? `（${RANK_HINT[k]}の目安）` : ""}`}
          hrefOf={(k) => searchHref(model, { rank: k })} />
      </Accordion>
    </>
  );

  return (
    <div className="min-h-screen bg-ground text-ink font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader label="価格比較" />

      <main className="max-w-[1360px] mx-auto pb-24 md:pb-10 md:px-4 min-[1392px]:px-0 md:pt-5 md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-6 md:items-start">
        {/* 左の本文。広い PC（1360px〜）は2列のグリッド。md〜1359px は右の欄があって狭いので1列（md:order で、スマホとは並びを変える） */}
        <div className="min-w-0 px-4 md:px-0 pt-3 md:pt-0 grid grid-cols-1 min-[1360px]:grid-cols-2 gap-3.5 md:gap-4 content-start">
          <div className="min-[1360px]:col-span-2 flex flex-col gap-1.5">
            <nav aria-label="パンくずリスト" className="text-[11px] md:text-xs text-ink-mute">
              <Link href="/" className={LINK}>トップ</Link>
              <span className="mx-1.5">›</span>
              <Link href={listPath} className={LINK}>{listName}</Link>
              <span className="mx-1.5">›</span>
              <span>{model}</span>
            </nav>

            <h1 className="text-[22px] md:text-[28px] leading-[1.3] font-bold">{model} 中古の相場・最安値</h1>

            {summary && (
              <p className="text-[13px] md:text-sm text-ink-mute leading-relaxed">
                {summary}
                <Link href="/about#data" className={`${LINK} ml-1 whitespace-nowrap`}>集計の方法</Link>
              </p>
            )}

            <p className="text-[11px] md:text-xs text-ink-mute leading-relaxed">
              {updatedText && stats.lastUpdated && <>更新 <time dateTime={stats.lastUpdated.toISOString()}>{updatedText}</time> ・ </>}
              {shopNum}店を比較{hasStock && <> ・ 在庫あり{stats.shopCount}店・{stats.count.toLocaleString()}件</>} ・ 運営: 中古スマホ店の検品担当 ・{" "}
              <span className="inline-block mr-1 px-1 py-px rounded border border-line font-bold">PR</span>
              本ページはアフィリエイト広告を利用しています
            </p>

            {chipModels.length > 1 && (
              <nav aria-label="同じシリーズの機種" className="flex gap-1.5 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap pt-1">
                {chipModels.map((m) =>
                  m === model ? (
                    <span key={m} aria-current="page" className="shrink-0 h-8 px-3 rounded-full bg-brand-800 text-white text-xs flex items-center">{m}</span>
                  ) : (
                    <Link key={m} href={modelPagePath(m)} className="shrink-0 h-8 px-3 rounded-full bg-white border border-gray-300 text-ink text-xs flex items-center hover:border-brand-600">{m}</Link>
                  ),
                )}
              </nav>
            )}
          </div>

          {/* スマホ: 要約カードと安心ライン。PC は右の固定サマリーに出す */}
          <div className="md:hidden flex flex-col gap-2.5">
            {hasPrices ? summaryCard(false) : statBlock(false)}
            {safeLine(false)}
          </div>

          {!hasStock ? (
            <div className={`${CARD} text-center py-14 px-4 min-[1360px]:col-span-2`}>
              <p className="text-ink-sub text-base">現在、{model}の在庫はありません。</p>
              <p className="text-xs text-ink-mute mt-2">在庫は6時間ごとに更新されます。同じシリーズの他モデルもチェックしてみてください。</p>
            </div>
          ) : (
            <>
              {newRows.length > 0 && newSource && <NewVsUsedSection model={model} rows={newRows} source={newSource} checkedJa={newCheckedJa} />}
              {showHeat && (
                <div className={`md:order-1 ${showShops ? "" : "min-[1360px]:col-span-2"}`}>
                  <HeatCells title={heatTitle} ranks={heatRanks} rows={heatRows} labelWidth={mac ? 88 : 52} />
                </div>
              )}
              {showShops && (
                <div className={`md:order-2 ${showHeat ? "" : "min-[1360px]:col-span-2"}`}>
                  <ShopBars rows={shopRows} hrefOf={(shopName) => searchHref(model, { shop: shopName })} />
                </div>
              )}
              <div className={`md:order-3 ${showSpark ? "" : "min-[1360px]:col-span-2"}`}>
                <StackedBar breakdown={breakdown} rankMin={rankMin} rankHref={(r) => searchHref(model, { rank: r })} />
              </div>

              <section id="list" className="md:order-5 min-[1360px]:col-span-2 flex flex-col gap-2 scroll-mt-16">
                <h2 className="text-[17px] font-bold">安い在庫</h2>
                <div className="flex gap-1.5 overflow-x-auto">
                  {[
                    { label: "すべて", href: searchHref(model), current: true },
                    // MacBook・Apple Watch はバッテリーを書かない店が多い（イオシス・ソフマップ・ゲオ）ので、代わりにランクB以上
                    mac || watch
                      ? { label: "ランクB以上", href: searchHref(model, { minRank: "B" }) }
                      : { label: "バッテリー85%以上", href: searchHref(model, { minBattery: "85" }) },
                    { label: "ランクA以上", href: searchHref(model, { minRank: "A" }) },
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

              {hasStock && (
                <div className="md:order-5 min-[1360px]:col-span-2">
                  <ModelGuide model={model} verdict={verdict} notes={buyNowNotes} trendText={trend ? trendSentence(trend, mLabel) : null} medianLabel={mLabel}
                    daily={dailyRows(medianSeries)} monthly={monthlyRows(medianSeries)} same={same} sources={guideSources} factorsHref={isIphone ? "/iphone/price-factors" : undefined} />
                </div>
              )}

              {/* 最安値の推移（30日）。容量別・長い期間のグラフ（クライアント部品）は折りたたみの中 */}
              <div className="md:order-4 flex flex-col gap-2">
                {showSpark ? (
                  <>
                    <Sparkline points={sparkPoints} />
                    <details className="group bg-white border border-line rounded-xl">
                      <summary className="min-h-11 flex items-center justify-between gap-3 px-3.5 text-[13px] cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-ground rounded-xl">
                        <span className="font-bold">容量別・長い期間のグラフ</span>
                        <ChevronDown className="w-4 h-4 text-ink-mute transition-transform group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <div className="px-3.5 pb-3.5"><PriceHistoryChart history={history} model={model} /></div>
                    </details>
                  </>
                ) : (
                  <section className={`${CARD} p-3.5 flex flex-col gap-2`}>
                    <h2 className="text-[15px] font-bold">最安値の推移</h2>
                    <PriceHistoryChart history={history} model={model} />
                  </section>
                )}
              </div>

              {/* 折りたたみ。スマホは1枚のカード、PC は2列 */}
              <div className="md:order-6 min-[1360px]:col-span-2 bg-white border border-line rounded-xl overflow-hidden md:bg-transparent md:border-0 md:rounded-none md:overflow-visible md:grid min-[1360px]:grid-cols-2 md:gap-4 md:items-start">
                <div className="md:bg-white md:border md:border-line md:rounded-xl md:overflow-hidden">
                  {/* 運営者（検品担当）の視点。iPhone のみ */}
                  {isIphone && tips.length > 0 && (
                    <Accordion title="検品担当が見るポイント" badge={tips.length}>
                      <InspectionTips model={model} has64GB={has64GB} embedded />
                    </Accordion>
                  )}
                  <Accordion title="店ごとの保証" hint={`${stats.byShop.length}店`}>
                    <div>
                      {stats.byShop.map((r) => {
                        const s = findShop(r.key);
                        return (
                          <div key={r.key} className="py-2.5 border-t border-line-soft first:border-t-0">
                            <Link href={searchHref(model, { shop: r.key })} className="flex items-center justify-between gap-2 hover:bg-ground">
                              <span className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-[13px] font-bold">{r.key}</span>
                                {s && (mac || watch
                                  ? <span className="text-[11px] text-safe">{s.warrantyShort}</span>
                                  : <span className="text-[11px] text-safe">{s.warrantyShort}・{s.redRomShort}</span>)}
                              </span>
                              <span className="text-[15px] font-bold text-price whitespace-nowrap">{yen(r.minPrice)}</span>
                            </Link>
                            {s && (mac || watch
                              ? <p className="mt-1 text-[11px] text-ink-mute leading-snug">保証は商品ごとに違います。詳しくは<a href={s.guaranteeUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">{s.label}の公式ページ</a>で確認してください。</p>
                              : <p className="mt-1 text-[11px] text-ink-mute leading-snug">保証: {s.warranty}／赤ロム: {s.redRom}</p>)}
                          </div>
                        );
                      })}
                      <p className="pt-2 border-t border-line-soft text-[11px] text-ink-mute leading-relaxed">
                        保証は各店の公式ページで確認した内容です（詳しくは
                        <Link href="/about" className={`${LINK} underline underline-offset-2`}>「このサイトについて」</Link>）。
                      </p>
                    </div>
                  </Accordion>
                  {priceLists}
                </div>
                <div className="border-t border-line-soft md:border-t-0 md:bg-white md:border md:border-line md:rounded-xl md:overflow-hidden">
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
                {/* MacBook の基本スペック（Apple 公式で確かめた値だけ。lib/macCatalog.ts の MAC_INFO） */}
                {macInfo && (
                  <Accordion title={`${model}の基本スペック`} hint={`${macInfo.year}年発売`}>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                      <dt className="text-ink-mute font-bold">発売</dt>
                      <dd>{macInfo.year}年</dd>
                      <dt className="text-ink-mute font-bold">チップ</dt>
                      <dd>{macInfo.chip}</dd>
                      <dt className="text-ink-mute font-bold">画面サイズ</dt>
                      <dd>{macInfo.inch}インチ</dd>
                      <dt className="text-ink-mute font-bold">対応 OS</dt>
                      <dd>macOS 27 Golden Gate に対応</dd>
                      <dt className="text-ink-mute font-bold">Apple の識別名</dt>
                      <dd>{macInfo.appleName}</dd>
                    </dl>
                    <p className="mt-3 text-[11px] text-ink-mute leading-relaxed">
                      出典: Apple{" "}
                      {macInfo.family === "Neo"
                        ? <a href="https://www.apple.com/jp/macbook-neo/specs/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">MacBook Neo の技術仕様</a>
                        : macInfo.family === "Air"
                          ? <a href="https://support.apple.com/ja-jp/102869" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">サポート（MacBook Air の識別）</a>
                          : <a href="https://support.apple.com/ja-jp/108052" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">サポート（MacBook Pro の識別）</a>}
                      ・<a href="https://www.apple.com/jp/os/macos/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">macOS の対応機種</a>
                      {/^M[12] (Pro|Max)$/.test(macInfo.chip) && "。チップは機種名どおりで、Apple の識別ページの本文には記載がありません"}
                    </p>
                  </Accordion>
                )}
                {/* Apple Watch の基本情報（Apple 公式で確かめた値だけ。発売年は公式のページにないので載せない。lib/watchCatalog.ts の WATCH_INFO） */}
                {watchInfo && (
                  <Accordion title={`${model}の基本情報`} hint={isWatchOS27(model) ? "watchOS 27 対応" : "watchOS 27 非対応"}>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                      <dt className="text-ink-mute font-bold">ケースのサイズ</dt>
                      <dd>{watchInfo.sizes.map((s) => `${s}mm`).join("・")}</dd>
                      <dt className="text-ink-mute font-bold">通信方式</dt>
                      <dd>{watchInfo.cellularOnly ? "GPS+Cellular（Cellular モデルのみ）" : "GPS／GPS+Cellular"}</dd>
                      <dt className="text-ink-mute font-bold">対応 OS</dt>
                      <dd>{isWatchOS27(model) ? "watchOS 27 に対応" : "watchOS 27 には対応していません"}</dd>
                      {isWatchOS27(model) && (
                        <>
                          <dt className="text-ink-mute font-bold">必要な iPhone</dt>
                          <dd>{WATCHOS27_IPHONE}</dd>
                        </>
                      )}
                    </dl>
                    <p className="mt-3 text-[11px] text-ink-mute leading-relaxed">
                      出典: Apple <a href="https://support.apple.com/ja-jp/108056" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">サポート（Apple Watch を識別する）</a>
                      ・<a href="https://www.apple.com/jp/watchos/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">watchOS の対応機種</a>。
                      バンドの有無は載せていません（商品ごとに違います）。
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
                {/* Xperia・AQUOS の型番とアップデート（メーカーの公式資料の値。未確認の項目は出さない。lib/androidInfo.ts） */}
                {androidInfo && (androidCodes.length > 0 || androidUpdates.length > 0) && (
                  <Accordion title={`${model}の型番とアップデート`} hint={androidUpdates.find((r) => r.label === "セキュリティ更新")?.value}>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                      {androidUpdates.map((r) => (
                        <div key={r.label} className="contents">
                          <dt className="text-ink-mute font-bold">{r.label}</dt>
                          <dd>{r.value}</dd>
                        </div>
                      ))}
                      {androidCodes.map((r) => (
                        <div key={r.label} className="contents">
                          <dt className="text-ink-mute font-bold">型番（{r.label}）</dt>
                          <dd>{r.value}</dd>
                        </div>
                      ))}
                    </dl>
                    {releasedSentence(model) && <p className="mt-3 text-[13px] leading-[1.7] text-gray-700">{releasedSentence(model)}</p>}
                    <p className="mt-3 text-[11px] text-ink-mute leading-relaxed">
                      出典: {updateSource(model).map((src, i) => (
                        <span key={src.url}>{i > 0 && "・"}<a href={src.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-600">{src.name}</a></span>
                      ))}。
                      {androidUpdates.some((r) => r.label === "セキュリティ更新") && "セキュリティ更新の終わりはメーカーの法人向け資料の値です。"}
                      {androidUpdates.length === 0 && "OS・セキュリティ更新の期間は、公式の記載を確かめられていないので載せていません。"}
                    </p>
                  </Accordion>
                )}
                {/* Galaxy の発売時期（lib/galaxyCatalog.ts。紹介文を外したので折りたたみの中に残す） */}
                {deviceOf(model) === "galaxy" && GALAXY_RELEASED[model] && (
                  <Accordion title={`${model}の基本情報`} hint={jaMonth(GALAXY_RELEASED[model])}>
                    <p className="text-[13px] leading-[1.7] text-gray-700">日本では{jaMonth(GALAXY_RELEASED[model])}に発売されました。</p>
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
                  {faqs.length > 0 && (
                    <Accordion title="よくある質問" hint={`${faqs.length}件`}>
                      <div className="flex flex-col gap-3">
                        {faqs.map((f) => (
                          <div key={f.q} className="flex flex-col gap-1">
                            <h3 className="text-[13px] font-bold">{f.q}</h3>
                            <p className="text-[13px] leading-[1.7] text-gray-700">{f.a}</p>
                          </div>
                        ))}
                      </div>
                    </Accordion>
                  )}
                </div>
              </div>

              {/* 修理か買い替えか（iPhone・Apple 公式の料金を確かめた機種だけ。広告ではない）／iPad の選ぶときの目安 */}
              {isIphone && (
                <div className="md:order-6 min-[1360px]:col-span-2 empty:hidden">
                  <RepairOrReplace model={model} minPrice={stats.minPrice} medianPrice={stats.medianPrice} medianStorage={stats.medianStorage} />
                </div>
              )}
              {device === "ipad" && (
                <div className="md:order-6 min-[1360px]:col-span-2">
                  <IpadGuide model={model} byStorage={stats.byStorage} />
                </div>
              )}

              {/* スマホ: 回線・買取のタイル。PC は右の固定サマリーの下に出す */}
              {prTiles("md:hidden")}
            </>
          )}

          {/* 関連モデル・比較・予算別への導線 */}
          <div className="min-[1360px]:col-span-2 md:order-7 flex flex-col gap-4">
            {/* このモデルを含む比較 */}
            {comparesFor(model).length > 0 && (
              <section>
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
            <section>
              <h2 className="text-[15px] font-bold mb-2">関連モデルの中古価格</h2>
              <div className="flex flex-wrap gap-1.5">
                {[...siblings, ...neighborSeries.flatMap((s) => s.models)].map((m) => (
                  <Link key={m} href={modelPagePath(m)}
                    className="h-9 px-3.5 rounded-full text-[13px] bg-white border border-gray-300 text-ink flex items-center hover:border-brand-600">
                    {m}
                  </Link>
                ))}
              </div>
              {/* この機種が買える予算（予算別ページへの導線。lib/budgetStats.ts の smallestBudgetFor） */}
              {budget && budgetDevice && (
                <p className="mt-2.5 text-[13px] text-ink-sub leading-[1.7]">
                  {model}はジャンク品を除いて{yen(budget.minPrice)}から買えます。同じ予算のほかの機種は{" "}
                  <Link href={budgetPath(budget.max, budgetDevice)} className={`font-bold ${LINK} hover:underline underline-offset-2`}>
                    {budgetLabel(budget.max)}以下で買える{BUDGET_NAMES[budgetDevice]}
                  </Link>
                  で比べられます。
                </p>
              )}
            </section>
          </div>

          {/* 回線・買取・修理の A8 インプレッション計測用の 1x1 画像（ページに1回だけ） */}
          <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
            {showSim && SIM_PLANS.flatMap((p) =>
              p.imgSrc ? [
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${p.name}-imp`} src={p.imgSrc} width={1} height={1} alt="" />,
              ] : [],
            )}
            {showBuyback && BUYBACK_PROGRAMS.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.name} src={p.imgSrc} width={1} height={1} alt="" />
            ))}
            {showRepair && REPAIR_PROGRAMS.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.name} src={p.imgSrc} width={1} height={1} alt="" />
            ))}
          </div>
        </div>

        {/* PC: 右の固定サマリー */}
        <aside className="hidden md:flex flex-col gap-3 sticky top-[68px]" aria-label={`${model}のサマリー`}>
          {hasPrices ? (
            summaryCard(true)
          ) : (
            <div className="bg-white border border-line rounded-xl p-4 flex flex-col gap-3">
              <p className="text-sm font-bold">{model}</p>
              {statBlock(true)}
            </div>
          )}
          {prTiles("")}
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
