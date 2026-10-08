import type { Prisma } from "@prisma/client";
import { batteryOf, carrierOf, networkStatusOf, rankOf, stripPartNumber, toStorage, type RakutenItem } from "@/lib/rakutenCommon";
import { isKnownIphoneModel, normalizeModelPart } from "@/lib/iphoneModelName";
import { canonicalIpadModel } from "@/lib/ipadCatalog";
import { canonicalPixelModel } from "@/lib/pixelCatalog";
import { canonicalGalaxyModel } from "@/lib/galaxyCatalog";
import { WIFI_MODEL } from "@/lib/rakutenIpad";

/**
 * Quality Shop（Yahoo!ショッピング店 quality-shop。2026-10-09〜）の商品1件を DeviceInventory の行にする。
 * 商品名は 2026-10-09 に店の検索ページ（store.shopping.yahoo.co.jp/quality-shop/search.html?p=iPhone+中古）から集めた 295 件で確かめた
 * （Yahoo!ショッピング商品検索API の name は未確認。Client ID を取ったら `fetch-yahoo.ts --debug` で見比べる）
 *
 * 商品名は2通りの書き方がある:
 *   [中古 Aランク] 美品 SIMフリー iPhone14 [ミッドナイト][128GB]   [国内正規品]
 *   [中古 Sランク]極美品 SIMフリー iPhone SE 3th [ミッドナイト][64GB]   [展示用端末]
 *   [中古 Bランク]  SIMフリー iPhone SE 3th [スターライト][64GB]   [国内正規品]  [バッテリー最大容量100%]
 *   [中古 Aランク] 美品 SIMフリー iPhone12mini white [64GB] [国内正規品]
 *   [中古 Bランク]  iPad 8th Cellular [グレー][128GB]   [国内正規品]
 *   [中古 Aランク] 美品 SIMフリー Pixel 6a chalk [128GB] [国内正規品]
 *   [中古 Aランク] 美品 SIMフリー Galaxy A25 5G [ライトブルー]   [SoftbankモデルSIMフリー]
 *   【中古】Sランク SIMフリー iPhone 15 Pro 256GB ホワイト 白
 *   【中古】iPad 第6世代 9.7インチ Wi-Fiモデル 32GB MRJN2J/A [ゴールド][タブレット]
 *   【中古】 美品 SIMフリー Google Pixel 9 Pro 256GB Porcelain
 *   【中古】Aランク SIMフリー Galaxy A25 5G SCG33 Blue [AU/UQからSIMロック解除済]
 *
 * - 状態ランク: 「中古 Aランク」の S/A/B/C をそのまま（S=極美品、A=美品）。J（ジャンク品）は取り込まない。
 *   ランクの書いていない商品は fetch-yahoo.ts が商品説明から読んだ rank、それもなければ「極美品」→ S・「美品」→ A、なければ「不明」
 * - バッテリー: 題名の「バッテリー最大容量95%以上」「バッテリー100％」。ない商品は商品説明から読んだ値（batt）
 * - 元のキャリア: 「SIMフリー」だけ → iPhone・iPad は carrier なし、Pixel は Google、Galaxy は型番（SC- は docomo、SCG は au、SM- は国内版）。
 *   「[auモデルSIMフリー]」「[docomoからsimロック解除済]」のようにキャリア名があればそのキャリア
 * - 容量が1つに決まらない（0個・2個。「[4GB/32GB]」のような RAM/ROM 併記も）商品、カタログにない機種、iPad の Wi-Fi/Cellular が書かれていない商品は取り込まない
 * - 展示用端末（デモ機）は中古として取り込む（ランクどおり）
 */

export const YAHOO_QUALITY_SHOP = "Quality Shop（Yahoo!ショッピング店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

const RANK_RE = /中古[\s\]】]*([SABCJ])ランク/;
const RANK_WORD_RE = /(極美品|新品同様|美品)/;
const BATTERY_RE = /バッテリー(?:最大容量)?\s*[:：]?\s*(\d{2,3})\s*[%％]/;

const ACCESSORY_RE = /ケース|フィルム|充電|ケーブル|Apple\s?Pencil|Watch|Buds|イヤホン|Mobile\s?Wi-?Fi/i;

const VALID_STORAGE = new Set([8, 16, 32, 64, 128, 256, 512, 1024, 2048]);

