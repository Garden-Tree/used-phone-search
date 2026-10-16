/** 12345 → "12,345円" */
export const yen = (n: number) => `${n.toLocaleString()}円`;

/**
 * 容量（GB）の表示。1024 以上は TB（"1024" → "1TB"）。
 * model が Apple Watch のときは、storage が容量ではなくケースのサイズ（mm）なので "46mm"（2026-10-15〜）
 */
/** 相場の見出し。相場は在庫がいちばん多い容量の中央値（lib/modelInventory.ts の primaryMedian）なので、その容量を添える（"相場（128GB）"） */
export function medianLabel(storage: number | null | undefined, model?: string): string {
  return storage ? `相場（${storageLabel(storage, model)}）` : "相場";
}

export function storageLabel(gb: number | string, model?: string): string {
  const n = Number(gb);
  if (model !== undefined && model.startsWith("Apple Watch")) return `${n}mm`;
  return n >= 1024 ? `${n / 1024}TB` : `${n}GB`;
}
