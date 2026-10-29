import prisma from "@/lib/prisma";
import { ALL_PAGE_MODELS } from "@/lib/catalog";
import { resolveModelNames } from "@/lib/deviceSearch";
import { NOT_JUNK } from "@/lib/budgetStats";
import { ALIAS_SHOPS, SHOPS, findShop, type Shop } from "@/lib/shops";
import { rethrowDuringBuild } from "@/lib/buildGuard";

/**
 * 「中古iPhoneはどこで買う？」（/iphone/where-to-buy・2026-10-24〜）の数字。
 * 店ごとの iPhone の在庫数・最安になっている機種の数と、よく見る機種の店ごとの最安値。
 *
 * DB は groupBy（機種名 × 容量 × 店 × SIMフリーか）の1回だけ（在庫の行は取らない。集計結果は数千行の小さな表）。
 * ジャンク品は除く（動作保証がないので「どこで買う」の比べ方に合わない）。別の売り場（ALIAS_SHOPS）は本店に合算する
 */

/** 最安を数える機種: 在庫がこの件数以上の機種だけ（1〜2件の機種で「最安」を数えないように） */
const MIN_MODEL_COUNT = 5;
/** 表2「よく見る機種」 */
export const POPULAR = ["iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16"];
/** 表2で出す店の数 */
const TOP_SHOPS = 5;

export type ShopRow = {
  shop: Shop;
  /** その店（別の売り場も含む）の売り場: 公式通販・楽天市場・Yahoo!ショッピング・Amazon */
  channels: string[];
  count: number;
  /** 最安になっている機種の数（各機種の在庫がいちばん多い容量で、ジャンク品を除く最安値。同じ値段の店はどちらも数える） */
  cheapestModels: number;
};

export type PopularRow = {
  model: string;
  storage: number;
  total: number;
  /** 安い順（店ごとの最安値） */
  shops: { shop: Shop; minPrice: number; count: number }[];
  /** その容量の在庫がある店の数 */
  shopCount: number;
};

export type WhereToBuy = {
  shops: ShopRow[];
  /** 最安を数えた機種の数 */
  modelsCompared: number;
  total: number;
  popular: PopularRow[];
  /** total のうち SIMフリー（SIMロック解除済みを含む。DeviceInventory.simUnlocked）の件数 */
  simFree: number;
};

const CHANNEL: Record<string, string> = { rakuten: "楽天市場", yahoo: "Yahoo!ショッピング", amazon: "Amazon" };
const channelOf = (s: Shop) => (s.marketplace ? CHANNEL[s.marketplace] : "公式通販");

/** 本店（SHOPS の行）。別の売り場は本店に、SHOPS にない店は null */
function parentOf(shopName: string): Shop | null {
  const s = findShop(shopName);
  const p = s?.alias ? findShop(s.alias) : s;
  return p && SHOPS.includes(p) ? p : null;
}

let memo: Promise<WhereToBuy> | null = null;
export function getWhereToBuy(): Promise<WhereToBuy> {
  memo ??= compute();
  return memo;
}

async function compute(): Promise<WhereToBuy> {
  const out: WhereToBuy = { shops: [], modelsCompared: 0, total: 0, popular: [], simFree: 0 };
  try {
    // DB の機種名 → ページの機種（表記ゆれは resolveModelNames と同じ照合）
    const nameToModel = new Map<string, string>();
    for (const m of ALL_PAGE_MODELS) {
      for (const n of (await resolveModelNames([m])) ?? []) if (!nameToModel.has(n)) nameToModel.set(n, m);
    }
    const rows = await prisma.deviceInventory.groupBy({
      by: ["modelName", "storage", "shopName", "simUnlocked"],
      where: { AND: [{ isSoldOut: false }, { modelName: { in: [...nameToModel.keys()] } }, NOT_JUNK, { price: { gt: 0 } }] },
      _min: { price: true },
      _count: { _all: true },
    });

    // 機種 → 容量 → 本店 → { 最安値, 件数 }
    type Cell = { minPrice: number; count: number };
    const tree = new Map<string, Map<number, Map<Shop, Cell>>>();
    const shopCount = new Map<Shop, number>();
    for (const r of rows) {
      const model = nameToModel.get(r.modelName);
      const shop = parentOf(r.shopName);
      const price = r._min.price ?? 0;
      if (!model || !shop || price <= 0) continue;
      const n = r._count._all;
      out.total += n;
      if (r.simUnlocked) out.simFree += n;
      shopCount.set(shop, (shopCount.get(shop) ?? 0) + n);
      const byStorage = tree.get(model) ?? new Map<number, Map<Shop, Cell>>();
      tree.set(model, byStorage);
      const byShop = byStorage.get(r.storage) ?? new Map<Shop, Cell>();
      byStorage.set(r.storage, byShop);
      const cur = byShop.get(shop);
      if (cur) { cur.minPrice = Math.min(cur.minPrice, price); cur.count += n; }
      else byShop.set(shop, { minPrice: price, count: n });
    }

    // 機種ごとに、在庫がいちばん多い容量（同じなら小さい容量）。相場（lib/modelInventory.ts の primaryMedian）と同じ選び方
    const topStorage = (model: string) => {
      const byStorage = tree.get(model);
      if (!byStorage) return null;
      let best: { storage: number; total: number; byShop: Map<Shop, Cell> } | null = null;
      for (const [storage, byShop] of byStorage) {
        const total = [...byShop.values()].reduce((a, c) => a + c.count, 0);
        if (!best || total > best.total || (total === best.total && storage < best.storage)) best = { storage, total, byShop };
      }
      return best;
    };

    const cheapest = new Map<Shop, number>();
    for (const model of tree.keys()) {
      const top = topStorage(model);
      if (!top || top.total < MIN_MODEL_COUNT) continue;
      out.modelsCompared++;
      const min = Math.min(...[...top.byShop.values()].map((c) => c.minPrice));
      for (const [shop, c] of top.byShop) if (c.minPrice === min) cheapest.set(shop, (cheapest.get(shop) ?? 0) + 1);
    }

    out.shops = [...shopCount.entries()]
      .map(([shop, count]) => ({
        shop,
        count,
        cheapestModels: cheapest.get(shop) ?? 0,
        channels: [...new Set([channelOf(shop), ...ALIAS_SHOPS.filter((a) => a.alias === shop.name).map(channelOf)])],
      }))
      .sort((a, b) => b.count - a.count || SHOPS.indexOf(a.shop) - SHOPS.indexOf(b.shop));

    for (const model of POPULAR) {
      const top = topStorage(model);
      if (!top) continue;
      const shops = [...top.byShop.entries()]
        .map(([shop, c]) => ({ shop, minPrice: c.minPrice, count: c.count }))
        .sort((a, b) => a.minPrice - b.minPrice || b.count - a.count);
      out.popular.push({ model, storage: top.storage, total: top.total, shops: shops.slice(0, TOP_SHOPS), shopCount: shops.length });
    }
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("where to buy failed:", error);
  }
  return out;
}
