import { yen } from "@/lib/format";
import type { PcMatrix } from "@/lib/pcInventory";

// 条件別の相場: 縦 CPU × 横 メモリ。マスは中央値（大）と最安値・件数（小）
export default function PcPriceMatrix({ m }: { m: PcMatrix }) {
  return (
    <div className="bg-white rounded-xl border border-line overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-ground text-xs text-ink-mute">
          <tr>
            <th className="text-left px-3 py-2 font-normal sticky left-0 bg-ground">CPU ＼ メモリ</th>
            {m.memories.map((mem) => (
              <th key={mem} className="text-center px-2 md:px-3 py-2 font-bold text-ink-sub">{mem}GB</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r) => (
            <tr key={r.label} className="border-t border-line-soft">
              <th scope="row" className="text-left px-2 md:px-3 py-2 font-bold text-ink text-xs md:text-sm whitespace-nowrap sticky left-0 bg-white">{r.label}</th>
              {m.memories.map((mem) => {
                const c = r.cells.get(mem);
                return (
                  <td key={mem} className="px-2 md:px-3 py-2 text-center align-top">
                    {c ? (
                      <>
                        <span className="block font-bold tabular-nums text-[13px] md:text-sm">{yen(c.medianPrice)}</span>
                        <span className="block text-[10px] text-ink-mute tabular-nums whitespace-nowrap">
                          {c.count > 1 ? <>最安 <span className="text-price">{yen(c.minPrice)}</span>・{c.count}件</> : "1件のみ"}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
