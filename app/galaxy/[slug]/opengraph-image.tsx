import { GALAXY_MODELS } from "@/lib/galaxyCatalog";
import { modelToSlug } from "@/lib/catalog";

// Galaxy の機種別ページの OGP 画像。中身は iPhone と共通（最安値・容量別の最安値入り）
export { default, size, contentType } from "@/app/iphone/[slug]/opengraph-image";

export const revalidate = 86400; // 1日（Neon の計算時間を減らすため。2026-10-02）
export const dynamicParams = false;
export const alt = "中古Galaxyの最安値・価格比較";

export function generateStaticParams() {
  return GALAXY_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}
