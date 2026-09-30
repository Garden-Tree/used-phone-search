import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { getModelMarket } from "@/lib/marketStats";
import { modelPagePath } from "@/lib/catalog";
import { COMPARE_PAIRS, comparePath } from "@/lib/compare";
import { PIXEL_CATALOG, PIXEL_INFO, PIXEL_MODELS, isPixel, jaMonth, updateUntil } from "@/lib/pixelCatalog";
import { SITE_NAME } from "@/lib/site";
import { yen } from "@/lib/format";
import { PIXEL_SHOPS, shopLabels } from "@/lib/shops";
import { PIXEL_BUDGETS, budgetLabel, budgetPath } from "@/lib/budgets";
import { PIXEL_PICKS, pickPath } from "@/lib/picks";

// Google Pixel の機種一覧（2026-09-30〜）。在庫は1時間ごとに更新
export const revalidate = 3600;

const TITLE = "中古Google Pixelの相場・最安値を機種別に比較【毎日更新】";
const DESCRIPTION =
  `中古Google Pixel（Pixel 6〜11・a シリーズ・Fold）の相場（中央値）・最安値・在庫数とアップデート保証の期限を機種別に比較。${shopLabels(PIXEL_SHOPS)}の在庫から毎日更新。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pixel" },
  openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: "/pixel" },
};

export default async function PixelIndexPage() {
  // 相場（中央値）・最安値・件数。/iphone・/ipad・機種ページと同じ集計
  const stats = await getModelMarket(PIXEL_MODELS);
  const total = [...stats.values()].reduce((n, r) => n + r.count, 0);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <SiteHeader label="Google Pixel" />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-slate-400 mb-4">
          <Link href="/" className="hover:text-blue-600">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-600">中古Google Pixel</span>
        </nav>

        <h1 className="text-2xl md:text-4xl font-extrabold mb-3">中古Google Pixelの相場・最安値</h1>
        <p className="text-slate-600 mb-4 leading-relaxed">
          {shopLabels(PIXEL_SHOPS)}の中古Pixel <strong>{total.toLocaleString()}件</strong>
          を機種別にまとめています。機種名から容量別・状態別の最安値へ。
        </p>
        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
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
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors">
                {p.title}
              </Link>
            ))}
          </div>
          <h2 className="text-lg font-bold mt-5 mb-3">予算から探す</h2>
          <div className="flex flex-wrap gap-2">
            {PIXEL_BUDGETS.map((max) => (
              <Link key={max} href={budgetPath(max, "pixel")}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors">
                {budgetLabel(max)}以下
              </Link>
            ))}
          </div>
        </section>

        {/* Pixel の比較ページ */}
        <section className="my-6">
          <h2 className="text-lg font-bold mb-3">よく比較される Pixel</h2>
          <div className="flex flex-wrap gap-2">
            {COMPARE_PAIRS.filter(([a]) => isPixel(a)).map(([a, b]) => (
              <Link key={comparePath(a, b)} href={comparePath(a, b)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors">
                {a} <span className="text-slate-400 font-medium">vs</span> {b}
              </Link>
            ))}
          </div>
        </section>

        {PIXEL_CATALOG.map((series) => (
          <section key={series.series} className="my-8">
            <h2 className="text-xl font-bold mb-3">{series.series}</h2>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              {series.models.map((model, i) => {
                const s = stats.get(model);
                const info = PIXEL_INFO[model];
                const until = updateUntil(model);
                return (
                  <Link
                    key={model}
                    href={modelPagePath(model)}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-3 hover:bg-blue-50 transition-colors items-center ${i > 0 ? "border-t border-slate-100" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-800">{model} <span className="text-slate-300">›</span></span>
                      {info && until && (
                        <span className="block text-[11px] text-slate-400">{`${jaMonth(info.available)}発売・保証 ${jaMonth(until)}まで`}</span>
                      )}
                    </span>
                    <span className="text-right">
                      {s && <><span className="block text-[10px] text-slate-400">相場</span><span className="font-black text-slate-800">{yen(s.medianPrice)}</span></>}
                    </span>
                    <span className="text-right">
                      {s ? <><span className="block text-[10px] text-slate-400">最安値</span><span className="font-black text-red-600">{yen(s.minPrice)}</span></> : <span className="text-slate-300 font-normal text-sm">在庫なし</span>}
                    </span>
                    <span className="text-right w-16 text-sm text-slate-500">{(s?.count ?? 0).toLocaleString()}件</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <p className="text-xs text-slate-400 leading-relaxed">
          発売＝米国 Google ストアで販売が始まった年月。保証の期限はその年月に保証の年数を足したものです。
          出典: Google「<a href="https://support.google.com/pixelphone/answer/4457705" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Pixel のアップデート保証期間</a>」
          「<a href="https://support.google.com/pixelphone/answer/15738422" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">デバイスが利用可能になった時期</a>」
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
