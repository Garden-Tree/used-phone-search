import type { Prisma } from "@prisma/client";
import { rankOf, type RakutenItem } from "@/lib/rakutenCommon";
import { ACCESSORY_RE, CARRIER_WORD_RE, buildDeviceRow, storageOf } from "@/lib/yahooCommon";

/**
 * Joshin日本橋 中古アウトレット（Yahoo!ショッピング店 jtus2014。2026-10-09〜）の商品1件を DeviceInventory の行にする。
 * 商品名は 2026-10-09 に商品検索API v3 で集めた 219 件（iPhone 160・iPad 50・Pixel 6・Galaxy 3）で確かめた
 *
 *   [中古]SIMフリー Apple iPhone13 128GB Blue A2631 MLNG3J/A 外観ランクC
 *   [中古]SIMフリー Apple iPhoneSE 64GB Starlight (第3世代) A2782 MMYD3J/A
 *   [中古 未使用買取品] Apple iPhone13 128GB  ミッドナイト(MLNC3J/A　UQ mobile版）
 *   [中古]Apple iPad 10.2インチ (第9世代) Wi-Fi+Cellular(SIMフリー) 64GB スペースグレイ MK473J/A
 *   [中古]Apple iPad Air 13インチ (M3) Wi-Fiモデル 1TB ブルー MCQ14J/A
 *   [中古 未使用買取品] Google Pixel 9 ProXL 256GB Rose Quartz (au版)
 *   [中古 未使用買取品] SAMSUNG Galaxy S24 SC-51E 256GB (コバルト バイオレット) docomo版
 *
 * - 状態ランク: 「外観ランクC」（題名）か商品説明の「■外観ランク：C」（fetch-yahoo.ts が rank に入れる）。「未使用買取品」は S。どれもなければ「不明」
 * - バッテリー: 書かれていない（null）
 * - SIM: 「SIMフリー」か「(au版)」「docomo版」「UQ mobile版」のキャリア名（SIM ロックありとして扱う）
 * - ネットワーク利用制限: 商品説明の「ネットワーク制限：○(ソフトバンク)」（fetch-yahoo.ts が nw に入れる）
 * - 「SIMフリー」でも「キャリア名」でもない商品、容量が読めない商品、カタログにない機種は取り込まない
 * - 保証: 店のお買い物ガイドで中古品は「3ヶ月・1ヶ月・10日間保証」（商品ごと。中古携帯電話は別の扱いで商品ページに記載）
 */

export const YAHOO_JOSHIN = "Joshin 中古アウトレット（Yahoo!ショッピング店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

const HEAD_RE = /^\[中古(\s*未使用買取品)?\]\s*/;

/** 色の「(PRODUCT)RED」「(コバルト バイオレット)」の括弧は読みやすいよう外す。ここでは容量の後ろから型番（A2631・MLNG3J/A）の手前まで */
export function normalizeJoshinItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const name = item.name.replace(/&nbsp;/g, " ").replace(/[\s　]+/g, " ").trim();
  const head = name.match(HEAD_RE);
  if (!head || ACCESSORY_RE.test(name)) return null;
  const unused = !!head[1];
  let rest = name.slice(head[0].length);
  // "iPhoneSE 64GB Starlight (第3世代)" → 機種の読み取りに世代が要るので前へ寄せる
  const seGen = rest.match(/iPhone\s?SE\b/i) && rest.match(/[(（]第([23])世代[)）]/)?.[1];
  if (seGen) rest = rest.replace(/iPhone\s?SE\b/i, `iPhone SE 第${seGen}世代`);
  const storage = storageOf(rest);
  if (!storage) return null;

  const rankLetter = rest.match(/外観ランク\s?([SABC])/)?.[1] ?? (item.rank && item.rank !== "J" ? item.rank : null);
  const simFree = /SIMフリー/.test(rest);
  const carrierWord = rest.match(CARRIER_WORD_RE)?.[0] ?? null;
  const nw = item.nw === "○" || item.nw === "〇" ? "〇" : item.nw === "△" ? "△" : item.nw === "×" || item.nw === "✕" ? "×" : null;
  return buildDeviceRow({
    shopName: YAHOO_JOSHIN, body: rest, price: item.price, url: item.url, networkStatus: nw,
    conditionRank: unused ? "S" : rankOf(rankLetter), batteryHealth: null,
    storage, simFree, carrierWord,
  });
}
