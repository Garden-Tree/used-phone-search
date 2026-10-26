/**
 * 新しい iPad mini（A20 Pro・2026/10/27 発表・11/6 発売）の Apple 公式の値（X・ショート・横動画の「新型と中古の旧型」の比較用）。
 * まだ中古の在庫がないので catalog には入れていない（中古が出たら lib/ipadCatalog.ts・ipadSpecs.ts へ）。
 * 値は Apple 公式で 10/27 に確かめたものだけ:
 *   価格 https://www.apple.com/jp/shop/buy-ipad/ipad-mini （Wi-Fi・標準ガラス。日本の表示は総額＝税込）
 *   仕様 https://www.apple.com/jp/ipad-mini/specs/ ・旧型 A17 Pro は https://support.apple.com/ja-jp/121456
 * Apple の販売一覧に A17 Pro はもうない（10/27・buy-ipad/ipad-mini は A20 Pro だけ）。
 */
export const IPAD_MINI_A20_CHECKED = "2026-10-27";
export const IPAD_MINI_A20_NAME = "iPad mini (A20 Pro)";
export const IPAD_MINI_A20_RELEASE = "2026-11-06";
export const IPAD_MINI_A20_PRICE_SOURCE = "https://www.apple.com/jp/shop/buy-ipad/ipad-mini";

/** Wi-Fi・標準ガラスの価格（円）。セルラーは +25,000円、Nano-texture は 256GB・512GB だけで +17,000円 */
export const IPAD_MINI_A20_PRICES: Record<number, number> = { 128: 119800, 256: 136800, 512: 171800 };

/** 比べる項目（新型 A20 Pro と旧型 A17 Pro。どちらも公式の仕様のページの値） */
export const IPAD_MINI_COMPARE = [
  { label: "画面", a20: "8.5インチ 有機EL", a17: "8.3インチ 液晶" },
  { label: "重さ（Wi-Fi）", a20: "255g", a17: "293g" },
  { label: "厚さ", a20: "5.4mm", a17: "6.3mm" },
  { label: "防水・防塵", a20: "IP67", a17: "記載なし" },
  { label: "チップ", a20: "A20 Pro", a17: "A17 Pro" },
  { label: "Apple Pencil", a20: "Pro・USB-C", a17: "Pro・USB-C" },
  { label: "電池（Wi-Fi・動画）", a20: "最大10時間", a17: "最大10時間" },
] as const;
