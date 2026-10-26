/**
 * テーマ「新型iPad mini、中古の旧型ならいくら安い？」（10/27〜。新型 iPad mini (A20 Pro) の発表に合わせた回）→ 台本
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 旧型は lib/ipadCatalog.ts の iPad mini 3機種（A17 Pro・第6世代・第5世代）。並びは発売の新しい順で、いちばん新しい A17 Pro を最後まで伏せて reveal で新型と比べる
 * - 中古の相場は getModelMarket（在庫がいちばん多い容量の中央値・サイトの相場と同じ数字）。在庫 MIN_COUNT 件以上の機種だけ（3機種そろわなければ止める）
 * - 新型の値段は lib/ipadMiniA20.ts（Apple 公式・Wi-Fi・税込・10/27 確認）だけ。中古と同じ容量の公式価格があればその容量、
 *   なければ 128GB（最安の始まり。64GB は新型にない）と比べる。どちらで比べたかを画面の注記・説明欄に書く
 * - reveal の仕様の違いは lib/ipadMiniA20.ts の IPAD_MINI_COMPARE（公式の仕様のページの値）から 画面・重さ・防水 の3つだけ
 * DB は機種ごとの集計（groupBy と中央値の1行）だけ。在庫の行を丸ごと取らない
 */
import { getModelMarket } from "@/lib/marketStats";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { IPAD_SPECS, IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { IPAD_MINI_A20_CHECKED, IPAD_MINI_A20_NAME, IPAD_MINI_A20_PRICES, IPAD_MINI_A20_RELEASE, IPAD_MINI_COMPARE } from "@/lib/ipadMiniA20";
import { IPAD_SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { IpadMiniRow, IpadMiniScript } from "../types";

/** 旧型（発売の新しい順。items[0] を伏せる） */
const MODELS = ["iPad mini (A17 Pro)", "iPad mini (第6世代)", "iPad mini (第5世代)"];
const MIN_COUNT = 5;
/** 新型の最安の始まり（容量） */
const BASE_GB = 128;
/** reveal に出す公式の仕様の違い（IPAD_MINI_COMPARE の label） */
const COMPARE_LABELS = ["画面", "重さ（Wi-Fi）", "防水・防塵"];

const man = (n: number) => n.toLocaleString();
/** 何万円（0.1万円単位で切り捨て。多く見せない） */
const manYen = (n: number) => `${Math.floor(n / 1000) / 10}万`;
const slash = (iso: string) => iso.replace(/-/g, "/");
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_ipadmini`;

export async function buildIpadMiniScript(date: string): Promise<IpadMiniScript> {
  const market = await getModelMarket(MODELS);
  const items: IpadMiniRow[] = [];
  for (const model of MODELS) {
    const r = market.get(model);
    if (!r || r.count < MIN_COUNT || !r.medianStorage) throw new Error(`${model} の在庫が ${r?.count ?? 0} 件しかありません（${MIN_COUNT}件以上必要）`);
    const gb = r.medianStorage;
    const newStorageGb = IPAD_MINI_A20_PRICES[gb] ? gb : BASE_GB;
    const newPrice = IPAD_MINI_A20_PRICES[newStorageGb];
    const diff = newPrice - r.medianPrice;
    const row: IpadMiniRow = {
      model, short: model.match(/\((.+)\)/)?.[1] ?? model, year: IPAD_SPECS[model].released,
      storage: storageLabel(gb, model), storageGb: gb, median: r.medianPrice, count: r.count,
      newStorageGb, newPrice, diff, pct: Math.round((diff / newPrice) * 1000) / 10,
    };
    console.log(`  ${model}（${row.year}・${row.storage}・在庫${r.count}件） 相場 ${man(r.medianPrice)}円 / 新型 ${newStorageGb}GB ${man(newPrice)}円（差 ${man(diff)}円・${row.pct}%）${IPADOS27_MODELS.has(model) ? "" : "・iPadOS 27 非対応"}`);
    if (diff <= 0) throw new Error(`${model} の相場が新型以上です（差 ${diff}円）。この回の作りでは出せません`);
    items.push(row);
  }
  const top = items[0];
  const compare = COMPARE_LABELS.map((l) => {
    const c = IPAD_MINI_COMPARE.find((x) => x.label === l);
    if (!c) throw new Error(`IPAD_MINI_COMPARE に ${l} がありません`);
    return { label: c.label, a20: c.a20, a17: c.a17 };
  });
  const newPrice = IPAD_MINI_A20_PRICES[BASE_GB];
  const shopCount = (await activeShops(IPAD_SHOPS)).length;
  const old = items.filter((r) => !IPADOS27_MODELS.has(r.model));
  const fallback = items.filter((r) => r.newStorageGb !== r.storageGb);

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。Pencil は lib/ipadMiniA20.ts の比較表（新型も A17 Pro も Pro・USB-C）
  const lines = ["A17 Proなら", "新型と同じ", "Pencil Proが使えます"];

  const rawTitle = `新型iPad mini ${man(newPrice)}円〜、中古のA17 Proなら${manYen(top.diff)}円安い`;
  const title = rawTitle.length <= 60 ? rawTitle : `新型iPad mini、中古の旧型ならいくら安い？`;
  const description = [
    `新型 ${IPAD_MINI_A20_NAME}（${md(IPAD_MINI_A20_RELEASE)}発売・Apple公式 ${man(newPrice)}円〜）と、中古の旧型 iPad mini の相場の差です。いちばん新しい旧型の${top.model}は、相場${man(top.median)}円（${top.storage}）で、新型の同じ容量（${man(top.newPrice)}円）より${man(top.diff)}円・${top.pct.toFixed(1)}%安い。`,
    "",
    ...items.map((r) => `${r.model}（${r.year}発売・${r.storage}） 相場${man(r.median)}円 → 新型${r.newStorageGb}GB ${man(r.newPrice)}円より −${man(r.diff)}円（−${r.pct.toFixed(1)}%）${IPADOS27_MODELS.has(r.model) ? "" : "・iPadOS 27 非対応"}`),
    "",
    `新型とA17 Proの違い（Apple公式の仕様）: ${compare.map((c) => `${c.label} ${c.a20}／${c.a17}`).join("・")}。Apple Pencil はどちらも Pro・USB-C。`,
    "",
    `比べ方: 中古は在庫がいちばん多い容量の中央値（サイトの相場と同じ・在庫${MIN_COUNT}件以上）。新型は同じ容量の Apple 公式価格（Wi-Fi・税込・${slash(IPAD_MINI_A20_CHECKED)}確認）${fallback.length ? `。${fallback.map((r) => r.storage).join("・")}は新型にないので128GB（${man(newPrice)}円）と比べています` : ""}。${old.length ? `${old.map((r) => r.model).join("・")}は iPadOS 27 に対応していません（Apple公式）。` : ""}データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date)}`,
    `中古iPadの全機種の相場: https://used.gadelog.com/ipad?${utm(date)}`,
  ].join("\n");

  return {
    theme: "ipadmini",
    date,
    shopCount,
    appleChecked: IPAD_MINI_A20_CHECKED,
    scenes: {
      newModel: { name: IPAD_MINI_A20_NAME, release: IPAD_MINI_A20_RELEASE, price: newPrice },
      ranking: { items },
      compare,
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "新型と中古の旧型、どっちにする？",
      },
    },
    youtube: { title, description, hashtags: ["#iPadmini", "#中古iPad", "#iPad"] },
  };
}
