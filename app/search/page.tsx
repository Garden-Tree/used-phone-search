import Link from "next/link";
import prisma from "@/lib/prisma";
import { Device } from "@/app/components/DeviceCard";
import SortSelect from "@/app/components/SortSelect";
import FilterPanel from "@/app/components/FilterPanel";
import InfiniteDeviceList from "@/app/components/InfiniteDeviceList";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from 'next';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const modelQuery = params.model as string | undefined;
  const shopQuery = params.shop as string | undefined;
  
  let title = "中古スマホ一括検索";
  if (modelQuery) {
    title = `${modelQuery} の検索結果 - ${title}`;
  } else if (shopQuery && shopQuery !== 'all') {
    title = `${shopQuery} の在庫一覧 - ${title}`;
  }

  return { 
    title,
    description: "🔍 **一括検索**: イオシス、ゲオモバイル、にこスマなど、大手中古ショップの在庫を一括検索\n⚡ **高速な操作感**: Next.js 16 と無限スクロールによる、ストレスのない商品閲覧\n🎯 **詳細フィルタ**: ショップ、コンディション（ランク）、価格帯、容量などでの絞り込み\n📊 **リアルタイム収集**: Python スクレイパーにより、各ショップの最新在庫を定期的に同期"
  };
}

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

  // Sort configuration
  const currentSort = (sortParam as string) || 'price_asc';

  const getOrderBy = () => {
    switch (currentSort) {
      case 'price_desc': return { price: 'desc' as const };
      case 'battery_desc': return { batteryHealth: 'desc' as const };
      case 'battery_asc': return { batteryHealth: 'asc' as const };
      case 'price_asc':
      default: return { price: 'asc' as const };
    }
  };

  let devices: Device[] = [];

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
    // Initial fetch - fetch a bit more than 20 to account for manual filtering
    const initialTake = modelQuery ? 100 : 20;

    devices = await prisma.deviceInventory.findMany({
      where: whereClause,
      orderBy: [
        getOrderBy(),
        { price: 'asc' } // Secondary sort by price
      ],
      take: initialTake,
    });

    // Apply model-specific filtering secondary check (JS) for extra safety
    if (models.length > 0) {
      devices = devices.filter(d => {
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

      // Limit to 20 for initial view
      devices = devices.slice(0, 20);
    }

  } catch (error) {
    console.error("Failed to fetch search results:", error);
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="group flex items-center mr-1 text-slate-400 hover:text-blue-600 transition-all hover:-translate-x-1" aria-label="Go back">
              <ChevronLeft className="w-8 h-8 -ml-2" />
            </Link>
            <div className="flex flex-col">
              <Link href="/" className="text-xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">
                中古スマホ一括検索
              </Link>
              <a href="https://gadelog.com" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors tracking-tighter uppercase leading-none">
                powered by gadelog.com
              </a>
            </div>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {modelQuery ? `Results for "${modelQuery}"` : shopQuery ? `Results for "${shopQuery}"` : "Search"}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                {modelQuery || shopQuery || "Search Results"}
              </h1>
              <p className="text-slate-600">
                在庫を表示しています。スクロールでさらに読み込みます。
              </p>
            </div>

            {(devices.length > 0 || shopQuery || modelQuery) && (
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm font-medium text-slate-600">
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
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-lg">在庫が見つかりませんでした。</p>
            <p className="text-sm text-slate-400 mt-2">条件を変更して検索してみてください。</p>
          </div>
        ) : (
          <InfiniteDeviceList
            initialDevices={devices}
          />
        )}
      </main>
      <footer className="max-w-6xl mx-auto px-4 mt-12 pb-12 text-center border-t border-slate-100 pt-8">
        <p className="text-sm text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} 中古スマホ一括検索
        </p>
        <p className="text-xs text-slate-300 mt-2">
          powered by <a href="https://gadelog.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors font-bold underline underline-offset-2">gadelog.com</a>
        </p>
      </footer>
    </div>
  );
}
