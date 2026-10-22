/**
 * テーマ「状態ランクでいくら違う？中古iPhone」: 1機種の同じ容量で、状態ランク A と C の中古の相場（中央値）の差のランキング → 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 機種: iPhone 13〜16 の無印と Pro（MODELS）。容量はその機種で在庫がいちばん多い容量（サイトの相場と同じ容量。同じ件数なら小さい方）
 * - ランクは各店の表記（DB の conditionRank を大文字にそろえる。lib/modelStats.ts の機種ページの表と同じ）。
 *   比べるのは中古のランク A・B・C。S（未使用品）・D・ジャンク・不明は入れない。A・B・C のどれかの在庫が MIN_COUNT 件未満の機種は出さない
 * - 差 = ランクA の相場 − ランクC の相場。率は A の相場に対して。差の大きい順。差が0以下の機種は出さない。3機種に満たなければ止める
 * - ランクの基準は店ごとに違い、ランクごとに店の顔ぶれも違う（例: ランクC は じゃんぱら・にこスマが多い）。説明欄に書く
 * DB は機種ごとの (容量)・(ランク) の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import type { Prisma } from "@prisma/client";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { RankBucket, RankRow, RankScript } from "../types";

/** 比べる機種（古い順） */
const MODELS = ["iPhone 13", "iPhone 13 Pro", "iPhone 14", "iPhone 14 Pro", "iPhone 15", "iPhone 15 Pro", "iPhone 16", "iPhone 16 Pro"];
const RANKS = ["A", "B", "C"] as const;
/** 相場が数件の在庫で決まらないように（そのランク・容量の在庫の件数） */
const MIN_COUNT = 5;
/** 動画・説明欄に出す数（3位・2位・1位） */
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
/** 約何万円（0.1万円単位で四捨五入。ナレーションの「約○.○万円」と同じ値） */
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_rank`;

async function rowOf(model: string): Promise<RankRow | null> {
  const where = await modelWhere(model);
  const byStorage = await groupMinPrice(where, "storage");
  if (byStorage.length === 0) return null;
  const top = byStorage.reduce((a, b) => (b.count > a.count || (b.count === a.count && Number(b.key) < Number(a.key)) ? b : a));
  const gb = Number(top.key);
  const at: Prisma.DeviceInventoryWhereInput = { AND: [where, { storage: gb }] };
  // ランクの件数（小文字が混ざるので大文字にそろえて足す）
  const counts = new Map<string, number>();
  for (const g of await groupMinPrice(at, "conditionRank")) counts.set(g.key.toUpperCase(), (counts.get(g.key.toUpperCase()) ?? 0) + g.count);
  const short = RANKS.filter((k) => (counts.get(k) ?? 0) < MIN_COUNT);
  if (short.length) {
    console.log(`  対象外: ${model}（${storageLabel(gb, model)}・ランク${short.join("・")}の在庫が${MIN_COUNT}件未満）`);
    return null;
  }
  const buckets: RankBucket[] = [];
  for (const rank of RANKS) {
    const count = counts.get(rank)!;
    buckets.push({ rank, count, median: (await medianPrice({ AND: [at, { conditionRank: { in: [rank, rank.toLowerCase()] } }] }, count))! });
  }
  const [a, , c] = buckets;
  const diff = a.median - c.median;
  const row: RankRow = { model, storage: storageLabel(gb, model), storageGb: gb, buckets, diff, pct: Math.round((diff / a.median) * 1000) / 10 };
  console.log(`  候補: ${model}（${row.storage}） ${buckets.map((b) => `${b.rank} ${man(b.median)}円（${b.count}件）`).join("・")} → A−C ${man(diff)}円・${row.pct.toFixed(1)}%`);
  return row;
}

export async function buildRankScript(date: string): Promise<RankScript> {
  const rows: RankRow[] = [];
  for (const model of MODELS) {
    const r = await rowOf(model);
    // ランクC の方が高い（差が0以下）機種は「安くなる」と言えないので出さない
    if (r && r.diff > 0) rows.push(r);
  }
  rows.sort((x, y) => y.diff - x.diff || y.pct - x.pct);
  if (rows.length < SHOWN) throw new Error(`ランクA・B・C に在庫が${MIN_COUNT}件以上あり、C の方が安い機種が ${rows.length} 機種しかありません（${SHOWN}機種以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。サイトの説明（lib/modelFaq.ts「状態ランクは外装の傷の話」・/about「基準は店ごとに異なる」）と同じ考え
  const lines = ["ランクの差は主に", "外装の傷なので", "電池は別に見ましょう"];

  const rawTitle = `${top.model}はランクCで${manYen(top.diff)}円安い！状態ランクの差ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `ランクCなら${manYen(top.diff)}円安い！中古iPhoneの状態ランクの差`;
  const bucketText = (r: RankRow) => r.buckets.map((b) => `${b.rank} ${man(b.median)}円`).join("・");
  const rowText = (r: RankRow, i: number) => `${i + 1}位 ${r.model}（${r.storage}） ${bucketText(r)}（A→C −${man(r.diff)}円・−${r.pct.toFixed(1)}%）`;
  const description = [
    `同じ機種・同じ容量の中古iPhoneで、状態ランクAとCの相場がいくら違うかのランキングです。1位は${top.model}（${top.storage}）で、ランクCにすると${man(top.diff)}円（−${top.pct.toFixed(1)}%）安くなります。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: iPhone 13〜16 の無印と Pro で、在庫がいちばん多い容量のランクA・B・Cの相場（中央値）を比べ、AとCの差の大きい順（各ランクの在庫${MIN_COUNT}件以上）。率はランクAの相場に対して。ランクは各店の表記のままで、基準は店ごとに違います（未使用品のランクSは除く）。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.model}のランク別の最安値と在庫: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "rank",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "あなたならランクA？C？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
