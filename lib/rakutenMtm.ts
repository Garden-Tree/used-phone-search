import type { Prisma } from "@prisma/client";
import { batteryOf, carrierOf, networkStatusOf, toStorage, type RakutenItem } from "@/lib/rakutenCommon";
import { isKnownIphoneModel } from "@/lib/iphoneModelName";
import { canonicalIpadModel } from "@/lib/ipadCatalog";
import { canonicalPixelModel } from "@/lib/pixelCatalog";
import { canonicalGalaxyModel } from "@/lib/galaxyCatalog";
import { WIFI_MODEL } from "@/lib/rakutenIpad";

/**
 * エムティーエム（楽天市場店 ekosuta。2026-10-09〜）の商品1件を DeviceInventory の行にする。
 *
 * 商品名の例:
 *   【中古】超美品 SIMフリー iPhone 16 Pro 256GB ホワイトチタニウム スマホ APPLE 安心保証 即日発送 土日祝発送OK
 *   【中古】 美品 SIMフリー iPhone7 PLUS 128GB ジェットブラック 安心保証 即日発送 スマホ apple 本体 白ロム 土日祝発送OK
 *   【中古】 美品 docomo iPad Air 2 Cellular セルラー 16GB ゴールド 安心保証 即日発送 Tab Apple 本体 土日祝発送OK
 *   【中古】超美品 SIMフリー Google Pixel 9 Pro XL 256GB オブシディアン スマホ Google 安心保証 …
 *   【中古】美品 SC-52D Galaxy S23 Ultra 256GB グリーン DoCoMo スマホ SAMSUNG
 *   【新品未使用】 SIMフリー iPhone 11 256GB ブラック スマホ 白ロム 安心保証 即日発送 本体 土日祝発送OK
 *
 * - 状態ランク（商品名の「【中古】」の次の語。fetch.php の rank は使わない＝商品説明にランクの記載はない）:
 *   【新品未使用】→ S、新品同様・超美品 → A、美品 → B、良品中古・語なし（「【中古】 中古 …」）→ C
 * - 元のキャリアは商品名の「SIMフリー」か「SoftBank / docomo / au」（大文字小文字は問わない）。どちらもない iPhone・Pixel・Galaxy は取り込まない
 *   - 「SIMフリー」→ iPhone・iPad は carrier なし（画面に「SIMフリー」と出る）、Pixel は Google、Galaxy は型番のキャリア（SC- は docomo、SCG・SCV は au）か国内版
 *   - キャリア名だけで「SIMフリー」「SIMロック解除」がない商品は SIM ロックありとして扱う（simUnlocked = false）
 * - 容量が1つに決まらない（0個・2個）商品、容量が実在しない値（「2568GB」の誤記）の商品は取り込まない。容量の書いていない Pixel 8a・Galaxy も同じ
 * - バッテリーは商品説明の「バッテリー最大容量90％」を fetch.php が batt として送る。書かれていない商品は null
 * - イヤホン（Buds）・Mobile Wi-Fi・ケース類は本体ではないので取り込まない
 */

export const RAKUTEN_MTM_SHOP = "エムティーエム（楽天市場店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

const HEAD_RE = /^【(中古|新品未使用|未使用|新品未開封|未開封)】\s*/;

/** ランクの語 → 画面の記号。「超美品」は「美品」を含むので先に並べる（先に見つかった方を採る） */
const RANK_WORDS: Record<string, string> = { 超美品: "A", 新品同様: "A", 美品: "B", 良品中古: "C", 良品: "C" };
const RANK_RE = /(?:^|\s)(超美品|新品同様|美品|良品中古|良品)(?=\s)/;

const ACCESSORY_RE = /ケース|フィルム|充電|ケーブル|Apple\s?Pencil|Watch|Buds|イヤホン|Mobile\s?Wi-?Fi/i;

const VALID_STORAGE = new Set([8, 16, 32, 64, 128, 256, 512, 1024, 2048]);

/** 色の後ろに続く検索用の語・型番（ここから先は読まない） */
const COLOR_STOP_RE = /\s(?:スマホ|本体|即日発送|Tab|タブレット|安心保証|白ロム|中古|Apple|APPLE|apple|アップル|SIMフリー|土日祝|あす楽|Google|SAMSUNG|SoftBank|SOFTBANK|docomo|DoCoMo|au|AU)(?:\s|$)/;

/** 商品名の中のキャリア表記（AU・DoCoMo・SOFTBANK のような大文字小文字の揺れも拾う） */
const CARRIER_WORD_RE = /(?<![A-Za-z])(softbank|docomo|au)(?![A-Za-z])|ドコモ|ソフトバンク/i;

/** Galaxy の型番から元のキャリア（SC-52D は docomo、SCG20・SCV38 は au、SM-xxxx は国内版）。型番がなければ null */
function galaxyCarrierByCode(name: string): string | null {
  if (/(?<![A-Za-z])SC-\d/.test(name)) return "docomo";
  if (/(?<![A-Za-z])SC[GV]\d/.test(name)) return "au";
  if (/(?<![A-Za-z])SM-/.test(name)) return "国内版";
  return null;
}

