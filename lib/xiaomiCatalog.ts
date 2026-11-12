/**
 * Xiaomi（Xiaomi・Redmi・POCO）のカタログ（下書き・2026-11-12）。形は lib/aquosCatalog.ts に合わせた。
 *
 * 載せるのは 2020年以降に日本で発売された機種（Xiaomi 日本の公式サイト mi.com/jp に仕様ページがあるもの。海外版だけの機種は入れない）。
 * サイトは機種名の先頭の語で種類を見分けるので、機種名はすべて "Xiaomi " で始める（"Xiaomi 14T Pro"・"Xiaomi Redmi Note 13 Pro 5G"・"Xiaomi POCO F7"）。
 * Xiaomi の新しい機種の公式表記は "REDMI"（大文字）だが、ここでは "Redmi" に揃えた。Mi 11 Lite 5G は "Xiaomi Mi 11 Lite 5G"。
 * タブレット（Redmi Pad・Xiaomi Pad）とライカの Leitzphone は入れない。
 *
 * 出典（2026-11-12 に開いて確認）:
 *   - スペック … Xiaomi 日本の各機種の仕様ページ https://www.mi.com/jp/product/<slug>/specs/ （画面サイズが仕様に無い 14T・14T Pro は同じ機種の概要ページ）。
 *     Xiaomi 公式に表示方式の記載がない機種は、キャリアの製品ページの「表示方式」（ソフトバンク https://www.softbank.jp/mobile/products/smartphone/<slug>/）
 *   - au の型番（XIGxx）・発売日 … au「Xiaomiの製品情報一覧」 https://www.au.com/support/service/mobile/manual/smartphone/xiaomi/ と
 *     au オンラインマニュアル（XIG05）、au オンラインショップの機種名（Xiaomi 14T XIG07）
 *   - SoftBank の型番（A×××XM）… ソフトバンクのオンラインマニュアル「比吸収率（SAR）」「電波防護への適合性」の項
 *     （例 https://www.softbank.jp/mobile/support/manual/smartphone/xiaomi-14t-pro/detail/141047/ 「A402XM」）
 *   - 発売日 … キャリアのプレスリリース・製品ページ（ソフトバンク・au・Y!mobile）、小米技術日本が PR TIMES で出した発表
 * Xiaomi の SIMフリー版のモデル番号（2306EPN60R のような番号）は mi.com/jp に出ていないので入れていない。
 * OS アップデート・セキュリティ更新の公式の方針は日本向けページに見当たらず、すべて null。公式で確かめられていない値は null（推測で埋めない）。
 */
import { buildNameMatcher, type AndroidInfo } from "@/lib/androidCommon";
import type { IphoneSpec } from "@/lib/iphoneSpecs";

/** Xperia・AQUOS と同じ形（lib/androidCommon.ts。releasedNote は「au（2024年12月12日）」のような文）。androidInfoOf から引ける */
export type XiaomiInfo = AndroidInfo;

const NONE = { osPolicy: null, securityUntil: null } as const;

