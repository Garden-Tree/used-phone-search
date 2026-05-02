'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const SHOPS = [
  { id: 'all', name: 'すべて' },
  { id: 'イオシス', name: 'イオシス' },
  { id: 'ゲオモバイル', name: 'ゲオモバイル' },
  { id: 'にこスマ', name: 'にこスマ' },
];

export default function ShopFilter({ currentShop }: { currentShop?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleShopClick = (shopId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (shopId === 'all') {
      params.delete('shop');
    } else {
      params.set('shop', shopId);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const activeShop = currentShop || 'all';

  return (
    <div className="flex flex-wrap gap-2">
      {SHOPS.map((shop) => (
        <button
          key={shop.id}
          onClick={() => handleShopClick(shop.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
            activeShop === shop.id
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm'
          }`}
        >
          {shop.name}
        </button>
      ))}
    </div>
  );
}
