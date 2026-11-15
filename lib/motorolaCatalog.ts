/**
 * motorola のカタログ（2026-11-15）。形は lib/oppoCatalog.ts に合わせた（機種別ページ・検索の機種照合・楽天の読み取りで共有する）。
 *
 * 載せるのは 2021年以降に日本で発売された機種（海外版だけの機種は入れない）。機種名はモトローラの公式表記の頭に "motorola " を付けてそろえる
 * （"moto g66j 5G" → "motorola moto g66j 5G"。Xiaomi の "Xiaomi Redmi …" と同じ考え方で、一覧・店の数・検索を先頭の語で見分けるため）。
 *
 * 出典（2026-11-15 に開いて確認）:
 *   - 機種の一覧（SIMフリー版）… モトローラ公式「all smartphones」 https://www.motorola.com/jp/ja/smartphones にある各機種のページ
 *     （razr fold・razr 60・60 ultra・50・50 ultra・40・40 ultra、edge 70 fusion・60・60 pro・50 pro・40・40 neo・30 pro・20・20 fusion、
 *       moto g37j・g06・g66j 5G・g05・g64 5G・g53j 5G・g13・g32・g52j 5G・g31・g100、moto e32s）
 *   - キャリア版 … ソフトバンクの製品ページ https://www.softbank.jp/mobile/products/smartphone/motorola-<機種>/
 *     （razr 60s・50s・40s、edge 60s pro・50s pro の発売日）、ドコモの製品仕様ページ
 *     https://www.docomo.ne.jp/product/m51f/spec.html（razr 60d M-51F）・https://www.docomo.ne.jp/support/product/m51e/spec.html（razr 50d M-51E）、
 *     Y!mobile「2025年7月新発売 moto g66y 5G」（ymobile.jp のお知らせ）・Y!mobile 法人の製品ページ（moto g64y 5G）
 * 公式で確かめられていない値は null（推測で埋めない）。
 * - SIMフリー版の発売日: モトローラ公式の製品ページに発売日の記載がなく、プレスリリースの一覧も開けなかったので、すべて null（報道の日付は使わない）
 * - 型番: ドコモの M-51F・M-51E だけ（XT 番号・ソフトバンクの A×××MO は公式ページで確かめられていない）。機種は名前で決める
 * - OS アップデート・セキュリティ更新の方針: 日本向けの公式ページに見当たらず、すべて null
 * - moto g53y 5G（Y!mobile）は公式ページを開けず確かめられなかったので入れていない。g52j 5G II・g52j 5G SPECIAL は g52j 5G に含める（名前で区別しない）
 */
import { buildNameMatcher, type AndroidInfo } from "@/lib/androidCommon";
import type { IphoneSpec } from "@/lib/iphoneSpecs";

export type MotorolaInfo = AndroidInfo;

const u = (released: string | null = null, releasedNote?: string, codes: AndroidInfo["codes"] = {}): MotorolaInfo =>
  ({ released, ...(releasedNote ? { releasedNote } : {}), codes, osPolicy: null, securityUntil: null });

export const MOTOROLA_INFO: Record<string, MotorolaInfo> = {
  // ---- razr ----
  "motorola razr fold": u(),
  "motorola razr 60 ultra": u(),
  "motorola razr 60": u(),
  "motorola razr 60s": u("2025-10", "SoftBank（2025年10月10日）"),
  "motorola razr 60d": u("2025-10", "ドコモ（2025年10月10日）", { docomo: ["M-51F"] }),
  "motorola razr 50 ultra": u(),
  "motorola razr 50": u(),
  "motorola razr 50s": u("2024-09", "SoftBank（2024年9月27日）"),
  "motorola razr 50d": u("2024-12", "ドコモ（2024年12月19日）", { docomo: ["M-51E"] }),
  "motorola razr 40 ultra": u(),
  "motorola razr 40": u(),
  "motorola razr 40s": u("2023-12", "SoftBank（2023年12月8日）"),
  // ---- edge ----
  "motorola edge 70 fusion": u(),
  "motorola edge 60 pro": u(),
  "motorola edge 60s pro": u("2025-07", "SoftBank（2025年7月11日）"),
  "motorola edge 60": u(),
  "motorola edge 50 pro": u(),
  "motorola edge 50s pro": u("2024-07", "SoftBank（2024年7月12日）"),
  "motorola edge 40 neo": u(),
  "motorola edge 40": u(),
  "motorola edge 30 pro": u(),
  "motorola edge 20 fusion": u(),
  "motorola edge 20": u(),
  // ---- moto g・e ----
  "motorola moto g37j": u(),
  "motorola moto g06": u(),
  "motorola moto g66j 5G": u(),
  "motorola moto g66y 5G": u("2025-07", "Y!mobile（2025年7月）"),
  "motorola moto g05": u(),
  "motorola moto g64 5G": u(),
  "motorola moto g64y 5G": u(),
  "motorola moto g53j 5G": u(),
  "motorola moto g13": u(),
  "motorola moto g32": u(),
  "motorola moto g52j 5G": u(),
  "motorola moto g31": u(),
  "motorola moto g100": u(),
  "motorola moto e32s": u(),
};

