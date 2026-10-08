import type { Prisma } from "@prisma/client";
import { batteryOf, rankOf, type RakutenItem } from "@/lib/rakutenCommon";
import { ACCESSORY_RE, CARRIER_WORD_RE, buildDeviceRow, storageOf } from "@/lib/yahooCommon";

/**
 * MyWiT（Yahoo!ショッピング店 mywit。2026-10-09〜）の商品1件を DeviceInventory の行にする。
 * 商品名は 2026-10-09 に商品検索API v3 で集めた 114 件（iPhone 107・Pixel 3・Galaxy 4。iPad は 0 件）で確かめた
 *
 *   iPhone 14 256GB SIMフリー 中古 スマホ スマートフォン Bランク 本体 即日発送
 *   iPhone SE 3 第3世代 128GB SIMフリー 中古 スマホ スマートフォン Cランク 本体 即日発送
 *   G576D Pixel 8a 5G 128GB SIMフリー 中古 スマホ スマートフォン Cランク 本体 即日発送
 *   G3Y12 Pixel 9a 5G 128GB ドコモ SIMロック解除済み 中古 スマホ スマートフォン Aランク 本体 即日発送
 *   SC-53B Galaxy A52 5G 128GB ドコモ SIMロック解除済み 中古 スマホ スマートフォン Cランク 本体 即日発送
 *   （Nothing Phone・Xiaomi など他社の機種も混ざる。機種がカタログにないので取り込まない）
 *
 * - 状態ランク: 「Bランク」の S/A/B/C。J は取り込まない
 * - バッテリー: 題名にはない。商品説明の「電池性能：iPhoneは80％以上を保証」（fetch-yahoo.ts が batt に入れる）＝下限の 80。Android は null
 * - SIM: 「SIMフリー」か、キャリア名＋「SIMロック解除済み」（simUnlocked = true）
 * - 色は商品名に書かれていない（"-"）
 * - 赤ロム: 店のお買い物ガイドで「購入日数に関係なくいつでも同等品との交換、もしくはご返金」。初期不良は到着後30日（レビュー投稿で90日）
 */

export const YAHOO_MYWIT = "MyWiT（Yahoo!ショッピング店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

export function normalizeMywitItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const name = item.name.replace(/&nbsp;/g, " ").replace(/[\s　]+/g, " ").trim();
  if (!/中古/.test(name) || ACCESSORY_RE.test(name)) return null;
  const rankLetter = name.match(/(?<![A-Za-z])([SABCJD])ランク/)?.[1];
  if (!rankLetter || rankLetter === "J") return null;
  const body = name.split(/\s中古\s/)[0]; // 「中古 スマホ …」から後ろは検索用の語
  const storage = storageOf(body.replace(/\d+GB\/\d+GB/, ""));
  if (!storage) return null;
  const simFree = /SIMフリー|SIMロック解除/.test(body);
  const carrierWord = body.match(CARRIER_WORD_RE)?.[0] ?? null;
  return buildDeviceRow({
    shopName: YAHOO_MYWIT, body, price: item.price, url: item.url, networkStatus: null,
    conditionRank: rankOf(rankLetter), batteryHealth: batteryOf(item),
    storage, simFree, carrierWord, color: "-",
  });
}
