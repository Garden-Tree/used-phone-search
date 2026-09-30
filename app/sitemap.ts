import type { MetadataRoute } from "next";
import { ALL_DEVICE_PAGE_MODELS, modelPagePath } from "@/lib/catalog";
import { COMPARE_PAIRS, comparePath } from "@/lib/compare";
import { PICKS, pickPath } from "@/lib/picks";
import { BUDGETS, GALAXY_BUDGETS, IPAD_BUDGETS, PIXEL_BUDGETS, budgetPath } from "@/lib/budgets";
import { SITE_URL } from "@/lib/site";
import prisma from "@/lib/prisma";

// 1時間ごとに作り直す（lastmod を在庫の更新に合わせるため）
export const revalidate = 3600;

/**
 * 在庫を最後に取り込んだ時刻。在庫から作るページはどれも、この時刻に中身が変わる。
 * 以前は全 URL を「サイトマップを作った時刻」にしていて、Google には更新の手がかりにならなかった（ideas/2026-09-30.md）。
 * 集計は DB 側で1行だけ返る（Neon の転送量はほぼ増えない）。DB に届かないときは lastmod を付けない
 */
async function lastIngestedAt(): Promise<Date | undefined> {
  try {
    const r = await prisma.deviceInventory.aggregate({ _max: { updatedAt: true } });
    return r._max.updatedAt ?? undefined;
  } catch {
    return undefined;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = await lastIngestedAt();

  const modelPages: MetadataRoute.Sitemap = ALL_DEVICE_PAGE_MODELS.map((model) => ({
    url: `${SITE_URL}${modelPagePath(model)}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    { url: SITE_URL, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, lastModified, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/iphone`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/ipad`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/pixel`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/galaxy`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
    ...PICKS.map((p) => ({
      url: `${SITE_URL}${pickPath(p.slug)}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...BUDGETS.map((max) => ({
      url: `${SITE_URL}${budgetPath(max)}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...IPAD_BUDGETS.map((max) => ({
      url: `${SITE_URL}${budgetPath(max, "ipad")}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...PIXEL_BUDGETS.map((max) => ({
      url: `${SITE_URL}${budgetPath(max, "pixel")}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...GALAXY_BUDGETS.map((max) => ({
      url: `${SITE_URL}${budgetPath(max, "galaxy")}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...modelPages,
    ...COMPARE_PAIRS.map(([a, b]) => ({
      url: `${SITE_URL}${comparePath(a, b)}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
