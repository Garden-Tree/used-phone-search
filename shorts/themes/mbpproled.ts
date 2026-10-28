/**
 * テーマ「MacBook Pro 4択、新型（有機EL）よりいくら安い？」（10/29〜。PROLED XDR ディスプレイ搭載 MacBook Pro の発表に合わせた回）→ 台本
 * 場面・画面は ipadmini・mbpnew と同じ（台本の型 IpadMiniScript・theme "mbpproled"。画面の文字は scenes.copy で変える）。
 * 台本案は longform/2026-10-31-mbp-proled/short-plan.md（第2稿）。数字は横動画（同じフォルダの data-query.log）と同じ決め方。
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 基準はいちばん高い新型 PROLED 14インチ M5 Pro（24GB・1TB 499,800円。lib/macbookProProled.ts・Apple 公式・税込・10/29 確認）
 * - 行は 14インチどうしの3つ: 今のミニLED M5 Pro（新品・公式の定数）・中古の M5 Pro 24GB・1TB（DB の中央値）・新型 M6 24GB・1TB（新品・lib/macbookProProled.ts の MBP_M6_24GB_PRICE。4つとも 24GB・1TB で揃える・10/29 ユーザー）
 * - 中古の相場は構成（機種・SSD・メモリ）の中央値（ジャンクを除く・在庫 MIN_COUNT 件以上）。新品の行は isNew（件数は持たない）
 * - 並びは PROLED との差の大きい順。items[0]（差がいちばん大きい）を伏せて reveal で PROLED と比べる（10/29 は M6）
 * - reveal の仕様の違いは lib/macbookProProled.ts の MBP_PROLED_COMPARE（チップ・画面・重さ）
 * DB は count と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { modelPagePath } from "@/lib/catalog";
import { MAC_SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import { MBP_M6_CHECKED } from "@/lib/macbookProM6";
import { MBP_M6_24GB_PRICE, MBP_MINILED_PRICE, MBP_PROLED_CHECKED, MBP_PROLED_COMPARE, MBP_PROLED_MEMORY_GB, MBP_PROLED_NAME, MBP_PROLED_PRICE, MBP_PROLED_RELEASE, MBP_PROLED_STORAGE_GB } from "@/lib/macbookProProled";
import type { IpadMiniRow, IpadMiniScript } from "../types";

const USED_MODEL = "MacBook Pro 14インチ M5 Pro";
const MIN_COUNT = 5;

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_mbpproled`;
const memLabel = (gb: number, ssd: number) => `${gb}GB・${ssd >= 1024 ? `${ssd / 1024}TB` : `${ssd}GB`}`;
const pctOf = (diff: number) => Math.round((diff / MBP_PROLED_PRICE) * 1000) / 10;

/** 新品の行（公式の定数）。median に公式の価格を入れる（reveal の2本目の棒・ranking の値段の欄） */
function newRow(model: string, short: string, memoryGB: number, storageGb: number, price: number): IpadMiniRow {
  const diff = MBP_PROLED_PRICE - price;
  if (diff <= 0) throw new Error(`${model} の価格が PROLED 以上です（差 ${diff}円）`);
  return { model, short, year: "新品", storage: memLabel(memoryGB, storageGb), storageGb, median: price, count: 0, isNew: true,
    newStorageGb: MBP_PROLED_STORAGE_GB, newPrice: MBP_PROLED_PRICE, diff, pct: pctOf(diff) };
}