export const XIAOMI_INFO: Record<string, XiaomiInfo> = {
  // ---- Xiaomi T・ナンバー ----
  "Xiaomi 17T Pro": { released: "2026-06", releasedNote: "SIMフリー（小米技術日本の発表・6月4日）", codes: {}, ...NONE },
  "Xiaomi 17T": { released: "2026-06", releasedNote: "SIMフリー（小米技術日本の発表・6月4日）", codes: {}, ...NONE },
  // SoftBank Free Style での販売開始は 2025年11月28日（日本での発売日そのものは未確認）
  "Xiaomi 15T Pro": { released: null, codes: {}, ...NONE },
  "Xiaomi 15T": { released: null, codes: {}, ...NONE },
  "Xiaomi 15": { released: null, codes: {}, ...NONE },
  "Xiaomi 14T Pro": { released: "2024-11", releasedNote: "SoftBank（2024年11月29日）", codes: { softbank: ["A402XM"] }, ...NONE },
  "Xiaomi 14T": { released: "2024-12", releasedNote: "au（2024年12月12日）", codes: { au: ["XIG07"] }, ...NONE },
  "Xiaomi 13T Pro": { released: "2023-12", releasedNote: "SoftBank・SIMフリー（2023年12月8日）", codes: { softbank: ["A301XM"] }, ...NONE },
  "Xiaomi 13T": { released: "2023-12", releasedNote: "au（2023年12月8日）", codes: { au: ["XIG04"] }, ...NONE },
  "Xiaomi 12T Pro": { released: "2022-12", releasedNote: "SIMフリー（小米技術日本の発表・12月16日）", codes: { softbank: ["A201XM"] }, ...NONE },
  "Xiaomi 11T Pro": { released: null, codes: {}, ...NONE },
  "Xiaomi 11T": { released: null, codes: {}, ...NONE },
  "Xiaomi Mi 11 Lite 5G": { released: null, codes: {}, ...NONE },
  // ---- Redmi Note ----
  "Xiaomi Redmi Note 15 Pro 5G": { released: "2026-01", releasedNote: "SIMフリー（小米技術日本の発表・1月15日）", codes: {}, ...NONE },
  "Xiaomi Redmi Note 15 5G": { released: "2026-01", releasedNote: "SIMフリー（小米技術日本の発表・1月15日）", codes: {}, ...NONE },
  "Xiaomi Redmi Note 14 Pro 5G": { released: "2025-03", releasedNote: "SIMフリー（小米技術日本の発表・3月22日）", codes: {}, ...NONE },
  "Xiaomi Redmi Note 13 Pro+ 5G": { released: null, codes: {}, ...NONE },
  "Xiaomi Redmi Note 13 Pro 5G": { released: "2024-05", releasedNote: "au（2024年5月16日）", codes: { au: ["XIG05"] }, ...NONE },
  "Xiaomi Redmi Note 11 Pro 5G": { released: "2022-05", releasedNote: "SIMフリー・楽天モバイル（2022年5月30日）", codes: {}, ...NONE },
  "Xiaomi Redmi Note 11": { released: null, codes: {}, ...NONE },
  "Xiaomi Redmi Note 10T": { released: null, codes: { softbank: ["A101XM"] }, ...NONE },
  "Xiaomi Redmi Note 10 Pro": { released: null, codes: {}, ...NONE },
  "Xiaomi Redmi Note 10 JE": { released: "2021-08", releasedNote: "au（2021年8月13日）", codes: { au: ["XIG02"] }, ...NONE },
  "Xiaomi Redmi Note 9T": { released: null, codes: { softbank: ["A001XM"] }, ...NONE },
  "Xiaomi Redmi Note 9S": { released: null, codes: {}, ...NONE },
  // ---- Redmi ----
  // A501XM はソフトバンクの公式ページで未確認
  "Xiaomi Redmi 15 5G": { released: "2025-12", releasedNote: "SoftBank（2025年12月19日）", codes: {}, unconfirmed: ["A501XM"], ...NONE },
  "Xiaomi Redmi 14C": { released: null, codes: {}, ...NONE },
  // au は 2023年10月6日、SoftBank は 2024年4月25日
  "Xiaomi Redmi 12 5G": { released: "2023-10", releasedNote: "au（2023年10月6日）", codes: { au: ["XIG03"], softbank: ["A401XM"] }, ...NONE },
  "Xiaomi Redmi 12C": { released: "2023-03", releasedNote: "SIMフリー（小米技術日本の発表・3月16日）", codes: {}, ...NONE },
  "Xiaomi Redmi 9T": { released: "2021-08", releasedNote: "Y!mobile（2021年8月26日。SIMフリー版の発売日は未確認）", codes: {}, ...NONE },
  // ---- POCO ----
  "Xiaomi POCO X8 Pro Max": { released: "2026-03", releasedNote: "SIMフリー（小米技術日本の発表・3月17日）", codes: {}, ...NONE },
  "Xiaomi POCO X8 Pro": { released: "2026-03", releasedNote: "SIMフリー（小米技術日本の発表・3月17日）", codes: {}, ...NONE },
  "Xiaomi POCO F8 Pro": { released: "2026-01", releasedNote: "SIMフリー（小米技術日本の発表・1月22日）", codes: {}, ...NONE },
  "Xiaomi POCO M8 5G": { released: "2026-01", releasedNote: "SIMフリー（小米技術日本の発表・1月8日）", codes: {}, ...NONE },
  "Xiaomi POCO F7": { released: null, codes: {}, ...NONE },
  "Xiaomi POCO X7 Pro": { released: null, codes: {}, ...NONE },
  "Xiaomi POCO F6 Pro": { released: null, codes: {}, ...NONE },
};

