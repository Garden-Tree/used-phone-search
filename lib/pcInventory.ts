import prisma from "@/lib/prisma";

// 中古パソコン（Windows のノート・デスクトップ。2026-10-27〜）。取り込みは scraper/qualit_scraper.py・pcwrap_scraper.py。
// 表は数百件なので、ページのビルドで在庫のある行を必要な列だけ読む（スマホの DeviceInventory とは別。Neon の転送は1回 数十KB）

export type PcItem = {
  shopName: string;
  formFactor: string;
  maker: string;
  productName: string;
  cpu: string;
  cpuFamily: string;
  cpuGen: number | null;
  win11: boolean;
  memoryGB: number;
  storageGB: number;
  storageType: string;
  gpu: string | null;
  screenInch: number | null;
  conditionRank: string;
  rankLabel: string;
  stock: number | null;
  price: number;
  url: string;
};

// 店の表記（A8 のプログラム名と同じ。lib/affiliate.ts の A8_PROGRAMS）
export const PC_SHOPS = ["PC WRAP", "Qualit"] as const;

// 在庫がこれより少ないあいだ（取り込み前など）は /pc を検索に出さず、サイトマップにも入れない
export const PC_MIN_INDEX_ITEMS = 20;

/** 在庫のある中古パソコン。表がまだない（取り込み前）・DB に届かないときは空（ページは「準備中」で noindex） */
export async function getPcItems(): Promise<PcItem[]> {
  try {
    return await prisma.pcInventory.findMany({
      where: { isSoldOut: false },
      select: {
        shopName: true, formFactor: true, maker: true, productName: true, cpu: true, cpuFamily: true, cpuGen: true,
        win11: true, memoryGB: true, storageGB: true, storageType: true, gpu: true, screenInch: true,
        conditionRank: true, rankLabel: true, stock: true, price: true, url: true,
      },
      orderBy: { price: "asc" },
    });
  } catch (e) {
    console.warn("PcInventory を読めませんでした（取り込み前か DB の障害）", e);
    return [];
  }
}

/** 在庫のある件数（トップの入口用。DB 側で数えて1行だけ返す）。読めなければ 0 */
export async function countPcItems(): Promise<number> {
  try {
    return await prisma.pcInventory.count({ where: { isSoldOut: false } });
  } catch {
    return 0;
  }
}

/**
 * CPU の新しさ・クラスのおおまかな目安（並べ替えだけに使う。画面に数字は出さない）。
 * Intel Core i は世代×10＋クラス、Core Ultra は第14世代の上、Ryzen は 5000 系＝Intel 第10世代くらいに置く。Celeron などは 0
 */
export function cpuScore(p: Pick<PcItem, "cpu" | "cpuFamily" | "cpuGen">): number {
  const cls = (f: string) => (/[i ]9$/.test(f) ? 6 : /[i ]7$/.test(f) ? 5 : /[i ]5$/.test(f) ? 3 : 0);
  if (p.cpuFamily.startsWith("Core Ultra")) return 140 + cls(p.cpuFamily);
  if (p.cpuFamily.startsWith("Core i") && p.cpuGen) return p.cpuGen * 10 + cls(p.cpuFamily);
  const ryzen = p.cpu.match(/Ryzen \d (\d)\d{3}/);
  if (ryzen) return (Number(ryzen[1]) + 5) * 10 + cls(p.cpuFamily);
  return 0;
}

/** 予算内で、訳あり（J）と Windows 11 非対応を除いて、CPU→メモリ→SSD の順に良いもの（同じなら安い方）を n 件 */
export function bestWithin(items: PcItem[], formFactor: string, maxPrice: number, n: number): PcItem[] {
  return items
    .filter((p) => p.formFactor === formFactor && p.price <= maxPrice && p.conditionRank !== "J" && p.win11)
    .sort((a, b) => cpuScore(b) - cpuScore(a) || b.memoryGB - a.memoryGB || b.storageGB - a.storageGB || a.price - b.price)
    // 同じ機種・同じ構成は、いちばん安い1件だけ（同じ VAIO が3枠を埋めないように）
    .filter((p, i, list) => list.findIndex((q) => q.productName === p.productName && q.cpu === p.cpu && q.memoryGB === p.memoryGB && q.storageGB === p.storageGB) === i)
    .slice(0, n);
}

export type PcCell = { count: number; minPrice: number; medianPrice: number };
export type PcMatrix = { memories: number[]; rows: { label: string; cells: Map<number, PcCell>; count: number }[] };

// 表の行の並び（系統ごとにまとめ、その中は世代の古い順）
const FAMILY_ORDER = ["Celeron", "Pentium", "Core m3", "Core i3", "Core i5", "Core i7", "Core i9", "Core Ultra 5", "Core Ultra 7", "Core Ultra 9", "Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"];

/**
 * 条件別の相場の表（縦 CPU の系統・世代 × 横 メモリ）。訳あり（J）は除く。
 * 行は合わせて minRowCount 件以上ある CPU だけ、列はその行に出てくるメモリ。マスは件数・最安値・中央値（1件でも出し、画面で「1件」と添える）
 */
export function cpuMemoryMatrix(items: PcItem[], formFactor: string, minRowCount = 3): PcMatrix {
  const rows = new Map<string, { family: string; gen: number; prices: Map<number, number[]> }>();
  for (const p of items) {
    if (p.formFactor !== formFactor || p.conditionRank === "J") continue;
    const label = p.cpuGen ? `${p.cpuFamily} 第${p.cpuGen}世代` : p.cpuFamily;
    const row = rows.get(label) ?? { family: p.cpuFamily, gen: p.cpuGen ?? 0, prices: new Map() };
    row.prices.set(p.memoryGB, [...(row.prices.get(p.memoryGB) ?? []), p.price]);
    rows.set(label, row);
  }
  const order = (f: string) => (FAMILY_ORDER.indexOf(f) + 1 || 99);
  const kept = [...rows.entries()]
    .map(([label, r]) => ({ label, ...r, count: [...r.prices.values()].reduce((n, v) => n + v.length, 0) }))
    .filter((r) => r.count >= minRowCount)
    .sort((a, b) => order(a.family) - order(b.family) || a.gen - b.gen);
  const memories = [...new Set(kept.flatMap((r) => [...r.prices.keys()]))].sort((a, b) => a - b);
  return {
    memories,
    rows: kept.map((r) => ({
      label: r.label,
      count: r.count,
      cells: new Map(
        [...r.prices.entries()].map(([mem, prices]) => {
          const sorted = [...prices].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
          return [mem, { count: sorted.length, minPrice: sorted[0], medianPrice: median }];
        }),
      ),
    })),
  };
}
