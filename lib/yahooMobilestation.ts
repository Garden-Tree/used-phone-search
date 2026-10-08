import type { Prisma } from "@prisma/client";
import { rankOf, type RakutenItem } from "@/lib/rakutenCommon";
import { ACCESSORY_RE, CARRIER_WORD_RE, buildDeviceRow, storageOf } from "@/lib/yahooCommon";

/**
 * モバステ（Yahoo!ショッピング店 mobilestation。2026-10-09〜）の商品1件を DeviceInventory の行にする。
 * 商品名は 2026-10-09 に商品検索API v3 で集めた 342 件（iPhone 200・iPad 76・Pixel 33・Galaxy 33）で確かめた
 *
 *   iPhone14 Plus 128GB ミッドナイト MQ4A3J/A Apple Aランク バッテリー85％ 整備済中古品 4647
 *   iPhone13 256GB ピンク MLNK3J/A SIMフリー Cランク バッテリー83％ 整備済中古品 判定○品 6469
 *   iPhone17 Pro Max 1TB コズミックオレンジ MFYG4J/A Apple Aランク バッテリー新品 整備済中古品 9947
 *   iPad 第9世代 Wi-Fi+Cellular 64GB 【A2604】 スペースグレイ MK473J/A Apple Aランク バッテリー新品 整備済中古品 判定○品 3535
 *   Pixel 10a 256GB オブシディアン Google SIMフリー Aランク BT99-90% 整備済中古品 判定△品 本体 9127
 *   Galaxy Z Flip7 512GB SM-F766Q SIMフリー版 ジェットブラック SamSung Cランク BT99-90% 整備済中古品 9820
 *   Galaxy S23 Ultra SC-52D 256GB ドコモ版 クリーム SamSung Cランク BT99-90% 整備済中古品 判定○品 9558
 *
 * - 状態ランク: 「Aランク」の S/A/B/C。J はジャンクなので取り込まない
 * - バッテリー: 「バッテリー85％」はその値、「バッテリー新品」は 100。「BT99-90%」「BT89以下」のような幅は商品説明の「バッテリー最大容量 92％」（fetch-yahoo.ts が batt に入れる）、なければ null
 * - SIM: 題名の「Apple」だけの iPhone・iPad も商品説明は「■キャリア SIMフリー」なので、fetch-yahoo.ts が読んだ car が「SIMフリー」ならSIMフリー。
 *   Galaxy は「ドコモ版」「au版」＝元のキャリア（型番 SC-・SCG と同じ）。題名の「SIMフリー版」は国内版
 * - 「判定○品」「判定△品」はネットワーク利用制限の判定結果（○ / △）。書かれていない商品は null
 * - 容量が1つに決まらない商品（Pixel 7a・Galaxy S22 の一部は容量の記載がない）、カタログにない機種は取り込まない
 * - 赤ロム: 店のお買い物ガイドで「ネットワーク補償 無期限」。初期不良は100日間
 */

export const YAHOO_MOBILESTATION = "モバステ（Yahoo!ショッピング店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

const RANK_RE = /(?<![A-Za-z])([SABCJD])ランク/;

export function normalizeMobilestationItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const name = item.name.replace(/&nbsp;/g, " ").replace(/[\s　]+/g, " ").trim();
  if (!/整備済中古品/.test(name) || ACCESSORY_RE.test(name)) return null;
  const rankLetter = name.match(RANK_RE)?.[1];
  if (!rankLetter || rankLetter === "J") return null;
  const storage = storageOf(name);
  if (!storage) return null;

  const battery = name.match(/バッテリー\s*(\d{2,3})\s*[%％]/);
  const batteryHealth = battery ? Number(battery[1]) : /バッテリー新品/.test(name) ? 100 : typeof item.batt === "number" && item.batt > 0 && item.batt <= 100 ? item.batt : null;
  const judge = name.match(/判定([○△×])品/)?.[1];
  if (judge === "×") return null;

  // 「Apple」「Google」「SamSung」より前が機種・容量・色。SIM は題名の SIMフリー か 商品説明のキャリア
  const simFree = /SIMフリー/.test(name) || /SIMフリー/.test(item.car ?? "");
  const carrierWord = name.match(CARRIER_WORD_RE)?.[0] ?? null;
  return buildDeviceRow({
    shopName: YAHOO_MOBILESTATION, body: name, price: item.price, url: item.url,
    networkStatus: judge === "○" ? "〇" : judge === "△" ? "△" : null,
    conditionRank: rankOf(rankLetter), batteryHealth: batteryHealth && batteryHealth <= 100 ? batteryHealth : null,
    storage, simFree, carrierWord,
  });
}
