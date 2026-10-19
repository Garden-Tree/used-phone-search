import { storageLabel, yen } from "@/lib/format";

type Row = { storage: number; newPrice: number; usedMin: number; diff: number; pct: number };

const CARD = "bg-white border border-line rounded-xl";

/** 新品（公式）と中古の最安の差。容量ごとの行。iPhone の機種ページの同名セクションと同じ見た目 */
export default function NewVsUsedSection({ model, rows, source, checkedJa }: {
  model: string; rows: Row[]; source: { name: string; url: string }; checkedJa: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className={`${CARD} p-3.5 flex flex-col gap-2 md:col-span-2`}>
      <h2 className="text-[15px] font-bold">新品（{source.name}）との差</h2>
      <ul className="flex flex-col divide-y divide-line-soft">
        {rows.map((r) => (
          <li key={r.storage} className="py-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13px]">
            <span className="font-bold w-14">{storageLabel(r.storage, model)}</span>
            <span className="text-ink-sub">新品 {yen(r.newPrice)} <span aria-hidden="true">→</span> 中古の最安 <span className="text-price font-bold">{yen(r.usedMin)}</span></span>
            {r.diff > 0 ? (
              <span className="ml-auto text-safe font-bold">−{(r.diff / 10000).toFixed(1)}万円（−{r.pct}%）</span>
            ) : (
              <span className="ml-auto text-ink-mute">中古の最安が新品以上</span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-ink-mute">
        新品価格は <a href={source.url} target="_blank" rel="noopener" className="text-brand-600 underline underline-offset-2">{source.name}</a>（{checkedJa}時点・税込）。中古は在庫のある容量だけ、状態ランクをすべて含む最安値です。
      </p>
    </section>
  );
}
