import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { groupMinPrice, medianPrice, modelWhere } from "@/lib/modelInventory";
import { appleRepair } from "@/lib/appleRepairPrices";
import { rethrowDuringBuild } from "@/lib/buildGuard";

/**
 * 「中古iPhoneの値段は何で決まる？」（/iphone/price-factors・2026-10-23〜）の数字。
 * 同じ機種・同じ容量で1つだけ変えたときの相場（中央値）の差: 電池（90%台と80%台）・状態ランク（A・B・C）・容量（1つ上）・世代（1つ前）。
 * 選び方はショートの battery・rank・storage・gen（shorts/themes/*.ts）と同じ。DB は機種ごとの groupBy・count と中央値の1行だけ（在庫の行は取らない）
 */

/** 相場が数件の在庫で決まらないように（比べるそれぞれの在庫の件数） */
const MIN_COUNT = 5;
const BATTERY_HI = { min: 90, max: 99 };
const BATTERY_LO = { min: 81, max: 89 };

const BASE = ["iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16", "iPhone 17"];
const PRO = ["iPhone 12 Pro", "iPhone 13 Pro", "iPhone 14 Pro", "iPhone 15 Pro", "iPhone 16 Pro", "iPhone 17 Pro"];
/** 古い順に、無印と Pro を交互に */
const MODELS = BASE.flatMap((b, i) => [b, PRO[i]]);

type Where = Prisma.DeviceInventoryWhereInput;

async function counts(where: Where) {
  return new Map((await groupMinPrice(where, "storage")).map((g) => [Number(g.key), g.count] as const));
}
const topStorage = (c: Map<number, number>) => [...c.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
async function band(where: Where) {
  const count = await prisma.deviceInventory.count({ where });
  return { count, median: count ? (await medianPrice(where, count))! : 0 };
}

export type BatteryFactor = { model: string; storage: number; hi: number; lo: number; hiCount: number; loCount: number; diff: number; repair: number | null };
export type RankFactor = { model: string; storage: number; a: number; b: number; c: number; diff: number };
export type StorageFactor = { model: string; from: number; to: number; fromMedian: number; toMedian: number; diff: number };
export type GenFactor = { newer: string; older: string; storage: number; newerMedian: number; olderMedian: number; diff: number };
export type PriceFactors = { battery: BatteryFactor[]; rank: RankFactor[]; storage: StorageFactor[]; gen: GenFactor[] };

export async function getPriceFactors(): Promise<PriceFactors> {
  const out: PriceFactors = { battery: [], rank: [], storage: [], gen: [] };
  try {
    const side = new Map<string, { where: Where; c: Map<number, number> }>();
    for (const m of MODELS) {
      const where = await modelWhere(m);
      side.set(m, { where, c: await counts(where) });
    }
    const at = (m: string, gb: number): Where => ({ AND: [side.get(m)!.where, { storage: gb }] });

    for (const m of MODELS) {
      const { c } = side.get(m)!;
      const gb = topStorage(c);
      if (gb === undefined) continue;

      // 電池: 90%台（90〜99）と80%台（81〜89）。100 は未使用品が多く、80 は「80%以上」とだけ書く店の値なので入れない
      const [hi, lo] = [
        await band({ AND: [at(m, gb), { batteryHealth: { gte: BATTERY_HI.min, lte: BATTERY_HI.max } }] }),
        await band({ AND: [at(m, gb), { batteryHealth: { gte: BATTERY_LO.min, lte: BATTERY_LO.max } }] }),
      ];
      if (hi.count >= MIN_COUNT && lo.count >= MIN_COUNT) {
        out.battery.push({ model: m, storage: gb, hi: hi.median, lo: lo.median, hiCount: hi.count, loCount: lo.count, diff: hi.median - lo.median, repair: appleRepair(m)?.battery ?? null });
      }

      // 状態ランク: 各店の表記を大文字にそろえた A・B・C
      const rk = await Promise.all((["A", "B", "C"] as const).map((r) => band({ AND: [at(m, gb), { conditionRank: { in: [r, r.toLowerCase()] } }] })));
      if (rk.every((r) => r.count >= MIN_COUNT)) out.rank.push({ model: m, storage: gb, a: rk[0].median, b: rk[1].median, c: rk[2].median, diff: rk[0].median - rk[2].median });

      // 容量: 在庫5件以上のいちばん小さい容量と、その次の容量
      const ok = [...c.keys()].filter((g) => (c.get(g) ?? 0) >= MIN_COUNT).sort((x, y) => x - y);
      if (ok.length >= 2) {
        const [from, to] = ok;
        const [f, t] = [(await medianPrice(at(m, from), c.get(from)!))!, (await medianPrice(at(m, to), c.get(to)!))!];
        out.storage.push({ model: m, from, to, fromMedian: f, toMedian: t, diff: t - f });
      }
    }

    // 世代: 連続する2世代（無印どうし・Pro どうし）。両方に在庫5件以上のいちばん小さい容量
    for (const line of [BASE, PRO]) {
      for (let i = line.length - 1; i > 0; i--) {
        const [newer, older] = [line[i], line[i - 1]];
        const [a, b] = [side.get(newer)!.c, side.get(older)!.c];
        const gb = [...a.keys()].filter((g) => (a.get(g) ?? 0) >= MIN_COUNT && (b.get(g) ?? 0) >= MIN_COUNT).sort((x, y) => x - y)[0];
        if (gb === undefined) continue;
        const [nm, om] = [(await medianPrice(at(newer, gb), a.get(gb)!))!, (await medianPrice(at(older, gb), b.get(gb)!))!];
        out.gen.push({ newer, older, storage: gb, newerMedian: nm, olderMedian: om, diff: nm - om });
      }
    }
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("price factors failed:", error);
  }
  return out;
}
