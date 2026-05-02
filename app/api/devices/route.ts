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
  let models: string[] = [];
  
  if (modelQuery) {
    models = modelQuery.split(',').map(m => m.trim()).filter(m => m);
    if (models.length > 0) {
      whereClause.OR = models.map(m => {
        const queryStr = m.replace(/iphone\s?/i, '').trim();
        return {
          modelName: {
            contains: queryStr,
            mode: 'insensitive'
          }
        };
      });
    }
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

    if (models.length > 0) {
      devices = devices.filter(d => {
        return models.some(m => {
          const lowerQuery = m.toLowerCase();
          const lowerName = d.modelName.toLowerCase();
          
          if (lowerQuery.endsWith('pro')) {
            return lowerName.includes('pro') && !lowerName.includes('max');
          } else if (lowerQuery.endsWith('max')) {
            return lowerName.includes('max');
          } else if (lowerQuery.endsWith('plus')) {
            return lowerName.includes('plus');
          } else if (lowerQuery.endsWith('mini')) {
            return lowerName.includes('mini');
          } else if (lowerQuery.match(/\d+e$/)) {
            return !!lowerName.match(/\d+e\b/);
          } else {
            const isEModel = !!lowerName.match(/\d+e\b/);
            return !lowerName.includes('pro') && !lowerName.includes('max') && !lowerName.includes('plus') && !lowerName.includes('mini') && !isEModel;
          }
        });
      });

      
      // Limit to requested 'take' after filtering
      devices = devices.slice(0, take);
    }

    return NextResponse.json(devices);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}
