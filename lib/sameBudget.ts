import { ALL_DEVICE_PAGE_MODELS, deviceOf, type Device } from "@/lib/catalog";
import { getModelMarket, type ModelMarket } from "@/lib/marketStats";
import { rethrowDuringBuild } from "@/lib/buildGuard";

/**
 * 「同じ予算で買える他の機種」（機種ページ・2026-10-23〜）: 同じ種類（iPhone・iPad など）で、相場（在庫がいちばん多い容量の中央値）が
 * この機種の相場の ±WIDTH に入る機種を、差の小さい順に。
 * 種類ごとの相場は、ビルドのワーカーごとに1回だけ集計して使い回す（ページごとに全機種を問い合わせない。集計は DB 側の groupBy と中央値の1行）
 */
const WIDTH = 0.12;
/** 相場が数件の在庫で決まらないように */
const MIN_COUNT = 5;

const memo = new Map<Device, Promise<Map<string, ModelMarket>>>();

function marketOf(device: Device): Promise<Map<string, ModelMarket>> {
  let p = memo.get(device);
  if (!p) {
    p = getModelMarket(ALL_DEVICE_PAGE_MODELS.filter((m) => deviceOf(m) === device));
    p.catch(() => memo.delete(device));
    memo.set(device, p);
  }
  return p;
}

export type SameBudgetRow = { model: string; market: ModelMarket; diff: number };

export async function sameBudgetModels(model: string, median: number, n = 3): Promise<SameBudgetRow[]> {
  try {
    const market = await marketOf(deviceOf(model));
    return [...market.entries()]
      .filter(([m, v]) => m !== model && v.count >= MIN_COUNT && Math.abs(v.medianPrice - median) <= median * WIDTH)
      .map(([m, v]) => ({ model: m, market: v, diff: v.medianPrice - median }))
      .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))
      .slice(0, n);
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("same-budget models failed:", error);
    return [];
  }
}