/** 機種別ページ・一覧に出すシリーズごとの並び（新しい順） */
export const XIAOMI_CATALOG = [
  {
    series: "Xiaomi",
    models: [
      "Xiaomi 17T Pro", "Xiaomi 17T", "Xiaomi 15T Pro", "Xiaomi 15T", "Xiaomi 15", "Xiaomi 14T Pro", "Xiaomi 14T",
      "Xiaomi 13T Pro", "Xiaomi 13T", "Xiaomi 12T Pro", "Xiaomi 11T Pro", "Xiaomi 11T", "Xiaomi Mi 11 Lite 5G",
    ],
  },
  {
    series: "Redmi Note",
    models: [
      "Xiaomi Redmi Note 15 Pro 5G", "Xiaomi Redmi Note 15 5G", "Xiaomi Redmi Note 14 Pro 5G", "Xiaomi Redmi Note 13 Pro+ 5G",
      "Xiaomi Redmi Note 13 Pro 5G", "Xiaomi Redmi Note 11 Pro 5G", "Xiaomi Redmi Note 11", "Xiaomi Redmi Note 10T",
      "Xiaomi Redmi Note 10 Pro", "Xiaomi Redmi Note 10 JE", "Xiaomi Redmi Note 9T", "Xiaomi Redmi Note 9S",
    ],
  },
  { series: "Redmi", models: ["Xiaomi Redmi 15 5G", "Xiaomi Redmi 14C", "Xiaomi Redmi 12 5G", "Xiaomi Redmi 12C", "Xiaomi Redmi 9T"] },
  {
    series: "POCO",
    models: ["Xiaomi POCO X8 Pro Max", "Xiaomi POCO X8 Pro", "Xiaomi POCO F8 Pro", "Xiaomi POCO M8 5G", "Xiaomi POCO F7", "Xiaomi POCO X7 Pro", "Xiaomi POCO F6 Pro"],
  },
];

/** Xiaomi の機種別ページを持つ全モデル（シリーズごとに新しい順） */
export const XIAOMI_MODELS = XIAOMI_CATALOG.flatMap((s) => s.models);

/** Xiaomi・Redmi・POCO（機種名はすべて "Xiaomi " で始まる） */
export const isXiaomi = (model: string) => /^Xiaomi /.test(model);

const key = (code: string): string => code.replace(/-/g, "").toUpperCase();

/** 型番 → 機種名（unconfirmed も含む） */
export const XIAOMI_CODE_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>();
  for (const [model, i] of Object.entries(XIAOMI_INFO)) {
    for (const code of [...Object.values(i.codes).flat(), ...(i.unconfirmed ?? [])]) index.set(key(code), model);
  }
  return index;
})();

/** 商品名の中の Xiaomi の型番らしい語（au XIGxx・SoftBank A×××XM）。前後が英数字のものは除く */
export const XIAOMI_CODE_RE = /(?<![A-Za-z0-9])(?:XIG\d{2}|A\d{3}XM)(?![A-Za-z0-9])/gi;

/** 商品名に含まれる型番のうち、辞書にあるもので機種を決める。なければ null */
export function xiaomiModelByCode(raw: string): string | null {
  for (const m of raw.normalize("NFKC").matchAll(XIAOMI_CODE_RE)) {
    const model = XIAOMI_CODE_INDEX.get(key(m[0]));
    if (model) return model;
  }
  return null;
}