/** 「7 PLUS」→「7 Plus」、「XS MAX」→「XS Max」、「SE 第2世代」「SE3 第3世代」→「SE (第N世代)」、「16e」はそのまま */
function iphoneModelPart(raw: string): string | null {
  const s = raw.replace(/[\s　]+/g, " ").trim();
  if (/^SE/i.test(s)) {
    const gen = s.match(/第\s*([23])\s*世代/)?.[1] ?? s.match(/^SE\s?([23])\b/i)?.[1];
    return gen ? `SE (第${gen}世代)` : null;
  }
  return s
    .replace(/(\d)(mini|Plus|Pro)\b/i, "$1 $2")
    .split(" ")
    .map((w) => {
      const lw = w.toLowerCase();
      if (lw === "plus") return "Plus";
      if (lw === "max") return "Max";
      if (lw === "pro") return "Pro";
      if (lw === "mini") return "mini";
      if (lw === "xs" || lw === "xr") return lw.toUpperCase();
      return w;
    })
    .join(" ");
}

export function normalizeMtmItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const head = item.name.match(HEAD_RE);
  if (!head || ACCESSORY_RE.test(item.name)) return null;
  const unused = head[1] !== "中古";
  const rest = item.name.slice(head[0].length).replace(/[\s　]+/g, " ").trim();

  const storages = [...rest.matchAll(/(\d+)\s*(GB|TB)/g)];
  if (storages.length !== 1) return null;
  const storage = toStorage(storages[0][1], storages[0][2]);
  if (!VALID_STORAGE.has(storage)) return null;
  const before = rest.slice(0, storages[0].index ?? 0);
  const after = rest.slice((storages[0].index ?? 0) + storages[0][0].length);

  const rankWord = before.match(RANK_RE)?.[1];
  const conditionRank = unused ? "S" : rankWord ? RANK_WORDS[rankWord] : "C";

  // 色: 容量の後ろから検索用の語の手前まで。型番（A3459・MH304J/A・GR1YH）は落とす
  const color = after
    .split(" ")
    .filter((w) => !/^[A-Z]\d{4}$/.test(w) && !/^[A-Z0-9]{5,6}J?\/A$/.test(w) && !/^(?=.*\d)[A-Z0-9]{5}$/.test(w))
    .join(" ")
    .split(COLOR_STOP_RE)[0]
    .trim() || "-";

  const simFree = /SIMフリー|SIMロック解除/.test(rest);
  const carrierWord = rest.match(CARRIER_WORD_RE)?.[0] ?? null;
  const common = { price: item.price, url: item.url, isSoldOut: false, shopName: RAKUTEN_MTM_SHOP, networkStatus: networkStatusOf(item), conditionRank, batteryHealth: batteryOf(item), storage, color };

  // iPhone: "iPhone 16 Pro 256GB"・"iPhone7 PLUS 128GB"・"iPhoneXS MAX 64GB"・"iPhone SE 第2世代 64GB"
  const iphone = before.match(/iPhone\s?(.+?)\s*$/);
  if (iphone) {
    if (!simFree && !carrierWord) return null;
    const part = iphoneModelPart(iphone[1].replace(/\s*(?:SIMフリー|Apple|apple|APPLE).*$/, ""));
    const modelName = part ? `iPhone ${part}` : "";
    if (!isKnownIphoneModel(modelName)) return null;
    return {
      ...common, manufacturer: "Apple", modelName,
      simUnlocked: simFree, carrier: carrierWord ? carrierOf(carrierWord) : null, // SIMフリーだけなら元のキャリアは書かれていない
    };
  }

  // iPad: Wi-Fi モデルは WIFI_MODEL。Cellular・キャリア名・SIMフリー（Wi-Fi の記載なし）はセルラー版
  const ipad = before.match(/iPad.*$/);
  if (ipad) {
    const modelName = canonicalIpadModel(ipad[0]);
    if (!modelName) return null;
    const cellular = /Cellular|セルラー/i.test(rest) || !!carrierWord || (simFree && !/wi-?fi/i.test(rest));
    if (!cellular && !/wi-?fi/i.test(rest)) return null;
    return {
      ...common, manufacturer: "Apple", modelName,
      simUnlocked: !cellular || simFree, carrier: cellular ? (carrierWord ? carrierOf(carrierWord) : null) : WIFI_MODEL,
    };
  }

  // Pixel: "Google Pixel 9 Pro XL 256GB"・"SoftBank Google Pixel8 128GB"
  if (/Pixel/i.test(before)) {
    if (!simFree && !carrierWord) return null;
    const modelName = canonicalPixelModel(before);
    if (!modelName) return null;
    return {
      ...common, manufacturer: "Google", modelName,
      simUnlocked: simFree, carrier: carrierWord ? carrierOf(carrierWord) : "Google",
    };
  }

  // Galaxy: "Galaxy S24 256GB"・"SC-52D Galaxy S23 Ultra 256GB グリーン DoCoMo"・"SCG20 Galaxy S23 Ultra 256GB … AU"
  if (/Galaxy/i.test(before)) {
    const code = galaxyCarrierByCode(rest);
    if (!simFree && !carrierWord && !code) return null;
    const modelName = canonicalGalaxyModel(before);
    if (!modelName) return null;
    return {
      ...common, manufacturer: "Samsung", modelName,
      simUnlocked: simFree, carrier: code ?? (carrierWord ? carrierOf(carrierWord) : "国内版"),
    };
  }
  return null;
}
