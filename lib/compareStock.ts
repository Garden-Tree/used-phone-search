import prisma from "@/lib/prisma";
import { matchesModel } from "@/lib/modelMatch";
import { COMPARE_PAIRS } from "@/lib/compare";

/**
 * 比較ページを検索に登録するかの判断（2026-10-15〜）。
 * どちらかの機種の販売中の在庫が MIN_STOCK 件未満なら、比較として中身が薄いので noindex にし、サイトマップからも外す。
 * 在庫数は「modelName ごとの件数」を1回の groupBy でまとめて取り（行は取らない）、機種ごとに表記ゆれを足し合わせる。
 * 機種ページの集計（lib/modelInventory.ts の modelWhere）と同じ照合（matchesModel）なので件数は一致する
 */
export const COMPARE_MIN_STOCK = 10;

let cached: Promise<Map<string, number>> | null = null;

/** 機種（カタログの名前）→ 販売中の在庫数。ビルド中は1プロセスにつき1回だけ DB に聞く */
export function getModelStockCounts(): Promise<Map<string, number>> {
  if (!cached) {
    cached = (async () => {
      const rows = await prisma.deviceInventory.groupBy({
        by: ["modelName"],
        where: { isSoldOut: false },
        _count: { _all: true },
      });
      const models = new Set(COMPARE_PAIRS.flat());
      const out = new Map<string, number>();
      for (const m of models) {
        out.set(m, rows.filter((r) => matchesModel(m, r.modelName)).reduce((n, r) => n + r._count._all, 0));
      }
      return out;
    })();
    cached.catch(() => { cached = null; });
  }
  return cached;
}

/** この比較ページを検索に登録してよいか（両方の在庫が COMPARE_MIN_STOCK 件以上） */
export async function isCompareIndexable(a: string, b: string): Promise<boolean> {
  const counts = await getModelStockCounts();
  return (counts.get(a) ?? 0) >= COMPARE_MIN_STOCK && (counts.get(b) ?? 0) >= COMPARE_MIN_STOCK;
}
