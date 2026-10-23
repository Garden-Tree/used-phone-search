import { ImageResponse } from "next/og";
import { COMPARE_PAIRS, compareSlug, slugToPair } from "@/lib/compare";
import { getModelStats } from "@/lib/modelStats";
import { fitFontSize, notoSansJp } from "@/lib/ogFont";
import { OG_HEADER_TEXT, OgHeader } from "@/lib/ogHeader";

export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
export const dynamicParams = false;

export const alt = "中古iPhoneの価格比較";
// X などでは小さく表示されるので文字は大きく（10/23〜。URL は出さない）
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return COMPARE_PAIRS.map(([a, b]) => ({ slug: compareSlug(a, b) }));
}

// 画像では括弧を外して1行に収める（"iPhone SE (第3世代)" → "iPhone SE 第3世代"）
const display = (model: string) => model.replace(/\s*\((.+)\)/, " $1");
// カード（内側 約380px）からはみ出さない文字サイズ
const nameFontSize = (name: string) => fitFontSize(name, 440, 74);
// 左右のカードは同じ幅（左右対称）。間に VS
const CARD_W = 480;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [a, b] = slugToPair(slug) ?? ["iPhone", "iPhone"];
  const [sa, sb] = await Promise.all([getModelStats(a), getModelStats(b)]);

  const sides = [
    { name: display(a), price: sa.minPrice },
    { name: display(b), price: sb.minPrice },
  ];
  const title = "中古はどっちがお得？";
  const fonts = await notoSansJp(
    [title, "最安値", "円〜", "在庫なし", "VS", OG_HEADER_TEXT,
      ...sides.flatMap((s) => [s.name, s.price?.toLocaleString() ?? ""])].join(""),
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "Noto Sans JP", color: "#0f172a" }}>
        <OgHeader />
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "20px 44px 32px" }}>
        <div style={{ fontSize: 74, fontWeight: 900, textAlign: "center", display: "flex", justifyContent: "center" }}>{title}</div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          {sides.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flexDirection: i === 0 ? "row" : "row-reverse" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: CARD_W, background: "#f1f5f9", borderRadius: 32, padding: "36px 16px" }}>
                <div style={{ fontSize: nameFontSize(s.name), fontWeight: 900, letterSpacing: -1, whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: "#64748b", marginTop: 12 }}>最安値</div>
                {s.price !== null ? (
                  <div style={{ display: "flex", alignItems: "baseline", color: "#dc2626", marginTop: 4 }}>
                    <div style={{ fontSize: s.price >= 1_000_000 ? 82 : 100, fontWeight: 900, letterSpacing: -3 }}>{s.price.toLocaleString()}</div>
                    <div style={{ fontSize: 46, fontWeight: 900, marginLeft: 6 }}>円〜</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 56, fontWeight: 900, color: "#94a3b8", marginTop: 12 }}>在庫なし</div>
                )}
              </div>
              {i === 0 && (
                <div style={{ display: "flex", justifyContent: "center", width: 1112 - CARD_W * 2, fontSize: 52, fontWeight: 900, color: "#2563eb" }}>VS</div>
              )}
            </div>
          ))}
        </div>

        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
