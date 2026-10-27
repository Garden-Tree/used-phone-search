/**
 * 検索ページ（/search?…・noindex）へのリンクに付ける rel（2026-10-28〜）。
 * 機種ページ1枚に絞り込みのリンクが 25〜32本あり、Google が容量×ランク×電池×店の組み合わせの URL を読み続けて、
 * 機種・比較ページのクロールが後回しになっていた（比較27・MacBook 16 が未クロール。ideas/2026-10-28-ai.md）。
 * nofollow はヒント扱いだが、リンクの見た目と動きは変わらない
 */
export const searchRel = (href: string): string | undefined => (href.startsWith("/search") ? "nofollow" : undefined);
