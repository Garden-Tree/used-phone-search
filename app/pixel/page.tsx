import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import GoodPicks from "@/app/components/GoodPicks";
import { getModelMarket } from "@/lib/marketStats";
import { hubSummary, hubWebPage, hubTitle } from "@/lib/hubSummary";
import { modelPagePath } from "@/lib/catalog";
import { COMPARE_PAIRS, comparePath } from "@/lib/compare";
import { PIXEL_CATALOG, PIXEL_INFO, PIXEL_MODELS, isPixel, jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { PIXEL_SPECS } from "@/lib/pixelSpecs";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { medianLabel, yen } from "@/lib/format";
import { PIXEL_SHOPS, shopLabels, type Shop } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import { PIXEL_BUDGETS, budgetLabel, budgetPath } from "@/lib/budgets";
import { PIXEL_PICKS, pickPath } from "@/lib/picks";

// Google Pixel の機種一覧（2026-09-30〜）。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

const TITLE = "中古Google Pixelの相場・最安値を機種別に比較【毎日更新】";
// 店の数・店名は、いま在庫がある店だけ（lib/activeShops.ts）
const describe = (shops: Shop[]) =>
  `中古Google Pixel（Pixel 6〜11・a シリーズ・Fold）の相場（中央値）・最安値・在庫数とアップデート保証の期限を機種別に比較。${shopLabels(shops.slice(0, 3))}など${shops.length}店の在庫から毎日更新。`;

export async function generateMetadata(): Promise<Metadata> {
  // タイトルの頭に、いちばん安い値段と機種（10/28〜・lib/hubSummary.ts の hubTitle）
  const title = hubTitle("Pixel", PIXEL_MODELS, await getModelMarket([...PIXEL_MODELS]), TITLE);
  const description = describe(await activeShops(PIXEL_SHOPS));
  return {
    title,
    description,
    alternates: { canonical: "/pixel" },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: "/pixel" },
  };
}

export default async function PixelIndexPage() {
  const shops = await activeShops(PIXEL_SHOPS);
  // 相場（中央値）・最安値・件数。/iphone・/ipad・機種ページと同じ集計
  const stats = await getModelMarket(PIXEL_MODELS);
  const total = [...stats.values()].reduce((n, r) => n + r.count, 0);
  // 「ランクB以上・電池85%以上で選ぶなら」の候補: アップデート保証が残っている機種を在庫の多い順に（10/31〜）
  const nowYm = new Date().toISOString().slice(0, 7);
  const pickModels = PIXEL_MODELS.filter((m) => (updateYearsLeft(m, nowYm) ?? 0) > 0)
    .sort((a, b) => (stats.get(b)?.count ?? 0) - (stats.get(a)?.count ?? 0));

  // 冒頭の1文（/iphone と同じ形。AI の概要・「Pixel 中古 相場」の検索向け。10/28〜）
  const summary = hubSummary("Pixel", PIXEL_MODELS, stats, shops.length);

  const jsonLd = [{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "中古Google Pixelの相場一覧", item: `${SITE_URL}/pixel` },
    ],
  }, ...hubWebPage("中古Google Pixelの相場一覧", "/pixel", summary)];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="Google Pixel" />

      <main className="max-w-[1360px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">中古Google Pixel</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">中古Google Pixelの相場・最安値</h1>
        <p className="text-ink-sub mb-4 leading-relaxed">
          {shopLabels(shops)}の中古Pixel <strong>{total.toLocaleString()}件</strong>
          を機種別にまとめています。機種名から容量別・状態別の最安値へ。
        </p>
        {summary && <p className="text-[13px] text-ink-mute mb-3 leading-relaxed">{summary}</p>}
        <p className="text-sm text-ink-mute mb-4 leading-relaxed">
          Pixel は機種ごとに Google のアップデート保証の期限が決まっています（Pixel 8 以降は販売開始から7年、Pixel 6〜7 シリーズ・Pixel Fold は5年）。
          中古で買うときは、値段と一緒に「あと何年使えるか」も見てください。
        </p>
        <AdDisclosure compact />

        {/* 目的・予算から探す（/pick/pixel-…・/pixel/budget/…） */}
        <section className="my-6">
          <h2 className="text-lg font-bold mb-3">目的から探す</h2>
          <div className="flex flex-wrap gap-2">
            {PIXEL_PICKS.map((p) => (
              <Link key={p.slug} href={pickPath(p.slug)}
                className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                {p.title}
              </Link>
            ))}
          </div>
          <h2 className="text-lg font-bold mt-5 mb-3">予算から探す</h2>
          <div className="flex flex-wrap gap-2">
            {PIXEL_BUDGETS.map((max) => (
              <Link key={max} href={budgetPath(max, "pixel")}
                className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                {budgetLabel(max)}以下
              </Link>
            ))}
          </div>
        </section>

        <p className="my-4">
          <Link href="/pixel/how-long" className="font-bold text-brand-600 hover:underline underline-offset-4">中古Pixelはいつまで使える？アップデート保証の期限を機種別に &rarr;</Link>
        </p>

        {/* Pixel の比較ページ */}
        <section className="my-6">
          <h2 className="text-lg font-bold mb-3">よく比較される Pixel</h2>
          <div className="flex flex-wrap gap-2">
            {COMPARE_PAIRS.filter(([a]) => isPixel(a)).map(([a, b]) => (
              <Link key={comparePath(a, b)} href={comparePath(a, b)}
                className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                {a} <span className="text-ink-mute font-medium">vs</span> {b}
              </Link>
            ))}
          </div>
        </section>

        <GoodPicks models={pickModels} placement="good_pick_list" />

        {PIXEL_CATALOG.map((series) => (
          <section key={series.series} className="my-8">
            <h2 className="text-xl font-bold mb-3">{series.series}</h2>
            <div className="bg-white rounded-xl border border-line overflow-hidden">
              {series.models.map((model, i) => {
                const s = stats.get(model);
                const info = PIXEL_INFO[model];
                const until = updateUntil(model);
                return (
                  <Link
                    key={model}
                    href={modelPagePath(model)}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-3 hover:bg-ground items-center ${i > 0 ? "border-t border-line-soft" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-bold text-ink">{model} <span className="text-gray-300">›</span></span>
                      {info && until && (
                        <span className="block text-[11px] text-ink-mute">{`${jaMonth(info.available)}発売・${PIXEL_SPECS[model]?.chip.replace("Google ", "") ?? ""}・保証 ${jaMonth(until)}まで`.replace("・・", "・")}</span>
                      )}
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
          発売＝米国 Google ストアで販売が始まった年月。保証の期限はその年月に保証の年数を足したものです。
          出典: Google「<a href="https://support.google.com/pixelphone/answer/4457705" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">Pixel のアップデート保証期間</a>」
          「<a href="https://support.google.com/pixelphone/answer/15738422" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">デバイスが利用可能になった時期</a>」
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
