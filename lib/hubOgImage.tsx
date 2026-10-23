import { ImageResponse } from "next/og";
import { minPriceByModel } from "@/lib/budgetStats";
import { getModelMarket } from "@/lib/marketStats";
import { fitFontSize, notoSansJp } from "@/lib/ogFont";
import { rethrowDuringBuild } from "@/lib/buildGuard";
import { SITE } from "@/lib/brandColors";
import { OG_HEADER_TEXT, OgHeader } from "@/lib/ogHeader";

/**
 * 一覧ページ（/iphone・/ipad・/pixel・/galaxy・/mac・/watch・/xperia・/aquos）の OGP 画像（各ページの opengraph-image.tsx から呼ぶ。size は 1200×630）。
 * X などでは小さく表示されるので、文字は大きく・少なく（10/23 ユーザーの指示）: 「中古○○の相場」と3機種の相場だけ。
 * 並べる機種は picks（決めた機種）か、なければ在庫の多い3機種。相場の安い順に並べる
 */
const SIZE = { width: 1200, height: 630 };
const RED = SITE.price, INK = SITE.ink, LINE = SITE.line, TRACK = SITE.lineSoft, GROUND = SITE.ground;
const ROWS = 3;

export async function hubOgImage(label: string, models: string[], picks?: string[]) {
  let rows: { name: string; median: number }[] = [];
  try {
    const chosen = picks ?? [...(await minPriceByModel({ isSoldOut: false }, models)).entries()]
      .sort((a, b) => b[1].count - a[1].count).slice(0, ROWS).map(([m]) => m);
    const market = await getModelMarket(chosen);
    rows = chosen.flatMap((m) => {
      const r = market.get(m);
      // 画像では括弧を外す（"iPad Air (第5世代)" → "iPad Air 第5世代"）
      return r ? [{ name: m.replace(/\s*\((.+)\)/, " $1"), median: r.medianPrice }] : [];
    }).sort((a, b) => a.median - b.median).slice(0, ROWS);
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("hub og failed:", error);
  }

  const title = `中古${label}の相場`;
  const fonts = await notoSansJp([OG_HEADER_TEXT, title, "円0123456789,", ...rows.map((r) => r.name)].join(""));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: GROUND, fontFamily: "Noto Sans JP", color: INK }}>
        <OgHeader />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1, padding: "8px 48px 18px" }}>
          <div style={{ display: "flex", fontSize: fitFontSize(title, 1100, 92, 52), fontWeight: 900, whiteSpace: "nowrap" }}>{title}</div>
          {rows.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 14, background: "white", border: `3px solid ${LINE}`, borderRadius: 28, padding: "0 40px" }}>
              {rows.map((r, i) => (
                <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 120, borderTop: i ? `3px solid ${TRACK}` : "none" }}>
                  <div style={{ display: "flex", fontSize: fitFontSize(r.name, 580, 64, 32), fontWeight: 900, whiteSpace: "nowrap" }}>{r.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", color: RED }}>
                    <div style={{ display: "flex", fontSize: 90, fontWeight: 900 }}>{r.median.toLocaleString()}</div>
                    <div style={{ display: "flex", fontSize: 44, fontWeight: 900, marginLeft: 4 }}>円</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    { ...SIZE, fonts },
  );
}
