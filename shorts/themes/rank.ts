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
 *
 * rankipad・rankpixel（11/17〜。iPhone の rank は毎月1位が同じになるので、機種の群を替えた版）: 選び方は同じで、機種だけ替える
 * - rankipad: iPad のカタログ（lib/ipadCatalog.ts）のうち iPadOS 27 対応（lib/ipadSpecs.ts の IPADOS27_MODELS。ipadbudget と同じ絞り方）
 * - rankpixel: Pixel のカタログ（lib/pixelCatalog.ts）のうち Google のアップデート保証が作った月に終わっていない機種（pixelbudget と同じ）
 * - 店の数は iPad・Pixel を扱う店（IPAD_SHOPS・PIXEL_SHOPS）。ランクC の在庫は にこスマ・じゃんぱら・ソフマップ・イオシスが多く、ゲオはランクC を付けない（11/17 の集計）
 */
import type { Prisma } from "@prisma/client";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { IPAD_SHOPS, PIXEL_SHOPS, SHOPS } from "@/lib/shops";
import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { PIXEL_MODELS, jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { activeShops } from "@/lib/activeShops";
import type { RankBucket, RankRow, RankScript } from "../types";

/** 比べる機種（古い順） */
const IPHONE_MODELS = ["iPhone 13", "iPhone 13 Pro", "iPhone 14", "iPhone 14 Pro", "iPhone 15", "iPhone 15 Pro", "iPhone 16", "iPhone 16 Pro"];
const RANKS = ["A", "B", "C"] as const;
/** 相場が数件の在庫で決まらないように（そのランク・容量の在庫の件数） */
const MIN_COUNT = 5;
/** 動画・説明欄に出す数（3位・2位・1位） */
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
/** 約何万円（0.1万円単位で四捨五入。ナレーションの「約○.○万円」と同じ値） */
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string, theme: RankScript["theme"]) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_${theme}`;

export type RankFamily = "iphone" | "ipad" | "pixel";
/** 群ごとの機種・店・言い方 */
const FAMILY: Record<RankFamily, { theme: RankScript["theme"]; device: string; scope: string; shops: typeof SHOPS; hub: { path: string; label: string }; hashtags: string[] }> = {
  iphone: { theme: "rank", device: "iPhone", scope: "iPhone 13〜16 の無印と Pro", shops: SHOPS, hub: { path: "/", label: "全機種の中古相場" }, hashtags: ["#中古iPhone", "#iPhone"] },
  ipad: { theme: "rankipad", device: "iPad", scope: "iPadOS 27 に対応する iPad", shops: IPAD_SHOPS, hub: { path: "/ipad", label: "中古iPadの全機種の相場" }, hashtags: ["#iPad", "#中古iPad"] },
  pixel: { theme: "rankpixel", device: "Pixel", scope: "Google のアップデート保証が終わっていない Pixel", shops: PIXEL_SHOPS, hub: { path: "/pixel", label: "中古Pixelの全機種の相場" }, hashtags: ["#Pixel", "#GooglePixel", "#中古"] },
};

/** 群の機種（ipad は iPadOS 27 対応・pixel はアップデート保証が残っている機種） */
function modelsOf(family: RankFamily, month: string): string[] {
  if (family === "ipad") return IPAD_MODELS.filter((m) => IPADOS27_MODELS.has(m));
  if (family === "pixel") {
    return PIXEL_MODELS.filter((m) => {
      const left = updateYearsLeft(m, month);
      if (left !== undefined && left <= 0) console.log(`  対象外: ${m}（アップデート保証が ${jaMonth(updateUntil(m)!)} で終了）`);
      return left !== undefined && left > 0;
    });
  }
  return IPHONE_MODELS;
}

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

export async function buildRankScript(date: string, family: RankFamily = "iphone"): Promise<RankScript> {
  const F = FAMILY[family];
  const rows: RankRow[] = [];
  for (const model of modelsOf(family, date.slice(0, 7))) {
    const r = await rowOf(model);
    // ランクC の方が高い（差が0以下）機種は「安くなる」と言えないので出さない
    if (r && r.diff <= 0) console.log(`  ★注意: ${model}（${r.storage}）はランクC の方が高いか同じ（A−C ${man(r.diff)}円）ので出さない`);
    if (r && r.diff > 0) rows.push(r);
  }
  rows.sort((x, y) => y.diff - x.diff || y.pct - x.pct);
  if (rows.length < SHOWN) throw new Error(`ランクA・B・C に在庫が${MIN_COUNT}件以上あり、C の方が安い機種が ${rows.length} 機種しかありません（${SHOWN}機種以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeShops(F.shops)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。サイトの説明（lib/modelFaq.ts「状態ランクは外装の傷の話」・/about「基準は店ごとに異なる」）と同じ考え
  const lines = ["ランクの差は主に", "外装の傷なので", "電池は別に見ましょう"];

  const rawTitle = family === "iphone" ? `${top.model}はランクCで${manYen(top.diff)}円安い！状態ランクの差ランキング` : `${top.model}はランクCで${manYen(top.diff)}円安い！中古${F.device}の状態ランクの差`;
  const title = rawTitle.length <= 60 ? rawTitle : `ランクCなら${manYen(top.diff)}円安い！中古${F.device}の状態ランクの差`;
  const bucketText = (r: RankRow) => r.buckets.map((b) => `${b.rank} ${man(b.median)}円`).join("・");
  const rowText = (r: RankRow, i: number) => `${i + 1}位 ${r.model}（${r.storage}） ${bucketText(r)}（A→C −${man(r.diff)}円・−${r.pct.toFixed(1)}%）`;
  const description = [
    `同じ機種・同じ容量の中古${F.device}で、状態ランクAとCの相場がいくら違うかのランキングです。1位は${top.model}（${top.storage}）で、ランクCにすると${man(top.diff)}円（−${top.pct.toFixed(1)}%）安くなります。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: ${F.scope}で、在庫がいちばん多い容量のランクA・B・Cの相場（中央値）を比べ、AとCの差の大きい順（各ランクの在庫${MIN_COUNT}件以上）。率はランクAの相場に対して。ランクは各店の表記のままで、基準は店ごとに違います（未使用品のランクSは除く）。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.model}のランク別の最安値と在庫: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date, F.theme)}`,
    `${F.hub.label}: https://used.gadelog.com${F.hub.path}?${utm(date, F.theme)}`,
  ].join("\n");

  return {
    theme: F.theme,
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
    youtube: { title, description, hashtags: F.hashtags },
  };
}
