import { SPEC_ROWS, specOf } from "@/lib/iphoneSpecs";
import { storageLabel, yen } from "@/lib/format";
import type { Faq } from "@/lib/modelFaq";

/** 比較ページの文章（データから作る。意見は書かない）。React に依存させない */

export type SideStats = {
  minPrice: number | null;
  medianPrice: number | null;
  /** 相場の容量（在庫がいちばん多い容量） */
  medianStorage?: number | null;
  count: number;
  shopCount: number;
  /** ランクB以上の最安値（lib/modelBest.ts の getGoodRankMin） */
  goodMin: number | null;
};

/** 値が違うスペックの項目（lib/*Specs.ts の表示用ラベル・値のまま）。どちらかのスペックが無ければ null */
export function specDiffs(a: string, b: string): { label: string; va: string; vb: string }[] | null {
  const sa = specOf(a);
  const sb = specOf(b);
  if (!sa || !sb) return null;
  return SPEC_ROWS.map((r) => ({ label: r.label, va: r.value(sa), vb: r.value(sb) })).filter((r) => r.va !== r.vb);
}

/** 「発売は A が 2022年、B が 2025年。チップは … それ以外（画面・充電端子）は同じです」 */
export function specDiffSentence(a: string, b: string): string {
  const diffs = specDiffs(a, b);
  if (diffs === null) return "";
  const sa = specOf(a)!;
  const sb = specOf(b)!;
  if (diffs.length === 0) return `${a} と ${b} は、発売・チップ・画面・充電端子・生体認証がすべて同じです。`;
  const head = diffs.map((d) => `${d.label}は ${a} が ${d.va}、${b} が ${d.vb}`).join("。") + "。";
  const same = SPEC_ROWS.filter((r) => r.value(sa) === r.value(sb)).map((r) => r.label);
  return same.length > 0 ? `${head}それ以外（${same.join("・")}）は同じです。` : head;
}

/** metadata の description 用: 違いの要点（先頭の2項目まで）。違いが無い・スペックが無いときは空 */
export function specDiffBrief(a: string, b: string): string {
  const diffs = specDiffs(a, b);
  if (!diffs || diffs.length === 0) return "";
  return `違いは${diffs.slice(0, 2).map((d) => `${d.label}（${d.va}と${d.vb}）`).join("と")}など。`;
}

/** 発売の年月（lib/*Specs.ts の released＝公式で確かめた値。"2025年" か "2024年8月"）。無ければ undefined */
function releaseOf(model: string): { y: number; m?: number; label: string } | undefined {
  const r = specOf(model)?.released;
  const hit = r?.match(/^(\d{4})年(?:(\d{1,2})月)?$/);
  if (!r || !hit) return undefined;
  return { y: Number(hit[1]), m: hit[2] ? Number(hit[2]) : undefined, label: r };
}

/**
 * 最安値が安いほう（cheap）・高いほう（pricey）の選び方のひと言。
 * 高いほうが新しいとは限らない（旧世代の上位モデル・後から出た廉価版など）ので、発売の新旧は公式の発売年月で決める。
 * - 高いほうが新しい: 「新しい機種を選ぶなら差額を払って pricey」
 * - 安いほうが新しい: 安いほうが新しいことを書き、高いほうは違いで判断
 * - 差が半年未満・同じ年（月まで分からない）・発売が分からない: 新旧・優劣を言わない
 */
export function choiceSentence(cheap: string, pricey: string): string {
  const rc = releaseOf(cheap);
  const rp = releaseOf(pricey);
  if (!rc || !rp) return `価格重視なら ${cheap}、${pricey} は差額に見合うかを、カメラ・画面・発売年などの違いで判断することになります。`;
  const judge = "差額に見合うかを、チップ・画面・カメラなどの違いで判断";
  // 月まで分かれば月の差、年だけなら年の差。半年未満の差（Pixel 9 Pro と 9 Pro XL など同じ世代の出し分け）は新旧と言わない
  const months = rc.m !== undefined && rp.m !== undefined ? (rp.y - rc.y) * 12 + (rp.m - rc.m) : (rp.y - rc.y) * 12;
  const order = Math.abs(months) < 6 ? 0 : months;
  const when = `${pricey} は${rp.label}、${cheap} は${rc.label}発売`;
  if (order > 0) return `価格重視なら ${cheap}、より新しい機種を選ぶなら差額を払って ${pricey}（${when}）という選び方になります。`;
  if (order < 0) return `発売は ${cheap}（${rc.label}）のほうが ${pricey}（${rp.label}）より新しく、価格重視なら ${cheap}、${pricey} は${judge}することになります。`;
  const same = rc.label === rp.label ? `どちらも${rc.label}発売で` : `${when}で`;
  return `${same}、価格重視なら ${cheap}、${pricey} は${judge}することになります。`;
}

