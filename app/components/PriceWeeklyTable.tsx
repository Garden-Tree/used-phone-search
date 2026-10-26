import { moveOf, weeklyMove, type WeeklyRow } from "@/lib/modelGuide";

/**
 * 機種ページの「週ごとの相場」（2026-10-25〜）。グラフ（最安値の推移）の下に、直近8週分を文字の表で出す。
 * 数字の作り方は lib/modelGuide.ts の weeklyRows・weeklyMove（相場の容量の記録。なければ全容量）。
 * 日付は見た目は「10/25」、<time> の dateTime に年つきの日付を持たせる（検索・AI が時点を取れるように）。
 * 10/27〜 文と注記をやめ、見出しの右に「7週 ↘ −3,000円」だけ
 */

const CARD = "bg-white border border-line rounded-xl";

const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const signed = (n: number) => (n === 0 ? "±0円" : `${n > 0 ? "▲" : "▼"}${Math.abs(n).toLocaleString()}円`);
const TONE = { up: "text-warn", down: "text-safe", flat: "text-ink-mute" } as const;

export default function PriceWeeklyTable({ model, rows }: {
  model: string;
  /** 新しい順（lib/modelGuide.ts の weeklyRows） */
  rows: WeeklyRow[];
}) {
  if (rows.length < 2) return null;
  const year = Number(rows[0].date.slice(0, 4));
  const w = weeklyMove(rows);
  const move = w ? moveOf(w.diff, w.base) : null;
  return (
    <section className={`${CARD} p-3.5 flex flex-col gap-2`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold">{model}の週ごとの相場</h2>
        {w && move && <span className={`text-xs font-bold whitespace-nowrap tabular-nums ${TONE[move.tone]}`}>{w.weeks}週 {move.text}</span>}
      </div>
      <table className="w-full text-[13px] tabular-nums">
        <caption className="sr-only">{model}の中古の週ごとの相場・前週比・最安値・在庫数（{year}年・直近{rows.length}週・単位は円）</caption>
        <thead>
          <tr className="text-[11px] text-ink-mute">
            <th scope="col" className="text-left font-normal">日付</th>
            <th scope="col" className="text-right font-normal">相場</th>
            <th scope="col" className="text-right font-normal">前週比</th>
            <th scope="col" className="text-right font-normal">最安値</th>
            <th scope="col" className="text-right font-normal">在庫</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} className="border-t border-line-soft">
              <td className="py-1.5 text-ink-sub"><time dateTime={r.date}>{md(r.date)}</time></td>
              <td className="py-1.5 text-right font-bold">{r.medianPrice.toLocaleString()}</td>
              <td className={`py-1.5 text-right ${r.diff && r.diff < 0 ? "text-safe" : r.diff && r.diff > 0 ? "text-price" : "text-ink-mute"}`}>{r.diff === null ? "—" : signed(r.diff)}</td>
              <td className="py-1.5 text-right">{r.minPrice.toLocaleString()}</td>
              <td className="py-1.5 text-right text-ink-mute">{r.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
