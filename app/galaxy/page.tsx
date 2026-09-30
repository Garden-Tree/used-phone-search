import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { getModelMarket } from "@/lib/marketStats";
import { modelPagePath } from "@/lib/catalog";
import { GALAXY_CATALOG, GALAXY_MODELS } from "@/lib/galaxyCatalog";
import { SITE_NAME } from "@/lib/site";
import { yen } from "@/lib/format";
import { GALAXY_SHOPS, shopLabels } from "@/lib/shops";

// Samsung Galaxy の機種一覧（2026-09-30〜）。在庫は1時間ごとに更新
export const revalidate = 3600;

const TITLE = "中古Galaxyの相場・最安値を機種別に比較【毎日更新】";
const DESCRIPTION =
  `中古Galaxy（Galaxy S・Z Fold・Z Flip・A シリーズ）の相場（中央値）・最安値・在庫数を機種別に比較。${shopLabels(GALAXY_SHOPS)}の在庫から毎日更新。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/galaxy" },
  openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: "/galaxy" },
};

export default async function GalaxyIndexPage() {
  // 相場（中央値）・最安値・件数。/iphone・/ipad・/pixel・機種ページと同じ集計
  const stats = await getModelMarket(GALAXY_MODELS);
  const total = [...stats.values()].reduce((n, r) => n + r.count, 0);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <SiteHeader label="Galaxy" />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-slate-400 mb-4">
          <Link href="/" className="hover:text-blue-600">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-600">中古Galaxy</span>
        </nav>

        <h1 className="text-2xl md:text-4xl font-extrabold mb-3">中古Galaxyの相場・最安値</h1>
        <p className="text-slate-600 mb-4 leading-relaxed">
          {shopLabels(GALAXY_SHOPS)}の中古Galaxy <strong>{total.toLocaleString()}件</strong>
          を機種別にまとめています（2022年以降の機種）。機種名から容量別・状態別の最安値へ。
        </p>
        <AdDisclosure compact />

        {GALAXY_CATALOG.map((series) => (
          <section key={series.series} className="my-8">
            <h2 className="text-xl font-bold mb-3">{series.series}</h2>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              {series.models.map((model, i) => {
                const s = stats.get(model);
                return (
                  <Link
                    key={model}
                    href={modelPagePath(model)}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-3 hover:bg-blue-50 transition-colors items-center ${i > 0 ? "border-t border-slate-100" : ""}`}
                  >
                    <span className="font-bold text-slate-800">{model} <span className="text-slate-300">›</span></span>
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
      </main>

      <SiteFooter />
    </div>
  );
}
