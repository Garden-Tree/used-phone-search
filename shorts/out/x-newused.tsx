// X 用: Apple の新品と中古の相場の差（同じ容量）1200x675（11/23 手で投稿）
import { writeFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const rows = [
  { m: "iPhone Air", gb: "256GB", n: 189800, u: 140680 },
  { m: "iPhone 16", gb: "128GB", n: 139800, u: 116700 },
  { m: "iPhone 17", gb: "256GB", n: 159800, u: 149980 },
  { m: "iPhone 17e", gb: "256GB", n: 124800, u: 125980 },
];
const NAVY = "#1E1B4B", RED = "#E11D48";
const yen = (v: number) => `${v.toLocaleString()}円`;
const title = "中古にする意味がある機種・ない機種";
const foot = "新品＝Apple公式・中古＝同じ容量の在庫の中央値（ジャンク除く）・11/23  used.gadelog.com";

const el = (
  <div style={{ width: 1200, height: 675, display: "flex", flexDirection: "column", background: NAVY, fontFamily: "Noto Sans JP", padding: "32px 56px" }}>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 84, borderRadius: 18, background: RED, color: "white", fontSize: 46, fontWeight: 900, lineHeight: 1 }}>{title}</div>
    <div style={{ display: "flex", flexDirection: "column", marginTop: 22, background: "white", borderRadius: 22, padding: "14px 36px" }}>
      <div style={{ display: "flex", height: 44, alignItems: "center", fontSize: 22, color: "#64748B", fontWeight: 500 }}>
        <div style={{ display: "flex", width: 380 }}>機種</div>
        <div style={{ display: "flex", width: 200, justifyContent: "flex-end" }}>新品</div>
        <div style={{ display: "flex", width: 200, justifyContent: "flex-end" }}>中古</div>
        <div style={{ display: "flex", width: 250, justifyContent: "flex-end" }}>新品との差</div>
      </div>
      {rows.map((r, i) => {
        const d = r.u - r.n;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", height: 96, borderTop: "2px solid #EEF2FF" }}>
            <div style={{ display: "flex", width: 380, alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 40, fontWeight: 900, color: NAVY }}>{r.m}</span>
              <span style={{ fontSize: 24, fontWeight: 500, color: "#64748B" }}>{r.gb}</span>
            </div>
            <div style={{ display: "flex", width: 200, justifyContent: "flex-end", fontSize: 30, fontWeight: 500, color: "#475569" }}>{yen(r.n)}</div>
            <div style={{ display: "flex", width: 200, justifyContent: "flex-end", fontSize: 30, fontWeight: 900, color: NAVY }}>{yen(r.u)}</div>
            <div style={{ display: "flex", width: 250, justifyContent: "flex-end", fontSize: 42, fontWeight: 900, color: d < 0 ? RED : "#94A3B8" }}>{`${d < 0 ? "−" : "+"}${Math.abs(d).toLocaleString()}`}</div>
          </div>
        );
      })}
    </div>
    <div style={{ display: "flex", justifyContent: "center", marginTop: 16, color: "white", opacity: 0.85, fontSize: 20, fontWeight: 500 }}>{foot}</div>
  </div>
);

(async () => {
  const text = title + foot + rows.map((r) => r.m + r.gb).join("") + "機種新品中古との差新品との差0123456789,−+円";
  const res = new ImageResponse(el, { width: 1200, height: 675, fonts: await notoSansJp(text) });
  writeFileSync("shorts/out/x-newused.png", Buffer.from(await res.arrayBuffer()));
  console.log("saved");
})();
