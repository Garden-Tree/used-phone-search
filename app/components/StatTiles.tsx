import type { StatTile } from "@/lib/buyNow";

const TONE: Record<StatTile["tone"], string> = { up: "text-warn", down: "text-safe", flat: "text-ink" };

/** 数字タイル（最大4枚・2列）。文ではなく数字を並べる。タイルが無ければ何も出さない */
export default function StatTiles({ tiles }: { tiles: StatTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {tiles.map((t) => (
        <div key={t.label} className="bg-ground rounded-[10px] p-2.5 flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] text-ink-mute">{t.label}</span>
          <span className={`text-[15px] font-bold leading-snug ${TONE[t.tone]}`}>{t.value}</span>
          {t.sub && <span className="text-[10px] text-ink-mute">{t.sub}</span>}
        </div>
      ))}
    </div>
  );
}
