// X 用: 電池の%ごとの相場（128GB の中央値）1200x675（11/22 手で投稿）
import { writeFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const models = [
  { m: "iPhone 14（128GB）", r: [["90%以上", 64300], ["85〜89%", 62980], ["80〜84%", 64980]] as [string, number][] },
  { m: "iPhone 15（128GB）", r: [["90%以上", 91700], ["85〜89%", 90100], ["80〜84%", 86800]] as [string, number][] },
];
const NAVY = "#1E1B4B", RED = "#E11D48";
const rankColor: Record<string, string> = { "90%以上": "#818CF8", "85〜89%": "#A5B4FC", "80〜84%": "#A5B4FC" };
const max = 100000;
const man = (v: number) => `${v.toLocaleString()}円`;
const title = "電池の%が高いほど高い…とは限らない";
const foot = "相場＝在庫の中央値（ジャンク除く）・大手中古ショップの在庫・11/22  used.gadelog.com";

const el = (
  <div style={{ width: 1200, height: 675, display: "flex", flexDirection: "column", background: NAVY, fontFamily: "Noto Sans JP", padding: "32px 56px" }}>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 84, borderRadius: 18, background: RED, color: "white", fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{title}</div>
    <div style={{ display: "flex", flexDirection: "column", marginTop: 20, background: "white", borderRadius: 22, padding: "16px 32px" }}>
      {models.map((g, gi) => (
        <div key={gi} style={{ display: "flex", flexDirection: "column", marginTop: gi ? 14 : 0 }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 900, color: NAVY, marginBottom: 6 }}>{g.m}</div>
          {g.r.map(([rk, p], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", height: 56 }}>
              <div style={{ display: "flex", width: 150, fontSize: 28, fontWeight: 900, color: NAVY }}>{rk}</div>
              <div style={{ display: "flex", width: 590, height: 34, background: "#EEF2FF", borderRadius: 8 }}>
                <div style={{ display: "flex", width: Math.round((590 * p) / max), height: 34, background: rankColor[rk], borderRadius: 8 }} />
              </div>
              <div style={{ display: "flex", width: 170, justifyContent: "flex-end", fontSize: 32, fontWeight: 900, color: NAVY }}>{man(p)}</div>
              <div style={{ display: "flex", width: 150, justifyContent: "flex-end", fontSize: 24, color: i && p > g.r[0][1] ? RED : "#94A3B8", fontWeight: i && p > g.r[0][1] ? 900 : 500 }}>{i ? `${p > g.r[0][1] ? "+" : "−"}${Math.abs(p - g.r[0][1]).toLocaleString()}円` : "基準"}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
    <div style={{ display: "flex", justifyContent: "center", marginTop: 14, color: "white", opacity: 0.85, fontSize: 20, fontWeight: 500 }}>{foot}</div>
  </div>
);

(async () => {
  const text = title + foot + models.map((g) => g.m).join("") + "以上〜%基準0123456789,.−+円";
  const res = new ImageResponse(el, { width: 1200, height: 675, fonts: await notoSansJp(text) });
  writeFileSync("shorts/out/x-battery.png", Buffer.from(await res.arrayBuffer()));
  console.log("saved");
})();
