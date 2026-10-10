import type { Prisma } from "@prisma/client";
import { rankOf, stripPartNumber, toStorage, type RakutenItem } from "@/lib/rakutenCommon";
import { isKnownIphoneModel, normalizeModelPart } from "@/lib/iphoneModelName";
import { canonicalIpadModel } from "@/lib/ipadCatalog";
import { canonicalPixelModel } from "@/lib/pixelCatalog";
import { canonicalGalaxyModel } from "@/lib/galaxyCatalog";
import { WIFI_MODEL } from "@/lib/rakutenIpad";

/**
 * イオシス 楽天市場店（shopCode pc-good。2026-10-08〜）の商品1件を DeviceInventory の行にする。
 *
 * 公式サイト（scraper/iosis_scraper.py）と在庫を共有していて、商品名も公式とほぼ同じ書き方
 * （頭に「【中古】」、後ろに「Apple スマホ … イオシス」が付くだけ）。公式と同じ商品を突き合わせられるよう、
 * 容量・色・キャリア・利用制限・バッテリーは iosis_scraper.py と同じ読み方にする（scripts/link-duplicate-shops.ts）。
 * 機種名だけは他の楽天の店と同じ正式名（「iPhone 14」）にする（突き合わせは空白を除いて比べる）。
 *
 * 商品名の例:
 *   【中古】iPhone14 A2881 (MPUD3J/A) 128GB ミッドナイト 【au版SIMフリー】 Apple スマホ スマートフォン 当社3ヶ月間保証 送料無料 イオシス
 *   【中古】【バッテリー80%未満】【SIMロック解除済】【第2世代】 au iPhoneSE A2296 (MHGQ3J/A) 64GB ホワイト Apple スマホ …
 *   【第9世代】 iPad2021 Wi-Fi+Cellular 64GB スペースグレイ MK473J/A A2604 【au版SIMフリー】 Apple 当社3ヶ月間保証 中古 イオシス
 *   Google Pixel8a G576D 128GB アロエ 【国内版SIMフリー】 Google 当社3ヶ月間保証 中古 イオシス
 *   【ネットワーク利用制限▲】Galaxy S26 SCG36 256GB コバルトバイオレット 【au版SIMフリー】 SAMSUNG 当社6ヶ月保証 未使用 イオシス
 *
 * - ランクは商品説明の「この商品は中古Bランクです」（fetch.php の rank）。未使用品は S
 * - 容量の書いていない Galaxy（型番から引く公式の処理は Python だけにある）・RAM と ROM を並べた海外版・時計やイヤホンは取らない
 */

export const RAKUTEN_IOSYS_SHOP = "イオシス（楽天市場店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

// 容量が1種類で書かれない Pixel（scraper/common.py の PIXEL_ONLY_STORAGE と同じ）
const PIXEL_ONLY_STORAGE: Record<string, number> = { "Pixel 6a": 128, "Pixel 7a": 128 };

// 容量が1種類しかない Galaxy の型番（scraper/common.py の GALAXY_CODE_STORAGE と同じ。変えるときは両方）
const GALAXY_CODE_STORAGE: Record<string, number> = {
  "SC-53F": 64, "SCG33": 64, "SM-A253C": 64, "SM-A253Z": 64,
  "SC-53E": 128,
  "SC-54G": 128, "SM-A576Q": 128,
  "SCG18": 64,
  "SCG30": 128,
  "SM-S931Z": 256,
  "SC-54C": 128,
  "SM-F766Z": 256,
  "SC-55C": 256, "SCG16": 256,
};

function galaxyStorageFromCode(raw: string): number {
  for (const [code] of raw.matchAll(/\b(?:SC-?\d{2}[A-Z]|SCG\d{2}|SM-[A-Z]\d{3}[A-Z])/g)) {
    const c = code.startsWith("SCG") || code.startsWith("SM-") || code.includes("-") ? code : `${code.slice(0, 2)}-${code.slice(2)}`;
    if (GALAXY_CODE_STORAGE[c]) return GALAXY_CODE_STORAGE[c];
  }
  return 0;
}

/** 後ろの「Apple スマホ …」「Google 当社3ヶ月間保証 …」を落とした、公式の商品名に近い部分 */
function core(name: string): string {
  return name
    .replace(/^【(?:中古|未使用)】/, "")
    .split(/\s(?:Apple|Google|SAMSUNG)\s+(?:スマホ|当社)/)[0]
    .trim();
}

/** iosis_scraper.py の parse_carrier と同じ（「国内版」は "Apple" で返し、Pixel・Galaxy の側で置き換える） */
function parseCarrier(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (lower.includes("au")) return "au";
  if (lower.includes("docomo")) return "docomo";
  if (lower.includes("softbank")) return "SoftBank";
  if (raw.includes("楽天")) return "楽天モバイル";
  if (raw.includes("国内版")) return "Apple";
  return null;
}

/** iosis_scraper.py の parse_network_status と同じ */
function parseNetworkStatus(raw: string, carrier: string | null): string | null {
  const m = raw.match(/ネットワーク利用制限\(?([〇△▲×－\-])\)?/);
  if (m) return ({ "▲": "△", "－": "-" } as Record<string, string>)[m[1]] ?? m[1];
  if (carrier === "Apple" || (carrier === null && raw.includes("SIMフリー"))) return null;
  return "-";
}

