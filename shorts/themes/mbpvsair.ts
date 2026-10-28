/**
 * テーマ「MacBook Air と Pro、中古ならどっちが安い？」（10/29〜。横動画 longform/2026-11-01-mbp-vs-mba の案。台本案は同じフォルダの short-plan.md）→ 台本
 * 場面・行は oldpro と同じ（台本の型 OldProScript・theme "mbpvsair"。行は OldProRow で older＝Pro・newer＝Air・diff＝Air − Pro の向きつき）。
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 比べるのは同じメモリ・同じ SSD どうしだけ。13インチ Pro（Touch Bar の旧筐体）は比べる相手にしない（10/29 ユーザーと決定）
 * - 行: 新品どうし Air 13インチ M5 vs Pro 14インチ M6（16GB・1TB。lib/macbookAirM5.ts・lib/macbookProM6.ts・Apple 公式）と、
 *   中古の Air 13インチ M2 vs Pro 14インチ M1 Pro（16GB・512GB／16GB・1TB）。中古は構成（機種・メモリ・SSD）の中央値（ジャンクを除く・在庫 MIN_COUNT 件以上）
 * - 並びは差の大きさの小さい順（1位＝いちばん同じ値段に近い組）。差0の組は向きがないので止める
 * - どちらが安いかは毎回の数字で決める（Air と Pro が逆転していたら「Pro のほうが安い」と言わない。ナレーション・タイトルも安い方から作る）
 * DB は count と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { modelPagePath } from "@/lib/catalog";
import { activeMacShops } from "@/lib/activeShops";
import { MBP_M6_CHECKED, MBP_M6_MEMORY_GB, MBP_M6_PRICE, MBP_M6_STORAGE_GB } from "@/lib/macbookProM6";
import { MBA_M2_VS_MBP_M1PRO, MBA_M5_CHECKED, MBA_M5_MEMORY_GB, MBA_M5_PRICE_1TB } from "@/lib/macbookAirM5";
import type { OldProRow, OldProScript } from "../types";

const AIR = "MacBook Air 13インチ M2";
const PRO = "MacBook Pro 14インチ M1 Pro";
/** 中古で比べる構成（メモリ・SSD） */
const USED: { memoryGB: number; storage: number }[] = [
  { memoryGB: 16, storage: 512 },
  { memoryGB: 16, storage: 1024 },
];
const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_mbpvsair`;
const memLabel = (gb: number, ssd: number) => `${gb}GB・${ssd >= 1024 ? `${ssd / 1024}TB` : `${ssd}GB`}`;
/** 安い方（"Pro"・"Air"）。diff ＝ Air − Pro が正なら Pro が安い */
export const mbpVsAirCheaper = (r: OldProRow) => (r.diff > 0 ? r.olderShort ?? r.older : r.newerShort ?? r.newer);

function makeRow(p: { older: string; newer: string; label: string; memoryGB: number; storage: number; olderMedian: number; newerMedian: number; olderCount: number; newerCount: number; isNew?: boolean }): OldProRow {
  const diff = p.newerMedian - p.olderMedian;
  return {
    older: p.older, newer: p.newer, storage: memLabel(p.memoryGB, p.storage), storageGb: p.storage,
    olderMedian: p.olderMedian, newerMedian: p.newerMedian, olderCount: p.olderCount, newerCount: p.newerCount,
    diff, pct: Math.round((Math.abs(diff) / Math.max(p.olderMedian, p.newerMedian)) * 1000) / 10,
    label: p.label, olderShort: "Pro", newerShort: "Air", ...(p.isNew ? { isNew: true } : {}),
  };
}

async function usedMedian(model: string, memoryGB: number, storage: number) {
  const where = { AND: [await modelWhere(model), { isSoldOut: false, storage, memoryGB, conditionRank: { notIn: ["J", "j", "ジャンク"] } }] };
  const count = await prisma.deviceInventory.count({ where });
  if (count < MIN_COUNT) throw new Error(`${model} ${memLabel(memoryGB, storage)} の在庫が ${count} 件しかありません（${MIN_COUNT}件以上必要）`);
  return { median: (await medianPrice(where, count))!, count };
}

export async function buildMbpVsAirScript(date: string): Promise<OldProScript> {
  if (MBA_M5_MEMORY_GB !== MBP_M6_MEMORY_GB) throw new Error("新品どうしのメモリがそろっていません");
  const rows: OldProRow[] = [
    makeRow({ older: "MacBook Pro 14インチ M6", newer: "MacBook Air 13インチ M5", label: "新品 Air M5／Pro M6", memoryGB: MBP_M6_MEMORY_GB, storage: MBP_M6_STORAGE_GB,
      olderMedian: MBP_M6_PRICE, newerMedian: MBA_M5_PRICE_1TB, olderCount: 0, newerCount: 0, isNew: true }),
  ];
  for (const c of USED) {
    const [a, p] = [await usedMedian(AIR, c.memoryGB, c.storage), await usedMedian(PRO, c.memoryGB, c.storage)];
    rows.push(makeRow({ older: PRO, newer: AIR, label: "中古 Air M2／Pro M1 Pro", memoryGB: c.memoryGB, storage: c.storage,
      olderMedian: p.median, newerMedian: a.median, olderCount: p.count, newerCount: a.count }));
  }
  for (const r of rows) {
    console.log(`  ${r.label}（${r.storage}・${r.isNew ? "新品・Apple公式" : `在庫 Pro ${r.olderCount}件／Air ${r.newerCount}件`}） Pro ${man(r.olderMedian)}円・Air ${man(r.newerMedian)}円（${r.diff === 0 ? "同じ" : `${mbpVsAirCheaper(r)}が${man(Math.abs(r.diff))}円安い`}・${r.pct}%）`);
    if (r.diff === 0) throw new Error(`${r.label}（${r.storage}）の値段が同じで、向きがありません`);
  }
  // 差の大きさの小さい順（1位＝いちばん同じ値段に近い組）
  const items = rows.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff)).slice(0, SHOWN);
  const top = items[0];
  const newRow = rows.find((r) => r.isNew)!;
  const cheaper = mbpVsAirCheaper(top);
  const proCheaper = top.diff > 0;
  if (!proCheaper) console.log("  ★注意: 1位は Air の方が安い（Pro の方が安い、とは言わない）");
  // Mac の店は activeMacShops（楽天市場の店の在庫も数える。横動画 2026-11-01-mbp-vs-mba と同じ）
  const shopCount = (await activeMacShops()).length;
  const sp = MBA_M2_VS_MBP_M1PRO;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。重さ・画面・端子は Apple サポートの技術仕様（lib/macbookAirM5.ts）
  const lines = ["軽さならAir", "画面と端子ならPro", "傷は写真で確認を"];

  const title = proCheaper
    ? `中古ならMacBook ProがAirより安い？M1 ProとM2 Airの差は${man(Math.abs(top.diff))}円`
    : `MacBook Pro vs Air、新品は${man(Math.abs(newRow.diff))}円差。中古なら${man(Math.abs(top.diff))}円差`;
  const rowText = (r: OldProRow) => r.isNew
    ? `新品 Air 13インチ M5（${r.storage}） ${man(r.newerMedian)}円／新品 Pro 14インチ M6（${r.storage}） ${man(r.olderMedian)}円 → ${mbpVsAirCheaper(r)}が${man(Math.abs(r.diff))}円安い`
    : `中古 Air 13インチ M2（${r.storage}・${r.newerCount}件） 相場${man(r.newerMedian)}円／中古 Pro 14インチ M1 Pro（${r.storage}・${r.olderCount}件） 相場${man(r.olderMedian)}円 → ${mbpVsAirCheaper(r)}が${man(Math.abs(r.diff))}円安い`;
  const description = [
    `MacBook Pro と MacBook Air を、同じメモリ・同じ SSD どうしで比べました。新品（Apple 公式）だと Air 13インチ M5 と Pro 14インチ M6（${newRow.storage}）で ${man(Math.abs(newRow.diff))}円差。中古だと M2 の Air と 14インチの M1 Pro（${top.storage}）の差は${man(Math.abs(top.diff))}円で、${cheaper}の方が安くなっています。`,
    "",
    ...items.map(rowText),
    "",
    `違い（Apple の技術仕様）: M1 Pro は ${sp.pro.display}・${sp.pro.ports}・${sp.pro.weight}。M2 Air は ${sp.air.display}・${sp.air.ports}・${sp.air.weight}。`,
    "",
    `比べ方: 新品は Apple 公式の値段（税込・${slash(MBA_M5_CHECKED > MBP_M6_CHECKED ? MBA_M5_CHECKED : MBP_M6_CHECKED)}確認）。中古は同じ構成（機種・メモリ・SSD）の中央値（在庫${MIN_COUNT}件以上・ジャンクを除く）。13インチの MacBook Pro は筐体が古い（Touch Bar）ので比べていません。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `MacBook Pro 14インチ M1 Proの店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(PRO)}?${utm(date)}`,
    `MacBook Air 13インチ M2: https://used.gadelog.com${modelPagePath(AIR)}?${utm(date)}`,
    `中古MacBookの全機種の相場: https://used.gadelog.com/mac?${utm(date)}`,
  ].join("\n");

  return {
    theme: "mbpvsair",
    date,
    shopCount,
    appleChecked: MBA_M5_CHECKED > MBP_M6_CHECKED ? MBA_M5_CHECKED : MBP_M6_CHECKED,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `新品はApple公式・中古は大手中古ショップ${shopCount}店・${slash(date)}`,
        question: "あなたは Pro派？Air派？",
      },
    },
    youtube: { title, description, hashtags: ["#MacBookPro", "#MacBookAir", "#中古MacBook"] },
  };
}
