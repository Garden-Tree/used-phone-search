/**
 * iPad ごとの対応する Apple Pencil。Apple 公式「Apple Pencil の互換性」（下の URL・ページの公開日 2026/03/31）で確かめた値だけ。
 * 名前は lib/ipadCatalog.ts の機種名。毎月1日の出典見直しで確認し直す。
 */
export const IPAD_PENCIL_CHECKED = "2026-10-21";
export const IPAD_PENCIL_SOURCE = "https://support.apple.com/ja-jp/108937";

export type Pencil = "Pro" | "USB-C" | "第2世代" | "第1世代";

/** 表示順（新しい順） */
export const PENCIL_ORDER: Pencil[] = ["Pro", "USB-C", "第2世代", "第1世代"];

const PRO_USBC: Pencil[] = ["Pro", "USB-C"];
const USBC_2ND: Pencil[] = ["USB-C", "第2世代"];

const PENCIL: Record<string, Pencil[]> = {
  "iPad Pro 13インチ (M5)": PRO_USBC,
  "iPad Pro 11インチ (M5)": PRO_USBC,
  "iPad Pro 13インチ (M4)": PRO_USBC,
  "iPad Pro 11インチ (M4)": PRO_USBC,
  "iPad Pro 12.9インチ (第6世代)": USBC_2ND,
  "iPad Pro 12.9インチ (第5世代)": USBC_2ND,
  "iPad Pro 12.9インチ (第4世代)": USBC_2ND,
  "iPad Pro 12.9インチ (第3世代)": USBC_2ND,
  "iPad Pro 11インチ (第4世代)": USBC_2ND,
  "iPad Pro 11インチ (第3世代)": USBC_2ND,
  "iPad Pro 11インチ (第2世代)": USBC_2ND,
  "iPad Pro 11インチ (第1世代)": USBC_2ND,
  "iPad Pro 10.5インチ": ["第1世代"],
  "iPad Pro 9.7インチ": ["第1世代"],
  "iPad Air 13インチ (M4)": PRO_USBC,
  "iPad Air 11インチ (M4)": PRO_USBC,
  "iPad Air 13インチ (M3)": PRO_USBC,
  "iPad Air 11インチ (M3)": PRO_USBC,
  "iPad Air 13インチ (M2)": PRO_USBC,
  "iPad Air 11インチ (M2)": PRO_USBC,
  "iPad Air (第5世代)": USBC_2ND,
  "iPad Air (第4世代)": USBC_2ND,
  "iPad Air (第3世代)": ["第1世代"],
  "iPad mini (A17 Pro)": PRO_USBC,
  "iPad mini (第6世代)": USBC_2ND,
  "iPad mini (第5世代)": ["第1世代"],
  "iPad (A16)": ["USB-C", "第1世代"],
  "iPad (第10世代)": ["USB-C", "第1世代"],
  "iPad (第9世代)": ["第1世代"],
  "iPad (第8世代)": ["第1世代"],
  "iPad (第7世代)": ["第1世代"],
  "iPad (第6世代)": ["第1世代"],
};

/** 第1世代を使うのに USB-C - Apple Pencil アダプタが要る機種（公式の注記 *） */
const NEEDS_ADAPTER = new Set(["iPad (A16)", "iPad (第10世代)"]);

/** その iPad で使える Apple Pencil（新しい順）。載っていなければ空 */
export const pencilsFor = (model: string): Pencil[] =>
  PENCIL_ORDER.filter((p) => PENCIL[model]?.includes(p));

export const pencilNeedsAdapter = (model: string): boolean => NEEDS_ADAPTER.has(model);

export const ipadPencilCheckedJa = (): string => {
  const [y, m, d] = IPAD_PENCIL_CHECKED.split("-").map(Number);
  return `${y}年${m}月${d}日`;
};