/** 機種別ページ・一覧に出すシリーズごとの並び（新しい順） */
export const MOTOROLA_CATALOG = [
  {
    series: "motorola razr",
    models: [
      "motorola razr fold", "motorola razr 60 ultra", "motorola razr 60", "motorola razr 60s", "motorola razr 60d",
      "motorola razr 50 ultra", "motorola razr 50", "motorola razr 50s", "motorola razr 50d",
      "motorola razr 40 ultra", "motorola razr 40", "motorola razr 40s",
    ],
  },
  {
    series: "motorola edge",
    models: [
      "motorola edge 70 fusion", "motorola edge 60 pro", "motorola edge 60s pro", "motorola edge 60", "motorola edge 50 pro", "motorola edge 50s pro",
      "motorola edge 40 neo", "motorola edge 40", "motorola edge 30 pro", "motorola edge 20 fusion", "motorola edge 20",
    ],
  },
  {
    series: "moto g・moto e",
    models: [
      "motorola moto g37j", "motorola moto g06", "motorola moto g66j 5G", "motorola moto g66y 5G", "motorola moto g05", "motorola moto g64 5G", "motorola moto g64y 5G",
      "motorola moto g53j 5G", "motorola moto g13", "motorola moto g32", "motorola moto g52j 5G", "motorola moto g31", "motorola moto g100", "motorola moto e32s",
    ],
  },
];

/** motorola の機種別ページを持つ全モデル（シリーズごとに新しい順） */
export const MOTOROLA_MODELS = MOTOROLA_CATALOG.flatMap((s) => s.models);

export const isMotorola = (model: string) => /^motorola /.test(model);

const key = (code: string): string => code.replace(/-/g, "").toUpperCase();

/** 型番 → 機種名 */
export const MOTOROLA_CODE_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>();
  for (const [model, i] of Object.entries(MOTOROLA_INFO)) {
    for (const code of [...Object.values(i.codes).flat(), ...(i.unconfirmed ?? [])]) index.set(key(code), model);
  }
  return index;
})();

/** 商品名の中のドコモ版 motorola の型番（M-51F など）。前後が英数字のものは除く */
const MOTOROLA_CODE_RE = /(?<![A-Za-z0-9])M-?\d{2}[A-Z](?![A-Za-z0-9])/gi;

export function motorolaModelByCode(raw: string): string | null {
  for (const m of raw.normalize("NFKC").matchAll(MOTOROLA_CODE_RE)) {
    const model = MOTOROLA_CODE_INDEX.get(key(m[0]));
    if (model) return model;
  }
  return null;
}

const byName = buildNameMatcher(MOTOROLA_MODELS, "motorola", ["razr", "edge", "moto"]);

/**
 * 商品名から motorola の機種名を返す（型番を先に見て、なければ名前。lib/androidCommon.ts の buildNameMatcher）。
 * カタログ外（moto g8・g50・edge X30 など）・タブレット（moto tab）・付属品は null
 */
export function canonicalMotorolaModel(raw: string): string | null {
  if (/\btab\b|ケース|フィルム|充電器/i.test(raw.normalize("NFKC"))) return null;
  return motorolaModelByCode(raw) ?? byName(raw);
}

/**
 * 容量が1つだけと公式で確かめた機種の容量（GB）。イオシス楽天は商品名に容量を書かないので、これで決める（決められなければ行にしない）。
 * - ANY: 日本で売られた版がすべてこの容量（キャリア専売の機種。ソフトバンク・ドコモの製品ページの ROM）
 * - SIMFREE: SIMフリー版だけこの容量（モトローラ公式の各機種の「内部ストレージ」。キャリア版は別の容量があるので「国内版SIMフリー」の商品だけに使う）
 */
export const MOTOROLA_STORAGE_ANY: Record<string, number> = {
  "motorola razr 60s": 256, "motorola razr 60d": 256, "motorola razr 50s": 256, "motorola razr 50d": 256, "motorola razr 40s": 256,
  "motorola edge 60s pro": 256, "motorola edge 50s pro": 256,
};
export const MOTOROLA_STORAGE_SIMFREE: Record<string, number> = {
  "motorola razr 60": 512, "motorola razr 60 ultra": 512, "motorola razr 50 ultra": 512, "motorola razr 50": 512,
  "motorola razr 40 ultra": 256, "motorola razr 40": 256,
  "motorola edge 60 pro": 256, "motorola edge 60": 128, "motorola edge 40 neo": 256, "motorola edge 40": 256, "motorola edge 20 fusion": 128, "motorola edge 20": 128,
  "motorola moto g06": 128, "motorola moto g66j 5G": 128, "motorola moto g05": 128, "motorola moto g64 5G": 128, "motorola moto g53j 5G": 128,
  "motorola moto g13": 128, "motorola moto g32": 128, "motorola moto g31": 128, "motorola moto g100": 128, "motorola moto e32s": 64,
};

