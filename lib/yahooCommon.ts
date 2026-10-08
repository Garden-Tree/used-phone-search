import type { Prisma } from "@prisma/client";
import { carrierOf, stripPartNumber } from "@/lib/rakutenCommon";
import { canonicalIpadModel } from "@/lib/ipadCatalog";
import { canonicalPixelModel } from "@/lib/pixelCatalog";
import { canonicalGalaxyModel } from "@/lib/galaxyCatalog";
import { WIFI_MODEL } from "@/lib/rakutenIpad";
import { iphoneModelOf } from "@/lib/yahooQualityShop";

/**
 * Yahoo!ショッピングの店（Quality Shop 以外）の商品名の読み取りで共通の部品。
 * 店ごとの違い（ランクの書き方・バッテリー・キャリア・色の位置）は lib/yahoo<店名>.ts に書き、
 * 「本文から iPhone / iPad / Pixel / Galaxy の機種を読んで行にする」ところだけここにまとめる
 */

type Row = Prisma.DeviceInventoryCreateManyInput;

export const ACCESSORY_RE = /ケース|カバー|フィルム|保護ガラス|強化ガラス|充電|ケーブル|アダプタ|ストラップ|Apple\s?Pencil|Watch|Buds|イヤホン|Mobile\s?Wi-?Fi|ルーター|ジャンク/i;

export const VALID_STORAGE = new Set([8, 16, 32, 64, 128, 256, 512, 1024, 2048]);

/** 商品名の中のキャリア表記（AU・Softbank・docomo の大文字小文字の揺れ、UQ・ワイモバイルも拾う） */
export const CARRIER_WORD_RE =
  /(?<![A-Za-z])(softbank|docomo|au)(?![A-Za-z])|ドコモ|ソフトバンク|UQ\s?mobile|UQモバイル|Y!?\s?mobile|ワイモバイル/i;

/** Galaxy の型番から元のキャリア（SC-52D は docomo、SCG20・SCV38 は au、SM-xxxx は国内版）。型番がなければ null */
export function galaxyCarrierByCode(name: string): string | null {
  if (/(?<![A-Za-z])SC-\d/.test(name)) return "docomo";
  if (/(?<![A-Za-z])SC[GV]\d/.test(name)) return "au";
  if (/(?<![A-Za-z])SM-/.test(name)) return "国内版";
  return null;
}

/** 容量（"256GB"・"1TB"）を1つだけ読む。0個・2個以上・実在しない値は null */
export function storageOf(name: string): number | null {
  const all = [...name.matchAll(/(\d+)\s*(GB|TB)/gi)];
  if (all.length !== 1) return null;
  const storage = all[0][2].toUpperCase() === "TB" ? Number(all[0][1]) * 1024 : Number(all[0][1]);
  return VALID_STORAGE.has(storage) ? storage : null;
}

/** 色の後ろに続く説明の語（ここから先は色ではない） */
const COLOR_STOP_RE =
  /(?:^|\s)(?:本体|Apple|APPLE|apple|アップル|SamSung|SAMSUNG|Google|中古|整備済|スマホ|タブレット|バッテリー|BT\d|最大|即日|安心|外観|画面|商品|付属|判定|[SABCJD]ランク|ランク[SABCJD]|\d+(?:\.\d+)?インチ|iOS|iPadOS|AndroidOS)/;

/**
 * 容量の後ろから色を読む（型番・SIM・キャリア・世代の語は落とす）。読めなければ "-"。
 * 色が容量の前にある店・色を書かない店は、店のファイルで colorOf を別に作る
 */
export function colorAfterStorage(body: string): string {
  const m = body.match(/\d+\s*(?:GB|TB)/i);
  const rest = m ? body.slice((m.index ?? 0) + m[0].length) : "";
  const cleaned = rest
    .replace(/(?:UQ|Y!?)\s?mobile\s?版/gi, " ")
    .replace(/[（(][^）)]*版[）)]/g, " ")
    .replace(/\S*版/g, " ")
    .replace(/SIMフリー|SIMロック解除済み?/g, " ")
    .replace(/第\d世代/g, " ")
    .replace(/【[^】]*】/g, " ")
    .replace(/[()（）\[\]「」]/g, " ")
    .replace(/\bSC-\w+|\bSCG\d+|\bSCV\d+|\bSM-\w+/g, " ")
    .replace(/\b(?:UQ|au|docomo|SoftBank)\b/gi, " ")
    .replace(/[\s　]+/g, " ")
    .trim();
  const color = stripPartNumber(cleaned.split(COLOR_STOP_RE)[0])
    .split(" ")
    .filter((w) => w && !/^[A-Z]\d{4}$/.test(w) && !/^[A-Z0-9]{4,9}J?\/A$/.test(w) && !/^[A-Z0-9]{5}$/.test(w) && !/^[\-－/／]+$/.test(w))
    .join(" ")
    .trim();
  return color || "-";
}

