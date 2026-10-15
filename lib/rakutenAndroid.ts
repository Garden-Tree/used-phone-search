import type { Prisma } from "@prisma/client";
import { batteryOf, carrierOf, networkStatusOf, rankOf, toStorage, type RakutenItem } from "@/lib/rakutenCommon";
import { codeKey, codeTokens } from "@/lib/androidCommon";
import { AQUOS_NAME_RE, canonicalAquosModel } from "@/lib/aquosCatalog";
import { XPERIA_NAME_RE, canonicalXperiaModel } from "@/lib/xperiaCatalog";
import { androidInfoOf } from "@/lib/androidInfo";
import { RAKUTEN_IOSYS_SHOP, core, parseCarrier, parseNetworkStatus } from "@/lib/rakutenIosys";

/**
 * 楽天市場店（ゲオ・じゃんぱら・ソフマップ・イオシス）の Sony Xperia・Sharp AQUOS の商品1件を DeviceInventory の行にする（2026-10-15〜）。
 * rakutenShops.ts の byDevice が、商品名に Xperia・AQUOS を含むものをここへ回す。ニューズドテック・キタムラ・エムティーエムは取り込まない。
 * 機種名は lib/xperiaCatalog.ts・lib/aquosCatalog.ts の表記（型番を優先して決める）。カタログ外（2020年以前・lite/basic の旧機種）・アクセサリなど読み取れないものは null
 *
 * - SIM ロック: SIM ロックの原則禁止（2021年10月）より後の発売の機種は、キャリア版も SIM フリーとして扱う。
 *   それ以前の発売（Xperia Ace II・10 III・1 III、AQUOS R6）は、商品名に「SIMフリー」「ロック解除」があるときだけ（「SIMロックあり」は常に false）
 * - キャリア: 国内の SIM フリー版（XQ-xxxx・SH-Mxx など）は "国内版"（DeviceCard が「SIMフリー（国内版）」と表示）、キャリア版はキャリア名。
 *   Y!mobile は SoftBank にまとめる。mineo など MVNO 名だけ（キャリアが読めない）なら null
 * - ゲオ・じゃんぱら・ソフマップは Galaxy（lib/rakutenGalaxy.ts）と同じ読み方（バッテリー・利用制限・ランクも同じ）
 */

type Item = RakutenItem;
type Row = Prisma.DeviceInventoryCreateManyInput;

const JA = /[ぁ-んァ-ヶー一-龠]/;

