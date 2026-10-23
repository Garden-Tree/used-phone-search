import { SITE } from "@/lib/brandColors";

/**
 * OGP 画像の上の帯（全部の画像で共通・10/23〜）: 紺の地に、左にサイト名（52px）、右に URL。
 * 使う画像は notoSansJp に OG_HEADER_TEXT の文字も渡すこと
 */
export const OG_HEADER_HEIGHT = 96;
export const OG_HEADER_TEXT = "中古スマホ一括検索used.gadelog.com";

export function OgHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: OG_HEADER_HEIGHT, flexShrink: 0, padding: "0 48px 0 56px", background: SITE.brand900, color: "white" }}>
      <div style={{ display: "flex", fontSize: 52, fontWeight: 900 }}>中古スマホ一括検索</div>
      <div style={{ display: "flex", fontSize: 38, fontWeight: 700, opacity: 0.9 }}>used.gadelog.com</div>
    </div>
  );
}
