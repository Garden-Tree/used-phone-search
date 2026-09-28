/**
 * iPad の基本スペック（機種ページの「基本スペック」・紹介文、比較ページの「スペックの違い」）。形は iPhone と共通（`lib/iphoneSpecs.ts`）。
 * 2026-09-29 に Apple 公式で裏どりした:
 *   - 発売年・技術仕様ページ … 「iPad のモデルを識別する」https://support.apple.com/ja-jp/108043
 *   - チップ・画面・コネクタ・Touch ID/Face ID … 各機種の技術仕様
 * 画面サイズは技術仕様の「○インチ（対角）」。iPad（第10世代）・iPad（A16）は技術仕様に 10.86インチ とだけあるのでその値。
 * 機種を足すときは、上の2ページで確かめてから足す。キーは `lib/ipadCatalog.ts` の機種名
 */
import type { IphoneSpec } from "@/lib/iphoneSpecs";

/** 新しい技術仕様ページ（support.apple.com/ja-jp/<番号>） */
const s = (
  released: string, chip: string, display: number, panel: IphoneSpec["panel"],
  port: IphoneSpec["port"], auth: IphoneSpec["auth"], specId: string,
): IphoneSpec => ({ released, chip, display, panel, port, auth, specId });

/** 古い形式の技術仕様ページ（support.apple.com/kb/SPxxx） */
const k = (
  released: string, chip: string, display: number, panel: IphoneSpec["panel"],
  port: IphoneSpec["port"], auth: IphoneSpec["auth"], sp: string,
): IphoneSpec => ({ ...s(released, chip, display, panel, port, auth, sp), url: `https://support.apple.com/kb/${sp}?locale=ja_JP` });

const TB = "Thunderbolt / USB 4" as const;
const HOME = "Touch ID（ホームボタン）" as const;
const TOP = "Touch ID（トップボタン）" as const;

