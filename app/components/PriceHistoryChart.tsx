'use client';

import { useMemo, useState } from 'react';
import type { PriceHistory, PricePoint } from '@/lib/priceHistory';
import { yen, storageLabel as gbLabel } from "@/lib/format";

// 価格推移の storage=0 は「全容量」の集計
const storageLabel = (gb: number) => (gb === 0 ? "全容量" : gbLabel(gb));

// グラフの寸法（viewBox 座標。幅は親要素に合わせて伸縮する）
const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
};

/** 見やすい目盛り（1, 2, 5 × 10^n 刻み）を3〜5本 */
function niceTicks(min: number, max: number): number[] {
  const span = Math.max(max - min, 1000);
  const raw = span / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

function Chart({ points }: { points: PricePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const { xs, ys, ticks, yOf } = useMemo(() => {
    const prices = points.map((p) => p.minPrice);
    const ticks = niceTicks(Math.min(...prices), Math.max(...prices));
    const lo = ticks[0];
    const hi = ticks[ticks.length - 1];
    const yOf = (v: number) => PAD.top + PLOT_H - ((v - lo) / (hi - lo)) * PLOT_H;
    const xs = points.map((_, i) => PAD.left + (points.length === 1 ? PLOT_W / 2 : (i / (points.length - 1)) * PLOT_W));
    return { xs, ys: prices.map(yOf), ticks, yOf };
  }, [points]);

  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const baseline = yOf(ticks[0]);
  const area = `${line} L${xs[xs.length - 1]},${baseline} L${xs[0]},${baseline} Z`;
  const last = points.length - 1;
  const active = hover ?? last;

  // x 軸ラベルは最初・中央・最後の3点だけ（重なり防止）
  const xLabelIdx = [...new Set([0, Math.floor(last / 2), last])];

  const handleMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = PAD.left + ((e.clientX - rect.left) / rect.width) * PLOT_W;
    let nearest = 0;
    for (let i = 1; i < xs.length; i++) {
      if (Math.abs(xs[i] - x) < Math.abs(xs[nearest] - x)) nearest = i;
    }
    setHover(nearest);
  };

  const p = points[active];
  const tipLeftPct = (xs[active] / W) * 100;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`最安値の推移。${points[0].date}の${yen(points[0].minPrice)}から${points[last].date}の${yen(points[last].minPrice)}`}>
        {/* 目盛り線（1px の実線、背景からひと段階だけ濃いグレー） */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yOf(t)} y2={yOf(t)} stroke="#e7e5e4" strokeWidth={1} />
            <text x={PAD.left - 8} y={yOf(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#78716c">
              {t >= 10000 ? `${t / 10000}万` : t.toLocaleString()}
            </text>
          </g>
        ))}
        {xLabelIdx.map((i) => (
          <text key={i} x={xs[i]} y={H - 8} fontSize={11} fill="#78716c"
            textAnchor={i === 0 && last > 0 ? 'start' : i === last && last > 0 ? 'end' : 'middle'}>
            {shortDate(points[i].date)}
          </text>
        ))}

        <path d={area} fill="#2a78d6" fillOpacity={0.1} />
        <path d={line} fill="none" stroke="#2a78d6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* クロスヘア */}
        {hover !== null && (
          <line x1={xs[active]} x2={xs[active]} y1={PAD.top} y2={baseline} stroke="#a8a29e" strokeWidth={1} />
        )}
        {/* 注目点（白い2pxのリングで線の上でも見やすく） */}
        <circle cx={xs[active]} cy={ys[active]} r={5} fill="#2a78d6" stroke="#ffffff" strokeWidth={2} />

        {/* ホバー判定用の透明な領域（線より広く取る） */}
        <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} fill="transparent"
          onPointerMove={handleMove} onPointerDown={handleMove} onPointerLeave={() => setHover(null)} />
      </svg>

      <div
        className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl bg-white/95 border border-slate-200 shadow-sm px-3 py-2 text-xs whitespace-nowrap"
        style={{ left: `clamp(70px, ${tipLeftPct}%, calc(100% - 70px))` }}
      >
        <p className="text-slate-500">{p.date.replaceAll('-', '/')}{hover === null && '（最新）'}</p>
        <p className="font-black text-slate-900 text-sm">最安 {yen(p.minPrice)}</p>
        <p className="text-slate-500">中央値 {yen(p.medianPrice)}・在庫 {p.count}件</p>
      </div>
    </div>
  );
}

export default function PriceHistoryChart({ history, model }: { history: PriceHistory; model: string }) {
  // 全容量 → 容量の小さい順。記録が2日分未満の容量はタブに出さない（全容量は常に出す）
  const storages = Object.keys(history).map(Number)
    .filter((s) => s === 0 || history[s].length >= 2)
    .sort((a, b) => a - b);
  const [storage, setStorage] = useState(0);
  const points = history[storage] ?? [];

  if (points.length < 2) {
    return (
      <p className="text-sm text-slate-500 bg-slate-50 rounded-2xl p-5">
        {points.length === 1
          ? `${points[0].date.replaceAll('-', '/')} から価格の記録を始めました。2日分以上たまるとグラフを表示します。`
          : `${model}の価格の記録はまだありません。`}
      </p>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];
  const diff = last.minPrice - first.minPrice;

  return (
    <div>
      {storages.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="容量">
          {storages.map((s) => (
            <button key={s} role="tab" aria-selected={s === storage} onClick={() => setStorage(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                s === storage ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}>
              {storageLabel(s)}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-slate-600 mb-3">
        {first.date.replaceAll('-', '/')} から {last.date.replaceAll('-', '/')} までに、最安値は
        <span className="font-bold text-slate-900">
          {diff === 0 ? '変わっていません' : `${yen(Math.abs(diff))}${diff < 0 ? '下がりました' : '上がりました'}`}
        </span>
        。
      </p>

      <Chart key={storage} points={points} />

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-800">表で見る</summary>
        <div className="max-h-72 overflow-y-auto mt-2 border border-slate-100 rounded-xl">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left font-semibold px-4 py-2">日付</th>
                <th className="text-right font-semibold px-4 py-2">最安値</th>
                <th className="text-right font-semibold px-4 py-2">中央値</th>
                <th className="text-right font-semibold px-4 py-2">在庫数</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((pt) => (
                <tr key={pt.date} className="border-t border-slate-100">
                  <td className="px-4 py-1.5 text-slate-600">{pt.date.replaceAll('-', '/')}</td>
                  <td className="px-4 py-1.5 text-right font-bold text-slate-900">{yen(pt.minPrice)}</td>
                  <td className="px-4 py-1.5 text-right text-slate-600">{yen(pt.medianPrice)}</td>
                  <td className="px-4 py-1.5 text-right text-slate-500">{pt.count}件</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
