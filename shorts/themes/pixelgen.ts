/**
 * テーマ「Pixel、1世代前にするといくら安い？」: 連続する2世代の Google Pixel（新しい方 → 1世代前）を、同じ容量の中古の相場（中央値）で比べた差のランキング → 台本（10/27〜）
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: 無印 11→10→9→8→7→6、Pro 11 Pro→10 Pro→9 Pro・8 Pro→7 Pro→6 Pro、Pro XL 11 Pro XL→10 Pro XL→9 Pro XL→8 Pro（8 Pro の後継は同じ大きさの 9 Pro XL）、
 *   a 10a→9a→8a→7a→6a（PAIRS。機種名は lib/pixelCatalog.ts の表記。折りたたみは fold の回で扱うので入れない）
 * - 1世代前の Google のアップデート保証が作った月の時点で終わっている組は出さない（pixelbudget と同じ。lib/pixelCatalog.ts の updateYearsLeft）
 * - 容量（DB の storage）は、両方の機種で在庫が MIN_COUNT 件以上ある容量のうち、いちばん小さい容量。なければその組は出さない
 * - その容量の相場（中央値）どうしの差（新しい方 − 1世代前）の大きい順。率は新しい方の相場に対して。差が0以下の組は出さない。3組に満たなければ止める
 * - ひと言は1位の1世代前のアップデート保証の終わり（Google 公式の販売開始の年月＋年数。lib/pixelCatalog.ts）
 * 場面・行の型は fold・gen・macgen と同じ（FoldRow）。DB は機種ごとの容量別の集計（groupBy）と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { PIXEL_SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { PixelGenScript, FoldRow } from "../types";

/** 比べる組（新しい方・1世代前） */
const PAIRS: [string, string][] = [
  ["Pixel 11", "Pixel 10"],
  ["Pixel 10", "Pixel 9"],
  ["Pixel 9", "Pixel 8"],
  ["Pixel 8", "Pixel 7"],
  ["Pixel 7", "Pixel 6"],
  ["Pixel 11 Pro", "Pixel 10 Pro"],
  ["Pixel 10 Pro", "Pixel 9 Pro"],
  ["Pixel 8 Pro", "Pixel 7 Pro"],
  ["Pixel 7 Pro", "Pixel 6 Pro"],
  ["Pixel 11 Pro XL", "Pixel 10 Pro XL"],
  ["Pixel 10 Pro XL", "Pixel 9 Pro XL"],
  // 9 から Pro が2つの大きさ（6.3・6.8インチ）に分かれた。8 Pro（6.7インチ）の後継は大きい方の 9 Pro XL
  ["Pixel 9 Pro XL", "Pixel 8 Pro"],
  ["Pixel 10a", "Pixel 9a"],
  ["Pixel 9a", "Pixel 8a"],
  ["Pixel 8a", "Pixel 7a"],
  ["Pixel 7a", "Pixel 6a"],
];
const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const manYen = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_pixelgen`;
/** "Pixel 10 Pro" → "10 Pro" */
export const pixelShort = (model: string) => model.replace(/^Pixel\s+/, "");
/** 組の名前（"Pixel 10／9"） */
export const pixelPair = (newer: string, older: string) => `Pixel ${pixelShort(newer)}／${pixelShort(older)}`;

type Side = { where: Awaited<ReturnType<typeof modelWhere>>; counts: Map<number, number> };
async function side(model: string): Promise<Side> {
  const where = await modelWhere(model);
  const counts = new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), g.count] as const));
  return { where, counts };
}
const medianAt = async (s: Side, storage: number) => (await medianPrice({ AND: [s.where, { storage }] }, s.counts.get(storage) ?? 0))!;

export async function buildPixelGenScript(date: string): Promise<PixelGenScript> {
  const month = date.slice(0, 7);
  const rows: FoldRow[] = [];
  for (const [newer, older] of PAIRS) {
    const left = updateYearsLeft(older, month);
    if (left === undefined || left <= 0) {
      console.log(`  対象外: ${newer}→${older}（${older}のアップデート保証が${updateUntil(older) ? ` ${jaMonth(updateUntil(older)!)} で` : ""}終了）`);
      continue;
    }
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
  const shopCount = (await activeShops(PIXEL_SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。1位の1世代前のアップデート保証の終わり（Google 公式。lib/pixelCatalog.ts）
  const [newerUntil, olderUntil] = [jaMonth(updateUntil(top.newer)!), jaMonth(updateUntil(top.older)!)];
  console.log(`  アップデート保証: ${top.newer} ${newerUntil}まで・${top.older} ${olderUntil}まで`);
  const lines = [`${top.older}も`, "アップデート保証は", `${olderUntil}まで`];

  const rawTitle = `Pixel ${pixelShort(top.newer)}→${pixelShort(top.older)}で${manYen(top.diff)}円安い！Pixel 1世代前ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `1世代前で${manYen(top.diff)}円安い！中古Pixelの世代の差`;
  const rowText = (r: FoldRow, i: number) =>
    `${i + 1}位 ${r.newer}→${pixelShort(r.older)}（${r.storage}） ${man(r.newerMedian)}円 → ${man(r.olderMedian)}円（−${man(r.diff)}円・−${r.pct.toFixed(1)}%）`;
  const description = [
    `Google Pixel を1世代前にすると、中古の相場でいくら安くなるかのランキングです。1位は${top.newer}→${top.older}（${top.storage}）で、1世代前にすると${man(top.diff)}円（−${top.pct.toFixed(1)}%）安くなります。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: Pixel・Pixel Pro・Pixel Pro XL・Pixel a の連続する2世代の組（1世代前のアップデート保証が終わった組は除く）で、両方に在庫が${MIN_COUNT}件以上ある容量のうちいちばん小さい容量の相場どうしを比べ、差の大きい順。率は新しい方の相場に対して。アップデート保証は${top.newer}が${newerUntil}まで・${top.older}が${olderUntil}まで（Google 公式の保証期間と販売開始の年月から）。データ: 大手中古ショップ${shopCount}店の在庫・相場＝同じ容量の中央値（${slash(date)}時点）。`,
    "",
    `${top.older}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.older)}?${utm(date)}`,
    `Pixel 全機種の中古相場: https://used.gadelog.com/pixel?${utm(date)}`,
  ].join("\n");

  return {
    theme: "pixelgen",
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
    youtube: { title, description, hashtags: ["#Pixel", "#GooglePixel", "#中古"] },
  };
}
