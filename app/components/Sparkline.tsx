import type { PricePoint } from "@/lib/priceHistory";

const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
};

const W = 330;
const H = 64;

/** 全容量の推移から、最後の記録の30日前以降の分だけ取り出す（古い順のまま） */
export function recentPoints(points: PricePoint[]): PricePoint[] {
  if (points.length === 0) return [];
  const since = new Date(`${points[points.length - 1].date}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 30);
  const sinceIso = since.toISOString().slice(0, 10);
  return points.filter((p) => p.date >= sinceIso);
}

/**
 * 最安値の推移（直近30日・全容量）の折れ線。軽い inline SVG だけ（JS なし）。終点に赤い点。
 * 右上に始点との差額、下に始点・終点の日付と金額。直近30日に2日分の記録がなければ何も出さない
 */
export default function Sparkline({ points: pts, title = "最安値の推移（30日）" }: { points: PricePoint[]; title?: string }) {
  if (pts.length < 2) return null;
  const first = pts[0];
  const end = pts[pts.length - 1];
  const prices = pts.map((p) => p.minPrice);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const span = Math.max(hi - lo, 1);
  const t0 = new Date(`${first.date}T00:00:00Z`).getTime();
  const t1 = new Date(`${end.date}T00:00:00Z`).getTime();
  const xOf = (date: string) => ((new Date(`${date}T00:00:00Z`).getTime() - t0) / (t1 - t0)) * W;
  // 上下に余白（点が枠からはみ出ないように）
  const yOf = (v: number) => 6 + (1 - (v - lo) / span) * (H - 14);
  const line = pts.map((p) => `${xOf(p.date).toFixed(1)},${yOf(p.minPrice).toFixed(1)}`).join(" ");
  const diff = end.minPrice - first.minPrice;
  const endY = yOf(end.minPrice);

  return (
    <section className="bg-white border border-line rounded-xl p-3.5 md:px-4 flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] md:text-base font-bold">{title}</h2>
        <span className={`text-xs md:text-[13px] font-bold ${diff > 0 ? "text-warn" : diff < 0 ? "text-safe" : "text-ink-mute"}`}>
          {diff > 0 ? `↑${diff.toLocaleString()}円` : diff < 0 ? `↓${(-diff).toLocaleString()}円` : "変化なし"}
        </span>
      </div>
      <div className="relative h-16 md:h-[120px] mx-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full" role="img" aria-label={`直近の最安値の推移。${first.minPrice.toLocaleString()}円から${end.minPrice.toLocaleString()}円へ`}>
          <line x1="0" y1={H - 4} x2={W} y2={H - 4} stroke="#E5E7EB" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <polyline fill="none" stroke="#4338CA" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={line} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute w-2 h-2 rounded-full bg-price -translate-x-1/2 -translate-y-1/2" style={{ left: "100%", top: `${(endY / H) * 100}%` }} aria-hidden="true" />
      </div>
      <div className="flex justify-between text-[10px] md:text-[11px] text-ink-mute">
        <span>{shortDate(first.date)} {first.minPrice.toLocaleString()}円</span>
        <span>{shortDate(end.date)} {end.minPrice.toLocaleString()}円</span>
      </div>
    </section>
  );
}
