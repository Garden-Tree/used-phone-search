'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';
import { SHOPS } from '@/lib/shops';

const STORAGE_OPTIONS = [64, 128, 256, 512, 1024];
const RANK_OPTIONS = ['S', 'A', 'B', 'C', 'D'];
const BATTERY_OPTIONS = [80, 85, 90, 95];
// 楽天市場店は「じゃんぱら（楽天）」のように短く出す
const SHOP_OPTIONS = [
  { id: 'all', name: 'すべて' },
  ...SHOPS.map((s) => ({ id: s.name, name: s.note ? `${s.label}（${s.note.startsWith("Yahoo") ? "Yahoo!" : "楽天"}）` : s.label })),
];

export default function FilterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  
  // 入力中は URL を変えないよう手元に持つ。URL 側が変わったとき（ブラウザの戻るなど）は、
  // 呼び出し側が key に価格を渡して作り直すことで同期する
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleValue = (key: string, value: string) => {
    const current = searchParams.get(key);
    if (current === value) {
      updateParams({ [key]: null });
    } else {
      updateParams({ [key]: value });
    }
  };

  const handleApplyPrice = () => {
    updateParams({
      minPrice: minPrice || null,
      maxPrice: maxPrice || null
    });
  };

  const handleClearAll = () => {
    const params = new URLSearchParams();
    // Keep model and shop if they are important, or just clear filters
    const model = searchParams.get('model');
    const shop = searchParams.get('shop');
    const device = searchParams.get('device');
    if (model) params.set('model', model);
    if (shop) params.set('shop', shop);
    if (device) params.set('device', device);
    
    router.push(`${pathname}?${params.toString()}`);
    setMinPrice('');
    setMaxPrice('');
  };

  const activeFiltersCount = Array.from(searchParams.keys()).filter(k => 
    !['model', 'shop', 'sort', 'device'].includes(k) // 種類のタブ（device）は詳細フィルターではない
  ).length;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300">
      {/* Header / Summary */}
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">詳細フィルター</h3>
            {activeFiltersCount > 0 && (
              <p className="text-xs text-blue-600 font-medium">
                {activeFiltersCount}個のフィルター適用中
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {activeFiltersCount > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
              className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> リセット
            </button>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`border-t border-slate-50 transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-6 space-y-8">
          
          {/* Shop Selection (Integrated) */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-500 flex items-center gap-2">
              ショップ
            </label>
            <div className="flex flex-wrap gap-2">
              {SHOP_OPTIONS.map((shop) => {
                const isActive = (searchParams.get('shop') || 'all') === shop.id;
                return (
                  <button
                    key={shop.id}
                    onClick={() => updateParams({ shop: shop.id === 'all' ? null : shop.id })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-200'
                    }`}
                  >
                    {shop.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-500">
              価格帯 (円)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="最小"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-slate-400">~</span>
              <input
                type="number"
                placeholder="最大"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button 
                onClick={handleApplyPrice}
                className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
              >
                適用
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Storage */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-500">
                容量
              </label>
              <div className="flex flex-wrap gap-2">
                {STORAGE_OPTIONS.map((val) => {
                  const label = val >= 1024 ? `${val/1024}TB` : `${val}GB`;
                  const isActive = searchParams.get('storage') === val.toString();
                  return (
                    <button
                      key={val}
                      onClick={() => toggleValue('storage', val.toString())}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        isActive
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rank */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-500">
                状態ランク
              </label>
              <div className="flex flex-wrap gap-2">
                {RANK_OPTIONS.map((rank) => {
                  const isActive = searchParams.get('rank') === rank;
                  return (
                    <button
                      key={rank}
                      onClick={() => toggleValue('rank', rank)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        isActive
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}
                    >
                      {rank}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Battery */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-500">
              バッテリー最大容量
            </label>
            <div className="flex flex-wrap gap-2">
              {BATTERY_OPTIONS.map((val) => {
                const isActive = searchParams.get('minBattery') === String(val);
                return (
                  <button
                    key={val}
                    onClick={() => toggleValue('minBattery', String(val))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-slate-50 border-slate-100 text-slate-600'
                    }`}
                  >
                    {val}%以上
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">値段に差が出にくいのに使い心地を大きく左右するので、まず見たい項目です。未使用品（ランクS）は常に含みます</p>
          </div>

        </div>
      </div>
    </div>
  );
}
