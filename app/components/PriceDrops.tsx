import Link from "next/link";
import { slugToModel, modelPagePath } from "@/lib/catalog";
import { shortDate, type PriceDrop } from "@/lib/marketStats";
import { storageLabel, yen } from "@/lib/format";

/**
 * 相場（中央値）が下がった機種の一覧（相場一覧・トップ）。記録が足りない・下がった機種がないときは何も出さない
 */
export default function PriceDrops({ drops, title }: { drops: PriceDrop[]; title: string }) {
  // カタログから外した機種の記録は出さない（番号が飛ばないよう先に除く）
  const rows = drops.flatMap((d) => {
    const model = slugToModel(d.modelSlug);
    return model ? [{ ...d, model }] : [];
  });
  if (rows.length === 0) return null;
  const { fromDate, toDate } = rows[0];
  return (
    <section className="my-6">
      <h2 className="text-[17px] font-bold mb-1">{title}</h2>
      <p className="text-xs text-ink-mute mb-2.5">
        {shortDate(fromDate)} → {shortDate(toDate)} の相場（中央値）の変化。機種ごとに在庫のいちばん多い容量で比べています
      </p>
      <ol className="bg-white border border-line rounded-xl overflow-hidden md:grid md:grid-cols-2">
        {rows.map(({ model, ...d }) => {
          return (
            <li key={d.modelSlug} className="border-b border-line-soft md:odd:border-r">
              <Link
                href={modelPagePath(model)}
                className="flex items-center justify-between gap-3 px-3.5 py-3 text-ink hover:bg-ground"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold truncate">{model}</span>
                  <span className="block text-xs text-ink-mute">{storageLabel(d.storage)}・{yen(d.before)} → {yen(d.after)}</span>
                </span>
                <span className="shrink-0 text-right text-safe">
                  <span className="block text-sm font-bold">↓ {yen(d.drop)}</span>
                  <span className="block text-xs">{d.rate}%</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
