// 機種ページの「中古スマホと一緒に回線も見直すなら（PR）」（2026-10-15〜。スマホの機種ページだけ。iPad・MacBook には出さない）。
// リンクは各 ASP の提供そのまま（加工しない）。料金・特典は変わるので、ここには書かず公式ページに任せる。
// 足すときは SIM_PLANS に1件足す。GA4 の shop_click は shop_name「<name>（回線）」、link_type は linkType。
export type SimPlan = {
  name: string;
  /** 一言の説明（料金・特典の数字は書かない） */
  text: string;
  href: string;
  /** インプレッション計測用の 1x1 画像（A8 だけ） */
  imgSrc?: string;
  linkType: "a8" | "rakuten";
};

export const SIM_PLANS: SimPlan[] = [
  {
    // A8「ahamo」（s00000022488001・サイト 002 のテキストリンク。10/12 提携）
    name: "ahamo",
    text: "ドコモのオンライン専用プラン",
    href: "https://px.a8.net/svt/ejp?a8mat=4BEET7+7Q1H22+4TIO+5YJRM",
    imgSrc: "https://www15.a8.net/0.gif?a8mat=4BEET7+7Q1H22+4TIO+5YJRM",
    linkType: "a8",
  },
  {
    // 楽天アフィリエイト「楽天モバイル」（Rakuten最強プラン。ショップリンク作成のテキストリンク）
    name: "楽天モバイル",
    text: "データ使い放題の Rakuten最強プラン",
    href: "https://hb.afl.rakuten.co.jp/hsc/58858f0c.304dd67c.566a1a2e.942e4aef/?link_type=text&rafst=rmn&ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJ0ZXh0IiwiY29sIjoxLCJjYXQiOjEsImJhbiI6Im5hbWUiLCJhbXAiOmZhbHNlfQ%3D%3D",
    linkType: "rakuten",
  },
];
