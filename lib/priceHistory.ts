import prisma from "@/lib/prisma";
import { ALL_PAGE_MODELS, modelToSlug } from "@/lib/catalog";
import { fetchModelInventory, summarizePrices } from "@/lib/modelInventory";

/** 全容量をまとめた集計を表す storage の値 */
export const ALL_STORAGE = 0;

export type PricePoint = { date: string; minPrice: number; medianPrice: number; count: number };

/** JST の今日の日付（@db.Date 用に UTC 0時で表す） */
export function jstToday(now = new Date()): Date {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()));
}

/**
 * 全モデルの当日分の価格を記録する（GitHub Actions でスクレイピング後に実行）。
 * 同じ日に複数回実行した場合は最新の値で上書きする。在庫ゼロのモデル・容量は記録しない
 */
export async function recordPriceSnapshots(date = jstToday()) {
  let written = 0;
  for (const model of ALL_PAGE_MODELS) {
    const devices = await fetchModelInventory(model);
    const byStorage = new Map<number, number[]>([[ALL_STORAGE, []]]);
    for (const d of devices) {
      byStorage.get(ALL_STORAGE)!.push(d.price);
      if (!byStorage.has(d.storage)) byStorage.set(d.storage, []);
      byStorage.get(d.storage)!.push(d.price); // devices は価格昇順なので各配列も昇順
    }

    const modelSlug = modelToSlug(model);
    for (const [storage, prices] of byStorage) {
      const summary = summarizePrices(prices);
      if (!summary) continue;
      await prisma.priceSnapshot.upsert({
        where: { date_modelSlug_storage: { date, modelSlug, storage } },
        create: { date, modelSlug, storage, ...summary },
        update: summary,
      });
      written++;
    }
  }
  return written;
}

/** 容量(GB, 0 = 全容量) → 推移（古い順） */
export type PriceHistory = Record<number, PricePoint[]>;

/**
 * モデル別ページのグラフ用データ。全容量分をまとめて1クエリで取得する。
 * テーブル未作成・DBエラー時は空を返し、ページ本体の表示は止めない
 */
export async function getPriceHistory(modelSlug: string, days = 180): Promise<PriceHistory> {
  const since = jstToday();
  since.setUTCDate(since.getUTCDate() - days);
  try {
    const rows = await prisma.priceSnapshot.findMany({
      where: { modelSlug, date: { gte: since } },
      orderBy: { date: "asc" },
    });
    const history: PriceHistory = {};
    for (const r of rows) {
      (history[r.storage] ??= []).push({
        date: r.date.toISOString().slice(0, 10),
        minPrice: r.minPrice,
        medianPrice: r.medianPrice,
        count: r.count,
      });
    }
    return history;
  } catch (error) {
    console.error("Failed to fetch price history:", error);
    return {};
  }
}