const byName = buildNameMatcher(XIAOMI_MODELS, "xiaomi", ["redmi", "poco", "mi"]);

/**
 * 商品名から Xiaomi（Redmi・POCO 含む）の機種名を返す（型番を先に見て、なければ名前。lib/androidCommon.ts の buildNameMatcher）。
 * カタログ外（Ultra・POCO F7 Pro・Mi 10 Lite・Redmi 17 など）・タブレット（Redmi Pad・Xiaomi Pad）・Leitzphone・時計・バンドは null
 */
export function canonicalXiaomiModel(raw: string): string | null {
  if (/Pad|Leitzphone|Leica|Watch|Band|Black ?Shark/i.test(raw.normalize("NFKC"))) return null;
  return xiaomiModelByCode(raw) ?? byName(raw);
}

// ---- 比較用スペック（lib/androidSpecs.ts と同じ IphoneSpec の形） ----
//
// 画面は AMOLED・有機EL を「有機EL」、TFT液晶を「液晶」。チップ名は ®・™・Mobile Platform・「搭載」を外した。
// 生体認証は公式の「画面内指紋センサー」「側面指紋センサー」「AI顔認証」を短くした（11T・11T Pro の仕様は指紋だけ）。
// 入れていない機種（公式で確かめられない項目があるもの）:
//   - 表示方式が公式にない: 17T Pro・17T・Redmi Note 10 JE・Redmi 14C・Redmi Note 9T
//   - 仕様にポートの記載がない（同梱品の USB Type-C ケーブルだけ）: 12T Pro・11T Pro・Redmi Note 10 Pro・Redmi Note 14 Pro 5G・
//     Redmi Note 15 Pro 5G・Redmi Note 15 5G・POCO M8 5G
//   - ポートが Micro USB（IphoneSpec の port に無い）: Redmi 12C
//   - 仕様ページが無い（404）: Redmi Note 9S。読んでいない: Redmi 9T・POCO X8 Pro

const jaReleased = (s: string | null | undefined): string => {
  if (!s) return "";
  const [y, m] = s.split("-");
  return m ? `${y}年${Number(m)}月` : `${y}年`;
};

const OLED = "有機EL" as const;
const LCD = "液晶" as const;
const FP_IN = "指紋（画面内）・顔認証";
const FP_SONIC = "指紋（画面内・超音波）・顔認証";
const FP_SIDE = "指紋（側面）・顔認証";

const miSpec = (slug: string) => `https://www.mi.com/jp/product/${slug}/specs/`;
const sbSpec = (slug: string) => `https://www.softbank.jp/mobile/products/smartphone/${slug}/`;

/** 機種名から "Xiaomi " を外した、公式ページの名前 */
const shortName = (model: string) => model.replace(/^Xiaomi (?=Redmi|POCO|Mi )/, "");

const m = (
  model: string, chip: string, display: number, panel: IphoneSpec["panel"], auth: string, slug: string,
  extra?: IphoneSpec["extraSource"],
): [string, IphoneSpec] => [
  model,
  {
    released: jaReleased(XIAOMI_INFO[model]?.released),
    chip, display, panel, port: "USB-C", auth, specId: "",
    url: miSpec(slug), source: `Xiaomi「${shortName(model)} 仕様」`,
    ...(extra ? { extraSource: extra } : {}),
  },
];

/** 表示方式・画面サイズをソフトバンクの製品ページで確かめた機種 */
const sb = (model: string, slug: string): IphoneSpec["extraSource"] => ({ name: `ソフトバンク「${shortName(model)}」製品ページ`, url: sbSpec(slug) });

