/**
 * 横動画のサムネ・第10弾 c 組（2026-11-13）。MacBook の5本を「実写を右、文字を左」の型で作り直す
 *   npx tsx longform/thumb-v10-c.tsx [フォルダ名]
 *   python -I longform/thumb-v10-c-contact.py   # 一覧 longform/thumb-v10-c-contact.png
 * 出力: <フォルダ>/thumb-N.png（1280x720）
 *
 * 決まり（.claude/tmp/thumb-brief.md・README「サムネの文字と切り抜き」「サムネの素材」）:
 * - 104px 未満の文字は置かない。文字どうし・文字と端末を重ねない（ふち取りを含めて 12px 以上）
 * - 1枚 2〜3 要素。いちばん言いたい語は 180px 以上。右下（x1030〜・y600〜）に文字を置かない
 * - 数字は各フォルダの script.md にあるものだけ
 * - 写真は longform/assets/（stock-photo/ は Unsplash License、commons/ は CC0。出どころは各 SOURCES.md）
 *   機種を文字で言う回は、撮影者がその機種だと書いた写真だけ（M1 Air・MacBook Air M2・MacBook Pro）
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

const PHOTO_DIR = join(__dirname, "assets");
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
  // M1 Air「まだ使える？」 script.md 0:00: まだ使える／中古の相場 8GB・256GB 83,980円
  //   写真: Commons「MacBook M1」（CC0・Wilfredor。画面の下に MacBook Air の文字）。白い背景・正面
  "2026-11-03-m1-air": () => (
    <Frame bg="#2A0A0A">
      <Photo file="commons/commons-macbook-air-m1-wilfredor.jpg" scale={0.2815} left={446} top={0} />
      <Shade bg="linear-gradient(90deg, #2A0A0A 0%, #5B1010 30%, #5B1010 50%, rgba(91,16,16,0) 56%)" />
      <Tag x={0} y={18} text="M1 Air" size={124} bg={YELLOW} color={BLACK} />
      <T x={28} y={206}><Outlined text="まだ使える" size={132} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      <T x={28} y={396}><Outlined text="8.4万円" size={190} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-10} /></T>
    </Frame>
  ),
  // Pro と Air の違い script.md 0:00: ネットと動画と書類なら Air で足りる／新品の差は 115,000円
  //   写真: Unsplash 6M9bAK5l4_o（James Yarema・タグ MacBook Air M2）
  "2026-11-01-mbp-vs-mba": () => (
    <Frame bg="#101216">
      <Photo file="stock-photo/unsplash-6M9bAK5l4_o-macbook-air-open-desk.jpg" scale={0.36} left={454} top={144} />
      <Shade h={300} bg="linear-gradient(180deg, #101216 0%, #101216 48%, rgba(16,18,22,0) 62%)" />
      <Shade bg="linear-gradient(90deg, #101216 0%, #101216 44%, rgba(16,18,22,0) 51%)" />
      <Tag x={0} y={0} text="新品11.5万円差" size={108} bg={YELLOW} color={BLACK} />
      <T x={28} y={172}><Outlined text="Airで" size={196} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-8} /></T>
      <T x={28} y={410}><Outlined text="十分" size={250} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-10} /></T>
    </Frame>
  ),
  // MacBook Pro の4択 script.md 0:00: 4つ／④ 中古 M5 Pro 相場 402,980円
  //   写真: Unsplash a0d9V7Ht744（Bram Van Oost・タグ MacBook Pro）。新型そのものの写真ではないので機種の札は付けない
  "2026-10-31-mbp-proled": () => (
    <Frame bg={BLACK}>
      <Photo file="stock-photo/unsplash-a0d9V7Ht744-macbook-pro-front-brick.jpg" scale={0.45} left={428} top={0} />
      <Shade h={230} bg="linear-gradient(180deg, rgba(11,11,15,0.9) 0%, rgba(11,11,15,0.75) 70%, rgba(11,11,15,0) 100%)" />
      <Shade bg="linear-gradient(90deg, #0B0B0F 0%, #2A1408 30%, #2A1408 44%, rgba(42,20,8,0) 51%)" />
      <T x={28} y={22}><Outlined text="MacBook Pro" size={118} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-4} /></T>
      <T x={28} y={176}><Outlined text="4択" size={290} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-10} /></T>
      <Tag x={0} y={556} text="中古40.3万" size={112} bg={WHITE} color={RED} />
    </Frame>
  ),
  // 中古MacBook 予算別 script.md 0:00: 予算別の正解・10万／12万／15万／20万円の4台
  //   写真: Unsplash 2QnzuTES1n8（Daria Glakteeva・タグ MacBook）。機種は分からないので機種の札なし
  "2026-11-02-macbook": () => (
    <Frame bg="#1B1B1D">
      <Photo file="stock-photo/unsplash-2QnzuTES1n8-macbook-lid-headphones.jpg" scale={0.45} left={690} top={0} />
      <Shade bg="linear-gradient(90deg, #1B1B1D 0%, #1B1B1D 53.5%, rgba(27,27,29,0) 57%)" />
      <Tag x={0} y={18} text="中古MacBook" size={104} bg={YELLOW} color={BLACK} />
      <T x={28} y={196}><Outlined text="正解4台" size={184} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-10} /></T>
      <T x={28} y={440}><Outlined text="10万円〜" size={150} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-6} /></T>
    </Frame>
  ),
  // 新型 M6 か中古か script.md 0:00・まとめ: 中古の M5 は 286,980円（新型より −52,820円＝5万円浮かせる）
  //   写真: Unsplash ylqeFa_-PvA（Thai Nguyen・タグ MacBook Pro）。M6 そのものではないので機種の札は付けない
  "2026-10-29-mbp-m6": () => (
    <Frame bg="#0B0B0F">
      <Photo file="stock-photo/unsplash-ylqeFa_-PvA-macbook-pro-half-open.jpg" scale={0.45} left={384} top={0} />
      <Shade bg="linear-gradient(90deg, #0B0B0F 0%, #10233F 30%, #10233F 50%, rgba(16,35,63,0) 56%)" />
      <T x={28} y={24}><Outlined text="新型M6より" size={118} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      <T x={28} y={184}><Outlined text="5.3万円" size={190} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-10} /></T>
      <Tag x={0} y={566} text="中古M5が安い" size={104} bg={YELLOW} color={BLACK} />
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
