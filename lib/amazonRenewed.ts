import type { Prisma } from "@prisma/client";
import { batteryOf, carrierOf, rankOf, toStorage, type RakutenItem } from "@/lib/rakutenCommon";
import { iphoneModelOf } from "@/lib/yahooQualityShop";
import { canonicalIpadModel } from "@/lib/ipadCatalog";
import { canonicalPixelModel } from "@/lib/pixelCatalog";
import { canonicalGalaxyModel } from "@/lib/galaxyCatalog";
import { WIFI_MODEL } from "@/lib/rakutenIpad";

/**
 * Amazon.co.jp の整備済み品（Renewed）の商品1件を DeviceInventory の行にする。
 * 取得は scripts/fetch-amazon.ts（Creators API。ランク・バッテリーは fetch 側が商品の特徴欄から読んで rank・batt に入れてくる）。
 * タイトルの形（想定。実際の応答は Creators API の認証後に `fetch-amazon.ts --debug` で確かめる）:
 *   Apple iPhone 14 128GB ミッドナイト SIMフリー (整備済み品)
 *   iPhone13 128GB SIMフリー ブルー (整備済み品)
 *   Google Pixel 8a 128GB Obsidian SIMフリー (整備済み品)
 * - 容量が1つに決まらない・カタログにない機種・アクセサリは取り込まない
 * - 色 = 容量のあと〜「(整備済み」までの文字から SIMフリー などを除いたもの
 */

export const AMAZON_RENEWED_SHOP = "Amazon 整備済み品";

type Row = Prisma.DeviceInventoryCreateManyInput;

const ACCESSORY_RE = /ケース|フィルム|充電|ケーブル|Apple\s?Pencil|Watch|Buds|イヤホン|Mobile\s?Wi-?Fi|ホルダー|スタンド|カバー/i;
const VALID_STORAGE = new Set([8, 16, 32, 64, 128, 256, 512, 1024, 2048]);
const CARRIER_WORD_RE = /(?<![A-Za-z])(softbank|docomo|au)(?![A-Za-z])|ドコモ|ソフトバンク/i;

/** 容量のあとの文字 → 色（SIMフリー・整備済み・Wi-Fi などの語は色ではないので落とす） */
function colorOf(after: string): string {
  const color = after
    .replace(/[（(][^）)]*整備済み[^）)]*[）)]/g, " ")
    .replace(/整備済み品?|SIMフリー|SIMロック解除済み?|Wi-?Fi(?:\+Cellular)?(?:モデル)?|Cellular|セルラー|国内版|[45]G対応|[\[\]【】]/gi, " ")
    .replace(/(?:^|\s)\+(?=\s|$)/g, " ") // 「Wi-Fi + Cellular」の + が残る
    .replace(/[\s　]+/g, " ")
    .replace(/^[\s)）\-–:：]+|[\s(（\-–]+$/g, "") // 「(256 GB) - ブラック (整備済み品)」の「) -」
    .trim();
  return color || "-";
}

export function normalizeAmazonItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  // NFKC: 「第６世代」の全角数字・全角括弧を半角にそろえる（iPad の世代・SE の世代が読めなくなる）
  const name = item.name.normalize("NFKC").replace(/&nbsp;/g, " ").replace(/[\s　]+/g, " ").trim();
  if (ACCESSORY_RE.test(name)) return null;

  const storages = [...name.matchAll(/(\d+)\s*(GB|TB)/gi)];
  if (storages.length !== 1) return null;
  const storage = toStorage(storages[0][1], storages[0][2].toUpperCase());
  if (!VALID_STORAGE.has(storage)) return null;
  const head = name.slice(0, storages[0].index).replace(/[（(]\s*$/, ""); // 機種名は容量の前（「iPhone 18 Pro (256 GB)」の「(」は落とす）
  const after = name.slice((storages[0].index ?? 0) + storages[0][0].length);

  // Amazon の整備済み品はキャリア名がなければ SIM フリー（「SIMフリー」と書かない出品も多い）
  const simFree = /SIMフリー|SIMロック解除/i.test(name) || !CARRIER_WORD_RE.test(name);
  const carrierWord = name.match(CARRIER_WORD_RE)?.[0] ?? null;
  const common = {
    price: item.price, url: item.url, isSoldOut: false, shopName: AMAZON_RENEWED_SHOP, networkStatus: null,
    conditionRank: rankOf(item.rank), batteryHealth: batteryOf(item), storage, color: colorOf(after),
  };

  if (/iPad/i.test(head)) {
    const cellular = /Cellular|セルラー/i.test(name);
    const modelName = canonicalIpadModel(head.replace(/(\d)\s?(?:st|nd|rd|th)\b/gi, "第$1世代").replace(/(\d+(?:\.\d)?)\s?in\b/gi, "$1インチ"));
    if (!modelName) return null;
    return {
      ...common, manufacturer: "Apple", modelName,
      simUnlocked: !cellular || simFree, carrier: cellular ? (carrierWord ? carrierOf(carrierWord) : null) : WIFI_MODEL,
    };
  }
  const iphone = iphoneModelOf(head);
  if (iphone) {
    return {
      ...common, manufacturer: "Apple", modelName: iphone.modelName,
      simUnlocked: simFree, carrier: carrierWord ? carrierOf(carrierWord) : null, // SIMフリーだけなら元のキャリアは書かれていない
    };
  }
  if (/Pixel/i.test(head)) {
    const modelName = canonicalPixelModel(head);
    if (!modelName) return null;
    return { ...common, manufacturer: "Google", modelName, simUnlocked: simFree, carrier: carrierWord ? carrierOf(carrierWord) : "Google" };
  }
  if (/Galaxy/i.test(head)) {
    const modelName = canonicalGalaxyModel(head);
    if (!modelName) return null;
    return { ...common, manufacturer: "Samsung", modelName, simUnlocked: simFree, carrier: carrierWord ? carrierOf(carrierWord) : "国内版" };
  }
  return null;
}
