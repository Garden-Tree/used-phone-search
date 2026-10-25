import type { BuyFact } from "@/lib/modelGuide";

/**
 * 機種ページの「<機種>の中古、今買うべき？（データで見る）」（2026-10-25〜）。
 * 「<機種> 中古 今買うべき」の検索に、意見ではなく数字で答える節。項目は lib/modelGuide.ts の buyFacts（データがない項目は出ない）。
 * 結論（「今買うのはあり？」）は下の ModelGuide にあるので、ここは事実だけを箇条書きにする
 */

const CARD = "bg-white border border-line rounded-xl";

export default function BuyNowFacts({ model, facts, asOf }: {
  model: string;
  facts: BuyFact[];
  /** 在庫の更新時刻（「10/25 14:40」）。なければ注記を出さない */
  asOf: string | null;
}) {
  if (facts.length === 0) return null;
  return (
    <section className={`${CARD} p-3.5 flex flex-col gap-2`}>
      <h2 className="text-[15px] font-bold">{model}の中古、今買うべき？（データで見る）</h2>
      <ul className="flex flex-col gap-1.5 list-disc pl-5">
        {facts.map((f) => (
          <li key={f.label} className="text-[13px] leading-[1.7] text-ink-sub">
            <strong className="text-ink">{f.label}：</strong>{f.text}
          </li>
        ))}
      </ul>
      {asOf && <p className="text-[11px] text-ink-mute">{asOf}時点の在庫と、毎日の価格の記録から。判断の材料として数字だけを並べています。</p>}
    </section>
  );
}
