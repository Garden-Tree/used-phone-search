/**
 * 横動画のサムネ・第12弾（2026-11-13）: 2026-11-20-iphone16「中古iPhone 16、いま買っていい？」
 *   python -I longform/thumb-v12-iphone16-prep.py layers    # 端末の層（assets/v12-layers/N.png。影つき）
 *   npx tsx longform/thumb-v12-iphone16.tsx                 # thumb-N.png・thumb-credit-N.txt
 *   python -I longform/thumb-v12-iphone16-prep.py contact   # 一覧 longform/thumb-v12-contact.png
 *
 * 決まり（.claude/tmp/thumb-brief.md・thumb-v11-iphone13.tsx と同じ）:
 * - 文字は 104px 以上・文字どうしと端末は 12px 以上あける・1枚 3 要素・右下（x1030〜・y600〜）に文字を置かない
 * - 端末の置き場所は prep の LAYERS（x 901〜）。**文字の位置を変えたら LAYERS と重ならないか確かめる**
 * - 数字は script.md にあるものだけ: 新品との差 19,000円（＝1.9万円・0:00）・中古の相場 128GB 120,800円（＝12.1万円）
 * - 地の色は、すでに入れた thumb-K（黄）・thumb-L（赤黒）・13 の回（緑）と見分けがつく色（オレンジ。端末の青と反対の色）
 * - 写真は CC BY 4.0（Padgriffin）。説明欄にクレジットが必須（thumb-credit-N.txt）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";
const DIR = join(__dirname, "2026-11-20-iphone16");
const CREDIT = "サムネイル画像（背景を切り抜き）: iPhone 16 ウルトラマリン（IPhone 16 Ultramarine Rear）— Padgriffin / CC BY 4.0 https://commons.wikimedia.org/wiki/File:IPhone_16_Ultramarine_Rear.png";

function Layer({ name }: { name: string }) {
  const buf = readFileSync(join(__dirname, "assets", "v12-layers", `${name}.png`));
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`data:image/png;base64,${buf.toString("base64")}`} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />;
}
/** ふち取り文字（satori は text-stroke を描かないので16方向にずらして重ねる） */
function Outlined({ text, size, color, outer, spacing = -4 }: { text: string; size: number; color: string; outer: { w: number; c: string }; spacing?: number }) {
  const base = { display: "flex", fontSize: size, fontWeight: 900, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" } as const;
  return (
    <div style={{ display: "flex", position: "relative" }}>
      {Array.from({ length: 16 }, (_, i) => {
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
const Tag = ({ x, y, text, size, bg, color, pad = 24 }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: bg, boxShadow: "5px 5px 0 rgba(0,0,0,0.45)" }}>
    <Plain text={text} size={size} color={color} />
  </div>
);
const ORANGE_BG = "radial-gradient(circle at 84% 50%, #FFD9A0 0%, #FF8A1F 46%, #B84300 100%)";

// N（オレンジ）: iPhone 16 120 ／ 新品と 116 ＋ 1.9万円差 196（主役・2行）／ 札 中古 12.1万円 106。端末は右の列（x 901〜）
const PLAN = (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: ORANGE_BG, fontFamily: FONT, overflow: "hidden" }}>
    <Layer name="N" />
    <T x={32} y={22}><Outlined text="iPhone 16" size={120} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-4} /></T>
    <T x={32} y={168}><Outlined text="新品と" size={116} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-4} /></T>
    <T x={30} y={308}><Outlined text="1.9万円差" size={196} color={YELLOW} outer={{ w: 10, c: BLACK }} spacing={-11} /></T>
    <Tag x={32} y={548} text="中古 12.1万円" size={106} bg={WHITE} color={BLACK} />
  </div>
);

(async () => {
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  const res = new ImageResponse(PLAN, { width: W, height: H, fonts });
  writeFileSync(join(DIR, "thumb-N.png"), Buffer.from(await res.arrayBuffer()));
  console.log("thumb-N.png");
  writeFileSync(join(DIR, "thumb-credit-N.txt"), `■ thumb-N.png を使うとき（説明欄に貼る。CC BY 4.0 なので表記は必須）\n${CREDIT}\n`);
})();
