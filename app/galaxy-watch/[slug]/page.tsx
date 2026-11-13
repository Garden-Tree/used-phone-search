import { GALAXY_WATCH_MODELS } from "@/lib/galaxyWatchCatalog";
import { modelToSlug } from "@/lib/catalog";

// 中古Galaxy Watch の機種別ページ（2026-11-13〜）。中身は iPhone の機種別ページと共通（時計のときだけ中で分岐する。Apple Watch と同じ形）
export { default, generateMetadata } from "@/app/iphone/[slug]/page";

export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
export const dynamicParams = false;

export function generateStaticParams() {
  return GALAXY_WATCH_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}
