/**
 * テーマ「同じiPhoneでも、売る店でいくら違う？」: 同じ機種・同じ容量の買取価格（きれいな状態）の、3店の最高値と最安値の差のランキング → 台本（10/29〜）
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 店は買取の3店（lib/buybackPrices.ts の BUYBACK_SHOPS: ネットオフ・にこスマ・モバステ）。区分は各店の「きれいな状態」（ネットオフ 美品・にこスマ 良品・モバステ 中古の上限）
 * - 機種は表 BuybackPrice にある iPhone すべて。容量は **3店すべてに買取価格がある容量のうち、いちばん小さい容量**（1機種1行）
 * - 差 = 3店の最高値 − 最安値。差の大きい順（同じ差なら率の大きい方）。率は最高値に対して（安い店に売ると何%少ないか）。3機種に満たなければ止める
 * - 買取価格は週1回の更新（scraper/buyback_scraper.py）。使った行の最新の更新日を画面・説明欄に出す
 * DB は表 BuybackPrice（約1,400行の小さい表）を機種×容量×店の groupBy 1回だけ。在庫の表（DeviceInventory）は読まない
 */
import prisma from "@/lib/prisma";
import { BUYBACK_SHOPS } from "@/lib/buybackPrices";
import { storageLabel } from "@/lib/format";
import type { KaitoriShopRow, KaitoriShopScript } from "../types";

/** 動画・説明欄に出す数（3位・2位・1位） */
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
/** "2026-10-28" → "10/28" */
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const jst = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_kaitorishop`;

export async function buildKaitoriShopScript(date: string): Promise<KaitoriShopScript> {
  const GOOD = BUYBACK_SHOPS.map((s) => ({ shopName: s.name, grade: s.good }));
  // 機種×容量×店ごとに1つの値（同じ区分が2行あれば高い方。ログに出す）
  const groups = await prisma.buybackPrice.groupBy({
    by: ["model", "storage", "shopName"],
    where: { OR: GOOD, model: { startsWith: "iPhone" } },
    _count: { _all: true },
    _max: { price: true, updatedAt: true },
  });
  for (const g of groups.filter((x) => x._count._all > 1)) console.log(`  ★注意: ${g.model} ${g.storage}GB ${g.shopName} に「きれいな状態」が${g._count._all}行（高い方 ${man(g._max.price ?? 0)}円を使う）`);

  const models = [...new Set(groups.map((g) => g.model))];
  const rows: (KaitoriShopRow & { updated: Date })[] = [];
  for (const model of models) {
    const own = groups.filter((g) => g.model === model);
    const storages = [...new Set(own.map((g) => g.storage))].sort((a, b) => a - b);
    // 3店すべてに価格がある、いちばん小さい容量
    const gb = storages.find((s) => BUYBACK_SHOPS.every((shop) => own.some((g) => g.storage === s && g.shopName === shop.name && (g._max.price ?? 0) > 0)));
    if (gb === undefined) {
      const shops = [...new Set(own.map((g) => g.shopName))];
      console.log(`  対象外: ${model}（3店がそろう容量なし・載っている店 ${shops.join("・")}）`);
      continue;
    }
    const quotes = BUYBACK_SHOPS.map((shop) => {
      const g = own.find((x) => x.storage === gb && x.shopName === shop.name)!;
      return { shop: shop.name, label: shop.goodLabel, price: g._max.price!, updated: g._max.updatedAt! };
    }).sort((a, b) => b.price - a.price);
    const max = quotes[0].price;
    const min = quotes[quotes.length - 1].price;
    const diff = max - min;
    const updated = quotes.reduce((d, q) => (q.updated > d ? q.updated : d), quotes[0].updated);
    const storage = storageLabel(gb, model);
    console.log(`  候補: ${model}（${storage}） ${quotes.map((q) => `${q.shop} ${man(q.price)}円`).join("・")} → 差 ${man(diff)}円（更新 ${jst(updated)}）`);
    rows.push({
      model, storage, storageGb: gb,
      quotes: quotes.map(({ shop, label, price }) => ({ shop, label, price })),
      max, min, diff, pct: Math.round((diff / max) * 1000) / 10, updated,
    });
  }
  rows.sort((a, b) => b.diff - a.diff || b.pct - a.pct);
  if (rows.length < SHOWN) throw new Error(`3店すべてに買取価格がある iPhone が ${rows.length} 機種しかありません（${SHOWN}機種以上必要）`);
  const picked = rows.slice(0, SHOWN);
  // 画面・説明欄の更新日は、出す3機種の行の最新の更新日（JST）
  const updated = jst(picked.reduce((d, r) => (r.updated > d ? r.updated : d), picked[0].updated));
  const items: KaitoriShopRow[] = picked.map(({ updated: _u, ...r }) => (void _u, r));
  const top = items[0];
  const hi = top.quotes[0];
  const lo = top.quotes[top.quotes.length - 1];
  const shopNames = BUYBACK_SHOPS.map((s) => s.name).join("・");

  // 検品担当のひと言の下書き（1行16字以内・3行まで）
  const lines = ["売る前に", "3店の買取を", "比べましょう"];
  // つかみは答えから（意外な数字を1秒目に）。画面は機種と容量の3行＋高い店と安い店の札＋「差 ○円」、声は差額まで言う（voice.ts）。
  // hookStyle "answer" は付けない（SplitHook の札が「1位」になる。ここは「差」のまま）
  const hookLines = [`同じ${top.model}`, `${top.storage}でも、売る店で`, "買取価格が違う"];

  const rawTitle = `同じ${top.model}でも売る店で${man(top.diff)}円違う！iPhone買取の店の差ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `同じiPhoneでも売る店で${man(top.diff)}円違う！買取の店の差ランキング`;
  const rowText = (r: KaitoriShopRow, i: number) =>
    `${i + 1}位 ${r.model}（${r.storage}） 差${man(r.diff)}円（${r.quotes.map((q) => `${q.shop} ${man(q.price)}円`).join("／")}）`;
  const description = [
    `同じiPhone・同じ容量でも、売る店で買取価格がいくら違うかのランキングです。1位は${top.model}（${top.storage}）で、${hi.shop}の${man(hi.price)}円に対して${lo.shop}は${man(lo.price)}円。売る店で${man(top.diff)}円（${top.pct.toFixed(1)}%）違います。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: ${shopNames}の3店すべてに買取価格がある iPhone で、3店がそろういちばん小さい容量の「きれいな状態」（${BUYBACK_SHOPS.map((s) => `${s.name} ${s.goodLabel}`).join("・")}）の価格を比べ、最高値と最安値の差の大きい順。率は最高値に対して。買取価格は各店の公式・${md(updated)}更新・きれいな状態。買取の条件（特典込みかなど）は店ごとに違うので、売る前に各店のページで確かめてください。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `iPhoneの買取価格を3店で比べる: https://used.gadelog.com/iphone/kaitori?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "kaitorishop",
    date,
    shopCount: BUYBACK_SHOPS.length,
    updated,
    hookLines,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["中古の相場と買取価格は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `買取価格は各店の公式・${md(updated)}更新・${slash(date)}`,
        question: "あなたは、どこで売りますか？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone", "#買取"] },
  };
}
