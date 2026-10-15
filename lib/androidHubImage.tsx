import { ImageResponse } from "next/og";
import { minPriceByModel } from "@/lib/budgetStats";
import { getModelMarket } from "@/lib/marketStats";
import { notoSansJp } from "@/lib/ogFont";
import type { Shop } from "@/lib/shops";
import { rethrowDuringBuild } from "@/lib/buildGuard";

// 一覧ページ（/xperia・/aquos）の OGP 画像の共通部分（2026-10-15〜）。各ページの opengraph-image.tsx から呼ぶ（size は各ページに書く 1200×630 と同じ）
const androidHubSize = { width: 1200, height: 630 };

/** 中古Xperia・中古AQUOS の一覧（/xperia・/aquos）の OGP 画像。/mac・/pixel の画像と同じ作り。label は「Xperia」「AQUOS」 */
export async function androidHubImage(label: string, models: string[], activeShops: () => Promise<Shop[]>) {
  const shops = await activeShops();
  // 在庫件数は1回の集計。並べるのは在庫の多い5機種で、中央値はその分だけ取る
  const all: Map<string, { count: number }> = await minPriceByModel({ isSoldOut: false }, models).catch((e) => { rethrowDuringBuild(e); return new Map(); });
  const total = [...all.values()].reduce((n, r) => n + r.count, 0);
  const popular = [...all.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([m]) => m);
  const market = await getModelMarket(popular).catch((e) => { rethrowDuringBuild(e); return new Map(); });
  const rows = popular.flatMap((m) => {
    const r = market.get(m);
    return r ? [{ model: m, median: r.medianPrice }] : [];
  }).sort((a, b) => a.median - b.median);
  const updated = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });
  const lead = `全${models.length}機種の相場と最安値`;
  const summary = total > 0 ? `大手中古ショップ${shops.length}社・${total.toLocaleString()}件の在庫から` : `大手中古ショップ${shops.length}社の在庫から`;

  const allText = [
    `中古${label}の`, "相場一覧", lead, summary, "相場（中央値）", "円", `${updated} 更新`, "中古スマホ一括検索", "used.gadelog.com",
    ...rows.map((r) => r.model + r.median.toLocaleString()), "0123456789,",
  ].join("");
  const fonts = await notoSansJp(allText);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "Noto Sans JP", padding: "56px 64px", color: "#0f172a" }}>
        <div style={{ display: "flex", flex: 1 }}>
          {/* 左: タイトル */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ fontSize: 40, fontWeight: 500, color: "#64748b" }}>{`中古${label}の`}</div>
            <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -3, lineHeight: 1.1 }}>相場一覧</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#dc2626", marginTop: 20 }}>{lead}</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: "#475569", marginTop: 16 }}>{summary}</div>
          </div>

          {/* 右: 在庫の多い機種の相場（機種名が長いので幅を広げて、文字を小さくする） */}
          {rows.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", width: 540, marginLeft: 32, justifyContent: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 500, color: "#64748b", marginBottom: 14 }}>相場（中央値）</div>
              {rows.map((r) => (
                <div key={r.model} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 20px", marginBottom: 10, borderRadius: 16, background: "#f1f5f9" }}>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{r.model}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", marginLeft: 12 }}>{`${r.median.toLocaleString()}円`}</div>
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
    { ...androidHubSize, fonts },
  );
}
