import type { Prisma } from "@prisma/client";
import type { RakutenItem } from "@/lib/rakutenCommon";
import { AMAZON_RENEWED_SHOP, normalizeAmazonItem } from "@/lib/amazonRenewed";

/**
 * Amazon.co.jp 整備済み品（Creators API）。キーは取得ファイル名（amazon-data/amazon.json.gz）。
 * 取得は scripts/fetch-amazon.ts、取り込みは scripts/ingest-rakuten.ts --family amazon（楽天と同じ洗い替え・安全装置）。
 * 商品は RakutenItem の形に詰めて渡す。リンクは API が返した detailPageURL（アソシエイトのタグ付き）をそのまま使う（lib/affiliate.ts）。
 * Amazon の価格は価格推移に使わない（API 規約。lib/priceHistory.ts で除外）
 */
export type AmazonShop = {
  shopName: string;
  normalize: (item: RakutenItem) => Prisma.DeviceInventoryCreateManyInput | null;
};

export const AMAZON_SHOPS: Record<string, AmazonShop> = {
  amazon: { shopName: AMAZON_RENEWED_SHOP, normalize: normalizeAmazonItem },
};

export const AMAZON_SHOP_NAMES = new Set(Object.values(AMAZON_SHOPS).map((s) => s.shopName));
