/**
 * 比較対象のショップの一覧（表示順）。店名・店の数を書く場所はここだけにする。
 * トップの在庫数・絞り込み・OG 画像・各ページの説明文はここから作る。
 * クライアントコンポーネント（絞り込み・在庫カード）からも読むので、DB などには依存させないこと。
 *
 * ショップを足すときは docs/operations.md の「ショップを追加する」も参照
 */

export type Shop = {
  /** DeviceInventory.shopName（楽天の店は lib/rakutenShops.ts、Yahoo!ショッピングの店は lib/yahooShops.ts の shopName と同じ） */
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
  /** 同じ店の別の売り場（イオシス楽天市場店 → "イオシス"）。店の数・一覧には数えず、絞り込みでは本店と一緒に出す */
  alias?: string;
  /** API 経由の売り場。楽天・Yahoo!ショッピング・Amazon（Amazon は価格の取得時刻を添える。DeviceCard.tsx） */
  marketplace?: "rakuten" | "yahoo" | "amazon";
};

export const SHOPS: Shop[] = [
  { name: "イオシス", label: "イオシス", galaxy: true, pixel: true, ipad: true, battery: "over80",
    warranty: "中古3ヶ月（未使用品は6ヶ月）", redRom: "保証期間に関わらず対象", guaranteeUrl: "https://iosys.co.jp/guide/support/guarantee.html" },
  { name: "じゃんぱら（楽天市場店）", label: "じゃんぱら", note: "楽天市場店", marketplace: "rakuten", pixel: true, galaxy: true, ipad: true, battery: "exact",
    warranty: "商品ごと（iPhone は多くが1ヶ月）", redRom: "永久保証", guaranteeUrl: "https://www.janpara.co.jp/contents/faq/" },
  { name: "ゲオモバイル（楽天市場店）", label: "ゲオモバイル", note: "楽天市場店", marketplace: "rakuten", pixel: true, galaxy: true, ipad: true, battery: "none",
    warranty: "到着後30日以内の返品・交換", redRom: "永久保証（期間を問わず交換・返金）", guaranteeUrl: "https://www.rakuten.ne.jp/gold/geo-mobile/info_henpin.html" },
  { name: "ソフマップ（楽天市場店）", label: "ソフマップ", note: "楽天市場店", marketplace: "rakuten", pixel: true, galaxy: true, ipad: true, battery: "exact",
    warranty: "初期不良は到着後30日以内に返金（返品保証10日間）", redRom: "到着から3年以内は返品可（商品ページに記載）", guaranteeUrl: "https://www.rakuten.co.jp/akiba-u-shop/info.html" },
  { name: "ニューズドテック（楽天市場店）", label: "ニューズドテック", note: "楽天市場店", marketplace: "rakuten", pixel: true, galaxy: true, ipad: true, battery: "none",
    warranty: "到着から1ヶ月（レビュー投稿で3ヶ月に延長。延長分は代金の30%返金）", redRom: "永久保証（商品ページに記載）",
    guaranteeUrl: "https://www.rakuten.co.jp/kamaya-awards/info.html" },
  { name: "カメラのキタムラ（楽天市場店）", label: "カメラのキタムラ", note: "楽天市場店", marketplace: "rakuten", pixel: true, galaxy: true, ipad: true, battery: "over80",
    warranty: "初期不良のみ到着後14日以内（中古品の保証はなし）", redRom: "無期限保証（商品ページに記載）",
    guaranteeUrl: "https://www.rakuten.co.jp/emedama/info.html" },
  { name: "エムティーエム（楽天市場店）", label: "エムティーエム", note: "楽天市場店", marketplace: "rakuten", pixel: true, galaxy: true, ipad: true, battery: "none",
    warranty: "記載なし（楽天の店舗情報に保証期間の記載がない。商品ページを確認）", redRom: "記載なし", guaranteeUrl: "https://www.rakuten.co.jp/ekosuta/info.html" },
  // Yahoo!ショッピングの店は YAHOO_APP_ID（GitHub Secrets）を入れて初回の取り込みが通ってから有効にする（0件のまま一覧に出さない）
  // { name: "Quality Shop（Yahoo!ショッピング店）", label: "Quality Shop", note: "Yahoo!ショッピング店", pixel: true, galaxy: true, ipad: true, battery: "none",
  //   warranty: "記載なし（確認中）", redRom: "記載なし（確認中）", guaranteeUrl: "https://store.shopping.yahoo.co.jp/quality-shop/info.html", marketplace: "yahoo" },
  // 以下の Yahoo!ショッピングの店も同じ。保証・赤ロムは 2026-10-09 に各店のお買い物ガイド（guide.html。info.html は会社概要だけ）の文面から（要・再確認）
  // { name: "モバステ（Yahoo!ショッピング店）", label: "モバステ", note: "Yahoo!ショッピング店", pixel: true, galaxy: true, ipad: true, battery: "exact",
  //   warranty: "初期不良は到着後100日間（未開封・未使用品は30日間）", redRom: "ネットワーク利用制限補償は無期限（同等機種と交換）",
  //   guaranteeUrl: "https://store.shopping.yahoo.co.jp/mobilestation/guide.html", marketplace: "yahoo" },
  // { name: "エムコム（Yahoo!ショッピング店）", label: "エムコム", note: "Yahoo!ショッピング店", pixel: true, galaxy: true, ipad: true, battery: "over80",
  //   warranty: "7日間の返品保証・1か月の通常保証（レビュー投稿で最大1年に延長）", redRom: "商品の見出しに「赤ロム保証」（期間は記載なし・確認中）",
  //   guaranteeUrl: "https://store.shopping.yahoo.co.jp/mcom2022/guide.html", marketplace: "yahoo" },
  // { name: "リユスマ（Yahoo!ショッピング店）", label: "リユスマ", note: "Yahoo!ショッピング店", galaxy: true, ipad: true, battery: "over80",
  //   warranty: "安心保証90日（商品名に記載）", redRom: "赤ロム永久保証（商品名に記載）",
  //   guaranteeUrl: "https://store.shopping.yahoo.co.jp/reusma/guide.html", marketplace: "yahoo" },
  // { name: "Joshin 中古アウトレット（Yahoo!ショッピング店）", label: "Joshin 中古アウトレット", note: "Yahoo!ショッピング店", pixel: true, galaxy: true, ipad: true, battery: "none",
  //   warranty: "商品ごと（中古品は3ヶ月・1ヶ月・10日間のいずれか。商品ページに記載）", redRom: "記載なし（確認中）",
  //   guaranteeUrl: "https://store.shopping.yahoo.co.jp/jtus2014/guide.html", marketplace: "yahoo" },
  // { name: "MyWiT（Yahoo!ショッピング店）", label: "MyWiT", note: "Yahoo!ショッピング店", pixel: true, galaxy: true, ipad: false, battery: "over80",
  //   warranty: "初期不良は到着後30日以内（ストアレビュー投稿で90日に延長）", redRom: "購入日数に関係なく同等品と交換または返金",
  //   guaranteeUrl: "https://store.shopping.yahoo.co.jp/mywit/guide.html", marketplace: "yahoo" },
  // { name: "Be-Stock（Yahoo!ショッピング店）", label: "Be-Stock", note: "Yahoo!ショッピング店", ipad: true, battery: "none",
  //   warranty: "商品ごとの保証期間（商品名に6ヶ月など。お買い物ガイドは180日以内）", redRom: "記載なし（確認中）",
  //   guaranteeUrl: "https://store.shopping.yahoo.co.jp/be-stocktsb/guide.html", marketplace: "yahoo" },
  // Amazon 整備済み品（2026-10-09〜。Creators API で取得。出品者は各中古店で、保証は Amazon のプログラム。価格は取得時点を添える＝DeviceCard）
  { name: "Amazon 整備済み品", label: "Amazon 整備済み品", note: "Amazon", pixel: true, galaxy: true, ipad: true, battery: "over80",
    warranty: "Amazon 整備済み品の保証（180日返品）", redRom: "記載なし（商品ページを確認）", guaranteeUrl: "https://www.amazon.co.jp/b?node=8130460051", marketplace: "amazon" },
  { name: "にこスマ", label: "にこスマ", galaxy: true, pixel: true, ipad: true, battery: "exact",
    warranty: "1年間の返品・交換", redRom: "永久保証", guaranteeUrl: "https://www.nicosuma.com/about/shopping-guide" },
  { name: "ダイワンテレコム", label: "ダイワンテレコム", galaxy: true, pixel: true, ipad: false, battery: "over80",
    warranty: "1年間の全額返金（不具合時）", redRom: "無期限で同等品と交換", guaranteeUrl: "https://www.dai-one.jp/guide/warranty/" },
  { name: "エムモバ", label: "エムモバ", ipad: false, battery: "none",
    warranty: "1ヶ月（レビュー投稿で1年に延長。延長分は代金の30%返金）", redRom: "保証期間に関わらず交換・返金", guaranteeUrl: "https://ec.emcom.site/pages/guarantee" },
];

