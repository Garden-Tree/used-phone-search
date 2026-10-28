/**
 * PROLED XDR ディスプレイ搭載 MacBook Pro 14インチ（2026/10/28 発表・11/6 発売）の Apple 公式の値（ショート mbpproled・横動画 2026-10-31-mbp-proled の比較用）。
 * まだ中古の在庫がないので catalog には入れていない（中古が出たら lib/macCatalog.ts へ）。
 * 値は Apple 公式で 10/29 に確かめたものだけ（ideas/2026-10-29-macbook-pro-proled.md）:
 *   価格・発売日 https://www.apple.com/jp/newsroom/2026/10/apple-unveils-groundbreaking-macbook-pro-with-proled-xdr-display/
 *   構成 https://www.apple.com/jp/shop/buy-mac/macbook-pro-proled-xdr （14インチ M5 Pro 15/16 は 24GB・1TB〜）
 *   仕様 https://www.apple.com/jp/macbook-pro/proled-xdr-display/specs/ （今のミニLED と M6 は https://www.apple.com/jp/macbook-pro/specs/）
 * 今のミニLED の 14インチ M5 Pro は併売・値下げなし。M6 の値は lib/macbookProM6.ts。
 */
export const MBP_PROLED_CHECKED = "2026-10-29";
export const MBP_PROLED_NAME = "PROLED XDR ディスプレイ搭載 MacBook Pro 14インチ M5 Pro";
export const MBP_PROLED_RELEASE = "2026-11-06";
/** 14インチ M5 Pro（15コア CPU・16コア GPU）のいちばん安い構成（24GB・1TB）の価格（税込） */
export const MBP_PROLED_PRICE = 499800;
/** 今のミニLED の 14インチ M5 Pro（同じ 24GB・1TB）の価格（税込・併売） */
export const MBP_MINILED_PRICE = 429800;
/**
 * 新型 M6 14インチを同じ 24GB・1TB にした構成の価格（税込・標準ディスプレイ・型番 MHWU4J/A）。
 * 4つを同じメモリ・SSD で比べるため（M6 のいちばん安い構成は 16GB・1TB の 339,800円＝lib/macbookProM6.ts）。
 * 出典: Apple 日本の購入ページ（構成ごとのページの商品データ "price":375800）10/29 確認
 */
export const MBP_M6_24GB_PRICE = 375800;
export const MBP_M6_24GB_SOURCE = "https://www.apple.com/jp/shop/buy-mac/macbook-pro/14インチ-space-black-標準ディスプレイ-apple-m6-チップ-12コアcpu-12コアgpu-24gb-のメモリ-1tb-のストレージ";
export const MBP_PROLED_MEMORY_GB = 24;
export const MBP_PROLED_STORAGE_GB = 1024;
export const MBP_PROLED_PRICE_SOURCE = "https://www.apple.com/jp/newsroom/2026/10/apple-unveils-groundbreaking-macbook-pro-with-proled-xdr-display/";
export const MBP_PROLED_BUY_SOURCE = "https://www.apple.com/jp/shop/buy-mac/macbook-pro-proled-xdr";
export const MBP_PROLED_SPEC_SOURCE = "https://www.apple.com/jp/macbook-pro/proled-xdr-display/specs/";

/**
 * 比べる項目（PROLED 14インチ M5 Pro・新型 M6 14インチ・今のミニLED 14インチ M5 Pro。公式の仕様のページの値）。
 * 重さ: PROLED 1.38kg（M5 Pro）・M6 1.55kg（lib/macbookProM6.ts）・ミニLED M5 Pro 1.60kg（MBP_M5_PRO_SPEC）
 */
export const MBP_PROLED_COMPARE = [
  { label: "チップ", proled: "M5 Pro", m6: "M6", miniled: "M5 Pro" },
  { label: "画面", proled: "有機EL・タッチ", m6: "ミニLED", miniled: "ミニLED" },
  { label: "重さ", proled: "1.38kg", m6: "1.55kg", miniled: "1.60kg" },
] as const;
