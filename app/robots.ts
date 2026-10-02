import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /search?… は絞り込み用の動的ページで、毎回 DB を読む。機種ページからの絞り込みリンクが数千通りあり、
      // クローラーが巡回すると Neon が休止できない（2026-10-03。ideas/2026-10-03.md）。/search 自体は許可
      disallow: ["/api/", "/search?"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
