import { XIAOMI_MODELS } from "@/lib/xiaomiCatalog";
import { modelToSlug } from "@/lib/catalog";

// 中古Xiaomiの機種別ページ（2026-11-12〜）。中身は iPhone の機種別ページと共通（slug から機種を引く部分も共通）
export { default, generateMetadata } from "@/app/iphone/[slug]/page";

export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
export const dynamicParams = false;

export function generateStaticParams() {
  return XIAOMI_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}
