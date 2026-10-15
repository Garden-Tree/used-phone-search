import { WATCH_MODELS } from "@/lib/watchCatalog";
import { modelToSlug } from "@/lib/catalog";

// 中古Apple Watch の機種別ページ（2026-10-15〜）。中身は iPhone の機種別ページと共通（Apple Watch のときだけ中で分岐する）
export { default, generateMetadata } from "@/app/iphone/[slug]/page";

export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
export const dynamicParams = false;

export function generateStaticParams() {
  return WATCH_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}
