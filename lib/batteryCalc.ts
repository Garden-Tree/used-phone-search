/**
 * /iphone/battery の計算（ブラウザとページの表で共有する。DB に触らない）。
 * 型は lib/batteryDecision.ts と同じ形をここで持つ（クライアントから prisma を読み込まないため）
 */
export type MedianCell = { median: number; count: number } | null;
export type TargetStorage = { storage: number; all: MedianCell; b80: MedianCell; b85: MedianCell };
export type BatteryFilter = "b80" | "b85";

/**
 * 買い替え先の容量: 同じ容量に相場があればそれ、なければ大きい方でいちばん近い容量、それもなければいちばん大きい容量。
 * 相場は電池で絞った値（filter）を優先し、件数が足りなければ null
 */
export function pickTarget(rows: TargetStorage[] | undefined, storage: number, filter: BatteryFilter): { storage: number; cell: MedianCell } | null {
  const ok = (rows ?? []).filter((r) => r[filter]);
  if (ok.length === 0) return null;
  const hit = ok.find((r) => r.storage === storage) ?? ok.find((r) => r.storage > storage) ?? ok[ok.length - 1];
  return { storage: hit.storage, cell: hit[filter] };
}

/** 1年あたり（円・100円単位で丸める） */
export const perYear = (cost: number, years: number): number => Math.round(cost / years / 100) * 100;
