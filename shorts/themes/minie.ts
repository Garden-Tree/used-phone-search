/**
 * テーマ「無印より安い“弟分”、いくら安い？中古iPhone」: 同じ世代の iPhone の無印と弟分（mini・e）を、同じ容量の中古の相場（中央値）で比べた差のランキング → 台本
 * plusvs を写したもの。行と場面は gen・fold と同じ FoldRow（newer＝無印・older＝弟分）。差は「弟分にするといくら安いか」
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: iPhone 12／12 mini・13／13 mini・16／16e・17／17e（PAIRS。機種名は lib/catalog.ts の表記。14・15 に弟分はない）
 * - 容量は、両方の機種で在庫が MIN_COUNT 件以上ある容量のうち、いちばん小さい容量。なければその組は出さない
 * - その容量の相場（中央値）どうしの差（無印 − 弟分）の大きい順。率は無印の相場に対して
 * - 差が0以下（弟分の方が高い・同じ）の組はランキングに入れず、plan のログに「★注意」で出す（黙って落とさない）。残りが SHOWN 組に満たなければ止める
 * DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { FoldRow, MinieScript } from "../types";

/** 比べる組（無印・弟分）。古い順 */
const PAIRS: [string, string][] = [
  ["iPhone 12", "iPhone 12 mini"],
  ["iPhone 13", "iPhone 13 mini"],
  ["iPhone 16", "iPhone 16e"],
  ["iPhone 17", "iPhone 17e"],
];
/** 相場が数件の在庫で決まらないように（その容量の在庫の件数） */
const MIN_COUNT = 5;
/** 動画・説明欄に出す数（3位・2位・1位） */
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
/** 約何万円（0.1万円単位で四捨五入。ナレーションの「約○.○万円」と同じ値） */
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_minie`;

type Side = { where: Awaited<ReturnType<typeof modelWhere>>; counts: Map<number, number> };
async function side(model: string): Promise<Side> {
  const where = await modelWhere(model);
  const counts = new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), g.count] as const));
  return { where, counts };
}
const medianAt = async (s: Side, storage: number) => (await medianPrice({ AND: [s.where, { storage }] }, s.counts.get(storage) ?? 0))!;

export async function buildMinieScript(date: string): Promise<MinieScript> {
  const rows: FoldRow[] = [];
  for (const [base, sib] of PAIRS) {
    const [b, m] = [await side(base), await side(sib)];
    const common = [...b.counts.keys()].filter((g) => (b.counts.get(g) ?? 0) >= MIN_COUNT && (m.counts.get(g) ?? 0) >= MIN_COUNT).sort((x, y) => x - y);
    if (common.length === 0) {
      console.log(`  対象外: ${base}／${sib}（両方に在庫${MIN_COUNT}件以上の容量がない。在庫 ${[...b.counts].map(([g, c]) => `${g}GB ${c}件`).join("・") || "なし"}／${[...m.counts].map(([g, c]) => `${g}GB ${c}件`).join("・") || "なし"}）`);
      continue;
    }
    const gb = common[0];
    const [baseMedian, sibMedian] = [await medianAt(b, gb), await medianAt(m, gb)];
    const diff = baseMedian - sibMedian;
    const row: FoldRow = {
      newer: base, older: sib, storage: storageLabel(gb, base), storageGb: gb, newerMedian: baseMedian, olderMedian: sibMedian,
      newerCount: b.counts.get(gb)!, olderCount: m.counts.get(gb)!, diff, pct: Math.round((diff / baseMedian) * 1000) / 10,
    };
    console.log(`  候補: ${base}／${sib}（${row.storage}・在庫 ${row.newerCount}件／${row.olderCount}件） 無印 ${man(baseMedian)}円・弟分 ${man(sibMedian)}円（差 ${man(diff)}円・${row.pct.toFixed(1)}%）`);
    if (diff <= 0) {
      console.log(`  ★注意: ${sib}の相場が${base}以上（差 ${man(diff)}円）。ランキングから外しました（それ自体が話題になるので、人が確かめてください）`);
      continue;
    }
    rows.push(row);
  }
  // 差額の大きい順（同じ額なら率の大きい方）
  rows.sort((a, b) => b.diff - a.diff || b.pct - a.pct);
  if (rows.length < SHOWN) throw new Error(`無印と弟分の両方に同じ容量の在庫が${MIN_COUNT}件以上あり、弟分の方が安い組が ${rows.length} 組しかありません（${SHOWN}組以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。仕様の数字は出さない。1位の弟分の在庫が無印より少なければそれを言う（台本の件数で確かめられる）
  const lines = top.olderCount < top.newerCount ? ["弟分は在庫が少ないので", "容量と電池の%を", "見比べましょう"] : ["安い弟分でも", "容量と電池の%を", "見比べましょう"];

  const rawTitle = `${top.older}は無印より${manYen(top.diff)}円安い！弟分と無印の差ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `弟分は無印より${manYen(top.diff)}円安い！miniとeの差ランキング`;
  const rowText = (r: FoldRow, i: number) =>
    `${i + 1}位 ${r.older}／${r.newer}（${r.storage}） 弟分${man(r.olderMedian)}円・無印${man(r.newerMedian)}円（差−${man(r.diff)}円・−${r.pct.toFixed(1)}%）`;
  const description = [
    `同じ世代の iPhone の無印と、弟分（mini・e）を、同じ容量の中古の相場で比べた差のランキングです。1位は${top.older}と${top.newer}（${top.storage}）で、弟分の方が${man(top.diff)}円（−${top.pct.toFixed(1)}%）安くなっています。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: iPhone 12／12 mini・13／13 mini・16／16e・17／17e の組で、両方に在庫が${MIN_COUNT}件以上ある容量のうちいちばん小さい容量の相場どうしを比べ、差額（無印 − 弟分）の大きい順。率は無印の相場に対して。データ: 大手中古ショップ${shopCount}店の在庫・相場＝同じ容量の中央値（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.older}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.older)}?${utm(date)}`,
    `iPhone 全機種の中古相場: https://used.gadelog.com/iphone?${utm(date)}`,
  ].join("\n");

  return {
    theme: "minie",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "あなたは弟分派？無印派？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
