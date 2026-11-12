/**
 * 横動画のサムネ・第11弾（2026-11-13）: 2026-11-14-iphone13「中古iPhone 13、いま買っていい？」の2案
 *   python -I longform/thumb-v11-iphone13-prep.py layers    # 端末の層（assets/v11-layers/N.png・N2.png。影つき）
 *   npx tsx longform/thumb-v11-iphone13.tsx                 # thumb-N.png・thumb-N2.png・thumb-credit-N.txt
 *   python -I longform/thumb-v11-iphone13-prep.py contact   # 一覧 longform/thumb-v11-contact.png
 *
 * 決まり（.claude/tmp/thumb-brief.md・thumb-v8.tsx と同じ）:
 * - 文字は 104px 以上・文字どうしと端末は 12px 以上あける・1枚 3 要素・右下（x1030〜・y600〜）に文字を置かない
 * - 端末の置き場所は prep の LAYERS。**文字の位置を変えたら LAYERS と重ならないか確かめる**
 * - 数字は script.md にあるものだけ: 結論「いまも、買っていい」（0:00）・相場 128GB 50,800円（＝5.1万円）
 * - 地の色は、すでに入れた thumb-K（黄）・thumb-L（赤黒）と見分けがつく色（N＝緑・N2＝白）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";
const DIR = join(__dirname, "2026-11-14-iphone13");
const CREDIT = "サムネイル画像（背景を切り抜き）: iPhone 13（All iPhone 13 Colors）— Daniel Romero / Unsplash License https://unsplash.com/photos/JSQva3za368";

function Layer({ name }: { name: string }) {
  const buf = readFileSync(join(__dirname, "assets", "v11-layers", `${name}.png`));
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`data:image/png;base64,${buf.toString("base64")}`} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />;
}
/** ふち取り文字（satori は text-stroke を描かないので16方向にずらして重ねる） */
function Outlined({ text, size, color, inner, outer, spacing = -4 }: { text: string; size: number; color: string; inner?: { w: number; c: string }; outer?: { w: number; c: string }; spacing?: number }) {
  const base = { display: "flex", fontSize: size, fontWeight: 900, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" } as const;
  const ring = (w: number, c: string, key: string) =>
    Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return <div key={`${key}${i}`} style={{ ...base, position: "absolute", left: Math.round(Math.cos(a) * w), top: Math.round(Math.sin(a) * w), color: c }}>{text}</div>;
    });
  return (
    <div style={{ display: "flex", position: "relative" }}>
      {outer && ring((inner?.w ?? 0) + outer.w, outer.c, "o")}
      {inner && ring(inner.w, inner.c, "i")}
      <div style={{ ...base, position: "relative", color }}>{text}</div>
    </div>
  );
}
const T = ({ x, y, children }: { x: number; y: number; children: ReactNode }) => <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "flex-end" }}>{children}</div>;
const Plain = ({ text, size, color, spacing = -3 }: { text: string; size: number; color: string; spacing?: number }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 900, color, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" }}>{text}</div>
);
const Tag = ({ x, y, text, size, bg, color, pad = 24 }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: bg, boxShadow: "5px 5px 0 rgba(0,0,0,0.45)" }}>
    <Plain text={text} size={size} color={color} />
  </div>
);
const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);
const GREEN_BG = "radial-gradient(circle at 82% 50%, #8CF2B4 0%, #14B863 46%, #06713A 100%)";
const WHITE_BG = "radial-gradient(circle at 78% 30%, #FFFFFF 0%, #F1F4F7 50%, #CFD8E1 100%)";

const PLANS: Record<string, ReactNode> = {
  // N（緑）: iPhone 13 150 ／ 買っていい 180 ／ 札 相場 5.1万円 124。端末は右の列（x 910〜）
  N: (
    <Frame bg={GREEN_BG}>
      <Layer name="N" />
      <T x={32} y={34}><Outlined text="iPhone 13" size={150} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      <T x={28} y={232}><Outlined text="買っていい" size={180} color={YELLOW} outer={{ w: 10, c: BLACK }} spacing={-10} /></T>
      <Tag x={32} y={474} text="相場 5.1万円" size={124} bg={WHITE} color={BLACK} />
    </Frame>
  ),
  // N2（白）: iPhone 13 150 ／ 札 相場 5.1万円 110 ／ 買っていい 200（下の帯）。端末は右上（y 〜446）
  N2: (
    <Frame bg={WHITE_BG}>
      <Layer name="N2" />
      <T x={30} y={30}><Plain text="iPhone 13" size={150} color={BLACK} spacing={-5} /></T>
      <Tag x={32} y={236} text="相場 5.1万円" size={110} bg={BLACK} color={YELLOW} pad={20} />
      <T x={28} y={488}><Outlined text="買っていい" size={200} color={RED} inner={{ w: 7, c: WHITE }} outer={{ w: 6, c: BLACK }} spacing={-10} /></T>
    </Frame>
  ),
};

(async () => {
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  for (const [name, node] of Object.entries(PLANS)) {
    const res = new ImageResponse(<>{node}</>, { width: W, height: H, fonts });
    writeFileSync(join(DIR, `thumb-${name}.png`), Buffer.from(await res.arrayBuffer()));
    console.log(`thumb-${name}.png`);
  }
  writeFileSync(join(DIR, "thumb-credit-N.txt"), `■ thumb-N.png・thumb-N2.png を使うとき（説明欄に貼る。Unsplash License は表記不要だが書いておく）\n${CREDIT}\n`);
})();
