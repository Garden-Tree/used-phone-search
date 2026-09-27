import { cache } from "react";
import prisma from "@/lib/prisma";
import { ALL_STORAGE } from "@/lib/priceHistory";

/**
 * 全機種の相場（相場一覧・値下がり）。価格推移の記録（PriceSnapshot）から読むので、在庫の行は取り出さない。
 * PriceSnapshot は GitHub Actions のスクレイピング後に毎日記録される（lib/priceHistory.ts）
 */

export type MarketRow = {
  modelSlug: string;
  date: string;
  /** 全容量をまとめた相場（中央値）・最安値・件数 */
  medianPrice: number;
  minPrice: number;
  count: number;
};

/** いちばん新しい日の、全機種の全容量の相場。記録がない・DB エラーのときは空 */
export const getLatestMarket = cache(async (): Promise<Map<string, MarketRow>> => {
  try {
    const latest = await prisma.priceSnapshot.findFirst({ orderBy: { date: "desc" }, select: { date: true } });
    if (!latest) return new Map();
    const rows = await prisma.priceSnapshot.findMany({
      where: { date: latest.date, storage: ALL_STORAGE },
      select: { modelSlug: true, date: true, medianPrice: true, minPrice: true, count: true },
    });
    return new Map(rows.map((r) => [r.modelSlug, { ...r, date: r.date.toISOString().slice(0, 10) }]));
  } catch (error) {
    console.error("latest market failed:", error);
    return new Map();
  }
});

export type PriceDrop = {
  modelSlug: string;
  /** 比べた容量（その機種でいちばん在庫の多い容量） */
  storage: number;
  before: number;
  after: number;
  /** 下がった額（円）と率（%） */
  drop: number;
  rate: number;
  fromDate: string;
  toDate: string;
};

/**
 * days 日前と比べて相場（中央値）が下がった機種。容量の構成が変わると全容量の中央値は動くので、
 * 機種ごとにいちばん在庫の多い容量どうしで比べる。在庫が少ない（minCount 未満）容量と、1% 未満の変化はぶれとして除く。
 * days 日分の記録がまだないときは空（ページ側は節ごと出さない）
 */
export const getPriceDrops = cache(async (days = 7, limit = 10, minCount = 5): Promise<PriceDrop[]> => {
  try {
    const latest = await prisma.priceSnapshot.findFirst({ orderBy: { date: "desc" }, select: { date: true } });
    if (!latest) return [];
    const target = new Date(latest.date);
    target.setUTCDate(target.getUTCDate() - days);
    const past = await prisma.priceSnapshot.findFirst({
      where: { date: { lte: target } },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    if (!past) return [];

    const rows = await prisma.priceSnapshot.findMany({
      where: { date: { in: [latest.date, past.date] }, storage: { not: ALL_STORAGE } },
      select: { modelSlug: true, date: true, storage: true, medianPrice: true, count: true },
    });
    const key = (slug: string, storage: number) => `${slug}:${storage}`;
    const before = new Map(
      rows.filter((r) => r.date.getTime() === past.date.getTime()).map((r) => [key(r.modelSlug, r.storage), r]),
    );

    // 機種ごとに、いちばん新しい日の在庫がいちばん多い容量を選ぶ
    const main = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      if (r.date.getTime() !== latest.date.getTime() || r.count < minCount) continue;
      const cur = main.get(r.modelSlug);
      if (!cur || r.count > cur.count) main.set(r.modelSlug, r);
    }

    const drops: PriceDrop[] = [];
    for (const now of main.values()) {
      const old = before.get(key(now.modelSlug, now.storage));
      if (!old || old.count < minCount || now.medianPrice >= old.medianPrice) continue;
      const drop = old.medianPrice - now.medianPrice;
      const rate = Math.round((drop / old.medianPrice) * 1000) / 10;
      if (rate < 1) continue; // 1% 未満は日々のぶれ
      drops.push({
        modelSlug: now.modelSlug,
        storage: now.storage,
        before: old.medianPrice,
        after: now.medianPrice,
        drop,
        rate,
        fromDate: past.date.toISOString().slice(0, 10),
        toDate: latest.date.toISOString().slice(0, 10),
      });
    }
    return drops.sort((a, b) => b.rate - a.rate).slice(0, limit);
  } catch (error) {
    console.error("price drops failed:", error);
    return [];
  }
});

/** "2026-09-28" → "9/28" */
export const shortDate = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

