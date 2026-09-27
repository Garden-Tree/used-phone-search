import type { Prisma } from "@prisma/client";
import { LEGACY_GEO_SHOP, RAKUTEN_GEO_SHOP, normalizeRakutenGeoItem, type RakutenGeoItem } from "@/lib/rakutenGeo";
import { RAKUTEN_JANPARA_SHOP, normalizeJanparaItem } from "@/lib/rakutenJanpara";

/** rakuten-sync/fetch.php が送ってくる1商品（batt はキャプションから読めたときだけ） */
export type RakutenItem = RakutenGeoItem & { batt?: number | null };

type RakutenShop = {
  /** DeviceInventory.shopName */
  shopName: string;
  /** 洗い替えのときに一緒に消す旧ショップ名 */
  alsoReplace: string[];
  normalize: (item: RakutenItem) => Prisma.DeviceInventoryCreateManyInput | null;
};

/** 楽天市場 商品検索API で取り込むショップ（キーは楽天の shopCode） */
export const RAKUTEN_SHOPS: Record<string, RakutenShop> = {
  "geo-mobile": { shopName: RAKUTEN_GEO_SHOP, alsoReplace: [LEGACY_GEO_SHOP], normalize: normalizeRakutenGeoItem },
  janpara: { shopName: RAKUTEN_JANPARA_SHOP, alsoReplace: [], normalize: normalizeJanparaItem },
};

/** 楽天経由の在庫のショップ名（リンクは楽天アフィリエイトだけにする） */
export const RAKUTEN_SHOP_NAMES = new Set(Object.values(RAKUTEN_SHOPS).map((s) => s.shopName));
