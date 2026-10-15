import { AQUOS_MODELS } from "@/lib/aquosCatalog";
import { activeAquosShops } from "@/lib/activeShops";
import { androidHubImage } from "@/lib/androidHubImage";

// 中古AQUOS 一覧（/aquos）の OGP 画像。/mac の画像と同じ作り（lib/androidHubImage.tsx）。ビルドのたびに作る。
// 機種別ページ（/aquos/[slug]）はそれぞれの opengraph-image を持つので、この画像は /aquos だけに使われる
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

export const alt = "中古AQUOSの相場一覧";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return androidHubImage("AQUOS", AQUOS_MODELS, activeAquosShops);
}
