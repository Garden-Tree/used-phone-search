'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DeviceCard, { type Device } from '@/app/components/DeviceCard';
import SortSelect from '@/app/components/SortSelect';
import FilterPanel from '@/app/components/FilterPanel';
import AdDisclosure from '@/app/components/AdDisclosure';
import { ALL_DEVICE_PAGE_MODELS, modelPagePath } from '@/lib/catalog';
import { SEARCH_DEVICES, findSearchDevice, matchesModel, splitModelQuery } from '@/lib/modelMatch';
import type { InventoryFile, InventoryIndex } from '@/lib/searchData';
import { findShop } from '@/lib/shops';

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

  return (
    <>
      <div className="mb-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{heading}</h1>
            <p className="text-slate-600">
              {all ? `在庫 ${devices.length.toLocaleString()}件。スクロールでさらに表示します。` : error ? '在庫を読み込めませんでした。' : '在庫を読み込んでいます...'}
            </p>
            {pageModel && (
              <Link href={modelPagePath(pageModel)} className="inline-block mt-2 text-sm font-bold text-blue-600 hover:underline underline-offset-4">
                {pageModel}の容量別・ランク別の最安値まとめを見る &rarr;
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm font-medium text-slate-600">並び替え:</label>
            <SortSelect currentSort={currentSort} />
          </div>
        </div>

        <AdDisclosure compact />

        {/* 種類の切り替え（機種を指定していないとき）。店の指定は引き継ぐ */}
        {!modelQuery && (
          <nav aria-label="種類" className="flex flex-wrap gap-2">
            {SEARCH_DEVICES.map((d) => {
              const qs = new URLSearchParams({ device: d.key, ...(hasShop ? { shop: shopQuery! } : {}) });
              return (
                <Link key={d.key} href={`/search?${qs.toString()}`}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                    device.key === d.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                  }`}>
                  {d.label}
                </Link>
              );
            })}
          </nav>
        )}

        <FilterPanel key={`${params.get('minPrice') ?? ''}-${params.get('maxPrice') ?? ''}`} />
      </div>

      {!all ? (
        error ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-200">
            <p className="text-slate-500 text-lg">在庫を読み込めませんでした。</p>
            <p className="text-sm text-slate-400 mt-2">時間をおいて、ページを読み込み直してください。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-72 rounded-[2rem] border border-slate-100 bg-slate-50 animate-pulse" />
            ))}
          </div>
        )
      ) : devices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-lg">在庫が見つかりませんでした。</p>
          <p className="text-sm text-slate-400 mt-2">条件を変更して検索してみてください。</p>
        </div>
      ) : (
        // 検索条件が変わったら作り直して、表示件数を最初に戻す
        <ClientDeviceList key={params.toString()} devices={devices} />
      )}
    </>
  );
}

/** 絞り込んだ在庫を 20 件ずつ表示する（スクロールで続きを出す） */
function ClientDeviceList({ devices }: { devices: Device[] }) {
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
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {devices.slice(0, shown).map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>

      {hasMore ? (
        <div ref={target} className="flex justify-center py-12">
          <span className="text-sm font-medium text-slate-500">
            {shown.toLocaleString()} / {devices.length.toLocaleString()}件
          </span>
        </div>
      ) : (
        <div className="text-center py-16 border-t border-slate-100 mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-500 text-sm font-medium">
            すべての在庫を表示しました（合計 {devices.length.toLocaleString()} 件）
          </div>
        </div>
      )}
    </div>
  );
}
