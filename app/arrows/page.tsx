import type { Metadata } from "next";
import { getModelMarket } from "@/lib/marketStats";
import { hubTitle } from "@/lib/hubSummary";
import AndroidIndexView, { ANDROID_HUB, androidDescribe } from "@/app/components/AndroidIndexView";
import { SITE_NAME, OG_BASE } from "@/lib/site";
import { activeArrowsShops } from "@/lib/activeShops";

// arrows（Alpha・We・N・Be）の機種一覧（2026-11-15〜）。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

const TITLE = "中古arrowsの相場・最安値を機種別に比較【毎日更新】";

export async function generateMetadata(): Promise<Metadata> {
  // タイトルの頭に、いちばん安い値段と機種（lib/hubSummary.ts の hubTitle）
  const market = await getModelMarket([...ANDROID_HUB.arrows.models]);
  const title = hubTitle("arrows", ANDROID_HUB.arrows.models, market, TITLE);
  const description = androidDescribe("arrows", await activeArrowsShops());
  const { path } = ANDROID_HUB.arrows;
  return {
    title,
    description,
    // 取り込みが始まる前（在庫が1件もない）は noindex（/galaxy-watch と同じ。app/sitemap.ts にも入れない）
    robots: market.size === 0 ? { index: false, follow: true } : undefined,
    alternates: { canonical: path },
    openGraph: { ...OG_BASE, title: `${title} | ${SITE_NAME}`, description, url: path },
  };
}

export default function ArrowsIndexPage() {
  return <AndroidIndexView kind="arrows" />;
}
