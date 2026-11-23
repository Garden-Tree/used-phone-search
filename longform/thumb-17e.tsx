/**
 * 横動画 2026-11-27-17e-vs-used のサムネ（11/24）。暗い地＋白・黄の文字＋赤い札（13・SE3 の まだ使う？と同じ部品）。
 *   npx tsx longform/thumb-17e.tsx  → longform/2026-11-27-17e-vs-used/thumb-E1.png・thumb-E2.png（thumbnail.png は video.tsx が上書きするので別の名前）
 * 写真は切り抜かず角丸の枠で（17e は手で持った展示機・15 Pro は店頭で値札つき → 端末の背面のカメラ側だけを枠に入れる）
 *   17e: iPhone 17e backside — 茅野ふたば / CC BY-SA 4.0 / Wikimedia Commons
 *   15 Pro: Back view of iPhone 15 Pro Natural titanium — メイド理世 / CC BY-SA 4.0 / Wikimedia Commons
 * 数字は script.md のものだけ: 同じ 256GB で新品の 17e 124,800円・中古の 15 Pro 128,980円（差 4,180円）
 * 決まり: 文字 104px 以上・端から 60px 以上・右下（x1030〜・y600〜）に文字なし
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720, EDGE = 60;
const RED = "#E11D1D", YELLOW = "#FFE100", WHITE = "#FFFFFF";
const C = join(__dirname, "assets", "commons");

function jpegSize(b: Buffer) {
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error("jpeg size");
}

/** 写真の一部（crop は割合）を w×h の角丸の枠に。rot は傾き（度） */
function Card({ file, crop, x, y, w, h, rot }: { file: string; crop: { x: number; y: number; w: number; h: number }; x: number; y: number; w: number; h: number; rot: number }) {
  const buf = readFileSync(join(C, file));
  const png = file.endsWith(".png");
  const { w: iw, h: ih } = png ? { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } : jpegSize(buf);
  const k = Math.max(w / (iw * crop.w), h / (ih * crop.h));
  return (
    <div style={{ display: "flex", position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden", borderRadius: 28, border: "6px solid #FFFFFF", transform: `rotate(${rot}deg)`, boxShadow: "0 18px 40px rgba(0,0,0,0.55)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/${png ? "png" : "jpeg"};base64,${buf.toString("base64")}`} width={Math.round(iw * k)} height={Math.round(ih * k)} alt=""
        style={{ position: "absolute", left: -Math.round(crop.x * iw * k), top: -Math.round(crop.y * ih * k) }} />
    </div>
  );
}

const Outlined = ({ text, size, color }: { text: string; size: number; color: string }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 900, color, lineHeight: 1.08, letterSpacing: -4, textShadow: "0 0 10px #000, 0 6px 0 #000, 0 -6px 0 #000, 6px 0 0 #000, -6px 0 0 #000, 4px 4px 0 #000, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000" }}>{text}</div>
);

function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H, background: "linear-gradient(135deg, #0B0B1F 0%, #1A1A3A 60%, #2A2A55 100%)", fontFamily: "Noto Sans JP" }}>
      {children}
    </div>
  );
}

const E17 = "iphone17e-back-chinofutaba.jpg", P15 = "iphone15pro-back-naturaltitanium-meidoriyo.jpg", N16 = "iphone16-ultramarine.png";
const C17 = { x: 0.2, y: 0.1, w: 0.56, h: 0.52 }, C15 = { x: 0.29, y: 0.155, w: 0.37, h: 0.3 }, C16 = { x: 0.19, y: 0.06, w: 0.6, h: 0.5 };
const TagBox = ({ text, style }: { text: string; style?: React.CSSProperties }) => (
  <div style={{ display: "flex", alignSelf: "flex-start", padding: "4px 24px 10px", background: WHITE, borderRadius: 16, fontSize: 104, fontWeight: 900, color: RED, letterSpacing: -5, lineHeight: 1.1, boxShadow: "0 10px 24px rgba(0,0,0,0.5)", ...style }}>{text}</div>
);
const Col = ({ top, children }: { top: number; children: ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: EDGE + 4, top }}>{children}</div>
);

