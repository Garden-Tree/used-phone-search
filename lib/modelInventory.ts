import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { buildWhere, resolveModelNames } from "@/lib/deviceSearch";

/**
 * 1機種分の在庫の集計。モデル別ページ・比較ページ・価格推移の記録で共有する。
 * React に依存させないこと（GitHub Actions 上のスクリプトからも使う）
 *
 * Neon の無料枠はデータ転送量（月5GB）が上限なので、在庫の行を丸ごと取り出して JS で集計しない。
 * 件数・最安値・グループごとの最安値は DB で集計し、行として取り出すのは中央値の1件と最安の数件だけにする
 */

export type PriceGroup = { key: string; minPrice: number; count: number };

/** 1機種の販売中在庫の条件 */
export async function modelWhere(model: string): Promise<Prisma.DeviceInventoryWhereInput> {
  return { AND: [buildWhere({ modelNames: await resolveModelNames([model]) }), { isSoldOut: false }] };
}

/**
 * 中央値（価格昇順に並べて floor(件数/2) 番目。偶数件のときは真ん中2つの高い方）。
 * 行を全部取らず、その1件だけを取り出す
 */
export async function medianPrice(where: Prisma.DeviceInventoryWhereInput, count: number): Promise<number | null> {
  if (count === 0) return null;
  const row = await prisma.deviceInventory.findFirst({
    where,
    orderBy: [{ price: "asc" }, { id: "asc" }],
    skip: Math.floor(count / 2),
    select: { price: true },
  });
  return row?.price ?? null;
}

export type PrimaryMedian = { storage: number; price: number; count: number };

/**
 * 相場: 在庫がいちばん多い容量の中央値（10/16〜）。
 * 容量をまぜた中央値は在庫の多い容量に引っぱられる（例: 在庫10件の 18 Pro Max で 2TB が多く 44.5万円になった）ので、同じ容量の中で取る。
 * 件数が同じなら小さい容量。byStorage を渡せば groupBy を省く
 */
export async function primaryMedian(where: Prisma.DeviceInventoryWhereInput, byStorage?: PriceGroup[]): Promise<PrimaryMedian | null> {
  const rows = byStorage ?? (await groupMinPrice(where, "storage"));
  if (rows.length === 0) return null;
  const top = rows.reduce((a, b) => (b.count > a.count || (b.count === a.count && Number(b.key) < Number(a.key)) ? b : a));
  const storage = Number(top.key);
  const price = await medianPrice({ AND: [where, { storage }] }, top.count);
  return price === null ? null : { storage, price, count: top.count };
}

/** 容量・ランク・ショップなど、列ごとの最安値と件数 */
export async function groupMinPrice(
  where: Prisma.DeviceInventoryWhereInput,
  by: "storage" | "conditionRank" | "shopName",
): Promise<PriceGroup[]> {
  const rows = await prisma.deviceInventory.groupBy({ by: [by], where, _min: { price: true }, _count: { _all: true } });
  return rows.map((r) => ({ key: String(r[by]), minPrice: r._min.price ?? 0, count: r._count._all }));
}
