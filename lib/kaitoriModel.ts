import { IPHONE_CATALOG, LEGACY_SERIES, modelPagePath } from "@/lib/catalog";
import { getBuybackList, getModelBuyback, type BuybackStorageRow } from "@/lib/buybackPrices";
import { getModelMarket } from "@/lib/marketStats";
import { getMedianAt } from "@/lib/modelStats";
import { nextGeneration } from "@/lib/nextGeneration";

/**
 * 機種ごとの買取ページ（/iphone/<slug>/kaitori・2026-11-03〜・ideas/2026-11-03.md の案A＋B）。
 * 「iPhone 13 買取価格」の検索向け。買取価格（表 BuybackPrice・週1回）と、売って買い替えたときの差額（中古の相場・毎日）を1ページに
 */
export const KAITORI_MODELS = [...IPHONE_CATALOG.flatMap((s) => s.models), ...LEGACY_SERIES.flatMap((s) => s.models)];

export const kaitoriPath = (model: string) => `${modelPagePath(model)}/kaitori`;

/** 3店そろう容量が1つもない機種は検索に出さない（比較のページとして薄いので。ページは残す） */
export const KAITORI_MIN_SHOPS = 3;

/** 買取のデータがある機種（ページを作る機種）。一覧と同じ集計を使い回す */
export async function kaitoriModels(): Promise<{ model: string; shops: number }[]> {
  const { rows } = await getBuybackList(KAITORI_MODELS);
  return rows.map((r) => ({ model: r.model, shops: r.cells.length }));
}

/** 比べる容量: 載っている店がいちばん多い容量（同じなら小さい方）。一覧（getBuybackList）と同じ選び方 */
export function mainStorage(rows: BuybackStorageRow[]): BuybackStorageRow | null {
  return [...rows].sort((a, b) => b.cells.length - a.cells.length || a.storage - b.storage)[0] ?? null;
}

export type SwapRow = { model: string; storage: number | null; median: number; diff: number };

/** 「売って買い替えると」: 次の世代から3つ先まで（13 → 14・15・16）。中古の相場（在庫がいちばん多い容量の中央値・在庫5件以上）− 売値 */
export async function swapRows(model: string, sellPrice: number, n = 3): Promise<SwapRow[]> {
  const chain: string[] = [];
  for (let m = nextGeneration(model); m && chain.length < n; m = nextGeneration(m)) chain.push(m);
  if (chain.length === 0) return [];
  const market = await getModelMarket(chain);
  return chain.flatMap((m) => {
    const v = market.get(m);
    return v && v.count >= 5 ? [{ model: m, storage: v.medianStorage, median: v.medianPrice, diff: v.medianPrice - sellPrice }] : [];
  });
}

/** 同じ機種・同じ容量を中古で買い直すときの相場（在庫5件以上のときだけ）。売値との差は店の取り分の目安 */
export async function rebuyMedian(model: string, storage: number): Promise<number | null> {
  const r = await getMedianAt(model, storage);
  return r.count >= 5 ? r.median : null;
}

export { getModelBuyback };
