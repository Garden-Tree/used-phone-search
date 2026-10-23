import Link from "next/link";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import type { DailyRow, MonthlyRow } from "@/lib/modelGuide";
import type { SameBudgetRow } from "@/lib/sameBudget";

/**
 * 機種ページの「今買うのはあり？」「中古相場の推移」「同じ予算で買える他の機種」「データの出典」（2026-10-23〜）。
 * 折りたたまずに文字と表で出す（検索・AI の概要が読めるように。数字の作り方は lib/modelGuide.ts・lib/sameBudget.ts）
 */

const CARD = "bg-white border border-line rounded-xl";
const LINK = "text-brand-600 hover:text-brand-800";
const H2 = "text-[15px] font-bold";

const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const ym = (m: string) => `${m.slice(0, 4)}年${Number(m.slice(5, 7))}月`;
const signed = (n: number) => (n === 0 ? "±0円" : `${n > 0 ? "+" : "−"}${Math.abs(n).toLocaleString()}円`);

export type SourceItem = { label: string; text: string; href?: string };

export default function ModelGuide(p: {
  model: string;
  verdict: string;
  notes: string[];
  trendText: string | null;
  medianLabel: string;
  daily: DailyRow[];
  monthly: MonthlyRow[];
  same: SameBudgetRow[];
  sources: SourceItem[];
}) {
  const shownDays = 7;
  const head = p.daily.slice(0, shownDays);
  const rest = p.daily.slice(shownDays);
  const dayTable = (rows: DailyRow[]) => (
    <table className="w-full text-[13px] tabular-nums">
      <tbody>
        {rows.map((r) => (
          <tr key={r.date} className="border-t border-line-soft">
            <td className="py-1.5 text-ink-sub">{md(r.date)}</td>
            <td className="py-1.5 text-right">{r.minPrice.toLocaleString()}</td>
            <td className="py-1.5 text-right font-bold">{r.medianPrice.toLocaleString()}</td>
            <td className={`py-1.5 text-right ${r.diff && r.diff < 0 ? "text-safe" : r.diff && r.diff > 0 ? "text-price" : "text-ink-mute"}`}>{r.diff === null ? "—" : signed(r.diff)}</td>
            <td className="py-1.5 text-right text-ink-mute">{r.count.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const dayHead = (
    <table className="w-full text-[11px] text-ink-mute">
      <thead>
        <tr>
          <th className="text-left font-normal">日付</th>
          <th className="text-right font-normal">最安値</th>
          <th className="text-right font-normal">{p.medianLabel}</th>
          <th className="text-right font-normal">前日比</th>
          <th className="text-right font-normal">件数</th>
        </tr>
      </thead>
    </table>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 今買うのはあり？ */}
      <section className={`${CARD} p-3.5 flex flex-col gap-2`}>
        <h2 className={H2}>{p.model}は今買うのはあり？</h2>
        {p.verdict && <p className="text-[14px] font-bold leading-[1.7]">{p.verdict}</p>}
        {p.notes.length > 0 && (
          <ul className="flex flex-col gap-1.5 list-disc pl-5">
            {p.notes.map((t) => <li key={t} className="text-[13px] text-ink-sub leading-[1.7]">{t}</li>)}
          </ul>
        )}
      </section>

      {/* 中古相場の推移（表） */}
      {p.daily.length > 0 && (
        <section className={`${CARD} p-3.5 flex flex-col gap-2`}>
          <h2 className={H2}>{p.model}の中古相場の推移</h2>
          {p.trendText && <p className="text-[13px] text-ink-sub leading-[1.7]">{p.trendText}</p>}
          <div className="flex flex-col">
            {dayHead}
            {dayTable(head)}
          </div>
          {rest.length > 0 && (
            <details className="group">
              <summary className={`text-[13px] cursor-pointer list-none [&::-webkit-details-marker]:hidden ${LINK}`}>過去{p.daily.length}日分を見る</summary>
              <div className="mt-1">{dayTable(rest)}</div>
            </details>
          )}
          {p.monthly.length > 1 && (
            <div className="flex flex-col mt-1">
              <h3 className="text-[13px] font-bold">月ごとの{p.medianLabel}</h3>
              <table className="w-full text-[13px] tabular-nums">
                <thead>
                  <tr className="text-[11px] text-ink-mute">
                    <th className="text-left font-normal">月</th>
                    <th className="text-right font-normal">平均</th>
                    <th className="text-right font-normal">安い日〜高い日</th>
                  </tr>
                </thead>
                <tbody>
                  {p.monthly.map((m) => (
                    <tr key={m.month} className="border-t border-line-soft">
                      <td className="py-1.5 text-ink-sub">{ym(m.month)}{m.days < 20 && <span className="text-[11px] text-ink-mute">（{m.days}日分）</span>}</td>
                      <td className="py-1.5 text-right font-bold">{yen(m.avgMedian)}</td>
                      <td className="py-1.5 text-right text-ink-sub">{yen(m.low)}〜{yen(m.high)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-ink-mute">毎日の記録（Amazon 整備済み品は含めない）。前日比は、その日と前の日の在庫がどちらも5件以上のときだけ出しています。</p>
        </section>
      )}

      {/* 同じ予算で買える他の機種 */}
      {p.same.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={H2}>同じ予算で買える他の機種</h2>
          <div className="grid gap-2 md:grid-cols-3">
            {p.same.map((r) => (
              <Link key={r.model} href={modelPagePath(r.model)} className={`${CARD} p-3 flex flex-col gap-0.5 hover:border-brand-600`}>
                <span className="text-[11px] font-bold text-ink-mute">{Math.abs(r.diff) <= r.market.medianPrice * 0.03 ? "ほぼ同じ値段" : r.diff < 0 ? `${yen(-r.diff)}安い` : `${yen(r.diff)}高い`}</span>
                <span className="text-[15px] font-bold">{r.model}</span>
                <span className="text-[13px] text-ink-sub">相場{r.market.medianStorage ? `（${storageLabel(r.market.medianStorage, r.model)}）` : ""} <span className="font-bold text-ink">{yen(r.market.medianPrice)}</span>・最安 {yen(r.market.minPrice)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* データの出典 */}
      <section className={`${CARD} p-3.5 flex flex-col gap-2`}>
        <h2 className={H2}>データの出典</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px] leading-[1.7]">
          {p.sources.map((s) => (
            <div key={s.label} className="contents">
              <dt className="text-ink-mute font-bold whitespace-nowrap">{s.label}</dt>
              <dd className="text-ink-sub">{s.href ? <a href={s.href} target="_blank" rel="noopener noreferrer" className={`${LINK} underline underline-offset-2`}>{s.text}</a> : s.text}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[12px] text-ink-mute">
          集め方の詳しい説明は<Link href="/about#data" className={`${LINK} underline underline-offset-2`}>「このサイトについて」</Link>にあります。
        </p>
      </section>
    </div>
  );
}
