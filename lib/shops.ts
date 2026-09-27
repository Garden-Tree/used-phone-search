/**
 * 比較対象のショップの一覧（表示順）。店名・店の数を書く場所はここだけにする。
 * トップの在庫数・絞り込み・OG 画像・各ページの説明文はここから作る。
 * クライアントコンポーネント（絞り込み・在庫カード）からも読むので、DB などには依存させないこと。
 *
 * ショップを足すときは docs/operations.md の「ショップを追加する」も参照
 */

export type Shop = {
  /** DeviceInventory.shopName（楽天の店は lib/rakutenShops.ts の shopName と同じ） */
  name: string;
  /** 画面に出す短い名前 */
  label: string;
  /** 名前の横に小さく添える補足 */
  note?: string;
  /** iPad の在庫も取り込んでいるか */
  ipad: boolean;
  /**
   * バッテリー最大容量の表記。
   * exact: 数値（85% など）／ over80: 「80%以上」「80%未満」だけ（DB には 80・79、未使用品は 100）／
   * none: 取り込めていない（null。未使用品だけ 100 のことがある）。2026/9/28 時点の DB の値の分布で決めた（じゃんぱらは 9/27 夜の取り込みから数値あり）
   */
  battery: "exact" | "over80" | "none";
};

export const SHOPS: Shop[] = [
  { name: "イオシス", label: "イオシス", ipad: true, battery: "over80" },
  { name: "じゃんぱら（楽天市場店）", label: "じゃんぱら", note: "楽天市場店", ipad: true, battery: "exact" },
  { name: "ゲオモバイル（楽天市場店）", label: "ゲオモバイル", note: "楽天市場店", ipad: true, battery: "none" },
  { name: "ソフマップ（楽天市場店）", label: "ソフマップ", note: "楽天市場店", ipad: true, battery: "exact" },
  { name: "にこスマ", label: "にこスマ", ipad: true, battery: "exact" },
  { name: "ダイワンテレコム", label: "ダイワンテレコム", ipad: false, battery: "over80" },
  { name: "エムモバ", label: "エムモバ", ipad: false, battery: "none" },
];

export const IPAD_SHOPS = SHOPS.filter((s) => s.ipad);

/** 機種（iPhone / iPad）を扱うショップ */
export const shopsFor = (model: string): Shop[] => (/^iPad/.test(model) ? IPAD_SHOPS : SHOPS);

/** 「イオシス・じゃんぱら・…」 */
export const shopLabels = (shops: Shop[] = SHOPS): string => shops.map((s) => s.label).join("・");

export const findShop = (name: string): Shop | undefined => SHOPS.find((s) => s.name === name);
