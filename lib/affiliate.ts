import { RAKUTEN_SHOP_NAMES } from "@/lib/rakutenShops";
import { YAHOO_SHOP_NAMES } from "@/lib/yahooShops";
import { AMAZON_SHOP_NAMES } from "@/lib/amazonShops";

// 楽天アフィリエイトID（公開情報。楽天ウェブサービスのアプリ管理画面に表示される）
const RAKUTEN_AFFILIATE_ID = "5356a96f.f87a73cf.5356a970.2f9f146a";

/** 楽天の商品URLを楽天アフィリエイト経由のURLにする */
export function rakutenAffiliateUrl(itemUrl: string): string {
  const u = encodeURIComponent(itemUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${u}&m=${u}`;
}

// ValueCommerce（Yahoo!ショッピングのアフィリエイト）のサイトID・プロモーションID。どちらもリンクの URL に出る公開の値（秘密ではない）。
// ビルド時に Secrets の VC_SID / VC_PID から入る（.github/workflows/scraper.yaml）。未設定のあいだは商品ページへ直接リンクする
const VC_SID = process.env.NEXT_PUBLIC_VC_SID ?? "";
const VC_PID = process.env.NEXT_PUBLIC_VC_PID ?? "";

/** Yahoo!ショッピングの商品URLを ValueCommerce 経由のURLにする（SID・PID が未設定なら商品ページそのもの） */
export function valueCommerceUrl(itemUrl: string): string {
  if (!VC_SID || !VC_PID) return itemUrl;
  return `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${VC_SID}&pid=${VC_PID}&vc_url=${encodeURIComponent(itemUrl)}`;
}

// A8.net の提携プログラム（ショップ名 → a8mat）。提携が増えたらここに足す（イオシスは審査待ち）
const A8_PROGRAMS: Record<string, string> = {
  "にこスマ": "45IED7+DCGUQI+4O7U+BW0YB",
  "エムモバ": "45IED7+DB9ZIY+5I5M+HUD03",
  "ダイワンテレコム": "45IED7+DD2ACA+3I5Y+ZPD5F",
};

/**
 * 商品ページへのリンク先。A8 提携ショップは A8 経由、楽天API で取得した商品は楽天アフィリエイト経由、
 * Yahoo!ショッピングAPI で取得した商品は ValueCommerce 経由、
 * それ以外は商品ページそのもの。楽天の商品は規約上、楽天市場（楽天アフィリエイト）以外へはリンクしない
 */
export function affiliateUrl(shopName: string, url: string): string {
  if (RAKUTEN_SHOP_NAMES.has(shopName)) return rakutenAffiliateUrl(url);
  if (YAHOO_SHOP_NAMES.has(shopName)) return valueCommerceUrl(url);
  // Amazon は Creators API が返す detailPageURL（アソシエイトのタグ付き）をそのまま使う。URL の加工は規約違反
  if (AMAZON_SHOP_NAMES.has(shopName)) return url;
  const a8mat = A8_PROGRAMS[shopName];
  if (a8mat) return `https://px.a8.net/svt/ejp?a8mat=${a8mat}&a8ejpredirect=${encodeURIComponent(url)}`;
  return url;
}

/** リンクがアフィリエイト経由か（Google のガイドラインに従い rel="sponsored" を付ける） */
export function isAffiliateUrl(href: string): boolean {
  return /^https:\/\/px\.a8\.net\/|\.afl\.rakuten\.co\.jp\/|^https:\/\/ck\.jp\.ap\.valuecommerce\.com\/|^https:\/\/www\.amazon\.co\.jp\/[^#]*[?&]tag=/.test(href);
}

/** リンクの種類（GA4 の shop_click イベントで、収益になるクリックかを分けるため） */
export function affiliateLinkType(href: string): "rakuten" | "a8" | "vc" | "amazon" | "direct" {
  if (/\.afl\.rakuten\.co\.jp\//.test(href)) return "rakuten";
  if (/^https:\/\/px\.a8\.net\//.test(href)) return "a8";
  if (/^https:\/\/ck\.jp\.ap\.valuecommerce\.com\//.test(href)) return "vc";
  if (/^https:\/\/www\.amazon\.co\.jp\/[^#]*[?&]tag=/.test(href)) return "amazon";
  return "direct";
}
