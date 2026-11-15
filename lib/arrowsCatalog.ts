/**
 * arrows（FCNT。2023年までの機種は富士通ブランド）のカタログ（2026-11-15）。形は lib/oppoCatalog.ts に合わせた。
 *
 * 載せるのは 2020年以降に日本で発売されたスマートフォン（arrows ケータイ・arrows Tab・らくらくスマートフォンは入れない）。機種名は FCNT の公式表記で、すべて "arrows " で始まる。
 *
 * 出典（2026-11-15 に開いて確認）:
 *   - 機種の一覧・型番 … FCNT「arrows」 https://www.fcnt.com/product/arrows/ （新製品の各ページの型番と、年ごとの過去の機種）
 *   - 発売日・ROM・RAM・画面・チップ・生体認証 … FCNT の仕様ページ https://www.fcnt.com/spec/<型番>/
 *     （f-51g-dcm・m10-sim-free・f-52g-dcm・fcg04-kd・m09-sim-free・f-51f-dcm・m08-sim-free・f-51e・m06-sim-free・f-52e・m07-sim-free・fcg02・a402fc）、
 *     2023年以前の機種はドコモの製品仕様ページ https://www.docomo.ne.jp/support/product/<型番>/spec.html（f51c・f51b・f41b・f52a・f51a・f41a）
 *   - arrows We の au 版 FCG01・発売日 … au「FCNTの製品情報一覧」 https://www.au.com/support/service/mobile/manual/smartphone/fcnt/
 *   - arrows We の SoftBank 版 A101FC … ソフトバンクのオンラインマニュアル（arrows We）と、2021年11月25日のプレスリリース（12月3日発売）
 * 公式で確かめられていない値は入れない。OS アップデート・セキュリティ更新の方針は機種ごとの公式の記載を確かめておらず、すべて null。
 * 発売は日本で最初に出た日（どの売り場かを releasedNote に）。
 */
import { buildNameMatcher, type AndroidInfo } from "@/lib/androidCommon";
import type { IphoneSpec } from "@/lib/iphoneSpecs";

export type ArrowsInfo = AndroidInfo;

export const ARROWS_INFO: Record<string, ArrowsInfo> = {
  // ---- Alpha ----
  "arrows Alpha2": {
    // au・SoftBank・Y!mobile・楽天モバイルの版（M10）も同じ日に発売
    released: "2026-08", releasedNote: "ドコモ・SIMフリー（2026年8月27日）",
    codes: { docomo: ["F-51G"], simfree: ["M10"] },
    osPolicy: null, securityUntil: null,
  },
  "arrows Alpha": {
    released: "2025-08", releasedNote: "ドコモ・SIMフリー（2025年8月28日）",
    codes: { docomo: ["F-51F"], simfree: ["M08"] },
    osPolicy: null, securityUntil: null,
  },
  // ---- We ----
  "arrows We3": {
    released: "2026-06", releasedNote: "ドコモ・au・SIMフリー（2026年6月25日）",
    codes: { docomo: ["F-52G"], au: ["FCG04"], simfree: ["M09"] },
    osPolicy: null, securityUntil: null,
  },
  "arrows We2 Plus": {
    // SIMフリー版 M06 は 2024年8月14日以降順次
    released: "2024-08", releasedNote: "ドコモ（2024年8月9日）",
    codes: { docomo: ["F-51E"], simfree: ["M06"] },
    osPolicy: null, securityUntil: null,
  },
  "arrows We2": {
    // SoftBank 版 A402FC は 2024年12月6日
    released: "2024-08", releasedNote: "ドコモ・au・SIMフリー（2024年8月16日）",
    codes: { docomo: ["F-52E"], au: ["FCG02"], softbank: ["A402FC"], simfree: ["M07"] },
    osPolicy: null, securityUntil: null,
  },
  "arrows We": {
    released: "2021-12", releasedNote: "ドコモ・au・SoftBank（2021年12月3日）",
    codes: { docomo: ["F-51B"], au: ["FCG01"], softbank: ["A101FC"] },
    osPolicy: null, securityUntil: null,
  },
  // ---- N・NX9・5G ----
  "arrows N": {
    released: "2023-02", releasedNote: "ドコモ（2023年2月10日）",
    codes: { docomo: ["F-51C"] },
    osPolicy: null, securityUntil: null,
  },
  "arrows NX9": {
    released: "2020-12", releasedNote: "ドコモ（2020年12月18日）",
    codes: { docomo: ["F-52A"] },
    osPolicy: null, securityUntil: null,
  },
  "arrows 5G": {
    released: "2020-07", releasedNote: "ドコモ（2020年7月30日）",
    codes: { docomo: ["F-51A"] },
    osPolicy: null, securityUntil: null,
  },
  // ---- Be ----
  "arrows Be4 Plus": {
    released: "2021-05", releasedNote: "ドコモ（2021年5月28日）",
    codes: { docomo: ["F-41B"] },
    osPolicy: null, securityUntil: null,
  },
  "arrows Be4": {
    released: "2020-06", releasedNote: "ドコモ（2020年6月25日）",
    codes: { docomo: ["F-41A"] },
    osPolicy: null, securityUntil: null,
  },
};

