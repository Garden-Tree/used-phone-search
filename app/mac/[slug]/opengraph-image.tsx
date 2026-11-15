import { MAC_DESKTOP_MODELS, MAC_MODELS } from "@/lib/macCatalog";
import { modelToSlug } from "@/lib/catalog";

// 中古Mac（MacBook・デスクトップ）の機種別ページの OGP 画像。中身は iPhone と共通（最安値・SSD 容量別の最安値入り）
export { default, size, contentType } from "@/app/iphone/[slug]/opengraph-image";

export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
export const dynamicParams = false;
// alt は静的な文字列なので、MacBook とデスクトップ（2026-11-15〜）の両方に合う「中古Mac」に
export const alt = "中古Macの最安値・価格比較";

export function generateStaticParams() {
  // Mac デスクトップ（2026-11-15〜）も同じ形の画像
  return [...MAC_MODELS, ...MAC_DESKTOP_MODELS].map((model) => ({ slug: modelToSlug(model) }));
}
