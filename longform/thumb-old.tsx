/**
 * 過去の横動画のサムネの差し替え（11/24）。暗い地＋白・黄の文字＋赤い札（13・SE3 まだ使う？と同じ部品）。CTR の低い回だけ
 *   npx tsx longform/thumb-old.tsx → 2026-11-14-iphone13/thumb-N1.png（13 今買い？ RZDic1sW4p0・CTR 2.2%）・2026-10-25-pro-or-standard/thumb-N1.png（Pro 差額 Bmp5EgeiqW0・CTR 1.6%）
 * 写真: iPhone 13 — Tatsuo Yamashita / CC BY 2.0（背面を正面に引き伸ばした切り抜き）／iPhone 16 Pro Max — 切り抜き（assets/commons/SOURCES.md）
 * 数字は各回の script.md のもの: 13 の相場 128GB 50,800円（5.1万円）／Pro と無印の差 +1.5万〜4.3万円
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720, EDGE = 60;
const RED = "#E11D1D", YELLOW = "#FFE100", WHITE = "#FFFFFF";
const C = join(__dirname, "assets", "commons");
/** 黒い縁取り（16方向に黒い文字を重ねる。thumb-bf-finding.tsx と同じ作り。太さは文字の大きさの約 1/17） */
const Outlined = ({ text, size, color }: { text: string; size: number; color: string }) => {
  const w = Math.round(size / 17);
  const base = { display: "flex", fontSize: size, fontWeight: 900, letterSpacing: -4, lineHeight: 1.08, whiteSpace: "nowrap" } as const;
  return (
    <div style={{ display: "flex", position: "relative" }}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <div key={i} style={{ ...base, position: "absolute", left: Math.round(Math.cos(a) * w), top: Math.round(Math.sin(a) * w), color: "#000000" }}>{text}</div>;
      })}
      <div style={{ ...base, position: "relative", color }}>{text}</div>
    </div>
  );
};

function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H, background: "linear-gradient(135deg, #0B0B1F 0%, #1A1A3A 60%, #2A2A55 100%)", fontFamily: "Noto Sans JP" }}>
      {children}
    </div>
  );
}

const TagBox = ({ text, style }: { text: string; style?: React.CSSProperties }) => (
  <div style={{ display: "flex", alignSelf: "flex-start", padding: "4px 24px 10px", background: WHITE, border: "6px solid #000000", borderRadius: 16, fontSize: 104, fontWeight: 900, color: RED, letterSpacing: -5, lineHeight: 1.1, boxShadow: "0 10px 24px rgba(0,0,0,0.5)", ...style }}>{text}</div>
);
/** 文字の塊は上下の真ん中に（11/24 ユーザー「上下中央揃えで」）。top は使わない */
const Col = ({ children }: { top?: number; children: ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", position: "absolute", left: EDGE + 4, top: 0, height: H }}>{children}</div>
);

const Phone = ({ file, x, y, h, rot }: { file: string; x: number; y: number; h: number; rot: number }) => {
  const buf = readFileSync(join(C, file));
  const iw = buf.readUInt32BE(16), ih = buf.readUInt32BE(20);
  const w = Math.round((iw * h) / ih);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`data:image/png;base64,${buf.toString("base64")}`} width={w} height={h} alt="" style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg)`, filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.6))" }} />;
};

const plans: [string, string, ReactNode][] = [
  ["2026-11-14-iphone13", "N1", (
    <Frame>
      <Phone file="iphone13-tora-flat.png" x={880} y={20} h={760} rot={-8} />
      <Col top={30}>
        <Outlined text="iPhone 13" size={140} color={WHITE} />
        <Outlined text="今買い？" size={184} color={YELLOW} />
        <TagBox text="相場5.1万円" style={{ marginTop: 22, fontSize: 116 }} />
        <div style={{ display: "flex", marginTop: 18 }}><Outlined text="条件は電池85%" size={104} color={WHITE} /></div>
      </Col>
    </Frame>
  )],
  ["2026-10-25-pro-or-standard", "N1", (
    <Frame>
      <Phone file="iphone16promax-desert-cut2.png" x={870} y={10} h={780} rot={-8} />
      <Col top={30}>
        <Outlined text="Proの差額で" size={128} color={WHITE} />
        <Outlined text="何が増える？" size={132} color={YELLOW} />
        <TagBox text="+1.5万円〜" style={{ marginTop: 22, fontSize: 120 }} />
        <div style={{ display: "flex", marginTop: 18 }}><Outlined text="120Hz・望遠" size={112} color={WHITE} /></div>
      </Col>
    </Frame>
  )],
];

(async () => {
  const fonts = await notoSansJp("iPhone 13今買い？相場5.1万円Proの差額で何が増える？+1.5万円〜条件は電池85%120Hz・望遠");
  for (const [dir, name, node] of plans) {
    const d = join(__dirname, dir); if (!existsSync(d)) mkdirSync(d, { recursive: true });
    const out = join(d, `thumb-${name}.png`);
    writeFileSync(out, Buffer.from(await new ImageResponse(node as React.ReactElement, { width: W, height: H, fonts }).arrayBuffer()));
    console.log(out);
  }
})();
