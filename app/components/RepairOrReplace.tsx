import { appleRepair, appleRepairCheckedJa, APPLE_REPAIR_SOURCE } from "@/lib/appleRepairPrices";
import { medianLabel, yen } from "@/lib/format";

const CARD = "bg-white border border-line rounded-xl";
const SRC = "text-brand-600 underline underline-offset-2";

/**
 * 「修理するか、中古に買い替えるか」（iPhone の機種ページ。広告ではない）。
 * Apple 公式の保証対象外修理の料金（lib/appleRepairPrices.ts で確かめた機種だけ）と、このページの中古の相場・最安値を並べるだけ。
 */
export default function RepairOrReplace({ model, minPrice, medianPrice, medianStorage }: {
  model: string; minPrice: number | null; medianPrice: number | null; medianStorage: number | null;
}) {
  const repair = appleRepair(model);
  if (!repair || minPrice === null) return null;
  const rows = [
    { label: "電池交換（Apple）", value: repair.battery },
    { label: "画面修理（Apple）", value: repair.screen },
  ];
  return (
    <section className={`${CARD} p-3.5 flex flex-col gap-2 min-[1360px]:col-span-2`}>
      <h2 className="text-[15px] font-bold">修理するか、中古に買い替えるか</h2>
      <div className="grid grid-cols-2 gap-x-4">
        <ul className="flex flex-col divide-y divide-line-soft">
          {rows.map((r) => (
            <li key={r.label} className="py-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-[13px]">
              <span className="text-ink-sub">{r.label}</span>
              <span className="font-bold tabular-nums">{yen(r.value)}</span>
            </li>
          ))}
        </ul>
        <ul className="flex flex-col divide-y divide-line-soft">
          {medianPrice !== null && (
            <li className="py-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-[13px]">
              <span className="text-ink-sub">中古の{medianLabel(medianStorage, model)}</span>
              <span className="font-bold tabular-nums">{yen(medianPrice)}</span>
            </li>
          )}
          <li className="py-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-[13px]">
            <span className="text-ink-sub">中古の最安値</span>
            <span className="font-bold text-price tabular-nums">{yen(minPrice)}</span>
          </li>
        </ul>
      </div>
      <p className="text-[13px] text-ink-sub leading-relaxed">
        電池交換は{yen(repair.battery)}、画面修理は{yen(repair.screen)}。中古の{model}は{medianPrice !== null ? `相場${yen(medianPrice)}・` : ""}最安{yen(minPrice)}です。
      </p>
      <p className="text-[10px] text-ink-mute leading-relaxed">
        修理代は Apple 公式の保証対象外の料金（{appleRepairCheckedJa()}時点・税込・
        <a href={APPLE_REPAIR_SOURCE.battery} target="_blank" rel="noopener" className={SRC}>バッテリー</a>・
        <a href={APPLE_REPAIR_SOURCE.screen} target="_blank" rel="noopener" className={SRC}>画面</a>
        ）。AppleCare+ に入っている場合や、診断の結果で料金は変わります。中古は状態ランクをすべて含みます。
      </p>
    </section>
  );
}
