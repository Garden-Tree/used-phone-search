'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function SortSelect({ currentSort }: { currentSort: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select 
      name="sort" 
      id="sort"
      value={currentSort}
      onChange={handleSortChange}
      className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm transition-colors cursor-pointer outline-none"
    >
      <option value="price_asc">価格が安い順</option>
      <option value="price_desc">価格が高い順</option>
      <option value="battery_desc">バッテリー残量が多い順</option>
      <option value="battery_asc">バッテリー残量が少ない順</option>
    </select>
  );
}
