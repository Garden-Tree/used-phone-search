'use client';

import { useState } from 'react';
import type { PricePoint } from '@/lib/priceHistory';
import { yen } from '@/lib/format';

/**
 * 「最安値の推移（30日）」の折れ線にかぶせるホバーの層（11/23〜）。
 * 容量別・長い期間のグラフ（PriceHistoryChart）と同じく、指・マウスの位置にいちばん近い日の
 * 最安・中央値・在庫を出す。xPct・yPct は Sparkline が計算した各点の位置（枠に対する %）
 */
export default function SparklineHover({ points, xPct, yPct }: { points: PricePoint[]; xPct: number[]; yPct: number[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    let nearest = 0;
    for (let i = 1; i < xPct.length; i++) {
      if (Math.abs(xPct[i] - x) < Math.abs(xPct[nearest] - x)) nearest = i;
    }
    setHover(nearest);
  };

  const p = hover === null ? null : points[hover];
  return (
    <div className="absolute inset-0 touch-pan-y" onPointerMove={handleMove} onPointerDown={handleMove} onPointerLeave={() => setHover(null)}>
      {p && hover !== null ? (
        <>
          <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-stone-400" style={{ left: `${xPct[hover]}%` }} aria-hidden="true" />
          <span className="pointer-events-none absolute w-2.5 h-2.5 rounded-full bg-brand-600 ring-2 ring-white -translate-x-1/2 -translate-y-1/2" style={{ left: `${xPct[hover]}%`, top: `${yPct[hover]}%` }} aria-hidden="true" />
          <div
            // 線の反対側に出す（右半分なら左に・左半分なら右に）。グラフの上の見出しにかぶらないよう枠の中の上端に
            className={`pointer-events-none absolute z-10 top-0 rounded-lg bg-white/95 border border-line px-3 py-1.5 text-xs whitespace-nowrap shadow-sm ${xPct[hover] > 50 ? '-translate-x-full -ml-2' : 'ml-2'}`}
            style={{ left: `${xPct[hover]}%` }}
          >
            <p className="text-ink-mute">{p.date.replaceAll('-', '/')}</p>
            <p className="font-bold text-ink text-sm">最安 {yen(p.minPrice)}</p>
            <p className="text-ink-mute">中央値 {yen(p.medianPrice)}・在庫 {p.count}件</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
