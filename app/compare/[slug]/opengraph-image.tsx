import { ImageResponse } from "next/og";
import { COMPARE_PAIRS, compareSlug, slugToPair } from "@/lib/compare";
import { getModelStats } from "@/lib/modelStats";
import { fitFontSize, notoSansJp } from "@/lib/ogFont";

export const revalidate = 3600;
export const dynamicParams = false;

export const alt = "中古iPhoneの価格比較";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return COMPARE_PAIRS.map(([a, b]) => ({ slug: compareSlug(a, b) }));
}

// 画像では括弧を外して1行に収める（"iPhone SE (第3世代)" → "iPhone SE 第3世代"）
const display = (model: string) => model.replace(/\s*\((.+)\)/, " $1");
// カード（内側 約380px）からはみ出さない文字サイズ
const nameFontSize = (name: string) => fitFontSize(name, 380, 54);

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
    [title, "中古最安値", "円〜", "在庫なし", "VS", "中古スマホ一括検索", "used.gadelog.com",
      ...sides.flatMap((s) => [s.name, s.price?.toLocaleString() ?? ""])].join(""),
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "Noto Sans JP", color: "#0f172a", padding: "48px 56px" }}>
        <div style={{ fontSize: 44, fontWeight: 900, textAlign: "center", display: "flex", justifyContent: "center" }}>{title}</div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", marginTop: 16 }}>
          {sides.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, background: "#f8fafc", borderRadius: 32, padding: "40px 24px" }}>
                <div style={{ fontSize: nameFontSize(s.name), fontWeight: 900, letterSpacing: -1, whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ fontSize: 26, fontWeight: 500, color: "#64748b", marginTop: 20 }}>中古最安値</div>
                {s.price !== null ? (
                  <div style={{ display: "flex", alignItems: "baseline", color: "#dc2626", marginTop: 4 }}>
                    <div style={{ fontSize: 84, fontWeight: 900, letterSpacing: -3 }}>{s.price.toLocaleString()}</div>
                    <div style={{ fontSize: 36, fontWeight: 900, marginLeft: 6 }}>円〜</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 56, fontWeight: 900, color: "#94a3b8", marginTop: 12 }}>在庫なし</div>
                )}
              </div>
              {i === 0 && (
                <div style={{ fontSize: 44, fontWeight: 900, color: "#2563eb", margin: "0 24px" }}>VS</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", fontSize: 26, marginTop: 24 }}>
          <div style={{ fontWeight: 900 }}>中古スマホ一括検索</div>
          <div style={{ fontWeight: 500, color: "#94a3b8", marginLeft: 16 }}>used.gadelog.com</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
