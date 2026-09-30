/**
 * トップページの「目的・予算から探す」カードの行き先（/pick/[slug]）。
 * 検索ページ（毎回 DB に問い合わせる動的ページ）ではなく ISR の静的ページにすることで、
 * サーバーや DB が休止明けでも CDN から即座に表示できる
 */
export type Pick = {
  slug: string;
  /** カード・見出しに使う短いタイトル */
  title: string;
  /** 検索結果のタイトルに使う説明的な名前 */
  seoTitle: string;
  lead: string;
  models: string[];
  /** iPad の目的別ページ（/ipad の「目的から探す」に出す）。なしは iPhone */
  ipad?: boolean;
  /** 対象機種の出典（Apple 公式） */
  source?: { label: string; url: string };
};

export const PICKS: Pick[] = [
  {
    slug: "cospa",
    title: "迷ったらこれ！長く使えるコスパ最強",
    seoTitle: "コスパ最強の中古iPhoneおすすめ（iPhone 13・14）",
    lead: "性能と価格のバランスがよく、まだ数年は最新の iOS を使える iPhone 13・14 の中古在庫をまとめています。",
    models: ["iPhone 13", "iPhone 14"],
  },
  {
    slug: "budget",
    title: "予算重視！とにかく安く使える",
    seoTitle: "とにかく安い中古iPhone（iPhone 11・12・SE）",
    lead: "できるだけ安く iPhone を使いたい人向けに、iOS 27 に対応していて価格の安い iPhone 11・12・SE（第2/第3世代）の中古在庫をまとめています。",
    models: ["iPhone 11", "iPhone 12", "iPhone SE (第2世代)", "iPhone SE (第3世代)"],
  },
  {
    slug: "camera",
    title: "オールドコンデジ代わりにエモい写真",
    seoTitle: "オールドコンデジ代わりの中古iPhone（iPhone 7・8・X）",
    lead: "撮影専用のサブ機として手頃な iPhone 7・8・X の中古在庫をまとめています。最新の iOS には対応していないため、メイン機としての利用には注意してください。",
    models: ["iPhone 7", "iPhone 8", "iPhone X"],
  },
  // ここから iPad。対象はどれも iPadOS 27 対応（lib/ipadSpecs.ts の IPADOS27_MODELS）
  {
    slug: "ipad-study",
    title: "動画・勉強用に安く",
    seoTitle: "動画・勉強用の安い中古iPad（iPad 第9世代・第10世代・A16）",
    lead: "動画や勉強用に、iPadOS 27 に対応していて価格の安い無印の iPad（第9世代・第10世代・A16）の中古在庫をまとめています。",
    models: ["iPad (A16)", "iPad (第10世代)", "iPad (第9世代)"],
    ipad: true,
  },
  {
    slug: "ipad-mini",
    title: "片手で持てる iPad mini",
    seoTitle: "持ち歩きやすい中古iPad mini（A17 Pro・第6世代）",
    lead: "8.3インチで持ち歩きやすい iPad mini のうち、iPadOS 27 に対応している iPad mini（A17 Pro）と iPad mini（第6世代）の中古在庫をまとめています。",
    models: ["iPad mini (A17 Pro)", "iPad mini (第6世代)"],
    ipad: true,
  },
  {
    slug: "ipad-pencil-pro",
    title: "イラスト・手書きノートに",
    seoTitle: "Apple Pencil Pro が使える中古iPad（Pro M4/M5・Air M2〜M4・mini A17 Pro）",
    lead: "Apple Pencil Pro が使える iPad の中古在庫をまとめています。第1世代・第2世代・USB-C の Apple Pencil で足りる場合は、もっと古い機種でも使えます（対応は Apple の互換性一覧で確認してください）。",
    // 2026-09-30 に Apple「Apple Pencil の互換性」（2026/03/31 更新）で確認
    models: [
      "iPad Air 11インチ (M2)", "iPad Air 13インチ (M2)", "iPad Air 11インチ (M3)", "iPad Air 13インチ (M3)",
      "iPad Air 11インチ (M4)", "iPad Air 13インチ (M4)", "iPad mini (A17 Pro)",
      "iPad Pro 11インチ (M4)", "iPad Pro 13インチ (M4)", "iPad Pro 11インチ (M5)", "iPad Pro 13インチ (M5)",
    ],
    ipad: true,
    source: { label: "Apple「Apple Pencil の互換性」", url: "https://support.apple.com/ja-jp/108937" },
  },
];

export const IPHONE_PICKS = PICKS.filter((p) => !p.ipad);
export const IPAD_PICKS = PICKS.filter((p) => p.ipad);

export function pickPath(slug: string): string {
  return `/pick/${slug}`;
}

export function findPick(slug: string): Pick | undefined {
  return PICKS.find((p) => p.slug === slug);
}

/** 対象モデルをまとめた検索ページへのリンク（すべての在庫を見る） */
export function pickSearchHref(pick: Pick): string {
  return `/search?${new URLSearchParams({ model: pick.models.join(",") }).toString()}`;
}
