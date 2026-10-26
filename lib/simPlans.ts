// 機種ページの「中古スマホと一緒に回線も見直すなら（PR）」（2026-10-15〜。スマホの機種ページだけ。iPad・MacBook には出さない）。
// リンクは各 ASP の提供そのまま（加工しない）。特典（ポイント）は書かない。月額は各社とも公式で確かめた値だけを tiers に（毎月1日に見直し）。
// 楽天モバイルを先に（10/26〜。楽天アフィリエイトの新規7,000円。A8 にも提携があるが、YouTube にそのまま使え条件がゆるい楽天アフィに決めた）
// 足すときは ALL_SIM_PLANS に1件足す。**href が空の社は画面に出ない**（提携してリンクが来たら href を入れるだけで出る。10/26〜）。
// GA4 の shop_click は shop_name「<name>（回線）」、link_type は linkType。
// 機種ページは「この機種の中古相場＋代表の段の月額×24＝2年の目安」（app/components/SimTile.tsx。代表の段は repTier()）。
export type SimTier = {
  /** 段の名前（例「20GB」「無制限」） */
  label: string;
  /** その段で使えるデータ量（GB）。無制限は Infinity */
  gb: number;
  /** 月額（税込・割引なし・各種手数料等別）。公式ページ（priceSource）で確かめた値だけ */
  monthly: number;
  /** プラン名が段で違う社だけ（例 UQ・Y!mobile） */
  plan?: string;
};

export type SimPlan = {
  name: string;
  /** 一言の説明（料金・特典の数字は書かない） */
  text: string;
  /** アフィリエイトのリンク。**空なら画面に出さない**（提携待ち） */
  href: string;
  /** インプレッション計測用の 1x1 画像（A8 だけ） */
  imgSrc?: string;
  linkType: "a8" | "rakuten";
  /**
   * ボタンの色（10/26〜 ユーザーの指示で各社の色に）。サイトの色（lib/brandColors.ts）の例外はここだけ。
   * ロゴの形はまねない（商標）。色と社名の文字だけ
   */
  style: { background: string; color: string; border?: string };
  /** データ量の段ごとの月額（税込・割引なし）。公式ページ（priceSource）で確かめた値だけ・毎月1日に見直す */
  tiers: SimTier[];
  /** いちばん安い月額（tiers から計算。ボタンの「月○円〜」） */
  monthlyFrom: number;
  priceSource: string;
  /** 月額を公式で確かめた日（YYYY-MM-DD） */
  checked: string;
};

/** 月額を公式で確かめた日（全社。ショートの rakutenmobile も読む） */
export const SIM_PRICES_CHECKED = "2026-10-26";

/** 2年の目安に使う段の基準（GB）。この量以上を使える段のうち月額がいちばん低い段を「代表の段」にする（全社同じ決め方） */
export const REP_TIER_GB = 20;

const plan = (p: Omit<SimPlan, "monthlyFrom">): SimPlan => ({ ...p, monthlyFrom: Math.min(...p.tiers.map((t) => t.monthly)) });

/** 代表の段（REP_TIER_GB 以上を使える段のうち月額が低いもの。なければいちばん大きい段） */
export function repTier(p: SimPlan): SimTier {
  const ok = p.tiers.filter((t) => t.gb >= REP_TIER_GB).sort((a, b) => a.monthly - b.monthly);
  return ok[0] ?? [...p.tiers].sort((a, b) => b.gb - a.gb)[0];
}

