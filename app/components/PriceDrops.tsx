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
    <section className="my-8">
      <h2 className="text-xl md:text-2xl font-bold mb-1">{title}</h2>
      <p className="text-xs text-slate-400 mb-4">
        {shortDate(fromDate)} → {shortDate(toDate)} の相場（中央値）の変化。機種ごとに在庫のいちばん多い容量で比べています
      </p>
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map(({ model, ...d }, i) => {
          return (
            <li key={d.modelSlug}>
              <Link
                href={modelPagePath(model)}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
              >
                <span className="shrink-0 w-6 text-center text-sm font-black text-slate-400">{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-slate-800 group-hover:text-blue-600 truncate">{model}</span>
                  <span className="block text-xs text-slate-400">{storageLabel(d.storage)}・{yen(d.before)} → {yen(d.after)}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-black text-emerald-600">▼{yen(d.drop)}</span>
                  <span className="block text-xs text-emerald-600">{d.rate}%</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
