import type { Prisma } from "@prisma/client";
import { rankOf, type RakutenItem } from "@/lib/rakutenCommon";
import { ACCESSORY_RE, CARRIER_WORD_RE, buildDeviceRow, storageOf } from "@/lib/yahooCommon";

/**
 * Be-Stock（Yahoo!ショッピング店 be-stocktsb。2026-10-09〜）の商品1件を DeviceInventory の行にする。
 * 商品名は 2026-10-09 に商品検索API v3 で集めた 116 件（iPhone 13・iPad 100・Galaxy 3）で確かめた
 *
 *   中古 スマートフォン iPhone12 mini 128GB SIMフリー ブラック 本体 5.4インチ iOS Apple アップル
 *   iPhone SE3 64GB ミッドナイト SIMフリー  最大1年保証 本体 中古 スマートフォン iPhoneSE3 Apple アップル 4.7インチ iOS
 *   中古 タブレット iPad 第9世代 Wi-Fi +Cellular 256GB SIMフリー スペースグレイ 本体 10.2インチ iPadOS Apple アップル 6ヶ月保証
 *   中古 タブレット iPad 第6世代 Wi-Fiモデル 32GB 本体 9.7インチ iPadOS Apple アップル 6ヶ月保証
 *
 * - 状態ランク: 題名にはない。商品説明の「商品ランク：Cランク」（fetch-yahoo.ts が rank に入れる）。なければ「不明」
 * - バッテリー: 書かれていない（null）
 * - SIM: 「SIMフリー」か、キャリア名（au(エーユー) など。SIM ロックありとして扱う）。Wi-Fi モデルの iPad は SIM なし
 * - ネットワーク利用制限: 商品説明の「ネットワーク利用制限：なし」→ 〇（fetch-yahoo.ts が nw に入れる）
 * - 色は容量の後ろ（書かれていない商品は "-"）。容量が読めない商品（Galaxy A21 の一部）、カタログにない機種は取り込まない
 * - 保証: 題名に「6ヶ月保証」「最大1年保証」。店のお買い物ガイドは「保証期間180日以内」（商品ごとに設定）
 */

export const YAHOO_BESTOCK = "Be-Stock（Yahoo!ショッピング店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

export function normalizeBeStockItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const name = item.name.replace(/&nbsp;/g, " ").replace(/[\s　]+/g, " ").trim();
  if (!/中古/.test(name) || ACCESSORY_RE.test(name)) return null;
  const storage = storageOf(name);
  if (!storage) return null;
  // 「中古 スマートフォン」「中古 タブレット」・保証の語は機種の読み取りに要らないので落とす
  const body = name.replace(/中古\s*(?:スマートフォン|タブレット)?/g, " ").replace(/最大\d+年保証|\d+ヶ月保証/g, " ").replace(/[\s　]+/g, " ").trim();
  const rankLetter = item.rank && item.rank !== "J" ? item.rank : null;
  const simFree = /SIMフリー/.test(body);
  const carrierWord = body.match(CARRIER_WORD_RE)?.[0] ?? null;
  return buildDeviceRow({
    shopName: YAHOO_BESTOCK, body, price: item.price, url: item.url,
    networkStatus: item.nw === "○" || item.nw === "〇" ? "〇" : null,
    conditionRank: rankOf(rankLetter), batteryHealth: null,
    storage, simFree, carrierWord,
  });
}
