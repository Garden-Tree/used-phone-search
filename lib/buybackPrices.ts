import { cache } from "react";
import prisma from "@/lib/prisma";
import { BUYBACK_PROGRAMS } from "@/lib/buyback";

/**
 * 店の買取価格（表 BuybackPrice・scraper/buyback_scraper.py・週1回）を画面で使う形にする（2026-10-28〜）。
 * 比べるのは店ごとの「きれいな状態」（ネットオフ 美品 a・にこスマ 良品 A・モバステ 中古の上限）。未開封は別に持つ。
 * 表は iPhone × 容量 × 店の区分で約1,400行と小さいので、機種ごと・一覧ごとに必要な行だけ取る（在庫の表ではない）
 */
export type BuybackShop = {
  name: string;
  /** 比べる区分（きれいな状態）と、その表記 */
  good: string;
  goodLabel: string;
  unopened: string;
  /** リンク先。A8 があれば A8（店のトップ。機種のページへの直リンクは A8 の決まりが分からないので使わない）、なければ価格が載っているページ */
  a8Href: string | null;
};

const netoffA8 = BUYBACK_PROGRAMS.find((p) => p.name === "ネットオフ")?.href ?? null;

export const BUYBACK_SHOPS: BuybackShop[] = [
  { name: "ネットオフ", good: "a", goodLabel: "美品", unopened: "s", a8Href: netoffA8 },
  { name: "にこスマ", good: "A", goodLabel: "良品", unopened: "", a8Href: null },
  { name: "モバステ", good: "used_max", goodLabel: "中古の上限", unopened: "unopened", a8Href: null },
];

export type BuybackCell = { shop: string; price: number; label: string; href: string; linkType: "a8" | "direct" };
export type BuybackStorageRow = { storage: number; cells: BuybackCell[]; best: BuybackCell | null };

const cellOf = (shop: BuybackShop, price: number, url: string): BuybackCell => ({
  shop: shop.name, price, label: shop.goodLabel, href: shop.a8Href ?? url, linkType: shop.a8Href ? "a8" : "direct",
});

const GOOD_WHERE = BUYBACK_SHOPS.map((s) => ({ shopName: s.name, grade: s.good }));

/** 1機種の容量ごとの買取価格（きれいな状態・店ごと）。データがなければ [] */
export const getModelBuyback = cache(async (model: string): Promise<BuybackStorageRow[]> => {
  const rows = await prisma.buybackPrice.findMany({
    where: { model, OR: GOOD_WHERE },
    select: { storage: true, shopName: true, price: true, url: true },
  });
  return toStorageRows(rows);
});

function toStorageRows(rows: { storage: number; shopName: string; price: number; url: string }[]): BuybackStorageRow[] {
  const storages = [...new Set(rows.map((r) => r.storage))].sort((a, b) => a - b);
  return storages.map((storage) => {
    const cells = BUYBACK_SHOPS.flatMap((shop) => {
      const r = rows.find((x) => x.storage === storage && x.shopName === shop.name);
      return r ? [cellOf(shop, r.price, r.url)] : [];
    });
    const best = [...cells].sort((a, b) => b.price - a.price)[0] ?? null;
    return { storage, cells, best };
  });
}

export type BuybackModelRow = { model: string; storage: number; cells: BuybackCell[]; best: BuybackCell | null; storages: number };

/**
 * 一覧（/iphone/kaitori）: 機種ごとに1行。容量は「載っている店がいちばん多い容量」（同じなら小さい方）。
 * models の順に返す（買取のデータがない機種は出さない）
 */
export const getBuybackList = cache(async (models: string[]): Promise<{ rows: BuybackModelRow[]; updated: Date | null }> => {
  const rows = await prisma.buybackPrice.findMany({
    where: { model: { in: models }, OR: GOOD_WHERE },
    select: { model: true, storage: true, shopName: true, price: true, url: true, updatedAt: true },
  });
  const updated = rows.reduce<Date | null>((d, r) => (!d || r.updatedAt > d ? r.updatedAt : d), null);
  const out: BuybackModelRow[] = [];
  for (const model of models) {
    const byStorage = toStorageRows(rows.filter((r) => r.model === model));
    if (byStorage.length === 0) continue;
    const pick = [...byStorage].sort((a, b) => b.cells.length - a.cells.length || a.storage - b.storage)[0];
    out.push({ model, storage: pick.storage, cells: pick.cells, best: pick.best, storages: byStorage.length });
  }
  return { rows: out, updated };
});
