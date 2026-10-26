import Link from "next/link";
import { appleRepair, APPLE_REPAIR_CHECKED, APPLE_REPAIR_SOURCE } from "@/lib/appleRepairPrices";
import { REPAIR_PROGRAMS } from "@/lib/buyback";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";

const SRC = "underline underline-offset-2 hover:text-brand-600";
const PR_BADGE = <span className="text-[10px] font-normal text-ink-mute border border-line rounded px-1 py-px leading-none">PR</span>;

/** 1.0万円 単位（小数1桁） */
const man = (n: number) => `約${(Math.abs(n) / 10000).toFixed(1)}万円`;

/**
 * 「直す？買い替える？」（iPhone の機種ページの PR タイルの枠。10/27〜「修理で済ませるなら」の枠を置き換え）。
 * 上: Apple 公式の保証対象外修理の料金（lib/appleRepairPrices.ts で確かめた機種だけ。ない料金の行は出さない）と、
 *     この機種・1つ上の世代（lib/nextGeneration.ts。同じ容量の在庫があるときだけ）の中古の相場を並べ、差額を1行で添える。
 * 下: 修理の A8 リンク（「修理で済ませるなら」＋PR の表示・rel・data-shop-click は前の枠と同じ。1x1 の計測画像はページ側で1回だけ）
 */
export default function RepairOrReplace({ model, medianPrice, medianStorage, next }: {
  model: string;
  medianPrice: number | null;
  medianStorage: number | null;
  /** 1つ上の世代の、同じ容量（medianStorage）の相場 */
  next: { model: string; median: number } | null;
}) {
  const repair = appleRepair(model);
  const gb = medianStorage !== null ? storageLabel(medianStorage, model) : null;
  const rows: { label: React.ReactNode; value: number; price?: boolean }[] = [
    ...(repair ? [
      { label: "電池交換（Apple 公式）", value: repair.battery },
      { label: "画面修理（Apple 公式）", value: repair.screen },
    ] : []),
    ...(medianPrice !== null ? [{ label: <>中古の{model}{gb && `（${gb}）`}</>, value: medianPrice, price: true }] : []),
    ...(next ? [{
      label: <>中古の<Link href={modelPagePath(next.model)} className="text-brand-600 hover:text-brand-800">{next.model}</Link>{gb && `（${gb}）`}</>,
      value: next.median,
      price: true,
    }] : []),
  ];

  // 差額の1行: 買い替え先（1つ上の世代、なければ同じ機種の中古）の相場 − 修理代
  const target = next ? { name: `中古の${next.model}`, price: next.median } : medianPrice !== null ? { name: `中古の${model}`, price: medianPrice } : null;
  const diffText = (label: string, cost: number) => {
    const d = target!.price - cost;
    return `${label}なら${man(d)}${d >= 0 ? "安い" : "高い"}`;
  };
  const hint = repair && target
    ? `${target.name}に買い替えるのと比べると、${diffText("電池交換", repair.battery)}・${diffText("画面修理", repair.screen)}。`
    : null;

  return (
    <div className="bg-white border border-line rounded-xl p-3 flex flex-col gap-1.5">
      <h2 className="text-[13px] font-bold">直す？買い替える？</h2>
      {rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-line-soft">
          {rows.map((r, i) => (
            <li key={i} className="py-1 flex items-baseline justify-between gap-x-2 text-[12px]">
              <span className="text-ink-sub min-w-0">{r.label}{r.price && <span className="text-ink-mute">の相場</span>}</span>
              <span className={`shrink-0 font-bold tabular-nums ${r.price ? "text-price" : "text-ink"}`}>{yen(r.value)}</span>
            </li>
          ))}
        </ul>
      )}
      {hint && <p className="text-[12px] text-ink leading-snug">{hint}</p>}
      {repair && (
        <span className="text-[10px] text-ink-mute leading-snug">
          Apple 公式（<a href={APPLE_REPAIR_SOURCE.battery} target="_blank" rel="noopener" className={SRC}>電池</a>・
          <a href={APPLE_REPAIR_SOURCE.screen} target="_blank" rel="noopener" className={SRC}>画面</a>）・税込・{Number(APPLE_REPAIR_CHECKED.slice(5, 7))}/{Number(APPLE_REPAIR_CHECKED.slice(8, 10))}
        </span>
      )}
      <div className="mt-1 pt-1.5 border-t border-line-soft flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[10px] text-ink-mute">修理で済ませるなら {PR_BADGE}</span>
        {REPAIR_PROGRAMS.map((p) => (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="sponsored nofollow noopener"
            data-shop-click=""
            data-shop={`${p.name}（修理）`}
            data-model={model}
            data-link-type="a8"
            className="block py-1 hover:bg-ground rounded"
          >
            <span className="text-[13px] font-bold text-ink">{p.name} <span className="text-ink-mute" aria-hidden="true">›</span></span>
          </a>
        ))}
      </div>
    </div>
  );
}
