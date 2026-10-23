import { SITE } from "@/lib/brandColors";

/**
 * OGP 画像の上の帯（全部の画像で共通・10/23〜）: 紺の地に、左にロゴ（案1の紺の地版。docs/design.md）、右に URL。
 * 記号は白の角丸（一辺の 21.5%）に紺の「中」（一辺の 78%・上に 4.3% ずらす）。「一括検索」だけ #A5B4FC。
 * 使う画像は notoSansJp に OG_HEADER_TEXT の文字も渡すこと
 */
export const OG_HEADER_HEIGHT = 96;
export const OG_HEADER_TEXT = "中古スマホ一括検索used.gadelog.com";

const MARK = 64;

export function OgHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: OG_HEADER_HEIGHT, flexShrink: 0, padding: "0 48px 0 48px", background: SITE.brand900, color: "white" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", width: MARK, height: MARK, alignItems: "center", justifyContent: "center", borderRadius: MARK * 0.215, background: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", position: "relative", top: -MARK * 0.043, fontSize: MARK * 0.78, fontWeight: 900, color: SITE.brand900, lineHeight: 1 }}>中</div>
        </div>
        <div style={{ display: "flex", marginLeft: 18, fontSize: 50, fontWeight: 900, letterSpacing: -1 }}>
          中古スマホ<span style={{ color: "#A5B4FC" }}>一括検索</span>
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 38, fontWeight: 700, opacity: 0.9 }}>used.gadelog.com</div>
    </div>
  );
}
