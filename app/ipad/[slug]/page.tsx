import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { modelToSlug } from "@/lib/catalog";

// iPad の機種別ページ。中身は iPhone の機種別ページと共通（slug から機種を引く部分も共通）
export { default, generateMetadata } from "@/app/iphone/[slug]/page";

export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
export const dynamicParams = false;

export function generateStaticParams() {
  return IPAD_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}
