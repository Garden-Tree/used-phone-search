import { ALL_PAGE_MODELS, modelToSlug } from "@/lib/catalog";

/**
 * 比較ページを作る組み合わせ。「iPhone 13 14 中古 どっち」のように検索されやすいものに絞る。
 * 各ペアは [古い/下位モデル, 新しい/上位モデル] の順で書く（URL もこの順になる）
 */
const GENERATIONS = [11, 12, 13, 14, 15, 16, 17];

function buildPairs(): [string, string][] {
  const pairs: [string, string][] = [];

  // 同じグレードの隣り合う世代（13 と 14、15 Pro と 16 Pro など）
  for (const suffix of ["", " Pro", " Pro Max"]) {
    for (let i = 0; i < GENERATIONS.length - 1; i++) {
      pairs.push([`iPhone ${GENERATIONS[i]}${suffix}`, `iPhone ${GENERATIONS[i + 1]}${suffix}`]);
    }
  }

  // 同じ世代の上位・下位（15 と 15 Pro、15 Pro と 15 Pro Max）
  for (const g of [12, 13, 14, 15, 16, 17]) {
    pairs.push([`iPhone ${g}`, `iPhone ${g} Pro`], [`iPhone ${g} Pro`, `iPhone ${g} Pro Max`]);
  }
  for (const g of [14, 15, 16]) pairs.push([`iPhone ${g}`, `iPhone ${g} Plus`]);

  // よく迷われる組み合わせ
  pairs.push(
    ["iPhone 16e", "iPhone 16"],
    ["iPhone 17e", "iPhone 17"],
    ["iPhone 16e", "iPhone 17e"],
    ["iPhone 17", "iPhone Air"],
    ["iPhone Air", "iPhone 17 Pro"],
    ["iPhone 13", "iPhone 15"],
    ["iPhone 14", "iPhone 16"],
    ["iPhone 15", "iPhone 17"],
    ["iPhone 12 mini", "iPhone 13 mini"],
    ["iPhone SE (第2世代)", "iPhone SE (第3世代)"],
    ["iPhone SE (第3世代)", "iPhone 13 mini"],
    ["iPhone SE (第3世代)", "iPhone 16e"],
  );

  // カタログに無いモデルを含む組は除外（表記ミスの防止）
  return pairs.filter(([a, b]) => ALL_PAGE_MODELS.includes(a) && ALL_PAGE_MODELS.includes(b));
}

export const COMPARE_PAIRS: [string, string][] = buildPairs();

export function compareSlug(a: string, b: string): string {
  return `${modelToSlug(a)}-vs-${modelToSlug(b)}`;
}

export function comparePath(a: string, b: string): string {
  return `/compare/${compareSlug(a, b)}`;
}

export function slugToPair(slug: string): [string, string] | undefined {
  return COMPARE_PAIRS.find(([a, b]) => compareSlug(a, b) === slug);
}

/** そのモデルを含む比較ページ（モデル別ページからの内部リンク用） */
export function comparesFor(model: string): [string, string][] {
  return COMPARE_PAIRS.filter(([a, b]) => a === model || b === model);
}
