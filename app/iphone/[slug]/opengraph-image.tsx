import { ImageResponse } from "next/og";
import { ALL_PAGE_MODELS, modelToSlug, slugToModel } from "@/lib/catalog";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { fitFontSize, notoSansJp } from "@/lib/ogFont";
import { storageLabel } from "@/lib/format";
import { activeShopsFor } from "@/lib/activeShops";
import { findShop } from "@/lib/shops";
import { rethrowDuringBuild } from "@/lib/buildGuard";
import { isMac } from "@/lib/macCatalog";
import { SITE } from "@/lib/brandColors";

// モデル別ページと同じくビルドのたびに作る（最安値が変わるため）。iPad・Mac・Watch・Android の機種ページもこの画像を使う
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
export const dynamicParams = false;

// alt は静的な文字列でなければならないので数字は入れない
export const alt = "中古iPhoneの最安値・価格比較";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return ALL_PAGE_MODELS.map((model) => ({ slug: modelToSlug(model) }));
}

// 色はサイトと同じ（lib/brandColors.ts = app/globals.css）。GRAY は中央値の棒（地の lineSoft と見分けがつく brand-200）
const NAVY = SITE.brand900, RED = SITE.price, GRAY = SITE.brand200, INK = SITE.ink, SUB = SITE.inkMute, LINE = SITE.line, TRACK = SITE.lineSoft, GROUND = SITE.ground;
const URL = "used.gadelog.com";
const MAX_ROWS = 4;
// 行の数ごとの寸法（1〜2行は行を高く・数字を大きくして、カードが空いて見えないようにする）。
// 横幅の合計は 容量170 + 横棒 bar + 最安値 minW + 相場186 = 1020（カードの内側 1020px）
type Layout = { rowH: number; bar: number; barH: number; minW: number; minSize: number; labelSize: number };
const LAYOUT: Record<number, Layout> = {
  1: { rowH: 210, bar: 340, barH: 44, minW: 324, minSize: 64, labelSize: 44 },
  2: { rowH: 150, bar: 340, barH: 38, minW: 324, minSize: 58, labelSize: 40 },
  3: { rowH: 100, bar: 400, barH: 30, minW: 264, minSize: 44, labelSize: 36 },
  4: { rowH: 80, bar: 400, barH: 30, minW: 264, minSize: 44, labelSize: 34 },
};

type Row = { storage: number; min: number; med: number; count: number };
type Market = { rows: Row[]; count: number; shops: number; updated: Date | null };

/**
 * 容量ごとの最安値・相場（中央値）・件数（10/21〜。トップの OG と同じ「赤＝最安値・灰＝相場」の横棒）。
 * DB で集計し、行として取り出すのは容量ごとの中央値の1件ずつだけ（最大4件。Neon の転送量に配慮）。
 * 相場は機種ページと同じ定義（lib/modelInventory.ts の medianPrice）で、容量ごとに取る
 */
