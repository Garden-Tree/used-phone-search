import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildOrderBy, buildWhere, resolveModelNames, splitModelQuery } from "@/lib/deviceSearch";

// 1時間ごとに自動更新（デバッグのために一時無効化）
// export const revalidate = 60 * 60;

const MAX_TAKE = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort");
  // 過大な値で重いクエリを投げられないよう上限を設ける
  const skip = Math.max(0, parseInt(searchParams.get("skip") || "0") || 0);
  const take = Math.min(MAX_TAKE, Math.max(1, parseInt(searchParams.get("take") || "20") || 20));

  try {
    // 絞り込みはすべて DB 側で行うので、skip/take がそのまま正確なページ送りになる
    const where = buildWhere({
      modelNames: await resolveModelNames(splitModelQuery(searchParams.get("model"))),
      shop: searchParams.get("shop"),
      sort,
      minPrice: searchParams.get("minPrice"),
      maxPrice: searchParams.get("maxPrice"),
      storage: searchParams.get("storage"),
      rank: searchParams.get("rank"),
      minBattery: searchParams.get("minBattery"),
    });

    const devices = await prisma.deviceInventory.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip,
      take,
    });

    return NextResponse.json(devices);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}
