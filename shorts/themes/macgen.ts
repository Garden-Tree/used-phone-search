/**
 * テーマ「MacBook Air、1世代前にするといくら安い？」: 連続する2世代の MacBook Air（新しい方 → 1世代前）を、同じ SSD の容量の中古の相場（中央値）で比べた差のランキング → 台本（10/27〜）
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: 13インチ M5→M4・M4→M3・M3→M2・M2→M1、15インチ M5→M4・M4→M3・M3→M2（PAIRS。機種名は lib/macCatalog.ts の表記。M1 は13インチだけで「MacBook Air M1」）
 * - 容量（DB の storage＝SSD）は、両方の機種で在庫が MIN_COUNT 件以上ある容量のうち、いちばん小さい容量。なければその組は出さない
 * - その容量の相場（中央値）どうしの差（新しい方 − 1世代前）の大きい順。率は新しい方の相場に対して。差が0以下の組は出さない。3組に満たなければ止める
 * - ひと言は1位の1世代前・その容量のメモリ（DB の memoryGB）の内訳から。分かる在庫が MIN_COUNT 件未満なら一般の注意だけ
 * 場面・行の型は fold・gen と同じ（FoldRow）。DB は機種ごとの容量別・メモリ別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import prisma from "@/lib/prisma";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { MAC_INFO } from "@/lib/macCatalog";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { MacGenScript, FoldRow } from "../types";

/** 比べる組（新しい方・1世代前） */
const PAIRS: [string, string][] = [
  ["MacBook Air 13インチ M5", "MacBook Air 13インチ M4"],
  ["MacBook Air 13インチ M4", "MacBook Air 13インチ M3"],
  ["MacBook Air 13インチ M3", "MacBook Air 13インチ M2"],
  ["MacBook Air 13インチ M2", "MacBook Air M1"],
  ["MacBook Air 15インチ M5", "MacBook Air 15インチ M4"],
  ["MacBook Air 15インチ M4", "MacBook Air 15インチ M3"],
  ["MacBook Air 15インチ M3", "MacBook Air 15インチ M2"],
];
const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_macgen`;
/** チップ（"M4"） */
export const macChip = (model: string) => MAC_INFO[model]?.chip ?? model.replace(/^MacBook Air\s+(\d+インチ\s+)?/, "");
/** 画面の大きさ（"13インチ"） */
export const macInch = (model: string) => `${MAC_INFO[model]?.inch ?? 13}インチ`;
/** 組の名前（"Air 13インチ M4／M3"） */
export const macPair = (newer: string, older: string) => `Air ${macInch(newer)} ${macChip(newer)}／${macChip(older)}`;

type Side = { where: Awaited<ReturnType<typeof modelWhere>>; counts: Map<number, number> };
async function side(model: string): Promise<Side> {
  const where = await modelWhere(model);
  const counts = new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), g.count] as const));
  return { where, counts };
}
const medianAt = async (s: Side, storage: number) => (await medianPrice({ AND: [s.where, { storage }] }, s.counts.get(storage) ?? 0))!;

/** その機種・容量のメモリの内訳（DB の集計だけ）。いちばん多いメモリと、メモリの分かる在庫に占める割合 */
async function memoryMix(s: Side, storage: number): Promise<{ gb: number; count: number; known: number } | null> {
  const rows = await prisma.deviceInventory.groupBy({ by: ["memoryGB"], where: { AND: [s.where, { storage }, { memoryGB: { not: null } }] }, _count: { _all: true } });
  const known = rows.reduce((a, r) => a + r._count._all, 0);
  if (known < MIN_COUNT) return null;
  const top = rows.reduce((a, b) => (b._count._all > a._count._all ? b : a));
  return { gb: top.memoryGB!, count: top._count._all, known };
}

export async function buildMacGenScript(date: string): Promise<MacGenScript> {
  const rows: FoldRow[] = [];
  const sides = new Map<string, Side>();
  for (const [newer, older] of PAIRS) {
    const [a, b] = [await side(newer), await side(older)];
    sides.set(older, b);
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
  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。1位の1世代前・その容量のメモリの内訳（DB）。Apple シリコンの MacBook はメモリを後から増やせない
  const mix = await memoryMix(sides.get(top.older)!, top.storageGb);
  const share = mix ? Math.round((mix.count / mix.known) * 100) : 0;
  if (mix) console.log(`  メモリ: ${top.older} ${top.storage} はメモリの分かる在庫 ${mix.known}件のうち ${mix.gb}GB が ${mix.count}件（${share}%）`);
  const lines = mix
    // 「59%」の後に「後から」を続けると「ゴカラ」と読まれた（10/27 ずんだもん）ので、2行目を「なので」で終えて読点を入れる
    ? [`${macChip(top.older)}の${top.storage}は`, `メモリ${mix.gb}GBが${share}%なので`, "8GBか16GBか確認を"]
    : ["メモリは後から", "増やせないので", "容量を確認しましょう"];

  const rawTitle = `MacBook Air ${macChip(top.newer)}→${macChip(top.older)}で${manYen(top.diff)}円安い！1世代前ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `1世代前で${manYen(top.diff)}円安い！中古MacBook Airの世代の差`;
  const rowText = (r: FoldRow, i: number) =>
    `${i + 1}位 ${r.newer}→${macChip(r.older)}（${r.storage}） ${man(r.newerMedian)}円 → ${man(r.olderMedian)}円（−${man(r.diff)}円・−${r.pct.toFixed(1)}%）`;
  const description = [
    `MacBook Air を1世代前にすると、中古の相場でいくら安くなるかのランキングです。1位は${top.newer}→${top.older}（SSD ${top.storage}）で、1世代前にすると${man(top.diff)}円（−${top.pct.toFixed(1)}%）安くなります。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: MacBook Air 13インチ（M1〜M5）・15インチ（M2〜M5）の連続する2世代の組で、両方に在庫が${MIN_COUNT}件以上ある SSD の容量のうちいちばん小さい容量の相場どうしを比べ、差の大きい順。率は新しい方の相場に対して。${mix ? `${top.older}（${top.storage}）のメモリはメモリの分かる在庫${mix.known}件のうち${mix.gb}GBが${mix.count}件。` : ""}データ: 大手中古ショップ${shopCount}店の在庫・相場＝同じ容量の中央値（${slash(date)}時点）。`,
    "",
    `${top.older}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.older)}?${utm(date)}`,
    `MacBook 全機種の中古相場: https://used.gadelog.com/mac?${utm(date)}`,
  ].join("\n");

  return {
    theme: "macgen",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "あなたは最新派？1世代前派？",
      },
    },
    youtube: { title, description, hashtags: ["#MacBook", "#MacBookAir", "#中古"] },
  };
}
