import { cache } from "react";
import { getModelStats, getStorageMedians } from "@/lib/modelStats";
import { IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { IPAD_MINI_A20_NAME, IPAD_MINI_A20_PRICES, IPAD_MINI_A20_RELEASE } from "@/lib/ipadMiniA20";
import { yen } from "@/lib/format";
import { findShop } from "@/lib/shops";

/**
 * /ipad/ipad-mini-new-vs-used（2026-10-27〜。新型 iPad mini（A20 Pro）の発表の日）の数字。
 * 新型は lib/ipadMiniA20.ts（Apple 公式）、中古は機種ページと同じ集計（lib/modelStats.ts。DB 側で集計・在庫の行は全件取らない）。
 * 差額は「新型の同じ容量 − 中古の相場（その容量の中央値）」。同じ容量が新型にない（64GB）ときは新型の 128GB と比べる
 */
export const IPAD_MINI_USED_MODELS = ["iPad mini (A17 Pro)", "iPad mini (第6世代)", "iPad mini (第5世代)"] as const;

/** 中央値を出す最少の件数（それより少ない容量は最安だけ） */
export const MEDIAN_MIN_COUNT = 3;
const BASE_GB = 128;

export type MiniUsedRow = {
  storage: number;
  count: number;
  minPrice: number;
  median: number | null;
  /** 比べた新型の容量と価格・差額（新型 − 中古の相場。相場がないときは null） */
  newStorage: number;
  newPrice: number;
  diff: number | null;
};

export type MiniUsedModel = {
  model: string;
  ipados27: boolean;
  count: number;
  shopCount: number;
  /** 在庫がある店（別の売り場は本店にまとめた名前。旧型3機種の店の数を数えるため） */
  shops: string[];
  minPrice: number | null;
  /** 相場（在庫がいちばん多い容量の中央値。機種ページと同じ） */
  medianPrice: number | null;
  medianStorage: number | null;
  rows: MiniUsedRow[];
  lastUpdated: Date | null;
};

export const getIpadMiniNewVsUsed = cache(async (): Promise<MiniUsedModel[]> => {
  return Promise.all(
    IPAD_MINI_USED_MODELS.map(async (model) => {
      const [stats, medians] = await Promise.all([getModelStats(model), getStorageMedians(model)]);
      const rows = medians
        .filter((r) => r.count > 0)
        .sort((a, b) => a.storage - b.storage)
        .map((r) => {
          const newStorage = IPAD_MINI_A20_PRICES[r.storage] ? r.storage : BASE_GB;
          const newPrice = IPAD_MINI_A20_PRICES[newStorage];
          const median = r.count >= MEDIAN_MIN_COUNT ? r.medianPrice : null;
          return { storage: r.storage, count: r.count, minPrice: r.minPrice, median, newStorage, newPrice, diff: median !== null ? newPrice - median : null };
        });
      return { model, ipados27: IPADOS27_MODELS.has(model), count: stats.count, shopCount: stats.shopCount, shops: stats.byShop.map((r) => findShop(r.key)?.alias ?? r.key), minPrice: stats.minPrice, medianPrice: stats.medianPrice, medianStorage: stats.medianStorage, rows, lastUpdated: stats.lastUpdated };
    }),
  );
});

/** "iPad mini (A20 Pro)" → "iPad mini（A20 Pro）"（文の中で括弧が続くのを読みやすく。extra は括弧の中に足す） */
export const zen = (model: string, extra = "") => model.replace(/ \((.+)\)$/, `（$1${extra}）`);

/** "2026-11-06" → "11/6" */
export const monthDay = (iso: string) => { const [, m, d] = iso.split("-").map(Number); return `${m}/${d}`; };

/**
 * 冒頭の1文（AI・検索結果が引用しやすいよう、日付・新型の価格・中古 A17 Pro の同じ容量の相場・差額を1文に。lib/modelFaq.ts の buildSummary と同じ書き方）。
 * A17 Pro の 128GB に相場がなければ、相場の容量（medianStorage）で比べる
 */
export function buildMiniLead(models: MiniUsedModel[], dateText: string): string | null {
  const a17 = models[0];
  const row = a17.rows.find((r) => r.storage === BASE_GB && r.diff !== null) ?? a17.rows.find((r) => r.storage === a17.medianStorage && r.diff !== null);
  if (!row || row.median === null || row.diff === null) return null;
  const shops = new Set(models.flatMap((m) => m.shops)).size;
  const total = models.reduce((n, m) => n + m.count, 0);
  const head = `${dateText}時点、新型${zen(IPAD_MINI_A20_NAME, `・${monthDay(IPAD_MINI_A20_RELEASE)}発売`)}は${row.newStorage}GBが${yen(row.newPrice)}（Apple 公式）`;
  const used = `中古の${zen(a17.model)}${row.storage}GBの相場は${yen(row.median)}で、新型より${yen(row.diff)}安い`;
  return `${head}。${used}（大手中古ショップ${shops}店の旧型 iPad mini ${total.toLocaleString()}件を集計）。`;
}