/** iosis_scraper.py の parse_color と同じ（容量の後ろから【…】・型番の手前まで） */
function parseColor(raw: string, storageLabel: string): string {
  const after = raw.includes(storageLabel) ? raw.split(storageLabel).slice(1).join(storageLabel) : "";
  return stripPartNumber(after.split("【")[0]) || "不明";
}

const unlockedWords = (raw: string) => /ロック解除|SIMフリー|国内版/.test(raw);

export function normalizeIosysItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  // 時計・イヤホン・ケースなど（[未使用] [中古] [新品] の書き方は本体以外）、RAM と ROM を並べた海外版
  if (/\[(?:未使用|中古|新品)\]|Watch|Buds|ケース|RAM\d/.test(item.name)) return null;
  const raw = core(item.name);
  const unused = /^【未使用】|\s未使用\s+(?:【[^】]*】\s*)?イオシス/.test(item.name);
  const conditionRank = rankOf(item.rank, unused);
  const batteryHealth = conditionRank === "S" ? 100 : /80%未満|バッテリー劣化/.test(raw) ? 79 : 80;

  // 「16GB/512GB」（メモリ/容量）は後ろが容量（iosis_scraper.py の parse_storage と同じ）
  const storageMatch = raw.match(/\d+GB\/(\d+)(GB|TB)/) ?? raw.match(/(\d+)(GB|TB)/);
  const storage = storageMatch ? toStorage(storageMatch[1], storageMatch[2]) : 0;
  const color = storageMatch ? parseColor(raw, storageMatch[0]) : "不明";
  const carrier = parseCarrier(raw);
  const common = {
    price: item.price, url: item.url, isSoldOut: false, shopName: RAKUTEN_IOSYS_SHOP,
    conditionRank, batteryHealth, storage, color,
  };

  if (/iPad/.test(raw)) {
    if (!storageMatch) return null;
    // iosis_scraper.py の parse_ipad と同じく容量より前から【…】・通信方式・キャリアを除き、世代を足して正式名にする
    const modelPart = raw.split(storageMatch[0])[0]
      .replace(/【[^】]*】/g, "")
      .replace(/Wi-Fi(\+Cellular)?|\b(au|docomo|SoftBank)\b/gi, "");
    const gen = raw.match(/第\d+世代/)?.[0];
    const modelName = canonicalIpadModel(`${modelPart.replace(/\s+/g, " ").trim()}${gen ? ` ${gen}` : ""}`);
    if (!modelName) return null;
    const cellular = raw.includes("Cellular");
    return {
      ...common, manufacturer: "Apple", modelName,
      carrier: cellular ? carrier : WIFI_MODEL,
      networkStatus: cellular ? parseNetworkStatus(raw, carrier) : null,
      simUnlocked: !cellular || unlockedWords(raw),
    };
  }

  if (/Pixel/i.test(raw)) {
    const modelName = canonicalPixelModel(raw);
    if (!modelName) return null;
    const pixelStorage = storage || PIXEL_ONLY_STORAGE[modelName] || 0;
    if (!pixelStorage) return null;
    // 容量が書かれないときは、Google の型番（G82U8 など）の後ろが色
    const pixelColor = storageMatch ? color : raw.match(/\bG[0-9A-Z]{4}\s+([^\s【]+)/)?.[1] ?? "不明";
    return {
      ...common, manufacturer: "Google", modelName, storage: pixelStorage, color: pixelColor,
      carrier: carrier === "Apple" ? "Google" : carrier,
      networkStatus: parseNetworkStatus(raw, carrier),
      simUnlocked: unlockedWords(raw),
    };
  }

  if (/Galaxy/i.test(raw)) {
    const modelName = canonicalGalaxyModel(raw);
    if (!modelName) return null;
    // 容量が書かれないときは型番から（なければ取らない）。色は型番の後ろ
    const galaxyStorage = storage || galaxyStorageFromCode(raw);
    if (!galaxyStorage) return null;
    const galaxyColor = storageMatch ? color : raw.match(/\b(?:SC-?\d{2}[A-Z]|SCG\d{2}|SM-[A-Z]\d{3}[A-Z])\s+([^\s【]+)/)?.[1] ?? "不明";
    return {
      ...common, manufacturer: "Samsung", modelName, storage: galaxyStorage, color: galaxyColor,
      carrier: carrier === "Apple" ? "国内版" : carrier,
      networkStatus: parseNetworkStatus(raw, carrier),
      simUnlocked: true,
    };
  }

  // iPhone: iosis_scraper.py の parse_iphone と同じ範囲を機種名とし、正式名にそろえる
  const m = raw.match(/(iPhone\s?[a-zA-Z0-9]+(?:\s(?:Pro\sMax|Pro|Plus|mini))?)/i);
  if (!m || !storageMatch) return null;
  const part = m[1].replace(/^iPhone\s?/i, "").replace(/^(\d+)(?=[A-Za-z])(?!e\b)/, "$1 ");
  const gen = raw.match(/第(\d)世代/)?.[1];
  const modelName = `iPhone ${normalizeModelPart(/^SE$/i.test(part) && gen ? `SE (第${gen}世代)` : part)}`;
  if (!isKnownIphoneModel(modelName)) return null;
  const thirteenOrLater = /^iPhone (1[3-9]|Air|SE \(第3世代\))/.test(modelName);
  return {
    ...common, manufacturer: "Apple", modelName,
    carrier,
    networkStatus: parseNetworkStatus(raw, carrier),
    simUnlocked: unlockedWords(raw) || thirteenOrLater,
  };
}
