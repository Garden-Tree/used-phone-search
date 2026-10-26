/**
 * テーマ「大画面はPlusとPro Max、同じ容量でいくら違う？」: 同じ世代の iPhone の Plus と Pro Max を、同じ容量の中古の相場（中央値）で比べた差のランキング → 台本
 * plusvs（無印と Plus）を写したもの。台本の型は ProVsScript（theme "plusmax"）で、base＝Plus・pro＝Pro Max
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: iPhone 14 Plus／14 Pro Max・15 Plus／15 Pro Max・16 Plus／16 Pro Max（PAIRS。機種名は lib/catalog.ts の表記。17 に Plus はない）
 * - 容量は、両方の機種で在庫が MIN_COUNT 件以上ある容量のうち、いちばん小さい容量。なければその組は出さない（20件。unused の教訓で5件にしない）
 * - その容量の相場（中央値）どうしの差（Pro Max − Plus）の大きい順。率は Plus の相場に対して
 * - 差が0以下（Pro Max の方が安い・同じ）の組はランキングに入れず、plan のログに出す（黙って落とさない）。残りが SHOWN 組に満たなければ止める
 * - 1位の Plus は、1つ上の容量（在庫 MIN_COUNT 件以上）の相場との差も出す（在庫が足りなければ出さない）
 * DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { ProVsRow, ProVsScript, ProVsUpgrade } from "../types";

/** 比べる組（Plus・Pro Max）。古い順 */
const PAIRS: [string, string][] = [
  ["iPhone 14 Plus", "iPhone 14 Pro Max"],
  ["iPhone 15 Plus", "iPhone 15 Pro Max"],
  ["iPhone 16 Plus", "iPhone 16 Pro Max"],
];
/** 相場が数件の在庫で決まらないように（その容量の在庫の件数） */
const MIN_COUNT = 20;
/** 動画・説明欄に出す数（3位・2位・1位） */
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
/** 約何万円（0.1万円単位で四捨五入。ナレーションの「約○.○万円」と同じ値） */
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_plusmax`;

type Side = { where: Awaited<ReturnType<typeof modelWhere>>; counts: Map<number, number> };
async function side(model: string): Promise<Side> {
  const where = await modelWhere(model);
  const counts = new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), g.count] as const));
  return { where, counts };
}
const medianAt = async (s: Side, storage: number) => (await medianPrice({ AND: [s.where, { storage }] }, s.counts.get(storage) ?? 0))!;
const stock = (s: Side) => [...s.counts].sort((a, b) => a[0] - b[0]).map(([g, c]) => `${g}GB ${c}件`).join("・") || "なし";

export async function buildPlusMaxScript(date: string): Promise<ProVsScript> {
  const rows: (ProVsRow & { baseSide: Side })[] = [];
  for (const [base, pro] of PAIRS) {
    const [b, p] = [await side(base), await side(pro)];
    const common = [...b.counts.keys()].filter((g) => (b.counts.get(g) ?? 0) >= MIN_COUNT && (p.counts.get(g) ?? 0) >= MIN_COUNT).sort((x, y) => x - y);
    if (common.length === 0) {
      console.log(`  対象外: ${base}／${pro}（両方に在庫${MIN_COUNT}件以上の容量がない。在庫 ${stock(b)}／${stock(p)}）`);
      continue;
    }
    const gb = common[0];
    const [baseMedian, proMedian] = [await medianAt(b, gb), await medianAt(p, gb)];
    const diff = proMedian - baseMedian;
    const row = {
      base, pro, storage: storageLabel(gb, base), storageGb: gb, baseMedian, proMedian,
      baseCount: b.counts.get(gb)!, proCount: p.counts.get(gb)!, diff, pct: Math.round((diff / baseMedian) * 1000) / 10, baseSide: b,
    };
    console.log(`  候補: ${base}／${pro}（${row.storage}・在庫 ${row.baseCount}件／${row.proCount}件） ${man(baseMedian)}円 → ${man(proMedian)}円（差 ${man(diff)}円・${row.pct.toFixed(1)}%）`);
    if (diff <= 0) {
      console.log(`  ★注意: ${pro}の相場が${base}以下（差 ${man(diff)}円）。ランキングから外しました（それ自体が話題になるので、人が確かめてください）`);
      continue;
    }
    rows.push(row);
  }
  // 差額の大きい順（同じ額なら率の大きい方）
  rows.sort((a, b) => b.diff - a.diff || b.pct - a.pct);
  if (rows.length < SHOWN) throw new Error(`Plus と Pro Max の両方に同じ容量の在庫が${MIN_COUNT}件以上あり、Pro Max の方が高い組が ${rows.length} 組しかありません（${SHOWN}組以上必要）`);
  const items: ProVsRow[] = rows.slice(0, SHOWN).map(({ baseSide: _s, ...r }) => (void _s, r));
  const top = items[0];

  // 1位の Plus を1つ上の容量（在庫 MIN_COUNT 件以上）にしたときの相場の差
  const bs = rows[0].baseSide;
  const up = [...bs.counts.keys()].filter((g) => g > top.storageGb && (bs.counts.get(g) ?? 0) >= MIN_COUNT).sort((x, y) => x - y)[0];
  let upgrade: ProVsUpgrade | undefined;
  if (up !== undefined) {
    const toMedian = await medianAt(bs, up);
    upgrade = { model: top.base, from: top.storage, to: storageLabel(up, top.base), fromMedian: top.baseMedian, toMedian, diff: toMedian - top.baseMedian };
    console.log(`  容量を上げると: ${top.base} ${upgrade.from} ${man(top.baseMedian)}円 → ${upgrade.to} ${man(toMedian)}円（差 ${man(upgrade.diff)}円・在庫${bs.counts.get(up)}件）`);
    if (upgrade.diff <= 0) upgrade = undefined;
  }

  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（人が書き換える前提・1行16字以内・3行まで）。仕様の数字は出さず、中古で見るところの一般的な声かけだけ
  const lines = ["大画面は落とすと高いので", "画面の傷と保証を", "先に確認しましょう"];

  const rawTitle = `${top.pro}はPlusより${manYen(top.diff)}円高い！PlusとPro Maxの差ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `Pro MaxはPlusより${manYen(top.diff)}円高い！PlusとPro Maxの差`;
  const rowText = (r: ProVsRow, i: number) =>
    `${i + 1}位 ${r.base}／${r.pro}（${r.storage}） Plus${man(r.baseMedian)}円・Pro Max${man(r.proMedian)}円（差+${man(r.diff)}円・+${r.pct.toFixed(1)}%）`;
  const description = [
    `同じ世代の大画面 iPhone、Plus と Pro Max を、同じ容量の中古の相場で比べた差のランキングです。1位は${top.base}と${top.pro}（${top.storage}）で、Pro Maxの方が${man(top.diff)}円（+${top.pct.toFixed(1)}%）高くなっています。`,
    "",
    ...items.map(rowText),
    ...(upgrade ? ["", `参考: ${upgrade.model}を${upgrade.from}から${upgrade.to}にすると、相場は${man(upgrade.fromMedian)}円 → ${man(upgrade.toMedian)}円（+${man(upgrade.diff)}円）。`] : []),
    "",
    `選び方: iPhone 14〜16 の Plus と Pro Max の組で、両方に在庫が${MIN_COUNT}件以上ある容量のうちいちばん小さい容量の相場どうしを比べ、差額（Pro Max − Plus）の大きい順。率は Plus の相場に対して。データ: 大手中古ショップ${shopCount}店の在庫・相場＝同じ容量の中央値（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.pro}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.pro)}?${utm(date)}`,
    `iPhone 全機種の中古相場: https://used.gadelog.com/iphone?${utm(date)}`,
  ].join("\n");

  return {
    theme: "plusmax",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      ...(upgrade ? { upgrade } : {}),
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "あなたはPlus派？Pro Max派？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
