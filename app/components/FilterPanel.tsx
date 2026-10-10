'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SHOPS } from '@/lib/shops';

export const STORAGE_OPTIONS = [64, 128, 256, 512, 1024];
export const RANK_OPTIONS = ['S', 'A', 'B', 'C', 'D'];
export const BATTERY_OPTIONS = [80, 85, 90, 95];
// 楽天市場店は「じゃんぱら（楽天）」のように短く出す
const SHOP_OPTIONS = [
  { id: 'all', name: 'すべて' },
  ...SHOPS.map((s) => ({ id: s.name, name: s.marketplace === "rakuten" ? `${s.label}（楽天）` : s.marketplace === "yahoo" ? `${s.label}（Yahoo!）` : s.label })),
];

/** 条件の URL パラメータ（model・sort・device は絞り込みの条件ではない） */
export const NON_FILTER_KEYS = ['model', 'sort', 'device'];

/** 現在の URL のパラメータを部分的に書き換えて移動する（null はそのパラメータを消す） */
export function useUpdateParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    router.push(`${pathname}?${params.toString()}`);
  };
}

const chipClass = (active: boolean) =>
  `h-9 px-3 rounded-full text-[13px] font-medium border transition-colors ${
    active
      ? 'bg-brand-800 border-brand-800 text-white'
      : 'bg-white border-gray-300 text-gray-700 hover:border-brand-600 hover:text-brand-600'
  }`;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2 min-w-0">
      <legend className="text-sm font-bold text-ink mb-2">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * 絞り込みの中身（ショップ・価格帯・容量・ランク・バッテリー）。常に開いた状態で出す。
 * PC では左の列に置き、スマホでは下から出る画面（SearchClient）の中に置く
 */
export default function FilterPanel() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateParams();

  // 入力中は URL を変えないよう手元に持つ。URL 側が変わったとき（ブラウザの戻るなど）は、
  // 呼び出し側が key に価格を渡して作り直すことで同期する
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  const toggleValue = (key: string, value: string) => {
    updateParams({ [key]: searchParams.get(key) === value ? null : value });
  };

  const handleApplyPrice = () => {
    updateParams({ minPrice: minPrice || null, maxPrice: maxPrice || null });
  };

  const inputClass =
    'w-full h-10 bg-white border border-gray-300 rounded-lg px-3 text-sm focus:outline-2 focus:outline-brand-600';

  return (
    <div className="space-y-6">
      <Group title="ショップ">
        <div className="flex flex-wrap gap-2">
          {SHOP_OPTIONS.map((shop) => {
            const isActive = (searchParams.get('shop') || 'all') === shop.id;
            return (
              <button
                key={shop.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => updateParams({ shop: shop.id === 'all' ? null : shop.id })}
                className={chipClass(isActive)}
              >
                {shop.name}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="価格帯（円）">
        <div className="flex items-center gap-2">
          <input type="number" inputMode="numeric" placeholder="最小" aria-label="最小価格" value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)} className={inputClass} />
          <span className="text-ink-mute">〜</span>
          <input type="number" inputMode="numeric" placeholder="最大" aria-label="最大価格" value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)} className={inputClass} />
          <button type="button" onClick={handleApplyPrice}
            className="shrink-0 h-10 px-4 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-800">
            適用
          </button>
        </div>
      </Group>

      <Group title="容量">
        <div className="flex flex-wrap gap-2">
          {STORAGE_OPTIONS.map((val) => {
            const isActive = searchParams.get('storage') === String(val);
            return (
              <button key={val} type="button" aria-pressed={isActive} onClick={() => toggleValue('storage', String(val))} className={chipClass(isActive)}>
                {val >= 1024 ? `${val / 1024}TB` : `${val}GB`}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="状態ランク">
        <div className="flex flex-wrap gap-2">
          {RANK_OPTIONS.map((rank) => {
            const isActive = searchParams.get('rank') === rank;
            return (
              <button key={rank} type="button" aria-pressed={isActive} onClick={() => toggleValue('rank', rank)} className={chipClass(isActive)}>
                ランク{rank}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="バッテリー最大容量">
        <div className="flex flex-wrap gap-2">
          {BATTERY_OPTIONS.map((val) => {
            const isActive = searchParams.get('minBattery') === String(val);
            return (
              <button key={val} type="button" aria-pressed={isActive} onClick={() => toggleValue('minBattery', String(val))} className={chipClass(isActive)}>
                {val}%以上
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-mute leading-relaxed">値段に差が出にくいのに使い心地を大きく左右するので、まず見たい項目です。未使用品（ランクS）は常に含みます</p>
      </Group>
    </div>
  );
}
