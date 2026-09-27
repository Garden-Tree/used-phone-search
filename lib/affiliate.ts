import { RAKUTEN_SHOP_NAMES } from "@/lib/rakutenShops";

// 楽天アフィリエイトID（公開情報。楽天ウェブサービスのアプリ管理画面に表示される）
const RAKUTEN_AFFILIATE_ID = "5356a96f.f87a73cf.5356a970.2f9f146a";

/** 楽天の商品URLを楽天アフィリエイト経由のURLにする */
export function rakutenAffiliateUrl(itemUrl: string): string {
  const u = encodeURIComponent(itemUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${u}&m=${u}`;
}

// A8.net の提携プログラム（ショップ名 → a8mat）。提携が増えたらここに足す（イオシスは審査待ち）
const A8_PROGRAMS: Record<string, string> = {
  "にこスマ": "45IED7+DCGUQI+4O7U+BW0YB",
  "エムモバ": "45IED7+DB9ZIY+5I5M+HUD03",
  "ダイワンテレコム": "45IED7+DD2ACA+3I5Y+ZPD5F",
};

/**
 * 商品ページへのリンク先。A8 提携ショップは A8 経由、楽天API で取得した商品は楽天アフィリエイト経由、
 * それ以外は商品ページそのもの。楽天の商品は規約上、楽天市場（楽天アフィリエイト）以外へはリンクしない
 */
export function affiliateUrl(shopName: string, url: string): string {
  if (RAKUTEN_SHOP_NAMES.has(shopName)) return rakutenAffiliateUrl(url);
  const a8mat = A8_PROGRAMS[shopName];
  if (a8mat) return `https://px.a8.net/svt/ejp?a8mat=${a8mat}&a8ejpredirect=${encodeURIComponent(url)}`;
  return url;
}

/** リンクがアフィリエイト経由か（Google のガイドラインに従い rel="sponsored" を付ける） */
export function isAffiliateUrl(href: string): boolean {
  return /^https:\/\/px\.a8\.net\/|\.afl\.rakuten\.co\.jp\//.test(href);
}
