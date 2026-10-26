// 機種ページの「中古スマホと一緒に回線も見直すなら（PR）」（2026-10-15〜。スマホの機種ページだけ。iPad・MacBook には出さない）。
// リンクは各 ASP の提供そのまま（加工しない）。特典（ポイント）は書かない。月額（いちばん安い段）は各社とも公式で確かめた値を monthlyFrom に（毎月1日に見直し）。
// 楽天モバイルを先に（10/26〜。楽天アフィリエイトの新規7,000円。A8 にも提携があるが、YouTube にそのまま使え条件がゆるい楽天アフィに決めた）
// 足すときは SIM_PLANS に1件足す。GA4 の shop_click は shop_name「<name>（回線）」、link_type は linkType。
export type SimPlan = {
  name: string;
  /** 一言の説明（料金・特典の数字は書かない） */
  text: string;
  href: string;
  /** インプレッション計測用の 1x1 画像（A8 だけ） */
  imgSrc?: string;
  linkType: "a8" | "rakuten";
  /**
   * ボタンの色（10/26〜 ユーザーの指示で各社の色に）。サイトの色（lib/brandColors.ts）の例外はここだけ。
   * ロゴの形はまねない（商標）。色と社名の文字だけ
   */
  style: { background: string; color: string; border?: string };
  /** いちばん安い月額（税込・割引なし）。ボタンの中に「月○円〜」と出す。公式ページ（priceSource）で確かめた値だけ・毎月1日に見直す */
  monthlyFrom: number;
  priceSource: string;
};

/** 月額を公式で確かめた日 */
export const SIM_PRICES_CHECKED = "2026-10-26";

export const SIM_PLANS: SimPlan[] = [
  {
    // 楽天アフィリエイト「楽天モバイル」（Rakuten最強プラン。ショップリンク作成のテキストリンク）
    name: "楽天モバイル",
    text: "データ使い放題の Rakuten最強プラン",
    href: "https://hb.afl.rakuten.co.jp/hsc/58858f0c.304dd67c.566a1a2e.942e4aef/?link_type=text&rafst=rmn&ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJ0ZXh0IiwiY29sIjoxLCJjYXQiOjEsImJhbiI6Im5hbWUiLCJhbXAiOmZhbHNlfQ%3D%3D",
    linkType: "rakuten",
    // 楽天モバイルのショッキングピンク（白い文字のコントラスト比 4.5 以上）
    style: { background: "#D9005B", color: "#FFFFFF", border: "3px solid #D9005B" },
    // Rakuten最強プラン 3GBまで 1,078円（20GBまで 2,178円・無制限 3,278円）
    monthlyFrom: 1078,
    priceSource: "https://network.mobile.rakuten.co.jp/fee/saikyo-plan/",
  },
  {
    // A8「ahamo」（s00000022488001・サイト 002 のテキストリンク。10/12 提携）
    name: "ahamo",
    text: "ドコモのオンライン専用プラン",
    href: "https://px.a8.net/svt/ejp?a8mat=4BEET7+7Q1H22+4TIO+5YJRM",
    imgSrc: "https://www15.a8.net/0.gif?a8mat=4BEET7+7Q1H22+4TIO+5YJRM",
    linkType: "a8",
    // ahamo の6色（コーラル・シアン・パープル・グリーン・イエロー・オレンジ）を左右の帯に。文字は黒
    style: {
      background: "linear-gradient(#fff, #fff) padding-box, linear-gradient(90deg, #FF6B6B, #22E1FF, #9B7BFF, #00E996, #F9F51A, #FFA233) border-box",
      color: "#111827",
      border: "3px solid transparent",
    },
    // 30GB 2,970円。**2026/12/1 から 40GB 3,135円〜120GB 5,115円の段階制に改定**（公式の告知）→ 12/1 に直す
    monthlyFrom: 2970,
    priceSource: "https://ahamo.com/plan/",
  },
];