async function storageMarket(model: string): Promise<Market> {
  const where = await modelWhere(model);
  const [byStorage, byShop] = await Promise.all([
    prisma.deviceInventory.groupBy({ by: ["storage"], where, _min: { price: true }, _max: { updatedAt: true }, _count: { _all: true } }),
    prisma.deviceInventory.groupBy({ by: ["shopName"], where, _count: { _all: true } }),
  ]);
  const count = byStorage.reduce((s, r) => s + r._count._all, 0);
  const updated = byStorage.reduce<Date | null>((d, r) => (r._max.updatedAt && (!d || r._max.updatedAt > d) ? r._max.updatedAt : d), null);
  // 在庫の多い容量から最大4つ → 容量の小さい順に並べる（容量が読めない 0 は除く）
  const top = byStorage
    .filter((r) => r.storage > 0 && r._min.price !== null)
    .sort((a, b) => b._count._all - a._count._all || a.storage - b.storage)
    .slice(0, MAX_ROWS)
    .sort((a, b) => a.storage - b.storage);
  const rows = await Promise.all(
    top.map(async (r) => {
      const med = await medianPrice({ AND: [where, { storage: r.storage }] }, r._count._all);
      return { storage: r.storage, min: r._min.price ?? 0, med: med ?? r._min.price ?? 0, count: r._count._all };
    }),
  );
  // 「イオシス（楽天市場店）」は「イオシス」と同じ店として数える（lib/modelStats.ts と同じ）
  const shops = new Set(byShop.map((r) => findShop(r.shopName)?.alias ?? r.shopName)).size;
  return { rows, count, shops, updated };
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const model = slugToModel(slug) ?? "iPhone";
  let market: Market = { rows: [], count: 0, shops: 0, updated: null };
  try {
    market = await storageMarket(model);
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("og model market failed:", error);
  }
  const { rows } = market;

  // 画像では括弧を外して1行に収める（"iPhone SE (第3世代)" → "iPhone SE 第3世代"）
  const displayName = model.replace(/\s*\((.+)\)/, " $1");
  // MacBook の容量＝SSD、Apple Watch の storage＝ケースのサイズ（mm）
  const unit = model.startsWith("Apple Watch") ? "サイズ" : "容量";
  const sub = isMac(model) ? "SSD容量別の中古価格" : `${unit}別の中古価格`;
  const updated = (market.updated ?? new Date()).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" });
  const shopsFallback = rows.length > 0 ? 0 : (await activeShopsFor(model)).length;
  const foot =
    rows.length > 0
      ? `大手中古ショップ${market.shops}店・${market.count.toLocaleString()}件の在庫から毎日集計（${updated} 更新・相場＝${unit}ごとの中央値）`
      : `大手中古ショップ${shopsFallback > 0 ? `${shopsFallback}店` : ""}の在庫を毎日集計（${updated} 更新）`;
  const labels = rows.map((r) => ({ ...r, label: storageLabel(r.storage, model) }));
  // 横軸: 相場の最大値 × 1.08（全行で共通）
  const axis = Math.max(1, ...rows.map((r) => r.med)) * 1.08;
  const L = LAYOUT[rows.length] ?? LAYOUT[MAX_ROWS];

  const fonts = await notoSansJp(
    [
      "中古スマホ一括検索", URL, displayName, sub, foot, "最安値相場在庫件円〜なし0123456789,",
      ...labels.map((r) => r.label),
    ].join(""),
  );

  const header = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 92, flexShrink: 0, padding: "0 56px", background: NAVY, color: "white" }}>
      <div style={{ display: "flex", fontSize: 40, fontWeight: 900 }}>中古スマホ一括検索</div>
      <div style={{ display: "flex", fontSize: 26, fontWeight: 500, opacity: 0.85 }}>{URL}</div>
    </div>
  );

  // 在庫なし: 横棒を出さず、機種名と「在庫なし」だけ
  if (rows.length === 0) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: GROUND, fontFamily: "Noto Sans JP", color: INK }}>
          {header}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1, padding: "0 56px" }}>
            <div style={{ display: "flex", fontSize: fitFontSize(displayName, 1000, 76), fontWeight: 900, whiteSpace: "nowrap" }}>{displayName}</div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 900, color: SUB, marginTop: 24 }}>在庫なし</div>
            <div style={{ display: "flex", fontSize: 24, color: SUB, marginTop: 32 }}>{foot}</div>
          </div>
        </div>
      ),
      { ...size, fonts },
    );
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: GROUND, fontFamily: "Noto Sans JP", color: INK }}>
        {header}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1, padding: "0 56px 12px" }}>
          {/* 機種名（長い名前は縮める）と凡例 */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <div style={{ display: "flex", fontSize: fitFontSize(displayName, 530, 52, 24), fontWeight: 900, whiteSpace: "nowrap" }}>{displayName}</div>
              <div style={{ display: "flex", fontSize: 32, fontWeight: 900, color: SUB, marginLeft: 16, whiteSpace: "nowrap" }}>{sub}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", fontSize: 22, color: SUB, flexShrink: 0 }}>
              <div style={{ display: "flex", width: 22, height: 14, background: RED, borderRadius: 4, marginRight: 8 }} />
              最安値
              <div style={{ display: "flex", width: 22, height: 14, background: GRAY, borderRadius: 4, margin: "0 8px 0 24px" }} />
              相場
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 16, background: "white", border: `2px solid ${LINE}`, borderRadius: 24, padding: "10px 32px" }}>
            {labels.map((r, i) => {
              // 桁の多い値（6〜7桁）は列の幅に収まるまで小さくする（太字の目安: 数字 0.62em・カンマ 0.3em・「円〜」1.05em）
              const digits = String(r.min).length;
              const minSize = Math.min(L.minSize, Math.floor((L.minW - 24) / (0.62 * digits + 0.3 * Math.floor((digits - 1) / 3) + 1.05)));
              return (
                <div key={r.storage} style={{ display: "flex", alignItems: "center", height: L.rowH, borderTop: i ? `2px solid ${TRACK}` : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", width: 170, flexShrink: 0 }}>
                    <div style={{ display: "flex", fontSize: L.labelSize, fontWeight: 900, lineHeight: 1.25 }}>{r.label}</div>
                    <div style={{ display: "flex", fontSize: 20, color: SUB }}>{`在庫 ${r.count.toLocaleString()}件`}</div>
                  </div>
                  <div style={{ display: "flex", width: L.bar, flexShrink: 0, height: L.barH, background: TRACK, borderRadius: 6 }}>
                    <div style={{ display: "flex", width: Math.round((L.bar * r.min) / axis), height: L.barH, background: RED, borderRadius: "6px 0 0 6px" }} />
                    <div style={{ display: "flex", width: Math.round((L.bar * Math.max(0, r.med - r.min)) / axis), height: L.barH, background: GRAY, borderRadius: "0 6px 6px 0" }} />
                  </div>
                  {/* 右の数字は列の幅を固定して右揃え（桁が変わっても縦にそろう） */}
                  <div style={{ display: "flex", width: L.minW, flexShrink: 0, justifyContent: "flex-end", alignItems: "baseline", color: RED }}>
                    <div style={{ display: "flex", fontSize: minSize, fontWeight: 900 }}>{r.min.toLocaleString()}</div>
                    <div style={{ display: "flex", fontSize: Math.round(minSize * 0.5), fontWeight: 900, marginLeft: 2 }}>円〜</div>
                  </div>
                  <div style={{ display: "flex", width: 186, flexShrink: 0, justifyContent: "flex-end", fontSize: r.med >= 1_000_000 ? 20 : 23, color: SUB }}>
                    {`相場 ${r.med.toLocaleString()}円`}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "center", fontSize: 21, color: SUB, marginTop: 12 }}>{foot}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
