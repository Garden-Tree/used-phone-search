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
];

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
