import type { Prisma } from "@prisma/client";
import { batteryOf, rankOf, type RakutenItem } from "@/lib/rakutenCommon";
import { ACCESSORY_RE, CARRIER_WORD_RE, buildDeviceRow, storageOf } from "@/lib/yahooCommon";

/**
 * エムコム（Yahoo!ショッピング店 mcom2022。2026-10-09〜）の商品1件を DeviceInventory の行にする。
 * 商品名は 2026-10-09 に商品検索API v3 で集めた 150 件（iPhone 133・iPad 4・Pixel 8・Galaxy 5）で確かめた
 *
 *   整備済み品 iPhone 12 256GB ランクC 中古 スマホ スマートフォン 本体 SIMフリー アイフォン シムフリー
 *   整備済み品 バッテリー100％ iPhone 13mini 256GB ランクC 中古 スマホ スマートフォン 本体 SIMフリー アイフォン シムフリー
 *   整備済み品 iPhone 15 Plus 128GB Aランク  中古 スマホ スマートフォン 本体 SIMフリー  アイフォン シムフリー
 *   iPad 第7世代  Wi-fi+Cellularモデル 32GB ランクC 中古 タブレット 本体 SIMフリー アイパッド シムフリー
 *   Google Pixel 8 SIMフリー 128GB Aランク 中古 スマホ スマートフォン 本体 SIMフリー シムフリー
 *   Galaxy Z Flip5 SC-54D docomo版 256GB ランクA 中古 スマホ スマートフォン 本体 SIMフリー シムフリー
 *
 * - 状態ランク: 「ランクC」「Cランク」の S/A/B/C/D。J（ジャンク・訳アリ）は取り込まない。「利用制限あり」と書かれた商品も取り込まない
 * - バッテリー: 題名の「バッテリー100％」はその値。「バッテリー80％以上」（キャッチコピー。fetch-yahoo.ts が batt に入れる）は 80（下限）。書かれていなければ null
 * - SIM: 題名の末尾はどれも「SIMフリー シムフリー」。Galaxy の「docomo版」「au版」はSIMロック解除済みの元のキャリア
 * - 色は商品名に書かれていない（"-"）
 * - 赤ロム: キャッチコピーに「赤ロム保証 1年保証」。店のお買い物ガイドは 7日間の返品保証・1か月の通常保証
 */

export const YAHOO_MCOM = "エムコム（Yahoo!ショッピング店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

const RANK_RE = /(?:ランク\s?([SABCJD])|(?<![A-Za-z])([SABCJD])ランク)/;

export function normalizeMcomItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const name = item.name.replace(/&nbsp;/g, " ").replace(/[\s　]+/g, " ").trim();
  if (!/中古/.test(name) || ACCESSORY_RE.test(name) || /訳アリ|利用制限あり/.test(name)) return null;
  const rank = name.match(RANK_RE);
  const rankLetter = rank?.[1] ?? rank?.[2];
  if (!rankLetter || rankLetter === "J") return null;
  const storage = storageOf(name);
  if (!storage) return null;

  const battery = name.match(/バッテリー\s*(\d{2,3})\s*[%％]/);
  const batteryHealth = battery ? Number(battery[1]) : batteryOf(item);
  const simFree = /SIMフリー|シムフリー/.test(name);
  const carrierWord = name.match(CARRIER_WORD_RE)?.[0] ?? null;
  // 本文は「中古」より前（後ろは検索用の語。"Pixel9" と書かれたものも拾えるよう "Googl" の誤記もそのまま渡す）
  const body = name.replace(/^整備済み品\s*/, "").split(/\s中古\s/)[0].replace(/バッテリー\s*\d{2,3}\s*[%％]/, " ");
  return buildDeviceRow({
    shopName: YAHOO_MCOM, body, price: item.price, url: item.url, networkStatus: null,
    conditionRank: rankOf(rankLetter), batteryHealth: batteryHealth && batteryHealth <= 100 ? batteryHealth : null,
    storage, simFree, carrierWord, color: "-",
  });
}