export async function buildMbpProledScript(date: string): Promise<IpadMiniScript> {
  // 中古: 14インチ M5 Pro・PROLED と同じ 24GB・1TB。中央値はサイトと同じ lib/modelInventory.ts の medianPrice
  const where = { AND: [await modelWhere(USED_MODEL), { isSoldOut: false, storage: MBP_PROLED_STORAGE_GB, memoryGB: MBP_PROLED_MEMORY_GB, conditionRank: { notIn: ["J", "j", "ジャンク"] } }] };
  const count = await prisma.deviceInventory.count({ where });
  if (count < MIN_COUNT) throw new Error(`${USED_MODEL} ${memLabel(MBP_PROLED_MEMORY_GB, MBP_PROLED_STORAGE_GB)} の在庫が ${count} 件しかありません（${MIN_COUNT}件以上必要）`);
  const med = (await medianPrice(where, count))!;
  const usedDiff = MBP_PROLED_PRICE - med;
  if (usedDiff <= 0) throw new Error(`${USED_MODEL} の中古の相場が PROLED 以上です（差 ${usedDiff}円）`);
  const used: IpadMiniRow = {
    model: "中古 14インチ M5 Pro", short: "中古のM5 Pro", year: "中古", storage: memLabel(MBP_PROLED_MEMORY_GB, MBP_PROLED_STORAGE_GB), storageGb: MBP_PROLED_STORAGE_GB,
    median: med, count, newStorageGb: MBP_PROLED_STORAGE_GB, newPrice: MBP_PROLED_PRICE, diff: usedDiff, pct: pctOf(usedDiff),
  };
  const rows = [
    newRow("今の14インチ M5 Pro（ミニLED）", "今の14インチ", MBP_PROLED_MEMORY_GB, MBP_PROLED_STORAGE_GB, MBP_MINILED_PRICE),
    used,
    newRow("新型 14インチ M6", "M6", MBP_PROLED_MEMORY_GB, MBP_PROLED_STORAGE_GB, MBP_M6_24GB_PRICE),
  ];
  for (const r of rows) {
    console.log(`  ${r.model}（${r.storage}・${r.isNew ? "新品・Apple公式" : `在庫${r.count}件`}） ${r.isNew ? "新品" : "相場"} ${man(r.median)}円 / PROLED ${man(MBP_PROLED_PRICE)}円（差 ${man(r.diff)}円・${r.pct}%）`);
  }
  const items = rows.sort((a, b) => b.diff - a.diff);
  const top = items[0];
  const compare = MBP_PROLED_COMPARE.map((c) => ({ label: c.label, a20: c.proled, a17: top.short === "M6" ? c.m6 : c.miniled }));
  const shopCount = (await activeShops(MAC_SHOPS)).length;
  const m6Row = items.find((r) => r.short === "M6")!;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）
  const lines = ["Proのチップが要るか", "画面と軽さに", "いくら出すか"];

  const rawTitle = `MacBook Pro 4択、タッチ対応の新型は${man(MBP_PROLED_PRICE)}円。M6なら${man(m6Row.diff / 10000)}万円安い`;
  const title = rawTitle.length <= 60 ? rawTitle : "新型MacBook Pro（有機EL）と今のモデル・中古・M6、いくら違う？";
  const description = [
    `今選べる MacBook Pro 14インチの4つを、いちばん高い新型（PROLED XDR・タッチ対応・${md(MBP_PROLED_RELEASE)}発売・M5 Pro ${memLabel(MBP_PROLED_MEMORY_GB, MBP_PROLED_STORAGE_GB)} ${man(MBP_PROLED_PRICE)}円〜）と比べました。`,
    "",
    ...items.map((r) => r.isNew
      ? `${r.short === "M6" ? `新型 M6（${r.storage}・新品）` : `今の 14インチ M5 Pro（ミニLED・${r.storage}・新品）`} ${man(r.median)}円 → −${man(r.diff)}円（−${r.pct.toFixed(1)}%）${r.short === "M6" ? "※チップは M6" : ""}`
      : `中古 MacBook Pro 14インチ M5 Pro（${r.storage}・在庫${r.count}件） 相場${man(r.median)}円 → −${man(r.diff)}円（−${r.pct.toFixed(1)}%）`),
    "",
    "違い（Apple 公式の仕様）: 新型は有機EL・タッチ・Dynamic Island・1.38kg。今のモデルと中古は同じ M5 Pro でミニLED・1.60kg。M6 はミニLED・1.55kg。",
    `比べ方: 新品は Apple 公式の 24GB・1TB の構成（税込・${slash(MBP_PROLED_CHECKED > MBP_M6_CHECKED ? MBP_PROLED_CHECKED : MBP_M6_CHECKED)}確認）。中古は同じ構成（機種・メモリ・SSD）の中央値（在庫${MIN_COUNT}件以上・ジャンクを除く）。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `MacBook Pro 14インチ M5 Proの店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(USED_MODEL)}?${utm(date)}`,
    `中古MacBookの全機種の相場: https://used.gadelog.com/mac?${utm(date)}`,
  ].join("\n");

  return {
    theme: "mbpproled",
    date,
    shopCount,
    appleChecked: MBP_PROLED_CHECKED,
    scenes: {
      newModel: { name: MBP_PROLED_NAME, release: MBP_PROLED_RELEASE, price: MBP_PROLED_PRICE },
      ranking: { items },
      compare,
      copy: {
        head: ["MacBook Pro 4択", "新型（有機EL）よりいくら安い？"],
        hook: ["MacBook Pro、", "タッチ対応の新型より", "いくら安い？"],
        hookSub: "有機EL・タッチ",
        hookRight: { label: "ほか3つ", sub: "今・中古・M6" },
        foot: `${slash(date)}・新品はApple公式（24GB・1TB）
中古は同じメモリ・SSDの中央値`,
        revealSub: top.short === "M6" ? `チップはM6・${top.storage}・新品` : `${top.storage}・${top.isNew ? "新品" : `在庫${top.count}件`}`,
        newBar: "新型 有機EL",
        oldBar: top.short === "M6" ? "新型 M6" : top.isNew ? "新品" : "中古の相場",
        compareNewHead: "有機EL",
        compareHead: top.short,
        rankBadges: true,
      },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `新品はApple公式・中古は大手中古ショップ${shopCount}店・${slash(date)}`,
        question: "4つのうち、どれにする？",
      },
    },
    youtube: { title, description, hashtags: ["#MacBookPro", "#中古MacBook", "#MacBook"] },
  };
}