// ---- 比較用スペック（lib/androidSpecs.ts と同じ IphoneSpec の形） ----
//
// モトローラ公式の各機種ページの「仕様」（2026-11-15）と、ドコモの製品仕様ページ。画面は pOLED・AMOLED・OLED・有機EL を「有機EL」、LCD を「液晶」。
// 入れていない機種（公式の仕様の表が確かめられない・食い違う）: razr fold（表が読めない）、razr 60（仕様の表が razr 60 ultra と同じ値で食い違う）、
// razr 60 ultra（画面の種類の記載なし）、razr 50・40 ultra（画面の記載なし）、edge 50 pro（日本のページが India の表）、
// edge 40・moto g13・g100（画面の欄が他機種と同じ定型文で食い違う）、edge 30 pro（画面の種類なし）、edge 20（画面サイズの欄に本体の寸法）、
// キャリア専売の機種（ソフトバンクの製品ページに画面の種類・生体認証の記載なし）
const jaReleased = (s: string | null | undefined): string => {
  if (!s) return "";
  const [y, m] = s.split("-");
  return m ? `${y}年${Number(m)}月` : `${y}年`;
};
const OLED = "有機EL" as const;
const LCD = "液晶" as const;
const FP = "指紋・顔認証";

const motoUrl = (path: string) => `https://www.motorola.com/jp/ja/p/phones/${path}`;
const m = (model: string, chip: string, display: number, panel: IphoneSpec["panel"], auth: string, path: string, displayInner?: number): [string, IphoneSpec] => [
  model,
  {
    released: jaReleased(MOTOROLA_INFO[model]?.released),
    chip, display, ...(displayInner ? { displayInner } : {}), panel, port: "USB-C", auth, specId: "",
    url: motoUrl(path), source: `motorola「${model.replace(/^motorola (?=moto )/, "")} 仕様」`,
  },
];

export const MOTOROLA_SPECS: Record<string, IphoneSpec> = Object.fromEntries([
  // 折りたたみ（razr）は外側の画面を display、内側を displayInner
  m("motorola razr 50 ultra", "Snapdragon 8s Gen 3", 4.0, OLED, FP, "razr/50-ultra/pmipmgs37ms", 6.9),
  m("motorola razr 40", "Snapdragon 7 Gen 1", 1.5, OLED, FP, "razr/40/pmipmgc35mm", 6.9),
  m("motorola edge 70 fusion", "Snapdragon 7s Gen 3", 6.8, OLED, FP, "motorola-edge/70-fusion/pmipmjm44md"),
  m("motorola edge 60 pro", "MediaTek Dimensity 8350", 6.7, OLED, FP, "motorola-edge/60-pro/pmipmht41mf"),
  m("motorola edge 60", "MediaTek Dimensity 7400", 6.7, OLED, FP, "motorola-edge/60/pmipmhr41m4"),
  m("motorola edge 40 neo", "MediaTek Dimensity 7030", 6.55, OLED, FP, "motorola-edge/40-neo/pmipmge35mt"),
  m("motorola edge 20 fusion", "MediaTek Dimensity 800U", 6.7, OLED, FP, "motorola-edge/20-fusion/pmipmdv29mx"),
  m("motorola moto g37j", "MediaTek Dimensity 6300", 6.72, LCD, FP, "moto-g/37j/pmipmjs45m2"),
  m("motorola moto g06", "MediaTek Helio G81 Extreme", 6.9, LCD, FP, "moto-g/06/pmipmhy43m6"),
  m("motorola moto g66j 5G", "MediaTek Dimensity 7060", 6.7, LCD, FP, "moto-g/g-66-j/pmipmhu41mg"),
  m("motorola moto g05", "MediaTek Helio G81 Extreme", 6.7, LCD, "指紋（側面）・顔認証", "moto-g/05/pmipmhk40m8"),
  m("motorola moto g64 5G", "MediaTek Dimensity 7025", 6.5, LCD, FP, "moto-g/64-5g/pmipmgw38md"),
  m("motorola moto g53j 5G", "Snapdragon 480+ 5G", 6.5, LCD, FP, "moto-g/53j-5g/pmipmht56gh"),
  m("motorola moto g32", "Snapdragon 680 4G", 6.5, LCD, FP, "moto-g/moto-g32/pmipmfg32mk"),
  m("motorola moto g52j 5G", "Snapdragon 695 5G", 6.8, LCD, FP, "moto-g/52j-5g/pmipmey31m1"),
  m("motorola moto g31", "MediaTek Helio G85", 6.4, OLED, FP, "moto-g/31/pmipmen30mw"),
  m("motorola moto e32s", "MediaTek Helio G37", 6.5, LCD, FP, "moto-e/moto-e32s/pmipmew31mt"),
]);