export const IPAD_SPECS: Record<string, IphoneSpec> = {
  "iPad Pro 13インチ (M5)": s("2025年", "M5", 13, "有機EL", TB, "Face ID", "125407"),
  "iPad Pro 11インチ (M5)": s("2025年", "M5", 11, "有機EL", TB, "Face ID", "125406"),
  "iPad Pro 13インチ (M4)": s("2024年", "M4", 13, "有機EL", TB, "Face ID", "119891"),
  "iPad Pro 11インチ (M4)": s("2024年", "M4", 11, "有機EL", TB, "Face ID", "119892"),
  "iPad Pro 12.9インチ (第6世代)": k("2022年", "M2", 12.9, "ミニLED液晶", TB, "Face ID", "SP883"),
  "iPad Pro 11インチ (第4世代)": k("2022年", "M2", 11, "液晶", TB, "Face ID", "SP882"),
  "iPad Pro 12.9インチ (第5世代)": k("2021年", "M1", 12.9, "ミニLED液晶", TB, "Face ID", "SP844"),
  "iPad Pro 11インチ (第3世代)": k("2021年", "M1", 11, "液晶", TB, "Face ID", "SP843"),
  "iPad Pro 12.9インチ (第4世代)": k("2020年", "A12Z Bionic", 12.9, "液晶", "USB-C", "Face ID", "SP815"),
  "iPad Pro 11インチ (第2世代)": k("2020年", "A12Z Bionic", 11, "液晶", "USB-C", "Face ID", "SP814"),
  "iPad Pro 12.9インチ (第3世代)": k("2018年", "A12X Bionic", 12.9, "液晶", "USB-C", "Face ID", "SP785"),
  "iPad Pro 11インチ (第1世代)": k("2018年", "A12X Bionic", 11, "液晶", "USB-C", "Face ID", "SP784"),
  "iPad Pro 10.5インチ": k("2017年", "A10X Fusion", 10.5, "液晶", "Lightning", HOME, "SP762"),
  "iPad Pro 9.7インチ": k("2016年", "A9X", 9.7, "液晶", "Lightning", HOME, "SP739"),

  "iPad Air 13インチ (M4)": s("2026年", "M4", 13, "液晶", "USB-C", TOP, "126472"),
  "iPad Air 11インチ (M4)": s("2026年", "M4", 11, "液晶", "USB-C", TOP, "126471"),
  "iPad Air 13インチ (M3)": s("2025年", "M3", 13, "液晶", "USB-C", TOP, "122242"),
  "iPad Air 11インチ (M3)": s("2025年", "M3", 11, "液晶", "USB-C", TOP, "122241"),
  "iPad Air 13インチ (M2)": s("2024年", "M2", 13, "液晶", "USB-C", TOP, "119893"),
  "iPad Air 11インチ (M2)": s("2024年", "M2", 11, "液晶", "USB-C", TOP, "119894"),
  "iPad Air (第5世代)": k("2022年", "M1", 10.9, "液晶", "USB-C", TOP, "SP866"),
  "iPad Air (第4世代)": k("2020年", "A14 Bionic", 10.9, "液晶", "USB-C", TOP, "SP828"),
  "iPad Air (第3世代)": k("2019年", "A12 Bionic", 10.5, "液晶", "Lightning", HOME, "SP787"),

  "iPad mini (A17 Pro)": s("2024年", "A17 Pro", 8.3, "液晶", "USB-C", TOP, "121456"),
  "iPad mini (第6世代)": k("2021年", "A15 Bionic", 8.3, "液晶", "USB-C", TOP, "SP850"),
  "iPad mini (第5世代)": k("2019年", "A12 Bionic", 7.9, "液晶", "Lightning", HOME, "SP788"),

  "iPad (A16)": s("2025年", "A16", 10.86, "液晶", "USB-C", TOP, "122240"),
  "iPad (第10世代)": k("2022年", "A14 Bionic", 10.86, "液晶", "USB-C", TOP, "SP884"),
  "iPad (第9世代)": k("2021年", "A13 Bionic", 10.2, "液晶", "Lightning", HOME, "SP849"),
  "iPad (第8世代)": k("2020年", "A12 Bionic", 10.2, "液晶", "Lightning", HOME, "SP822"),
  "iPad (第7世代)": k("2019年", "A10 Fusion", 10.2, "液晶", "Lightning", HOME, "SP807"),
  "iPad (第6世代)": k("2018年", "A10 Fusion", 9.7, "液晶", "Lightning", HOME, "SP774"),
};

/**
 * iPadOS 27 に対応している機種（2026-09-29 確認）。
 * 出典: Apple「iPadOS 27 に対応している iPad のモデル」https://support.apple.com/en-gb/guide/ipad/ipad213a25b2/ipados
 * （日本語版はまだ iPadOS 26 までだったので英語版。カナダ版でも同じ一覧）
 */
export const IPADOS27_MODELS = new Set([
  "iPad Pro 13インチ (M5)", "iPad Pro 11インチ (M5)", "iPad Pro 13インチ (M4)", "iPad Pro 11インチ (M4)",
  "iPad Pro 12.9インチ (第6世代)", "iPad Pro 11インチ (第4世代)", "iPad Pro 12.9インチ (第5世代)", "iPad Pro 11インチ (第3世代)",
  "iPad Pro 12.9インチ (第4世代)", "iPad Pro 11インチ (第2世代)",
  "iPad Air 13インチ (M4)", "iPad Air 11インチ (M4)", "iPad Air 13インチ (M3)", "iPad Air 11インチ (M3)",
  "iPad Air 13インチ (M2)", "iPad Air 11インチ (M2)", "iPad Air (第5世代)", "iPad Air (第4世代)",
  "iPad mini (A17 Pro)", "iPad mini (第6世代)",
  "iPad (A16)", "iPad (第10世代)", "iPad (第9世代)",
]);
