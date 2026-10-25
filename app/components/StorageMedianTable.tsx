import Link from "next/link";
import type { StorageMedianRow } from "@/lib/modelStats";
import { storageLabel } from "@/lib/format";

/**
 * 機種ページの「容量別の相場（中央値）と最安値」（2026-10-25〜）。
 * 今までは容量別の最安値しか文字で出していなかったので、容量ごとの中央値と件数も表にする（数字は lib/modelStats.ts の getStorageMedians）。
 * 行はその容量で絞った検索へのリンク（ヒートマップのセルと同じ検索）。Apple Watch は容量ではなくケースのサイズ（mm）、MacBook は SSD
 */

const CARD = "bg-white border border-line rounded-xl";
const LINK = "text-brand-600 hover:text-brand-800";

export default function StorageMedianTable({ model, rows, kind, hrefOf, medianStorage }: {
  model: string;
  /** 容量の小さい順 */
  rows: StorageMedianRow[];
  /** 見出しの言葉（「容量」「サイズ」「SSD」） */
  kind: string;
  hrefOf: (storage: number) => string;
  /** ページの「相場」に使っている容量（行に印を付ける） */
  medianStorage: number | null;
}) {
  if (rows.length < 2) return null;
  return (
    <section className={`${CARD} p-3.5 flex flex-col gap-2`}>
      <h2 className="text-[15px] font-bold">{kind}別の相場（中央値）と最安値</h2>
      <table className="w-full text-[13px] tabular-nums">
        <caption className="sr-only">{model}の中古の{kind}ごとの中央値・最安値・在庫の件数</caption>
        <thead>
          <tr className="text-[11px] text-ink-mute">
            <th scope="col" className="text-left font-normal">{kind}</th>
            <th scope="col" className="text-right font-normal">相場（中央値）</th>
            <th scope="col" className="text-right font-normal">最安値</th>
            <th scope="col" className="text-right font-normal">件数</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.storage} className="border-t border-line-soft">
              <th scope="row" className="py-2 text-left font-bold">
                <Link href={hrefOf(r.storage)} className={`${LINK} underline-offset-2 hover:underline`}>{storageLabel(r.storage, model)}</Link>
                {r.storage === medianStorage && <span className="ml-1 text-[10px] font-normal text-ink-mute">相場に使用</span>}
              </th>
              <td className="py-2 text-right font-bold">{r.medianPrice === null ? "—" : `${r.medianPrice.toLocaleString()}円`}</td>
              <td className="py-2 text-right text-price font-bold">{r.minPrice.toLocaleString()}円</td>
              <td className="py-2 text-right text-ink-mute">{r.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-ink-mute">中央値は、その{kind}の在庫を安い順に並べた真ん中の値段。状態ランクをすべて含みます。</p>
    </section>
  );
}
