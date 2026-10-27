/**
 * テーマ「新型MacBook Pro M6、中古のM5・M4ならいくら安い？」（10/28〜。新型 MacBook Pro 14インチ M6 の発表に合わせた回）→ 台本
 * 場面・画面は ipadmini と同じ（台本の型 IpadMiniScript・theme "mbpnew"。画面の文字は scenes.copy で変える）。
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 新型は lib/macbookProM6.ts（Apple 公式・税込・10/28 確認）のいちばん安い構成（16GB・1TB）だけ
 * - 中古は 14インチの M5・M4 を、新型と同じ SSD 1TB で比べる。メモリは 16GB（新型と同じ）と、M5 だけ 24GB も（在庫があるので）
 * - 相場は構成（機種・SSD・メモリ）ごとの中央値（ジャンクを除く・横動画 longform/2026-10-29-mbp-m6 と同じ数字）。在庫 MIN_COUNT 件以上の構成だけ（3行そろわなければ止める）
 * - 並びは新型との差の大きい順。items[0]（差がいちばん大きい）を伏せて reveal で新型と比べる
 * - reveal の仕様の違いは lib/macbookProM6.ts の MBP_M6_COMPARE（公式の仕様のページの値）から CPU・Wi-Fi・電池の3つ（電池は同じ）
 * DB は構成ごとの価格の列だけ（各十数行）。在庫の行を丸ごと取らない
 */
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { modelPagePath } from "@/lib/catalog";
import { MAC_SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import { MBP_M6_CHECKED, MBP_M6_COMPARE, MBP_M6_MEMORY_GB, MBP_M6_NAME, MBP_M6_PRICE, MBP_M6_RELEASE, MBP_M6_STORAGE_GB } from "@/lib/macbookProM6";
import type { IpadMiniRow, IpadMiniScript } from "../types";

/** 比べる中古の構成（short は行の声の頭・画面の行の札は year） */
const CONFIGS = [
  { model: "MacBook Pro 14インチ M4", memoryGB: 16, short: "M4", year: "2024年" },
  { model: "MacBook Pro 14インチ M5", memoryGB: 16, short: "M5", year: "2025年" },
  { model: "MacBook Pro 14インチ M5", memoryGB: 24, short: "M5の24GB", year: "2025年" },
];
const MIN_COUNT = 5;
const COMPARE_LABELS = ["CPU", "Wi-Fi", "電池（動画）"];

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_mbpnew`;
const memLabel = (gb: number) => `${gb}GB・1TB`;

export async function buildMbpNewScript(date: string): Promise<IpadMiniScript> {
  const rows: IpadMiniRow[] = [];
  for (const c of CONFIGS) {
    // 中央値はサイトと同じ lib/modelInventory.ts の medianPrice（偶数件は真ん中の2件の上の方。平均しない）
    const where = { AND: [await modelWhere(c.model), { isSoldOut: false, storage: MBP_M6_STORAGE_GB, memoryGB: c.memoryGB, conditionRank: { notIn: ["J", "j", "ジャンク"] } }] };
    const count = await prisma.deviceInventory.count({ where });
    if (count < MIN_COUNT) throw new Error(`${c.model} ${memLabel(c.memoryGB)} の在庫が ${count} 件しかありません（${MIN_COUNT}件以上必要）`);
    const med = (await medianPrice(where, count))!;
    const diff = MBP_M6_PRICE - med;
    if (diff <= 0) throw new Error(`${c.model} ${memLabel(c.memoryGB)} の相場が新型以上です（差 ${diff}円）`);
    const row: IpadMiniRow = {
      model: c.model, short: c.short, year: c.year, storage: memLabel(c.memoryGB), storageGb: MBP_M6_STORAGE_GB, median: med, count,
      newStorageGb: MBP_M6_STORAGE_GB, newPrice: MBP_M6_PRICE, diff, pct: Math.round((diff / MBP_M6_PRICE) * 1000) / 10,
    };
    console.log(`  ${c.model}（${row.storage}・在庫${row.count}件） 相場 ${man(med)}円 / 新型 ${man(MBP_M6_PRICE)}円（差 ${man(diff)}円・${row.pct}%）`);
    rows.push(row);
  }
  const items = rows.sort((a, b) => b.diff - a.diff);
  const top = items[0];
  const compare = COMPARE_LABELS.map((l) => {
    const c = MBP_M6_COMPARE.find((x) => x.label === l);
    if (!c) throw new Error(`MBP_M6_COMPARE に ${l} がありません`);
    return { label: c.label, a20: c.m6, a17: c.m4 };
  });
  const shopCount = (await activeShops(MAC_SHOPS)).length;
  const topChip = top.short.replace(/の.*$/, "");

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。Mac は電池の充放電回数をシステム情報で見られる（Apple サポート 102888 の上限の目安 1,000回）
  const lines = ["中古のMacは", "電池の充放電回数を", "確認しましょう"];

  // 金額はそのまま（万円で丸めると新型の値段が安く見え、声の「約8.0万円」とも食い違う）
  const rawTitle = `新型MacBook Pro M6は${man(MBP_M6_PRICE)}円、中古の${topChip}なら${man(top.diff)}円安い`;
  const title = rawTitle.length <= 60 ? rawTitle : "新型MacBook Pro M6、中古のM5・M4ならいくら安い？";
  const description = [
    `新型 ${MBP_M6_NAME}（${md(MBP_M6_RELEASE)}発売・Apple公式 ${man(MBP_M6_PRICE)}円〜・メモリ16GB／SSD 1TB）と、同じ SSD 1TB の中古の M5・M4 の相場の差です。${top.model}（${top.storage}）は相場${man(top.median)}円で、新型より${man(top.diff)}円・${top.pct.toFixed(1)}%安い。`,
    "",
    ...items.map((r) => `${r.model}（${r.storage}・在庫${r.count}件） 相場${man(r.median)}円 → 新型より −${man(r.diff)}円（−${r.pct.toFixed(1)}%）`),
    "",
    `新型とM4の違い（Apple公式の仕様）: ${compare.map((c) => `${c.label} ${c.a20}／${c.a17}`).join("・")}。重さはどちらも1.55kg。`,
    "",
    `比べ方: 中古は同じ構成（チップ・メモリ・SSD）の中央値（在庫${MIN_COUNT}件以上）。件数が少ない構成もあるので目安です。新型は Apple 公式の価格（税込・${slash(MBP_M6_CHECKED)}確認）。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date)}`,
    `中古MacBookの全機種の相場: https://used.gadelog.com/mac?${utm(date)}`,
  ].join("\n");

  return {
    theme: "mbpnew",
    date,
    shopCount,
    appleChecked: MBP_M6_CHECKED,
    scenes: {
      newModel: { name: MBP_M6_NAME, release: MBP_M6_RELEASE, price: MBP_M6_PRICE },
      ranking: { items },
      compare,
      copy: {
        head: ["新型MacBook Pro M6", "中古のM5・M4ならいくら安い？"],
        hook: ["新型MacBook Pro、", "中古のM5・M4なら", "いくら安い？"],
        hookSub: "M6",
        foot: `${slash(date)}・新型はApple公式（${MBP_M6_MEMORY_GB}GB・1TB）
中古は同じメモリ・SSDの中央値`,
        revealSub: `${top.storage}・${top.year}発売・在庫${top.count}件`,
        newBar: "新型 M6",
        compareHead: topChip,
      },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "新型と中古、どっちにする？",
      },
    },
    youtube: { title, description, hashtags: ["#MacBookPro", "#中古MacBook", "#MacBook"] },
  };
}
