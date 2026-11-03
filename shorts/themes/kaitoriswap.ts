/**
 * テーマ「売って1つ上の世代に買い替えると、いくら足す？」（11/3〜・機種ごとの買取ページ /iphone/<slug>/kaitori とつなぐ回）→ 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 組: 売る機種 → 1つ上の世代（lib/nextGeneration.ts の NEXT_GENERATION_PAIRS。同じ系統）
 * - 容量: 売る機種の買取価格が載っている店がいちばん多い容量（同じなら小さい方。買取ページの「比べる容量」と同じ）。
 *   1つ上の世代はその同じ容量の中古の相場（中央値・在庫 MIN_COUNT 件以上）。なければその組は出さない
 * - 売値 = 3店（ネットオフ・にこスマ・モバステ）のきれいな状態のいちばん高い値段（店が表示している上限・週1回）。2店以上に値段がある組だけ
 * - 足す金額 = 1つ上の世代の相場 − 売値。小さい順（いちばん安く1つ上にできる組が1位）
 * DB は買取の表（1機種の行だけ）と、1機種・1容量の件数と中央値の1行だけ。在庫の行を丸ごと取らない
 */
import { storageLabel } from "@/lib/format";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import { NEXT_GENERATION_PAIRS } from "@/lib/nextGeneration";
import { getModelBuyback } from "@/lib/buybackPrices";
import { getMedianAt } from "@/lib/modelStats";
import { kaitoriPath, type mainStorage } from "@/lib/kaitoriModel";
import type { KaitoriSwapRow, KaitoriSwapScript } from "../types";

const MIN_COUNT = 5;
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_kaitoriswap`;
/** "iPhone 13 Pro" → "13 Pro" */
const short = (model: string) => model.replace(/^iPhone\s+/, "");

export async function buildKaitoriSwapScript(date: string): Promise<KaitoriSwapScript> {
  const rows: KaitoriSwapRow[] = [];
  for (const [older, newer] of NEXT_GENERATION_PAIRS) {
    // 比べる容量を、載っている店の多い順（同じなら小さい方）に試し、1つ上の世代に同じ容量の在庫があるものを使う
    // （12 は 64GB の店がいちばんそろうが、13 に 64GB はない → 128GB で比べる）
    const storages = await getModelBuyback(older);
    let main: ReturnType<typeof mainStorage> = null;
    let at: { count: number; median: number | null } | null = null;
    for (const cand of [...storages].sort((a, b) => b.cells.length - a.cells.length || a.storage - b.storage)) {
      if (!cand.best || cand.cells.length < 2) continue;
      const m = await getMedianAt(newer, cand.storage);
      if (m.count >= MIN_COUNT && m.median !== null) { main = cand; at = m; break; }
    }
    if (!main || !main.best || !at || at.median === null) continue;
    const row: KaitoriSwapRow = {
      older, newer, storage: storageLabel(main.storage, older), storageGb: main.storage,
      sell: main.best.price, shop: main.best.shop, shops: main.cells.length,
      newerMedian: at.median, newerCount: at.count, add: at.median - main.best.price,
    };
    console.log(`  候補: ${older}（${row.storage}）を${row.shop}で ${man(row.sell)}円（${row.shops}店） → ${newer} 相場 ${man(row.newerMedian)}円（在庫${row.newerCount}件）・足す ${man(row.add)}円`);
    rows.push(row);
  }
  rows.sort((x, y) => x.add - y.add || x.newerMedian - y.newerMedian);
  if (rows.length < SHOWN) throw new Error(`比べられる組が ${rows.length} 組しかありません（${SHOWN}組以上必要）`);
  const items = rows.slice(0, SHOWN);
  const top = items[0];
  const shopCount = (await activeShops(SHOPS)).length;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。買取の値段は店の上限なので、査定で下がる
  const lines = ["買取の値段は上限", "傷と電池の状態で", "査定が下がります"];

  const rawTitle = `${top.older}を売れば+${man(top.add)}円で${short(top.newer)}に！売って買い替えると いくら足す？`;
  const title = rawTitle.length <= 60 ? rawTitle : `売って1つ上に買い替えると+${man(top.add)}円！中古iPhone`;
  const rowText = (r: KaitoriSwapRow, i: number) =>
    `${i + 1}位 ${r.older}（${r.storage}）を${r.shop}で${man(r.sell)}円で売る → ${r.newer}（${r.storage}）相場${man(r.newerMedian)}円・足す${man(r.add)}円`;
  const description = [
    `いまの iPhone をいちばん高い買取店で売って、1つ上の世代の中古に買い替えると、いくら足せばいいかのランキング（足す金額の小さい順）です。1位は${top.older}（${top.storage}）で、${top.shop}の買取${man(top.sell)}円。${top.newer}の中古の相場${man(top.newerMedian)}円まで、あと${man(top.add)}円です。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: 同じ系統の1つ上の世代の組（無印・mini・Plus・Pro・Pro Max・e・SE）で、売る機種は買取価格が載っている店がいちばん多い容量。売値はネットオフ・にこスマ・モバステのきれいな状態の買取価格のいちばん高い値段（店が表示している上限・週1回取得・2店以上に値段がある組だけ）。1つ上の世代は同じ容量の中古の相場（中央値・在庫${MIN_COUNT}件以上）。実際の査定は状態で下がります。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.older}の買取価格（3店）と買い替えの差額: https://used.gadelog.com${kaitoriPath(top.older)}?${utm(date)}`,
    `iPhone の買取価格（機種ごと）: https://used.gadelog.com/iphone/kaitori?${utm(date)}`,
  ].join("\n");

  return {
    theme: "kaitoriswap",
    date,
    shopCount,
    scenes: {
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["機種ごとの買取価格は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `買取は3店の公式・中古は大手中古ショップ${shopCount}店・${slash(date)}`,
        question: "あなたなら 売って買い替える？",
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone買取"] },
  };
}
