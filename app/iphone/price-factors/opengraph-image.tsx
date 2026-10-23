import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { factorTiles, getPriceFactors } from "@/lib/priceFactors";

// 「中古iPhoneの値段は何で決まる？」（/iphone/price-factors）の OGP 画像。ページ冒頭の4つの数字と同じ（lib/priceFactors.ts の factorTiles）。
// ビルドのたびに作る。見た目は相場一覧（app/iphone/opengraph-image.tsx）とそろえる
export const dynamic = "force-static";

export const alt = "中古iPhoneの値段は何で決まる？世代・状態ランク・容量・電池の差";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const tiles = factorTiles(await getPriceFactors());
  const updated = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });

  const allText = [
    "中古iPhoneの値段は", "何で決まる？", "同じ機種・容量で", "1つだけ変えたときの相場の差（平均）", "節約は世代とランク", "容量と電池はケチらない",
    `${updated} 更新`, "中古スマホ一括検索", "used.gadelog.com", ...tiles.flatMap((t) => [t.label, t.value, t.note]), "0123456789.−+約万円",
  ].join("");
  const fonts = await notoSansJp(allText);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "Noto Sans JP", padding: "56px 64px", color: "#0f172a" }}>
        <div style={{ display: "flex", flex: 1 }}>
          {/* 左: タイトル */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ fontSize: 40, fontWeight: 500, color: "#64748b" }}>中古iPhoneの値段は</div>
            <div style={{ fontSize: 80, fontWeight: 900, letterSpacing: -2, lineHeight: 1.15 }}>何で決まる？</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#dc2626", marginTop: 22 }}>節約は世代とランク</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#0f172a", marginTop: 6 }}>容量と電池はケチらない</div>
          </div>

          {/* 右: 4つの差（2×2） */}
          {tiles.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", width: 520, marginLeft: 32, justifyContent: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: "#64748b", marginBottom: 12 }}>1つだけ変えたときの相場の差（平均）</div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between" }}>
                {tiles.map((t) => (
                  <div key={t.label} style={{ display: "flex", flexDirection: "column", width: 252, padding: "16px 18px", marginBottom: 14, borderRadius: 16, background: "#f1f5f9" }}>
                    <div style={{ fontSize: 22, fontWeight: 500, color: "#64748b" }}>{t.label}</div>
                    <div style={{ fontSize: 38, fontWeight: 900, color: t.tone === "save" ? "#047857" : "#0f172a", marginTop: 2 }}>{t.value}</div>
                    <div style={{ fontSize: 18, fontWeight: 500, color: "#94a3b8", marginTop: 2 }}>{t.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* フッター: サイト名と更新日（ほかの画像とそろえる） */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #e2e8f0", paddingTop: 24, fontSize: 28 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>中古スマホ一括検索</div>
            <div style={{ fontWeight: 500, color: "#94a3b8", marginLeft: 16 }}>used.gadelog.com</div>
          </div>
          <div style={{ fontWeight: 500, color: "#64748b" }}>{`${updated} 更新`}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
