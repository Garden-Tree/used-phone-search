import { ImageResponse } from "next/og";
import { ALL_PAGE_MODELS } from "@/lib/catalog";
import { minPriceByModel } from "@/lib/budgetStats";
import { getModelMarket } from "@/lib/marketStats";
import { notoSansJp } from "@/lib/ogFont";
import { SHOPS } from "@/lib/shops";

// 相場一覧（/iphone）の OGP 画像。1日ごとに作り直す。
// 機種別ページ（/iphone/[slug]）はそれぞれの opengraph-image を持つので、この画像は /iphone だけに使われる
export const revalidate = 86400; // 1日（Neon の計算時間を減らすため。2026-10-02）

export const alt = "中古iPhoneの相場一覧";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 画像に並べる機種（よく検索される世代）
const POPULAR = ["iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16"];

export default async function Image() {
  // 在庫件数は1回の集計、中央値は並べる5機種の分だけ取る
  const [all, market] = await Promise.all([
    minPriceByModel({ isSoldOut: false }, ALL_PAGE_MODELS).catch(() => new Map()),
    getModelMarket(POPULAR).catch(() => new Map()),
  ]);
  const total = [...all.values()].reduce((n, r) => n + r.count, 0);
  const rows = POPULAR.flatMap((m) => {
    const r = market.get(m);
    return r ? [{ model: m, median: r.medianPrice }] : [];
  });
  const updated = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });
  const lead = `全${ALL_PAGE_MODELS.length}機種の相場と最安値`;
  const summary = total > 0 ? `大手中古ショップ${SHOPS.length}社・${total.toLocaleString()}件の在庫から` : `大手中古ショップ${SHOPS.length}社の在庫から`;

  const allText = [
    "中古iPhoneの", "相場一覧", lead, summary, "相場（中央値）", "円", `${updated} 更新`, "中古スマホ一括検索", "used.gadelog.com",
    ...rows.map((r) => r.model + r.median.toLocaleString()), "0123456789,",
  ].join("");
  const fonts = await notoSansJp(allText);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "Noto Sans JP", padding: "56px 64px", color: "#0f172a" }}>
        <div style={{ display: "flex", flex: 1 }}>
          {/* 左: タイトル */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ fontSize: 40, fontWeight: 500, color: "#64748b" }}>中古iPhoneの</div>
            <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -3, lineHeight: 1.1 }}>相場一覧</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#dc2626", marginTop: 20 }}>{lead}</div>
            <div style={{ fontSize: 28, fontWeight: 500, color: "#475569", marginTop: 16 }}>{summary}</div>
          </div>

          {/* 右: 人気機種の相場 */}
          {rows.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", width: 420, marginLeft: 40, justifyContent: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 500, color: "#64748b", marginBottom: 14 }}>相場（中央値）</div>
              {rows.map((r) => (
                <div key={r.model} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 20px", marginBottom: 10, borderRadius: 16, background: "#f1f5f9" }}>
                  <div style={{ fontSize: 30, fontWeight: 900 }}>{r.model}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#0f172a" }}>{`${r.median.toLocaleString()}円`}</div>
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
