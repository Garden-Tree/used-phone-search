import prisma from "@/lib/prisma";
import { Device } from "@/app/components/DeviceCard";
import SortSelect from "@/app/components/SortSelect";
import FilterPanel from "@/app/components/FilterPanel";
import InfiniteDeviceList from "@/app/components/InfiniteDeviceList";
import AdDisclosure from "@/app/components/AdDisclosure";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { buildOrderBy, buildWhere, resolveModelNames, splitModelQuery } from "@/lib/deviceSearch";
import { SITE_NAME } from "@/lib/site";
import { ALL_PAGE_MODELS, modelPagePath } from "@/lib/catalog";
import Link from "next/link";
import type { Metadata } from 'next';

type SearchParamsRecord = { [key: string]: string | string[] | undefined };

// インデックス対象にするパラメータ（これ以外が付いた絞り込み・並び替えページは重複コンテンツになるため noindex）
const INDEXABLE_PARAMS = ['model', 'shop'];

const PAGE_SIZE = 20;

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
  let description = `大手中古ショップ6社の中古iPhone在庫を一括比較。価格・状態ランク・容量・バッテリー残量で絞り込めます。`;
  if (modelQuery) {
    const label = splitModelQuery(modelQuery).join('・');
    title = `${label} 中古の最安値・価格比較${hasShop ? `（${shopQuery}）` : ''}`;
    description = `${label}の中古在庫を${hasShop ? shopQuery : 'イオシス・ゲオモバイル・じゃんぱら・にこスマ・エムモバ・ダイワンテレコム'}から一括比較。状態ランク・容量・バッテリー残量で絞り込んで最安値をチェック。`;
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
    // openGraph を上書きするとトップの共通 OGP 画像が引き継がれないので明示する
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: `/search${canonicalQs ? `?${canonicalQs}` : ''}`, images: ['/opengraph-image'] },
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
  // 単一モデル検索なら価格まとめページへ誘導する
  const pageModel = models.length === 1
    ? ALL_PAGE_MODELS.find((m) => m.toLowerCase() === models[0].toLowerCase())
    : undefined;

  let devices: Device[] = [];
  let totalCount = 0;

  try {
    // 絞り込みはすべて DB 側で行う（続きは InfiniteDeviceList が /api/devices から skip/take で取得する）
    const where = buildWhere({
      modelNames: await resolveModelNames(models),
      shop: shopQuery,
      sort: currentSort,
      minPrice: params.minPrice as string | undefined,
      maxPrice: params.maxPrice as string | undefined,
      storage: params.storage as string | undefined,
      rank: params.rank as string | undefined,
      minBattery: params.minBattery as string | undefined,
    });

    [devices, totalCount] = await Promise.all([
      prisma.deviceInventory.findMany({ where, orderBy: buildOrderBy(currentSort), take: PAGE_SIZE }),
      prisma.deviceInventory.count({ where }),
    ]);
  } catch (error) {
    console.error("Failed to fetch search results:", error);
  }


  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <SiteHeader label={modelQuery || shopQuery ? "検索結果" : "在庫一覧"} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                {modelQuery ? `${modelQuery} の中古在庫` : shopQuery ? `${shopQuery} の中古在庫` : "中古スマホ在庫一覧"}
              </h1>
              <p className="text-slate-600">
                在庫 {totalCount.toLocaleString()}件。スクロールでさらに読み込みます。
              </p>
              {pageModel && (
                <Link href={modelPagePath(pageModel)} className="inline-block mt-2 text-sm font-bold text-blue-600 hover:underline underline-offset-4">
                  {pageModel}の容量別・ランク別の最安値まとめを見る &rarr;
                </Link>
              )}
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
            // 検索条件が変わったら作り直して、前の条件の読み込み状態を持ち越さない
            key={JSON.stringify(params)}
            initialDevices={devices}
            totalCount={totalCount}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
