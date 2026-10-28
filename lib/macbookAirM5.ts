/**
 * MacBook Air 13インチ M5 の Apple 公式の新品価格（ショート mbpvsair・横動画 2026-11-01-mbp-vs-mba の「新品どうし」の比較用）。
 * 形は lib/macbookProM6.ts と同じ。値は Apple 公式で確かめたものだけ:
 *   価格 https://www.apple.com/jp/shop/buy-mac/macbook-air （購入ページの HTML の "amount"。10/29 に 224,800・242,800・264,800円を確認）
 *   構成 https://www.apple.com/jp/macbook-air/specs/ （13インチ: 10コアCPU・8コアGPU・16GB・512GB／10コアGPU・16GB・1TB。1TB 以上は 10コアGPU）
 * Pro 14インチ M6（16GB・1TB 339,800円）と同じメモリ・SSD で比べるのは 13インチの 16GB・1TB。
 */
export const MBA_M5_CHECKED = "2026-10-29";
export const MBA_M5_NAME = "MacBook Air 13インチ M5";
/** 13インチ M5（10コアGPU）16GB・1TB の価格（税込） */
export const MBA_M5_PRICE_1TB = 242800;
/** 13インチ M5（8コアGPU）16GB・512GB の価格（税込・いちばん安い構成） */
export const MBA_M5_PRICE_512 = 224800;
export const MBA_M5_MEMORY_GB = 16;
export const MBA_M5_PRICE_SOURCE = "https://www.apple.com/jp/shop/buy-mac/macbook-air";
export const MBA_M5_SPEC_SOURCE = "https://www.apple.com/jp/macbook-air/specs/";

/**
 * 中古で比べる2機種の仕様（Apple サポートの技術仕様）。
 * MacBook Air（M2, 2022）https://support.apple.com/ja-jp/111867 ・MacBook Pro（14インチ, 2021）https://support.apple.com/ja-jp/111902
 */
export const MBA_M2_VS_MBP_M1PRO = {
  air: { weight: "1.24kg", display: "500ニト", ports: "Thunderbolt 2つ" },
  pro: { weight: "1.6kg", display: "XDR・最大120Hz", ports: "Thunderbolt 3つ・HDMI・SD" },
} as const;
