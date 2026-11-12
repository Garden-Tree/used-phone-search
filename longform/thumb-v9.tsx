/**
 * 横動画のサムネ・第9弾（2026-11-13）。thumb-v6 の H 案を、ユーザーの新しい基準で作り直した M 案
 *   npx tsx longform/thumb-v9.tsx [フォルダ名]   # 3本ぶん（下の PLANS）
 *   python -I longform/thumb-v9-contact.py       # 一覧 longform/thumb-v9-contact.png（H・M と 168x94）
 * 出力: <フォルダ>/thumb-M.png（1280x720）
 *
 * 決まり（README「サムネの文字と切り抜き」「サムネの素材」）:
 * - 104px 未満の文字は置かない。入らない文字は短く言い換えるか消す（数字は script.md にあるものだけ）
 * - 文字どうし・文字と写真の主役（端末・手・ケーブル）を重ねない。ふち取りを含めて 12px 以上あける
 * - 1枚 2〜3 要素。いちばん言いたい語は 180px 以上。右下（x1030〜・y600〜）に文字を置かない
 * - 写真は longform/assets/stock-photo/（Pexels License・SOURCES.md）。キャラなし・紺のベタ地なし
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

const PHOTO_DIR = join(__dirname, "assets", "stock-photo");
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
  const buf = readFileSync(join(PHOTO_DIR, file));
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
  // 6本目「何世代まで買っていい？」 script.md: iOS 27 に対応しているのは iPhone 11 以降／X・XS・XR は非対応
  //   写真: 青地・手で持った前面（機種は分からない）。0.66 倍で右へ。端末の左上の角は (700,214)
  "2026-10-26-how-old": () => (
    <Frame bg="#2A0A0A">
      <Photo file="pexels-18241409.jpg" scale={0.66} left={479} top={-70} />
      <Shade bg="linear-gradient(90deg, #2A0A0A 0%, #5B1010 30%, #5B1010 40%, rgba(91,16,16,0) 55%)" />
      <T x={28} y={30}><Outlined text="11より前は" size={130} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      <T x={28} y={184}><Outlined text="買うな" size={225} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <Tag x={0} y={542} text="iOS 27 非対応" size={124} bg={WHITE} color={RED} />
    </Frame>
  ),
  // 7本目「買ってはいけない5つの条件」 script.md: 電池80%未満／Apple の電池交換 12〜13 は 15,600円
  //   写真: 充電中の1台とオレンジのケーブル。0.70 倍で右へ（ケーブルの左端は x740・端末の左端は (796,420)）。
  //   1行目は壁（写真の余白）の上まで伸ばすので、上にも暗い帯を敷く
  "2026-10-27-dont-buy": () => (
    <Frame bg={BLACK}>
      <Photo file="pexels-37475662.jpg" scale={0.7} left={607} top={0} />
      <Shade h={200} bg="linear-gradient(180deg, rgba(40,8,8,0.92) 0%, rgba(40,8,8,0.8) 78%, rgba(40,8,8,0) 100%)" />
      <Shade bg="linear-gradient(90deg, #0B0B0F 0%, #4A0D0D 30%, #4A0D0D 48%, rgba(74,13,13,0) 58%)" />
      <T x={28} y={20}>
        <Outlined text="電池" size={146} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} />
        <div style={{ display: "flex", width: 14 }} />
        <Outlined text="80%未満" size={146} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-5} />
      </T>
      <T x={28} y={200}><Outlined text="買うな" size={244} color={WHITE} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <Tag x={0} y={566} text="交換 15,600円" size={108} bg={YELLOW} color={BLACK} />
    </Frame>
  ),
  // 3本目「【中古iPad】いま買うならどれ？」 script.md: 7万円なら iPad Air の第5世代／絵を描くなら
  //   写真: 暗い部屋でペンで絵を描く手。0.6 倍・ペン先と手を右 580px に（x700 より左は見せない）
  "2026-10-23-ipad-dore": () => (
    <Frame bg={BLACK}>
      <Photo file="pexels-2218171.jpg" scale={0.6} left={260} top={-20} clipX={700} />
      <Shade bg="linear-gradient(90deg, #0B0B0F 0%, #0B0B0F 55%, rgba(11,11,15,0) 61%)" />
      <Tag x={0} y={20} text="絵を描くなら" size={108} bg={YELLOW} color={BLACK} />
      <T x={30} y={184}><Outlined text="7万円" size={256} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <T x={30} y={492}><Outlined text="Air 第5世代" size={128} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} /></T>
    </Frame>
  ),
};

(async () => {
  const only = process.argv[2]?.replace(/\\/g, "/").split("/").filter(Boolean).pop();
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  for (const [key, plan] of Object.entries(PLANS)) {
    if (only && only !== key) continue;
    const res = new ImageResponse(<>{plan()}</>, { width: W, height: H, fonts });
    writeFileSync(join(__dirname, key, "thumb-M.png"), Buffer.from(await res.arrayBuffer()));
    console.log(`M → longform/${key}`);
  }
})();
