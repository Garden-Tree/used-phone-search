/**
 * 横動画のサムネ・第10弾 d 組（2026-11-13）。Watch・Pixel・iPad 何世代・iPad mini・折りたたみの5本
 *   npx tsx longform/thumb-v10-d.tsx [フォルダ名]
 *   python -I longform/thumb-v10-d-contact.py   # 一覧 longform/thumb-v10-d-contact.png
 * 出力: <フォルダ>/thumb-N.png（1280x720）
 *
 * 決まり（README「サムネの文字と切り抜き」「サムネの素材」・thumb-v9.tsx と同じ）:
 * - 104px 未満の文字は置かない。文字どうし・文字と端末を重ねない。1枚 2〜3 要素。右下に文字を置かない
 * - 写真は assets/commons/（CC0・CC BY）と assets/stock-photo/（Pexels）。出どころは各 SOURCES.md
 * - 機種を文字で言うのは、撮影者がその機種だと書いた写真だけ（iPad mini A17 Pro）。ほかは種類の絵として使う
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";

// ───────────────────────── 文字（thumb-v6.tsx と同じ） ─────────────────────────

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
const Tag = ({ x, y, text, size, bg, color, pad = 16 }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: bg, boxShadow: "5px 5px 0 rgba(0,0,0,0.45)" }}>
    <Plain text={text} size={size} color={color} />
  </div>
);

// ───────────────────────── 写真 ─────────────────────────

/** JPEG の幅と高さ（SOF0〜SOF2 を読む） */
function jpegSize(b: Buffer): [number, number] {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xc2) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error("JPEG の大きさが読めない");
}
/** 写真を scale 倍にして、左上を (left, top) に置く（元の写真の (px,py) は left+px*scale, top+py*scale に来る）。
 *  clipX より左は見せない */
