import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { Device } from "@/app/components/DeviceCard";
import { ALL_CATALOG_MODELS, ALL_PAGE_MODELS } from "@/lib/catalog";
import { resolveModelNames } from "@/lib/deviceSearch";
import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { IPADOS27_MODELS, IPAD_SPECS } from "@/lib/ipadSpecs";
import { budgetsOf, type BudgetDevice } from "@/lib/budgets";
import { PIXEL_INFO, PIXEL_MODELS, isPixel, jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { GALAXY_MODELS, GALAXY_RELEASED, isGalaxy } from "@/lib/galaxyCatalog";
import { XPERIA_MODELS, isXperia } from "@/lib/xperiaCatalog";
import { AQUOS_MODELS, isAquos } from "@/lib/aquosCatalog";
import { androidInfoOf } from "@/lib/androidInfo";
import { specOf } from "@/lib/iphoneSpecs";

/** 予算別ページ（lib/budgets.ts）の集計 */

export type BudgetModelRow = {
  model: string;
  minPrice: number;
  count: number;
  /** iOS 27（iPad は iPadOS 27）に対応しているか。Pixel は Google のアップデート保証が残っているか */
  supported: boolean;
};

// 「予算で探す」人向けなので、動作保証のないジャンク品は除く
export const NOT_JUNK = { conditionRank: { notIn: ["J", "ジャンク"] } };

/**
 * 条件に合う在庫を、指定した機種ごとに「最安値・件数」へまとめる（在庫のない機種は除く・順序は models のまま）。
 * DB では modelName ごとに集計し、表記ゆれ（resolveModelNames）を機種へまとめるのは JS 側
 */
export async function minPriceByModel(where: Prisma.DeviceInventoryWhereInput, models: string[]): Promise<Map<string, { minPrice: number; count: number }>> {
  const groups = await prisma.deviceInventory.groupBy({
    by: ["modelName"],
    where,
    _min: { price: true },
    _count: { _all: true },
  });
  const byName = new Map(groups.map((g) => [g.modelName, g]));

  const result = new Map<string, { minPrice: number; count: number }>();
  for (const model of models) {
    const names = (await resolveModelNames([model])) ?? [];
    let minPrice = Infinity;
    let count = 0;
    for (const name of names) {
      const g = byName.get(name);
      if (!g) continue;
      count += g._count._all;
      minPrice = Math.min(minPrice, g._min.price ?? Infinity);
    }
    if (count > 0) result.set(model, { minPrice, count });
  }
  return result;
}

// iPad は発売年の新しい順（同じ年はカタログの順＝Pro・Air・mini・無印）。発売年は Apple 公式で確かめた値（lib/ipadSpecs.ts）
const releasedYear = (model: string) => Number(IPAD_SPECS[model]?.released.replace("年", "") ?? 0);
const IPAD_BY_RELEASE = [...IPAD_MODELS].sort((a, b) => releasedYear(b) - releasedYear(a));
// Galaxy は日本での発売年月の新しい順（lib/galaxyCatalog.ts。Samsung・各キャリアの発表）
const GALAXY_BY_RELEASE = [...GALAXY_MODELS].sort((a, b) => GALAXY_RELEASED[b].localeCompare(GALAXY_RELEASED[a]));
// Pixel は販売開始の年月の新しい順（lib/pixelCatalog.ts。Google 公式）
const PIXEL_BY_RELEASE = [...PIXEL_MODELS].sort((a, b) => PIXEL_INFO[b].available.localeCompare(PIXEL_INFO[a].available));

/** 予算内の在庫を機種ごとに集計する（機種は新しい順） */
export async function getBudgetModels(max: number, device: BudgetDevice = "iphone"): Promise<BudgetModelRow[]> {
  const models = device === "ipad" ? IPAD_BY_RELEASE : device === "pixel" ? PIXEL_BY_RELEASE : device === "galaxy" ? GALAXY_BY_RELEASE : ALL_PAGE_MODELS;
  const now = new Date().toISOString().slice(0, 7);
  const isSupported = (m: string) =>
    device === "ipad" ? IPADOS27_MODELS.has(m)
    : device === "pixel" ? (updateYearsLeft(m, now) ?? 0) > 0
    : device === "galaxy" ? true // カタログは 2022年以降だけ。保証期間は公式に出ていないので分けない
    : ALL_CATALOG_MODELS.includes(m);
  const byModel = await minPriceByModel({ isSoldOut: false, price: { lte: max }, ...NOT_JUNK }, models);
  return [...byModel].map(([model, r]) => ({ model, ...r, supported: isSupported(model) }));
}

/**
 * 機種ページの「この機種が買える予算」: ジャンク品を除く最安値が収まる、いちばん小さい予算（予算別ページと同じ条件）。
 * どの予算にも収まらなければ null
 */
export async function smallestBudgetFor(model: string, device: BudgetDevice): Promise<{ max: number; minPrice: number } | null> {
  const names = await resolveModelNames([model]);
  if (!names?.length) return null;
  const agg = await prisma.deviceInventory.aggregate({
    where: { modelName: { in: names }, isSoldOut: false, ...NOT_JUNK },
    _min: { price: true },
  });
  const minPrice = agg._min.price;
  if (minPrice === null) return null;
  const max = budgetsOf(device).find((b) => minPrice <= b);
  return max ? { max, minPrice } : null;
}

/** 指定した機種の、予算内でいちばん安い在庫 */
export async function cheapestUnder(model: string, max: number): Promise<Device | null> {
  const names = await resolveModelNames([model]);
  if (!names?.length) return null;
  return prisma.deviceInventory.findFirst({
    where: { modelName: { in: names }, isSoldOut: false, price: { lte: max }, ...NOT_JUNK },
    orderBy: [{ price: "asc" }, { id: "asc" }],
  });
}

/** スマホ全体の予算別ページを検索に出す最低機種数（「最新 OS・更新が続く機種」の数。足りなければ noindex・sitemap 除外） */
export const SUMAHO_MIN_MODELS = 3;

/** スマホ全体の予算別ページの1行（メーカー名つき） */
export type SumahoRow = BudgetModelRow & { brand: string; sub?: string };

const SUMAHO_BRANDS: { brand: string; models: string[] }[] = [
  { brand: "iPhone", models: ALL_PAGE_MODELS },
  { brand: "Pixel", models: PIXEL_MODELS },
  { brand: "Galaxy", models: GALAXY_MODELS },
  { brand: "Xperia", models: XPERIA_MODELS },
  { brand: "AQUOS", models: AQUOS_MODELS },
];

/** 発売の新しさの並び替え用（年月を 202510 の形に。iPhone は年だけなので 202500。分からなければ 0 ＝ 日付のあるものの後ろ） */
function releaseKey(model: string): number {
  const ymKey = (s: string | null | undefined) => {
    if (!s) return 0;
    const [y, m] = s.split("-");
    return Number(y) * 100 + (m ? Number(m) : 0);
  };
  if (isPixel(model)) return ymKey(PIXEL_INFO[model]?.available);
  if (isGalaxy(model)) return ymKey(GALAXY_RELEASED[model]);
  if (isXperia(model) || isAquos(model)) return ymKey(androidInfoOf(model)?.released);
  const y = specOf(model)?.released.replace("年", "");
  return y ? Number(y) * 100 : 0;
}

/**
 * スマホ全体（iPhone・Pixel・Galaxy・Xperia・AQUOS）の、予算内の在庫を機種ごとに集計する（発売の新しい順・ジャンク品は除く）。
 * 集計は DB 側の1回の groupBy
 */
export async function getSumahoBudgetModels(max: number): Promise<SumahoRow[]> {
  const now = new Date().toISOString().slice(0, 7);
  const cutoff = `${Number(now.slice(0, 4)) - 4}-${now.slice(5)}`; // 4年前の同じ月
  const byModel = await minPriceByModel(
    { isSoldOut: false, price: { lte: max }, ...NOT_JUNK },
    SUMAHO_BRANDS.flatMap((b) => b.models),
  );
  const rows: SumahoRow[] = [];
  for (const { brand, models } of SUMAHO_BRANDS) {
    for (const model of models) {
      const r = byModel.get(model);
      if (!r) continue;
      let supported = true;
      let sub: string | undefined;
      if (brand === "iPhone") {
        supported = ALL_CATALOG_MODELS.includes(model);
        sub = supported ? "iOS 27 対応" : "iOS 27 非対応";
      } else if (brand === "Pixel") {
        supported = (updateYearsLeft(model, now) ?? 0) > 0;
        const u = updateUntil(model);
        sub = u ? `保証 ${jaMonth(u)}まで${supported ? "" : "（終了）"}` : undefined;
      } else {
        const rel = brand === "Galaxy" ? GALAXY_RELEASED[model] : androidInfoOf(model)?.released;
        sub = rel && rel.includes("-") ? `${jaMonth(rel)}発売` : undefined;
        // 発売から4年以内なら「更新が続く機種」とみなす（メーカーは保証期間を機種ごとに出していないため）。発売日が不明・年だけなら入れない
        supported = !!rel && rel.includes("-") && rel >= cutoff;
      }
      rows.push({ model, ...r, supported, brand, sub });
    }
  }
  // sort は安定なので、同じ発売年月はブランド・カタログの順のまま
  return rows.sort((a, b) => releaseKey(b.model) - releaseKey(a.model));
}

/** 予算別ページ（スマホ全体）を検索に出すか: 「最新 OS・更新が続く機種」が足りるか */
export async function isSumahoIndexable(max: number): Promise<boolean> {
  return (await getSumahoBudgetModels(max)).filter((r) => r.supported).length >= SUMAHO_MIN_MODELS;
}
