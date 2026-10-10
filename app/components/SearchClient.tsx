'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import DeviceCard, { DeviceList, type Device } from '@/app/components/DeviceCard';
import SortSelect from '@/app/components/SortSelect';
import FilterPanel, { useUpdateParams } from '@/app/components/FilterPanel';
import AdDisclosure from '@/app/components/AdDisclosure';
import { ALL_DEVICE_PAGE_MODELS, modelPagePath } from '@/lib/catalog';
import { SEARCH_DEVICES, findSearchDevice, matchesModel, splitModelQuery } from '@/lib/modelMatch';
import type { InventoryFile, InventoryIndex } from '@/lib/searchData';
import { findShop } from '@/lib/shops';
import { BUILD_TIME } from '@/lib/buildTime';

/**
 * 検索ページの中身（静的書き出し版）。ビルド時に書き出した機種ごとの在庫 JSON（lib/searchData.ts）を読み込み、
 * 絞り込み・並べ替え・続きの表示をすべてブラウザで行う。URL のパラメータは DB 版の検索ページと同じ
 */

const PAGE_SIZE = 20;
const DATA_DIR = '/data/inventory';

// 同じタブの中で読み込んだファイルは使い回す（絞り込みを変えるたびに読み直さない）
const fileCache = new Map<string, Promise<InventoryFile>>();
let indexCache: Promise<InventoryIndex> | null = null;

const fetchJson = async <T,>(path: string): Promise<T> => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
};
// 失敗したもの（配置中の一時的な 404 など）は覚えておかず、次の操作で読み直す
const loadIndex = () => {
  indexCache ??= fetchJson<InventoryIndex>(`${DATA_DIR}/index.json`).catch((e) => {
    indexCache = null;
    throw e;
  });
  return indexCache;
};
const loadFile = (key: string) => {
  let p = fileCache.get(key);
  if (!p) {
    p = fetchJson<InventoryFile>(`${DATA_DIR}/${key}.json`).catch((e) => {
      fileCache.delete(key);
      throw e;
    });
    fileCache.set(key, p);
  }
  return p;
};

const deviceKeyOf = (name: string) =>
  /^\s*ipad/i.test(name) ? 'ipad' : /^\s*pixel/i.test(name) ? 'pixel' : /^\s*galaxy/i.test(name) ? 'galaxy' : 'iphone';

const toInt = (v: string | null) => {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
};

/** 条件に必要なファイル（拡張子なし）。機種の指定があればその機種と、どの機種にも当たらない表記の other-*。なければ種類の全機種 */
function filesFor(index: InventoryIndex, models: string[], deviceKey: string): string[] {
  const entries = Object.entries(index.files).filter(([, f]) => f.count > 0);
  if (models.length > 0) {
    const keys = new Set<string>();
    for (const q of models) {
      for (const [key, f] of entries) {
        if (f.model ? matchesModel(q, f.model) : f.device === deviceKeyOf(q)) keys.add(key);
      }
    }
    return [...keys];
  }
  return entries.filter(([, f]) => f.device === deviceKey).map(([key]) => key);
}

function toDevices(key: string, file: InventoryFile): Device[] {
  return file.rows.map((r, i) => ({
    id: `${key}-${i}`,
    manufacturer: '',
    modelName: r[0],
    storage: r[1],
    color: r[2],
    conditionRank: r[3],
    batteryHealth: r[4],
    networkStatus: r[5],
    simUnlocked: r[6] === 1,
    carrier: r[7],
    shopName: file.shops[r[8]],
    price: r[9],
    url: r[10],
    isSoldOut: false,
    altPrice: r[11] ?? null,
    altUrl: r[12] ?? null,
  }));
}

