'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

/** 並び替え。見た目は className で変える（PC は文字つきの選択欄、スマホの下の固定バーはボタン風） */
export default function SortSelect({ currentSort, className, idSuffix }: { currentSort: string; className?: string; idSuffix?: string }) {
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
      id={idSuffix ? `sort-${idSuffix}` : 'sort'}
      aria-label="並び替え"
      value={currentSort}
      onChange={handleSortChange}
      className={
        className ??
        'h-10 bg-white border border-gray-300 text-ink text-sm rounded-lg px-3 cursor-pointer focus:outline-2 focus:outline-brand-600'
      }
    >
      <option value="price_asc">価格が安い順</option>
      <option value="price_desc">価格が高い順</option>
      <option value="battery_desc">バッテリー残量が多い順</option>
      <option value="battery_asc">バッテリー残量が少ない順</option>
    </select>
  );
}
