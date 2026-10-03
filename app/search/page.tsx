import { Suspense } from "react";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import SearchClient from "@/app/components/SearchClient";
import { SHOPS } from "@/lib/shops";

/**
 * 検索ページ（静的書き出し版）。中身は SearchClient がブラウザで在庫 JSON を読んで組み立てる。
 * 結果は HTML に入らないので登録はさせず（noindex）、流入は機種ページ・予算別ページで取る。
 * /search?… は robots.txt でクロールも止めている
 */
export const metadata: Metadata = {
  title: "中古スマホの在庫検索",
  description: `大手中古ショップ${SHOPS.length}社の中古iPhone・iPad・Google Pixel・Galaxyの在庫を、価格・状態ランク・容量・バッテリー残量で絞り込めます。`,
  alternates: { canonical: "/search" },
  // openGraph を上書きするとトップの共通 OGP 画像が引き継がれないので明示する
  openGraph: { title: "中古スマホの在庫検索 | 中古スマホ一括検索", url: "/search", images: ["/opengraph-image"] },
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <SiteHeader label="在庫検索" />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* useSearchParams を使うクライアント部品は Suspense で包む（静的書き出しの決まり） */}
        <Suspense>
          <SearchClient />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
