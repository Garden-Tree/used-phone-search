import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { getModelMarket, type ModelMarket } from "@/lib/marketStats";
import { rethrowDuringBuild } from "@/lib/buildGuard";
import { SITE } from "@/lib/brandColors";
import { OG_HEADER_TEXT, OgHeader } from "@/lib/ogHeader";

export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（1日4回の書き出しで数字が新しくなる）

// トップページ・検索ページなど、個別の画像を持たないページの共通 OGP 画像。
// 人気の中古 iPhone 4機種の最安値を 2×2 の大きなタイルで（10/23〜。X などでは小さく表示されるので文字は大きく・少なく。
// 10/21〜10/23 は5機種の最安値と相場の横棒、その前は店名を17個並べていて詰まっていた）
// alt は静的な文字列でなければならないので数字は入れない
export const alt = "中古スマホ一括検索 | 中古iPhoneの最安値を大手ショップから比較";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MODELS: { model: string; label: string }[] = [
  { model: "iPhone SE (第3世代)", label: "iPhone SE 3" },
  { model: "iPhone 13", label: "iPhone 13" },
  { model: "iPhone 15", label: "iPhone 15" },
  { model: "iPhone 16", label: "iPhone 16" },
];
// 色はサイトと同じ（lib/brandColors.ts = app/globals.css）
const RED = SITE.price, INK = SITE.ink, LINE = SITE.line, GROUND = SITE.ground;
const man = (v: number) => `${(Math.round(v / 1000) / 10).toFixed(1)}万円`;

export default async function Image() {
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
    return r ? [{ label, min: r.minPrice }] : [];
  });

  const title = "中古iPhone、いまいくら？";
  const fonts = await notoSansJp([OG_HEADER_TEXT, title, "〜万円0123456789.", ...rows.map((r) => r.label)].join(""));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: GROUND, fontFamily: "Noto Sans JP", color: INK }}>
        <OgHeader />
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "10px 48px 12px" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 900, lineHeight: 1.2 }}>{title}</div>
          {/* 4機種の最安値（2×2） */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", marginTop: 12 }}>
            {rows.map((r) => (
              <div key={r.label} style={{ display: "flex", flexDirection: "column", width: 540, padding: "8px 30px", marginBottom: 14, background: "white", border: `3px solid ${LINE}`, borderRadius: 24 }}>
                <div style={{ display: "flex", fontSize: 50, fontWeight: 900, lineHeight: 1.2 }}>{r.label}</div>
                <div style={{ display: "flex", fontSize: 88, fontWeight: 900, color: RED, lineHeight: 1 }}>{`${man(r.min)}〜`}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
