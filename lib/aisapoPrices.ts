/**
 * iPhone 修理アイサポ（非正規の修理店・A8 で提携中）のバッテリー交換の料金。/iphone/battery の「非正規ならこれだけ」で使う（2026-10-31〜）。
 * アイサポの公式の料金表（下の URL）で確かめた値だけを載せる。表は新宿本店の料金で、店によって違う（ページの注記）。
 * 料金ページ（/pay/）の表記は税込。表にない機種（17 シリーズ・Air など）は出さない。毎月1日の出典見直しで確認し直す
 */
export const AISAPO_CHECKED = "2026-10-31";
export const AISAPO_SOURCE = "https://www.iphone-support.jp/case/battry/";

const BATTERY: Record<string, number> = {
  "iPhone 16 Pro Max": 10980,
  "iPhone 16 Pro": 9980,
  "iPhone 16 Plus": 9980,
  "iPhone 16": 9980,
  "iPhone 16e": 8980,
  "iPhone 15 Pro Max": 8980,
  "iPhone 15 Pro": 8980,
  "iPhone 15 Plus": 8980,
  "iPhone 15": 8980,
  "iPhone 14 Pro Max": 8480,
  "iPhone 14 Pro": 8480,
  "iPhone 14 Plus": 7980,
  "iPhone 14": 7980,
  "iPhone 13 Pro Max": 6980,
  "iPhone 13 Pro": 6480,
  "iPhone 13": 6480,
  "iPhone 13 mini": 6480,
  "iPhone 12 Pro Max": 5480,
  "iPhone 12 Pro": 5480,
  "iPhone 12": 5480,
  "iPhone 12 mini": 5480,
  "iPhone 11": 5480,
  "iPhone XR": 4480,
  "iPhone SE (第3世代)": 3980,
  "iPhone SE (第2世代)": 3980,
};

/** その機種のアイサポのバッテリー交換の料金（新宿本店・税込）。載っていなければ null */
export const aisapoBattery = (model: string): number | null => BATTERY[model] ?? null;
