import { OPPO_MODELS } from "@/lib/oppoCatalog";
import { hubOgImage } from "@/lib/hubOgImage";

// 中古OPPOの一覧（/oppo）の OGP 画像。作りは lib/hubOgImage.tsx（全部の一覧ページで共通）（在庫の多い3機種）。ビルドのたびに作る
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

export const alt = "中古OPPOの相場一覧";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return hubOgImage("OPPO", OPPO_MODELS);
}
