/**
 * テーマ stockup「先週から在庫がいちばん増えた中古iPhoneは？」・stockdown（減った版・stockup に --down でも同じ）（11/16〜）。
 * 場面は stock（在庫数ランキング）と同じ。数字は件数そのものでなく「1週間の件数の増減」
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 件数は価格推移の記録（PriceSnapshot・storage=0＝全容量）の count。lib/priceHistory.ts の recordPriceSnapshots が毎日書く
 *   「機種ページと同じ範囲の販売中の在庫（Amazon 整備済み品を除く・ジャンク品を含む）」の件数
 * - 今週＝iPhone の記録がある最新の日。先週＝その7日前にいちばん近い記録の日（前後3日まで。なければ止める）
 * - 機種は lib/catalog.ts の ALL_PAGE_MODELS（機種ページのある iPhone）で、今週の件数が MIN_COUNT 件以上の機種だけ（少ない機種の増減は誤差が大きい）。
 *   先週の記録がない機種は除く
 * - 並びは増えた件数の多い順（stockdown は減った件数の多い順）。同じなら率の大きい方。率は先週の件数に対して（%・小数1桁）
 * - 相場は stock と同じ「在庫がいちばん多い容量の中央値」（primaryMedian）。上位の機種だけ1行ずつ
 * DB は PriceSnapshot の最新日の aggregate 1回・日付の groupBy 1回・2日分の storage=0 の行（iPhone の機種だけ）と、上位の機種の相場だけ。在庫の行を丸ごと取らない
 */
import prisma from "@/lib/prisma";
import { ALL_PAGE_MODELS, modelPagePath, modelToSlug } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { modelWhere, primaryMedian } from "@/lib/modelInventory";
import { ALL_STORAGE } from "@/lib/priceHistory";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { StockRow, StockScript } from "../types";

const SHOWN = 3;
/** 今週の件数がこれ未満の機種は入れない（少ない機種の増減は誤差が大きい） */
export const STOCKUP_MIN_COUNT = 30;

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${man(Math.abs(n))}`;
const utm = (date: string, theme: StockScript["theme"]) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_${theme}`;
/** "iPhone 13" → "13"・"iPhone SE (第3世代)" → "SE（第3世代）"（タイトルの答え） */
const titleName = (model: string) => model.replace(/^iPhone\s+/, "").replace(/\s*\((第\d世代)\)$/, "（$1）");

