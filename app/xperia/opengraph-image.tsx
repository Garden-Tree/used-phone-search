import { XPERIA_MODELS } from "@/lib/xperiaCatalog";
import { activeXperiaShops } from "@/lib/activeShops";
import { androidHubImage } from "@/lib/androidHubImage";

// 中古Xperia 一覧（/xperia）の OGP 画像。/mac の画像と同じ作り（lib/androidHubImage.tsx）。ビルドのたびに作る。
// 機種別ページ（/xperia/[slug]）はそれぞれの opengraph-image を持つので、この画像は /xperia だけに使われる
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

export const alt = "中古Xperiaの相場一覧";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return androidHubImage("Xperia", XPERIA_MODELS, activeXperiaShops);
}
