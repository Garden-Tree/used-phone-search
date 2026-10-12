// 買取サービスの A8.net テキストリンク（サイト「中古スマホ一括検索」専用の a8mat）。
// URL・文言は A8 の提供そのまま（加工しない）。足すときは BUYBACK_PROGRAMS に1件足す。
export type BuybackProgram = {
  /** 表示名（GA4 の shop_name は「<name>（買取）」） */
  name: string;
  /** A8 のリンク文言 */
  text: string;
  href: string;
  /** インプレッション計測用の 1x1 画像 */
  imgSrc: string;
};

export const BUYBACK_PROGRAMS: BuybackProgram[] = [
  {
    name: "モバゾウ",
    text: "スマホ・iPhone・iPad・Androidなどの高価買取サービス【モバゾウ】",
    href: "https://px.a8.net/svt/ejp?a8mat=45IED7+DA34BE+5NTS+5YJRM",
    imgSrc: "https://www11.a8.net/0.gif?a8mat=45IED7+DA34BE+5NTS+5YJRM",
  },
  {
    name: "ノジマのスマホ買取",
    text: "ノジマのスマホ買取",
    href: "https://px.a8.net/svt/ejp?a8mat=45IED7+DQ5TNE+5L7C+5ZU2A",
    imgSrc: "https://www15.a8.net/0.gif?a8mat=45IED7+DQ5TNE+5L7C+5ZU2A",
  },
  {
    name: "ダイワンテレコム",
    text: "スマホ・携帯買取なら高額買取のダイワンテレコム！",
    href: "https://px.a8.net/svt/ejp?a8mat=45IED7+DBVF4Q+3I5Y+ZQFQA",
    imgSrc: "https://www18.a8.net/0.gif?a8mat=45IED7+DBVF4Q+3I5Y+ZQFQA",
  },
];
