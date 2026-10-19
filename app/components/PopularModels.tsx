import Link from "next/link";
import { modelPagePath } from "@/lib/catalog";
import { POPULAR_SEARCH_MODELS } from "@/lib/popularModels";
import { getModelMarket, type ModelMarket } from "@/lib/marketStats";
import { rethrowDuringBuild } from "@/lib/buildGuard";
import { yen } from "@/lib/format";

/** 検索でよく見られている機種への内部リンク。最安値は機種ごとの集計（getModelMarket）から。在庫がなければ価格は出さない */
export default async function PopularModels() {
  let market = new Map<string, ModelMarket>();
  try {
    market = await getModelMarket([...POPULAR_SEARCH_MODELS]);
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("popular models market failed:", error);
  }
  return (
    <section className="pt-5 flex flex-col gap-2.5">
      <h2 className="text-[17px] font-bold">よく検索されている機種</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {POPULAR_SEARCH_MODELS.map((m) => {
          const r = market.get(m);
          return (
            <li key={m}>
              <Link href={modelPagePath(m)} className="bg-white border border-line rounded-xl px-3.5 py-2.5 flex items-baseline justify-between gap-2 hover:border-brand-600">
                <span className="text-[13px] font-bold text-brand-600">{m} の中古最安値</span>
                {r && <span className="text-[13px] font-bold text-price whitespace-nowrap">{yen(r.minPrice)}〜</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
