import type { MetadataRoute } from "next";
import { ALL_PAGE_MODELS, modelPagePath } from "@/lib/catalog";
import { COMPARE_PAIRS, comparePath } from "@/lib/compare";
import { PICKS, pickPath } from "@/lib/picks";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const modelPages: MetadataRoute.Sitemap = ALL_PAGE_MODELS.map((model) => ({
    url: `${SITE_URL}${modelPagePath(model)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    ...PICKS.map((p) => ({
      url: `${SITE_URL}${pickPath(p.slug)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...modelPages,
    ...COMPARE_PAIRS.map(([a, b]) => ({
      url: `${SITE_URL}${comparePath(a, b)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
