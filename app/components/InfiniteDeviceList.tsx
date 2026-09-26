'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import DeviceCard, { Device } from './DeviceCard';

const PAGE_SIZE = 20;

interface InfiniteDeviceListProps {
  initialDevices: Device[];
  totalCount: number;
}

/**
 * 検索結果の無限スクロール。検索条件が変わったときは親が key を変えて作り直すので、
 * ここでは「今の条件の続きを読む」ことだけを扱う
 */
export default function InfiniteDeviceList({ initialDevices, totalCount }: InfiniteDeviceListProps) {
  const searchParams = useSearchParams();
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const loadingRef = useRef(false); // IntersectionObserver の連続発火で二重に読み込まないためのガード
  const observerTarget = useRef<HTMLDivElement>(null);

  const hasMore = devices.length < totalCount && !error;

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set('skip', String(devices.length));
      params.set('take', String(PAGE_SIZE));

      const response = await fetch(`/api/devices?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const newDevices: Device[] = await response.json();

      if (newDevices.length === 0) {
        // 取得中に在庫が入れ替わった場合など。これ以上は読まない
        setError(true);
      } else {
        setDevices((prev) => {
          const existingIds = new Set(prev.map((d) => d.id));
          return [...prev, ...newDevices.filter((d) => !existingIds.has(d.id))];
        });
      }
    } catch (e) {
      console.error('Failed to load more devices:', e);
      setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [searchParams, devices.length]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }, // 少し手前から読み込む
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>

      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-slate-500 animate-pulse">
              {loading ? '在庫をさらに読み込み中...' : `${devices.length.toLocaleString()} / ${totalCount.toLocaleString()}件`}
            </span>
          </div>
        </div>
      )}

      {error && devices.length < totalCount && (
        <div className="text-center py-8">
          <button
            onClick={() => { setError(false); }}
            className="px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-blue-600 transition-colors"
          >
            読み込みに失敗しました。もう一度試す
          </button>
        </div>
      )}

      {!hasMore && !error && devices.length > 0 && (
        <div className="text-center py-16 border-t border-slate-100 mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-500 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            すべての在庫を表示しました（合計 {devices.length.toLocaleString()} 件）
          </div>
        </div>
      )}
    </div>
  );
}
