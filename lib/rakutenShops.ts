import type { Prisma } from "@prisma/client";
import { LEGACY_GEO_SHOP, RAKUTEN_GEO_SHOP, normalizeRakutenGeoItem } from "@/lib/rakutenGeo";
import type { RakutenItem } from "@/lib/rakutenCommon";
import { RAKUTEN_JANPARA_SHOP, normalizeJanparaItem } from "@/lib/rakutenJanpara";
import { RAKUTEN_SOFMAP_SHOP, normalizeSofmapItem } from "@/lib/rakutenSofmap";
import { normalizeGeoIpad, normalizeJanparaIpad, normalizeSofmapIpad } from "@/lib/rakutenIpad";

export type { RakutenItem };

type RakutenShop = {
  /** DeviceInventory.shopName */
  shopName: string;
  /** 洗い替えのときに一緒に消す旧ショップ名 */
  alsoReplace: string[];
  normalize: (item: RakutenItem) => Prisma.DeviceInventoryCreateManyInput | null;
};

type Normalize = RakutenShop["normalize"];

/** 商品名に iPad を含むものは iPad 用、それ以外は iPhone 用の読み取りに回す */
function byDevice(iphone: Normalize, ipad: (shopName: string, item: RakutenItem) => ReturnType<Normalize>, shopName: string): Normalize {
  return (item) => (/iPad/.test(item.name) ? ipad(shopName, item) : iphone(item));
}

/** 楽天市場 商品検索API で取り込むショップ（キーは楽天の shopCode）。iPhone と iPad を同じショップ名で持つ */
export const RAKUTEN_SHOPS: Record<string, RakutenShop> = {
  "geo-mobile": {
    shopName: RAKUTEN_GEO_SHOP,
    alsoReplace: [LEGACY_GEO_SHOP],
    normalize: byDevice(normalizeRakutenGeoItem, normalizeGeoIpad, RAKUTEN_GEO_SHOP),
  },
  janpara: {
    shopName: RAKUTEN_JANPARA_SHOP,
    alsoReplace: [],
    normalize: byDevice(normalizeJanparaItem, normalizeJanparaIpad, RAKUTEN_JANPARA_SHOP),
  },
  "akiba-u-shop": {
    shopName: RAKUTEN_SOFMAP_SHOP,
    alsoReplace: [],
    normalize: byDevice(normalizeSofmapItem, normalizeSofmapIpad, RAKUTEN_SOFMAP_SHOP),
  },
};

/** 楽天経由の在庫のショップ名（リンクは楽天アフィリエイトだけにする） */
export const RAKUTEN_SHOP_NAMES = new Set(Object.values(RAKUTEN_SHOPS).map((s) => s.shopName));