export async function buildStockUpScript(date: string, down = false): Promise<StockScript> {
  const theme = down ? "stockdown" : "stockup";
  const slugToModel = new Map(ALL_PAGE_MODELS.map((m) => [modelToSlug(m), m]));
  const slugs = [...slugToModel.keys()];
  const latest = (await prisma.priceSnapshot.aggregate({ where: { modelSlug: { in: slugs }, storage: ALL_STORAGE }, _max: { date: true } }))._max.date;
  if (!latest) throw new Error("iPhone の価格推移の記録（PriceSnapshot）がありません");
  // 7日前にいちばん近い記録の日（前後3日まで。同じ近さなら古い方＝7日以上前）
  const target = latest.getTime() - 7 * 86_400_000;
  const days = await prisma.priceSnapshot.groupBy({
    by: ["date"],
    where: { modelSlug: { in: slugs }, storage: ALL_STORAGE, date: { gte: new Date(target - 3 * 86_400_000), lte: new Date(target + 3 * 86_400_000) } },
  });
  const prev = days.map((d) => d.date).sort((a, b) => Math.abs(a.getTime() - target) - Math.abs(b.getTime() - target) || a.getTime() - b.getTime())[0];
  if (!prev) throw new Error(`${iso(latest)} の7日前（前後3日）に記録がありません`);
  const fromDate = iso(prev);
  const toDate = iso(latest);
  const gap = Math.round((latest.getTime() - prev.getTime()) / 86_400_000);
  console.log(`  比べる日: ${fromDate} → ${toDate}（${gap}日）`);

  const snaps = await prisma.priceSnapshot.findMany({
    where: { date: { in: [prev, latest] }, modelSlug: { in: slugs }, storage: ALL_STORAGE },
    select: { date: true, modelSlug: true, count: true },
  });
  const before = new Map<string, number>();
  const after = new Map<string, number>();
  for (const r of snaps) (r.date.getTime() === latest.getTime() ? after : before).set(r.modelSlug, r.count);

  const changes: { model: string; prev: number; count: number; diff: number; pct: number }[] = [];
  const noPrev: string[] = [];
  for (const [slug, count] of after) {
    if (count < STOCKUP_MIN_COUNT) continue;
    const model = slugToModel.get(slug)!;
    const p = before.get(slug);
    if (p === undefined) { noPrev.push(model); continue; }
    changes.push({ model, prev: p, count, diff: count - p, pct: p > 0 ? Math.round(((count - p) / p) * 1000) / 10 : 0 });
  }
  if (noPrev.length) console.log(`  先週の記録がない機種（入れない）: ${noPrev.join("・")}`);
  const sign = down ? -1 : 1;
  const ranked = changes.filter((r) => sign * r.diff > 0).sort((a, b) => sign * (b.diff - a.diff) || sign * (b.pct - a.pct));
  ranked.slice(0, 8).forEach((r, i) => console.log(`  ${i + 1}. ${r.model} ${man(r.prev)}件 → ${man(r.count)}件（${signed(r.diff)}件・${r.pct >= 0 ? "+" : "−"}${Math.abs(r.pct).toFixed(1)}%）`));
  console.log(`  対象 ${changes.length}機種（今週${STOCKUP_MIN_COUNT}件以上）・${down ? "減った" : "増えた"}機種 ${ranked.length}`);
  if (ranked.length < SHOWN) throw new Error(`在庫が${down ? "減った" : "増えた"}iPhoneが ${ranked.length} 機種しかありません（${SHOWN}機種以上必要）`);
  const total = changes.reduce((a, r) => a + r.count, 0);

  const items: StockRow[] = [];
  for (const r of ranked.slice(0, SHOWN)) {
    const p = await primaryMedian(await modelWhere(r.model));
    if (!p) throw new Error(`${r.model} の相場が取れません`);
    items.push({ model: r.model, count: r.count, share: Math.round((r.count / total) * 1000) / 10, storage: storageLabel(p.storage, r.model), storageGb: p.storage, median: p.price, storageCount: p.count, prev: r.prev, diff: r.diff, pct: r.pct });
  }
  const top = items[0];
  const shopCount = new Set((await activeShops(SHOPS)).map((s) => s.name)).size;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。理由は言い切らない（増えた・減ったの事実と、選び方の一般論だけ）
  const lines = down
    ? ["在庫が減った機種は", "選べる在庫が", "少なくなっています"]
    : ["在庫が増えた機種は", "電池や保証を", "比べて選びやすい"];
  const verb = down ? "減った" : "増えた";
  const rawTitle = `先週から在庫がいちばん${verb}中古iPhoneは${titleName(top.model)}！${signed(top.diff!)}件ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `先週から在庫がいちばん${verb}中古iPhoneは？${signed(top.diff!)}件ランキング`;
  const rowText = (r: StockRow, i: number) => `${i + 1}位 ${r.model} 先週${man(r.prev!)}件→今週${man(r.count)}件（${signed(r.diff!)}件・${r.pct! >= 0 ? "+" : "−"}${Math.abs(r.pct!).toFixed(1)}%）・相場${man(r.median)}円（${r.storage}）`;
  const description = [
    `先週から在庫がいちばん${verb}中古iPhoneは？ 大手中古ショップの在庫の数の1週間の変化のランキングです。1位は${top.model}で、先週${man(top.prev!)}件→今週${man(top.count)}件（${signed(top.diff!)}件）。相場は${top.storage}で${man(top.median)}円。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: サイトの価格推移の記録（毎日・機種ごとの販売中の在庫の件数。全容量）で、${slash(fromDate)}と${slash(toDate)}の件数を比べ、${verb}件数の多い順。対象は機種ページのあるiPhoneのうち、${slash(toDate)}の在庫が${STOCKUP_MIN_COUNT}件以上の${changes.length}機種。率は先週の件数に対して。相場は在庫がいちばん多い容量の中央値（機種ページと同じ）。データ: 大手中古ショップ${shopCount}店の在庫。`,
    "",
    `${top.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date, theme)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date, theme)}`,
  ].join("\n");

  return {
    theme,
    date,
    shopCount,
    fromDate,
    toDate,
    minCount: STOCKUP_MIN_COUNT,
    scenes: {
      total,
      modelCount: changes.length,
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(fromDate)}→${slash(toDate)}`,
        question: "あなたなら どれにする？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