/** 商品名の中のキャリア表記（AU・Softbank・docomo の大文字小文字の揺れも拾う） */
const CARRIER_WORD_RE = /(?<![A-Za-z])(softbank|docomo|au)(?![A-Za-z])|ドコモ|ソフトバンク/i;

/** 色のあとに付く説明の括弧（[国内正規品]・[展示用端末 ※デモ機]・[整備済み品]・[auモデルSIMフリー]・[タブレット] など）。色ではないので落とす */
const TAG_RE = /\[[^\]]*(?:国内正規品|展示用端末|整備済み|モデルSIMフリー|ロック解除|バッテリー|タブレット|アップル|アイフォン)[^\]]*\]/g;

/** Galaxy の型番から元のキャリア（SC-52D は docomo、SCG20 は au、SM-xxxx は国内版）。型番がなければ null */
function galaxyCarrierByCode(name: string): string | null {
  if (/(?<![A-Za-z])SC-\d/.test(name)) return "docomo";
  if (/(?<![A-Za-z])SC[GV]\d/.test(name)) return "au";
  if (/(?<![A-Za-z])SM-/.test(name)) return "国内版";
  return null;
}

/** 容量・型番・括弧を落として色だけにする（「[ミッドナイト]」「white」「ホワイト 白」→ そのまま／1文字の漢字「白」は落とす） */
function colorOf(s: string): string {
  const color = stripPartNumber(
    s
      .replace(TAG_RE, " ")
      .replace(/\[\s*\d+\s*(?:GB|TB)\s*\]|\d+\s*(?:GB|TB)/gi, " ")
      .replace(/(?:JAN|UPC)\s?:\s?\d+/g, " ")
      .replace(/第\d世代|\(5G\)|グーグル\/ピクセル|グーグル|スマホ|白ロム|Google/g, " ")
      .replace(/[\[\]]/g, " ")
      .replace(/[\s　]+/g, " ")
      .trim(),
  )
    .split(" ")
    .filter((w) => w && !/^[一-鿿]$/.test(w) && !/^[A-Z0-9]{5,6}J?\/A$/.test(w) && !/^[A-Z]\d{4}$/.test(w))
    .join(" ");
  return color || "-";
}

/** iPhone の機種部分。「12mini」「SE 3th」「8 Plus」「16 Pro Max」→ 正式名（読めなければ null） */
export function iphoneModelOf(s: string): { modelName: string; end: number } | null {
  const m = s.match(
    /iPhone\s?(SE\s?(?:[23]\s?(?:th|rd|nd)?|第[23]世代)?|XS\s?Max|XS|XR|X(?![A-Za-z])|\d{1,2}e|\d{1,2}|Air)(?:\s?(mini|Plus|Pro\s?Max|Pro|Max))?(?![A-Za-z0-9])/i,
  );
  if (!m) return null;
  let part = m[1].replace(/\s+/g, " ").trim();
  const se = part.match(/^SE\s?(?:([23])|第([23])世代)?/i);
  if (se) {
    const gen = se[1] ?? se[2];
    if (!gen) return null;
    part = `SE (第${gen}世代)`;
  } else {
    part = part.replace(/^xs\s?max$/i, "XS Max").replace(/^(xs|xr)$/i, (w) => w.toUpperCase()).replace(/^x$/i, "X");
    if (m[2]) {
      const suffix = m[2].replace(/\s+/g, " ").toLowerCase();
      part += ` ${suffix === "mini" ? "mini" : suffix === "plus" ? "Plus" : suffix === "max" ? "Max" : suffix === "pro" ? "Pro" : "Pro Max"}`;
    }
  }
  const modelName = `iPhone ${normalizeModelPart(part)}`;
  return isKnownIphoneModel(modelName) ? { modelName, end: (m.index ?? 0) + m[0].length } : null;
}

