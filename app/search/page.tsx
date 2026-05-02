import Link from "next/link";
import prisma from "@/lib/prisma";
import { Device } from "@/app/components/DeviceCard";
import SortSelect from "@/app/components/SortSelect";
import FilterPanel from "@/app/components/FilterPanel";
import InfiniteDeviceList from "@/app/components/InfiniteDeviceList";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const modelQuery = params.model as string | undefined;
  const shopQuery = params.shop as string | undefined;
  const sortParam = params.sort as string | undefined;
  
  // Advanced filter params
  const minPrice = params.minPrice as string | undefined;
  const maxPrice = params.maxPrice as string | undefined;
  const storage = params.storage as string | undefined;
  const rank = params.rank as string | undefined;
  const minBattery = params.minBattery as string | undefined;
  
  // Default sort is price ascending
  const currentSort = sortParam === 'price_desc' ? 'price_desc' : 'price_asc';
  const isDesc = currentSort === 'price_desc';

  let devices: Device[] = [];
  
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
    // Initial fetch - fetch a bit more than 20 to account for manual filtering
    const initialTake = modelQuery ? 100 : 20;

    devices = await prisma.deviceInventory.findMany({
      where: whereClause,
      orderBy: [
        { price: isDesc ? 'desc' : 'asc' }
      ],
      take: initialTake,
    });
    
    // Apply model-specific filtering if modelQuery is present
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

      
      // Limit to 20 for initial view
      devices = devices.slice(0, 20);
    }
    
  } catch (error) {
    console.error("Failed to fetch search results:", error);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 font-sans">
      <header className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            &larr; Used Phone Search
          </Link>
          <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">
            {modelQuery ? `Results for "${modelQuery}"` : shopQuery ? `Results for "${shopQuery}"` : "Search"}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
                {modelQuery || shopQuery || "Search Results"}
              </h1>
              <p className="text-slate-600 dark:text-zinc-400">
                在庫を表示しています。スクロールでさらに読み込みます。
              </p>
            </div>
            
            {(devices.length > 0 || shopQuery || modelQuery) && (
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                  並び替え:
                </label>
                <SortSelect currentSort={currentSort} />
              </div>
            )}
          </div>

          {/* Filter Panel */}
          <FilterPanel />
        </div>

        {devices.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800">
            <p className="text-slate-500 dark:text-zinc-400 text-lg">在庫が見つかりませんでした。</p>
            <p className="text-sm text-slate-400 dark:text-zinc-500 mt-2">条件を変更して検索してみてください。</p>
          </div>
        ) : (
          <InfiniteDeviceList 
            initialDevices={devices} 
          />
        )}
      </main>
    </div>
  );
}
