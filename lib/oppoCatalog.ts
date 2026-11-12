/**
 * OPPO のカタログ（下書き・2026-11-12）。形は lib/aquosCatalog.ts に合わせた（機種別ページ・検索の機種照合・楽天の読み取りで共有する想定）。
 *
 * 載せるのは 2020年以降に日本で発売された機種（海外版だけの機種は入れない）。機種名は OPPO の公式表記で、すべて "OPPO " で始める。
 * Reno5 A と Reno5 A（eSIM）は同じ機種として扱う（型番だけ別）。Reno3 A（2020）・A73（2020）は中古の出回りが多いので入れた。
 *
 * 出典（2026-11-12 に開いて確認）:
 *   - SIMフリー版のモデル番号（CPHxxxx）・スペック … OPPO 公式の各機種スペック
 *     https://www.oppo.com/jp/smartphones/<series>/<model>/specs/ （ページ上部に「OPPO Reno11 A (CPH2603)」の形で出る）
 *   - au の型番（OPGxx）・発売日 … au「OPPOの製品情報一覧」 https://www.au.com/support/service/mobile/manual/smartphone/oppo/
 *     （OPG05〜08 は一覧に型番が出ないため、同ページのビルド番号「OPG05_…」と au オンラインショップの機種画像名で対応を確かめた）
 *   - Y!mobile の型番（A×××OP）・発売日 … Y!mobile の製品ページ https://www.ymobile.jp/lineup/… の「製品番号」「発売日」、
 *     URL が型番のもの（/lineup/a101op/ など）、Y!mobile「ご利用中のお客さまへ」のビルド番号（A002OP_…・A301OP_…・A303OP_…）
 *   - SoftBank の型番 … ソフトバンク「ご利用中のお客さまへ」のビルド番号（A102OP_…・A302OP_…）。発売日はソフトバンクのプレスリリース
 *   - 発売日（SIMフリー）… OPPO 公式のプレスリリース https://www.oppo.com/jp/newsroom/press/… と、オウガ・ジャパンが PR TIMES で出したもの
 *   - Reno5 A の SIMフリー版 CPH2199 … 楽天モバイル「OPPO Reno5 Aのアップデート情報」のビルド番号（CPH2199_11_C.40）
 * 公式で確かめられていない値は null（推測で埋めない）。OS アップデート・セキュリティ更新の公式の方針は OPPO の日本向けページに見当たらず、すべて null。
 * 発売は日本で最初に出た日（どの売り場かを releasedNote に）。
 */
import { buildNameMatcher, type AndroidInfo } from "@/lib/androidCommon";
import type { IphoneSpec } from "@/lib/iphoneSpecs";

/** Xperia・AQUOS と同じ形（lib/androidCommon.ts。releasedNote は「Y!mobile（2024年6月27日）」のような文）。androidInfoOf から引ける */
export type OppoInfo = AndroidInfo;

