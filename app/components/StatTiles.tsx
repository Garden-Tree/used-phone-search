import type { StatTile } from "@/lib/buyNow";

const TONE: Record<StatTile["tone"], string> = { up: "text-warn", down: "text-safe", flat: "text-ink" };

/** 数字タイル（最大4枚・2列）。文ではなく数字を並べる。タイルが無ければ何も出さない */
/** compact: PC の右の固定バー用（11/15 ユーザー「下まで見えてない。詰めて」） */
export default function StatTiles({ tiles, compact = false }: { tiles: StatTile[]; compact?: boolean }) {
  if (tiles.length === 0) return null;
  return (
    <div className={`grid grid-cols-2 ${compact ? "gap-1.5" : "gap-2"}`}>
      {tiles.map((t) => (
        <div key={t.label} className={`bg-ground rounded-[10px] flex flex-col min-w-0 ${compact ? "px-2.5 py-1.5" : "p-2.5 gap-0.5"}`}>
          <span className="text-[10px] text-ink-mute">{t.label}</span>
          <span className={`text-[15px] font-bold leading-snug ${TONE[t.tone]}`}>{t.value}</span>
          {t.sub && <span className="text-[10px] text-ink-mute">{t.sub}</span>}
        </div>
      ))}
    </div>
  );
}
