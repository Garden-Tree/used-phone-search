/**
 * テーマ「iPad、1世代前にするといくら安い？」: 連続する2世代の iPad（新しい方 → 1世代前）を、同じ容量の中古の相場（中央値）で比べた差のランキング → 台本（10/27〜）
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: 無印 A16→第10世代→第9世代→第8世代、Air 11インチ M4→M3→M2→Air（第5世代）→第4世代、Air 13インチ M4→M3→M2、
 *   Pro 11インチ M5→M4→第4世代→第3世代→第2世代→第1世代、Pro 13インチ M5→M4→Pro 12.9インチ（第6世代）→第5世代→第4世代→第3世代、mini A17 Pro→第6世代→第5世代
 *   （PAIRS。機種名は lib/ipadCatalog.ts の表記。iPad mini (A20 Pro) は中古の在庫がまだないので入れない）
 * - 容量（DB の storage）は、両方の機種で在庫が MIN_COUNT 件以上ある容量のうち、いちばん小さい容量。なければその組は出さない
 * - その容量の相場（中央値）どうしの差（新しい方 − 1世代前）の大きい順。率は新しい方の相場に対して。差が0以下の組は出さない。3組に満たなければ止める
 * - ひと言は1位の組の Apple Pencil の対応（lib/ipadPencil.ts・Apple 公式で確かめた値）。1世代前で使えなくなる Pencil があればそれを、なければ「同じものが使える」
 * 場面・行の型は fold・gen・macgen と同じ（FoldRow）。DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { pencilsFor } from "@/lib/ipadPencil";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { IPAD_SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { IpadGenScript, FoldRow } from "../types";

/** 比べる組（新しい方・1世代前） */
const PAIRS: [string, string][] = [
  ["iPad (A16)", "iPad (第10世代)"],
  ["iPad (第10世代)", "iPad (第9世代)"],
  ["iPad (第9世代)", "iPad (第8世代)"],
  ["iPad Air 11インチ (M4)", "iPad Air 11インチ (M3)"],
  ["iPad Air 11インチ (M3)", "iPad Air 11インチ (M2)"],
  ["iPad Air 11インチ (M2)", "iPad Air (第5世代)"],
  ["iPad Air (第5世代)", "iPad Air (第4世代)"],
  ["iPad Air 13インチ (M4)", "iPad Air 13インチ (M3)"],
  ["iPad Air 13インチ (M3)", "iPad Air 13インチ (M2)"],
  ["iPad Pro 11インチ (M5)", "iPad Pro 11インチ (M4)"],
  ["iPad Pro 11インチ (M4)", "iPad Pro 11インチ (第4世代)"],
  ["iPad Pro 11インチ (第4世代)", "iPad Pro 11インチ (第3世代)"],
  ["iPad Pro 11インチ (第3世代)", "iPad Pro 11インチ (第2世代)"],
  ["iPad Pro 11インチ (第2世代)", "iPad Pro 11インチ (第1世代)"],
  ["iPad Pro 13インチ (M5)", "iPad Pro 13インチ (M4)"],
  ["iPad Pro 13インチ (M4)", "iPad Pro 12.9インチ (第6世代)"],
  ["iPad Pro 12.9インチ (第6世代)", "iPad Pro 12.9インチ (第5世代)"],
  ["iPad Pro 12.9インチ (第5世代)", "iPad Pro 12.9インチ (第4世代)"],
  ["iPad Pro 12.9インチ (第4世代)", "iPad Pro 12.9インチ (第3世代)"],
  ["iPad mini (A17 Pro)", "iPad mini (第6世代)"],
  ["iPad mini (第6世代)", "iPad mini (第5世代)"],
];
const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_ipadgen`;

/** 系列（"iPad Pro 11インチ (M5)" → "Pro 11インチ"・"iPad (A16)" → "iPad"・"iPad mini (第6世代)" → "mini"） */
export const ipadSeries = (model: string) => model.replace(/\s*\(.*\)$/, "").replace(/^iPad\s+/, "") || "iPad";
/** 世代（"iPad Pro 11インチ (M5)" → "M5"・"iPad (第10世代)" → "第10世代"） */
export const ipadGen = (model: string) => model.match(/\(([^)]+)\)$/)?.[1] ?? ipadSeries(model);
/** 組の名前（"Pro 11インチ M5／M4"・"iPad A16／第10世代"・"Pro 13インチ M4／12.9インチ 第6世代"） */
export const ipadPair = (newer: string, older: string) => {
  const [a, b] = [ipadSeries(newer), ipadSeries(older)];
  const tail = a === b ? ipadGen(older) : `${b.replace(/^(Pro|Air)\s+/, "")} ${ipadGen(older)}`;
  return `${a} ${ipadGen(newer)}／${tail}`;
};

type Side = { where: Awaited<ReturnType<typeof modelWhere>>; counts: Map<number, number> };
async function side(model: string): Promise<Side> {
  const where = await modelWhere(model);
  const counts = new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), g.count] as const));
  return { where, counts };
}
const medianAt = async (s: Side, storage: number) => (await medianPrice({ AND: [s.where, { storage }] }, s.counts.get(storage) ?? 0))!;

/** 1位の組の Pencil のひと言（1行16字以内・3行）。1世代前で使えなくなる Pencil（新しい順の先頭）があればそれ */
export function pencilLines(newer: string, older: string): { lines: string[]; note: string } {
  const [a, b] = [pencilsFor(newer), pencilsFor(older)];
  const lost = a.filter((p) => !b.includes(p));
  // 系列の名前が変わる組（Pro 13インチ (M4) → 12.9インチ (第6世代)）は「12.9インチ第6世代」まで書く
  const o = ipadSeries(newer) === ipadSeries(older) ? ipadGen(older) : `${ipadSeries(older).replace(/^(Pro|Air)\s+/, "")}${ipadGen(older)}`;
  if (lost.length) {
    const p = lost[0] === "Pro" ? "Pencil Pro" : `Pencil（${lost[0]}）`;
    return { lines: [`${o}は`, `${p}が`, "使えません"], note: `${older}で使える Apple Pencil は${b.join("・")}（${newer}は${a.join("・")}）` };
  }
  return { lines: ["Apple Pencilは", `${o}でも`, "同じものが使えます"], note: `使える Apple Pencil はどちらも${a.join("・")}` };
}

export async function buildIpadGenScript(date: string): Promise<IpadGenScript> {
  const rows: FoldRow[] = [];
  for (const [newer, older] of PAIRS) {
    const [a, b] = [await side(newer), await side(older)];
    const common = [...a.counts.keys()].filter((g) => g > 0 && (a.counts.get(g) ?? 0) >= MIN_COUNT && (b.counts.get(g) ?? 0) >= MIN_COUNT).sort((x, y) => x - y);
    if (common.length === 0) {
      console.log(`  対象外: ${newer}→${older}（両方に在庫${MIN_COUNT}件以上の容量がない）`);
      continue;
    }
    const gb = common[0];
    const [newerMedian, olderMedian] = [await medianAt(a, gb), await medianAt(b, gb)];
    const diff = newerMedian - olderMedian;
    const row: FoldRow = {
      newer, older, storage: storageLabel(gb, newer), storageGb: gb, newerMedian, olderMedian,
      newerCount: a.counts.get(gb)!, olderCount: b.counts.get(gb)!, diff, pct: Math.round((diff / newerMedian) * 1000) / 10,
    };
    console.log(`  候補: ${newer}→${older}（${row.storage}・在庫 ${row.newerCount}件／${row.olderCount}件） ${man(newerMedian)}円 → ${man(olderMedian)}円（差 ${man(diff)}円・${row.pct.toFixed(1)}%）`);
    if (diff > 0) rows.push(row);
  }
  rows.sort((x, y) => y.diff - x.diff || y.pct - x.pct);
  if (rows.length < SHOWN) throw new Error(`比べられる組が ${rows.length} 組しかありません（${SHOWN}組以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeShops(IPAD_SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。1位の組の Apple Pencil の対応（Apple 公式「Apple Pencil の互換性」・lib/ipadPencil.ts）
  const pencil = pencilLines(top.newer, top.older);
  console.log(`  Pencil: ${pencil.note}`);

  const rawTitle = `iPad ${ipadPair(top.newer, top.older).replace("／", "→")}で${manYen(top.diff)}円安い！1世代前ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `1世代前で${manYen(top.diff)}円安い！中古iPadの世代の差`;
  const rowText = (r: FoldRow, i: number) =>
    `${i + 1}位 ${r.newer}→${ipadGen(r.older)}（${r.storage}） ${man(r.newerMedian)}円 → ${man(r.olderMedian)}円（−${man(r.diff)}円・−${r.pct.toFixed(1)}%）`;
  const description = [
    `iPad を1世代前にすると、中古の相場でいくら安くなるかのランキングです。1位は${top.newer}→${top.older}（${top.storage}）で、1世代前にすると${man(top.diff)}円（−${top.pct.toFixed(1)}%）安くなります。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: iPad・iPad Air・iPad Pro・iPad mini の連続する2世代の組で、両方に在庫が${MIN_COUNT}件以上ある容量のうちいちばん小さい容量の相場どうしを比べ、差の大きい順。率は新しい方の相場に対して。${pencil.note}（Apple 公式「Apple Pencil の互換性」）。データ: 大手中古ショップ${shopCount}店の在庫・相場＝同じ容量の中央値（${slash(date)}時点）。`,
    "",
    `${top.older}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.older)}?${utm(date)}`,
    `iPad 全機種の中古相場: https://used.gadelog.com/ipad?${utm(date)}`,
  ].join("\n");

  return {
    theme: "ipadgen",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines: pencil.lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "あなたは最新派？1世代前派？",
      },
    },
    youtube: { title, description, hashtags: ["#iPad", "#中古iPad", "#中古"] },
  };
}
