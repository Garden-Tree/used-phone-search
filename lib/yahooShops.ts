import type { Prisma } from "@prisma/client";
import type { RakutenItem } from "@/lib/rakutenCommon";
import { YAHOO_QUALITY_SHOP, normalizeQualityShopItem } from "@/lib/yahooQualityShop";
import { YAHOO_MOBILESTATION, normalizeMobilestationItem } from "@/lib/yahooMobilestation";
import { YAHOO_MCOM, normalizeMcomItem } from "@/lib/yahooMcom";
import { YAHOO_REUSMA, normalizeReusmaItem } from "@/lib/yahooReusma";
import { YAHOO_JOSHIN, normalizeJoshinItem } from "@/lib/yahooJoshin";
import { YAHOO_MYWIT, normalizeMywitItem } from "@/lib/yahooMywit";
import { YAHOO_BESTOCK, normalizeBeStockItem } from "@/lib/yahooBeStock";

/**
 * Yahoo!ショッピング 商品検索API（v3）で取り込むストア（キーは Yahoo!ショッピングのストアID＝seller_id。
 * 店のURLが store.shopping.yahoo.co.jp/<ストアID>/ の <ストアID>）。
 * 取得は scripts/fetch-yahoo.ts、取り込みは scripts/ingest-rakuten.ts --family yahoo（楽天と同じ洗い替え・安全装置）。
 * 商品は RakutenItem の形に詰めて渡す（読み取りの部品・テストの仕組みを楽天と共通にするため）
 */
export type YahooShop = {
  /** DeviceInventory.shopName */
  shopName: string;
  normalize: (item: RakutenItem) => Prisma.DeviceInventoryCreateManyInput | null;
};

export const YAHOO_SHOPS: Record<string, YahooShop> = {
  // Quality Shop（2026-10-09〜）
  "quality-shop": { shopName: YAHOO_QUALITY_SHOP, normalize: normalizeQualityShopItem },
  // 以下は 2026-10-09 に商品名・商品説明を確かめて追加（商品名の例は各ファイルの先頭）
  mobilestation: { shopName: YAHOO_MOBILESTATION, normalize: normalizeMobilestationItem },
  mcom2022: { shopName: YAHOO_MCOM, normalize: normalizeMcomItem },
  reusma: { shopName: YAHOO_REUSMA, normalize: normalizeReusmaItem },
  jtus2014: { shopName: YAHOO_JOSHIN, normalize: normalizeJoshinItem },
  mywit: { shopName: YAHOO_MYWIT, normalize: normalizeMywitItem },
  "be-stocktsb": { shopName: YAHOO_BESTOCK, normalize: normalizeBeStockItem },
};

/** Yahoo!ショッピング経由の在庫のショップ名（リンクは ValueCommerce 経由にする。lib/affiliate.ts） */
export const YAHOO_SHOP_NAMES = new Set(Object.values(YAHOO_SHOPS).map((s) => s.shopName));
