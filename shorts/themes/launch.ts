/**
 * テーマ「今日発売の新型、中古の旧型ならいくら安い？」（11/5〜。MacBook Pro M6 と iPad mini A20 Pro の発売日 11/6 の朝の回）→ 台本
 * 場面・画面は mbpnew と同じ（台本の型 IpadMiniScript）。10/27 の ipadmini・10/28 の mbpnew は別々の回で、この回は2機種を発売日に並べる。
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 新型は Apple 公式（税込）のいちばん安い構成: MacBook Pro 14インチ M6（16GB・1TB。lib/macbookProM6.ts）・iPad mini A20 Pro（128GB。lib/ipadMiniA20.ts）
 * - 中古は同じ構成で比べる: 14インチ M5・M4 は 16GB・1TB、iPad mini A17 Pro は 128GB
 * - 相場は構成ごとの中央値（ジャンクを除く）。在庫 MIN_COUNT 件以上の構成だけ（3行そろわなければ止める）
 * - 並びは新型との差の大きい順。items[0] を伏せて reveal で新型と比べる
 * - つかみは答えから（H2 で問いより +8.7pt・ideas/2026-10-30.md）。hookStyle は付けない（札が「1位」になり、新型の値段の札と合わない）
 * DB は構成ごとの価格の列だけ。在庫の行を丸ごと取らない
 */
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { modelPagePath } from "@/lib/catalog";
import { IPAD_SHOPS, MAC_SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import { MBP_M6_COMPARE, MBP_M6_MEMORY_GB, MBP_M6_NAME, MBP_M6_PRICE, MBP_M6_RELEASE, MBP_M6_STORAGE_GB } from "@/lib/macbookProM6";
import { IPAD_MINI_A20_PRICES } from "@/lib/ipadMiniA20";
import type { IpadMiniRow, IpadMiniScript } from "../types";

// 11/4 22時台に Apple の購入ページで開き直した（ideas/2026-11-04.md の 22時台）
const CHECKED = "2026-11-04";
const MINI_PRICE = IPAD_MINI_A20_PRICES[128];
const CONFIGS = [
  { model: "MacBook Pro 14インチ M4", short: "M4", year: "2024年", storage: MBP_M6_STORAGE_GB, memoryGB: MBP_M6_MEMORY_GB as number | null, label: "16GB・1TB", newPrice: MBP_M6_PRICE },
  { model: "MacBook Pro 14インチ M5", short: "M5", year: "2025年", storage: MBP_M6_STORAGE_GB, memoryGB: MBP_M6_MEMORY_GB as number | null, label: "16GB・1TB", newPrice: MBP_M6_PRICE },
  { model: "iPad mini (A17 Pro)", short: "iPad mini", year: "2024年", storage: 128, memoryGB: null, label: "128GB", newPrice: MINI_PRICE },
];
const MIN_COUNT = 5;
const COMPARE_LABELS = ["CPU", "Wi-Fi", "電池（動画）"];

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_launch`;

export async function buildLaunchScript(date: string): Promise<IpadMiniScript> {
  const rows: IpadMiniRow[] = [];
  for (const c of CONFIGS) {
    const where = { AND: [await modelWhere(c.model), { isSoldOut: false, storage: c.storage, ...(c.memoryGB ? { memoryGB: c.memoryGB } : {}), conditionRank: { notIn: ["J", "j", "ジャンク"] } }] };
    const count = await prisma.deviceInventory.count({ where });
    if (count < MIN_COUNT) throw new Error(`${c.model} ${c.label} の在庫が ${count} 件しかありません（${MIN_COUNT}件以上必要）`);
    const med = (await medianPrice(where, count))!;
    const diff = c.newPrice - med;
    if (diff <= 0) throw new Error(`${c.model} ${c.label} の相場が新型以上です（差 ${diff}円）`);
    const row: IpadMiniRow = { model: c.model, short: c.short, year: c.year, storage: c.label, storageGb: c.storage, median: med, count, newStorageGb: c.storage, newPrice: c.newPrice, diff, pct: Math.round((diff / c.newPrice) * 1000) / 10 };
    console.log(`  ${c.model}（${c.label}・在庫${count}件） 相場 ${man(med)}円 / 新型 ${man(c.newPrice)}円（差 ${man(diff)}円・${row.pct}%）`);
    rows.push(row);
  }
  const items = rows.sort((a, b) => b.diff - a.diff);
  const top = items[0];
  if (top.newPrice !== MBP_M6_PRICE) throw new Error(`差がいちばん大きいのが MacBook Pro ではありません（${top.model}）。つかみと違いの表を見直してください`);
  const mini = rows.find((r) => r.model.startsWith("iPad mini"))!;
  const compare = COMPARE_LABELS.map((l) => {
    const c = MBP_M6_COMPARE.find((x) => x.label === l);
    if (!c) throw new Error(`MBP_M6_COMPARE に ${l} がありません`);
    return { label: c.label, a20: c.m6, a17: c.m4 };
  });
  const shopCount = new Set([...(await activeShops(MAC_SHOPS)), ...(await activeShops(IPAD_SHOPS))].map((s) => s.name)).size;
  const topMan = (Math.round(top.diff / 1000) / 10).toFixed(1).replace(/\.0$/, "");

  const title = `今日発売の新型MacBook Pro、中古の${top.short}なら${man(top.diff)}円安い｜iPad miniは${man(mini.diff)}円差`;
  const description = [
    `今日（11/6）発売の新型と、同じ構成の中古の旧型の相場の差です。${MBP_M6_NAME}（Apple公式 ${man(MBP_M6_PRICE)}円〜・16GB／1TB）と比べて、${top.model}は相場${man(top.median)}円で${man(top.diff)}円安い。iPad mini A20 Pro（Apple公式 ${man(MINI_PRICE)}円〜・128GB）と比べて、iPad mini (A17 Pro) は相場${man(mini.median)}円で${man(mini.diff)}円安い。`,
    "",
    ...items.map((r) => `${r.model}（${r.storage}・在庫${r.count}件） 相場${man(r.median)}円 → 新型 ${man(r.newPrice)}円より −${man(r.diff)}円（−${r.pct.toFixed(1)}%）`),
    "",
    `M6 と M4 の違い（Apple公式の仕様）: ${compare.map((c) => `${c.label} ${c.a20}／${c.a17}`).join("・")}。`,
    "",
    `比べ方: 中古は同じ構成（チップ・メモリ・SSD／iPad は容量）の中央値（在庫${MIN_COUNT}件以上）。件数が少ない構成もあるので目安です。新型は Apple 公式の価格（税込・${slash(CHECKED)}確認）。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    `${top.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date)}`,
    `iPad mini (A17 Pro)の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(mini.model)}?${utm(date)}`,
    `中古MacBookの全機種の相場: https://used.gadelog.com/mac?${utm(date)}`,
  ].join("\n");

  return {
    theme: "launch",
    date,
    shopCount,
    appleChecked: CHECKED,
    scenes: {
      newModel: { name: MBP_M6_NAME, release: MBP_M6_RELEASE, price: MBP_M6_PRICE },
      ranking: { items },
      compare,
      copy: {
        head: ["今日発売の新型", "中古の旧型ならいくら安い？"],
        hook: ["今日発売のMacBook Pro", `中古の${top.short}なら`, `約${topMan}万円安い`],
        hookSub: "M6",
        foot: `${slash(date)}・新型はApple公式（M6 16GB・1TB／mini 128GB）
中古は同じ構成の中央値`,
        revealSub: `${top.storage}・${top.year}発売・在庫${top.count}件`,
        newBar: "新型 M6",
        compareHead: top.short,
      },
      comment: { speaker: "検品担当", lines: ["中古のMacは", "電池の充放電回数を", "確認しましょう"] },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "新型と中古、どっちにする？",
      },
    },
    youtube: { title, description, hashtags: ["#MacBookPro", "#iPadmini", "#中古MacBook"] },
  };
}