/**
 * 本店と同じ店の別の売り場（SHOPS には入れない）。イオシス楽天市場店は公式と在庫を共有していて、
 * 同じ商品は公式のカードに「楽天市場でも販売」として添える（scripts/link-iosys-rakuten.ts）。公式で取れなかった商品だけがこの名前で残る
 */
export const ALIAS_SHOPS: Shop[] = [
  { name: "イオシス（楽天市場店）", label: "イオシス", note: "楽天市場店", alias: "イオシス", marketplace: "rakuten", galaxy: true, pixel: true, ipad: true, battery: "over80",
    warranty: "中古3ヶ月（未使用品は6ヶ月。商品名に記載）", redRom: "保証期間に関わらず対象", guaranteeUrl: "https://www.rakuten.co.jp/pc-good/info.html" },
];

export const IPAD_SHOPS = SHOPS.filter((s) => s.ipad);

/** 機種（iPhone / iPad）を扱うショップ */
export const PIXEL_SHOPS = SHOPS.filter((s) => s.pixel);
export const GALAXY_SHOPS = SHOPS.filter((s) => s.galaxy);

export const shopsFor = (model: string): Shop[] =>
  /^iPad/.test(model) ? IPAD_SHOPS : /^Pixel/.test(model) ? PIXEL_SHOPS : /^Galaxy/.test(model) ? GALAXY_SHOPS : SHOPS;

/** 「イオシス・じゃんぱら・…」 */
export const shopLabels = (shops: Shop[] = SHOPS): string => shops.map((s) => s.label).join("・");

export const findShop = (name: string): Shop | undefined => [...SHOPS, ...ALIAS_SHOPS].find((s) => s.name === name);
