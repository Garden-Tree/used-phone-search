import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { activeShops } from "@/lib/activeShops";
import { getModelMarket, type ModelMarket } from "@/lib/marketStats";
import { rethrowDuringBuild } from "@/lib/buildGuard";

export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（1日4回の書き出しで数字が新しくなる）

// トップページ・検索ページなど、個別の画像を持たないページの共通 OGP 画像。
// 人気の中古 iPhone の最安値（赤）と相場（灰）の横棒（10/21〜。前は店名を17個並べていて詰まっていた）
// alt は静的な文字列でなければならないので数字は入れない
export const alt = "中古スマホ一括検索 | 中古iPhoneの最安値と相場を大手ショップから比較";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MODELS: { model: string; label: string }[] = [
  { model: "iPhone SE (第3世代)", label: "iPhone SE 3" },
  { model: "iPhone 13", label: "iPhone 13" },
  { model: "iPhone 14", label: "iPhone 14" },
  { model: "iPhone 15", label: "iPhone 15" },
  { model: "iPhone 16", label: "iPhone 16" },
];
const NAVY = "#1E1B4B", RED = "#E11D48", GRAY = "#CBD5E1", INK = "#0F172A", SUB = "#64748B";
const BAR = 460; // 横棒の幅（px）
const man = (v: number) => `${(Math.round(v / 1000) / 10).toFixed(1)}万`;

export default async function Image() {
  const SHOPS = await activeShops();
  let market = new Map<string, ModelMarket>();
  try {
    market = await getModelMarket(MODELS.map((m) => m.model));
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("og market failed:", error);
  }
  // 在庫のない機種は出さない
  const rows = MODELS.flatMap(({ model, label }) => {
    const r = market.get(model);
    return r ? [{ label, min: r.minPrice, med: r.medianPrice }] : [];
  });
  // 横軸: 相場の最大値 × 1.1
  const axis = Math.max(1, ...rows.map((r) => r.med)) * 1.1;

  const title = "中古iPhone、いまいくら？";
  const foot = `大手中古ショップ${SHOPS.length}店の在庫から毎日集計（相場＝いちばん在庫の多い容量の中央値）`;
  const fonts = await notoSansJp(
    ["中古スマホ一括検索", "used.gadelog.com", title, foot, "最安値相場〜万0123456789.", ...rows.map((r) => r.label)].join(""),
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Noto Sans JP", color: INK }}>
        {/* 上の帯: サイト名と URL */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 92, padding: "0 56px", background: NAVY, color: "white" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 900 }}>中古スマホ一括検索</div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 500, opacity: 0.85 }}>used.gadelog.com</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "24px 56px 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 900 }}>{title}</div>
            <div style={{ display: "flex", alignItems: "center", fontSize: 22, color: SUB }}>
              <div style={{ display: "flex", width: 22, height: 14, background: RED, borderRadius: 4, marginRight: 8 }} />
              最安値
              <div style={{ display: "flex", width: 22, height: 14, background: GRAY, borderRadius: 4, margin: "0 8px 0 24px" }} />
              相場
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 18, background: "white", border: "2px solid #E2E8F0", borderRadius: 24, padding: "14px 32px" }}>
            {rows.map((r, i) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", height: 66, borderTop: i ? "2px solid #F1F5F9" : "none" }}>
                <div style={{ display: "flex", width: 220, flexShrink: 0, fontSize: 30, fontWeight: 900 }}>{r.label}</div>
                <div style={{ display: "flex", width: BAR, flexShrink: 0, height: 26, background: "#F1F5F9", borderRadius: 6 }}>
                  <div style={{ display: "flex", width: Math.round((BAR * r.min) / axis), height: 26, background: RED, borderRadius: "6px 0 0 6px" }} />
                  <div style={{ display: "flex", width: Math.round((BAR * Math.max(0, r.med - r.min)) / axis), height: 26, background: GRAY, borderRadius: "0 6px 6px 0" }} />
                </div>
                {/* 右の数字は列の幅を固定して右揃え（桁が変わっても縦にそろう） */}
                <div style={{ display: "flex", width: 190, flexShrink: 0, justifyContent: "flex-end", fontSize: 34, fontWeight: 900, color: RED }}>{`${man(r.min)}〜`}</div>
                <div style={{ display: "flex", width: 150, flexShrink: 0, justifyContent: "flex-end", fontSize: 22, color: SUB }}>{`相場 ${man(r.med)}`}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", fontSize: 21, color: SUB, marginTop: 12 }}>{foot}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
