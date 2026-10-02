// サイト全体で共有する設定値
import { shopLabels } from "@/lib/shops";

export const SITE_NAME = "中古スマホ一括検索";

export const SITE_DESCRIPTION =
  `${shopLabels()}の中古iPhone・iPad・Google Pixel・Galaxy在庫を一括比較。価格・状態ランク・容量・バッテリー残量で絞り込んで、欲しいモデルの最安値がすぐ見つかります。`;

// 本番URLは環境変数で指定（sitemap / canonical / OGP の絶対URLに使用）
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
