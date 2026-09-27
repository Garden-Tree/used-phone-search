import prisma from "@/lib/prisma";
import { ALL_DEVICE_PAGE_MODELS, modelToSlug } from "@/lib/catalog";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";

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
  for (const model of ALL_DEVICE_PAGE_MODELS) {
    const where = await modelWhere(model);
    const groups = await groupMinPrice(where, "storage");
    if (groups.length === 0) continue; // 在庫ゼロのモデルは記録しない

    // 全容量（storage = 0）と容量ごと。中央値はそれぞれ1件だけ取り出す
    const targets = [
      {
        storage: ALL_STORAGE,
        where,
        minPrice: Math.min(...groups.map((g) => g.minPrice)),
        count: groups.reduce((n, g) => n + g.count, 0),
      },
      ...groups.map((g) => ({
        storage: Number(g.key),
        where: { AND: [where, { storage: Number(g.key) }] },
        minPrice: g.minPrice,
        count: g.count,
      })),
    ];

    const modelSlug = modelToSlug(model);
    for (const t of targets) {
      const summary = { minPrice: t.minPrice, medianPrice: (await medianPrice(t.where, t.count)) ?? t.minPrice, count: t.count };
      await prisma.priceSnapshot.upsert({
        where: { date_modelSlug_storage: { date, modelSlug, storage: t.storage } },
        create: { date, modelSlug, storage: t.storage, ...summary },
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
