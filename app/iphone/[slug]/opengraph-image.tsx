import { ImageResponse } from "next/og";
import { ALL_PAGE_MODELS, modelToSlug, slugToModel } from "@/lib/catalog";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { fitFontSize, notoSansJp } from "@/lib/ogFont";
import { storageLabel } from "@/lib/format";
import { findShop } from "@/lib/shops";
import { rethrowDuringBuild } from "@/lib/buildGuard";
import { SITE } from "@/lib/brandColors";
import { OG_HEADER_TEXT, OgHeader } from "@/lib/ogHeader";

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

// 色はサイトと同じ（lib/brandColors.ts = app/globals.css）
const RED = SITE.price, INK = SITE.ink, SUB = SITE.inkMute, LINE = SITE.line, TRACK = SITE.lineSoft, GROUND = SITE.ground;
// X などでは小さく表示されるので、文字は大きく・少なく（10/23 ユーザーの指示）。容量ごとの最安値だけを3行まで
const MAX_ROWS = 3;
/** 行の数ごとの、最安値の数字の大きさと行の高さ */
const ROW: Record<number, { h: number; price: number; label: number }> = {
  1: { h: 290, price: 140, label: 80 },
  2: { h: 166, price: 116, label: 72 },
  3: { h: 114, price: 94, label: 64 },
};

type Row = { storage: number; min: number; med: number; count: number };
type Market = { rows: Row[]; count: number; shops: number; updated: Date | null };

/**
 * 容量ごとの最安値・相場（中央値）・件数。画像に出すのは最安値だけ（10/23〜。以前は相場の横棒も出していた）。
 * DB で集計し、行として取り出すのは容量ごとの中央値の1件ずつだけ（最大3件。Neon の転送量に配慮）。
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
  // 在庫の多い容量から最大3つ → 容量の小さい順に並べる（容量が読めない 0 は除く）
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
  const labels = rows.map((r) => ({ ...r, label: storageLabel(r.storage, model) }));
  const R = ROW[rows.length] ?? ROW[MAX_ROWS];

  const fonts = await notoSansJp([OG_HEADER_TEXT, displayName, "中古の最安値在庫なし円〜0123456789,", ...labels.map((r) => r.label)].join(""));

  const header = <OgHeader />;
  const title = (
    <div style={{ display: "flex", alignItems: "baseline" }}>
      <div style={{ display: "flex", fontSize: fitFontSize(displayName, 740, 96, 48), fontWeight: 900, whiteSpace: "nowrap" }}>{displayName}</div>
      <div style={{ display: "flex", fontSize: 54, fontWeight: 900, color: SUB, marginLeft: 20, whiteSpace: "nowrap" }}>中古の最安値</div>
    </div>
  );

  // 在庫なし: 機種名と「在庫なし」だけ
  if (rows.length === 0) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: GROUND, fontFamily: "Noto Sans JP", color: INK }}>
          {header}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1, padding: "0 56px" }}>
            <div style={{ display: "flex", fontSize: fitFontSize(displayName, 1080, 96), fontWeight: 900, whiteSpace: "nowrap" }}>{displayName}</div>
            <div style={{ display: "flex", fontSize: 80, fontWeight: 900, color: SUB, marginTop: 24 }}>在庫なし</div>
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
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1, padding: "8px 48px 18px" }}>
          {title}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 14, background: "white", border: `3px solid ${LINE}`, borderRadius: 28, padding: "0 40px" }}>
            {labels.map((r, i) => {
              // 7桁（100万円以上）は少し小さく
              const price = r.min >= 1_000_000 ? Math.round(R.price * 0.85) : R.price;
              return (
                <div key={r.storage} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: R.h, borderTop: i ? `3px solid ${TRACK}` : "none" }}>
                  <div style={{ display: "flex", fontSize: R.label, fontWeight: 900 }}>{r.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", color: RED }}>
                    <div style={{ display: "flex", fontSize: price, fontWeight: 900 }}>{r.min.toLocaleString()}</div>
                    <div style={{ display: "flex", fontSize: Math.round(price * 0.5), fontWeight: 900, marginLeft: 4 }}>円〜</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
