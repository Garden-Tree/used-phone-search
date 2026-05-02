'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import DeviceCard, { Device } from './DeviceCard';

interface InfiniteDeviceListProps {
  initialDevices: Device[];
}

export default function InfiniteDeviceList({
  initialDevices,
}: InfiniteDeviceListProps) {
  const searchParams = useSearchParams();
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [skip, setSkip] = useState(initialDevices.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialDevices.length >= 20);
  const observerTarget = useRef<HTMLDivElement>(null);

  const searchParamsString = searchParams.toString();

  // Reset when search parameters change (except when triggered by initialDevices update)
  useEffect(() => {
    setDevices(initialDevices);
    setSkip(initialDevices.length);
    setHasMore(initialDevices.length >= 20);
  }, [initialDevices, searchParamsString]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const params = new URLSearchParams(searchParamsString);
      params.set('skip', skip.toString());
      params.set('take', '20');

      const response = await fetch(`/api/devices?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const newDevices: Device[] = await response.json();

      if (newDevices.length === 0) {
        setHasMore(false);
      } else {
        setDevices((prev) => {
          // Prevent duplicates just in case
          const existingIds = new Set(prev.map(d => d.id));
          const uniqueNewDevices = newDevices.filter(d => !existingIds.has(d.id));
          return [...prev, ...uniqueNewDevices];
        });
        setSkip((prev) => prev + newDevices.length);
        if (newDevices.length < 20) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Failed to load more devices:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' } // Load earlier
    );

    observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
      observer.disconnect();
    };
  }, [hasMore, loading, skip, searchParamsString]);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>

      {hasMore && (
        <div 
          ref={observerTarget} 
          className="flex justify-center py-12"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 animate-pulse">
              在庫をさらに読み込み中...
            </span>
          </div>
        </div>
      )}

      {!hasMore && devices.length > 0 && (
        <div className="text-center py-16 border-t border-slate-100 dark:border-zinc-800/50 mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            すべての在庫を表示しました（合計 {devices.length} 件）
          </div>
        </div>
      )}
    </div>
  );
}
