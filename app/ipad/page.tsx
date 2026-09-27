import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import prisma from "@/lib/prisma";
import { isIpad, modelPagePath } from "@/lib/catalog";
import { COMPARE_PAIRS, comparePath } from "@/lib/compare";
import { IPAD_CATALOG, IPAD_MODELS } from "@/lib/ipadCatalog";
import { SITE_NAME } from "@/lib/site";
import { yen } from "@/lib/format";

// iPad の機種一覧。在庫は1時間ごとに更新
export const revalidate = 3600;

const TITLE = "中古iPadの相場・最安値を機種別に比較【毎日更新】";
const DESCRIPTION =
  "中古iPad（iPad・iPad mini・iPad Air・iPad Pro）の最安値と在庫数を機種別に比較。イオシス・にこスマ・ゲオモバイル・じゃんぱら・ソフマップの在庫から毎日更新。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ipad" },
  openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: "/ipad", images: ["/opengraph-image"] },
};


export default async function IpadIndexPage() {
  // iPad のモデル名は取り込み時に正式名へそろえているので、そのまま GROUP BY で集計できる
  const groups = await prisma.deviceInventory.groupBy({
    by: ["modelName"],
    where: { isSoldOut: false, modelName: { in: IPAD_MODELS } },
    _min: { price: true },
    _count: { _all: true },
  });
  const stats = new Map(groups.map((g) => [g.modelName, { min: g._min.price, count: g._count._all }]));
  const total = groups.reduce((n, g) => n + g._count._all, 0);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <SiteHeader label="iPad" />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-slate-400 mb-4">
          <Link href="/" className="hover:text-blue-600">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-600">中古iPad</span>
        </nav>

        <h1 className="text-2xl md:text-4xl font-extrabold mb-3">中古iPadの相場・最安値</h1>
        <p className="text-slate-600 mb-4 leading-relaxed">
          イオシス・にこスマ・ゲオモバイル・じゃんぱら・ソフマップの中古iPad <strong>{total.toLocaleString()}件</strong>
          を機種別にまとめています。機種名から容量別・状態別の最安値へ。
        </p>
        <AdDisclosure compact />

        {/* iPad の比較ページ */}
        <section className="my-6">
          <h2 className="text-lg font-bold mb-3">よく比較される iPad</h2>
          <div className="flex flex-wrap gap-2">
            {COMPARE_PAIRS.filter(([a]) => isIpad(a)).map(([a, b]) => (
              <Link key={comparePath(a, b)} href={comparePath(a, b)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors">
                {a} <span className="text-slate-400 font-medium">vs</span> {b}
              </Link>
            ))}
          </div>
        </section>

        {IPAD_CATALOG.map((series) => (
          <section key={series.series} className="my-8">
            <h2 className="text-xl font-bold mb-3">{series.series}</h2>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              {series.models.map((model, i) => {
                const s = stats.get(model);
                return (
                  <Link
                    key={model}
                    href={modelPagePath(model)}
                    className={`grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-3 hover:bg-blue-50 transition-colors items-center ${i > 0 ? "border-t border-slate-100" : ""}`}
                  >
                    <span className="font-bold text-slate-800">{model} <span className="text-slate-300">›</span></span>
                    <span className="text-right font-black text-red-600">{s?.min ? yen(s.min) : <span className="text-slate-300 font-normal text-sm">在庫なし</span>}</span>
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
