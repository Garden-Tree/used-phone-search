import prisma from "@/lib/prisma";
import { AQUOS_SHOPS, MAC_SHOPS, SHOPS, WATCH_SHOPS, XPERIA_SHOPS, findShop, shopsFor, type Shop } from "@/lib/shops";

/**
 * いま在庫が1件以上見える（isSoldOut=false）店だけの一覧。ページに出す「○店」の数はこれで数える。
 * 例: Amazon 整備済み品が API の停止で全件 売り切れ扱いのあいだは 16 店になり、戻れば自動で 17 店に戻る。
 *
 * DB 側で shopName ごとに集計するだけ（行は取らない）。ビルドのワーカーごとに1回だけ実行する。
 * 別の売り場（ALIAS_SHOPS）の在庫は親の店に合算する。SHOPS にない店は数えない
 */
let activePromise: Promise<Set<string>> | null = null;

function activeShopNames(): Promise<Set<string>> {
  activePromise ??= prisma.deviceInventory
    .groupBy({ by: ["shopName"], where: { isSoldOut: false }, _count: { _all: true } })
    .then((rows) => {
      const names = new Set<string>();
      for (const r of rows) {
        const shop = findShop(r.shopName);
        const parent = shop?.alias ? findShop(shop.alias) : shop;
        if (parent && SHOPS.includes(parent)) names.add(parent.name);
      }
      return names;
    })
    .catch((e) => {
      // DB に届かないときは全店ある扱い（数字が実際より少なく出るより安全）。次の呼び出しで再試行する
      console.error("activeShops: failed, falling back to all shops", e);
      activePromise = null;
      return new Set(SHOPS.map((s) => s.name));
    });
  return activePromise;
}

/** shops（省略時は SHOPS）のうち、いま在庫がある店 */
export async function activeShops(shops: Shop[] = SHOPS): Promise<Shop[]> {
  const names = await activeShopNames();
  return shops.filter((s) => names.has(s.name));
}

/**
 * いま MacBook の在庫が1件以上見える店（2026-10-15〜）。イオシスは公式に MacBook がなく楽天市場店（alias）だけなので、
 * 全種類で見る activeShopNames だと「在庫がある」ことになってしまう。MacBook のページ・一覧では、MacBook の在庫で数える。
 * DB 側で shopName ごとに集計するだけ（行は取らない）
 */
let activeMacPromise: Promise<Set<string>> | null = null;

function activeMacShopNames(): Promise<Set<string>> {
  activeMacPromise ??= prisma.deviceInventory
    .groupBy({ by: ["shopName"], where: { isSoldOut: false, modelName: { startsWith: "MacBook" } }, _count: { _all: true } })
    .then((rows) => {
      const names = new Set<string>();
      for (const r of rows) {
        const shop = findShop(r.shopName);
        const parent = shop?.alias ? findShop(shop.alias) : shop;
        if (parent && MAC_SHOPS.includes(parent)) names.add(parent.name); // MacBook だけの店（PC WRAP・Qualit）も数える
      }
      return names;
    })
    .catch((e) => {
      // DB に届かないときは MacBook を扱う全店ある扱い（activeShopNames と同じ。次の呼び出しで再試行する）
      console.error("activeMacShops: failed, falling back to all Mac shops", e);
      activeMacPromise = null;
      return new Set(MAC_SHOPS.map((s) => s.name));
    });
  return activeMacPromise;
}

/** MacBook の在庫がいまある店（MAC_SHOPS のうち） */
export async function activeMacShops(): Promise<Shop[]> {
  const names = await activeMacShopNames();
  return MAC_SHOPS.filter((s) => names.has(s.name));
}

/**
 * いま Xperia・AQUOS の在庫が1件以上見える店（2026-10-15〜）。MacBook と同じ理由（イオシスは楽天市場店の在庫だけ）で、
 * その種類の在庫で数える。DB 側で shopName ごとに集計するだけ（行は取らない）
 */
const activeByPrefix = new Map<string, Promise<Set<string>>>();

function activePrefixShopNames(prefix: string, fallback: Shop[]): Promise<Set<string>> {
  let p = activeByPrefix.get(prefix);
  if (!p) {
    p = prisma.deviceInventory
      .groupBy({ by: ["shopName"], where: { isSoldOut: false, modelName: { startsWith: prefix } }, _count: { _all: true } })
      .then((rows) => {
        const names = new Set<string>();
        for (const r of rows) {
          const shop = findShop(r.shopName);
          const parent = shop?.alias ? findShop(shop.alias) : shop;
          if (parent && SHOPS.includes(parent)) names.add(parent.name);
        }
        return names;
      })
      .catch((e) => {
        // DB に届かないときはその種類を扱う全店ある扱い（次の呼び出しで再試行する）
        console.error(`activeShops(${prefix}): failed, falling back to all shops`, e);
        activeByPrefix.delete(prefix);
        return new Set(fallback.map((s) => s.name));
      });
    activeByPrefix.set(prefix, p);
  }
  return p;
}

/** Xperia の在庫がいまある店（XPERIA_SHOPS のうち） */
export async function activeXperiaShops(): Promise<Shop[]> {
  const names = await activePrefixShopNames("Xperia", XPERIA_SHOPS);
  return XPERIA_SHOPS.filter((s) => names.has(s.name));
}

/** AQUOS の在庫がいまある店（AQUOS_SHOPS のうち） */
export async function activeAquosShops(): Promise<Shop[]> {
  const names = await activePrefixShopNames("AQUOS", AQUOS_SHOPS);
  return AQUOS_SHOPS.filter((s) => names.has(s.name));
}

/** Apple Watch の在庫がいまある店（WATCH_SHOPS のうち。2026-10-15〜） */
export async function activeWatchShops(): Promise<Shop[]> {
  const names = await activePrefixShopNames("Apple Watch", WATCH_SHOPS);
  return WATCH_SHOPS.filter((s) => names.has(s.name));
}

/** 機種の種類（iPad なら iPad を扱う店など）ごとの、いま在庫がある店。MacBook・Xperia・AQUOS・Apple Watch はその種類の在庫がある店 */
export const activeShopsFor = (model: string) =>
  /^MacBook/.test(model) ? activeMacShops()
  : /^Xperia/.test(model) ? activeXperiaShops()
  : /^AQUOS/.test(model) ? activeAquosShops()
  : /^Apple Watch/.test(model) ? activeWatchShops()
  : activeShops(shopsFor(model));

export async function isShopActive(name: string): Promise<boolean> {
  return (await activeShopNames()).has(name);
}
