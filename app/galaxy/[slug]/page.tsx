import { GALAXY_MODELS } from "@/lib/galaxyCatalog";
import { modelToSlug } from "@/lib/catalog";

// Galaxy の機種別ページ。中身は iPhone の機種別ページと共通（slug から機種を引く部分も共通）
export { default, generateMetadata } from "@/app/iphone/[slug]/page";

export const revalidate = 10800; // 3時間（Neon の計算時間を減らすため。2026-10-02）
export const dynamicParams = false;

export function generateStaticParams() {
  return GALAXY_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}