export const XIAOMI_SPECS: Record<string, IphoneSpec> = Object.fromEntries([
  m("Xiaomi 15T Pro", "MediaTek Dimensity 9400+", 6.83, OLED, FP_IN, "xiaomi-15t-pro"),
  m("Xiaomi 15T", "MediaTek Dimensity 8400-Ultra", 6.83, OLED, FP_IN, "xiaomi-15t"),
  m("Xiaomi 15", "Snapdragon 8 Elite", 6.36, OLED, FP_SONIC, "xiaomi-15"),
  // 画面サイズは概要ページ（https://www.mi.com/jp/product/xiaomi-14t-pro/）
  m("Xiaomi 14T Pro", "MediaTek Dimensity 9300+", 6.67, OLED, FP_IN, "xiaomi-14t-pro"),
  m("Xiaomi 14T", "MediaTek Dimensity 8300-Ultra", 6.67, OLED, FP_IN, "xiaomi-14t"),
  // mi.com/jp の 13T Pro の仕様ページは 404。仕様はソフトバンクの製品ページ
  [
    "Xiaomi 13T Pro",
    {
      released: jaReleased(XIAOMI_INFO["Xiaomi 13T Pro"].released),
      chip: "MediaTek Dimensity 9200+", display: 6.7, panel: OLED, port: "USB-C", auth: "指紋・顔認証", specId: "",
      url: sbSpec("xiaomi-13t-pro"), source: "ソフトバンク「Xiaomi 13T Pro」製品ページ",
    },
  ],
  m("Xiaomi 13T", "MediaTek Dimensity 8200-Ultra", 6.7, OLED, FP_IN, "xiaomi-13t"),
  m("Xiaomi 11T", "MediaTek Dimensity 1200-Ultra", 6.67, OLED, "指紋（側面）", "xiaomi-11t"),
  m("Xiaomi Mi 11 Lite 5G", "Snapdragon 780G", 6.55, OLED, FP_SIDE, "mi-11-lite-5g"),
  m("Xiaomi Redmi Note 13 Pro+ 5G", "MediaTek Dimensity 7200-Ultra", 6.67, OLED, FP_IN, "redmi-note-13-pro-plus-5g"),
  m("Xiaomi Redmi Note 13 Pro 5G", "Snapdragon 7s Gen 2", 6.7, OLED, FP_IN, "redmi-note-13-pro-5g"),
  m("Xiaomi Redmi Note 11 Pro 5G", "Snapdragon 695 5G", 6.67, OLED, FP_SIDE, "redmi-note-11-pro-5g"),
  m("Xiaomi Redmi Note 11", "Snapdragon 680", 6.43, OLED, FP_SIDE, "redmi-note-11"),
  m("Xiaomi Redmi Note 10T", "Snapdragon 480 5G", 6.5, LCD, FP_SIDE, "redmi-note-10t", sb("Xiaomi Redmi Note 10T", "redmi-note-10t")),
  m("Xiaomi Redmi 15 5G", "Snapdragon 6s Gen 3", 6.9, LCD, FP_SIDE, "redmi-15-5g", sb("Xiaomi Redmi 15 5G", "redmi-15-5g")),
  m("Xiaomi Redmi 12 5G", "Snapdragon 4 Gen 2", 6.8, LCD, FP_SIDE, "redmi-12-5g", sb("Xiaomi Redmi 12 5G", "redmi-12-5g")),
  m("Xiaomi POCO X8 Pro Max", "MediaTek Dimensity 9500s", 6.83, OLED, FP_SONIC, "poco-x8-pro-max"),
  m("Xiaomi POCO F8 Pro", "Snapdragon 8 Elite", 6.59, OLED, FP_SONIC, "poco-f8-pro"),
  // 表示方式は概要ページ（https://www.mi.com/jp/product/poco-f7/）の「有機EL（AMOLED）ディスプレイ」
  m("Xiaomi POCO F7", "Snapdragon 8s Gen 4", 6.83, OLED, FP_IN, "poco-f7"),
  m("Xiaomi POCO X7 Pro", "MediaTek Dimensity 8400-Ultra", 6.67, OLED, FP_IN, "poco-x7-pro"),
  m("Xiaomi POCO F6 Pro", "Snapdragon 8 Gen 2", 6.67, OLED, FP_IN, "poco-f6-pro"),
]);
