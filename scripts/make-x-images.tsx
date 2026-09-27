/**
 * X（Twitter）の告知用画像（1200x675）を、本番の在庫の数字で作る。投稿の前に取り直す
 *   npm run x:images -- <出力先フォルダ>
 * 1. 告知（在庫件数・ショップ・機種ごとの最安値） 2. iPhone 13 の店ごとの最安値
 * 文面は ideas/x-posts-*.md。DB は集計だけ読む（Neon の転送量に配慮）
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";
import { getModelStats } from "@/lib/modelStats";
import { notoSansJp } from "@/lib/ogFont";

const OUT = process.argv[2] ?? ".";
const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric" }).replace(/\s/g, " ");
const SHORT: Record<string, string> = { "ゲオモバイル（楽天市場店）": "ゲオモバイル", "じゃんぱら（楽天市場店）": "じゃんぱら", "ソフマップ（楽天市場店）": "ソフマップ" };
const SHOPS = ["イオシス", "ゲオモバイル", "じゃんぱら", "ソフマップ", "にこスマ", "ダイワンテレコム", "エムモバ"];
const size = { width: 1200, height: 675 };

async function save(name: string, el: React.ReactElement, text: string) {
  const fonts = await notoSansJp(text);
  const res = new ImageResponse(el, { ...size, fonts });
  writeFileSync(`${OUT}/${name}`, Buffer.from(await res.arrayBuffer()));
  console.log("saved", name);
}

async function main() {
const total = (await prisma.deviceInventory.count({ where: { isSoldOut: false } })).toLocaleString();
const exampleModels = ["iPhone 12", "iPhone 13", "iPhone 15", "iPhone 16e", "iPad (A16)", "iPad mini (A17 Pro)"];
const examples: [string, number][] = [];
for (const m of exampleModels) {
  const s = await getModelStats(m);
  if (s.minPrice !== null) examples.push([m, s.minPrice]);
}
const day = now.split(" ")[0];
// 1. 告知
const t1 = ["中古iPhone・iPadを", "7ショップ横断で比較", total, "件の在庫", "容量・状態ランク・バッテリー最大容量で絞り込み", "6時間ごとに更新", "中古スマホ一括検索", "used.gadelog.com", `機種ごとの最安値（${day}）`, "円〜", ...SHOPS, ...examples.map(([n, p]) => n + p.toLocaleString())].join("");
await save("x-promo-1.png", (
  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: "0 64px", background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 60%)", fontFamily: "Noto Sans JP", color: "#0f172a" }}>
    <div style={{ display: "flex", flexDirection: "column", width: 600 }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#2563eb" }}>中古スマホ一括検索</div>
      <div style={{ fontSize: 58, fontWeight: 900, letterSpacing: -2, marginTop: 12, lineHeight: 1.15, display: "flex", flexDirection: "column" }}>
        <span>中古iPhone・iPadを</span><span>7ショップ横断で比較</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", marginTop: 16 }}>
        <span style={{ fontSize: 84, fontWeight: 900, color: "#dc2626", letterSpacing: -3 }}>{total}</span>
        <span style={{ fontSize: 32, fontWeight: 900, marginLeft: 10 }}>件の在庫</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: "#64748b" }}>6時間ごとに更新</div>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: 16 }}>
        {SHOPS.map((s) => (
          <div key={s} style={{ fontSize: 20, fontWeight: 500, color: "#334155", background: "#f1f5f9", border: "2px solid #e2e8f0", borderRadius: 999, padding: "4px 16px", margin: "5px 10px 5px 0" }}>{s}</div>
        ))}
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: "#475569", marginTop: 16 }}>容量・状態ランク・バッテリー最大容量で絞り込み</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: "#2563eb", marginTop: 18 }}>used.gadelog.com</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", marginLeft: "auto", width: 440, background: "#ffffff", border: "2px solid #e2e8f0", borderRadius: 28, padding: "26px 28px", boxShadow: "0 12px 30px rgba(15,23,42,0.08)" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#64748b", marginBottom: 10 }}>{`機種ごとの最安値（${day}）`}</div>
      {examples.map(([name, price], i) => (
        <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0", borderTop: i === 0 ? "none" : "2px solid #f1f5f9" }}>
          <span style={{ fontSize: 23, fontWeight: 900, color: "#1e293b", whiteSpace: "nowrap" }}>{name}</span>
          <span style={{ fontSize: 25, fontWeight: 900, color: "#dc2626", whiteSpace: "nowrap" }}>{price.toLocaleString()}<span style={{ fontSize: 18, marginLeft: 2 }}>円〜</span></span>
        </div>
      ))}
    </div>
  </div>
), t1);

// 2. 店ごとの最安値（iPhone 13）
const s13 = await getModelStats("iPhone 13");
const rows: [string, number][] = s13.byShop.map((r) => [SHORT[r.key] ?? r.key, r.minPrice]);
const max = Math.max(...rows.map(([, p]) => p));
// 差額は0.1万円単位で切り捨て（「1.6万円の差」のように控えめに言う）
const gap = `${(Math.floor((max - rows[0][1]) / 1000) / 10).toFixed(1)}万円`;
const t2 = ["中古 iPhone 13 の店ごとの最安値", "同じ日でも", gap, "の差", "円", `各店でいちばん安い1台（容量・状態は店ごとに違う）${now}`, "中古スマホ一括検索", "used.gadelog.com", ...rows.map(([n, p]) => n + p.toLocaleString())].join("");
await save("x-promo-2.png", (
  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "48px 80px", background: "#ffffff", fontFamily: "Noto Sans JP", color: "#0f172a" }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <span style={{ fontSize: 44, fontWeight: 900 }}>中古 iPhone 13 の店ごとの最安値</span>
    </div>
    <div style={{ display: "flex", alignItems: "baseline", marginTop: 6 }}>
      <span style={{ fontSize: 30, fontWeight: 500, color: "#475569" }}>同じ日でも</span>
      <span style={{ fontSize: 46, fontWeight: 900, color: "#dc2626", margin: "0 8px" }}>{gap}</span>
      <span style={{ fontSize: 30, fontWeight: 500, color: "#475569" }}>の差</span>
    </div>
    <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
      {rows.map(([name, price], i) => (
        <div key={name} style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <span style={{ width: 230, fontSize: 26, fontWeight: 900, color: "#334155" }}>{name}</span>
          <div style={{ display: "flex", width: 620, height: 34, background: "#f1f5f9", borderRadius: 8 }}>
            <div style={{ width: Math.round((price / max) * 620), height: 34, background: i === 0 ? "#dc2626" : "#94a3b8", borderRadius: 8 }} />
          </div>
          <span style={{ fontSize: 28, fontWeight: 900, marginLeft: 18, color: i === 0 ? "#dc2626" : "#0f172a" }}>{price.toLocaleString()}円</span>
        </div>
      ))}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
      <span style={{ fontSize: 18, color: "#94a3b8" }}>{`各店でいちばん安い1台（容量・状態は店ごとに違う）${now}`}</span>
      <span style={{ fontSize: 22, fontWeight: 900, color: "#2563eb" }}>used.gadelog.com</span>
    </div>
  </div>
), t2);
}
main().finally(() => prisma.$disconnect());
