import type { WeeklyRow } from "@/lib/modelGuide";

/**
 * 機種ページの「週ごとの相場」（2026-10-25〜）。グラフ（最安値の推移）の下に、直近8週分を文字の表で出す。
 * 数字の作り方は lib/modelGuide.ts の weeklyRows・weeklySentence（相場の容量の記録。なければ全容量）。
 * 日付は見た目は「10/25」、<time> の dateTime に年つきの日付を持たせる（検索・AI が時点を取れるように）
 */

const CARD = "bg-white border border-line rounded-xl";

const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const signed = (n: number) => (n === 0 ? "±0円" : `${n > 0 ? "▲" : "▼"}${Math.abs(n).toLocaleString()}円`);

export default function PriceWeeklyTable({ model, rows, medianLabel, sentence, asOf }: {
  model: string;
  /** 新しい順（lib/modelGuide.ts の weeklyRows） */
  rows: WeeklyRow[];
  /** 「相場（128GB）」 */
  medianLabel: string;
  /** 表の上の1文（両端の在庫が少ないときは null） */
  sentence: string | null;
  /** 最新の記録の日付（ISO）。表の時点として注記に出す */
  asOf: string;
}) {
  if (rows.length < 2) return null;
  const year = Number(asOf.slice(0, 4));
  return (
    <section className={`${CARD} p-3.5 flex flex-col gap-2`}>
      <h2 className="text-[15px] font-bold">{model}の週ごとの{medianLabel}</h2>
      {sentence && <p className="text-[13px] text-ink-sub leading-[1.7]">{sentence}</p>}
      <table className="w-full text-[13px] tabular-nums">
        <caption className="sr-only">{model}の中古の週ごとの{medianLabel}・前週比・最安値・在庫数（{year}年・直近{rows.length}週）</caption>
        <thead>
          <tr className="text-[11px] text-ink-mute">
            <th scope="col" className="text-left font-normal">日付</th>
            <th scope="col" className="text-right font-normal">{medianLabel}</th>
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
      <p className="text-[11px] text-ink-mute">
        単位は円。1行目は最新（{asOf.replaceAll("-", "/")}）の記録、2行目からは7日ごとにいちばん近い日の記録。前週比は両方の週に在庫5件以上あるときだけ。
      </p>
    </section>
  );
}
