import { PIXEL_WATCH_MODELS } from "@/lib/pixelWatchCatalog";
import { modelToSlug } from "@/lib/catalog";

// 中古Pixel Watch の機種別ページ（2026-11-13〜）。中身は iPhone の機種別ページと共通（時計のときだけ中で分岐する。Apple Watch と同じ形）
export { default, generateMetadata } from "@/app/iphone/[slug]/page";

export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
export const dynamicParams = false;

export function generateStaticParams() {
  return PIXEL_WATCH_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}
