import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

// トップページ・検索ページなど、個別の画像を持たないページの共通 OGP 画像
export const alt = "中古スマホ一括検索 | 中古iPhoneの最安値を大手5ショップから比較";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SHOPS = ["イオシス", "ゲオモバイル", "にこスマ", "エムモバ", "ダイワンテレコム"];

export default async function Image() {
  const title = "中古スマホ一括検索";
  const lead = "中古iPhoneの最安値を、大手5ショップから一括比較";
  const fonts = await notoSansJp([title, lead, ...SHOPS, "used.gadelog.com"].join(""));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#ffffff",
          fontFamily: "Noto Sans JP",
          color: "#0f172a",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -3 }}>{title}</div>
        <div style={{ fontSize: 40, fontWeight: 500, color: "#2563eb", marginTop: 20 }}>{lead}</div>
        <div style={{ display: "flex", marginTop: 48 }}>
          {SHOPS.map((shop) => (
            <div
              key={shop}
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "#475569",
                background: "#f1f5f9",
                borderRadius: 999,
                padding: "10px 24px",
                margin: "0 8px",
              }}
            >
              {shop}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 28, fontWeight: 500, color: "#94a3b8", marginTop: 56 }}>used.gadelog.com</div>
      </div>
    ),
    { ...size, fonts },
  );
}
