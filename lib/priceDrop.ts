import prisma from "@/lib/prisma";
import { IPHONE_CATALOG, modelToSlug } from "@/lib/catalog";
import { ALL_STORAGE } from "@/lib/priceHistory";
import { specOf } from "@/lib/iphoneSpecs";
import { rethrowDuringBuild } from "@/lib/buildGuard";

/**
 * 「中古iPhoneは1か月でいくら下がる？」（/iphone/price-drop・2026-10-28〜）の数字。
 * 直近30日の相場の変化を、発売からの年数（Apple の「モデルを識別する」の発売年）ごとにまとめる。
 * 「中古iPhone 値下がり 何%」「いつ買う」などの検索と、AI の概要の関連する問いに答える常設ページ。
 *
 * 相場はサイト共通の「在庫がいちばん多い容量の中央値」。30日後の相場の容量で、30日前の同じ容量と比べる（lib/monthlyReport.ts と同じ比べ方）。
 * 在庫の行は取らない。日次の集計（PriceSnapshot）の2日分（iPhone の機種 × 容量で数百行）だけを読む
 */

/** 比べる期間（日）。記録がこれより短ければ、いちばん古い記録の日から */
export const DROP_DAYS = 30;
/** 2時点とも在庫がこの件数以上の機種だけ（数件の出入りで相場が大きく動かないように。月次レポートと同じ） */
export const DROP_MIN_COUNT = 20;

export type DropRow = {
  model: string;
  storage: number;
  releaseYear: number;
  /** 発売から何年（終わりの日の年 − 発売年） */
  age: number;
  start: number;
  end: number;
  endCount: number;
  diff: number;
  pct: number;
};

export type DropGroup = {
  /** 例: 「今年（2026年）発売」「1年前（2025年）発売」「4年以上前（2022年以前）発売」 */
  label: string;
  ages: number[];
  rows: DropRow[];
  /** 機種の平均（単純平均。小数1桁） */
  avgPct: number;
  avgDiff: number;
};

export type PriceDrop = {
  /** 比べた2日（YYYY-MM-DD）。記録がなければ null */
  startDate: string | null;
  endDate: string | null;
  /** 2日の間の日数 */
  days: number;
  rows: DropRow[];
  groups: DropGroup[];
  avgPct: number;
  avgDiff: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

type Cell = { median: number; count: number };

let memo: Promise<PriceDrop> | null = null;
/** ページと metadata で同じ集計を2回しないよう、ビルドのワーカーごとに1回だけ集計する */
export function getPriceDrop(): Promise<PriceDrop> {
  memo ??= compute();
  return memo;
}

async function compute(): Promise<PriceDrop> {
  const out: PriceDrop = { startDate: null, endDate: null, days: 0, rows: [], groups: [], avgPct: 0, avgDiff: 0 };
  const models = IPHONE_CATALOG.flatMap((s) => s.models);
  const slugToModel = new Map(models.map((model) => [modelToSlug(model), model] as const));
  try {
    const latest = await prisma.priceSnapshot.aggregate({ where: { modelSlug: { in: [...slugToModel.keys()] }, storage: ALL_STORAGE }, _max: { date: true } });
    const last = latest._max.date;
    if (!last) return out;
    const from = new Date(last.getTime() - DROP_DAYS * 86_400_000);
    const firstRow = await prisma.priceSnapshot.findFirst({
      where: { modelSlug: { in: [...slugToModel.keys()] }, storage: ALL_STORAGE, date: { gte: from } },
      orderBy: { date: "asc" },
      select: { date: true },
    });
    const first = firstRow?.date;
    if (!first || first.getTime() === last.getTime()) return out;
    out.startDate = first.toISOString().slice(0, 10);
    out.endDate = last.toISOString().slice(0, 10);
    out.days = Math.round((last.getTime() - first.getTime()) / 86_400_000);

    const snaps = await prisma.priceSnapshot.findMany({
      where: { date: { in: [first, last] }, modelSlug: { in: [...slugToModel.keys()] }, storage: { not: ALL_STORAGE } },
      select: { date: true, modelSlug: true, storage: true, medianPrice: true, count: true },
    });
    const at = { start: new Map<string, Map<number, Cell>>(), end: new Map<string, Map<number, Cell>>() };
    for (const r of snaps) {
      const model = slugToModel.get(r.modelSlug)!;
      const side = r.date.getTime() === first.getTime() ? at.start : at.end;
      (side.get(model) ?? side.set(model, new Map()).get(model)!).set(r.storage, { median: r.medianPrice, count: r.count });
    }

    const endYear = Number(out.endDate.slice(0, 4));
    for (const model of models) {
      const releaseYear = Number(specOf(model)?.released.match(/\d{4}/)?.[0]);
      const byStorage = at.end.get(model);
      if (!releaseYear || !byStorage) continue;
      // 在庫がいちばん多い容量（同じなら小さい容量）。lib/modelInventory.ts の primaryMedian と同じ選び方
      const [storage, end] = [...byStorage].sort((a, b) => b[1].count - a[1].count || a[0] - b[0])[0];
      const start = at.start.get(model)?.get(storage);
      if (!start || end.count < DROP_MIN_COUNT || start.count < DROP_MIN_COUNT) continue;
      const diff = end.median - start.median;
      out.rows.push({ model, storage, releaseYear, age: endYear - releaseYear, start: start.median, end: end.median, endCount: end.count, diff, pct: round1((diff / start.median) * 100) });
    }
    if (out.rows.length === 0) return out;
    out.avgPct = round1(mean(out.rows.map((r) => r.pct)));
    out.avgDiff = Math.round(mean(out.rows.map((r) => r.diff)));

    const buckets: { ages: number[]; label: string }[] = [
      { ages: [0], label: `今年（${endYear}年）発売` },
      { ages: [1], label: `1年前（${endYear - 1}年）発売` },
      { ages: [2], label: `2年前（${endYear - 2}年）発売` },
      { ages: [3], label: `3年前（${endYear - 3}年）発売` },
    ];
    const maxAge = Math.max(...out.rows.map((r) => r.age));
    if (maxAge >= 4) buckets.push({ ages: Array.from({ length: maxAge - 3 }, (_, i) => i + 4), label: `4年以上前（${endYear - 4}年以前）発売` });
    for (const b of buckets) {
      const rows = out.rows.filter((r) => b.ages.includes(r.age));
      if (rows.length === 0) continue;
      out.groups.push({ ...b, rows, avgPct: round1(mean(rows.map((r) => r.pct))), avgDiff: Math.round(mean(rows.map((r) => r.diff))) });
    }
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("price drop failed:", error);
  }
  return out;
}
