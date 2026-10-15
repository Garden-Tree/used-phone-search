import Link from "next/link";

// 安い順に4段階（濃い＝安い）。文字色は背景とのコントラストで決める
const TIERS = [
  "bg-[#0F766E] text-white",
  "bg-[#99F6E4] text-[#134E4A]",
  "bg-[#CCFBF1] text-[#134E4A]",
  "bg-ground text-ink-sub",
];

// ランクの見出しに添える短い説明（目安。基準は店ごとに違う）
const RANK_SHORT: Record<string, string> = { S: "未使用", A: "美品", B: "小傷", C: "傷あり" };

export type HeatCell = { minPrice: number; count: number; href: string };
export type HeatRow = { label: string; cells: (HeatCell | null)[] };

/**
 * 容量（MacBook はメモリ／SSD、Apple Watch はサイズ）× ランクの最安値のヒートマップ。
 * 表内の最安〜最高を4段階に等分して塗る。色だけに頼らず、金額と件数を必ず書く。セルは今までと同じ検索へのリンク
 */
export default function HeatCells({ title, ranks, rows, labelWidth = 52 }: { title: string; ranks: string[]; rows: HeatRow[]; labelWidth?: number }) {
  if (rows.length === 0 || ranks.length === 0) return null;
  const prices = rows.flatMap((r) => r.cells.flatMap((c) => (c ? [c.minPrice] : [])));
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const tierOf = (p: number) => (hi === lo ? 0 : Math.min(3, Math.floor(((p - lo) / (hi - lo)) * 4)));
  return (
    <section className="bg-white border border-line rounded-xl overflow-hidden">
      <div className="px-3.5 md:px-4 pt-3 pb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] md:text-base font-bold">{title}</h2>
        <span className="text-[10px] text-ink-mute whitespace-nowrap">濃い＝安い</span>
      </div>
      <div className="grid gap-1 px-2.5 md:px-3 pb-2.5" style={{ gridTemplateColumns: `${labelWidth}px repeat(${ranks.length}, minmax(0, 1fr))` }}>
        <div />
        {ranks.map((r) => (
          <div key={r} className="text-center text-[10px] md:text-[11px] text-ink-mute leading-tight">
            <span className="font-bold text-ink">{r}</span>
            {RANK_SHORT[r] && <span className="block text-[9px] md:text-[10px]">{RANK_SHORT[r]}</span>}
          </div>
        ))}
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <div className="flex items-center text-xs md:text-[13px] font-bold leading-tight">{row.label}</div>
            {row.cells.map((c, i) =>
              c ? (
                <Link key={ranks[i]} href={c.href} className={`${TIERS[tierOf(c.minPrice)]} rounded-lg px-1 py-2 md:py-2.5 flex flex-col items-center hover:opacity-80`}>
                  <span className={`${ranks.length > 4 ? "text-[11px]" : "text-xs"} md:text-[13px] font-bold`}>{c.minPrice.toLocaleString()}</span>
                  <span className="text-[9px] md:text-[10px]">{c.count.toLocaleString()}件</span>
                </Link>
              ) : (
                <div key={ranks[i]} className="rounded-lg py-2 flex items-center justify-center text-xs text-line" aria-label="在庫なし">-</div>
              ),
            )}
          </div>
        ))}
      </div>
      <p className="px-3.5 md:px-4 pb-3 text-[10px] text-ink-mute leading-relaxed">金額（円）は最安値。押すとその条件の在庫一覧へ。ランクの意味は目安で、基準は店ごとに違います。</p>
    </section>
  );
}
