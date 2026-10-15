/** 価格帯バー: 左端＝最安値、右端＝ランクSの最高値（なければ相場×1.3）。相場に黒線、未使用（ランクS）の最安に琥珀線。左端から相場までを緑青で塗る */

const man = (n: number) => `${(n / 10000).toFixed(1).replace(/\.0$/, "")}万`;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

export default function PriceBand({ min, median, rankSMin, rankSMax }: { min: number; median: number; rankSMin: number | null; rankSMax: number | null }) {
  const hiRaw = rankSMax ?? Math.round(median * 1.3);
  // 相場より右に余白を残す（相場が右端に張り付かないように）
  const hi = Math.max(hiRaw, Math.round(median * 1.05), rankSMin ?? 0);
  if (!(hi > min)) return null;
  const pos = (v: number) => clamp((v - min) / (hi - min));
  const m = pos(median);
  const s = rankSMin !== null ? pos(rankSMin) : null;
  // 相場と未使用のラベルが近いときは、相場のラベルを線の左に出す
  const mLabelRight = m > 0.85 || (s !== null && s - m < 0.16 && s >= m);
  const showMinLabel = m > 0.16;
  return (
    <div className="flex flex-col gap-1" role="img" aria-label={`価格帯。最安値${min.toLocaleString()}円、相場${median.toLocaleString()}円${rankSMin !== null ? `、未使用品${rankSMin.toLocaleString()}円から` : ""}`}>
      <div className="relative h-4 text-[10px] text-ink-sub" aria-hidden="true">
        {showMinLabel && <span className="absolute left-0">最安</span>}
        <span className="absolute font-bold text-ink whitespace-nowrap" style={{ left: `${m * 100}%`, transform: mLabelRight ? "translateX(calc(-100% - 4px))" : "translateX(-50%)" }}>相場</span>
        {s !== null && <span className="absolute text-inspect-800 whitespace-nowrap" style={{ left: `${s * 100}%`, transform: s > 0.85 ? "translateX(calc(-100% - 4px))" : "translateX(4px)" }}>未使用</span>}
      </div>
      <div className="relative h-2.5 bg-line-soft rounded-[5px]" aria-hidden="true">
        <div className="absolute left-0 top-0 h-2.5 bg-safe rounded-l-[5px]" style={{ width: `${m * 100}%` }} />
        <div className="absolute -top-[3px] w-0.5 h-4 bg-ink" style={{ left: `${m * 100}%` }} />
        {s !== null && <div className="absolute -top-[3px] w-0.5 h-4 bg-inspect-700" style={{ left: `${s * 100}%` }} />}
      </div>
      <div className="flex justify-between text-[10px] text-ink-mute" aria-hidden="true">
        <span>{man(min)}</span>
        <span>{man(hi)}</span>
      </div>
    </div>
  );
}
