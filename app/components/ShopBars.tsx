import Link from "next/link";
import type { ShopBarRow } from "@/lib/modelBreakdown";

const man = (n: number) => `${(n / 10000).toFixed(1)}万`;

/**
 * どの店が安い？ 店ごとの最安値の横棒。横軸は「全体の最安×0.9〜店ごとの最安の最高」。
 * 最安の店だけ赤（価格の色）、ほかは #818CF8、在庫3件未満の店は薄い灰。店が2店以下なら出さない。
 * 店名は、その店で絞った検索（hrefOf）へのリンク
 */
export default function ShopBars({ rows, hrefOf }: { rows: ShopBarRow[]; hrefOf: (shopName: string) => string }) {
  if (rows.length <= 2) return null;
  const min = rows[0].minPrice;
  const max = rows[rows.length - 1].minPrice;
  const lo = min * 0.9;
  const span = Math.max(max - lo, 1);
  return (
    <section className="bg-white border border-line rounded-xl p-3.5 md:px-4 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] md:text-base font-bold">どの店が安い？</h2>
        <span className="text-[10px] text-ink-mute whitespace-nowrap">各店の最安値（{man(min)}〜{man(max)}円）</span>
      </div>
      {rows.map((r, i) => {
        const few = r.count < 3;
        const best = i === 0;
        const w = Math.max(6, Math.round(((r.minPrice - lo) / span) * 100));
        return (
          <Link key={r.label} href={hrefOf(r.shopName)} className="grid grid-cols-[96px_1fr_92px] items-center gap-2 text-ink hover:bg-ground rounded">
            <span className={`text-[11px] md:text-xs font-bold truncate ${few ? "text-[#9CA3AF]" : ""}`}>{r.label}</span>
            <span className="h-3.5 bg-line-soft rounded-[7px] overflow-hidden flex" aria-hidden="true">
              <span className={best ? "bg-price" : few ? "bg-[#D1D5DB]" : "bg-[#818CF8]"} style={{ width: `${w}%` }} />
            </span>
            <span className={`text-xs text-right whitespace-nowrap ${few ? "text-[#9CA3AF]" : ""}`}>
              <span className={`font-bold ${best ? "text-price" : ""}`}>{r.minPrice.toLocaleString()}</span>
              <span className={`text-[10px] ${few ? "" : "text-ink-mute"}`}> {r.count.toLocaleString()}件</span>
            </span>
          </Link>
        );
      })}
      <p className="text-[10px] text-ink-mute">店名を押すとその店の在庫へ。在庫3件未満の店は薄く表示</p>
    </section>
  );
}
