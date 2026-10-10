import type { Prisma } from "@prisma/client";
import { LEGACY_GEO_SHOP, RAKUTEN_GEO_SHOP, normalizeRakutenGeoItem } from "@/lib/rakutenGeo";
import type { RakutenItem } from "@/lib/rakutenCommon";
import { RAKUTEN_JANPARA_SHOP, normalizeJanparaItem } from "@/lib/rakutenJanpara";
import { RAKUTEN_SOFMAP_SHOP, normalizeSofmapItem } from "@/lib/rakutenSofmap";
import { normalizeGeoIpad, normalizeJanparaIpad, normalizeSofmapIpad } from "@/lib/rakutenIpad";
import { normalizeGeoPixel, normalizeJanparaPixel, normalizeSofmapPixel } from "@/lib/rakutenPixel";
import { normalizeGeoGalaxy, normalizeJanparaGalaxy, normalizeSofmapGalaxy } from "@/lib/rakutenGalaxy";
import { RAKUTEN_NEWSEDTECH_SHOP, normalizeNewsedtechItem } from "@/lib/rakutenNewsedtech";
import { RAKUTEN_KITAMURA_SHOP, normalizeKitamuraItem } from "@/lib/rakutenKitamura";
import { RAKUTEN_MTM_SHOP, normalizeMtmItem } from "@/lib/rakutenMtm";
import { RAKUTEN_IOSYS_SHOP, normalizeIosysItem } from "@/lib/rakutenIosys";

export type { RakutenItem };

type RakutenShop = {
  /** DeviceInventory.shopName */
  shopName: string;
  /** 洗い替えのときに一緒に消す旧ショップ名 */
  alsoReplace: string[];
  /**
   * 複数の楽天の店（shopCode）を1つのショップ名で見せる（ニューズドテックの1号店・2号店）。
   * true のときの洗い替えは、そのショップ名の行のうち、この shopCode の商品 URL（item.rakuten.co.jp/<shopCode>/）の行だけを入れ替える
   */
  sharedShopName?: boolean;
  normalize: (item: RakutenItem) => Prisma.DeviceInventoryCreateManyInput | null;
};

type Normalize = RakutenShop["normalize"];

type ByShop = (shopName: string, item: RakutenItem) => ReturnType<Normalize>;

/** 商品名に iPad を含むものは iPad 用、Pixel・Galaxy を含むものはそれぞれ用（2026-09-30〜）、それ以外は iPhone 用の読み取りに回す */
function byDevice(iphone: Normalize, ipad: ByShop, pixel: ByShop, galaxy: ByShop, shopName: string): Normalize {
  return (item) =>
    /iPad/.test(item.name) ? ipad(shopName, item)
    : /Pixel/i.test(item.name) ? pixel(shopName, item)
    : /Galaxy/i.test(item.name) ? galaxy(shopName, item)
    : iphone(item);
}

/** 楽天市場 商品検索API で取り込むショップ（キーは楽天の shopCode）。iPhone・iPad・Pixel・Galaxy を同じショップ名で持つ */
export const RAKUTEN_SHOPS: Record<string, RakutenShop> = {
  "geo-mobile": {
    shopName: RAKUTEN_GEO_SHOP,
    alsoReplace: [LEGACY_GEO_SHOP],
    normalize: byDevice(normalizeRakutenGeoItem, normalizeGeoIpad, normalizeGeoPixel, normalizeGeoGalaxy, RAKUTEN_GEO_SHOP),
  },
  janpara: {
    shopName: RAKUTEN_JANPARA_SHOP,
    alsoReplace: [],
    normalize: byDevice(normalizeJanparaItem, normalizeJanparaIpad, normalizeJanparaPixel, normalizeJanparaGalaxy, RAKUTEN_JANPARA_SHOP),
  },
  "akiba-u-shop": {
    shopName: RAKUTEN_SOFMAP_SHOP,
    alsoReplace: [],
    normalize: byDevice(normalizeSofmapItem, normalizeSofmapIpad, normalizeSofmapPixel, normalizeSofmapGalaxy, RAKUTEN_SOFMAP_SHOP),
  },
  // ニューズドテック（2026-10-08〜）。1号店・2号店とも同じ書き方で、画面では1つの店として出す
  "kamaya-awards": { shopName: RAKUTEN_NEWSEDTECH_SHOP, alsoReplace: [], sharedShopName: true, normalize: normalizeNewsedtechItem },
  garakei: { shopName: RAKUTEN_NEWSEDTECH_SHOP, alsoReplace: [], sharedShopName: true, normalize: normalizeNewsedtechItem },
  // カメラのキタムラ（2026-10-08〜）
  emedama: { shopName: RAKUTEN_KITAMURA_SHOP, alsoReplace: [], normalize: normalizeKitamuraItem },
  // エムティーエム（2026-10-09〜）
  ekosuta: { shopName: RAKUTEN_MTM_SHOP, alsoReplace: [], normalize: normalizeMtmItem },
  // イオシス（2026-10-08〜）。公式サイトと同じ商品は、取り込みのあと scripts/link-duplicate-shops.ts が公式の行に添えて消す
  "pc-good": { shopName: RAKUTEN_IOSYS_SHOP, alsoReplace: [], normalize: normalizeIosysItem },
};

/** 楽天経由の在庫のショップ名（リンクは楽天アフィリエイトだけにする） */
export const RAKUTEN_SHOP_NAMES = new Set(Object.values(RAKUTEN_SHOPS).map((s) => s.shopName));
