import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { modelToSlug } from "@/lib/catalog";

// iPad の機種別ページの OGP 画像。中身は iPhone と共通（最安値・容量別の最安値入り）
export { default, size, contentType } from "@/app/iphone/[slug]/opengraph-image";

export const revalidate = 3600;
export const dynamicParams = false;
export const alt = "中古iPadの最安値・価格比較";

export function generateStaticParams() {
  return IPAD_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}
