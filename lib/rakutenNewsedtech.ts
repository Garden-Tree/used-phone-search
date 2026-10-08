import type { Prisma } from "@prisma/client";
import { batteryOf, carrierOf, rankOf, toStorage, type RakutenItem } from "@/lib/rakutenCommon";
import { isKnownIphoneModel, normalizeModelPart } from "@/lib/iphoneModelName";
import { canonicalIpadModel } from "@/lib/ipadCatalog";
import { canonicalPixelModel } from "@/lib/pixelCatalog";
import { canonicalGalaxyModel } from "@/lib/galaxyCatalog";
import { WIFI_MODEL } from "@/lib/rakutenIpad";

/**
 * ニューズドテック（楽天市場の1号店 kamaya-awards・2号店 garakei。2026-10-08〜）の商品1件を DeviceInventory の行にする。
 * 2店とも同じ書き方なので1つの読み取りで扱い、画面では1つの店として出す（lib/rakutenShops.ts の sharedShopName）。
 *
 * 商品名の例:
 *   バッテリー新品交換済 【中古】 iPhone14 128GB ミッドナイト Aランク SIMフリー 本体 スマホ … 【あす楽】 【保証あり】 【送料無料】 ip14mtm2258a
 *   【中古】 iPad 第6世代 32GB Aランク SIMフリー Wi-Fi+Cellular シルバー A1954 9.7インチ 2018年 iPad6 本体 タブレット …
 *   【中古】 Google Pixel9a 128GB Peony SIMフリー 本体 ソフトバンク スマホ 【あす楽】 … gp9a1spk7mtm
 *   【中古】 SCG25 Galaxy S24 256GB アンバー イエロー Aランク SIMフリー 本体 au タブレット ギャラクシー …
 *
 * - 「全色・容量・ランク」「128GB 256GB 512GB」のように購入時に選ぶまとめ売りの商品は、1台に決まらないので取り込まない
 * - 容量の書いていない商品（Galaxy A25・Pixel 7a など）も取り込まない
 * - ランクは商品名の「Aランク」、なければキャッチコピーの「【Bランク】」（fetch.php が rank として送る）。「良品」は B
 * - バッテリーは「バッテリー新品交換済」「バッテリー100%」なら 100。それ以外は商品説明の数値（fetch.php の batt）
 * - 全商品 SIM フリー（「SIMフリー 本体 ドコモ」の「ドコモ」は元のキャリア）
 */

export const RAKUTEN_NEWSEDTECH_SHOP = "ニューズドテック（楽天市場店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

const CONDITION_RE = /【(中古|未使用|未開封)】/;

/** 「【中古】」の後ろから「本体」の手前まで（後ろは検索用の語の羅列なので読まない） */
function body(name: string): string | null {
  const m = name.match(CONDITION_RE);
  if (!m || m.index === undefined) return null;
  const rest = name.slice(m.index + m[0].length);
  const end = rest.search(/\s本体(?:\s|$)/);
  return (end >= 0 ? rest.slice(0, end) : rest).replace(/[\s　]+/g, " ").trim();
}

function rankFrom(name: string, item: RakutenItem, unused: boolean): string {
  if (unused) return "S";
  const inName = name.match(/(?:^|\s)([SABC])ランク(?:\s|$)/)?.[1];
  if (inName) return inName;
  if (/(?:^|\s)良品(?:\s|$)/.test(name)) return "B";
  return rankOf(item.rank);
}

function batteryFrom(name: string, item: RakutenItem): number | null {
  if (/バッテリー新品|バッテリー100[%％]/.test(name)) return 100;
  return batteryOf(item);
}

/** 「本体」の後ろの元キャリア（ドコモ・au・ソフトバンク）。なければ null */
function originalCarrier(name: string): string | null {
  const after = name.match(/\s本体\s+(\S+)/)?.[1] ?? "";
  return /ドコモ|docomo|^au$|ソフトバンク|SoftBank|楽天/.test(after) ? carrierOf(after) : null;
}

function base(item: RakutenItem, manufacturer: string, fields: Omit<Row, "manufacturer" | "price" | "url" | "isSoldOut" | "networkStatus" | "shopName">): Row {
  return { manufacturer, networkStatus: null, price: item.price, url: item.url, isSoldOut: false, shopName: RAKUTEN_NEWSEDTECH_SHOP, ...fields };
}

