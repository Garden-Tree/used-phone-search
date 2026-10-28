import { cache } from "react";
import prisma from "@/lib/prisma";
import { getMedianAt } from "@/lib/modelStats";
import { LAUNCH_PRICES } from "@/lib/launchPrices";

/**
 * 「中古iPhoneは発売から何年でいくら下がる？」（/iphone/resale-value・2026-10-28〜）の数字。
 * 発売時の Apple 公式の値段（lib/launchPrices.ts・いちばん安い容量）と、いまの中古の相場（同じ容量の中央値・機種ページと同じ数え方）を比べる。
 * 値段の記録は約1か月分しかないので、同じ機種の推移ではなく「発売から何年たった機種か」で並べた横断の比較。
 * 売るときは店の買取価格（販売価格より低い）なので、「実質いくら」は目安（ページに注記する）。在庫の行は取らない（中央値の1行だけ）
 */

/** 相場を出す最少の件数（それより少ない機種は表に出さない） */
export const RESALE_MIN_COUNT = 5;

export type ResaleRow = {
  model: string;
  launchDate: string;
  storage: number;
  launchPrice: number;
  median: number;
  count: number;
  /** 発売からの年数（小数1桁） */
  years: number;
  /** 発売時の値段に対する中古の相場の割合（%・小数1桁） */
  retention: number;
  /** （発売時の値段 − いまの相場）÷ 発売からの月数（円・1円単位）。1年未満の機種は出さない */
  perMonth: number | null;
  /** いま売ると: 3店のきれいな状態の買取価格のうち最高（同じ容量）。なければ null */
  buyback: { price: number; shop: string; label: string } | null;
  /** 実質の負担（発売時の値段 − 買取の最高）÷ 発売からの月数。1年未満・買取なしは null */
  realPerMonth: number | null;
};

/** 店ごとの「きれいな状態」の区分（比べるときの基準。ネットオフ 美品・にこスマ 良品・モバステ 中古の上限） */
export const BUYBACK_GOOD_GRADES: Record<string, string> = { "ネットオフ": "a", "にこスマ": "A", "モバステ": "used_max" };

export type ResaleGroup = { label: string; min: number; max: number; rows: ResaleRow[]; avgRetention: number };

const yearsBetween = (from: string, to: Date) => (to.getTime() - new Date(`${from}T00:00:00+09:00`).getTime()) / (365.25 * 24 * 3600 * 1000);

export const getResaleValue = cache(async (now: Date = new Date()): Promise<{ rows: ResaleRow[]; groups: ResaleGroup[] }> => {
  const entries = Object.entries(LAUNCH_PRICES);
  const medians = await Promise.all(entries.map(([model, l]) => getMedianAt(model, l.storage)));
  // 買取価格（表 BuybackPrice は iPhone × 容量 × 店の区分で約1,400行。必要な機種・区分だけ取る）
  const bb = await prisma.buybackPrice.findMany({
    where: { model: { in: entries.map(([m]) => m) }, OR: Object.entries(BUYBACK_GOOD_GRADES).map(([shopName, grade]) => ({ shopName, grade })) },
    select: { model: true, storage: true, shopName: true, gradeLabel: true, price: true },
  });
  const rows: ResaleRow[] = entries
    .map(([model, l], i) => {
      const m = medians[i];
      if (m.median === null || m.count < RESALE_MIN_COUNT) return null;
      const years = Math.round(yearsBetween(l.date, now) * 10) / 10;
      const months = yearsBetween(l.date, now) * 12;
      const best = bb.filter((b) => b.model === model && b.storage === l.storage).sort((a, b) => b.price - a.price)[0];
      const buyback = best ? { price: best.price, shop: best.shopName, label: best.gradeLabel } : null;
      return {
        model, launchDate: l.date, storage: l.storage, launchPrice: l.price, median: m.median, count: m.count, years,
        retention: Math.round((m.median / l.price) * 1000) / 10,
        perMonth: months >= 12 ? Math.round((l.price - m.median) / months) : null,
        buyback,
        realPerMonth: buyback && months >= 12 ? Math.round((l.price - buyback.price) / months) : null,
      };
    })
    .filter((r): r is ResaleRow => r !== null)
    .sort((a, b) => a.years - b.years);

  // 発売からの年数の区切り（1年ごと。4年以上はまとめる）
  const bands = [
    { label: "1年未満", min: 0, max: 1 },
    { label: "1〜2年", min: 1, max: 2 },
    { label: "2〜3年", min: 2, max: 3 },
    { label: "3〜4年", min: 3, max: 4 },
    { label: "4〜5年", min: 4, max: 5 },
    { label: "5年以上", min: 5, max: 99 },
  ];
  const groups = bands
    .map((b) => {
      const rs = rows.filter((r) => r.years >= b.min && r.years < b.max);
      const avg = rs.length ? Math.round((rs.reduce((s, r) => s + r.retention, 0) / rs.length) * 10) / 10 : 0;
      return { ...b, rows: rs, avgRetention: avg };
    })
    .filter((g) => g.rows.length > 0);
  return { rows, groups };
});
