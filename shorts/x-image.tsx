// X 用の値下がりランキング画像（1200x675）。台本 script.json の数字をそのまま使う
//   npx tsx shorts/x-image.tsx shorts/out/<日付>-drops   （先に drops plan で数字を取り直す）
import { readFileSync, writeFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const dir = process.argv[2];
const s = JSON.parse(readFileSync(`${dir}/script.json`, "utf8"));
const items = s.scenes.ranking.items as { model: string; storage: string; before: number; after: number; drop: number; rate: number }[];
const n = (v: number) => v.toLocaleString();
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const NAVY = "#1E1B4B", RED = "#E11D48";
const badge = ["#F59E0B", "#94A3B8", "#B45309", NAVY, NAVY];
const title = "今週値下がりした中古iPhone TOP5";
const foot = `大手中古ショップ${s.shopCount}店の在庫の中央値（${md(s.fromDate)}→${md(s.toDate)}・iOS 27 対応機種）  used.gadelog.com`;

const el = (
  <div style={{ width: 1200, height: 675, display: "flex", flexDirection: "column", background: NAVY, fontFamily: "Noto Sans JP", padding: "36px 56px" }}>
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 84, borderRadius: 18, background: RED, color: "white", fontSize: 46, fontWeight: 900, lineHeight: 1 }}>{title}</div>
    <div style={{ display: "flex", flexDirection: "column", marginTop: 24, background: "white", borderRadius: 22, padding: "8px 28px" }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", height: 88, borderTop: i ? "2px solid #E5E7EB" : "none" }}>
          <div style={{ display: "flex", width: 96, height: 56, alignItems: "center", justifyContent: "center", borderRadius: 12, background: badge[i], color: "white", fontSize: 32, fontWeight: 900 }}>{`${i + 1}位`}</div>
          <div style={{ display: "flex", alignItems: "baseline", marginLeft: 24, flexGrow: 1, color: NAVY }}>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 900 }}>{it.model}</div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 500, marginLeft: 12, color: "#64748B" }}>{it.storage}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 900, color: RED }}>{`−${it.rate.toFixed(1)}%`}</div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 500, color: "#64748B" }}>{`${n(it.before)}円→${n(it.after)}円`}</div>
          </div>
        </div>
      ))}
    </div>
    <div style={{ display: "flex", justifyContent: "center", marginTop: 18, color: "white", opacity: 0.85, fontSize: 22, fontWeight: 500 }}>{foot}</div>
  </div>
);

(async () => {
  const text = title + foot + items.map((i) => `${i.model}${i.storage}${n(i.before)}${n(i.after)}${i.rate}`).join("") + "0123456789位−%円→.,";
  const res = new ImageResponse(el, { width: 1200, height: 675, fonts: await notoSansJp(text) });
  writeFileSync(`${dir}/x-drops.png`, Buffer.from(await res.arrayBuffer()));
  console.log("saved", `${dir}/x-drops.png`);
})();
