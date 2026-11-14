/**
 * 横動画のサムネ・第14弾（2026-11-14）: 「発見（数字）がいちばん大きい＋暗い地」の案（13 と 16 に各2枚・候補だけ）
 *   npx tsx longform/thumb-v14-finding.tsx            # 各フォルダの thumb-R1.png・thumb-R2.png
 *   npx tsx longform/thumb-v14-finding.tsx --check <dir>   # 文字だけ（黒地・端末なし）を <dir> に出す（余白と重なりの検査用）
 *   python -I longform/thumb-v14-contact.py [<dir>]   # 一覧 longform/thumb-v14-contact.png（<dir> があれば余白と重なりも測る）
 *
 * ねらい: CTR 4〜5% の回（jirai・apple-watch の thumb-N）は暗い地＋その回だけの発見が最大。13 の回（緑の地＋「今買い？」が最大）は 1.6%
 * 決まりは thumb-v13-imakai.tsx と同じ: 文字 104px 以上・1枚 2〜3 要素・文字と札は端から 60px 以上・
 *   文字どうしと端末は重ねない（札は端末に少しかかってよい）・右下（x1030〜・y600〜）に文字を置かない
 * 端末の層は assets/v13-layers/（同じ写真・クレジットは各フォルダの thumb-credit-N.txt と同じ）
 * 数字は script.md にあるものだけ:
 *   13: 相場 128GB 50,800円（5.1万円）・電池85%以上は 128GB 1,263件のうち 148件（1割ちょっと）・結論「いまも買っていい」
 *   16: 新品との差 19,000円（1.9万円）・未使用品（ランクS）151,008円＝新品 139,800円より高い
 * thumbnail.png・thumb-N*.png・thumb-Q*.png は使用中なので書かない（このファイルは thumb-R*.png だけ）
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

function Layer({ name }: { name: string }) {
  if (CHECK) return null;
  const buf = readFileSync(join(__dirname, "assets", "v13-layers", `${name}.png`));
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`data:image/png;base64,${buf.toString("base64")}`} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />;
}
/** ふち取り文字（satori は text-stroke を描かないので16方向にずらして重ねる） */
function Outlined({ text, size, color, outer, spacing = -4 }: { text: string; size: number; color: string; outer?: { w: number; c: string }; spacing?: number }) {
  const base = { display: "flex", fontSize: size, fontWeight: 900, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" } as const;
  return (
    <div style={{ display: "flex", position: "relative" }}>
      {outer && Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <div key={i} style={{ ...base, position: "absolute", left: Math.round(Math.cos(a) * outer.w), top: Math.round(Math.sin(a) * outer.w), color: outer.c }}>{text}</div>;
      })}
      <div style={{ ...base, position: "relative", color }}>{text}</div>
    </div>
  );
}
const T = ({ x, y, children }: { x: number; y: number; children: ReactNode }) => <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "flex-end" }}>{children}</div>;
const Plain = ({ text, size, color, spacing = -3 }: { text: string; size: number; color: string; spacing?: number }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 900, color, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" }}>{text}</div>
);
const Tag = ({ x, y, text, size, color, pad = 18, spacing = -3 }: { x: number; y: number; text: string; size: number; color: string; pad?: number; spacing?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: WHITE, ...(CHECK ? {} : { boxShadow: "5px 5px 0 rgba(0,0,0,0.6)" }) }}>
    <Plain text={text} size={size} color={color} spacing={spacing} />
  </div>
);
const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: CHECK ? "#000000" : bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);

// 暗い地（ほぼ黒）。端末のうしろだけ少し明るくして端末の輪郭を出す
const DARK_GREEN = "radial-gradient(circle at 84% 50%, #1E4A33 0%, #0C1F16 46%, #050807 100%)";
const DARK_RED = "radial-gradient(circle at 84% 50%, #54201C 0%, #200C0B 46%, #080505 100%)";
const OUT = { c: "#000000" };