export const OPPO_INFO: Record<string, OppoInfo> = {
  // ---- Find X ----
  "OPPO Find X9": {
    released: "2025-12", releasedNote: "au（2025年12月23日）",
    codes: { au: ["OPG07"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO Find X8": {
    released: "2024-12", releasedNote: "SIMフリー（OPPO 公式プレスリリース・12月12日）",
    codes: { simfree: ["CPH2651"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO Find X3 Pro": {
    released: "2021-06", releasedNote: "au（2021年6月30日）",
    codes: { au: ["OPG03"] },
    osPolicy: null, securityUntil: null,
  },
  // ---- Reno（数字） ----
  "OPPO Reno16 5G": {
    released: "2026-08", releasedNote: "SIMフリー（OPPO 公式プレスリリース・8月17日）",
    codes: { simfree: ["CPH2865"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO Reno14 5G": {
    released: "2025-07", releasedNote: "SIMフリー（OPPO 公式プレスリリース・7月17日）",
    codes: { simfree: ["CPH2737"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO Reno10 Pro 5G": {
    released: "2023-10", releasedNote: "SoftBank（2023年10月6日）",
    codes: { softbank: ["A302OP"], simfree: ["CPH2541"] },
    osPolicy: null, securityUntil: null,
  },
  // ---- Reno A ----
  "OPPO Reno15 A": {
    released: "2026-06", releasedNote: "Y!mobile・楽天モバイル（2026年6月25日）",
    codes: { au: ["OPG08"], ymobile: ["A601OP"] },
    unconfirmed: ["CPH2801"],
    osPolicy: null, securityUntil: null,
  },
  "OPPO Reno13 A": {
    // au の一覧の発売日は 2026年7月17日（au での取り扱い開始）
    released: "2025-06", releasedNote: "Y!mobile・楽天モバイル（2025年6月26日）",
    codes: { au: ["OPG05"], ymobile: ["A501OP"], simfree: ["CPH2699"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO Reno11 A": {
    released: "2024-06", releasedNote: "Y!mobile（2024年6月27日）",
    codes: { ymobile: ["A401OP"], simfree: ["CPH2603"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO Reno9 A": {
    released: "2023-06", releasedNote: "Y!mobile（2023年6月22日）",
    codes: { ymobile: ["A301OP"], simfree: ["CPH2523"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO Reno7 A": {
    released: "2022-06", releasedNote: "Y!mobile・au（2022年6月23日）",
    codes: { au: ["OPG04"], ymobile: ["A201OP"], simfree: ["CPH2353"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO Reno5 A": {
    // A103OP は eSIM 対応版（Y!mobile・2022年2月24日発売）
    released: "2021-06", releasedNote: "Y!mobile（2021年6月3日）",
    codes: { ymobile: ["A101OP", "A103OP"], simfree: ["CPH2199"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO Reno3 A": {
    released: "2020-08", releasedNote: "Y!mobile（2020年8月20日）",
    codes: { ymobile: ["A002OP"] },
    osPolicy: null, securityUntil: null,
  },
  // ---- A ----
  "OPPO A5 5G": {
    released: "2025-12", releasedNote: "au・Y!mobile・楽天モバイル（2025年12月4日）",
    codes: { au: ["OPG06"], ymobile: ["A502OP"], simfree: ["CPH2735"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO A5x": {
    released: "2025-08", releasedNote: "SIMフリー（OPPO 公式プレスリリース・8月28日）",
    codes: { simfree: ["CPH2725"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO A3 5G": {
    released: "2024-12", releasedNote: "Y!mobile（2024年12月12日）",
    codes: { ymobile: ["A402OP"], simfree: ["CPH2639"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO A79 5G": {
    released: "2024-02", releasedNote: "Y!mobile（2024年2月15日）",
    codes: { ymobile: ["A303OP"], simfree: ["CPH2557"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO A77": {
    released: "2022-10", releasedNote: "SIMフリー（オウガ・ジャパンの発表・10月6日）",
    codes: { simfree: ["CPH2385"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO A55s 5G": {
    released: null,
    codes: { softbank: ["A102OP"], simfree: ["CPH2309"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO A54 5G": {
    released: "2021-06", releasedNote: "au（2021年6月4日）",
    codes: { au: ["OPG02"], simfree: ["CPH2303"] },
    osPolicy: null, securityUntil: null,
  },
  "OPPO A73": {
    released: null,
    codes: { simfree: ["CPH2099"] },
    osPolicy: null, securityUntil: null,
  },
};

/** 機種別ページ・一覧に出すシリーズごとの並び（新しい順） */
export const OPPO_CATALOG = [
  { series: "OPPO Find X", models: ["OPPO Find X9", "OPPO Find X8", "OPPO Find X3 Pro"] },
  { series: "OPPO Reno", models: ["OPPO Reno16 5G", "OPPO Reno14 5G", "OPPO Reno10 Pro 5G"] },
  {
    series: "OPPO Reno A",
    models: ["OPPO Reno15 A", "OPPO Reno13 A", "OPPO Reno11 A", "OPPO Reno9 A", "OPPO Reno7 A", "OPPO Reno5 A", "OPPO Reno3 A"],
  },
  {
    series: "OPPO A",
    models: ["OPPO A5 5G", "OPPO A5x", "OPPO A3 5G", "OPPO A79 5G", "OPPO A77", "OPPO A55s 5G", "OPPO A54 5G", "OPPO A73"],
  },
];

/** OPPO の機種別ページを持つ全モデル（シリーズごとに新しい順） */
export const OPPO_MODELS = OPPO_CATALOG.flatMap((s) => s.models);

export const isOppo = (model: string) => /^OPPO /.test(model);

/** 型番の比較用の形（ハイフンを除き、大文字にする） */
const key = (code: string): string => code.replace(/-/g, "").toUpperCase();

/** 型番 → 機種名（unconfirmed も含む）。型番の体系が Xperia・AQUOS と違うので androidCommon の modelByCode ではなくここで引く */
export const OPPO_CODE_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>();
  for (const [model, i] of Object.entries(OPPO_INFO)) {
    for (const code of [...Object.values(i.codes).flat(), ...(i.unconfirmed ?? [])]) index.set(key(code), model);
  }
  return index;
})();

/** 商品名の中の OPPO の型番らしい語（au OPGxx・SoftBank/Y!mobile A×××OP・SIMフリー CPHxxxx）。前後が英数字のものは除く */
export const OPPO_CODE_RE = /(?<![A-Za-z0-9])(?:OPG\d{2}|A\d{3}OP|CPH\d{4})(?![A-Za-z0-9])/gi;

/** 商品名に含まれる型番のうち、辞書にあるもので機種を決める。なければ null */
export function oppoModelByCode(raw: string): string | null {
  for (const m of raw.normalize("NFKC").matchAll(OPPO_CODE_RE)) {
    const model = OPPO_CODE_INDEX.get(key(m[0]));
    if (model) return model;
  }
  return null;
}

const byName = buildNameMatcher(OPPO_MODELS, "oppo", ["reno", "find"]);

/**
 * 商品名から OPPO の機種名を返す（型番を先に見て、なければ名前。lib/androidCommon.ts の buildNameMatcher）。
 * カタログ外（Find N6・Find X9 Ultra・Find X2 Pro・2019年の Reno A など）・タブレット（OPPO Pad）・付属品は null
 */
export function canonicalOppoModel(raw: string): string | null {
  if (/Pad|AI Pen/i.test(raw.normalize("NFKC"))) return null;
  return oppoModelByCode(raw) ?? byName(raw);
}

// ---- 比較用スペック（lib/androidSpecs.ts と同じ IphoneSpec の形） ----
//
// すべて OPPO 公式の各機種スペック（2026-11-12）。画面は AMOLED・OLED・有機EL を「有機EL」、LCD・TFT-LCD を「液晶」。
// 生体認証は公式の「ディスプレイ指紋認証」「側面指紋認証」「顔認証」を短くした。チップ名は ®・™ を外した。
// 入れていない機種: Find X9・Reno15 A（公式の製品ページがスクリプトで描かれ、本文を読めなかった）、Find X3 Pro（未確認）、
// Reno5 A・Reno3 A（OPPO 公式のスペックページが無くなっている）

/** "2024-11" → "2024年11月"、"2023" → "2023年" */
const jaReleased = (s: string | null | undefined): string => {
  if (!s) return "";
  const [y, m] = s.split("-");
  return m ? `${y}年${Number(m)}月` : `${y}年`;
};

const OLED = "有機EL" as const;
const LCD = "液晶" as const;
const FP_IN = "指紋（画面内）・顔認証";
const FP_SIDE = "指紋（側面）・顔認証";

const oppoSpec = (path: string) => `https://www.oppo.com/jp/smartphones/${path}/specs/`;

const o = (model: string, chip: string, display: number, panel: IphoneSpec["panel"], auth: string, path: string): [string, IphoneSpec] => [
  model,
  {
    released: jaReleased(OPPO_INFO[model]?.released),
    chip, display, panel, port: "USB-C", auth, specId: "",
    url: oppoSpec(path), source: `OPPO「${model} スペック」`,
  },
];

export const OPPO_SPECS: Record<string, IphoneSpec> = Object.fromEntries([
  o("OPPO Find X8", "MediaTek Dimensity 9400", 6.6, OLED, FP_IN, "series-find-x/find-x8"),
  o("OPPO Reno16 5G", "Snapdragon 7 Gen 4", 6.3, OLED, FP_IN, "series-reno/reno16"),
  o("OPPO Reno14 5G", "MediaTek Dimensity 8350", 6.6, OLED, FP_IN, "series-reno/reno14"),
  o("OPPO Reno10 Pro 5G", "Snapdragon 778G 5G", 6.7, OLED, FP_IN, "series-reno/reno10-pro"),
  o("OPPO Reno13 A", "Snapdragon 6 Gen 1", 6.7, OLED, FP_IN, "series-reno/reno13-a"),
  o("OPPO Reno11 A", "MediaTek Dimensity 7050", 6.7, OLED, FP_IN, "series-reno/reno11-a"),
  o("OPPO Reno9 A", "Snapdragon 695 5G", 6.4, OLED, FP_IN, "series-reno/reno9-a"),
  o("OPPO Reno7 A", "Snapdragon 695 5G", 6.4, OLED, FP_IN, "series-reno/reno7-a"),
  o("OPPO A5 5G", "MediaTek Dimensity 6300", 6.7, LCD, FP_SIDE, "series-a/a5-5g"),
  o("OPPO A5x", "Snapdragon 6s 4G Gen 1", 6.7, LCD, FP_SIDE, "series-a/a5x"),
  o("OPPO A3 5G", "MediaTek Dimensity 6300", 6.7, LCD, FP_SIDE, "series-a/a3-5g"),
  o("OPPO A79 5G", "MediaTek Dimensity 6020", 6.7, LCD, FP_SIDE, "series-a/a79-5g"),
  o("OPPO A77", "MediaTek Helio G35", 6.5, LCD, FP_SIDE, "series-a/a77"),
  // 公式の「生体認証」欄は顔認証だけ（指紋の記載なし）
  o("OPPO A55s 5G", "Snapdragon 480 5G", 6.5, LCD, "顔認証", "series-a/a55s-5g"),
  o("OPPO A54 5G", "Snapdragon 480 5G", 6.5, LCD, FP_SIDE, "series-a/a54-5g"),
  o("OPPO A73", "Snapdragon 662", 6.44, OLED, FP_IN, "series-a/a73"),
]);
