import type { Metadata } from "next";
import AndroidIndexView, { ANDROID_HUB, androidDescribe } from "@/app/components/AndroidIndexView";
import { SITE_NAME } from "@/lib/site";
import { activeXperiaShops } from "@/lib/activeShops";

// Sony Xperia の機種一覧（2026-10-15〜）。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

const TITLE = "中古Xperiaの相場・最安値を機種別に比較【毎日更新】";

export async function generateMetadata(): Promise<Metadata> {
  const description = androidDescribe("xperia", await activeXperiaShops());
  const { path } = ANDROID_HUB.xperia;
  return {
    title: TITLE,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: path },
  };
}

export default function XperiaIndexPage() {
  return <AndroidIndexView kind="xperia" />;
}
