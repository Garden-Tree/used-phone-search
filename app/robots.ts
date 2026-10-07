import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // 何も禁止しない。/search?… は静的書き出し後はただのファイル（DB を読まない）で、ページに noindex がある。
      // クロールを禁止すると、Vercel 版のときに登録された /search?model=… を Google が読み直せず、noindex に気づかず
      // 登録が残り続ける（10/7 時点で登録済み 311 件のうち 119 件）ので、読ませて外させる（2026-10-07。ideas/2026-10-07.md）
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