export default function SearchClient() {
  const params = useSearchParams();
  const modelQuery = params.get('model') ?? undefined;
  const shopQuery = params.get('shop') ?? undefined;
  const hasShop = !!shopQuery && shopQuery !== 'all';
  const currentSort = params.get('sort') || 'price_asc';
  const models = useMemo(() => splitModelQuery(modelQuery), [modelQuery]);
  // 機種もショップも種類も指定がない一覧は iPhone。DB 版はショップだけ指定すると全種類だったが、
  // 全機種のファイルを読むと重いので、ショップだけの指定も種類のタブ（初めは iPhone）で切り替える
  const device = findSearchDevice(params.get('device')) ?? SEARCH_DEVICES[0];
  const pageModel = models.length === 1
    ? ALL_DEVICE_PAGE_MODELS.find((m) => m.toLowerCase() === models[0].toLowerCase())
    : undefined;

  // 読み込んだ結果は「どの条件の分か」と一緒に持つ（条件が変わったら、読み終わるまでは読み込み中として扱う）
  const loadKey = `${models.join(',')}|${models.length ? '' : device.key}`;
  const [loaded, setLoaded] = useState<{ key: string; devices: Device[] | null; error: boolean } | null>(null);
  const all = loaded?.key === loadKey ? loaded.devices : null;
  const error = loaded?.key === loadKey && loaded.error;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const index = await loadIndex();
      const keys = filesFor(index, models, device.key);
      const files = await Promise.all(keys.map(async (key) => toDevices(key, await loadFile(key))));
      if (!cancelled) setLoaded({ key: loadKey, devices: files.flat(), error: false });
    })().catch((e) => {
      console.error('Failed to load inventory:', e);
      if (!cancelled) setLoaded({ key: loadKey, devices: null, error: true });
    });
    return () => { cancelled = true; };
    // loadKey が変わったときだけ読み直す（絞り込み・並べ替えは読み込んだ分をその場で処理する）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey]);

  // 機種の指定だけで絞った件数（「全○件」）
  const total = useMemo(
    () => (all ? all.filter((d) => models.length === 0 || models.some((q) => matchesModel(q, d.modelName))).length : 0),
    [all, models],
  );

  const devices = useMemo(() => {
    if (!all) return [];
    const minPrice = toInt(params.get('minPrice'));
    const maxPrice = toInt(params.get('maxPrice'));
    const storage = toInt(params.get('storage'));
    const rank = params.get('rank');
    const minBattery = toInt(params.get('minBattery'));
    const batterySort = currentSort === 'battery_desc' || currentSort === 'battery_asc';
    const filtered = all.filter((d) =>
      (models.length === 0 || models.some((q) => matchesModel(q, d.modelName))) &&
      (!hasShop || d.shopName === shopQuery || findShop(d.shopName)?.alias === shopQuery) &&
      (minPrice === undefined || d.price >= minPrice) &&
      (maxPrice === undefined || d.price <= maxPrice) &&
      (storage === undefined || d.storage === storage) &&
      (!rank || d.conditionRank === rank) &&
      (!batterySort || d.batteryHealth !== null) &&
      // バッテリー最大容量が min% 以上。ランクS（未使用品）はバッテリーの表記がなくても含める（lib/deviceSearch.ts の minBatteryWhere と同じ）
      (minBattery === undefined || (d.batteryHealth ?? 0) >= minBattery || d.conditionRank === 'S'),
    );
    const byPrice = (a: Device, b: Device) => a.price - b.price;
    const cmp: Record<string, (a: Device, b: Device) => number> = {
      price_desc: (a, b) => b.price - a.price,
      battery_desc: (a, b) => (b.batteryHealth ?? 0) - (a.batteryHealth ?? 0) || byPrice(a, b),
      battery_asc: (a, b) => (a.batteryHealth ?? 0) - (b.batteryHealth ?? 0) || byPrice(a, b),
    };
    return filtered.sort(cmp[currentSort] ?? byPrice);
  }, [all, params, models, hasShop, shopQuery, currentSort]);

  const heading = modelQuery
    ? `${modelQuery} の中古在庫`
    : `中古${device.label}の在庫${hasShop ? `（${shopQuery}）` : ''}`;

  useEffect(() => {
    document.title = `${heading} | 中古スマホ一括検索`;
  }, [heading]);

  const updateParams = useUpdateParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  // 適用中の条件（チップ）。それぞれ URL のパラメータと対応していて、× でそのパラメータを外す
  const chips: { label: string; clear: Record<string, null> }[] = [];
  if (hasShop) chips.push({ label: shopQuery!, clear: { shop: null } });
  const storage = toInt(params.get('storage'));
  if (storage !== undefined) chips.push({ label: storage >= 1024 ? `${storage / 1024}TB` : `${storage}GB`, clear: { storage: null } });
  if (params.get('rank')) chips.push({ label: `ランク${params.get('rank')}`, clear: { rank: null } });
  const mb = toInt(params.get('minBattery'));
  if (mb !== undefined) chips.push({ label: `バッテリー${mb}%以上`, clear: { minBattery: null } });
  const lo = toInt(params.get('minPrice'));
  const hi = toInt(params.get('maxPrice'));
  if (lo !== undefined || hi !== undefined) {
    const label = lo !== undefined && hi !== undefined ? `${lo.toLocaleString()}〜${hi.toLocaleString()}円`
      : lo !== undefined ? `${lo.toLocaleString()}円〜` : `〜${hi!.toLocaleString()}円`;
    chips.push({ label, clear: { minPrice: null, maxPrice: null } });
  }
  const clearAll = () => updateParams({ shop: null, storage: null, rank: null, minBattery: null, minPrice: null, maxPrice: null });
  const minShown = devices.length ? devices.reduce((m, d) => Math.min(m, d.price), Infinity) : null;

  // 絞り込みの画面（スマホ）を開いている間は背面をスクロールさせず、Esc で閉じる
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [sheetOpen]);

  const filterKey = `${params.get('minPrice') ?? ''}-${params.get('maxPrice') ?? ''}`;

  return (
    <>
      <section className="bg-white border-b border-line">
        <div className="max-w-[1120px] mx-auto px-4 pt-3.5 pb-3 flex flex-col gap-2">
          <h1 className="text-xl font-bold">{heading}</h1>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-[13px] text-ink-sub">
              {all ? (
                <>
                  <strong className="text-ink">{devices.length.toLocaleString()}件</strong>
                  {devices.length !== total && `（全${total.toLocaleString()}件）`}
                  {minShown !== null && <> ・ 最安 <span className="text-price font-bold">{minShown.toLocaleString()}円</span></>}
                </>
              ) : error ? '在庫を読み込めませんでした。' : '在庫を読み込んでいます...'}
              {pageModel && (
                <> ・ <Link href={modelPagePath(pageModel)} className="text-brand-600 hover:text-brand-800">相場まとめ ›</Link></>
              )}
            </p>
            {/* PC では並び替えをここに置く（スマホは画面下の固定バー） */}
            <div className="hidden md:flex items-center gap-2">
              <label htmlFor="sort-pc" className="text-sm text-ink-sub">並び替え</label>
              <SortSelect currentSort={currentSort} idSuffix="pc" />
            </div>
          </div>

          {/* 種類の切り替え（機種を指定していないとき）。店の指定は引き継ぐ */}
          {!modelQuery && (
            <nav aria-label="種類" className="flex flex-wrap gap-2">
              {SEARCH_DEVICES.map((d) => {
                const qs = new URLSearchParams({ device: d.key, ...(hasShop ? { shop: shopQuery! } : {}) });
                return (
                  <Link key={d.key} href={`/search?${qs.toString()}`}
                    aria-current={device.key === d.key ? 'page' : undefined}
                    className={`h-9 px-3.5 inline-flex items-center rounded-full text-[13px] font-medium border transition-colors ${
                      device.key === d.key ? 'bg-brand-800 text-white border-brand-800' : 'bg-white border-gray-300 text-gray-700 hover:border-brand-600 hover:text-brand-600'
                    }`}>
                    {d.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button key={c.label} type="button" aria-label={`${c.label}の条件を外す`} onClick={() => updateParams(c.clear)}
                  className="h-8 pl-3 pr-2 rounded-full bg-brand-50 text-brand-800 text-xs flex items-center gap-1 hover:bg-brand-200">
                  {c.label}
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              ))}
              <button type="button" onClick={clearAll} className="h-8 px-2.5 text-xs text-ink-mute hover:text-ink">すべて解除</button>
            </div>
          )}

          <AdDisclosure compact />
          <p className="text-[11px] text-ink-mute">更新 {BUILD_TIME}</p>
        </div>
      </section>

      <div className="max-w-[1120px] mx-auto px-4 mt-3 md:grid md:grid-cols-[280px_minmax(0,1fr)] md:gap-6 md:items-start">
        {/* PC: 絞り込みを左に常に表示 */}
        <aside className="hidden md:block bg-white border border-line rounded-xl p-4" aria-label="絞り込み">
          <h2 className="text-base font-bold mb-4">絞り込み</h2>
          <FilterPanel key={filterKey} />
        </aside>

        <div className="min-w-0">
          {!all ? (
            error ? (
              <div className="text-center py-16 bg-white rounded-xl border border-line">
                <p className="text-ink-sub">在庫を読み込めませんでした。</p>
                <p className="text-sm text-ink-mute mt-2">時間をおいて、ページを読み込み直してください。</p>
              </div>
            ) : (
              <div className="bg-white border border-line rounded-xl overflow-hidden" aria-busy="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="h-[88px] border-b border-line-soft bg-ground/60 animate-pulse" />
                ))}
              </div>
            )
          ) : devices.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-line">
              <p className="text-ink-sub">在庫が見つかりませんでした。</p>
              <p className="text-sm text-ink-mute mt-2">条件を変更して検索してみてください。</p>
            </div>
          ) : (
            // 検索条件が変わったら作り直して、表示件数を最初に戻す
            <ClientDeviceList key={params.toString()} devices={devices} showModel={models.length !== 1} />
          )}
        </div>
      </div>

      {/* スマホ: 画面下の固定バー（絞り込み・並び替え） */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-30 px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white border-t border-line grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setSheetOpen(true)} aria-haspopup="dialog"
          className="h-12 rounded-xl bg-brand-600 text-white text-[15px] font-bold flex items-center justify-center gap-1.5 hover:bg-brand-800">
          <SlidersHorizontal className="w-[18px] h-[18px]" aria-hidden="true" />
          絞り込み（{chips.length}）
        </button>
        <SortSelect
          currentSort={currentSort}
          idSuffix="sp"
          className="h-12 rounded-xl border border-gray-300 bg-white text-ink text-[15px] font-bold px-3 text-center cursor-pointer"
        />
      </div>

      {/* スマホ: 絞り込みを下から出す画面 */}
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="絞り込み">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] flex flex-col bg-white rounded-t-2xl">
            <div className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
              <h2 className="text-base font-bold">絞り込み</h2>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="閉じる" className="w-11 h-11 -mr-2 flex items-center justify-center text-ink-sub">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4">
              <FilterPanel key={filterKey} />
            </div>
            <div className="shrink-0 px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={clearAll} className="h-12 px-4 rounded-xl border border-gray-300 text-[15px] font-bold text-ink">すべて解除</button>
              <button type="button" onClick={() => setSheetOpen(false)} className="h-12 rounded-xl bg-brand-600 text-white text-[15px] font-bold hover:bg-brand-800">
                {all ? `${devices.length.toLocaleString()}件を見る` : '閉じる'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** 絞り込んだ在庫を 20 件ずつ表示する（スクロールで続きを出す） */
function ClientDeviceList({ devices, showModel }: { devices: Device[]; showModel: boolean }) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const target = useRef<HTMLDivElement>(null);
  const hasMore = shown < devices.length;

  useEffect(() => {
    const el = target.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setShown((n) => n + PAGE_SIZE); },
      { rootMargin: '200px' }, // 少し手前から出す
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <div>
      <DeviceList>
        {devices.slice(0, shown).map((device) => (
          <DeviceCard key={device.id} device={device} showModel={showModel} />
        ))}
      </DeviceList>

      {hasMore ? (
        <div ref={target} className="flex justify-center py-6">
          <span className="text-xs text-ink-mute">
            {shown.toLocaleString()} / {devices.length.toLocaleString()}件・スクロールで続きを表示
          </span>
        </div>
      ) : (
        <p className="text-center py-6 text-xs text-ink-mute">
          すべての在庫を表示しました（合計 {devices.length.toLocaleString()} 件）
        </p>
      )}
    </div>
  );
}
