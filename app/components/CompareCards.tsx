import Link from "next/link";
import { COMPARE_PAIRS, comparePath } from "@/lib/compare";
import { yen } from "@/lib/format";

/**
 * 比較ページへのカード（トップ・/iphone・/ipad・/pixel・/galaxy の「よく比べられる組」）。
 * 差は2機種の最安値の差。どちらかの最安値がないときは差を出さずにリンクだけ。
 * COMPARE_PAIRS に無い組（比較ページが無い）は出さない
 */
export default function CompareCards({
  pairs,
  prices,
  showBrand = false,
  className = "grid grid-cols-2 md:grid-cols-3 gap-2",
}: {
  pairs: [string, string][];
  /** 機種ごとの最安値（getModelMarket / minPriceByModel の結果をそのまま渡す） */
  prices: Map<string, { minPrice: number }>;
  /** 複数の種類を並べるとき（トップ）に「iPad」などを上に小さく出す */
  showBrand?: boolean;
  className?: string;
}) {
  const cards = pairs
    .filter(([a, b]) => COMPARE_PAIRS.some(([x, y]) => x === a && y === b))
    .map(([a, b]) => {
      const pa = prices.get(a)?.minPrice;
      const pb = prices.get(b)?.minPrice;
      return { a, b, diff: pa !== undefined && pb !== undefined ? Math.abs(pa - pb) : null };
    });
  if (cards.length === 0) return null;
  return (
    <div className={className}>
      {cards.map(({ a, b, diff }) => (
        <Link key={comparePath(a, b)} href={comparePath(a, b)} className="bg-white border border-line rounded-xl p-2.5 flex flex-col gap-1 text-ink hover:border-brand-200">
          {showBrand && <span className="text-[10px] text-ink-mute">{brandOf(a)}</span>}
          <span className="text-[11px] font-bold">{shortModel(a)} vs {shortModel(b)}</span>
          {diff !== null ? (
            <>
              <span className="text-[10px] text-ink-mute">最安の差</span>
              <span className="text-sm font-bold tabular-nums">{yen(diff)}</span>
            </>
          ) : (
            <span className="text-[11px] text-brand-600">違いを見る ›</span>
          )}
        </Link>
      ))}
    </div>
  );
}

function brandOf(model: string): string {
  return model.match(/^(iPhone|iPad|Pixel|Galaxy)/)?.[1] ?? "";
}

/** "iPhone 13" → "13"・"Galaxy S24" → "S24"・"iPad Air (第5世代)" → "Air (第5世代)"（無印の iPad・Pixel はそのまま） */
function shortModel(model: string): string {
  return model.replace(/^(iPhone|Galaxy) /, "").replace(/^iPad (?=[A-Za-z])/, "");
}
