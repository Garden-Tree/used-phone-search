/**
 * iPhone の「1つ上の世代」（同じ系統: 無印・mini・Plus・Pro・Pro Max・e・SE）。
 * ショートの batteryswap（電池交換を足すと1つ上の世代と同じ値段？）と、機種ページの「直す？買い替える？」で共有する。
 * 次の世代がない機種（13 mini・Air・17・17e・SE 第3世代・18 Pro 系など）は載せない
 */
export const NEXT_GENERATION_PAIRS: [older: string, newer: string][] = [
  ["iPhone 11", "iPhone 12"],
  ["iPhone 12", "iPhone 13"],
  ["iPhone 13", "iPhone 14"],
  ["iPhone 14", "iPhone 15"],
  ["iPhone 15", "iPhone 16"],
  ["iPhone 16", "iPhone 17"],
  ["iPhone 12 mini", "iPhone 13 mini"],
  ["iPhone 14 Plus", "iPhone 15 Plus"],
  ["iPhone 15 Plus", "iPhone 16 Plus"],
  ["iPhone 12 Pro", "iPhone 13 Pro"],
  ["iPhone 13 Pro", "iPhone 14 Pro"],
  ["iPhone 14 Pro", "iPhone 15 Pro"],
  ["iPhone 15 Pro", "iPhone 16 Pro"],
  ["iPhone 16 Pro", "iPhone 17 Pro"],
  ["iPhone 17 Pro", "iPhone 18 Pro"],
  ["iPhone 12 Pro Max", "iPhone 13 Pro Max"],
  ["iPhone 13 Pro Max", "iPhone 14 Pro Max"],
  ["iPhone 14 Pro Max", "iPhone 15 Pro Max"],
  ["iPhone 15 Pro Max", "iPhone 16 Pro Max"],
  ["iPhone 16 Pro Max", "iPhone 17 Pro Max"],
  ["iPhone 17 Pro Max", "iPhone 18 Pro Max"],
  ["iPhone 16e", "iPhone 17e"],
  ["iPhone SE (第2世代)", "iPhone SE (第3世代)"],
];

/** 機種ページだけで使う組（iOS 27 非対応・Apple 公式の電池交換の料金がない機種を含むので、ショートの batteryswap には入れない） */
const PAGE_ONLY_PAIRS: [older: string, newer: string][] = [
  ["iPhone 11 Pro", "iPhone 12 Pro"],
  ["iPhone 11 Pro Max", "iPhone 12 Pro Max"],
  ["iPhone XR", "iPhone 11"],
  ["iPhone XS", "iPhone 11 Pro"],
  ["iPhone XS Max", "iPhone 11 Pro Max"],
];

const NEXT = new Map([...NEXT_GENERATION_PAIRS, ...PAGE_ONLY_PAIRS]);

/** 1つ上の世代。なければ null */
export const nextGeneration = (model: string): string | null => NEXT.get(model) ?? null;
