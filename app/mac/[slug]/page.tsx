import { MAC_DESKTOP_MODELS, MAC_MODELS } from "@/lib/macCatalog";
import { modelToSlug } from "@/lib/catalog";

// 中古MacBook の機種別ページ（2026-10-15〜）。中身は iPhone の機種別ページと共通（MacBook のときだけ中で分岐する）
// Mac デスクトップ（Mac mini・iMac・Mac Studio。2026-11-15〜）も同じ /mac/<slug>（MacBook と同じくメモリ／SSD の表）
export { default, generateMetadata } from "@/app/iphone/[slug]/page";

export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
export const dynamicParams = false;

export function generateStaticParams() {
  return [...MAC_MODELS, ...MAC_DESKTOP_MODELS].map((model) => ({ slug: modelToSlug(model) }));
}
