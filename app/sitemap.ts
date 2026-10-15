import type { MetadataRoute } from "next";
import { ALL_DEVICE_PAGE_MODELS, modelPagePath } from "@/lib/catalog";
import { COMPARE_PAIRS, comparePath } from "@/lib/compare";
import { PICKS, pickPath } from "@/lib/picks";
import { BUDGETS, GALAXY_BUDGETS, IPAD_BUDGETS, PIXEL_BUDGETS, budgetPath } from "@/lib/budgets";
import { isCompareIndexable, COMPARE_MIN_STOCK } from "@/lib/compareStock";
import { SITE_URL } from "@/lib/site";
import prisma from "@/lib/prisma";
import { rethrowDuringBuild } from "@/lib/buildGuard";

// ビルドのたびに作る（lastmod を在庫の更新に合わせるため）
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

/**
 * 在庫を最後に取り込んだ時刻。在庫から作るページはどれも、この時刻に中身が変わる。
 * 以前は全 URL を「サイトマップを作った時刻」にしていて、Google には更新の手がかりにならなかった（ideas/2026-09-30.md）。
 * 集計は DB 側で1行だけ返る（Neon の転送量はほぼ増えない）。DB に届かないときは lastmod を付けない
 */
async function lastIngestedAt(): Promise<Date | undefined> {
  try {
    const r = await prisma.deviceInventory.aggregate({ _max: { updatedAt: true } });
    return r._max.updatedAt ?? undefined;
  } catch (error) {
    rethrowDuringBuild(error);
    return undefined;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = await lastIngestedAt();

  // 在庫が少ない比較ページ（どちらかが COMPARE_MIN_STOCK 件未満）は noindex なのでサイトマップからも外す
  const comparePairs: typeof COMPARE_PAIRS = [];
  for (const pair of COMPARE_PAIRS) if (await isCompareIndexable(pair[0], pair[1])) comparePairs.push(pair);
  console.log(`[compare] 比較ページ ${COMPARE_PAIRS.length} 件のうち、在庫が ${COMPARE_MIN_STOCK} 件未満で noindex・サイトマップ除外: ${COMPARE_PAIRS.length - comparePairs.length} 件`);

  const modelPages: MetadataRoute.Sitemap = ALL_DEVICE_PAGE_MODELS.map((model) => ({
    url: `${SITE_URL}${modelPagePath(model)}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    { url: SITE_URL, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/iphone`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/ipad`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/pixel`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/galaxy`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/mac`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/xperia`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/aquos`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/watch`, lastModified, changeFrequency: "daily", priority: 0.8 },
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
    ...comparePairs.map(([a, b]) => ({
      url: `${SITE_URL}${comparePath(a, b)}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
