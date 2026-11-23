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

const plans: [string, ReactNode][] = [
  // T1: 文字は左に縦の真ん中・写真は右半分に大きく2枚
  ["T1", (
    <Frame>
      <Card file={E17} crop={C17} x={790} y={36} w={300} h={400} rot={-5} />
      <Card file={P15} crop={C15} x={930} y={270} w={300} h={390} rot={5} />
      <Col top={84}>
        <Outlined text="新品の17e？" size={116} color={WHITE} />
        <Outlined text="中古15Pro？" size={124} color={YELLOW} />
        <TagBox text="差4,180円" style={{ marginTop: 44 }} />
      </Col>
    </Frame>
  )],
  // T2: 左右に分けて比べる（写真が主役）。上に機種名、真ん中の下に差
  ["T2", (
    <Frame>
      <Card file={E17} crop={C17} x={60} y={170} w={540} h={500} rot={-3} />
      <Card file={P15} crop={C15} x={680} y={170} w={540} h={500} rot={3} />
      <div style={{ display: "flex", position: "absolute", left: EDGE + 4, top: 34 }}><Outlined text="新品17e" size={116} color={WHITE} /></div>
      <div style={{ display: "flex", position: "absolute", left: 690, top: 34 }}><Outlined text="中古15Pro" size={116} color={YELLOW} /></div>
      <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: W, height: H, alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", width: 150, height: 150, borderRadius: 75, background: RED, alignItems: "center", justifyContent: "center", fontSize: 76, fontWeight: 900, color: WHITE, border: "6px solid #FFFFFF", marginTop: 120 }}>VS</div>
      </div>
      <TagBox text="差4,180円" style={{ position: "absolute", left: 370, top: 560 }} />
    </Frame>
  )],
  // T3: 3台を扇に並べて「どれ買う？」
  ["T3", (
    <Frame>
      <Card file={N16} crop={C16} x={1030} y={110} w={210} h={380} rot={9} />
      <Card file={P15} crop={C15} x={920} y={170} w={220} h={390} rot={2} />
      <Card file={E17} crop={C17} x={790} y={140} w={230} h={390} rot={-7} />
      <Col top={110}>
        <Outlined text="同じ12.5万円" size={116} color={WHITE} />
        <Outlined text="どれ買う？" size={160} color={YELLOW} />
      </Col>
      <TagBox text="17e・15Pro・16" style={{ position: "absolute", left: EDGE + 4, top: 470, fontSize: 104 }} />
    </Frame>
  )],
  ["E2", (
    <Frame>
      <Card file={E17} crop={C17} x={890} y={44} w={320} h={340} rot={-6} />
      <Card file={P15} crop={C15} x={950} y={330} w={280} h={320} rot={5} />
      <Col top={56}>
        <Outlined text="新品の17e？" size={116} color={WHITE} />
        <Outlined text="中古15Pro？" size={134} color={YELLOW} />
        <TagBox text="差4,180円" style={{ marginTop: 40 }} />
      </Col>
    </Frame>
  )],
];

(async () => {
  const fonts = await notoSansJp("17e 新品か中古か差4,180円新品の？中古15ProVS同じ12.5万円どれ買う・16");
  for (const [name, node] of plans) {
    const res = new ImageResponse(node as React.ReactElement, { width: W, height: H, fonts });
    const out = join(__dirname, "2026-11-27-17e-vs-used", `thumb-${name}.png`);
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(out);
  }
})();
