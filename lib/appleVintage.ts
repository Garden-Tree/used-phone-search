/**
 * Apple の修理を受けられる期間（ビンテージ製品・オブソリート製品）。iPhone だけ。
 * 出典: Apple「ビンテージ製品とオブソリート製品」https://support.apple.com/ja-jp/102772 （ページの公開日 2026/10/19・10/28 に開いて確認）
 *   - Apple が販売店への供給をやめた日から最低5年は修理・部品を受けられる。部品の在庫しだいで最長7年
 *   - ビンテージ製品＝供給をやめてから5年以上7年未満。オブソリート製品＝7年以上（ハードウェア修理なし）
 *   - 一覧にない機種＝まだ供給中か、やめてから5年未満（修理を受けられる期間）
 * 一覧は Apple が更新する。毎月1日に開き直す（STATE の確認台帳）。
 */
export const APPLE_VINTAGE_SOURCE = "https://support.apple.com/ja-jp/102772";
export const APPLE_VINTAGE_CHECKED = "2026-10-28";

export type RepairStatus = "service" | "vintage" | "obsolete";

/** ページに載っている機種だけ。iPhone 8・8 Plus は 64／128／256GB がビンテージで、(PRODUCT)RED はオブソリート */
const STATUS: Record<string, { status: RepairStatus; note?: string }> = {
  "iPhone X": { status: "obsolete" },
  "iPhone XS": { status: "vintage" },
  "iPhone XS Max": { status: "vintage" },
  "iPhone 11 Pro": { status: "vintage" },
  "iPhone 11 Pro Max": { status: "vintage" },
  "iPhone 8": { status: "vintage", note: "(PRODUCT)RED はオブソリート" },
  "iPhone 8 Plus": { status: "vintage", note: "(PRODUCT)RED はオブソリート" },
  "iPhone 7": { status: "vintage" },
  "iPhone 7 Plus": { status: "vintage" },
};

export const repairStatus = (model: string): { status: RepairStatus; note?: string } => STATUS[model] ?? { status: "service" };

export const REPAIR_STATUS_LABEL: Record<RepairStatus, string> = {
  service: "受けられる",
  vintage: "部品があれば",
  obsolete: "受けられない",
};

/** 文の中で使う説明（「Apple の修理は〜」に続ける） */
export const REPAIR_STATUS_TEXT: Record<RepairStatus, string> = {
  service: "受けられる期間です（ビンテージ製品・オブソリート製品の一覧にない）",
  vintage: "部品の在庫があるときだけ受けられます（ビンテージ製品）",
  obsolete: "受けられません（オブソリート製品）",
};
