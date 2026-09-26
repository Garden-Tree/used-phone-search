import Link from "next/link";
import prisma from "@/lib/prisma";
import { Device } from "@/app/components/DeviceCard";
import SortSelect from "@/app/components/SortSelect";
import FilterPanel from "@/app/components/FilterPanel";
import InfiniteDeviceList from "@/app/components/InfiniteDeviceList";
import AdDisclosure from "@/app/components/AdDisclosure";
import { buildOrderBy, buildWhere, filterByModels, splitModelQuery } from "@/lib/deviceSearch";
import { SITE_NAME } from "@/lib/site";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from 'next';

type SearchParamsRecord = { [key: string]: string | string[] | undefined };

// インデックス対象にするパラメータ（これ以外が付いた絞り込み・並び替えページは重複コンテンツになるため noindex）
const INDEXABLE_PARAMS = ['model', 'shop'];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}): Promise<Metadata> {
  const params = await searchParams;
  const modelQuery = params.model as string | undefined;
  const shopQuery = params.shop as string | undefined;
  const hasShop = !!shopQuery && shopQuery !== 'all';

  let title = "中古スマホの在庫一覧・価格比較";
  let description = `大手中古ショップ5社の中古iPhone在庫を一括比較。価格・状態ランク・容量・バッテリー残量で絞り込めます。`;
  if (modelQuery) {
    const label = splitModelQuery(modelQuery).join('・');
    title = `${label} 中古の最安値・価格比較${hasShop ? `（${shopQuery}）` : ''}`;
    description = `${label}の中古在庫を${hasShop ? shopQuery : 'イオシス・ゲオモバイル・にこスマ・エムモバ・ダイワンテレコム'}から一括比較。状態ランク・容量・バッテリー残量で絞り込んで最安値をチェック。`;
  } else if (hasShop) {
    title = `${shopQuery} の中古スマホ在庫一覧`;
    description = `${shopQuery}の中古iPhone在庫を価格・状態ランク・容量・バッテリー残量で絞り込んで比較できます。`;
  }

  const canonical = new URLSearchParams();
  if (modelQuery) canonical.set('model', modelQuery);
  if (hasShop) canonical.set('shop', shopQuery);
  const canonicalQs = canonical.toString();
  const isFiltered = Object.keys(params).some((k) => !INDEXABLE_PARAMS.includes(k));

  return {
    title,
    description,
    alternates: { canonical: `/search${canonicalQs ? `?${canonicalQs}` : ''}` },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: `/search${canonicalQs ? `?${canonicalQs}` : ''}` },
    robots: isFiltered ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const params = await searchParams;
  const modelQuery = params.model as string | undefined;
  const shopQuery = params.shop as string | undefined;
  const sortParam = params.sort as string | undefined;

  // Sort configuration
  const currentSort = (sortParam as string) || 'price_asc';
  const models = splitModelQuery(modelQuery);

  let devices: Device[] = [];

  try {
    // Initial fetch - fetch a bit more than 20 to account for manual filtering
    const initialTake = models.length > 0 ? 100 : 20;

    devices = await prisma.deviceInventory.findMany({
      where: buildWhere({
        models,
        shop: shopQuery,
        sort: currentSort,
        minPrice: params.minPrice as string | undefined,
        maxPrice: params.maxPrice as string | undefined,
        storage: params.storage as string | undefined,
        rank: params.rank as string | undefined,
        minBattery: params.minBattery as string | undefined,
      }),
      orderBy: buildOrderBy(currentSort),
      take: initialTake,
    });

    // Limit to 20 for initial view
    devices = filterByModels(devices, models).slice(0, 20);
  } catch (error) {
    console.error("Failed to fetch search results:", error);
  }


  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="group flex items-center mr-1 text-slate-400 hover:text-blue-600 transition-all hover:-translate-x-1" aria-label="トップページへ戻る">
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
            {modelQuery || shopQuery ? "検索結果" : "在庫一覧"}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                {modelQuery ? `${modelQuery} の中古在庫` : shopQuery ? `${shopQuery} の中古在庫` : "中古スマホ在庫一覧"}
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

          <AdDisclosure compact />

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
        <AdDisclosure />
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
