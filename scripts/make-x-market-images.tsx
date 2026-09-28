/**
 * X（Twitter）用の画像（1200x675）を、相場一覧（/iphone）と同じ数字で作る。投稿の前に取り直す
 *   npm run x:market -- <出力先フォルダ>          … iPhone（/iphone と同じ数字）
 *   npm run x:market -- <出力先フォルダ> ipad     … iPad（/ipad と同じ数字）
 * 1. 相場が安い TOP8（iPhone は iOS 27 対応。在庫10件以上） 2. 最安値と相場（中央値）の差（iPhone は人気機種、iPad は在庫の多い5機種）。iPad も最新 OS（iPadOS 27）対応機種だけ
 * 文面は ideas/x-posts-*.md。DB は集計と中央値の1行だけ読む（Neon の転送量に配慮）
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";
import { ALL_CATALOG_MODELS } from "@/lib/catalog";
import { getModelMarket } from "@/lib/marketStats";
import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { IPAD_SHOPS, SHOPS } from "@/lib/shops";
import { notoSansJp } from "@/lib/ogFont";

const OUT = process.argv[2] ?? ".";
const IPAD = process.argv[3] === "ipad";
const K = IPAD
  ? { name: "iPad", models: IPAD_MODELS.filter((m) => IPADOS27_MODELS.has(m)), shops: IPAD_SHOPS.length, url: "used.gadelog.com/ipad", cond: "iPadOS 27 対応・在庫10件以上", file: "x-ipad" }
  : { name: "iPhone", models: ALL_CATALOG_MODELS, shops: SHOPS.length, url: "used.gadelog.com/iphone", cond: "iOS 27 対応・在庫10件以上", file: "x-market" };
const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "numeric" }).replace(/\s/g, " ");
const size = { width: 1200, height: 675 };
const man = (yen: number) => `${(Math.floor(yen / 1000) / 10).toFixed(1)}万円`; // 0.1万円単位で切り捨て

async function save(name: string, el: React.ReactElement, text: string) {
  const fonts = await notoSansJp(text);
  const res = new ImageResponse(el, { ...size, fonts });
  writeFileSync(`${OUT}/${name}`, Buffer.from(await res.arrayBuffer()));
  console.log("saved", name);
}

async function main() {
  const market = await getModelMarket(K.models);
  const footer = `大手中古ショップ${K.shops}社の在庫から・${now}`;

  // 1. 相場が安い TOP8（/iphone の「相場が安い中古iPhone」と同じ条件）
  const top = K.models.flatMap((m) => {
    const r = market.get(m);
    return r && r.count >= 10 ? [{ model: m, ...r }] : [];
  })
    .sort((a, b) => a.medianPrice - b.medianPrice)
    .slice(0, 8);
  const t1 = [`相場が安い中古${K.name}`, "TOP8", K.cond, "相場（中央値）", "最安値", "円", "件", K.url, footer,
    ...top.map((r) => `${r.model}${r.medianPrice.toLocaleString()}${r.minPrice.toLocaleString()}${r.count.toLocaleString()}`), "0123456789"].join("");
  await save(`${K.file}-1.png`, (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "40px 72px", background: "#ffffff", fontFamily: "Noto Sans JP", color: "#0f172a" }}>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={{ fontSize: 44, fontWeight: 900 }}>{`相場が安い中古${K.name}`}</span>
        <span style={{ fontSize: 44, fontWeight: 900, color: "#dc2626", marginLeft: 12 }}>TOP8</span>
        <span style={{ fontSize: 22, color: "#64748b", marginLeft: "auto" }}>{K.cond}</span>
      </div>
      <div style={{ display: "flex", fontSize: 18, fontWeight: 900, color: "#94a3b8", marginTop: 14, paddingBottom: 6, borderBottom: "2px solid #e2e8f0" }}>
        <span style={{ width: 60 }}></span>
        <span style={{ width: IPAD ? 440 : 380 }}></span>
        <span style={{ width: IPAD ? 200 : 240, textAlign: "right" }}>相場（中央値）</span>
        <span style={{ width: 200, textAlign: "right" }}>最安値</span>
        <span style={{ width: 150, textAlign: "right" }}>在庫</span>
      </div>
      {top.map((r, i) => (
        <div key={r.model} style={{ display: "flex", alignItems: "baseline", padding: "7px 0", borderBottom: "2px solid #f1f5f9" }}>
          <span style={{ width: 60, fontSize: 26, fontWeight: 900, color: i < 3 ? "#dc2626" : "#94a3b8" }}>{String(i + 1)}</span>
          <span style={{ width: IPAD ? 440 : 380, fontSize: IPAD ? 24 : 28, fontWeight: 900 }}>{r.model}</span>
          <span style={{ width: IPAD ? 200 : 240, textAlign: "right", fontSize: 30, fontWeight: 900 }}>{`${r.medianPrice.toLocaleString()}円`}</span>
          <span style={{ width: 200, textAlign: "right", fontSize: 24, fontWeight: 900, color: "#dc2626" }}>{`${r.minPrice.toLocaleString()}円`}</span>
          <span style={{ width: 150, textAlign: "right", fontSize: 20, color: "#64748b" }}>{`${r.count.toLocaleString()}件`}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto" }}>
        <span style={{ fontSize: 18, color: "#94a3b8" }}>{footer}</span>
        <span style={{ fontSize: 22, fontWeight: 900, color: "#2563eb" }}>{K.url}</span>
      </div>
    </div>
  ), t1);

  // 2. 最安値と相場の差（iPhone はよく検索される世代、iPad は在庫の多い5機種を相場の安い順に）
  const POPULAR = IPAD
    ? [...market.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5).sort((a, b) => a[1].medianPrice - b[1].medianPrice).map(([m]) => m)
    : ["iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16"];
  const gaps = POPULAR.flatMap((m) => {
    const r = market.get(m);
    return r ? [{ model: m, ...r, gap: r.medianPrice - r.minPrice }] : [];
  });
  const maxPrice = Math.max(...gaps.map((g) => g.medianPrice));
  const BAR = IPAD ? 560 : 620;
  const t2 = ["最安値だけ見ると", "安く見える", "相場（在庫の真ん中の値段）との差", "最安値", "相場", "円", "差", "万円", "最安値は1台だけの特価やジャンク品のことが多い", K.url, footer,
    ...gaps.map((g) => `${g.model}最安値 ${g.minPrice.toLocaleString()}円 → 相場 ${g.medianPrice.toLocaleString()}円${man(g.gap)}`), "0123456789.+→"].join("");
  await save(`${K.file}-2.png`, (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "40px 72px", background: "#ffffff", fontFamily: "Noto Sans JP", color: "#0f172a" }}>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={{ fontSize: 44, fontWeight: 900 }}>最安値だけ見ると</span>
        <span style={{ fontSize: 44, fontWeight: 900, color: "#dc2626", marginLeft: 8 }}>安く見える</span>
      </div>
      <div style={{ fontSize: 24, color: "#64748b", marginTop: 4 }}>相場（在庫の真ん中の値段）との差</div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
        {gaps.map((g) => (
          <div key={g.model} style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            <span style={{ width: IPAD ? 260 : 200, fontSize: IPAD ? 22 : 26, fontWeight: 900 }}>{g.model}</span>
            <div style={{ display: "flex", flexDirection: "column", width: BAR }}>
              <div style={{ display: "flex", position: "relative", width: BAR, height: 28, background: "#f1f5f9", borderRadius: 8 }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: Math.round((g.medianPrice / maxPrice) * BAR), height: 28, background: "#cbd5e1", borderRadius: 8 }} />
                <div style={{ position: "absolute", left: 0, top: 0, width: Math.round((g.minPrice / maxPrice) * BAR), height: 28, background: "#dc2626", borderRadius: 8 }} />
              </div>
              <span style={{ fontSize: 18, color: "#64748b", marginTop: 4 }}>{`最安値 ${g.minPrice.toLocaleString()}円 → 相場 ${g.medianPrice.toLocaleString()}円`}</span>
            </div>
            <span style={{ width: 200, textAlign: "right", fontSize: 30, fontWeight: 900, color: "#0f172a" }}>{`+${man(g.gap)}`}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", fontSize: 20, color: "#475569", marginTop: 4 }}>
        <div style={{ width: 22, height: 16, background: "#dc2626", borderRadius: 4, marginRight: 8 }} />
        <span>最安値</span>
        <div style={{ width: 22, height: 16, background: "#cbd5e1", borderRadius: 4, margin: "0 8px 0 24px" }} />
        <span>相場</span>
        <span style={{ marginLeft: 24 }}>最安値は1台だけの特価やジャンク品のことが多い</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto" }}>
        <span style={{ fontSize: 18, color: "#94a3b8" }}>{footer}</span>
        <span style={{ fontSize: 22, fontWeight: 900, color: "#2563eb" }}>{K.url}</span>
      </div>
    </div>
  ), t2);

  console.log(JSON.stringify({ top: top.map((r) => [r.model, r.medianPrice, r.minPrice, r.count]), gaps: gaps.map((g) => [g.model, g.minPrice, g.medianPrice, g.gap]) }));
}
main().finally(() => prisma.$disconnect());
