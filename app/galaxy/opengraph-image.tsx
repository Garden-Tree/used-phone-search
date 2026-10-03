import { ImageResponse } from "next/og";
import { GALAXY_MODELS } from "@/lib/galaxyCatalog";
import { minPriceByModel } from "@/lib/budgetStats";
import { getModelMarket } from "@/lib/marketStats";
import { notoSansJp } from "@/lib/ogFont";
import { GALAXY_SHOPS } from "@/lib/shops";
import { rethrowDuringBuild } from "@/lib/buildGuard";

// 中古Galaxy 一覧（/galaxy）の OGP 画像。/ipad の画像と同じ作り。ビルドのたびに作る。
// 機種別ページ（/galaxy/[slug]）はそれぞれの opengraph-image を持つので、この画像は /galaxy だけに使われる
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

export const alt = "中古Galaxyの相場一覧";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // 在庫件数は1回の集計。並べるのは在庫の多い5機種で、中央値はその分だけ取る
  const all: Map<string, { count: number }> = await minPriceByModel({ isSoldOut: false }, GALAXY_MODELS).catch((e) => { rethrowDuringBuild(e); return new Map(); });
  const total = [...all.values()].reduce((n, r) => n + r.count, 0);
  const popular = [...all.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([m]) => m);
  const market = await getModelMarket(popular).catch((e) => { rethrowDuringBuild(e); return new Map(); });
  const rows = popular.flatMap((m) => {
    const r = market.get(m);
    return r ? [{ model: m, median: r.medianPrice }] : [];
  }).sort((a, b) => a.median - b.median);
  const updated = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });
  const lead = `全${GALAXY_MODELS.length}機種の相場と最安値`;
  const summary = total > 0 ? `大手中古ショップ${GALAXY_SHOPS.length}社・${total.toLocaleString()}件の在庫から` : `大手中古ショップ${GALAXY_SHOPS.length}社の在庫から`;

  const allText = [
    "中古Galaxyの", "相場一覧", lead, summary, "相場（中央値）", "円", `${updated} 更新`, "中古スマホ一括検索", "used.gadelog.com",
    ...rows.map((r) => r.model + r.median.toLocaleString()), "0123456789,",
  ].join("");
  const fonts = await notoSansJp(allText);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "Noto Sans JP", padding: "56px 64px", color: "#0f172a" }}>
        <div style={{ display: "flex", flex: 1 }}>
          {/* 左: タイトル */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ fontSize: 40, fontWeight: 500, color: "#64748b" }}>中古Galaxyの</div>
            <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -3, lineHeight: 1.1 }}>相場一覧</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#dc2626", marginTop: 20 }}>{lead}</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: "#475569", marginTop: 16 }}>{summary}</div>
          </div>

          {/* 右: 在庫の多い機種の相場 */}
          {rows.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", width: 500, marginLeft: 32, justifyContent: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 500, color: "#64748b", marginBottom: 14 }}>相場（中央値）</div>
              {rows.map((r) => (
                <div key={r.model} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 20px", marginBottom: 10, borderRadius: 16, background: "#f1f5f9" }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{r.model}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", marginLeft: 12 }}>{`${r.median.toLocaleString()}円`}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター: サイト名と更新日（機種別ページの画像とそろえる） */}
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
