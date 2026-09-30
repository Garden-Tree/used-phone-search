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
  /** Google Pixel も取り込んでいるか（2026-09-30〜。エムモバは Pixel がほぼないので取らない） */
  pixel?: boolean;
  /** Samsung Galaxy も取り込んでいるか（2026-09-30〜） */
  galaxy?: boolean;
  /**
   * バッテリー最大容量の表記。
   * exact: 数値（85% など）／ over80: 「80%以上」「80%未満」だけ（DB には 80・79、未使用品は 100）／
   * none: 取り込めていない（null。未使用品だけ 100 のことがある）。2026/9/28 時点の DB の値の分布で決めた（じゃんぱらは 9/27 夜の取り込みから数値あり）
   */
  battery: "exact" | "over80" | "none";
  /** 故障・初期不良の保証（短く。詳しくは guaranteeUrl） */
  warranty: string;
  /** ネットワーク利用制限（赤ロム）の保証 */
  redRom: string;
  /** 保証の出典（各店の公式ページ）。2026-09-28 に確認 */
  guaranteeUrl: string;
};

export const SHOPS: Shop[] = [
  { name: "イオシス", label: "イオシス", galaxy: true, pixel: true, ipad: true, battery: "over80",
    warranty: "中古3ヶ月（未使用品は6ヶ月）", redRom: "保証期間に関わらず対象", guaranteeUrl: "https://iosys.co.jp/guide/support/guarantee.html" },
  { name: "じゃんぱら（楽天市場店）", label: "じゃんぱら", note: "楽天市場店", pixel: true, galaxy: true, ipad: true, battery: "exact",
    warranty: "商品ごと（iPhone は多くが1ヶ月）", redRom: "永久保証", guaranteeUrl: "https://www.janpara.co.jp/contents/faq/" },
  { name: "ゲオモバイル（楽天市場店）", label: "ゲオモバイル", note: "楽天市場店", pixel: true, galaxy: true, ipad: true, battery: "none",
    warranty: "到着後30日以内の返品・交換", redRom: "永久保証（期間を問わず交換・返金）", guaranteeUrl: "https://www.rakuten.ne.jp/gold/geo-mobile/info_henpin.html" },
  { name: "ソフマップ（楽天市場店）", label: "ソフマップ", note: "楽天市場店", pixel: true, galaxy: true, ipad: true, battery: "exact",
    warranty: "初期不良は到着後30日以内に返金（返品保証10日間）", redRom: "到着から3年以内は返品可（商品ページに記載）", guaranteeUrl: "https://www.rakuten.co.jp/akiba-u-shop/info.html" },
  { name: "にこスマ", label: "にこスマ", galaxy: true, pixel: true, ipad: true, battery: "exact",
    warranty: "1年間の返品・交換", redRom: "永久保証", guaranteeUrl: "https://www.nicosuma.com/about/shopping-guide" },
  { name: "ダイワンテレコム", label: "ダイワンテレコム", galaxy: true, pixel: true, ipad: false, battery: "over80",
    warranty: "1年間の全額返金（不具合時）", redRom: "無期限で同等品と交換", guaranteeUrl: "https://www.dai-one.jp/guide/warranty/" },
  { name: "エムモバ", label: "エムモバ", ipad: false, battery: "none",
    warranty: "1ヶ月（レビュー投稿で1年に延長。延長分は代金の30%返金）", redRom: "保証期間に関わらず交換・返金", guaranteeUrl: "https://ec.emcom.site/pages/guarantee" },
];

export const IPAD_SHOPS = SHOPS.filter((s) => s.ipad);

/** 機種（iPhone / iPad）を扱うショップ */
export const PIXEL_SHOPS = SHOPS.filter((s) => s.pixel);
export const GALAXY_SHOPS = SHOPS.filter((s) => s.galaxy);

export const shopsFor = (model: string): Shop[] =>
  /^iPad/.test(model) ? IPAD_SHOPS : /^Pixel/.test(model) ? PIXEL_SHOPS : /^Galaxy/.test(model) ? GALAXY_SHOPS : SHOPS;

/** 「イオシス・じゃんぱら・…」 */
export const shopLabels = (shops: Shop[] = SHOPS): string => shops.map((s) => s.label).join("・");

export const findShop = (name: string): Shop | undefined => SHOPS.find((s) => s.name === name);
