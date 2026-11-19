/**
 * 横動画 2026-11-26-blackfriday のサムネ（2026-11-19・型R＝暗い地＋発見が最大。thumb-v14-finding.tsx と同じ部品）
 *   python longform/thumb-bf-prep.py                       # Pixel 10a の切り抜きと層（assets/bf-layers/）
 *   npx tsx longform/thumb-bf-finding.tsx                  # 2026-11-26-blackfriday/thumb-R1.png・R2・R3
 *   npx tsx longform/thumb-bf-finding.tsx --check <dir>    # 文字だけ（黒地・端末なし・黒ふちは灰色）を <dir>/R1.png… に出す
 *   python -I longform/thumb-bf-check.py [<dir>]           # 一覧 thumb-contact.png（<dir> があれば余白・右下・端末との重なりを測る）
 *
 * 決まり: 文字 104px 以上・1枚 2〜3 要素・文字と札は端から 60px 以上・文字どうし／文字と端末は重ねない・右下（x1030〜・y600〜）に文字なし
 * 数字は script.md のものだけ: Pixel 10a 128GB セールの新品 78,880円・中古の相場 82,280円・新品が 3,400円安い
 * 写真: Unsplash の Pixel 10a（Gavin Phillips・Unsplash License。thumb-credit.txt）
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";
const EDGE = 60;
const CHECK = process.argv[2] === "--check";
const DIR = "2026-11-26-blackfriday";
const OUTC = (c: string) => (CHECK && c === BLACK ? "#808080" : c);

function Layer({ name }: { name: string }) {
  if (CHECK) return null;
  const buf = readFileSync(join(__dirname, "assets", "bf-layers", `${name}.png`));
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`data:image/png;base64,${buf.toString("base64")}`} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />;
}
function Outlined({ text, size, color, w, spacing = -4 }: { text: string; size: number; color: string; w: number; spacing?: number }) {
  const base = { display: "flex", fontSize: size, fontWeight: 900, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" } as const;
  return (
    <div style={{ display: "flex", position: "relative" }}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <div key={i} style={{ ...base, position: "absolute", left: Math.round(Math.cos(a) * w), top: Math.round(Math.sin(a) * w), color: OUTC(BLACK) }}>{text}</div>;
      })}
      <div style={{ ...base, position: "relative", color }}>{text}</div>
    </div>
  );
}
const T = ({ x, y, children }: { x: number; y: number; children: ReactNode }) => <div style={{ position: "absolute", left: x, top: y, display: "flex" }}>{children}</div>;
const Plain = ({ text, size, color, spacing = -3 }: { text: string; size: number; color: string; spacing?: number }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 900, color, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" }}>{text}</div>
);
const Tag = ({ x, y, text, size, color, pad = 18, spacing = -3 }: { x: number; y: number; text: string; size: number; color: string; pad?: number; spacing?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: WHITE, ...(CHECK ? {} : { boxShadow: "5px 5px 0 rgba(0,0,0,0.6)" }) }}>
    <Plain text={text} size={size} color={color} spacing={spacing} />
  </div>
);
const Frame = ({ children }: { children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: CHECK ? "#000000" : DARK, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);
// 暗い地（ほぼ黒の紺）。端末のうしろ（右下）だけ少し明るくして輪郭を出す
const DARK = "radial-gradient(circle at 74% 100%, #3A4260 0%, #161B2C 42%, #06070B 100%)";

// R1: Pixel 10a（白 124）／ 新品が安い（黄 196・主役）。2行＋端末＝3要素
const r1 = (
  <Frame>
    <Layer name="bf-bottom" />
    <T x={EDGE + 6} y={60}><Outlined text="Pixel 10a" size={124} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 10} y={212}><Outlined text="新品が安い" size={196} color={YELLOW} w={10} spacing={-10} /></T>
  </Frame>
);
// R2: Pixel 10a（白 116）／ 新品が安い（黄 172・主役）／ 札 −3,400円（赤 104）。端末は少し右（bf-bottom2）
const r2 = (
  <Frame>
    <Layer name="bf-bottom2" />
    <T x={EDGE + 6} y={60}><Outlined text="Pixel 10a" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="新品が安い" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={448} text="−3,400円" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);
// R3: 新品が安い（黄 172・主役）／ 札2行 セール 78,880円（赤）・中古 82,280円（黒）。端末は小さく右下（bf-small）。機種名は写真と題に任せる
const r3 = (
  <Frame>
    <Layer name="bf-small" />
    <T x={EDGE + 9} y={60}><Outlined text="新品が安い" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <div style={{ position: "absolute", left: EDGE, top: 272, display: "flex", flexDirection: "column", padding: "14px 20px", gap: 12, background: WHITE, ...(CHECK ? {} : { boxShadow: "5px 5px 0 rgba(0,0,0,0.6)" }) }}>
      <Plain text="セール78,880円" size={104} color={RED} spacing={-6} />
      <Plain text="中古　82,280円" size={104} color={BLACK} spacing={-6} />
    </div>
  </Frame>
);

(async () => {
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  const plans: [string, ReactNode][] = [["R1", r1], ["R2", r2], ["R3", r3]];
  const checkDir = CHECK ? process.argv[3] : "";
  if (CHECK) mkdirSync(checkDir, { recursive: true });
  for (const [name, node] of plans) {
    const res = new ImageResponse(<>{node}</>, { width: W, height: H, fonts });
    const out = CHECK ? join(checkDir, `${name}.png`) : join(__dirname, DIR, `thumb-${name}.png`);
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(out);
  }
})();
