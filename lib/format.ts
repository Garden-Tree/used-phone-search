/** 12345 → "12,345円" */
export const yen = (n: number) => `${n.toLocaleString()}円`;

/**
 * 容量（GB）の表示。1024 以上は TB（"1024" → "1TB"）。
 * model が Apple Watch のときは、storage が容量ではなくケースのサイズ（mm）なので "46mm"（2026-10-15〜）
 */
export function storageLabel(gb: number | string, model?: string): string {
  const n = Number(gb);
  if (model !== undefined && model.startsWith("Apple Watch")) return `${n}mm`;
  return n >= 1024 ? `${n / 1024}TB` : `${n}GB`;
}
