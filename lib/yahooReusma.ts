import type { Prisma } from "@prisma/client";
import { batteryOf, rankOf, type RakutenItem } from "@/lib/rakutenCommon";
import { CARRIER_WORD_RE, buildDeviceRow, storageOf } from "@/lib/yahooCommon";

/**
 * リユスマ（Yahoo!ショッピング店 reusma。2026-10-09〜）の商品1件を DeviceInventory の行にする。
 * 商品名は 2026-10-09 に商品検索API v3 で集めた 269 件で確かめた（半分近くはケース・フィルムなどの付属品で、「(中古…)」で始まらないので除く）
 *
 *   (中古並品)〈SIMフリー〉Apple iPhone SE 第3世代 64GB スターライト MMYD3J/A バッテリー90％以上【安心保証90日/赤ロム永久保証】iPhoneSE3 アイフォン スマホ
 *   (中古未使用品)〈SIMフリー〉Apple iPhone 17 Pro Max 1TB ディープブルー MFYH4J/A【安心保証90日/赤ロム永久保証】iPhone17ProMax アイフォン スマホ
 *   (中古美品) au Apple iPad 第9世代 Wi-Fi+Cellular 64GB スペースグレイ MK473J/A【安心保証90日/赤ロム永久保証】iPad9 本体 アイパッド タブレット
 *   （中古良品） au Apple iPad mini 2 Wi-Fi+Cellular 16GB スペースグレイ ME800JA/A【安心保証90日/赤ロム永久保証】…
 *   (中古良品)〈SIMフリー〉SAMSUNG Galaxy A53 5G 128GB オーサムブラック SC-53C【安心保証90日/赤ロム永久保証】GalaxyA53 本体 Android アンドロイド スマホ
 *
 * - 状態ランク（先頭の括弧）: 中古未使用品 → S、中古美品 → A、中古良品 → B、中古並品 → C
 * - バッテリー: 「バッテリー90％以上」は 90（下限）。「バッテリー劣化」・書かれていない商品は null
 * - SIM: 「〈SIMフリー〉」か、キャリア名（au・SoftBank・docomo。SIM ロックありとして扱う）
 * - 容量が1つに決まらない商品（Pixel 7a などは容量の記載なし）、カタログにない機種は取り込まない
 * - 赤ロム: 題名に「安心保証90日/赤ロム永久保証」
 */

export const YAHOO_REUSMA = "リユスマ（Yahoo!ショッピング店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

const HEAD_RE = /^[(（]中古(未使用品|美品|良品|並品)[)）]\s*/;
const RANKS: Record<string, string> = { 未使用品: "S", 美品: "A", 良品: "B", 並品: "C" };

export function normalizeReusmaItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const name = item.name.replace(/&nbsp;/g, " ").replace(/[\s　]+/g, " ").trim();
  const head = name.match(HEAD_RE);
  if (!head) return null; // 未開封品・未使用品（ケース・フィルムなどの付属品）
  // 【安心保証…】から後ろは検索用の語
  const rest = name.slice(head[0].length).split("【")[0].trim();
  const storage = storageOf(rest);
  if (!storage) return null;

  const battery = rest.match(/バッテリー\s*(\d{2,3})\s*[%％]/);
  const batteryHealth = battery ? Number(battery[1]) : batteryOf(item);
  const simFree = /SIMフリー/.test(rest);
  const carrierWord = rest.match(CARRIER_WORD_RE)?.[0] ?? null;
  return buildDeviceRow({
    shopName: YAHOO_REUSMA, body: rest, price: item.price, url: item.url, networkStatus: null,
    conditionRank: rankOf(RANKS[head[1]]), batteryHealth: batteryHealth && batteryHealth <= 100 ? batteryHealth : null,
    storage, simFree, carrierWord,
  });
}
