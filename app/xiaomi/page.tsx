import type { Metadata } from "next";
import { getModelMarket } from "@/lib/marketStats";
import { hubTitle } from "@/lib/hubSummary";
import AndroidIndexView, { ANDROID_HUB, androidDescribe } from "@/app/components/AndroidIndexView";
import { SITE_NAME, OG_BASE } from "@/lib/site";
import { activeXiaomiShops } from "@/lib/activeShops";

// Xiaomi（Xiaomi・Redmi・POCO）の機種一覧（2026-11-12〜）。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

const TITLE = "中古Xiaomiの相場・最安値を機種別に比較【毎日更新】";

export async function generateMetadata(): Promise<Metadata> {
  // タイトルの頭に、いちばん安い値段と機種（10/28〜・lib/hubSummary.ts の hubTitle）
  const title = hubTitle("Xiaomi", ANDROID_HUB.xiaomi.models, await getModelMarket([...ANDROID_HUB.xiaomi.models]), TITLE);
  const description = androidDescribe("xiaomi", await activeXiaomiShops());
  const { path } = ANDROID_HUB.xiaomi;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OG_BASE, title: `${title} | ${SITE_NAME}`, description, url: path },
  };
}

export default function XiaomiIndexPage() {
  return <AndroidIndexView kind="xiaomi" />;
}
