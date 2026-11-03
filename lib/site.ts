// サイト全体で共有する設定値
import { shopLabels, type Shop } from "@/lib/shops";

export const SITE_NAME = "中古スマホ一括検索";

// ページごとの openGraph は layout の openGraph を丸ごと置き換えるので（Next の metadata は浅いマージ）、og:site_name などが消える。
// 各ページの openGraph に広げて入れる（11/3。ChatGPT の引用で、サイト名がなく「中古価格比較」と出ていた）
export const OG_BASE = { type: "website", locale: "ja_JP", siteName: SITE_NAME } as const;

/** サイトの説明文。店の一覧は、いま在庫がある店（lib/activeShops.ts の activeShops()）を渡す */
export const siteDescription = (shops: Shop[]) =>
  `${shopLabels(shops.slice(0, 3))}など${shops.length}店の中古iPhone・iPad・Google Pixel・Galaxy在庫を一括比較。価格・状態ランク・容量・バッテリー残量で絞り込んで、最安値がすぐ見つかります。`;

// 本番URLは環境変数で指定（sitemap / canonical / OGP の絶対URLに使用）
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

// 公式アカウント（フッター・/about・トップの JSON-LD の sameAs で使う）
export const OFFICIAL_X_URL = "https://x.com/used_gadelog";
export const OFFICIAL_YOUTUBE_URL = "https://www.youtube.com/@used_gadelog";
export const OFFICIAL_ACCOUNTS = [OFFICIAL_X_URL, OFFICIAL_YOUTUBE_URL];
