import { storageLabel, yen } from "@/lib/format";
import { BUYBACK_SHOPS, type BuybackCell } from "@/lib/buybackPrices";

/**
 * 買取価格の表（店ごと・きれいな状態）。セルをタップすると店へ（ネットオフは A8・PR、ほかは価格が載っているページ）。
 * 機種ページ（容量ごとの行）と /iphone/kaitori（機種ごとの行）で共有する。いちばん高いセルに色を付ける
 */
export default function BuybackPrices({ rows, model, rowLabel }: {
  rows: { key: string; label: React.ReactNode; sub?: string; cells: BuybackCell[]; best: BuybackCell | null }[];
  /** GA の shop_click の data-model（機種ページは機種名、一覧はページ名） */
  model: (key: string) => string;
  rowLabel: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-line overflow-x-auto">
      <table className="w-full text-[12px] md:text-[13px] tabular-nums">
        <caption className="sr-only">店ごとの買取価格（きれいな状態）。タップで店のページへ</caption>
        <thead className="bg-ground text-[11px] text-ink-mute">
          <tr>
            <th scope="col" className="text-left font-normal pl-3 pr-1 py-2">{rowLabel}</th>
            {BUYBACK_SHOPS.map((s) => (
              <th key={s.name} scope="col" className="text-right font-normal px-1.5 py-2 last:pr-3 whitespace-nowrap">
                {s.name}<span className="block text-[10px] underline-offset-2">{s.goodLabel}{s.a8Href ? "・PR" : ""}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-line-soft">
              <th scope="row" className="text-left font-normal pl-3 pr-1 py-2 whitespace-nowrap">
                {r.label}
                {r.sub && <span className="block text-[10px] text-ink-mute">{r.sub}</span>}
              </th>
              {BUYBACK_SHOPS.map((s) => {
                const c = r.cells.find((x) => x.shop === s.name);
                const top = c && r.best && c.shop === r.best.shop && r.cells.length > 1;
                return (
                  <td key={s.name} className="text-right px-0.5 py-1 last:pr-1.5">
                    {c ? (
                      <a href={c.href} target="_blank" rel={c.linkType === "a8" ? "sponsored nofollow noopener" : "nofollow noopener"}
                        data-shop-click="" data-shop={`${c.shop}（買取）`} data-model={model(r.key)} data-link-type={c.linkType}
                        className={`block rounded-lg px-1.5 py-1.5 font-bold whitespace-nowrap hover:bg-ground ${top ? "text-price bg-price/5" : "text-ink"}`}>
                        {yen(c.price)}<span className="hidden md:inline text-ink-mute font-normal" aria-hidden="true"> ›</span>
                      </a>
                    ) : <span className="px-2 text-ink-mute">—</span>}
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

/** 容量の行ラベル（機種ページ用） */
export const storageRowLabel = (storage: number, model: string) => storageLabel(storage, model);