/** 機種別ページ・一覧に出すシリーズごとの並び（新しい順） */
export const ARROWS_CATALOG = [
  { series: "arrows Alpha", models: ["arrows Alpha2", "arrows Alpha"] },
  { series: "arrows We", models: ["arrows We3", "arrows We2 Plus", "arrows We2", "arrows We"] },
  { series: "arrows N・NX9・5G", models: ["arrows N", "arrows NX9", "arrows 5G"] },
  { series: "arrows Be", models: ["arrows Be4 Plus", "arrows Be4"] },
];

/** arrows の機種別ページを持つ全モデル（シリーズごとに新しい順） */
export const ARROWS_MODELS = ARROWS_CATALOG.flatMap((s) => s.models);

export const isArrows = (model: string) => /^arrows /.test(model);

const key = (code: string): string => code.replace(/-/g, "").toUpperCase();

/** 型番 → 機種名 */
export const ARROWS_CODE_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>();
  for (const [model, i] of Object.entries(ARROWS_INFO)) {
    for (const code of [...Object.values(i.codes).flat(), ...(i.unconfirmed ?? [])]) index.set(key(code), model);
  }
  return index;
})();

/** 商品名の中の arrows の型番らしい語（ドコモ F-xxx・au FCGxx・SoftBank A×××FC・SIMフリー Mxx）。前後が英数字のものは除く */
export const ARROWS_CODE_RE = /(?<![A-Za-z0-9-])(?:F-?\d{2}[A-Z]|FCG\d{2}|A\d{3}FC|M\d{2})(?![A-Za-z0-9])/gi;

export function arrowsModelByCode(raw: string): string | null {
  for (const m of raw.normalize("NFKC").matchAll(ARROWS_CODE_RE)) {
    const model = ARROWS_CODE_INDEX.get(key(m[0]));
    if (model) return model;
  }
  return null;
}

const byName = buildNameMatcher(ARROWS_MODELS, "arrows", []);

/**
 * 商品名から arrows の機種名を返す（型番を先に見て、なければ名前）。
 * カタログ外（arrows ケータイ・arrows Tab・2019年以前の機種）・付属品は null
 */
export function canonicalArrowsModel(raw: string): string | null {
  const s = raw.normalize("NFKC");
  if (/ケータイ|\bTab\b|らくらく|ケース|フィルム/i.test(s)) return null;
  const byCode = arrowsModelByCode(s);
  if (byCode) return byCode;
  // 名前で当てたときは、機種名のすぐ後ろに英数字が続かないこと（"arrows We4" を We にしない。buildNameMatcher は数字の続きを別の機種とみなさない）
  const model = byName(s);
  if (!model) return null;
  const tail = model.replace(/^arrows /, "").split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*");
  return new RegExp(`arrows\\s*${tail}(?![0-9A-Za-z])`, "i").test(s) ? model : null;
}

/**
 * 型番 → 容量（GB）。FCNT・ドコモの仕様ページで ROM が1種類だけの型番（イオシス楽天は商品名に容量を書かないので、これで決める）。
 * M09（64GB・128GB）・M10（256GB・512GB）・F-51G（同）は容量が2つあるので入れない。FCG01・A101FC は au・SoftBank の仕様を確かめていないので入れない
 */
