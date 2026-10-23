import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { factorTiles, getPriceFactors } from "@/lib/priceFactors";

// 「中古iPhoneの値段は何で決まる？」（/iphone/price-factors）の OGP 画像。ページ冒頭の4つの数字と同じ（lib/priceFactors.ts の factorTiles）。
// X などでは小さく表示されるので、文字は大きく・少なく（補足・日付・URL は出さない。10/23 ユーザーの指示）。ビルドのたびに作る
export const dynamic = "force-static";

export const alt = "中古iPhoneの値段は何で決まる？世代・状態ランク・容量・電池の差";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const tiles = factorTiles(await getPriceFactors());
  // タイルの見出しは短く（小さい画像でも読めるように）
  const short: Record<string, string> = { "1世代前にすると": "1世代前", "ランクA→Cで": "ランクC", "容量を1つ上げると": "容量アップ", "電池80→90%台で": "電池90%台" };

  const allText = ["中古iPhoneの値段は", "何で決まる？", "中古スマホ一括検索", ...tiles.flatMap((t) => [short[t.label] ?? t.label, t.value]), "0123456789.−+約万円"].join("");
  const fonts = await notoSansJp(allText);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "Noto Sans JP", padding: "48px 56px", color: "#0f172a" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: "#64748b" }}>中古iPhoneの値段は</div>
          <div style={{ fontSize: 104, fontWeight: 900, letterSpacing: -3, lineHeight: 1.1 }}>何で決まる？</div>
        </div>

        {/* 4つの差（横1列） */}
        {tiles.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36 }}>
            {tiles.map((t) => (
              <div key={t.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 260, padding: "30px 8px", borderRadius: 24, background: "#f1f5f9" }}>
                <div style={{ fontSize: 40, fontWeight: 900, color: "#475569" }}>{short[t.label] ?? t.label}</div>
                <div style={{ fontSize: 52, fontWeight: 900, color: t.tone === "save" ? "#047857" : "#0f172a", marginTop: 4 }}>{t.value.replace("約", "")}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flex: 1, alignItems: "flex-end", fontSize: 34, fontWeight: 900 }}>中古スマホ一括検索</div>
      </div>
    ),
    { ...size, fonts },
  );
}
