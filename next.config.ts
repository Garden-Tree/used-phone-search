import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静的書き出し（static-export ブランチ）。`next build` で out/ に HTML・JSON・画像を書き出し、
  // シンレンタルサーバーに置く。ISR・API・動的な検索ページは使わない（docs/static-export.md）
  output: "export",
  // ビルドごとの _next/static/<buildId>/ をコミットごとにする（配置先では古い _next/static を消さないので、データだけの書き出しで増やさない）。
  // 手元（GITHUB_SHA なし）は Next の既定
  generateBuildId: async () => process.env.GITHUB_SHA ?? null,
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