export const ARROWS_CODE_STORAGE: Record<string, number> = {
  "F-52G": 64, FCG04: 64, "F-51F": 512, M08: 512, "F-51E": 256, M06: 256,
  "F-52E": 64, FCG02: 64, A402FC: 64, M07: 128,
  "F-51C": 128, "F-51B": 64, "F-41B": 64, "F-52A": 128, "F-51A": 128, "F-41A": 32,
};
const STORAGE_BY_KEY = new Map(Object.entries(ARROWS_CODE_STORAGE).map(([c, gb]) => [key(c), gb]));

export function storageFromArrowsCode(raw: string): number {
  for (const m of raw.normalize("NFKC").matchAll(ARROWS_CODE_RE)) {
    const gb = STORAGE_BY_KEY.get(key(m[0]));
    if (gb) return gb;
  }
  return 0;
}

// ---- 比較用スペック（lib/androidSpecs.ts と同じ IphoneSpec の形） ----
// FCNT の仕様ページ・ドコモの製品仕様ページの値（2026-11-15）。画面は TFT・TFT LCD を「液晶」。生体認証は公式の「指紋認証 / 顔認証」「指紋」を短くした
const jaReleased = (s: string | null | undefined): string => {
  if (!s) return "";
  const [y, m] = s.split("-");
  return m ? `${y}年${Number(m)}月` : `${y}年`;
};
const OLED = "有機EL" as const;
const LCD = "液晶" as const;
const FP_FACE = "指紋・顔認証";
const FP = "指紋";

const fcnt = (code: string) => `https://www.fcnt.com/spec/${code}/`;
const docomo = (code: string) => `https://www.docomo.ne.jp/support/product/${code}/spec.html`;

const a = (model: string, chip: string, display: number, panel: IphoneSpec["panel"], auth: string, url: string, source: string): [string, IphoneSpec] => [
  model,
  { released: jaReleased(ARROWS_INFO[model]?.released), chip, display, panel, port: "USB-C", auth, specId: "", url, source },
];

export const ARROWS_SPECS: Record<string, IphoneSpec> = Object.fromEntries([
  a("arrows Alpha2", "MediaTek Dimensity 8350 Extreme", 6.4, OLED, FP_FACE, fcnt("m10-sim-free"), "FCNT「arrows Alpha2 M10 スペック」"),
  a("arrows Alpha", "MediaTek Dimensity 8350 Extreme", 6.4, OLED, FP_FACE, fcnt("m08-sim-free"), "FCNT「arrows Alpha スペック」"),
  a("arrows We3", "MediaTek Dimensity 6300", 6.1, LCD, FP_FACE, fcnt("m09-sim-free"), "FCNT「arrows We3 M09 スペック」"),
  a("arrows We2 Plus", "Snapdragon 7s Gen 2", 6.6, OLED, FP_FACE, fcnt("m06-sim-free"), "FCNT「arrows We2 Plus M06 スペック」"),
  a("arrows We2", "MediaTek Dimensity 7025", 6.1, LCD, FP_FACE, fcnt("m07-sim-free"), "FCNT「arrows We2 M07 スペック」"),
  a("arrows We", "Snapdragon 480", 5.7, LCD, FP, docomo("f51b"), "ドコモ「arrows We F-51B 製品仕様」"),
  a("arrows N", "Snapdragon 695", 6.24, OLED, FP_FACE, docomo("f51c"), "ドコモ「arrows N F-51C 製品仕様」"),
  a("arrows NX9", "Snapdragon 765G", 6.3, OLED, FP, docomo("f52a"), "ドコモ「arrows NX9 F-52A 製品仕様」"),
  a("arrows 5G", "Snapdragon 865", 6.7, OLED, FP, docomo("f51a"), "ドコモ「arrows 5G F-51A 製品仕様」"),
  a("arrows Be4 Plus", "Snapdragon 460", 5.6, OLED, FP, docomo("f41b"), "ドコモ「arrows Be4 Plus F-41B 製品仕様」"),
  a("arrows Be4", "Snapdragon 450", 5.6, OLED, FP, docomo("f41a"), "ドコモ「arrows Be4 F-41A 製品仕様」"),
]);
