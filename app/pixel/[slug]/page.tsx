import { PIXEL_MODELS } from "@/lib/pixelCatalog";
import { modelToSlug } from "@/lib/catalog";

// Pixel の機種別ページ。中身は iPhone の機種別ページと共通（slug から機種を引く部分も共通）
export { default, generateMetadata } from "@/app/iphone/[slug]/page";

export const revalidate = 21600; // 6時間（在庫の取り込みと同じ間隔。Neon の計算時間を減らすため。2026-10-04）
export const dynamicParams = false;

export function generateStaticParams() {
  return PIXEL_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}
