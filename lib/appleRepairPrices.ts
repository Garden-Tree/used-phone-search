/**
 * iPhone の Apple 公式の保証対象外修理の料金（日本・税込）。電池（バッテリー修理）と画面（画面の損傷）だけ。
 * Apple サポートの修理ページ（下の URL）の料金表で確かめた値だけを載せる。毎月1日の出典見直しで確認し直す。
 * 料金表はページの読み込み後に Apple の API（/ols/api/pricing/products/services/pricing-estimate?locale=ja-jp&pricing_type=OOW）
 * から出るので、その応答（ページに出る表と同じもの）で確かめた。AppleCare+ の料金は載せない。
 * 載っていない機種（Apple の表にない iPhone 11 Pro・XS など）は出さない。
 */
export const APPLE_REPAIR_CHECKED = "2026-10-21";

export const APPLE_REPAIR_SOURCE = {
  battery: "https://support.apple.com/ja-jp/iphone/repair/battery-replacement",
  screen: "https://support.apple.com/ja-jp/iphone/repair/screen-replacement",
} as const;

/** [電池, 画面]（円・税込） */
const REPAIR: Record<string, [battery: number, screen: number]> = {
  "iPhone 18 Pro Max": [22800, 64800],
  "iPhone 18 Pro": [22800, 57800],
  "iPhone Air": [21000, 57800],
  "iPhone 17 Pro Max": [21000, 64800],
  "iPhone 17 Pro": [21000, 57800],
  "iPhone 17": [17200, 57800],
  "iPhone 17e": [17200, 41800],
  "iPhone 16 Pro Max": [21000, 64800],
  "iPhone 16 Pro": [21000, 57800],
  "iPhone 16 Plus": [17200, 57800],
  "iPhone 16": [17200, 45800],
  "iPhone 16e": [17200, 41800],
  "iPhone 15 Pro Max": [17200, 64800],
  "iPhone 15 Pro": [17200, 57800],
  "iPhone 15 Plus": [17200, 57800],
  "iPhone 15": [17200, 45800],
  "iPhone 14 Pro Max": [17200, 64800],
  "iPhone 14 Pro": [17200, 57800],
  "iPhone 14 Plus": [17200, 57800],
  "iPhone 14": [17200, 45800],
  "iPhone 13 Pro Max": [15600, 57800],
  "iPhone 13 Pro": [15600, 45800],
  "iPhone 13": [15600, 45800],
  "iPhone 13 mini": [15600, 37800],
  "iPhone 12 Pro Max": [15600, 57800],
  "iPhone 12 Pro": [15600, 45800],
  "iPhone 12": [15600, 45800],
  "iPhone 12 mini": [15600, 37800],
  "iPhone 11": [15600, 30800],
  "iPhone XR": [15600, 30800],
  "iPhone SE (第3世代)": [12000, 20800],
  "iPhone SE (第2世代)": [12000, 20800],
};

export type AppleRepair = { battery: number; screen: number };

/** その機種の公式の修理料金。載っていなければ null */
export function appleRepair(model: string): AppleRepair | null {
  const r = REPAIR[model];
  return r ? { battery: r[0], screen: r[1] } : null;
}

/** 確認日の表示（例: 2026年10月21日） */
export const appleRepairCheckedJa = (): string => {
  const [y, m, d] = APPLE_REPAIR_CHECKED.split("-").map(Number);
  return `${y}年${m}月${d}日`;
};
