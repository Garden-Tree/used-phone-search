import { cache } from "react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { MAC_INFO } from "@/lib/macCatalog";
import { MBP_M6_MEMORY_GB, MBP_M6_NAME, MBP_M6_PRICE, MBP_M6_RELEASE, MBP_M6_STORAGE_GB } from "@/lib/macbookProM6";
import { yen } from "@/lib/format";
import { monthDay } from "@/lib/ipadMiniNewVsUsed";

/**
 * /mac/macbook-pro-m6-new-vs-used（2026-10-28〜。新型 MacBook Pro 14インチ M6 の発表の翌日）の数字。
 * 新型は lib/macbookProM6.ts（Apple 公式）。中古はメモリ×SSD ごとの中央値（ジャンクを除く。横動画・ショートと同じ数え方）。
 * DB は groupBy と中央値の1行だけ（在庫の行は全件取らない）。差額は「新型 16GB・1TB の価格 − 中古の相場」
 */
export const MBP_USED_MODELS = [
  "MacBook Pro 14インチ M5",
  "MacBook Pro 14インチ M4",
  "MacBook Pro 14インチ M5 Pro",
  "MacBook Pro 14インチ M1 Pro",
] as const;

/** 中央値を出す最少の件数（それより少ない構成は表に出さない） */
export const MEDIAN_MIN_COUNT = 3;
const NOT_JUNK: Prisma.DeviceInventoryWhereInput = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };

export type MbpUsedRow = {
  memoryGB: number;
  storage: number;
  count: number;
  minPrice: number;
  median: number;
  /** 新型 16GB・1TB − 中古の相場（マイナスなら中古の方が高い） */
  diff: number;
  /** 新型のいちばん安い構成（16GB・1TB）と同じ構成か */
  sameConfig: boolean;
};

export type MbpUsedModel = {
  model: string;
  year: string | null;
  count: number;
  /** 未使用品（ランク S）の件数 */
  unused: number;
  minPrice: number | null;
  rows: MbpUsedRow[];
  shops: string[];
  lastUpdated: Date | null;
};

export const getMbpM6NewVsUsed = cache(async (): Promise<MbpUsedModel[]> => {
  return Promise.all(
    MBP_USED_MODELS.map(async (model) => {
      const where: Prisma.DeviceInventoryWhereInput = { AND: [await modelWhere(model), NOT_JUNK] };
      const [agg, groups, ranks, shops] = await Promise.all([
        prisma.deviceInventory.aggregate({ where, _count: { _all: true }, _min: { price: true }, _max: { updatedAt: true } }),
        prisma.deviceInventory.groupBy({ by: ["memoryGB", "storage"], where, _count: { _all: true }, _min: { price: true } }),
        prisma.deviceInventory.groupBy({ by: ["conditionRank"], where, _count: { _all: true } }),
        prisma.deviceInventory.groupBy({ by: ["shopName"], where, _count: { _all: true } }),
      ]);
      const rows = (
        await Promise.all(
          groups
            .filter((g) => g.memoryGB !== null && g._count._all >= MEDIAN_MIN_COUNT && g._min.price !== null)
            .map(async (g) => {
              const median = await medianPrice({ AND: [where, { memoryGB: g.memoryGB, storage: g.storage }] }, g._count._all);
              if (median === null) return null;
              const memoryGB = g.memoryGB as number;
              return {
                memoryGB, storage: g.storage, count: g._count._all, minPrice: g._min.price as number, median,
                diff: MBP_M6_PRICE - median,
                sameConfig: memoryGB === MBP_M6_MEMORY_GB && g.storage === MBP_M6_STORAGE_GB,
              };
            }),
        )
      )
        .filter((r): r is MbpUsedRow => r !== null)
        .sort((a, b) => a.memoryGB - b.memoryGB || a.storage - b.storage);
      return {
        model,
        year: MAC_INFO[model]?.year != null ? String(MAC_INFO[model]?.year) : null,
        count: agg._count._all,
        unused: ranks.filter((r) => (r.conditionRank ?? "").toUpperCase() === "S").reduce((n, r) => n + r._count._all, 0),
        minPrice: agg._min.price,
        rows,
        shops: shops.map((s) => s.shopName),
        lastUpdated: agg._max.updatedAt,
      };
    }),
  );
});

/** "MacBook Pro 14インチ M5 Pro" → "M5 Pro" */
export const chipOf = (model: string) => model.replace("MacBook Pro 14インチ ", "");

/** 新型 16GB・1TB と同じ構成の行（なければ null） */
export const sameConfigRow = (m: MbpUsedModel) => m.rows.find((r) => r.sameConfig) ?? null;

/**
 * 冒頭の1文（AI・検索結果が引用しやすいよう、日付・新型の価格・中古 M5 の同じ構成の相場・差額を1文に。lib/ipadMiniNewVsUsed.ts の buildMiniLead と同じ書き方）
 */
export function buildMbpLead(models: MbpUsedModel[], dateText: string): string | null {
  const m5 = models[0];
  const row = sameConfigRow(m5);
  if (!row) return null;
  const shops = new Set(models.flatMap((m) => m.shops)).size;
  const total = models.reduce((n, m) => n + m.count, 0);
  const m4row = sameConfigRow(models[1]);
  const m4 = m4row ? `、M4なら${yen(m4row.median)}（${yen(m4row.diff)}安い）` : "";
  return `${dateText}時点、新型${MBP_M6_NAME.replace(" M6", "（M6・" + monthDay(MBP_M6_RELEASE) + "発売）")}は16GB・1TBが${yen(MBP_M6_PRICE)}（Apple 公式）。中古のM5（同じ16GB・1TB）の相場は${yen(row.median)}で、新型より${yen(row.diff)}${m4row ? "安く" : "安い"}${m4}（大手中古ショップ${shops}店の MacBook Pro ${total.toLocaleString()}件を集計・ジャンクを除く）。`;
}
