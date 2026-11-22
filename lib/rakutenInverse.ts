import type { Prisma } from "@prisma/client";
import { batteryOf, networkStatusOf, type RakutenItem } from "@/lib/rakutenCommon";
import { CARRIER_WORD_RE, buildDeviceRow, storageOf } from "@/lib/yahooCommon";

/**
 * ショップ・インバース（楽天市場店 shop-inverse・インバースネット株式会社。2026-11-22〜）の商品1件を DeviceInventory の行にする。
 * 商品名は 2026-11-22 に楽天の店内検索（sid 264337）で集めた（.claude/tmp/new-shops-samples-1122.md）。
 *
 * 取り込むのは1台ずつのページだけ（商品名に容量が1つ・型番・「Xランク」がある）:
 *   【20%OFFクーポン】中古 Apple iPhone 15 256GB ブルー SIMフリー 付属品無 MTMR3J/A 6ヶ月保証 赤ロム保証 レビュー特典:延長保証 Bランク スマホ 中古iphone …
 *   【10%OFFクーポン】中古 Apple iPhone 16e 128GB ホワイト mineo SIMフリー 付属品無 ネットワーク利用制限▲ MD1R4J/A 6ヶ月保証 … Aランク …
 *   【10%OFFクーポン】中古 SAMSUNG Galaxy A53 5G 128GB オーサムホワイト Android SIMフリー 付属品無 SC-53C 6ヶ月保証 … Bランク …
 * 容量・色・ランク・電池を買う人が選ぶページ（「iPhone14 128GB 256GB 512GB ミッドナイト パープル …」）は、価格が1台に決まらないので取り込まない
 * （容量が2つ以上 → storageOf が null。容量が1つでも「Xランク」がなければ選ぶページ）。
 *
 * - ランク: 商品名の「Sランク／Aランク／Bランク／Cランク」（店の基準: S 新品や未使用品・A 目立つ傷がない・B 細かな傷・C 目立つ傷）
 * - 電池: 商品説明の「バッテリー 100%」を fetch.php が batt で送る（LOOSE_BATTERY_SHOPS。「70%～79%」は下限の 70）
 * - 利用制限: 商品名の「ネットワーク利用制限▲」（▲ は △ と同じ）。なければ商品説明の値（fetch.php の nw）
 * - 保証は商品ページの「当店6ヶ月保証」、赤ロムは「保証期間外問わず…同等品と交換、または返金」（lib/shops.ts）
 */

export const RAKUTEN_INVERSE_SHOP = "ショップ・インバース（楽天市場店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

const RANK_RE = /(?:^|\s)([SABC])ランク(?:\s|$)/;
/** 型番（MTMR3J/A・NQ9E3J/A・SC-53C・SM-S911C・GZPF0 など）。1台ずつのページにだけ付く */
const PART_RE = /(?:^|\s)(?:[A-Z0-9]{5}J\/A|SC-\d{2}[A-Z]|SC[GV]\d{2}|SM-[A-Z0-9]+|G[A-Z0-9]{4})(?:\s|$)/;

export function normalizeInverseItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const name = item.name.replace(/&nbsp;/g, " ").replace(/[\s　]+/g, " ").trim();
  if (/ジャンク|ケース|フィルム|充電器/.test(name)) return null;
  const rank = name.match(RANK_RE)?.[1];
  if (!rank || !PART_RE.test(name)) return null; // 選ぶページ
  // 先頭のクーポンの札を落とし、「6ヶ月保証」から後ろ（検索用の語）は読まない
  const body = name.replace(/^【[^】]*】\s*/, "").split(/\s\d+ヶ月保証/)[0].replace(/^中古\s*(?:未使用品\s*)?/, "").trim();
  const storage = storageOf(body);
  if (!storage) return null;
  const nwTitle = body.match(/ネットワーク利用制限\s*([○〇△▲×])/)?.[1];
  const networkStatus = nwTitle ? (nwTitle === "▲" || nwTitle === "△" ? "△" : nwTitle === "×" ? "×" : "〇") : networkStatusOf(item);
  return buildDeviceRow({
    shopName: RAKUTEN_INVERSE_SHOP,
    body: body.replace(/ネットワーク利用制限\s*\S/, " ").replace(/付属品無|(?<![A-Za-z])(?:mineo|Android|IIJmio|povo|LINEMO|ahamo)(?![A-Za-z])/gi, " "),
    price: item.price, url: item.url, networkStatus,
    conditionRank: rank, batteryHealth: batteryOf(item), storage,
    simFree: /SIMフリー|SIMロック解除/.test(body), carrierWord: body.match(CARRIER_WORD_RE)?.[0] ?? null,
  });
}
