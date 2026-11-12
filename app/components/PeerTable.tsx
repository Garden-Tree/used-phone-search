import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 機種ページの「世代ごとの相場」「watchOS 27 に対応するいちばん安い機種」「同じ ○インチの相場」で共有する表の枠（2026-11-12〜。見本 .claude/watch-links-mock/）。
 * 数字の列は右揃え・tabular-nums。このページの行は淡い藍で「このページ」、ほかの行は機種名が各機種のページへのリンク
 */

export const TH = "px-1 py-1.5 text-[10px] font-bold text-ink-mute text-right whitespace-nowrap border-t border-line-soft first:text-left first:pl-3 last:pr-3";
export const TD = "px-1 py-2 text-right whitespace-nowrap border-t border-line-soft first:text-left first:pl-3 last:pr-3";
export const TD_C = "!text-center";
export const PRICE = "text-price font-bold";

/** flat は枠なし（折りたたみのカードの中に置くとき） */
export function PeerBox({ title, sub, foot, flat, children }: { title: string; sub: string; foot?: ReactNode; flat?: boolean; children: ReactNode }) {
  return (
    <section className={flat ? "bg-white" : "bg-white border border-line rounded-xl overflow-hidden"}>
      <h2 className="px-3 pt-3 text-[15px] font-bold">{title}</h2>
      <p className="px-3 pb-2 text-[11px] text-ink-mute">{sub}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px] tabular-nums">{children}</table>
      </div>
      {foot && <p className="px-3 py-2 border-t border-line-soft text-[10px] text-ink-mute leading-relaxed">{foot}</p>}
    </section>
  );
}

/** 機種名のセル（このページはリンクにせず「このページ」の印） */
export function NameCell({ name, href, current, small }: { name: string; href: string; current: boolean; small?: string }) {
  return (
    <td className={`${TD} font-bold !whitespace-normal`}>
      {current ? (
        <span className="text-ink"><span className="whitespace-nowrap">{name}</span> <span className="inline-block px-[3px] text-[9px] leading-[14px] whitespace-nowrap font-bold text-brand-800 border border-brand-200 rounded">このページ</span></span>
      ) : (
        <Link href={href} className="text-brand-600 hover:text-brand-800 hover:underline underline-offset-2">{name}</Link>
      )}
      {small && <small className="block text-[10px] font-normal text-ink-mute">{small}</small>}
    </td>
  );
}

/** 差の列（安い＝青・高い＝黒・このページ／不明＝「—」） */
export function DiffCell({ diff, current }: { diff: number | null; current: boolean }) {
  if (current || diff === null) return <td className={`${TD} text-ink-mute`}>—</td>;
  return (
    <td className={`${TD} ${diff < 0 ? "text-[#2563eb] font-bold" : "text-ink"}`}>
      {diff < 0 ? `−${(-diff).toLocaleString()}` : diff > 0 ? `+${diff.toLocaleString()}` : "±0"}
    </td>
  );
}

/** ○×（不明は「—」） */
export function MarkCell({ value }: { value: boolean | null }) {
  if (value === null) return <td className={`${TD} ${TD_C} text-ink-mute`}>—</td>;
  return value
    ? <td className={`${TD} ${TD_C} text-safe font-bold`}>○</td>
    : <td className={`${TD} ${TD_C} text-ink-mute`}>×</td>;
}

export const rowClass = (current: boolean) => (current ? "bg-brand-50" : "");
