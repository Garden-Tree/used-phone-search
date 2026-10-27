/**
 * 新しい MacBook Pro 14インチ（M6・2026/10/27 発表・11/6 発売）の Apple 公式の値（ショート・X の「新型と中古の旧型」の比較用）。
 * まだ中古の在庫がないので catalog には入れていない（中古が出たら lib/macCatalog.ts へ）。
 * 値は Apple 公式で 10/28 に確かめたものだけ:
 *   価格 https://www.apple.com/jp/newsroom/2026/10/apple-introduces-the-new-14-inch-macbook-pro-with-m6/ （339,800円〜・税込）
 *   構成 https://www.apple.com/jp/shop/buy-mac/macbook-pro （M6 は SSD 1TB・メモリ 16GB／24GB／32GB）
 *   仕様 https://www.apple.com/jp/macbook-pro/specs/ ・旧型 M4 は https://support.apple.com/ja-jp/121552
 * Apple の販売一覧に 14インチ M5（無印）はもうない（10/28）。
 */
export const MBP_M6_CHECKED = "2026-10-28";
export const MBP_M6_NAME = "MacBook Pro 14インチ M6";
export const MBP_M6_RELEASE = "2026-11-06";
/** いちばん安い構成（16GB・1TB）の価格（税込） */
export const MBP_M6_PRICE = 339800;
export const MBP_M6_MEMORY_GB = 16;
export const MBP_M6_STORAGE_GB = 1024;
export const MBP_M6_PRICE_SOURCE = "https://www.apple.com/jp/newsroom/2026/10/apple-introduces-the-new-14-inch-macbook-pro-with-m6/";

/** 比べる項目（新型 M6 と旧型 M4。どちらも公式の仕様のページの値）。電池（動画 最大24時間）と重さ（1.55kg）は同じ */
export const MBP_M6_COMPARE = [
  { label: "CPU", m6: "12コア", m4: "10コア" },
  { label: "GPU", m6: "12コア", m4: "10コア" },
  { label: "Wi-Fi", m6: "Wi-Fi 7", m4: "Wi-Fi 6E" },
  { label: "電池（動画）", m6: "最大24時間", m4: "最大24時間" },
  { label: "重さ", m6: "1.55kg", m4: "1.55kg" },
] as const;