/** 機種名・型番・容量・括弧を除いた残りから、日本語の色の名前を読む。なければ "-" */
function colorOf(...candidates: (string | undefined)[]): string {
  for (const c of candidates) {
    if (!c) continue;
    let s = c.normalize("NFKC");
    for (const t of codeTokens(s)) s = s.split(t).join(" ");
    s = s
      .replace(XPERIA_NAME_RE, " ")
      .replace(AQUOS_NAME_RE, " ")
      .replace(/\d+\s*(?:GB|TB)(?:\s*\/\s*\d+\s*(?:GB|TB))?/gi, " ")
      .replace(/\([^)]*\)|[[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (s && JA.test(s)) return s;
  }
  return "-";
}

const SONY = { manufacturer: "Sony" } as const;
const SHARP = { manufacturer: "Sharp" } as const;

/** 機種名と、その機種のメーカー。読み取れなければ null */
function modelOf(raw: string): { modelName: string; manufacturer: "Sony" | "Sharp" } | null {
  if (/Xperia/i.test(raw)) {
    const modelName = canonicalXperiaModel(raw);
    return modelName ? { modelName, ...SONY } : null;
  }
  if (/AQUOS/i.test(raw)) {
    const modelName = canonicalAquosModel(raw);
    return modelName ? { modelName, ...SHARP } : null;
  }
  return null;
}

/** SIM ロックの扱い（上のコメントのとおり） */
function simUnlockedOf(raw: string, modelName: string): boolean {
  if (/SIMロックあり|ロックあり/.test(raw)) return false;
  if (/SIMフリー|ロック解除|SIM解除/.test(raw)) return true;
  const released = androidInfoOf(modelName)?.released;
  return !released || released >= "2021-10";
}

/** carrierOf の「国内版SIMフリー」は iPhone 向け（Apple版と表示される）なので、ここでは "国内版" にする */
function androidCarrier(raw: string): string | null {
  const c = carrierOf(raw);
  return c === "国内版SIMフリー" ? "国内版" : c;
}

function row(item: Item, modelName: string, manufacturer: "Sony" | "Sharp", raw: string, fields: Omit<Row, "manufacturer" | "modelName" | "price" | "url" | "isSoldOut" | "networkStatus" | "simUnlocked">): Row {
  return {
    manufacturer, modelName, networkStatus: networkStatusOf(item), simUnlocked: simUnlockedOf(raw, modelName),
    price: item.price, url: item.url, isSoldOut: false, ...fields,
  };
}

// ゲオ: 【中古】【安心保証】 Xperia 5 III SO-53B[128GB] docomo グリーン
const GEO_RE = /((?:Xperia|AQUOS)[^[]*?)\s*\[(\d+)(GB|TB)\]\s*(.*)$/;

export function normalizeGeoAndroid(shopName: string, item: Item): Row | null {
  const m = item.name.match(GEO_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, modelPart, size, unit, restRaw] = m;
  const model = modelOf(modelPart);
  if (!model) return null;
  const rest = restRaw.trim().replace(/^SIMロック解除\s*/, "");
  const carrierMatch = rest.match(/^(SIMフリー|docomo|au|SoftBank|楽天モバイル|Y!mobile|UQ\s*(?:mobile|モバイル))\s*/i);
  const color = carrierMatch ? rest.slice(carrierMatch[0].length) : rest;
  return row(item, model.modelName, model.manufacturer, item.name, {
    storage: toStorage(size, unit),
    color: colorOf(color),
    conditionRank: rankOf(item.rank),
    batteryHealth: null, // ゲオの楽天店はバッテリーの記載がない
    carrier: carrierMatch ? androidCarrier(carrierMatch[1]) : null,
    shopName,
  });
}

// じゃんぱら（メーカー → キャリア → 【SIM】→ 機種・色 → メモリ → 容量 → 型番の順）:
//   【中古】SONY docomo 【SIMフリー】 Xperia 5 IV 8GB 128GB SO-54C ブラック【イオンモール新利府】保証期間1ヶ月【ランクA】
//   【未使用】SONY docomo 【SIMフリー】 Xperia 1 VII スレートブラック 12GB 256GB SO-51F【津田沼】保証期間3ヶ月
const JANPARA_RE =
  /^【(中古|未使用)】\s*(?:SONY|SHARP)\s+(?:(\S+)\s+)?【([^】]+)】\s*((?:Xperia|AQUOS).*?)\s+(?:\d+GB\s+)?(\d+)\s*(GB|TB)\b([^【]*)【[^】]*】\s*保証期間[^【]*(?:【ランク([A-Z])】)?/;

export function normalizeJanparaAndroid(shopName: string, item: Item): Row | null {
  const m = item.name.match(JANPARA_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, condition, carrierLabel = "", , modelPart, size, unit, after, rankRaw] = m;
  const model = modelOf(item.name);
  if (!model) return null;
  return row(item, model.modelName, model.manufacturer, item.name, {
    storage: toStorage(size, unit),
    // 色は機種名の直後（Xperia 1 VII スレートブラック）か、型番の後ろ（SO-54C ブラック）
    color: colorOf(modelPart, after),
    conditionRank: rankOf(rankRaw, condition === "未使用"),
    batteryHealth: batteryOf(item),
    carrier: androidCarrier(carrierLabel),
    shopName,
  });
}

// ソフマップ:
//   【中古】SONY(ソニー) Xperia 1 V 512GB カーキグリーン XQ-DQ44 SIMフリー 【344-ud】
//   【中古】SONY(ソニー) Xperia 1 V 256GB ブラック SOSAZ3 Softbank SIMフリー 〔ネットワーク利用制限▲〕 【258-ud】（SOSAZ3 は独自の型番表記。機種は名前で決める）
const SOFMAP_RE = /^【(中古|未使用)[^】]*】\s*(?:\S+?\([^)]*\))?\s*((?:Xperia|AQUOS).*?)\s+(\d+)\s*(GB|TB)\s+(.*?)\s*(?:【[^】]*】)?\s*$/i;

export function normalizeSofmapAndroid(shopName: string, item: Item): Row | null {
  const m = item.name.match(SOFMAP_RE);
  if (!m || !item.url || !(item.price > 0)) return null;
  const [, condition, , size, unit, restRaw] = m;
  const model = modelOf(item.name);
  if (!model) return null;
  const [first = ""] = restRaw.split(/\s+/);
  return row(item, model.modelName, model.manufacturer, item.name, {
    storage: toStorage(size, unit),
    color: colorOf(first),
    conditionRank: rankOf(item.rank, condition === "未使用"),
    batteryHealth: batteryOf(item),
    // 型番の後ろに「Softbank SIMフリー」のように書かれる。キャリアの記載がなければ国内版
    carrier: androidCarrier(item.car ?? restRaw.replace(/^\S+\s*/, "")),
    shopName,
  });
}

/**
 * 容量が商品名にないイオシスの商品の容量（GB）。ドコモの製品仕様ページの内蔵メモリ（ROM）で確かめた型番だけ
 * （www.docomo.ne.jp/product/<型番>/spec.html・/support/product/<型番>/spec.html。2026-10-15）。
 * 「docomo版SIMフリー」の商品の型番はドコモと同じ SO-/SH- なので、その機種の ROM が容量。au・SoftBank・SIM フリーの型番は確かめていないので入れない
 * （入っていない型番の商品は行にしない）。複数の容量がある機種は入れない
 */
const DOCOMO_CODE_STORAGE: Record<string, number> = {
  "SO-51G": 256, "SO-51F": 256, "SO-51E": 256, "SO-51D": 256, "SO-51C": 256, "SO-51B": 256,
  "SO-52D": 128, "SO-52E": 128, "SO-52C": 128, "SO-52B": 128,
  "SO-53D": 128, "SO-53C": 64, "SO-53B": 128, "SO-54C": 128, "SO-41B": 64,
  "SH-51G": 256, "SH-51F": 256, "SH-51E": 256, "SH-51D": 256, "SH-51C": 64, "SH-51B": 128,
  "SH-52F": 64, "SH-52E": 64, "SH-52D": 256, "SH-52C": 256,
  "SH-53F": 128, "SH-53E": 128, "SH-53D": 64, "SH-53C": 128,
  "SH-54E": 512, "SH-54D": 128, "SH-54B": 64,
};
const DOCOMO_STORAGE_BY_KEY = new Map(Object.entries(DOCOMO_CODE_STORAGE).map(([code, gb]) => [codeKey(code), gb]));

function storageFromDocomoCode(raw: string): number {
  for (const t of codeTokens(raw)) {
    const gb = DOCOMO_STORAGE_BY_KEY.get(codeKey(t));
    if (gb) return gb;
  }
  return 0;
}

// イオシス 楽天市場店。商品名の例:
//   【ネットワーク利用制限−】Xperia1 VII SO-51F スレートブラック 【docomo版SIMフリー】 SONY 当社6ヶ月保証 イオシス
//   Xperia5 V SO-53D ブラック 【docomo版SIMフリー】 SONY 当社3ヶ月間保証 中古 イオシス
// 容量は名前にない。名前にあればそれ、なければドコモの型番の表（上）で決め、決められなければ行にしない（推測しない）。
// ランクは fetch.php が送る item.rank、バッテリーは normalizeIosysItem と同じ（未使用 100・「80%未満」79・それ以外 80）
export function normalizeIosysAndroid(item: Item): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  if (/\[(?:未使用|中古|新品)\]|ケース|フィルム|Watch|Buds|イヤホン|RAM\d/.test(item.name)) return null;
  const raw = core(item.name);
  const model = modelOf(raw);
  if (!model) return null;
  const unused = /^【未使用】|\s未使用\s+(?:【[^】]*】\s*)?イオシス/.test(item.name);
  const conditionRank = rankOf(item.rank, unused);
  const batteryHealth = conditionRank === "S" ? 100 : /80%未満|バッテリー劣化/.test(raw) ? 79 : 80;

  // 「12GB/256GB」（メモリ/容量）は後ろが容量
  const sm = raw.match(/\d+GB\/(\d+)(GB|TB)/) ?? raw.match(/(\d+)(GB|TB)/);
  const storage = sm ? toStorage(sm[1], sm[2]) : storageFromDocomoCode(raw);
  if (!storage) return null;

  const carrier = parseCarrier(raw);
  // 色は、先頭の【…】を除いて、後ろの【docomo版SIMフリー】の手前までの語（機種名・型番・容量を除く）
  const body = raw.replace(/^(?:【[^】]*】)+/, "").split("【")[0];
  const color = colorOf(body);
  return {
    manufacturer: model.manufacturer, modelName: model.modelName, storage, color: color === "-" ? "不明" : color,
    conditionRank, batteryHealth, shopName: RAKUTEN_IOSYS_SHOP, price: item.price, url: item.url, isSoldOut: false,
    carrier: carrier === "Apple" ? "国内版" : carrier,
    networkStatus: parseNetworkStatus(raw, carrier),
    simUnlocked: simUnlockedOf(raw, model.modelName),
  };
}
