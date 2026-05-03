import { NextRequest, NextResponse } from "next/server";
import { DeviceInventory } from "@prisma/client";
import prisma from "@/lib/prisma";

// 1時間ごとに自動更新（デバッグのために一時無効化）
// export const revalidate = 60 * 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const modelQuery = searchParams.get("model");
  const shopQuery = searchParams.get("shop");
  const sortParam = searchParams.get("sort");
  const skip = parseInt(searchParams.get("skip") || "0");
  const take = parseInt(searchParams.get("take") || "20");

  // Advanced filters
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const storage = searchParams.get("storage");
  const rank = searchParams.get("rank");
  const minBattery = searchParams.get("minBattery");

  const currentSort = sortParam || 'price_asc';
  
  const getOrderBy = () => {
    switch (currentSort) {
      case 'price_desc': return { price: 'desc' as const };
      case 'battery_desc': return { batteryHealth: 'desc' as const };
      case 'battery_asc': return { batteryHealth: 'asc' as const };
      case 'price_asc':
      default: return { price: 'asc' as const };
    }
  };

  const whereClause: any = {};
  let models: string[] = [];

  if (modelQuery) {
    models = modelQuery.split(',').map(m => m.trim()).filter(m => m);
    if (models.length > 0) {
      whereClause.OR = models.map(m => {
        const lowerM = m.toLowerCase();
        const modelIdentifier = lowerM
          .replace(/iphone\s?/i, '')
          .replace(/\s(pro\smax|pro|plus|mini)$/i, '')
          .trim();
        
        const baseConditions: any[] = [
          { modelName: { contains: modelIdentifier, mode: 'insensitive' } }
        ];

        if (lowerM.endsWith('pro max')) {
          baseConditions.push({ modelName: { contains: 'max', mode: 'insensitive' } });
          baseConditions.push({ modelName: { contains: 'pro', mode: 'insensitive' } });
        } else if (lowerM.endsWith('pro')) {
          baseConditions.push({ modelName: { contains: 'pro', mode: 'insensitive' } });
          baseConditions.push({ NOT: { modelName: { contains: 'max', mode: 'insensitive' } } });
        } else if (lowerM.endsWith('plus')) {
          baseConditions.push({ modelName: { contains: 'plus', mode: 'insensitive' } });
        } else if (lowerM.endsWith('mini')) {
          baseConditions.push({ modelName: { contains: 'mini', mode: 'insensitive' } });
        } else {
          // Base model: Must not contain any of the suffix keywords
          baseConditions.push({ NOT: { modelName: { contains: 'pro', mode: 'insensitive' } } });
          baseConditions.push({ NOT: { modelName: { contains: 'max', mode: 'insensitive' } } });
          baseConditions.push({ NOT: { modelName: { contains: 'plus', mode: 'insensitive' } } });
          baseConditions.push({ NOT: { modelName: { contains: 'mini', mode: 'insensitive' } } });
        }
        
        return { AND: baseConditions };
      });
    }
  }

  if (shopQuery && shopQuery !== 'all') {
    whereClause.shopName = shopQuery;
  }

  // Apply numeric filters
  if (minPrice || maxPrice) {
    whereClause.price = {};
    if (minPrice) whereClause.price.gte = parseInt(minPrice);
    if (maxPrice) whereClause.price.lte = parseInt(maxPrice);
  }

  if (storage) {
    whereClause.storage = parseInt(storage);
  }

  if (rank) {
    whereClause.conditionRank = rank;
  }

  // If sorting by battery, exclude items with unknown battery (null)
  if (currentSort === 'battery_desc' || currentSort === 'battery_asc') {
    whereClause.batteryHealth = { not: null };
  }

  if (minBattery) {
    const batteryVal = parseInt(minBattery);
    whereClause.AND = [
      ...(whereClause.AND || []),
      {
        OR: [
          { batteryHealth: { gte: batteryVal } },
          { conditionRank: 'S' }
        ]
      }
    ];
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
        getOrderBy(),
        { price: 'asc' }
      ],
      skip: skip,
      take: fetchTake,
    });

    if (models.length > 0) {
      devices = (devices as DeviceInventory[]).filter((d: DeviceInventory) => {
        return models.some(m => {
          const lowerQuery = m.toLowerCase();
          const lowerName = d.modelName.toLowerCase();

          // Basic verification that the device name contains the core model identifier
          const modelIdentifier = lowerQuery
            .replace(/iphone\s?/i, '')
            .replace(/\s(pro\smax|pro|plus|mini)$/i, '')
            .trim();
            
          // Handle cases like "iphone13" (iosis) vs "iphone 13"
          const normalizedName = lowerName.replace(/\s/g, '');
          const normalizedQuery = modelIdentifier.replace(/\s/g, '');
          
          if (!normalizedName.includes(normalizedQuery)) return false;

          if (lowerQuery.endsWith('pro max')) {
            return lowerName.includes('max') && lowerName.includes('pro');
          } else if (lowerQuery.endsWith('pro')) {
            return lowerName.includes('pro') && !lowerName.includes('max');
          } else if (lowerQuery.endsWith('plus')) {
            return lowerName.includes('plus');
          } else if (lowerQuery.endsWith('mini')) {
            return lowerName.includes('mini');
          } else {
            return !lowerName.includes('pro') && !lowerName.includes('max') && !lowerName.includes('plus') && !lowerName.includes('mini');
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
