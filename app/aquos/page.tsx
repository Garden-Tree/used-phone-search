import type { Metadata } from "next";
import { getModelMarket } from "@/lib/marketStats";
import { hubTitle } from "@/lib/hubSummary";
import AndroidIndexView, { ANDROID_HUB, androidDescribe } from "@/app/components/AndroidIndexView";
import { SITE_NAME } from "@/lib/site";
import { activeAquosShops } from "@/lib/activeShops";

// Sharp AQUOS の機種一覧（2026-10-15〜）。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

const TITLE = "中古AQUOSの相場・最安値を機種別に比較【毎日更新】";

export async function generateMetadata(): Promise<Metadata> {
  // タイトルの頭に、いちばん安い値段と機種（10/28〜・lib/hubSummary.ts の hubTitle）
  const title = hubTitle("AQUOS", ANDROID_HUB.aquos.models, await getModelMarket([...ANDROID_HUB.aquos.models]), TITLE);
  const description = androidDescribe("aquos", await activeAquosShops());
  const { path } = ANDROID_HUB.aquos;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path },
  };
}

export default function AquosIndexPage() {
  return <AndroidIndexView kind="aquos" />;
}
