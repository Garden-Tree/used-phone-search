/**
 * テーマ「未使用品（ランクS）は、中古（ランクA）よりいくら高い？」: 1機種の同じ容量で、状態ランク S（未使用品）と A の中古の相場（中央値）の差のランキング → 台本
 * rank（A と C）を写したもの。場面は battery と同じ形（3位・2位・伏せた1位 → 2本の棒）
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 機種: iPhone 13〜17 の無印と Pro（MODELS）。容量はその機種で在庫がいちばん多い容量（サイトの相場と同じ容量。同じ件数なら小さい方）
 * - ランクは各店の表記（DB の conditionRank を大文字にそろえる。rank・lib/modelStats.ts と同じ）。S＝未使用品（各店が「未使用」と書いた在庫。lib/rakutenCommon.ts の rankOf）
 * - S と A のどちらかの在庫が MIN_COUNT 件未満の機種は出さない
 * - 差 = ランクS の相場 − ランクA の相場。率は A の相場に対して。差の大きい順
 * - 差が0以下（未使用品の方が安い・同じ）の機種はランキングに入れず、plan のログに「★注意」で出す（黙って落とさない）。3機種に満たなければ止める
 * DB は機種ごとの (容量)・(ランク) の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import type { Prisma } from "@prisma/client";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { UnusedRow, UnusedScript } from "../types";

/** 比べる機種（古い順） */
const MODELS = ["iPhone 13", "iPhone 13 Pro", "iPhone 14", "iPhone 14 Pro", "iPhone 15", "iPhone 15 Pro", "iPhone 16", "iPhone 16 Pro", "iPhone 17", "iPhone 17 Pro"];
/** 相場が数件の在庫で決まらないように（そのランク・容量の在庫の件数） */
// 未使用品は在庫が少なく、5件だと1〜2店の値付けで順位が決まる（10/26: iPhone 13 のランクS 6件・2店で +42.6% が1位になった）ので 20件
const MIN_COUNT = 20;
/** 動画・説明欄に出す数（3位・2位・1位） */
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
/** 約何万円（0.1万円単位で四捨五入。ナレーションの「約○.○万円」と同じ値） */
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_unused`;

async function rowOf(model: string): Promise<UnusedRow | null> {
  const where = await modelWhere(model);
  const byStorage = await groupMinPrice(where, "storage");
  if (byStorage.length === 0) {
    console.log(`  対象外: ${model}（在庫なし）`);
    return null;
  }
  const top = byStorage.reduce((a, b) => (b.count > a.count || (b.count === a.count && Number(b.key) < Number(a.key)) ? b : a));
  const gb = Number(top.key);
  const storage = storageLabel(gb, model);
  const at: Prisma.DeviceInventoryWhereInput = { AND: [where, { storage: gb }] };
  // ランクの件数（小文字が混ざるので大文字にそろえて足す）
  const counts = new Map<string, number>();
  for (const g of await groupMinPrice(at, "conditionRank")) counts.set(g.key.toUpperCase(), (counts.get(g.key.toUpperCase()) ?? 0) + g.count);
  const [sCount, aCount] = [counts.get("S") ?? 0, counts.get("A") ?? 0];
  if (sCount < MIN_COUNT || aCount < MIN_COUNT) {
    console.log(`  対象外: ${model}（${storage}・ランクS ${sCount}件・ランクA ${aCount}件。どちらも${MIN_COUNT}件以上必要）`);
    return null;
  }
  const medianOf = async (rank: string, count: number) => (await medianPrice({ AND: [at, { conditionRank: { in: [rank, rank.toLowerCase()] } }] }, count))!;
  const [sMedian, aMedian] = [await medianOf("S", sCount), await medianOf("A", aCount)];
  const diff = sMedian - aMedian;
  const row: UnusedRow = { model, storage, storageGb: gb, sMedian, aMedian, sCount, aCount, diff, pct: Math.round((diff / aMedian) * 1000) / 10 };
  console.log(`  候補: ${model}（${storage}） S ${man(sMedian)}円（${sCount}件）・A ${man(aMedian)}円（${aCount}件） → S−A ${man(diff)}円・${row.pct.toFixed(1)}%`);
  return row;
}

export async function buildUnusedScript(date: string): Promise<UnusedScript> {
  const rows: UnusedRow[] = [];
  for (const model of MODELS) {
    const r = await rowOf(model);
    if (!r) continue;
    if (r.diff <= 0) {
      console.log(`  ★注意: ${model}（${r.storage}）は未使用品（S）の相場がランクA以下（差 ${man(r.diff)}円）。ランキングから外しました（人が確かめてください）`);
      continue;
    }
    rows.push(r);
  }
  rows.sort((x, y) => y.diff - x.diff || y.pct - x.pct);
  if (rows.length < SHOWN) throw new Error(`ランクS・A に在庫が${MIN_COUNT}件以上あり、S の方が高い機種が ${rows.length} 機種しかありません（${SHOWN}機種以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。未使用品でも電池・保証は店ごとに違う、という声かけだけ（数字は出さない）
  const lines = ["未使用でも", "電池と保証期間は", "店ごとに確認を"];

  const rawTitle = `${top.model}の未使用品はランクAより${manYen(top.diff)}円高い！未使用品と中古の差ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `未使用品は中古より${manYen(top.diff)}円高い！ランクSとAの差ランキング`;
  const rowText = (r: UnusedRow, i: number) =>
    `${i + 1}位 ${r.model}（${r.storage}） 未使用品(S) ${man(r.sMedian)}円・ランクA ${man(r.aMedian)}円（差+${man(r.diff)}円・+${r.pct.toFixed(1)}%）`;
  const description = [
    `同じ機種・同じ容量の中古iPhoneで、未使用品（ランクS）と中古のランクAの相場がいくら違うかのランキングです。1位は${top.model}（${top.storage}）で、未使用品の方が${man(top.diff)}円（+${top.pct.toFixed(1)}%）高くなっています。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: iPhone 13〜17 の無印と Pro で、在庫がいちばん多い容量のランクSとランクAの相場（中央値）を比べ、差（S − A）の大きい順（各ランクの在庫${MIN_COUNT}件以上）。率はランクAの相場に対して。ランクは各店の表記・同じ容量の中央値です。S＝未使用品は、各店が「未使用」と表記した在庫です（基準は店ごとに違います）。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.model}のランク別の在庫と最安値: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date)}`,
    `iPhone 全機種の中古相場: https://used.gadelog.com/iphone?${utm(date)}`,
  ].join("\n");

  return {
    theme: "unused",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "あなたは未使用品派？ランクA派？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
