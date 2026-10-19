/**
 * 新品の Apple 公式価格（日本・税込・SIMフリー）。
 * Apple 公式（apple.com/jp/shop/buy-iphone/<機種>）で確かめた値だけを載せる。毎月1日の出典見直しで確認し直す。
 * Apple が販売を終えた機種は、公式で確かめられないので意図的に載せない（載っていない機種は比較を出さない）。
 * 容量は GB（1TB=1024・2TB=2048。DB・lib/format.ts の storageLabel と同じ）。
 */
export const APPLE_PRICES_CHECKED = "2026-10-19";

const BASE = "https://www.apple.com/jp/shop/buy-iphone";

type Entry = { url: string; prices: Record<number, number> };

const APPLE: Record<string, Entry> = {
  "iPhone 18 Pro Max": { url: `${BASE}/iphone-18-pro`, prices: { 256: 239800, 512: 274800, 1024: 344800, 2048: 449800 } },
  "iPhone 18 Pro": { url: `${BASE}/iphone-18-pro`, prices: { 256: 219800, 512: 254800, 1024: 324800, 2048: 429800 } },
  "iPhone Air": { url: `${BASE}/iphone-air`, prices: { 256: 189800, 512: 224800, 1024: 294800 } },
  "iPhone 17": { url: `${BASE}/iphone-17`, prices: { 256: 159800, 512: 194800 } },
  "iPhone 17e": { url: `${BASE}/iphone-17e`, prices: { 256: 124800, 512: 159800 } },
  "iPhone 16": { url: `${BASE}/iphone-16`, prices: { 128: 139800 } },
};

/** 公式価格の出典 URL（なければ null） */
export const applePriceSource = (model: string): string | null => APPLE[model]?.url ?? null;

/** 新品の Apple 公式価格（税込）。載っていない機種・容量は null */
export function applePrice(model: string, storage: number | string): number | null {
  return APPLE[model]?.prices[Number(storage)] ?? null;
}

/** その機種で公式価格のある容量（小さい順） */
export const applePriceStorages = (model: string): number[] =>
  Object.keys(APPLE[model]?.prices ?? {}).map(Number).sort((a, b) => a - b);

export type NewVsUsedRow = { storage: number; newPrice: number; usedMin: number; diff: number; pct: number };

/** 容量ごとの「新品（Apple 公式）」と「中古の最安」。両方ある容量だけ（diff は新品−中古。マイナスなら中古のほうが高い） */
export function newVsUsed(model: string, byStorage: { key: string; minPrice: number; count: number }[]): NewVsUsedRow[] {
  const rows: NewVsUsedRow[] = [];
  for (const r of byStorage) {
    const newPrice = applePrice(model, r.key);
    if (newPrice === null || r.count <= 0) continue;
    const diff = newPrice - r.minPrice;
    rows.push({ storage: Number(r.key), newPrice, usedMin: r.minPrice, diff, pct: Math.round((diff / newPrice) * 1000) / 10 });
  }
  return rows.sort((a, b) => a.storage - b.storage);
}

/** 確認日の表示（例: 2026年10月19日） */
export const appleCheckedJa = (): string => {
  const [y, m, d] = APPLE_PRICES_CHECKED.split("-").map(Number);
  return `${y}年${m}月${d}日`;
};
