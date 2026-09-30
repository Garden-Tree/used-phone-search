import { GALAXY_MODELS } from "@/lib/galaxyCatalog";
import { modelToSlug } from "@/lib/catalog";

// Galaxy の機種別ページ。中身は iPhone の機種別ページと共通（slug から機種を引く部分も共通）
export { default, generateMetadata } from "@/app/iphone/[slug]/page";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return GALAXY_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}