// 13-R1: iPhone 13（白 108）／ 買っていい（黄 184・主役）／ 札 電池85%以上は1割（104）。端末は narrow（x 1000〜）
const r1_13 = (
  <Frame bg={DARK_GREEN}>
    <Layer name="13-narrow" />
    <T x={EDGE} y={64}><Outlined text="iPhone 13" size={108} color={WHITE} outer={{ w: 6, ...OUT }} spacing={-4} /></T>
    <T x={EDGE} y={206}><Outlined text="買っていい" size={184} color={YELLOW} outer={{ w: 10, ...OUT }} spacing={-10} /></T>
    <Tag x={EDGE} y={466} text="電池85%以上は1割" size={104} color={BLACK} spacing={-4} />
  </Frame>
);
// 13-R2: iPhone 13（白 108）／ 5.1万円（黄 240・主役）／ 札 まだ買っていい（108）。端末は wide（x 917〜）
const r2_13 = (
  <Frame bg={DARK_GREEN}>
    <Layer name="13-wide" />
    <T x={EDGE} y={64}><Outlined text="iPhone 13" size={108} color={WHITE} outer={{ w: 6, ...OUT }} spacing={-4} /></T>
    <T x={EDGE} y={202}><Outlined text="5.1万円" size={240} color={YELLOW} outer={{ w: 11, ...OUT }} spacing={-12} /></T>
    <Tag x={EDGE} y={486} text="まだ買っていい" size={108} color={BLACK} />
  </Frame>
);
// 16-R1: iPhone 16（白 108）／ 新品と（白 124）／ 1.9万円差（黄 190・主役）。札なし（3要素）。端末は wide
const r1_16 = (
  <Frame bg={DARK_RED}>
    <Layer name="16-wide" />
    <T x={EDGE} y={70}><Outlined text="iPhone 16" size={108} color={WHITE} outer={{ w: 6, ...OUT }} spacing={-4} /></T>
    <T x={EDGE} y={222}><Outlined text="新品と" size={124} color={WHITE} outer={{ w: 7, ...OUT }} spacing={-4} /></T>
    <T x={EDGE} y={390}><Outlined text="1.9万円差" size={190} color={YELLOW} outer={{ w: 10, ...OUT }} spacing={-11} /></T>
  </Frame>
);
// 16-R2: iPhone 16（白 104）／ 未使用品は（白 140）／ 新品より高い（黄 156・主役）。端末は narrow（x 1030〜）
const r2_16 = (
  <Frame bg={DARK_RED}>
    <Layer name="16-narrow" />
    <T x={EDGE} y={66}><Outlined text="iPhone 16" size={104} color={WHITE} outer={{ w: 6, ...OUT }} spacing={-4} /></T>
    <T x={EDGE} y={220}><Outlined text="未使用品は" size={140} color={WHITE} outer={{ w: 8, ...OUT }} spacing={-6} /></T>
    <T x={EDGE} y={410}><Outlined text="新品より高い" size={156} color={YELLOW} outer={{ w: 9, ...OUT }} spacing={-8} /></T>
  </Frame>
);

(async () => {
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  const plans: [string, string, ReactNode][] = [
    ["2026-11-14-iphone13", "R1", r1_13], ["2026-11-14-iphone13", "R2", r2_13],
    ["2026-11-20-iphone16", "R1", r1_16], ["2026-11-20-iphone16", "R2", r2_16],
  ];
  const checkDir = CHECK ? process.argv[3] : "";
  if (CHECK) mkdirSync(checkDir, { recursive: true });
  for (const [dir, name, node] of plans) {
    const res = new ImageResponse(<>{node}</>, { width: W, height: H, fonts });
    const out = CHECK ? join(checkDir, `${dir.slice(-2)}-${name}.png`) : join(__dirname, dir, `thumb-${name}.png`);
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(out);
  }
})();
