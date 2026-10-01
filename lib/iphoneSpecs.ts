/**
 * iPhone の基本スペック（機種ページの「基本スペック」・紹介文、比較ページの「スペックの違い」）。
 * 2026-09-28 に Apple 公式で裏どりした:
 *   - 発売年・画面サイズ・端子・Touch ID/Face ID … 「iPhone のモデルを識別する」https://support.apple.com/ja-jp/108044
 *   - チップ・画面の種類・コネクタ … 各機種の技術仕様（https://support.apple.com/ja-jp/<specId>）
 * 発売「月」は Apple のサポートページに無いので載せない（年まで）。
 * 機種を足すときは、上の2ページで確かめてから specId と一緒に足す。載っていない機種はページ側で表示を省く
 */
import { IPAD_SPECS } from "@/lib/ipadSpecs";
import { PIXEL_SPECS } from "@/lib/pixelSpecs";
import { GALAXY_SPECS } from "@/lib/galaxySpecs";

export type IphoneSpec = {
  /** 発売年（Apple の「モデルを識別する」の発売年）。"2021年"。Pixel は販売開始の年月（"2024年8月"） */
  released: string;
  chip: string;
  /** 画面サイズ（インチ）。折りたたみは外側 */
  display: number;
  /** 折りたたみの内側の画面（インチ）。Pixel Fold 系 */
  displayInner?: number;
  /**
   * 画面の種類（Super Retina / XDR・OLED ＝ 有機EL、Liquid Retina・Retina HD ＝ 液晶）。
   * iPad Pro の Liquid Retina XDR（12.9インチ 第5/6世代）はミニLEDバックライトの液晶
   */
  panel: "有機EL" | "液晶" | "ミニLED液晶";
  port: "Lightning" | "USB-C" | "Thunderbolt / USB 4";
  /** iPad は Touch ID の位置（ホームボタン／トップボタン）まで書く。Pixel は「指紋（画面内）・顔認証」など（lib/pixelSpecs.ts） */
  auth: "Face ID" | "Touch ID" | "Touch ID（ホームボタン）" | "Touch ID（トップボタン）" | (string & {});
  /** Apple の技術仕様ページの番号 */
  specId: string;
  /** 番号でなく古い形式（support.apple.com/kb/SPxxx）のページや、Apple 以外の出典のとき、その URL */
  url?: string;
  /** Apple 以外の出典の名前（例: Google「Pixel スマートフォンのハードウェア技術仕様」）。無ければ Apple の技術仕様 */
  source?: string;
  /** 一部の項目だけ別のページで確かめたときの、その出典（Galaxy の生体認証） */
  extraSource?: { name: string; url: string };
};

const s = (
  released: string, chip: string, display: number, panel: IphoneSpec["panel"],
  port: IphoneSpec["port"], auth: IphoneSpec["auth"], specId: string,
): IphoneSpec => ({ released, chip, display, panel, port, auth, specId });

