import React from 'react';

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
  shopName: string;
  price: number;
  url: string;
  isSoldOut: boolean;
};

export default function DeviceCard({ device }: { device: Device }) {
  return (
    <div className="group relative bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)] transition-all duration-300 border border-slate-100 dark:border-zinc-800 hover:-translate-y-1 overflow-hidden">
      {/* Status Badge */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
          device.conditionRank === 'S' || device.conditionRank === 'A' 
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' 
            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
        }`}>
          Rank {device.conditionRank}
        </span>
        {device.isSoldOut && (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
            SOLD OUT
          </span>
        )}
      </div>

      {/* Main Info */}
      <div className="mt-2 mb-6 pr-20">
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">{device.manufacturer}</p>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
          {device.modelName}
        </h2>
        <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 dark:text-zinc-400">
          <span>{device.storage}GB</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-600"></span>
          <span className="truncate">{device.color}</span>
        </div>
      </div>

      {/* Specs Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 dark:bg-zinc-950/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
        <div>
          <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1">バッテリー</p>
          <p className="font-semibold text-slate-700 dark:text-zinc-300">
            {device.batteryHealth ? `${device.batteryHealth}%` : '不明'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1">ネットワーク</p>
          <p className="font-semibold text-slate-700 dark:text-zinc-300 truncate" title={device.networkStatus || '不明'}>
            {device.networkStatus || '不明'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1">SIMロック</p>
          <p className="font-semibold text-slate-700 dark:text-zinc-300">
            {device.simUnlocked ? 'SIMフリー' : 'ロックあり'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1">販売店</p>
          <p className="font-semibold text-slate-700 dark:text-zinc-300 truncate" title={device.shopName}>
            {device.shopName}
          </p>
        </div>
      </div>

      {/* Footer / Price / Action */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800">
        <div>
          <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1">価格</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            ¥{device.price.toLocaleString()}
          </p>
        </div>
        <a 
          href={device.isSoldOut ? '#' : getAffiliateUrl(device)}
          target={device.isSoldOut ? '_self' : '_blank'}
          rel="noopener noreferrer"
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            device.isSoldOut 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500' 
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/25 dark:bg-blue-500 dark:hover:bg-blue-600'
          }`}
        >
          {device.isSoldOut ? '売り切れ' : '詳細を見る'}
        </a>
      </div>
    </div>
  );
}

// アフィリエイトリンクの生成ヘルパー
function getAffiliateUrl(device: Device): string {
  if (device.shopName === 'ゲオモバイル') {
    const a8mat = '45IED7+DQR8HE+4J34+BW0YB';
    return `https://px.a8.net/svt/ejp?a8mat=${a8mat}&a8ejpredirect=${encodeURIComponent(device.url)}`;
  }
  if (device.shopName === 'にこスマ') {
    const a8mat = '45IED7+DCGTYQ+4O7U+BW0YB';
    return `https://px.a8.net/svt/ejp?a8mat=${a8mat}&a8ejpredirect=${encodeURIComponent(device.url)}`;
  }
  return device.url;
}
