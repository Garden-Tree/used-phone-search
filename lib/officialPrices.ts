/**
 * Pixel・Galaxy の新品の公式価格（日本・税込・SIMフリー・一括価格）。
 * 公式ストア（Google ストア / Samsung 公式）で確かめた値だけを載せる。毎月1日の出典見直しで確認し直す。
 * 公式で売っていない機種は、確かめられないので意図的に載せない（載っていない機種は比較を出さない）。
 * Galaxy S26+ と Pixel 10 Pro / Pro XL の 512GB は、価格を確実に読み取れなかったので載せていない。
 * 容量は GB（1TB=1024。DB・lib/format.ts の storageLabel と同じ）。
 */
export const OFFICIAL_PRICES_CHECKED = "2026-10-19";

type Entry = { shop: string; url: string; prices: Record<number, number> };

const GOOGLE = "Google ストア";
const SAMSUNG = "Samsung 公式";

const OFFICIAL: Record<string, Entry> = {
  "Pixel 10": { shop: GOOGLE, url: "https://store.google.com/jp/config/pixel_10?hl=ja", prices: { 128: 128900, 256: 143900 } },
  "Pixel 10 Pro": { shop: GOOGLE, url: "https://store.google.com/jp/config/pixel_10_pro?hl=ja", prices: { 256: 174900 } },
  "Pixel 10 Pro XL": { shop: GOOGLE, url: "https://store.google.com/jp/config/pixel_10_pro?hl=ja", prices: { 256: 192900 } },
  "Pixel 10a": { shop: GOOGLE, url: "https://store.google.com/jp/config/pixel_10a?hl=ja", prices: { 128: 92800, 256: 107800 } },
  "Galaxy S26 Ultra": { shop: SAMSUNG, url: "https://www.samsung.com/jp/smartphones/galaxy-s26-ultra/buy/", prices: { 256: 239800, 512: 268600, 1024: 334200 } },
  "Galaxy S26": { shop: SAMSUNG, url: "https://www.samsung.com/jp/smartphones/galaxy-s26/buy/", prices: { 256: 155800, 512: 183300 } },
};

/** 公式価格の出典（店名と URL。なければ null） */
export const officialPriceSource = (model: string): { name: string; url: string } | null => {
  const e = OFFICIAL[model];
  return e ? { name: e.shop, url: e.url } : null;
};

/** 新品の公式価格（税込）。載っていない機種・容量は null */
export function officialPrice(model: string, storage: number | string): number | null {
  return OFFICIAL[model]?.prices[Number(storage)] ?? null;
}

export type NewVsUsedRow = { storage: number; newPrice: number; usedMin: number; diff: number; pct: number };

/** 容量ごとの「新品（公式）」と「中古の最安」。両方ある容量だけ（diff は新品−中古。マイナスなら中古のほうが高い） */
export function newVsUsedOfficial(model: string, byStorage: { key: string; minPrice: number; count: number }[]): NewVsUsedRow[] {
  const rows: NewVsUsedRow[] = [];
  for (const r of byStorage) {
    const newPrice = officialPrice(model, r.key);
    if (newPrice === null || r.count <= 0) continue;
    const diff = newPrice - r.minPrice;
    rows.push({ storage: Number(r.key), newPrice, usedMin: r.minPrice, diff, pct: Math.round((diff / newPrice) * 1000) / 10 });
  }
  return rows.sort((a, b) => a.storage - b.storage);
}

/** 確認日の表示（例: 2026年10月19日） */
export const officialCheckedJa = (): string => {
  const [y, m, d] = OFFICIAL_PRICES_CHECKED.split("-").map(Number);
  return `${y}年${m}月${d}日`;
};
