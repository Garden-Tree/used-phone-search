import { ImageResponse } from "next/og";
import { ALL_PAGE_MODELS, modelToSlug, slugToModel } from "@/lib/catalog";
import { getModelStats } from "@/lib/modelStats";
import { notoSansJp } from "@/lib/ogFont";
import { storageLabel } from "@/lib/format";

// モデル別ページと同じく1時間ごとに作り直す（最安値が変わるため）
export const revalidate = 3600;
export const dynamicParams = false;

export const alt = "中古iPhoneの最安値・価格比較";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return ALL_PAGE_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}

const yen = (n: number) => n.toLocaleString();

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const model = slugToModel(slug) ?? "iPhone";
  const stats = await getModelStats(model);
  // 画像では括弧を外して1行に収める（"iPhone SE (第3世代)" → "iPhone SE 第3世代"）
  const displayName = model.replace(/\s*\((.+)\)/, " $1");
  const nameFontSize = displayName.length > 14 ? 60 : 76;

  const updated = (stats.lastUpdated ?? new Date()).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // 容量別の最安値は多くても4つまで（見切れ防止）
  const storages = stats.byStorage.slice(0, 4);

  const priceText = stats.minPrice !== null ? yen(stats.minPrice) : "在庫なし";
  const summary = stats.count > 0 ? `${stats.shopCount}ショップ・${stats.count.toLocaleString()}件の在庫を比較` : "大手中古ショップ7社の在庫を比較";

  // 画像内で使う文字をすべて集めてフォントのサブセットを取得する
  const allText = [
    displayName, "中古の最安値", "円", "〜", priceText, summary, `${updated} 更新`,
    "容量別の最安値", "中古スマホ一括検索", "used.gadelog.com",
    ...storages.flatMap((s) => [storageLabel(s.key), yen(s.minPrice)]),
  ].join("");
  const fonts = await notoSansJp(allText);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          fontFamily: "Noto Sans JP",
          padding: "56px 64px",
          color: "#0f172a",
        }}
      >
        <div style={{ display: "flex", flex: 1 }}>
          {/* 左: モデル名と最安値 */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 500, color: "#64748b" }}>中古の最安値</div>
            <div style={{ fontSize: nameFontSize, fontWeight: 900, letterSpacing: -2, lineHeight: 1.1, marginTop: 8, whiteSpace: "nowrap" }}>
              {displayName}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 24, color: "#dc2626" }}>
              <div style={{ fontSize: 120, fontWeight: 900, letterSpacing: -4, lineHeight: 1 }}>{priceText}</div>
              {stats.minPrice !== null && <div style={{ fontSize: 48, fontWeight: 900, marginLeft: 8 }}>円〜</div>}
            </div>
            <div style={{ fontSize: 30, fontWeight: 500, color: "#475569", marginTop: 24 }}>{summary}</div>
          </div>

          {/* 右: 容量別の最安値 */}
          {storages.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 360,
                marginLeft: 40,
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 500, color: "#64748b", marginBottom: 16 }}>容量別の最安値</div>
              {storages.map((s) => (
                <div
                  key={s.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    padding: "14px 20px",
                    marginBottom: 12,
                    borderRadius: 16,
                    background: "#f1f5f9",
                  }}
                >
                  <div style={{ fontSize: 30, fontWeight: 900 }}>{storageLabel(s.key)}</div>
                  <div style={{ fontSize: 34, fontWeight: 900, color: "#dc2626" }}>{`${yen(s.minPrice)}円`}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター: サイト名と更新日 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #e2e8f0",
            paddingTop: 24,
            fontSize: 28,
          }}
        >
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