export type DeviceParts = {
  shopName: string;
  /** 機種・容量・SIM が読める本文（ランク・バッテリーなどの説明を落としたもの） */
  body: string;
  price: number;
  url: string;
  networkStatus: string | null;
  conditionRank: string;
  batteryHealth: number | null;
  storage: number;
  /** 「SIMフリー」「SIMロック解除済み」の記載 */
  simFree: boolean;
  /** 商品名の中のキャリア名（なければ null） */
  carrierWord: string | null;
  /** 色。省略すると容量の後ろから読む */
  color?: string;
};

/** 本文から機種を読んで1行にする。機種がカタログにない・SIM の条件が読めない商品は null（取り込まない） */
export function buildDeviceRow(p: DeviceParts): Row | null {
  const { body, simFree, carrierWord } = p;
  const color = p.color ?? colorAfterStorage(body);
  const common = {
    price: p.price, url: p.url, isSoldOut: false, shopName: p.shopName, networkStatus: p.networkStatus,
    conditionRank: p.conditionRank, batteryHealth: p.batteryHealth, storage: p.storage, color,
  };

  // iPad は iPhone の語を含まないので先に見る（"iPhone" を含む商品名に "iPad" は出ないが、取り違えを避ける）
  if (/iPad/i.test(body)) {
    const kind = body.match(/Wi-?Fi\s?\+\s?Cellular|Wi-?Fi(?:モデル)?|Cellular|セルラー/i);
    if (!kind) return null;
    const cellular = /Cellular|セルラー/i.test(kind[0]);
    const withGen = (s: string) =>
      s.replace(/(\d)\s?(?:st|nd|rd|th)\b/gi, "第$1世代").replace(/(\d+(?:\.\d)?)\s?-?in(?:ch)?\b/gi, "$1インチ").replace(/\b(A\d{2})Pro\b/g, "$1 Pro");
    // 機種名は Wi-Fi / Cellular の前。世代が後ろにある書き方（"iPad Pro 13インチ M5 Wi-Fi 256GB 第2世代"）は本文全体でも試す
    const modelName = canonicalIpadModel(withGen(body.slice(0, kind.index))) ?? canonicalIpadModel(withGen(body.replace(/\d+\s*(?:GB|TB)/gi, " ")));
    if (!modelName) return null;
    return {
      ...common, manufacturer: "Apple", modelName,
      simUnlocked: !cellular || simFree, carrier: cellular ? (carrierWord ? carrierOf(carrierWord) : null) : WIFI_MODEL,
    };
  }

  const iphone = iphoneModelOf(body);
  if (iphone) {
    if (!simFree && !carrierWord) return null;
    return {
      ...common, manufacturer: "Apple", modelName: iphone.modelName,
      simUnlocked: simFree, carrier: carrierWord ? carrierOf(carrierWord) : null, // SIMフリーだけなら元のキャリアは書かれていない
    };
  }

  if (/Pixel/i.test(body)) {
    if (!simFree && !carrierWord) return null;
    const modelName = canonicalPixelModel(body.replace(/Pro\s?XL/i, "Pro XL"));
    if (!modelName) return null;
    return {
      ...common, manufacturer: "Google", modelName,
      simUnlocked: simFree, carrier: carrierWord ? carrierOf(carrierWord) : "Google",
    };
  }

  if (/Galaxy/i.test(body)) {
    const code = galaxyCarrierByCode(body);
    if (!simFree && !carrierWord && !code) return null;
    const modelName = canonicalGalaxyModel(body);
    if (!modelName) return null;
    return {
      ...common, manufacturer: "Samsung", modelName,
      simUnlocked: simFree, carrier: code ?? (carrierWord ? carrierOf(carrierWord) : "国内版"),
    };
  }
  return null;
}