function Photo({ file, scale, left, top, clipX = 0 }: { file: string; scale: number; left: number; top: number; clipX?: number }) {
  const buf = readFileSync(join(__dirname, "assets", file));
  const [iw, ih] = jpegSize(buf);
  const dw = Math.round(iw * scale), dh = Math.round(ih * scale);
  return (
    <div style={{ position: "absolute", left: clipX, top: 0, width: W - clipX, height: H, display: "flex", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/jpeg;base64,${buf.toString("base64")}`} width={dw} height={dh} alt="" style={{ position: "absolute", left: left - clipX, top }} />
    </div>
  );
}
/** 写真の上に敷く色（グラデーション） */
const Shade = ({ bg, x = 0, y = 0, w = W, h = H }: { bg: string; x?: number; y?: number; w?: number; h?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, display: "flex", background: bg }} />
);
const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);

const PLANS: Record<string, () => ReactNode> = {
  // Apple Watch。script.md 0:00「Series 9 相場 38,280円（45mm）」・題「3.8万円で正解」
  //   写真: 腕に着けた Apple Watch（Commons・whity・CC BY 2.0。機種の記述なし → 機種名は書かない）
  "2026-11-11-apple-watch": () => (
    <Frame bg={BLACK}>
      <Photo file="commons/applewatch-wrist-whity.jpg" scale={0.38} left={226} top={-52} clipX={700} />
      <Shade bg="linear-gradient(90deg, #0B0B0F 0%, #3A2410 35%, #3A2410 55%, rgba(58,36,16,0) 63%)" />
      <T x={28} y={34}><Outlined text="Apple Watch" size={116} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      <T x={28} y={190}><Outlined text="3.8万円" size={214} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <Tag x={0} y={556} text="これが正解" size={112} bg={WHITE} color={RED} />
    </Frame>
  ),
  // Pixel。script.md 0:00「6a 年44,700円 / 8a 年10,215円」・題「1年あたりで4倍の差」
  //   写真: 手で持った Pixel 8a の前面（Commons・Miyako Fujimiya・CC BY 4.0。画面に Meet Pixel 8a）
  "2026-11-07-pixel": () => (
    <Frame bg={BLACK}>
      <Photo file="commons/pixel8a-front-hand.jpg" scale={0.205} left={640} top={0} clipX={700} />
      <Shade bg="linear-gradient(90deg, #0B0B0F 0%, #0E2A4A 35%, #0E2A4A 56%, rgba(14,42,74,0) 64%)" />
      <T x={28} y={30}><Outlined text="安いほど" size={150} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      <T x={28} y={206}><Outlined text="4倍損" size={250} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <Tag x={0} y={560} text="1年あたりで" size={110} bg={YELLOW} color={BLACK} />
    </Frame>
  ),
  // iPad 何世代まで。script.md 0:00「無印の最低ライン 第9世代 / 相場 42,800円（64GB）」・題「相場4.3万円」
  //   写真: 木のテーブルのタブレット（Pexels 29046924・機種は分からない）
  "2026-11-06-ipad-how-old": () => (
    <Frame bg={BLACK}>
      <Photo file="stock-photo/pexels-29046924.jpg" scale={0.6} left={376} top={-49} clipX={640} />
      <Shade bg="linear-gradient(90deg, #0B0B0F 0%, #3B1A08 35%, #3B1A08 52%, rgba(59,26,8,0) 58%)" />
      <T x={28} y={34}><Outlined text="最低ラインは" size={112} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      <T x={24} y={192}><Outlined text="第9世代" size={184} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <Tag x={0} y={566} text="相場 4.3万円" size={108} bg={WHITE} color={RED} />
    </Frame>
  ),
  // 新型 iPad mini。script.md 0:00「新型 128GB 119,800円 / 中古の A17 Pro 83,800円 / 差 36,000円」
  //   写真: iPad mini（A17 Pro）の背面（Commons・AzureSaturn・CC0。説明に機種名・背面に iPad mini の刻印）
  "2026-10-30-ipad-mini": () => (
    <Frame bg={BLACK}>
      <Photo file="commons/ipadmini-a17pro-starlight-back.jpg" scale={0.172} left={722} top={-16} clipX={722} />
      <Shade bg="linear-gradient(90deg, #0B0B0F 0%, #4A0D0D 40%, #4A0D0D 100%)" w={722} />
      <T x={28} y={34}><Outlined text="iPad mini" size={136} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      <T x={28} y={212}><Outlined text="3.6万円" size={196} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <Tag x={0} y={556} text="中古が安い" size={112} bg={YELLOW} color={BLACK} />
    </Frame>
  ),
  // 折りたたみ。script.md 0:00「Pixel 10 Pro Fold 中古 17.28万円」・サムネ案「中古なら17.3万円」
  //   写真: 開いた折りたたみを手で持つ（Commons・Miyako Fujimiya・CC BY 4.0。Galaxy Z Fold 6 → 機種名は書かない）
  "2026-11-04-foldables": () => (
    <Frame bg={BLACK}>
      <Photo file="commons/galaxy-zfold6-open.jpg" scale={0.21} left={690} top={-90} clipX={690} />
      <Shade bg="linear-gradient(90deg, #0B0B0F 0%, #2A1150 40%, #2A1150 86%, rgba(42,17,80,0) 100%)" w={800} />
      <T x={28} y={30}><Outlined text="折りたたみ" size={140} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      <T x={24} y={200}><Outlined text="17.3万円" size={190} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <Tag x={0} y={560} text="中古の相場" size={112} bg={WHITE} color={RED} />
    </Frame>
  ),
};

(async () => {
  const only = process.argv[2]?.replace(/\\/g, "/").split("/").filter(Boolean).pop();
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  for (const [key, plan] of Object.entries(PLANS)) {
    if (only && only !== key) continue;
    const res = new ImageResponse(<>{plan()}</>, { width: W, height: H, fonts });
    writeFileSync(join(__dirname, key, "thumb-N.png"), Buffer.from(await res.arrayBuffer()));
    console.log(`N → longform/${key}`);
  }
})();
