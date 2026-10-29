import { yen } from "@/lib/format";
import type { PcMatrix } from "@/lib/pcInventory";
import PcPriceMatrix from "@/app/components/PcPriceMatrix";

/**
 * 条件別の相場を、まとまり（Core i3・i5・i7…／Air 13インチ・Pro 16インチ…）ごとのアコーディオンに分ける（10/29 ユーザー）。
 * 見出しの行に、件数と相場（マスの中央値）の幅。開くと、そのまとまりにある列（メモリ）だけの表
 */
export default function PcMatrixGroups({ m, head, order }: { m: PcMatrix; head?: string; order?: string[] }) {
  const groups = new Map<string, PcMatrix["rows"]>();
  for (const r of m.rows) {
    const key = r.group ?? r.label;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const rank = (g: string) => (order ? order.indexOf(g) + 1 || 99 : 0);
  const keys = [...groups.keys()].sort((a, b) => rank(a) - rank(b));

  return (
    <div className="bg-white rounded-xl border border-line overflow-hidden">
      {keys.map((key, i) => {
        const rows = groups.get(key)!;
        const memories = m.memories.filter((mem) => rows.some((r) => r.cells.has(mem)));
        const medians = rows.flatMap((r) => [...r.cells.values()].map((c) => c.medianPrice));
        const count = rows.reduce((n, r) => n + r.count, 0);
        const lo = Math.min(...medians);
        const hi = Math.max(...medians);
        return (
          <details key={key} className={`group ${i > 0 ? "border-t border-line-soft" : ""}`}>
            <summary className="min-h-12 flex items-center gap-3 px-4 py-2.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-ground">
              <span className="font-bold text-ink">{key}</span>
              <span className="text-xs text-ink-mute">{rows.length > 1 ? `${rows.length}種類・` : ""}{count.toLocaleString()}件</span>
              <span className="ml-auto text-right tabular-nums">
                <span className="block text-[10px] text-ink-mute">相場</span>
                <span className="font-bold text-sm">{lo === hi ? yen(lo) : `${yen(lo)}〜${yen(hi)}`}</span>
              </span>
              <span aria-hidden className="text-ink-mute transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="px-2 pb-3">
              <PcPriceMatrix m={{ ...m, memories, rows }} head={head} />
            </div>
          </details>
        );
      })}
    </div>
  );
}
