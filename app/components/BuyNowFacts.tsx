import type { BuyFact } from "@/lib/modelGuide";

/**
 * 機種ページの「<機種>の中古、今買うべき？」（2026-10-25〜）。
 * 10/27〜 文ではなく「見出し ／ 数字・記号」の行だけ（lib/modelGuide.ts の buyFacts。データがない行は出ない）。
 * 最安値・相場・件数は要約カードにあるので、ここには出さない。結論（「今買うのはあり？」）は下の ModelGuide
 */

const CARD = "bg-white border border-line rounded-xl";
const TONE: Record<NonNullable<BuyFact["tone"]>, string> = { up: "text-warn", down: "text-safe", flat: "text-ink" };

export default function BuyNowFacts({ model, facts }: { model: string; facts: BuyFact[] }) {
  if (facts.length === 0) return null;
  return (
    <section className={`${CARD} p-3.5 flex flex-col gap-1`}>
      <h2 className="text-[15px] font-bold">{model}の中古、今買うべき？</h2>
      <dl className="flex flex-col divide-y divide-line-soft text-[13px] tabular-nums">
        {facts.map((f) => (
          <div key={f.label} className="py-2 flex items-baseline justify-between gap-3">
            <dt className="text-ink-sub">{f.label}</dt>
            <dd className={`font-bold text-right ${f.tone ? TONE[f.tone] : "text-ink"}`}>{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
