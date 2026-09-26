import React from 'react';
import { RAKUTEN_GEO_SHOP, rakutenAffiliateUrl } from '@/lib/rakutenGeo';

// Define the type for the device object
export type Device = {
  id: string;
  manufacturer: string;
  modelName: string;
  storage: number;
  color: string;
  conditionRank: string;
  batteryHealth: number | null;
  networkStatus: string | null;
  simUnlocked: boolean;
  carrier: string | null;
  shopName: string;
  price: number;
  url: string;
  isSoldOut: boolean;
};

export default function DeviceCard({ device }: { device: Device }) {
  const href = getAffiliateUrl(device);
  // アフィリエイトリンクには Google のガイドラインに従い sponsored を付与する
  const isAffiliate = href !== device.url || /\.afl\.rakuten\.co\.jp\//.test(href);
  const rel = isAffiliate ? 'sponsored noopener noreferrer' : 'noopener noreferrer';

  // キャリア・SIMロック状態のバッジ表示ロジック
  const renderStatusBadges = () => {
    const carrier = device.carrier;
    const isDomesticSimFree = carrier === '国内版SIMフリー' || carrier === 'Apple';

    // 1. パターンA（Apple直販 / 国内版SIMフリーの場合）
    if (isDomesticSimFree) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-500/20">
          SIMフリー（Apple版）
        </span>
      );
    }

    const hasCarrier = carrier && carrier !== '不明';
    const networkStatus = device.networkStatus || '不明';

    // 「版」が既に含まれているかチェック
    const carrierName = hasCarrier ? (carrier.endsWith('版') ? carrier : `${carrier}版`) : '';

    return (
      <div className="flex flex-wrap gap-1.5">
        {device.simUnlocked ? (
          // 2. パターンB（SIMロック解除済みの場合）
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-500/20">
            {hasCarrier ? `SIMフリー（${carrierName}）` : 'SIMフリー'}
          </span>
        ) : (
          // 3. パターンC（SIMロックありの場合）
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-500/20">
            {hasCarrier ? `SIMロック（${carrierName}）` : 'SIMロックあり'}
          </span>
        )}

        {/* 利用制限バッジ（不明・null以外の場合のみ表示） */}
        {device.networkStatus && device.networkStatus !== '不明' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">
            利用制限: {device.networkStatus}
          </span>
        )}
      </div>
    );
  };

  // ランクごとのスタイルを取得（SIMバッジと同じく「薄い背景＋濃い文字」に変更）
  const getRankStyles = (rank: string) => {
    switch (rank.toUpperCase()) {
      case 'S':
        return 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-500/20';
      case 'A':
        return 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-500/20';
      case 'B':
        return 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-500/20';
      case 'C':
        return 'bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-500/20';
      case 'D':
        return 'bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-500/20';
      case 'J':
      case 'ジャンク':
        return 'bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-500/20';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <a
      href={device.isSoldOut ? '#' : href}
      target={device.isSoldOut ? '_self' : '_blank'}
      rel={rel}
      className={`group relative bg-white rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-200/60 hover:-translate-y-1.5 flex flex-col h-full overflow-hidden ${device.isSoldOut ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
    >
      {/* Top Section: Rank & Battery */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          <span className={`px-4 py-2 text-sm font-black rounded-full uppercase tracking-wider ${getRankStyles(device.conditionRank)}`}>
            Rank {device.conditionRank}
          </span>
          {device.batteryHealth !== null ? (
            <span className={`px-4 py-2 text-sm font-bold rounded-full ring-1 ring-inset ${device.batteryHealth >= 80
              ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20'
              : 'bg-rose-50 text-rose-600 ring-rose-500/20'
              }`}>
              {(() => {
                if (device.batteryHealth === 100) return '🔋 100%';
                if (device.shopName === 'イオシス' || device.shopName === 'ダイワンテレコム') {
                  return device.batteryHealth >= 80 ? '🔋 80%以上' : '🔋 80%未満';
                }
                return `🔋 ${device.batteryHealth}%`;
              })()}
            </span>
          ) : (
            <span className="px-4 py-2 text-sm font-bold rounded-full bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-500/10">
              🔋 -
            </span>
          )}
        </div>
        {device.isSoldOut && (
          <span className="px-3 py-1.5 text-xs font-black rounded-full bg-rose-600 text-white animate-pulse">
            SOLD OUT
          </span>
        )}
      </div>

      {/* Main Info: Model & Storage */}
      <div className="mb-5">
        <h2 className="text-2xl font-extrabold text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
          {device.modelName.replace(/iPhone(\d+)/i, 'iPhone $1')}
        </h2>
        <div className="flex items-center gap-3 text-base font-bold text-slate-400">
          <span>{device.storage}GB</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
          <span className="truncate font-medium">{device.color}</span>
        </div>
      </div>

      {/* Smart Badges */}
      <div className="mb-8 flex-grow">
        {renderStatusBadges()}
      </div>

      {/* Price & Shop */}
      <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {device.shopName}
          </p>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-red-600">¥</span>
            <span className="text-3xl font-black text-red-600 tracking-tighter">
              {device.price.toLocaleString()}
            </span>
          </div>

          {/* Transition Icon */}
          <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${device.isSoldOut
            ? 'bg-slate-50 text-slate-200'
            : 'bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white shadow-sm'
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
}

// アフィリエイトリンクの生成ヘルパー
function getAffiliateUrl(device: Device): string {
  if (device.shopName === 'ゲオモバイル') {
    const a8mat = '45IED7+DQR996+4J34+BW0YB';
    return `https://px.a8.net/svt/ejp?a8mat=${a8mat}&a8ejpredirect=${encodeURIComponent(device.url)}`;
  }
  if (device.shopName === 'にこスマ') {
    const a8mat = '45IED7+DCGUQI+4O7U+BW0YB';
    return `https://px.a8.net/svt/ejp?a8mat=${a8mat}&a8ejpredirect=${encodeURIComponent(device.url)}`;
  }
  if (device.shopName === 'エムモバ') {
    const a8mat = '45IED7+DB9ZIY+5I5M+HUD03';
    return `https://px.a8.net/svt/ejp?a8mat=${a8mat}&a8ejpredirect=${encodeURIComponent(device.url)}`;
  }
  if (device.shopName === 'ダイワンテレコム') {
    const a8mat = '45IED7+DD2ACA+3I5Y+ZPD5F';
    return `https://px.a8.net/svt/ejp?a8mat=${a8mat}&a8ejpredirect=${encodeURIComponent(device.url)}`;
  }
  if (device.shopName === RAKUTEN_GEO_SHOP) {
    return rakutenAffiliateUrl(device.url);
  }
  return device.url;
}
