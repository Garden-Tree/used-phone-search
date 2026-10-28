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

// 並び（10/21 見直し）: 報酬の高い古本市場（3,124円）と、EPC・確定率の高いネットオフ（EPC 166・確定率97%）を上に。10/28 にモバステ（2,000円・買取価格の表で最高値の店が多い）と LINXAS（3,000円）を足した。
// モバゾウ（EPC 10）は外した。報酬・EPC は A8 の参加中プログラム一覧（10/21）
export const BUYBACK_PROGRAMS: BuybackProgram[] = [
  {
    name: "古本市場（ふるいち）",
    text: "送料無料・高価買取！スマホ・タブレットをかしこく売るなら【ふるいち】",
    href: "https://px.a8.net/svt/ejp?a8mat=4BELTK+2Z7KQ+5W1M+NTJWY",
    imgSrc: "https://www16.a8.net/0.gif?a8mat=4BELTK+2Z7KQ+5W1M+NTJWY",
  },
  {
    name: "ネットオフ",
    text: "あなたの携帯・スマホ、実は高く売れるんです！",
    href: "https://px.a8.net/svt/ejp?a8mat=4BELTJ+BOXI8Q+1SOW+ZQ80I",
    imgSrc: "https://www11.a8.net/0.gif?a8mat=4BELTJ+BOXI8Q+1SOW+ZQ80I",
  },
  {
    // 10/20 提携（A8 s00000027426001・買取成立 2,000円）。10/28 にリンクを入れた。買取価格の表（lib/buybackPrices.ts）もこのリンク
    name: "モバステ",
    text: "全国対応・破損品もOK！スマホ・iPhoneを高く売るなら【モバステ】",
    href: "https://px.a8.net/svt/ejp?a8mat=4BEH5C+7DJDCQ+5VMC+5YJRM",
    imgSrc: "https://www14.a8.net/0.gif?a8mat=4BEH5C+7DJDCQ+5VMC+5YJRM",
  },
  {
    // 10/27 提携（A8 s00000027351002・買取成立 3,000円）
    name: "LINXAS（リンクサス）",
    text: "創業10年の信頼！iPhone・スマホ・ジャンク品も高価買取【リンクサス買取】",
    href: "https://px.a8.net/svt/ejp?a8mat=4BELTJ+B43C2I+5V1I+BWVTE",
    imgSrc: "https://www17.a8.net/0.gif?a8mat=4BELTJ+B43C2I+5V1I+BWVTE",
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

// iPhone 修理（A8）。iPhone の機種ページだけに出す（「修理と中古への買い替え、どっちが安い？」の人向け。10/21〜）
export const REPAIR_PROGRAMS: BuybackProgram[] = [
  {
    name: "アイサポ",
    text: "【iPhone修理アイサポ】",
    href: "https://px.a8.net/svt/ejp?a8mat=4BELTJ+BNQN16+36GA+5YJRM",
    imgSrc: "https://www12.a8.net/0.gif?a8mat=4BELTJ+BNQN16+36GA+5YJRM",
  },
];
