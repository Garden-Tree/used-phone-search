import prisma from "@/lib/prisma";
import { SHOPS, findShop, shopsFor, type Shop } from "@/lib/shops";

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

/** 機種の種類（iPad なら iPad を扱う店など）ごとの、いま在庫がある店 */
export const activeShopsFor = (model: string) => activeShops(shopsFor(model));

export async function isShopActive(name: string): Promise<boolean> {
  return (await activeShopNames()).has(name);
}