/** 掲載候補の全社（href が空の社は出ない） */
export const ALL_SIM_PLANS: SimPlan[] = [
  plan({
    // 楽天アフィリエイト「楽天モバイル」（Rakuten最強プラン。ショップリンク作成のテキストリンク）
    name: "楽天モバイル",
    text: "データ使い放題の Rakuten最強プラン",
    href: "https://hb.afl.rakuten.co.jp/hsc/58858f0c.304dd67c.566a1a2e.942e4aef/?link_type=text&rafst=rmn&ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJ0ZXh0IiwiY29sIjoxLCJjYXQiOjEsImJhbiI6Im5hbWUiLCJhbXAiOmZhbHNlfQ%3D%3D",
    linkType: "rakuten",
    // 楽天モバイルのショッキングピンク（白い文字のコントラスト比 4.5 以上）
    style: { background: "#D9005B", color: "#FFFFFF", border: "3px solid #D9005B" },
    // Rakuten最強プラン 3GBまで 1,078円・20GBまで 2,178円・無制限 3,278円（10/26 公式・税込）
    tiers: [
      { label: "3GB", gb: 3, monthly: 1078 },
      { label: "20GB", gb: 20, monthly: 2178 },
      { label: "無制限", gb: Infinity, monthly: 3278 },
    ],
    priceSource: "https://network.mobile.rakuten.co.jp/fee/saikyo-plan/",
    checked: "2026-10-26",
  }),
  plan({
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
    // 30GB 2,970円。**2026/12/1 から 40GB 3,135円〜120GB 5,115円の段階制に改定**（公式の告知）→ 12/1 に tiers を直す
    tiers: [{ label: "30GB", gb: 30, monthly: 2970 }],
    priceSource: "https://ahamo.com/plan/",
    checked: "2026-10-26",
  }),
  plan({
    // A8「J:COM MOBILE」（s00000019927002。10/26 深夜に申請・提携待ち → 提携したら href・imgSrc を入れる）
    name: "J:COM MOBILE",
    text: "J:COM の格安スマホ",
    href: "",
    linkType: "a8",
    // 色は仮（出す前にユーザーに見せる）
    style: { background: "#C8102E", color: "#FFFFFF", border: "3px solid #C8102E" },
    // Aプラン ST/SU（ST＝SIM・SU＝eSIM）1GB 1,408円・5GB 1,958円・10GB 2,508円・20GB 3,058円・50GB 3,828円（10/26 公式・税込）。
    // J:COM の他サービスを契約すると同じ料金でデータが増える「データ盛」は条件付きなので入れない
    tiers: [
      { label: "1GB", gb: 1, monthly: 1408 },
      { label: "5GB", gb: 5, monthly: 1958 },
      { label: "10GB", gb: 10, monthly: 2508 },
      { label: "20GB", gb: 20, monthly: 3058 },
      { label: "50GB", gb: 50, monthly: 3828 },
    ],
    priceSource: "https://www.jcom.co.jp/service/mobile/price/",
    checked: "2026-10-26",
  }),
  plan({
    // A8「X-mobile（グリーンプラン）」（s00000027731001。10/26 深夜に申請・提携待ち）
    name: "X-mobile",
    text: "データ量を選べるグリーンプラン",
    href: "",
    linkType: "a8",
    // 色は仮（出す前にユーザーに見せる）
    style: { background: "#047857", color: "#FFFFFF", border: "3px solid #047857" },
    // グリーンプラン 1GB 715円・3GB 968円・5GB 1,111円・10GB 1,518円・20GB 2,178円・30GB 3,058円・50GB 3,828円・100GB 9,328円（10/26 公式・税込）。
    // 期間限定のキャンペーン価格（3GB 363円・20GB 1,320円。10/31 まで）は入れない（料金一覧 https://xmobile.ne.jp/price-list/ も同じ値）
    tiers: [
      { label: "1GB", gb: 1, monthly: 715 },
      { label: "3GB", gb: 3, monthly: 968 },
      { label: "5GB", gb: 5, monthly: 1111 },
      { label: "10GB", gb: 10, monthly: 1518 },
      { label: "20GB", gb: 20, monthly: 2178 },
      { label: "30GB", gb: 30, monthly: 3058 },
      { label: "50GB", gb: 50, monthly: 3828 },
      { label: "100GB", gb: 100, monthly: 9328 },
    ],
    priceSource: "https://xmobile.ne.jp/plan/",
    checked: "2026-10-26",
  }),
  plan({
    // A8「UQ mobile」（s00000014884001。オンラインショップからの申込だけ。提携待ち）
    name: "UQ mobile",
    text: "au の回線のオンライン申込",
    href: "",
    linkType: "a8",
    // 色は仮（出す前にユーザーに見せる）
    style: { background: "#C7004C", color: "#FFFFFF", border: "3px solid #C7004C" },
    // トクトクプラン2 基本使用料（割引前）5GB まで・30GB まで とも 4,048円（https://www.uqwimax.jp/mobile/plan/tokutoku2/）、
    // コミコミプランバリュー 35GB 基本使用料（割引前）3,828円（https://www.uqwimax.jp/mobile/plan/komikomi-pv/）（10/26 公式・税込）
    tiers: [
      { label: "5GB", gb: 5, monthly: 4048, plan: "トクトクプラン2" },
      { label: "30GB", gb: 30, monthly: 4048, plan: "トクトクプラン2" },
      { label: "35GB", gb: 35, monthly: 3828, plan: "コミコミプランバリュー" },
    ],
    priceSource: "https://www.uqwimax.jp/mobile/plan/",
    checked: "2026-10-26",
  }),
  plan({
    // A8「Y!mobile（Yステーション）」（s00000018938002。MNP。**ソフトバンク認定中古品の契約は否認**。提携待ち）
    name: "Y!mobile",
    text: "ソフトバンクの回線のプラン",
    href: "",
    linkType: "a8",
    // 色は仮（出す前にユーザーに見せる）
    style: { background: "#D6001C", color: "#FFFFFF", border: "3px solid #D6001C" },
    // シンプル3 S 5GB 3,278円・M 30GB 4,378円・L 35GB 5,478円（月額基本使用料・2026/6/2 改定後。10/26 公式・税込・割引前）。
    // 料金のページ（/plan/）は金額が JS で入るため読めず、公式の改定の告知ページで確かめた
    tiers: [
      { label: "5GB", gb: 5, monthly: 3278, plan: "シンプル3 S" },
      { label: "30GB", gb: 30, monthly: 4378, plan: "シンプル3 M" },
      { label: "35GB", gb: 35, monthly: 5478, plan: "シンプル3 L" },
    ],
    priceSource: "https://www.ymobile.jp/sp/price_info_2026/",
    checked: "2026-10-26",
  }),
  // LIBMO（A8 s00000017964001）は 10/26 時点で公式サイトが一時停止中（セキュリティ対応・再開日の記載なし）で月額を確かめられないため入れていない
];

/** 画面に出す社（href があるものだけ）。A8 のインプレッション画像もこれだけ */
export const SIM_PLANS: SimPlan[] = ALL_SIM_PLANS.filter((p) => p.href !== "");