export function normalizeQualityShopItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const name = item.name.replace(/&nbsp;/g, " ").replace(/[\s　]+/g, " ").trim();
  // 「中古」でないもの（新品の同じ機種）・ジャンク品・アクセサリは取り込まない
  if (!/中古/.test(name) || ACCESSORY_RE.test(name)) return null;
  const rankLetter = name.match(RANK_RE)?.[1];
  if (rankLetter === "J" || /ジャンク/.test(name)) return null;
  const conditionRank = rankLetter
    ? rankLetter
    : item.rank && item.rank !== "J"
      ? rankOf(item.rank)
      : name.match(RANK_WORD_RE)?.[1] === "美品" ? "A" : RANK_WORD_RE.test(name) ? "S" : "不明";

  const storages = [...name.matchAll(/(\d+)\s*(GB|TB)/gi)];
  if (storages.length !== 1) return null;
  const storage = toStorage(storages[0][1], storages[0][2].toUpperCase());
  if (!VALID_STORAGE.has(storage)) return null;

  const battery = name.match(BATTERY_RE);
  const batteryHealth = battery ? Number(battery[1]) : batteryOf(item);
  const simFree = /SIMフリー|SIMロック解除/i.test(name);
  const carrierWord = name.match(CARRIER_WORD_RE)?.[0] ?? null;
  const common = {
    price: item.price, url: item.url, isSoldOut: false, shopName: YAHOO_QUALITY_SHOP, networkStatus: networkStatusOf(item),
    conditionRank, batteryHealth: batteryHealth && batteryHealth > 0 && batteryHealth <= 100 ? batteryHealth : null, storage,
  };
  // 「中古 Aランク」の後ろ（バッテリーの語は色ではないので落とす）
  const body = name.replace(/^.*?(?:中古[\s\]】]*(?:[SABCJ]ランク)?)\s*/, "").replace(BATTERY_RE, " ").replace(/極美品|新品同様|美品/, " ");

  const iphone = iphoneModelOf(body);
  if (iphone && !/iPad/i.test(name)) {
    if (!simFree && !carrierWord) return null;
    return {
      ...common, manufacturer: "Apple", modelName: iphone.modelName, color: colorOf(body.slice(iphone.end)),
      simUnlocked: simFree, carrier: carrierWord ? carrierOf(carrierWord) : null, // SIMフリーだけなら元のキャリアは書かれていない
    };
  }

  // iPad: "iPad 8th Cellular"・"iPad Air 6th 11in Wi-Fi"・"iPad 第6世代 9.7インチ Wi-Fiモデル"。Wi-Fi / Cellular の語のあとが色
  if (/iPad/i.test(body)) {
    const kind = body.match(/Wi-?Fi(?:\+Cellular)?(?:モデル)?|Cellular|セルラー/i);
    if (!kind) return null;
    const model = body
      .slice(0, kind.index)
      .replace(/(\d)\s?(?:st|nd|rd|th)\b/gi, "第$1世代")
      .replace(/(\d+(?:\.\d)?)\s?in\b/gi, "$1インチ");
    const modelName = canonicalIpadModel(model);
    if (!modelName) return null;
    const cellular = /Cellular|セルラー/i.test(kind[0]);
    return {
      ...common, manufacturer: "Apple", modelName, color: colorOf(body.slice((kind.index ?? 0) + kind[0].length)),
      simUnlocked: !cellular || simFree, carrier: cellular ? (carrierWord ? carrierOf(carrierWord) : null) : WIFI_MODEL,
    };
  }

  const pixel = body.match(/Pixel\s?\d{1,2}\s?(?:a|Pro\s?Fold|Pro\s?XL|Pro)?(?![0-9A-Za-z])/i);
  if (pixel) {
    if (!simFree && !carrierWord) return null;
    const modelName = canonicalPixelModel(body);
    if (!modelName) return null;
    return {
      ...common, manufacturer: "Google", modelName, color: colorOf(body.slice((pixel.index ?? 0) + pixel[0].length)),
      simUnlocked: simFree, carrier: carrierWord ? carrierOf(carrierWord) : "Google",
    };
  }

  // Galaxy: 型番(SCG33・SC-52D・SM-F966Q)の後ろが色
  const galaxy = body.match(/Galaxy/i);
  if (galaxy) {
    const code = galaxyCarrierByCode(body);
    if (!simFree && !carrierWord && !code) return null;
    const modelName = canonicalGalaxyModel(body);
    if (!modelName) return null;
    const after = body.slice(galaxy.index).replace(/^Galaxy\s?(?:S\s?\d{2}\s?(?:Ultra|FE|\+|Plus)?|Z\s?(?:Fold|Flip)\s?\d\s?(?:Ultra)?|A\s?\d{2}\s?(?:5G)?)/i, "").replace(/\b(?:SC-?\w+|SCG\d+|SM-\w+)\b/, "");
    return {
      ...common, manufacturer: "Samsung", modelName, color: colorOf(after.replace(/\[[^\]]*(?:から|モデル)[^\]]*\]/g, " ")),
      simUnlocked: simFree, carrier: code ?? (carrierWord ? carrierOf(carrierWord) : "国内版"),
    };
  }
  return null;
}
