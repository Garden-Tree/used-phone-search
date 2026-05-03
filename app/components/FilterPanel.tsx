'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

const STORAGE_OPTIONS = [64, 128, 256, 512, 1024];
const RANK_OPTIONS = ['S', 'A', 'B', 'C', 'D'];
const SHOPS = [
  { id: 'all', name: 'すべて' },
  { id: 'イオシス', name: 'イオシス' },
  { id: 'ゲオモバイル', name: 'ゲオモバイル' },
  { id: 'にこスマ', name: 'にこスマ' },
  { id: 'エムモバ', name: 'エムモバ' },
  { id: 'ダイワンテレコム', name: 'ダイワンテレコム' },
];

export default function FilterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  
  // Local state for inputs to avoid immediate navigation on every keystroke
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  // Sync local state with URL when URL changes (e.g. browser back button)
  useEffect(() => {
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
  }, [searchParams]);

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
    if (model) params.set('model', model);
    if (shop) params.set('shop', shop);
    
    router.push(`${pathname}?${params.toString()}`);
    setMinPrice('');
    setMaxPrice('');
  };

  const activeFiltersCount = Array.from(searchParams.keys()).filter(k => 
    !['model', 'shop', 'sort'].includes(k)
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
              {SHOPS.map((shop) => {
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
              その他
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={searchParams.get('minBattery') === '80'}
                    onChange={() => toggleValue('minBattery', '80')}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                </div>
                <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-600 transition-colors">
                  バッテリー80%以上
                </span>
              </label>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
