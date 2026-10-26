/**
 * テーマ「1世代前のProと最新の無印、どっちが安い？」: 1世代前の Pro と、次の世代の無印を、同じ容量の中古の相場（中央値）で比べた差のランキング → 台本
 * plusvs を写したもの。行は OldProRow（older＝1世代前の Pro・newer＝次の世代の無印）。差は向きつき（無印 − 1世代前の Pro。正なら Pro の方が安い）
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: iPhone 13 Pro／14・14 Pro／15・15 Pro／16・16 Pro／17（PAIRS。機種名は lib/catalog.ts の表記）
 * - 容量は、両方の機種で在庫が MIN_COUNT 件以上ある容量のうち、いちばん小さい容量。なければその組は出さない（20件）
 * - その容量の相場（中央値）どうしの差の大きさ（|無印 − Pro|）の大きい順。どちらが安いかは行ごとに出す（Pro の方が高い組も落とさない）
 * - 率は高い方の相場に対して（「安い方は、高い方より○%安い」）。差が0の組は向きがないので外し、ログに出す。残りが SHOWN 組に満たなければ止める
 * - 検品担当のひと言は、1位の組のチップ・端子（lib/iphoneSpecs.ts の公式の値）が同じか違うかだけ。値がなければ一般的な声かけ
 * DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { IPHONE_SPECS } from "@/lib/iphoneSpecs";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { OldProRow, OldProScript } from "../types";

/** 比べる組（1世代前の Pro・次の世代の無印）。古い順 */
const PAIRS: [string, string][] = [
  ["iPhone 13 Pro", "iPhone 14"],
  ["iPhone 14 Pro", "iPhone 15"],
  ["iPhone 15 Pro", "iPhone 16"],
  ["iPhone 16 Pro", "iPhone 17"],
];
/** 相場が数件の在庫で決まらないように（その容量の在庫の件数） */
const MIN_COUNT = 20;
/** 動画・説明欄に出す数（3位・2位・1位） */
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
/** 約何万円（0.1万円単位で四捨五入。ナレーションの「約○.○万円」と同じ値） */
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const short = (model: string) => model.replace(/^iPhone\s+/, "");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_oldpro`;
/** 安い方の機種名（diff ＝ 無印 − Pro が正なら Pro が安い） */
export const oldProCheaper = (r: OldProRow) => (r.diff > 0 ? r.older : r.newer);

type Side = { where: Awaited<ReturnType<typeof modelWhere>>; counts: Map<number, number> };
async function side(model: string): Promise<Side> {
  const where = await modelWhere(model);
  const counts = new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), g.count] as const));
  return { where, counts };
}
const medianAt = async (s: Side, storage: number) => (await medianPrice({ AND: [s.where, { storage }] }, s.counts.get(storage) ?? 0))!;
const stock = (s: Side) => [...s.counts].sort((a, b) => a[0] - b[0]).map(([g, c]) => `${g}GB ${c}件`).join("・") || "なし";

/** 1位の組のひと言（1行16字以内・3行まで）。チップと端子は lib/iphoneSpecs.ts の値だけで言う */
function commentLines(r: OldProRow): string[] {
  const [o, nw] = [IPHONE_SPECS[r.older], IPHONE_SPECS[r.newer]];
  if (!o || !nw) return ["世代より先に", "電池の%と保証を", "確認しましょう"];
  const chipShort = (c: string) => c.replace(/\s+Bionic$/, "");
  const first = `${short(r.older)}と${short(r.newer)}は`;
  if (o.chip === nw.chip) {
    const second = `同じ${chipShort(o.chip)}チップ`;
    return o.port !== nw.port ? [first, second, `端子は${short(r.newer)}が${nw.port}`] : [first, second, "電池の%を確認しましょう"];
  }
  if (o.port !== nw.port) return [first, `端子が違います`, `${short(r.newer)}は${nw.port}`];
  return ["Proか無印かより", "電池の%と保証を", "確認しましょう"];
}

export async function buildOldProScript(date: string): Promise<OldProScript> {
  const rows: OldProRow[] = [];
  for (const [older, newer] of PAIRS) {
    const [o, nw] = [await side(older), await side(newer)];
    const common = [...o.counts.keys()].filter((g) => (o.counts.get(g) ?? 0) >= MIN_COUNT && (nw.counts.get(g) ?? 0) >= MIN_COUNT).sort((x, y) => x - y);
    if (common.length === 0) {
      console.log(`  対象外: ${older}／${newer}（両方に在庫${MIN_COUNT}件以上の容量がない。在庫 ${stock(o)}／${stock(nw)}）`);
      continue;
    }
    const gb = common[0];
    const [olderMedian, newerMedian] = [await medianAt(o, gb), await medianAt(nw, gb)];
    const diff = newerMedian - olderMedian;
    const row: OldProRow = {
      older, newer, storage: storageLabel(gb, newer), storageGb: gb, olderMedian, newerMedian,
      olderCount: o.counts.get(gb)!, newerCount: nw.counts.get(gb)!, diff, pct: Math.round((Math.abs(diff) / Math.max(olderMedian, newerMedian)) * 1000) / 10,
    };
    console.log(`  候補: ${older}／${newer}（${row.storage}・在庫 ${row.olderCount}件／${row.newerCount}件） Pro ${man(olderMedian)}円・無印 ${man(newerMedian)}円（${diff === 0 ? "同じ" : `${short(oldProCheaper(row))}が${man(Math.abs(diff))}円安い・${row.pct.toFixed(1)}%`}）`);
    if (diff === 0) {
      console.log(`  ★注意: ${older}と${newer}の相場が同じ。向きがないのでランキングから外しました`);
      continue;
    }
    if (diff < 0) console.log(`  ★注意: ${older}（1世代前の Pro）の方が高い組。そのまま向きを出します`);
    rows.push(row);
  }
  // 差の大きさの大きい順（同じなら率の大きい方）
  rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || b.pct - a.pct);
  if (rows.length < SHOWN) throw new Error(`1世代前の Pro と次の無印の両方に同じ容量の在庫が${MIN_COUNT}件以上ある組が ${rows.length} 組しかありません（${SHOWN}組以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const cheaper = oldProCheaper(top);
  const shopCount = (await activeShops(SHOPS)).length;

  const lines = commentLines(top);

  const rawTitle = `${cheaper}が${manYen(Math.abs(top.diff))}円安い！1世代前のProと最新の無印、どっちが安い？`;
  const title = rawTitle.length <= 60 ? rawTitle : `${cheaper}が${manYen(Math.abs(top.diff))}円安い！前のProと無印の差`;
  const rowText = (r: OldProRow, i: number) =>
    `${i + 1}位 ${r.older}／${r.newer}（${r.storage}） Pro${man(r.olderMedian)}円・無印${man(r.newerMedian)}円（${short(oldProCheaper(r))}が${man(Math.abs(r.diff))}円安い・−${r.pct.toFixed(1)}%）`;
  const description = [
    `1世代前の iPhone Pro と、次の世代の無印を、同じ容量の中古の相場で比べた差のランキングです。1位は${top.older}と${top.newer}（${top.storage}）で、${cheaper}の方が${man(Math.abs(top.diff))}円（−${top.pct.toFixed(1)}%）安くなっています。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: iPhone 13 Pro／14・14 Pro／15・15 Pro／16・16 Pro／17 の組で、両方に在庫が${MIN_COUNT}件以上ある容量のうちいちばん小さい容量の相場どうしを比べ、差の大きさの大きい順。率は高い方の相場に対して。データ: 大手中古ショップ${shopCount}店の在庫・相場＝同じ容量の中央値（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${cheaper}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(cheaper)}?${utm(date)}`,
    `iPhone 全機種の中古相場: https://used.gadelog.com/iphone?${utm(date)}`,
  ].join("\n");

  return {
    theme: "oldpro",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "1世代前のPro？最新の無印？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