// 写真3枚（11/24 ユーザー「写真は3枚で確定・もっと大きく・カメラが見えるように」）。カメラは背面の左上なので、右の写真を上に重ねる（左の写真のカメラが隠れない）
const K17 = { x: 0.2, y: 0.11, w: 0.52, h: 0.52 }, K15 = { x: 0.3, y: 0.16, w: 0.36, h: 0.3 }, K16 = { x: 0.2, y: 0.07, w: 0.52, h: 0.52 };
const Three = () => (
  <>
    <Card file={E17} crop={K17} x={645} y={80} w={290} h={460} rot={-6} />
    <Card file={P15} crop={K15} x={815} y={140} w={290} h={460} rot={0} />
    <Card file={N16} crop={K16} x={1010} y={200} w={260} h={460} rot={6} />
  </>
);
const Big = ({ lines, tag }: { lines: [string, number, string][]; tag?: string }) => (
  <Frame>
    <Three />
    <Col top={70}>
      {lines.map(([t, size, color]) => <Outlined key={t} text={t} size={size} color={color} />)}
      {tag ? <TagBox text={tag} style={{ marginTop: 36 }} /> : null}
    </Col>
  </Frame>
);
// B: 写真をさらに大きく・画面の外にはみ出す（11/24 ユーザー）
const ThreeBig = () => (
  <>
    <Card file={E17} crop={K17} x={600} y={60} w={320} h={620} rot={-6} />
    <Card file={P15} crop={K15} x={790} y={120} w={330} h={470} rot={0} />
    <Card file={N16} crop={K16} x={1010} y={150} w={320} h={620} rot={6} />
  </>
);
const plansB: [string, ReactNode][] = [
  ["B1", (
    <Frame>
      <ThreeBig />
      <Col top={36}>
        <Outlined text="同じ値段" size={110} color={WHITE} />
        <Outlined text="17eより" size={156} color={WHITE} />
        <Outlined text="中古Pro？" size={150} color={YELLOW} />
        <TagBox text="120Hzとカメラ" style={{ marginTop: 26, fontSize: 116 }} />
      </Col>
    </Frame>
  )],
];
const plans: [string, ReactNode][] = [
  ["A1", <Big key="a1" lines={[["新品か", 170, WHITE], ["中古か", 170, YELLOW]]} tag="差4,180円" />],
  ["A2", <Big key="a2" lines={[["同じ値段で", 106, WHITE], ["望遠つき", 132, YELLOW]]} tag="中古15Pro" />],
  ["A3", <Big key="a3" lines={[["12.5万円", 124, WHITE], ["どれ買う？", 106, YELLOW]]} tag="新品vs中古" />],
  ["A4", <Big key="a4" lines={[["17eより", 124, WHITE], ["中古Pro？", 112, YELLOW]]} tag="差4,180円" />],
  ["A5", <Big key="a5" lines={[["新品17e", 124, WHITE], ["vs 中古", 140, YELLOW]]} tag="15Pro・16" />],
  ["A6", <Big key="a6" lines={[["17eの", 140, WHITE], ["ライバル", 132, YELLOW]]} tag="中古2台" />],
];

(async () => {
  const fonts = await notoSansJp("17e 新品か中古か差4,180円新品の？中古15ProVS同じ12.5万円どれ買う・16値段で望遠つきvsよりライバル2台120Hzとカメラ");
  for (const [name, node] of [...plansB, ...plans]) {
    const res = new ImageResponse(node as React.ReactElement, { width: W, height: H, fonts });
    const out = join(__dirname, "2026-11-27-17e-vs-used", `thumb-${name}.png`);
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(out);
  }
})();
