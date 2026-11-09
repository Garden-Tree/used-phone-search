import { shopLinkProps, type Device } from "@/app/components/DeviceCard";
import { findShop } from "@/lib/shops";
import { storageLabel } from "@/lib/format";

type Row = { label: string; device: Device; placement: string };

/**
 * 機種ページの価格のカードの中に置く、条件ごとの最安の3行（2026-11-01〜・ユーザーが案Cを選んだ）。
 * どれでも → ランクB以上・電池85%以上 → ＋保証1年の店 と条件を上げると、いちばん安い値がいくら上がるかを見せる。
 * 行を押すと、その商品の店へ移る（11/6〜・案A。最初の店リンクが 1,930px 下にあったため。ideas/2026-11-04.md）。
 * placement で行ごとのクリックを shop_click に分ける（first_any・first_good・first_warranty）
 * embedded: 価格のカードの中に置く（11/3〜・案A。ChatGPT から来た人の最初の画面に保証1年の店の1台まで入れる）
 */
export default function PickSummary({ rows, embedded = false }: { rows: Row[]; embedded?: boolean }) {
  const base = rows[0].device.price;
  // 3行とも同じ容量なら見出しに1回だけ書く（スマホの幅に収める）
  const first = rows[0].device;
  const sameStorage = rows.every((r) => r.device.storage === first.storage);
  return (
    <div className={embedded ? "border-t border-line-soft pt-2" : "bg-white border border-line rounded-xl px-3.5 pt-2.5 pb-1"}>
      <p className="flex items-center gap-1.5 text-[11px] text-ink-mute">
        条件ごとの最安{sameStorage ? `（${storageLabel(first.storage, first.modelName)}）` : ""}
        <span className="text-[10px] font-normal border border-line rounded px-1 py-px leading-none">PR</span>
      </p>
      {rows.map((r, i) => {
        const d = r.device;
        const shop = findShop(d.shopName);
        const meta = [shop?.label ?? d.shopName, sameStorage ? null : storageLabel(d.storage, d.modelName), `ランク${d.conditionRank}`, d.batteryHealth !== null ? `電池${d.batteryHealth}%` : null]
          .filter(Boolean) as string[];
        return (
          <a key={r.label} {...shopLinkProps(d)} data-placement={r.placement}
            className={`grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 items-center py-2 hover:bg-ground ${i > 0 ? "border-t border-line-soft" : ""}`}>
            <span className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold leading-tight">{r.label}</span>
              <span className="flex flex-wrap text-[11px] text-ink-mute leading-snug">{meta.map((m, j) => <span key={j} className="whitespace-nowrap">{m}{j < meta.length - 1 ? "・" : ""}</span>)}</span>
            </span>
            <b className="text-price text-base tabular-nums">{d.price.toLocaleString()}</b>
            <span className="flex flex-col items-end min-w-[56px] tabular-nums">
              <span className="text-[11px] text-ink-mute">{i === 0 ? "最安" : `+${(d.price - base).toLocaleString()}`}</span>
              <span className="text-xs font-bold text-brand-600 whitespace-nowrap">店へ ›</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
