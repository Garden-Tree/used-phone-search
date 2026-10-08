import prisma from "@/lib/prisma";
import { RAKUTEN_SHOPS, type RakutenItem } from "@/lib/rakutenShops";

/**
 * 楽天市場店の在庫の洗い替え（ショップ単位）。
 * Vercel 版は /api/ingest/rakuten が fetch.php からの POST を受けて呼び、
 * Cloudflare Pages 版（静的書き出し）は scripts/ingest-rakuten.ts が、サーバーに置かれた JSON を Actions が取ってきてから呼ぶ
 */

// 取得件数が既存の何割未満なら洗い替えを中止するか（scraper/common.py の ensure_safe_to_replace と同じ考え方）
const MIN_REPLACE_RATIO = 0.5;
const MIN_EXISTING_TO_CHECK = 20;
const INSERT_CHUNK = 1000;

export type IngestResult =
  | { ok: true; shop: string; received: number; inserted: number; skipped: number; skippedSamples: string[] }
  | { ok: false; status: number; error: string; detail?: string };

export async function replaceRakutenShop(shopCode: string, items: RakutenItem[], force = false): Promise<IngestResult> {
  const shop = RAKUTEN_SHOPS[shopCode];
  if (!shop) return { ok: false, status: 400, error: "unknown shop", detail: shopCode };

  const rows = items.map(shop.normalize).filter((r) => r !== null);
  const skipped = items.filter((item) => shop.normalize(item) === null);

  // 1つのショップ名を複数の店で分け合うとき（ニューズドテック）は、この店の商品 URL の行だけを対象にする
  const scope = shop.sharedShopName
    ? { shopName: shop.shopName, url: { startsWith: `https://item.rakuten.co.jp/${shopCode}/` } }
    : { shopName: { in: [shop.shopName, ...shop.alsoReplace] } };
  const existing = await prisma.deviceInventory.count({
    where: shop.sharedShopName ? scope : { shopName: shop.shopName },
  });
  if (!force && existing >= MIN_EXISTING_TO_CHECK && rows.length < existing * MIN_REPLACE_RATIO) {
    return {
      ok: false,
      status: 409,
      error: "replace aborted",
      detail: `取得件数 ${rows.length} 件が既存 ${existing} 件の ${MIN_REPLACE_RATIO * 100}% 未満`,
    };
  }

  await prisma.$transaction(
    async (tx) => {
      // 旧スクレイパーで取り込んだ古い在庫（旧ゲオなど）も、楽天経由の在庫に置き換える
      await tx.deviceInventory.deleteMany({ where: scope });
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        await tx.deviceInventory.createMany({ data: rows.slice(i, i + INSERT_CHUNK) });
      }
    },
    { timeout: 60_000 },
  );

  return {
    ok: true,
    shop: shop.shopName,
    received: items.length,
    inserted: rows.length,
    skipped: skipped.length,
    skippedSamples: skipped.slice(0, 10).map((s) => s.name),
  };
}
