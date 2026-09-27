/** 12345 → "12,345円" */
export const yen = (n: number) => `${n.toLocaleString()}円`;

/** 容量（GB）の表示。1024 以上は TB（"1024" → "1TB"） */
export function storageLabel(gb: number | string): string {
  const n = Number(gb);
  return n >= 1024 ? `${n / 1024}TB` : `${n}GB`;
}
