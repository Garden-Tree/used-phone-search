import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildOrderBy, buildWhere, filterByModels, splitModelQuery } from "@/lib/deviceSearch";

// 1時間ごとに自動更新（デバッグのために一時無効化）
// export const revalidate = 60 * 60;

const MAX_TAKE = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const models = splitModelQuery(searchParams.get("model"));
  const sort = searchParams.get("sort");
  // 過大な値で重いクエリを投げられないよう上限を設ける
  const skip = Math.max(0, parseInt(searchParams.get("skip") || "0") || 0);
  const take = Math.min(MAX_TAKE, Math.max(1, parseInt(searchParams.get("take") || "20") || 20));

  const where = buildWhere({
    models,
    shop: searchParams.get("shop"),
    sort,
    minPrice: searchParams.get("minPrice"),
    maxPrice: searchParams.get("maxPrice"),
    storage: searchParams.get("storage"),
    rank: searchParams.get("rank"),
    minBattery: searchParams.get("minBattery"),
  });

  try {
    // Note: To handle the complex manual filtering while still supporting pagination,
    // we fetch a larger batch and filter it. For a real production app,
    // these filters should be implemented in the database query directly or via a search engine.

    // For now, we'll fetch more than requested to account for manual filtering
    const fetchTake = models.length > 0 ? take * 5 : take;

    const devices = await prisma.deviceInventory.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip: skip,
      take: fetchTake,
    });

    return NextResponse.json(filterByModels(devices, models).slice(0, take));
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}
