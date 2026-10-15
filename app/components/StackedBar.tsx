import Link from "next/link";
import type { Breakdown } from "@/lib/modelBreakdown";

type Seg = { key: string; label: string; short: string; count: number; cls: string };

/** 積み上げ棒1本。幅15%以上は「ラベル 件数」、5%以上は短い表記、5%未満は文字なし（下の凡例・一覧で補う） */
function Bar({ segs, total, name }: { segs: Seg[]; total: number; name: string }) {
  return (
    <div className="flex h-[22px] md:h-6 rounded-md overflow-hidden text-[10px] md:text-[11px] font-bold" role="img" aria-label={`${name}の内訳。${segs.map((s) => `${s.label} ${s.count}件`).join("、")}`}>
      {segs.map((s) => {
        const pct = (s.count / total) * 100;
        return (
          <span key={s.key} className={`${s.cls} flex items-center justify-center overflow-hidden whitespace-nowrap`} style={{ width: `${pct}%` }} title={`${s.label} ${s.count.toLocaleString()}件`}>
            {pct >= 15 ? `${s.short} ${s.count.toLocaleString()}` : pct >= 5 ? s.short : ""}
          </span>
        );
      })}
    </div>
  );
}

// ランクの色は docs/design.md（A 緑・B 青・C 橙・S 琥珀・それ以外 灰）
const RANK_META: Record<string, { hint: string; cls: string; text: string }> = {
  S: { hint: "未使用", cls: "bg-[#FEF3C7] text-[#92400E]", text: "text-[#92400E]" },
  A: { hint: "美品", cls: "bg-[#DCFCE7] text-[#166534]", text: "text-[#166534]" },
  B: { hint: "小傷", cls: "bg-[#DBEAFE] text-[#1E40AF]", text: "text-[#1E40AF]" },
  C: { hint: "傷あり", cls: "bg-[#FFEDD5] text-[#9A3412]", text: "text-[#9A3412]" },
};
const MAIN_RANKS = ["S", "A", "B", "C"];

const BATTERY_SEGS: { key: keyof Breakdown["battery"]; label: string; short: string; cls: string }[] = [
  { key: "b90", label: "90%以上", short: "90%以上", cls: "bg-safe text-white" },
  { key: "b85", label: "85〜89%", short: "85〜89", cls: "bg-[#5EEAD4] text-[#134E4A]" },
  { key: "b80", label: "80〜84%", short: "80〜84", cls: "bg-[#CCFBF1] text-[#134E4A]" },
  // 店が「80%以上」とだけ書く在庫。80〜100% のどこかなので、緑青のしま模様で区別する
  { key: "over80", label: "80%以上（店の表記）", short: "80%以上", cls: "bg-[repeating-linear-gradient(135deg,#CCFBF1_0_4px,#99F6E4_4px_8px)] text-[#134E4A]" },
  { key: "low", label: "80%未満", short: "80未満", cls: "bg-[#D1D5DB] text-ink-sub" },
  { key: "unknown", label: "不明", short: "不明", cls: "bg-line text-ink-sub" },
];

/**
 * ランク（S/A/B/C/その他）とバッテリー（90以上/85-89/80-84/80%以上の表記/80未満/不明）の内訳。1枚のカードに2本。
 * ランクの下に各ランクの最安値（押すとそのランクの検索へ）。バッテリーの値を持つ在庫がなければバッテリーは出さない
 */
export default function StackedBar({ breakdown, rankMin, rankHref }: {
  breakdown: Breakdown;
  /** ランク → そのランクの最安値 */
  rankMin: Map<string, number>;
  rankHref: (rank: string) => string;
}) {
  const { ranks, battery, batteryKnown, total } = breakdown;
  if (total === 0) return null;

  // S・A・B・C はそのまま、ほかのランク（D・J・ジャンクなど）は「その他」にまとめる
  const main = MAIN_RANKS.flatMap((k) => {
    const r = ranks.find((x) => x.key === k);
    return r ? [{ key: k, count: r.count }] : [];
  });
  const otherCount = ranks.filter((r) => !MAIN_RANKS.includes(r.key)).reduce((n, r) => n + r.count, 0);
  const otherMin = [...rankMin.entries()].filter(([k]) => !MAIN_RANKS.includes(k)).map(([, v]) => v);
  const showOther = otherCount > 0 && otherMin.length > 0;
  const rankSegs: Seg[] = [
    ...main.map((r) => ({ key: r.key, label: `ランク${r.key}`, short: r.key, count: r.count, cls: RANK_META[r.key].cls })),
    ...(otherCount > 0 ? [{ key: "other", label: "その他", short: "他", count: otherCount, cls: "bg-line text-ink-sub" }] : []),
  ];
  const batterySegs: Seg[] = BATTERY_SEGS.map((b) => ({ ...b, count: battery[b.key] })).filter((s) => s.count > 0);

  return (
    <section className="bg-white border border-line rounded-xl p-3.5 md:px-4 flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h2 className="text-[15px] md:text-base font-bold">
          状態ランクの内訳 <span className="text-[11px] font-normal text-ink-mute">{total.toLocaleString()}件</span>
        </h2>
        <Bar segs={rankSegs} total={total} name="状態ランク" />
        <div className="grid gap-1.5 text-[10px] md:text-[11px]" style={{ gridTemplateColumns: `repeat(${main.length + (showOther ? 1 : 0)}, minmax(0, 1fr))` }}>
          {main.map((r) => {
            const m = RANK_META[r.key];
            const price = rankMin.get(r.key);
            return (
              <Link key={r.key} href={rankHref(r.key)} className="flex flex-col text-ink">
                <span className={`font-bold ${m.text}`}>{r.key} {m.hint}</span>
                <span>{price ? `${price.toLocaleString()}円〜` : "-"}</span>
              </Link>
            );
          })}
          {showOther && (
            <div className="flex flex-col text-ink">
              <span className="font-bold text-ink-sub">その他</span>
              <span>{Math.min(...otherMin).toLocaleString()}円〜</span>
            </div>
          )}
        </div>
      </div>
      {batteryKnown > 0 && (
        <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
          <h2 className="text-[15px] md:text-base font-bold">バッテリー最大容量の内訳</h2>
          <Bar segs={batterySegs} total={total} name="バッテリー最大容量" />
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] md:text-[11px] text-ink-sub">
            {batterySegs.map((s) => (
              <span key={s.key} className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-sm ${s.cls.split(" ")[0]}`} aria-hidden="true" />
                <span className={s.key === "low" ? "text-warn font-bold" : ""}>{s.label} {s.count.toLocaleString()}</span>
              </span>
            ))}
          </div>
          {(battery.over80 > 0 || battery.unknown > 0) && (
            <p className="text-[10px] text-ink-mute leading-relaxed">
              {battery.over80 > 0 && "「80%以上（店の表記）」は、正確な数字ではなく「80%以上」とだけ書く店の在庫です。検索の「80%以上」には含まれます。"}
              {battery.unknown > 0 && "「不明」は最大容量を書かない店の在庫です。"}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
