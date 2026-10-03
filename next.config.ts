import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静的書き出し（static-export ブランチ）。`next build` で out/ に HTML・JSON・画像を書き出し、
  // シンレンタルサーバーに置く。ISR・API・動的な検索ページは使わない（docs/static-export.md）
  output: "export",
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
