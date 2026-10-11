/** 状態ランクの並び（良い順）。「ランクB以上」= S・A・B。ここにないランク（ジャンクなど）は「以上」の絞り込みから外す */
export const RANK_ORDER = ["S", "A", "B", "C", "D", "J"];

/** minRank 以上（良い側）のランク一覧。minRank が不明な値なら null。DB の where にも画面の絞り込みにも使う */
export function ranksAtLeast(minRank: string | null | undefined): string[] | null {
  if (!minRank) return null;
  const i = RANK_ORDER.indexOf(minRank);
  if (i < 0) return null;
  // 取り込みで小文字が混ざることがあるので両方入れる
  const up = RANK_ORDER.slice(0, i + 1);
  return [...up, ...up.map((r) => r.toLowerCase())];
}
