import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const modelQuery = searchParams.get("model");
  const shopQuery = searchParams.get("shop");
  const sortParam = searchParams.get("sort");
  const skip = parseInt(searchParams.get("skip") || "0");
  const take = parseInt(searchParams.get("take") || "20");

  const isDesc = sortParam === 'price_desc';

  const whereClause: any = {};
  if (modelQuery) {
    const queryStr = modelQuery.replace(/iphone\s?/i, '').trim();
    whereClause.modelName = {
      contains: queryStr,
      mode: 'insensitive'
    };
  }
  if (shopQuery) {
    whereClause.shopName = shopQuery;
  }

  try {
    // Note: To handle the complex manual filtering while still supporting pagination,
    // we fetch a larger batch and filter it. For a real production app, 
    // these filters should be implemented in the database query directly or via a search engine.
    
    // For now, we'll fetch more than requested to account for manual filtering
    const fetchTake = modelQuery ? take * 5 : take; 
    
    let devices = await prisma.deviceInventory.findMany({
      where: whereClause,
      orderBy: [
        { price: isDesc ? 'desc' : 'asc' }
      ],
      skip: skip,
      take: fetchTake,
    });

    if (modelQuery) {
      const lowerQuery = modelQuery.toLowerCase();
      if (lowerQuery.endsWith('pro')) {
        devices = devices.filter(d => d.modelName.toLowerCase().includes('pro') && !d.modelName.toLowerCase().includes('max'));
      } else if (lowerQuery.endsWith('max')) {
        devices = devices.filter(d => d.modelName.toLowerCase().includes('max'));
      } else if (lowerQuery.endsWith('plus')) {
        devices = devices.filter(d => d.modelName.toLowerCase().includes('plus'));
      } else if (lowerQuery.endsWith('mini')) {
        devices = devices.filter(d => d.modelName.toLowerCase().includes('mini'));
      } else if (lowerQuery.match(/\d+e$/)) {
        devices = devices.filter(d => d.modelName.toLowerCase().match(/\d+e\b/));
      } else {
        devices = devices.filter(d => {
          const lower = d.modelName.toLowerCase();
          const isEModel = !!lower.match(/\d+e\b/);
          return !lower.includes('pro') && !lower.includes('max') && !lower.includes('plus') && !lower.includes('mini') && !isEModel;
        });
      }
      
      // Limit to requested 'take' after filtering
      devices = devices.slice(0, take);
    }

    return NextResponse.json(devices);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}
