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

export type PcGroupStat = { label: string; count: number; minPrice: number; medianPrice: number };

/** 条件（CPU の系統・メモリ）ごとの相場。訳あり（J）は除く。件数が minCount 未満の条件は出さない */
export function groupStats(items: PcItem[], formFactor: string, minCount = 3): PcGroupStat[] {
  const groups = new Map<string, number[]>();
  for (const p of items) {
    if (p.formFactor !== formFactor || p.conditionRank === "J") continue;
    const gen = p.cpuGen ? ` 第${p.cpuGen}世代` : "";
    const key = `${p.cpuFamily}${gen}・メモリ${p.memoryGB}GB`;
    groups.set(key, [...(groups.get(key) ?? []), p.price]);
  }
  return [...groups.entries()]
    .filter(([, prices]) => prices.length >= minCount)
    .map(([label, prices]) => {
      const sorted = [...prices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
      return { label, count: sorted.length, minPrice: sorted[0], medianPrice: median };
    })
    .sort((a, b) => a.medianPrice - b.medianPrice);
}

/** 「メモリ16GB・SSD 256GB」 */
export function memoryStorage(p: Pick<PcItem, "memoryGB" | "storageGB" | "storageType">): string {
  const sto = p.storageGB >= 1000 ? `${p.storageGB / 1000}TB` : `${p.storageGB}GB`;
  return `メモリ${p.memoryGB}GB・${p.storageType} ${sto}`;
}