export const IPHONE_SPECS: Record<string, IphoneSpec> = {
  "iPhone 18 Pro": s("2026年", "A20 Pro", 6.3, "有機EL", "USB-C", "Face ID", "148590"),
  "iPhone 18 Pro Max": s("2026年", "A20 Pro", 6.9, "有機EL", "USB-C", "Face ID", "148591"),
  "iPhone 17e": s("2026年", "A19", 6.1, "有機EL", "USB-C", "Face ID", "126470"),
  "iPhone 17": s("2025年", "A19", 6.3, "有機EL", "USB-C", "Face ID", "125089"),
  "iPhone Air": s("2025年", "A19 Pro", 6.5, "有機EL", "USB-C", "Face ID", "125092"),
  "iPhone 17 Pro": s("2025年", "A19 Pro", 6.3, "有機EL", "USB-C", "Face ID", "125090"),
  "iPhone 17 Pro Max": s("2025年", "A19 Pro", 6.9, "有機EL", "USB-C", "Face ID", "125091"),
  "iPhone 16e": s("2025年", "A18", 6.1, "有機EL", "USB-C", "Face ID", "122208"),
  "iPhone 16": s("2024年", "A18", 6.1, "有機EL", "USB-C", "Face ID", "121029"),
  "iPhone 16 Plus": s("2024年", "A18", 6.7, "有機EL", "USB-C", "Face ID", "121030"),
  "iPhone 16 Pro": s("2024年", "A18 Pro", 6.3, "有機EL", "USB-C", "Face ID", "121031"),
  "iPhone 16 Pro Max": s("2024年", "A18 Pro", 6.9, "有機EL", "USB-C", "Face ID", "121032"),
  "iPhone 15": s("2023年", "A16 Bionic", 6.1, "有機EL", "USB-C", "Face ID", "111831"),
  "iPhone 15 Plus": s("2023年", "A16 Bionic", 6.7, "有機EL", "USB-C", "Face ID", "111830"),
  "iPhone 15 Pro": s("2023年", "A17 Pro", 6.1, "有機EL", "USB-C", "Face ID", "111829"),
  "iPhone 15 Pro Max": s("2023年", "A17 Pro", 6.7, "有機EL", "USB-C", "Face ID", "111828"),
  "iPhone 14": s("2022年", "A15 Bionic", 6.1, "有機EL", "Lightning", "Face ID", "111850"),
  "iPhone 14 Plus": s("2022年", "A15 Bionic", 6.7, "有機EL", "Lightning", "Face ID", "111854"),
  "iPhone 14 Pro": s("2022年", "A16 Bionic", 6.1, "有機EL", "Lightning", "Face ID", "111849"),
  "iPhone 14 Pro Max": s("2022年", "A16 Bionic", 6.7, "有機EL", "Lightning", "Face ID", "111846"),
  "iPhone 13": s("2021年", "A15 Bionic", 6.1, "有機EL", "Lightning", "Face ID", "111872"),
  "iPhone 13 mini": s("2021年", "A15 Bionic", 5.4, "有機EL", "Lightning", "Face ID", "111873"),
  "iPhone 13 Pro": s("2021年", "A15 Bionic", 6.1, "有機EL", "Lightning", "Face ID", "111871"),
  "iPhone 13 Pro Max": s("2021年", "A15 Bionic", 6.7, "有機EL", "Lightning", "Face ID", "111870"),
  "iPhone 12": s("2020年", "A14 Bionic", 6.1, "有機EL", "Lightning", "Face ID", "111876"),
  "iPhone 12 mini": s("2020年", "A14 Bionic", 5.4, "有機EL", "Lightning", "Face ID", "111877"),
  "iPhone 12 Pro": s("2020年", "A14 Bionic", 6.1, "有機EL", "Lightning", "Face ID", "111875"),
  "iPhone 12 Pro Max": s("2020年", "A14 Bionic", 6.7, "有機EL", "Lightning", "Face ID", "111874"),
  "iPhone 11": s("2019年", "A13 Bionic", 6.1, "液晶", "Lightning", "Face ID", "111865"),
  "iPhone 11 Pro": s("2019年", "A13 Bionic", 5.8, "有機EL", "Lightning", "Face ID", "111879"),
  "iPhone 11 Pro Max": s("2019年", "A13 Bionic", 6.5, "有機EL", "Lightning", "Face ID", "111878"),
  "iPhone SE (第3世代)": s("2022年", "A15 Bionic", 4.7, "液晶", "Lightning", "Touch ID", "111866"),
  "iPhone SE (第2世代)": s("2020年", "A13 Bionic", 4.7, "液晶", "Lightning", "Touch ID", "111882"),
  "iPhone XS": s("2018年", "A12 Bionic", 5.8, "有機EL", "Lightning", "Face ID", "111881"),
  "iPhone XS Max": s("2018年", "A12 Bionic", 6.5, "有機EL", "Lightning", "Face ID", "111880"),
  "iPhone XR": s("2018年", "A12 Bionic", 6.1, "液晶", "Lightning", "Face ID", "111868"),
  "iPhone X": s("2017年", "A11 Bionic", 5.8, "有機EL", "Lightning", "Face ID", "111864"),
  "iPhone 8": s("2017年", "A11 Bionic", 4.7, "液晶", "Lightning", "Touch ID", "111976"),
  "iPhone 8 Plus": s("2017年", "A11 Bionic", 5.5, "液晶", "Lightning", "Touch ID", "111950"),
  "iPhone 7": s("2016年", "A10 Fusion", 4.7, "液晶", "Lightning", "Touch ID", "111943"),
  "iPhone 7 Plus": s("2016年", "A10 Fusion", 5.5, "液晶", "Lightning", "Touch ID", "111953"),
};

/** iPhone・iPad（`lib/ipadSpecs.ts`）・Pixel（`lib/pixelSpecs.ts`）・Galaxy（`lib/galaxySpecs.ts`）のスペック。載っていない機種は undefined */
export const specOf = (model: string): IphoneSpec | undefined =>
  IPHONE_SPECS[model] ?? IPAD_SPECS[model] ?? PIXEL_SPECS[model] ?? GALAXY_SPECS[model];

/** 画面の表記（折りたたみは外側・内側） */
export const displayText = (s: IphoneSpec) =>
  s.displayInner ? `外側${s.display}インチ・内側${s.displayInner}インチ ${s.panel}` : `${s.display}インチ ${s.panel}`;

/** 出典の名前（リンクの文言） */
export const specSourceName = (s: IphoneSpec, model: string) => s.source ?? `Apple「${model} - 技術仕様」`;

/** Apple の技術仕様ページ（出典） */
export const specUrl = (spec: IphoneSpec) => spec.url ?? `https://support.apple.com/ja-jp/${spec.specId}`;

/** 表に並べる項目（比較ページ・機種ページで共有） */
export const SPEC_ROWS: { label: string; value: (s: IphoneSpec) => string }[] = [
  { label: "発売", value: (s) => s.released },
  { label: "チップ", value: (s) => s.chip },
  { label: "画面", value: displayText },
  { label: "充電端子", value: (s) => s.port },
  { label: "生体認証", value: (s) => s.auth },
];
