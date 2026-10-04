import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静的書き出し。`next build` で out/ に HTML・JSON・画像を書き出し、
  // Cloudflare Pages に置く。ISR・API・動的な検索ページは使わない（docs/cloudflare-pages.md）
  output: "export",
  // ビルドごとの _next/static/<buildId>/ をコミットごとにする（コードが同じ回は同じ名前にする）。
  // 手元（GITHUB_SHA なし）は Next の既定
  generateBuildId: async () => process.env.GITHUB_SHA ?? null,
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