const STORAGE_RE = /(\d+)\s*(GB|TB)/g;

export function normalizeNewsedtechItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const b = body(item.name);
  if (!b) return null;
  // まとめ売り（容量が2つ以上・「全色」）は1台に決まらない
  const storages = [...b.matchAll(STORAGE_RE)];
  if (storages.length !== 1 || /全色/.test(item.name)) return null;
  const storage = toStorage(storages[0][1], storages[0][2]);
  const unused = /【(未使用|未開封)】/.test(item.name);
  const conditionRank = rankFrom(b, item, unused);
  const batteryHealth = batteryFrom(item.name, item);

  // iPhone: "iPhone14 128GB ミッドナイト Aランク SIMフリー"・"iPhone13mini 128GB …"・"iPhoneSE3 64GB …"
  const iphone = b.match(/^iPhone\s?(.+?)\s+\d+\s*(?:GB|TB)\s+(.*?)\s*(?:[SABC]ランク|良品)?\s*SIMフリー/);
  if (iphone) {
    const part = iphone[1].replace(/(\d)(mini|Plus|Pro|e)\b/i, "$1 $2");
    const modelName = `iPhone ${normalizeModelPart(part)}`;
    if (!isKnownIphoneModel(modelName)) return null;
    return base(item, "Apple", {
      modelName, storage, color: iphone[2].replace(/\s*(?:[SABC]ランク|良品)$/, "").trim() || "-",
      conditionRank, batteryHealth, simUnlocked: true, carrier: originalCarrier(item.name),
    });
  }

  // iPad: "iPad 第6世代 32GB Aランク SIMフリー Wi-Fi+Cellular シルバー A1954 9.7インチ 2018年 iPad6"
  if (/iPad/.test(b)) {
    const modelName = canonicalIpadModel(b);
    if (!modelName) return null;
    const cellular = /Cellular|セルラー/i.test(b);
    // 色: 型番（A1954）の手前の語。容量・ランク・SIM・Wi-Fi・世代・機種名などを除いた残り
    const beforeModelNo = b.split(/\sA\d{4}\b/)[0];
    const color = beforeModelNo
      .replace(/iPad\s?(?:Pro|Air|mini)?\s?\d*/gi, " ")
      .replace(/\d+\s*(?:GB|TB)|[SABC]ランク|良品|SIMフリー|Wi-Fi\+Cellular(?:モデル)?|Wi-Fi(?:モデル)?|第\d+世代|\(A\d+\)|\d+(?:\.\d)?インチ|\bM\d\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return base(item, "Apple", {
      modelName, storage, color: color || "-", conditionRank, batteryHealth,
      simUnlocked: true, carrier: cellular ? originalCarrier(item.name) : WIFI_MODEL,
    });
  }

  // Pixel: "Google Pixel9a 128GB Peony SIMフリー"・"Google Pixel9 Pro XL 128GB Obsidian Aランク SIMフリー"
  const pixel = b.match(/(Pixel\s?.+?)\s+\d+\s*(?:GB|TB)\s+(.*?)\s*(?:[SABC]ランク)?\s*SIMフリー/);
  if (pixel) {
    const modelName = canonicalPixelModel(pixel[1]);
    if (!modelName) return null;
    return base(item, "Google", {
      modelName, storage, color: pixel[2].trim() || "-", conditionRank, batteryHealth,
      simUnlocked: true, carrier: originalCarrier(item.name) ?? "Google",
    });
  }

  // Galaxy: "SCG25 Galaxy S24 256GB アンバー イエロー Aランク SIMフリー"
  const galaxy = b.match(/(Galaxy\s?.+?)\s+\d+\s*(?:GB|TB)\s+(.*?)\s*(?:[SABC]ランク)?\s*SIMフリー/);
  if (galaxy) {
    const modelName = canonicalGalaxyModel(galaxy[1]);
    if (!modelName) return null;
    return base(item, "Samsung", {
      modelName, storage, color: galaxy[2].trim() || "-", conditionRank, batteryHealth,
      simUnlocked: true, carrier: originalCarrier(item.name) ?? "国内版",
    });
  }
  return null;
}