/** 2つの数を「X のほうが ○円 高い／低い」にする。同じなら「同じ」 */
function gap(a: string, b: string, va: number, vb: number, unit: "yen" | "n", word: ["高い", "安い"] | ["多い", "少ない"]): string {
  const d = vb - va;
  if (d === 0) return "同じ";
  const [big] = d > 0 ? [b] : [a];
  const amount = unit === "yen" ? yen(Math.abs(d)) : `${Math.abs(d).toLocaleString()}件`;
  return `${big} のほうが ${amount}${word[0]}`;
}

/** 価格差の読み方（相場・在庫数・取扱店数・ランクB以上の最安値の差。データだけ） */
function priceReadingParts(a: string, b: string, sa: SideStats, sb: SideStats): { median: string; stock: string; good: string } {
  const parts = { median: "", stock: "", good: "" };
  if (sa.medianPrice !== null && sb.medianPrice !== null) {
    const g = gap(a, b, sa.medianPrice, sb.medianPrice, "yen", ["高い", "安い"]);
    const cap = (s: SideStats, m: string) => (s.medianStorage ? `（${storageLabel(s.medianStorage, m)}）` : "");
    parts.median = `相場（在庫がいちばん多い容量の中央値）は ${a}${cap(sa, a)} が ${yen(sa.medianPrice)}、${b}${cap(sb, b)} が ${yen(sb.medianPrice)}で、${g === "同じ" ? "同じです" : `${g}です`}。`;
  }
  if (sa.count > 0 || sb.count > 0) {
    const g = gap(a, b, sa.count, sb.count, "n", ["多い", "少ない"]);
    parts.stock = `在庫は ${a} が ${sa.count.toLocaleString()}件（${sa.shopCount}店）、${b} が ${sb.count.toLocaleString()}件（${sb.shopCount}店）で、${g === "同じ" ? "件数は同じです" : `${g}です`}。`;
  }
  if (sa.goodMin !== null && sb.goodMin !== null) {
    const g = gap(a, b, sa.goodMin, sb.goodMin, "yen", ["高い", "安い"]);
    parts.good = `ランクB以上に絞った最安値は ${a} が ${yen(sa.goodMin)}、${b} が ${yen(sb.goodMin)}で、${g === "同じ" ? "同じです" : `${g}です`}。`;
  }
  return parts;
}

export function priceReadingSentence(a: string, b: string, sa: SideStats, sb: SideStats): string {
  const p = priceReadingParts(a, b, sa, sb);
  return p.median + p.stock + p.good;
}

/** 比較ページの FAQ（実データから。機種ページの Faq と同じ形） */
export function buildCompareFaq(a: string, b: string, sa: SideStats, sb: SideStats): Faq[] {
  const faqs: Faq[] = [];

  // どちらが安いか
  let cheap: string;
  if (sa.minPrice === null || sb.minPrice === null) {
    cheap = sa.minPrice === null && sb.minPrice === null
      ? `現在、${a}・${b}ともに在庫がありません。`
      : `現在 ${sa.minPrice === null ? a : b} の在庫はなく、${sa.minPrice === null ? b : a} は ${yen((sa.minPrice ?? sb.minPrice)!)} からです。`;
  } else if (sa.minPrice === sb.minPrice) {
    cheap = `中古の最安値はどちらも ${yen(sa.minPrice)}で同じです。`;
  } else {
    const [c, p, cp, pp] = sa.minPrice < sb.minPrice ? [a, b, sa.minPrice, sb.minPrice] as const : [b, a, sb.minPrice, sa.minPrice] as const;
    cheap = `中古の最安値は ${c} が ${yen(cp)}、${p} が ${yen(pp)}で、${c} のほうが ${yen(pp - cp)}安くなっています。`;
  }
  const reading = priceReadingParts(a, b, sa, sb).good;
  faqs.push({ q: `${a}と${b}、中古はどちらが安いですか？`, a: `${cheap}${reading}価格は毎日変わります。` });

  // 違い
  const spec = specDiffSentence(a, b);
  if (spec) faqs.push({ q: `${a}と${b}の違いは何ですか？`, a: spec });

  // 在庫
  if (sa.count > 0 || sb.count > 0) {
    const g = gap(a, b, sa.count, sb.count, "n", ["多い", "少ない"]);
    faqs.push({
      q: `${a}と${b}、中古の在庫が多いのはどちらですか？`,
      a: `現在の在庫は ${a} が ${sa.count.toLocaleString()}件（${sa.shopCount}店）、${b} が ${sb.count.toLocaleString()}件（${sb.shopCount}店）で、${g === "同じ" ? "件数は同じです" : `${g}です`}。在庫は毎日変わります。`,
    });
  }
  return faqs;
}
