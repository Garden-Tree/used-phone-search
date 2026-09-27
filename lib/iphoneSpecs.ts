/**
 * iPhone の基本スペック（機種ページの「基本スペック」・紹介文、比較ページの「スペックの違い」）。
 * Apple の公式発表に基づく。確かめられていない機種（iPhone 17e・18 Pro 系など）は載せない（ページ側で表示を省く）。
 * 機種を足すときは Apple の技術仕様ページ（support.apple.com/ja-jp/specs）で確かめてから
 */

export type IphoneSpec = {
  /** 発売（日本）。"2021年9月" */
  released: string;
  chip: string;
  /** 画面サイズ（インチ） */
  display: number;
  /** 画面の種類 */
  panel: "有機EL" | "液晶";
  port: "Lightning" | "USB-C";
  auth: "Face ID" | "Touch ID";
};

const s = (released: string, chip: string, display: number, panel: IphoneSpec["panel"], port: IphoneSpec["port"], auth: IphoneSpec["auth"]): IphoneSpec =>
  ({ released, chip, display, panel, port, auth });

export const IPHONE_SPECS: Record<string, IphoneSpec> = {
  "iPhone 17": s("2025年9月", "A19", 6.3, "有機EL", "USB-C", "Face ID"),
  "iPhone Air": s("2025年9月", "A19 Pro", 6.5, "有機EL", "USB-C", "Face ID"),
  "iPhone 17 Pro": s("2025年9月", "A19 Pro", 6.3, "有機EL", "USB-C", "Face ID"),
  "iPhone 17 Pro Max": s("2025年9月", "A19 Pro", 6.9, "有機EL", "USB-C", "Face ID"),
  "iPhone 16e": s("2025年2月", "A18", 6.1, "有機EL", "USB-C", "Face ID"),
  "iPhone 16": s("2024年9月", "A18", 6.1, "有機EL", "USB-C", "Face ID"),
  "iPhone 16 Plus": s("2024年9月", "A18", 6.7, "有機EL", "USB-C", "Face ID"),
  "iPhone 16 Pro": s("2024年9月", "A18 Pro", 6.3, "有機EL", "USB-C", "Face ID"),
  "iPhone 16 Pro Max": s("2024年9月", "A18 Pro", 6.9, "有機EL", "USB-C", "Face ID"),
  "iPhone 15": s("2023年9月", "A16 Bionic", 6.1, "有機EL", "USB-C", "Face ID"),
  "iPhone 15 Plus": s("2023年9月", "A16 Bionic", 6.7, "有機EL", "USB-C", "Face ID"),
  "iPhone 15 Pro": s("2023年9月", "A17 Pro", 6.1, "有機EL", "USB-C", "Face ID"),
  "iPhone 15 Pro Max": s("2023年9月", "A17 Pro", 6.7, "有機EL", "USB-C", "Face ID"),
  "iPhone 14": s("2022年9月", "A15 Bionic", 6.1, "有機EL", "Lightning", "Face ID"),
  "iPhone 14 Plus": s("2022年10月", "A15 Bionic", 6.7, "有機EL", "Lightning", "Face ID"),
  "iPhone 14 Pro": s("2022年9月", "A16 Bionic", 6.1, "有機EL", "Lightning", "Face ID"),
  "iPhone 14 Pro Max": s("2022年9月", "A16 Bionic", 6.7, "有機EL", "Lightning", "Face ID"),
  "iPhone 13": s("2021年9月", "A15 Bionic", 6.1, "有機EL", "Lightning", "Face ID"),
  "iPhone 13 mini": s("2021年9月", "A15 Bionic", 5.4, "有機EL", "Lightning", "Face ID"),
  "iPhone 13 Pro": s("2021年9月", "A15 Bionic", 6.1, "有機EL", "Lightning", "Face ID"),
  "iPhone 13 Pro Max": s("2021年9月", "A15 Bionic", 6.7, "有機EL", "Lightning", "Face ID"),
  "iPhone 12": s("2020年10月", "A14 Bionic", 6.1, "有機EL", "Lightning", "Face ID"),
  "iPhone 12 mini": s("2020年11月", "A14 Bionic", 5.4, "有機EL", "Lightning", "Face ID"),
  "iPhone 12 Pro": s("2020年10月", "A14 Bionic", 6.1, "有機EL", "Lightning", "Face ID"),
  "iPhone 12 Pro Max": s("2020年11月", "A14 Bionic", 6.7, "有機EL", "Lightning", "Face ID"),
  "iPhone 11": s("2019年9月", "A13 Bionic", 6.1, "液晶", "Lightning", "Face ID"),
  "iPhone 11 Pro": s("2019年9月", "A13 Bionic", 5.8, "有機EL", "Lightning", "Face ID"),
  "iPhone 11 Pro Max": s("2019年9月", "A13 Bionic", 6.5, "有機EL", "Lightning", "Face ID"),
  "iPhone SE (第3世代)": s("2022年3月", "A15 Bionic", 4.7, "液晶", "Lightning", "Touch ID"),
  "iPhone SE (第2世代)": s("2020年4月", "A13 Bionic", 4.7, "液晶", "Lightning", "Touch ID"),
  "iPhone XS": s("2018年9月", "A12 Bionic", 5.8, "有機EL", "Lightning", "Face ID"),
  "iPhone XS Max": s("2018年9月", "A12 Bionic", 6.5, "有機EL", "Lightning", "Face ID"),
  "iPhone XR": s("2018年10月", "A12 Bionic", 6.1, "液晶", "Lightning", "Face ID"),
  "iPhone X": s("2017年11月", "A11 Bionic", 5.8, "有機EL", "Lightning", "Face ID"),
  "iPhone 8": s("2017年9月", "A11 Bionic", 4.7, "液晶", "Lightning", "Touch ID"),
  "iPhone 8 Plus": s("2017年9月", "A11 Bionic", 5.5, "液晶", "Lightning", "Touch ID"),
  "iPhone 7": s("2016年9月", "A10 Fusion", 4.7, "液晶", "Lightning", "Touch ID"),
  "iPhone 7 Plus": s("2016年9月", "A10 Fusion", 5.5, "液晶", "Lightning", "Touch ID"),
};

export const specOf = (model: string): IphoneSpec | undefined => IPHONE_SPECS[model];

/** 表に並べる項目（比較ページ・機種ページで共有） */
export const SPEC_ROWS: { label: string; value: (s: IphoneSpec) => string }[] = [
  { label: "発売", value: (s) => s.released },
  { label: "チップ", value: (s) => s.chip },
  { label: "画面", value: (s) => `${s.display}インチ ${s.panel}` },
  { label: "充電端子", value: (s) => s.port },
  { label: "生体認証", value: (s) => s.auth },
];
