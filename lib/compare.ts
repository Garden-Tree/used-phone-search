import { ALL_DEVICE_PAGE_MODELS, modelToSlug } from "@/lib/catalog";

/**
 * 比較ページを作る組み合わせ。「iPhone 13 14 中古 どっち」のように検索されやすいものに絞る（iPad も含む）。
 * 各ペアは [古い/下位モデル, 新しい/上位モデル] の順で書く（URL もこの順になる）
 */
const GENERATIONS = [11, 12, 13, 14, 15, 16, 17];

function buildPairs(): [string, string][] {
  const pairs: [string, string][] = [];

  // 同じグレードの隣り合う世代（13 と 14、15 Pro と 16 Pro など）。
  // Pro / Pro Max は 18 まで出ている（無印の 18 は 2027年春予定）
  for (const [suffix, gens] of [["", GENERATIONS], [" Pro", [...GENERATIONS, 18]], [" Pro Max", [...GENERATIONS, 18]]] as const) {
    for (let i = 0; i < gens.length - 1; i++) {
      pairs.push([`iPhone ${gens[i]}${suffix}`, `iPhone ${gens[i + 1]}${suffix}`]);
    }
  }

  // 同じ世代の上位・下位（15 と 15 Pro、15 Pro と 15 Pro Max）
  for (const g of [12, 13, 14, 15, 16, 17]) {
    pairs.push([`iPhone ${g}`, `iPhone ${g} Pro`], [`iPhone ${g} Pro`, `iPhone ${g} Pro Max`]);
  }
  pairs.push(["iPhone 18 Pro", "iPhone 18 Pro Max"]);
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

  // iPad（「買い替えるなら新しい方か」「Air と Pro どっち」で迷われる組）
  pairs.push(
    ["iPad (第9世代)", "iPad (第10世代)"],
    ["iPad (第10世代)", "iPad (A16)"],
    ["iPad (A16)", "iPad Air 11インチ (M3)"],
    ["iPad (第10世代)", "iPad Air (第5世代)"],
    ["iPad mini (第6世代)", "iPad mini (A17 Pro)"],
    ["iPad mini (第6世代)", "iPad (第10世代)"],
    ["iPad Air (第4世代)", "iPad Air (第5世代)"],
    ["iPad Air (第5世代)", "iPad Air 11インチ (M2)"],
    ["iPad Air 11インチ (M2)", "iPad Air 11インチ (M3)"],
    ["iPad Air 11インチ (M3)", "iPad Air 11インチ (M4)"],
    ["iPad Air 11インチ (M2)", "iPad Pro 11インチ (M4)"],
    ["iPad Pro 11インチ (第4世代)", "iPad Pro 11インチ (M4)"],
    ["iPad Pro 11インチ (M4)", "iPad Pro 11インチ (M5)"],
    ["iPad Pro 12.9インチ (第6世代)", "iPad Pro 13インチ (M4)"],
  );

  // カタログに無いモデルを含む組は除外（表記ミスの防止）
  return pairs.filter(([a, b]) => ALL_DEVICE_PAGE_MODELS.includes(a) && ALL_DEVICE_PAGE_MODELS.includes(b));
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
