/**
 * 横動画のサムネ・第6弾（2026-11-13）。実写のストック写真を使う H 案（A は今の thumbnail.png、F・G は thumb-v5）
 *   npx tsx longform/thumb-v6.tsx [フォルダ名]   # 5本ぶん（下の PLANS）
 *   python -I longform/thumb-v6-contact.py       # 一覧 longform/thumb-v6-contact.png（A・第2案・H と 168x94）
 * 出力: <フォルダ>/thumb-H.png（1280x720）
 *
 * 決まり:
 * - 写真は longform/assets/stock-photo/（Pexels License。出どころは同じフォルダの SOURCES.md。git には入れない）
 * - 写真の機種は特定できないので「雰囲気・背景」として使う。写真の端末に機種名の札・矢印を付けない
 * - ロゴ・アプリの画面・人の顔が映る写真は使わない
 * - 文字は 2〜3行・太いふち取り・いちばん言いたい語は 180px 以上。文字の後ろに暗い（または色の）グラデーション
 * - 右下（x1030〜・y600〜）は再生時間の表示と重なるので文字を置かない。キャラなし・紺のベタ地なし
 * - 数字・機種名は各フォルダの script.md にあるものだけ
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";

// ───────────────────────── 文字（thumb-v5.tsx と同じ） ─────────────────────────

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
const Tag = ({ x, y, text, size, bg, color, pad = 24, radius = 0 }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number; radius?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: bg, borderRadius: radius, boxShadow: "5px 5px 0 rgba(0,0,0,0.45)" }}>
    <Plain text={text} size={size} color={color} />
  </div>
);
/** ✕（赤の丸）。図形で描く */
const Cross = ({ x, y, size }: { x: number; y: number; size: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", width: size, height: size, borderRadius: size, background: RED, border: `${Math.round(size * 0.07)}px solid ${WHITE}`, boxShadow: "0 6px 16px rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
    <div style={{ display: "flex", position: "relative", width: size * 0.56, height: size * 0.56 }}>
      <div style={{ position: "absolute", left: 0, top: size * 0.21, width: size * 0.56, height: size * 0.14, background: WHITE, borderRadius: 6, transform: "rotate(45deg)" }} />
      <div style={{ position: "absolute", left: 0, top: size * 0.21, width: size * 0.56, height: size * 0.14, background: WHITE, borderRadius: 6, transform: "rotate(-45deg)" }} />
    </div>
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
/** 写真を枠（x・y・w・h）いっぱいに切り出して置く（objectFit: cover と同じ計算）。
 *  zoom＝さらに拡大／fx・fy＝はみ出したぶんのどこを見せるか（0＝左・上、1＝右・下）／flip＝左右を反転 */
function Photo({ file, x = 0, y = 0, w = W, h = H, zoom = 1, fx = 0.5, fy = 0.5, flip }: { file: string; x?: number; y?: number; w?: number; h?: number; zoom?: number; fx?: number; fy?: number; flip?: boolean }) {
  const buf = readFileSync(join(PHOTO_DIR, file));
  const [iw, ih] = jpegSize(buf);
  const s = Math.max(w / iw, h / ih) * zoom;
  const dw = Math.round(iw * s), dh = Math.round(ih * s);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, display: "flex", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/jpeg;base64,${buf.toString("base64")}`} width={dw} height={dh} alt="" style={{ position: "absolute", left: Math.round(-(dw - w) * fx), top: Math.round(-(dh - h) * fy), ...(flip ? { transform: "scaleX(-1)" } : {}) }} />
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
  // 1本目「いま買うならどれ？」 script.md: 5万円なら iPhone 13・13 の相場 5.1万円（128GB）
  //   写真: 白地・手で持った黒い前面（機種は分からない）。左右を反転して右に寄せ、左に黄色を敷く
  "2026-10-21-iphone-dore": () => (
    <Frame bg={WHITE}>
      <Photo file="pexels-3295213.jpg" x={740} w={720} zoom={1.12} fx={0.5} fy={0.35} flip />
      <Shade bg={`linear-gradient(90deg, ${YELLOW} 0%, ${YELLOW} 50%, rgba(255,225,0,0.9) 58%, rgba(255,225,0,0) 68%)`} />
      <T x={30} y={30}><Outlined text="5万円" size={270} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <T x={690} y={180}><Outlined text="なら" size={100} color={BLACK} inner={{ w: 6, c: WHITE }} spacing={-3} /></T>
      <T x={32} y={330}><Outlined text="iPhone 13" size={176} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} /></T>
      <Tag x={36} y={566} text="中古の相場 5.1万円" size={78} bg={BLACK} color={WHITE} />
    </Frame>
  ),
  // 6本目「何世代まで買っていい？」 script.md: 最低ラインは iPhone 11 と SE 第2世代／X・XS・XR は iOS 27 非対応
  //   写真: グレー地・ケースに入った背面を手で持つ。札は付けず、文字だけで言い切る
  "2026-10-26-how-old": () => (
    <Frame bg={BLACK}>
      <Photo file="pexels-9558788.jpg" x={590} w={780} zoom={1.25} fx={0.62} fy={0.4} />
      <Shade bg="linear-gradient(90deg, #2A0A0A 0%, #5B1010 38%, rgba(91,16,16,0.85) 52%, rgba(60,10,10,0) 72%)" />
      <T x={34} y={34}><Outlined text="11より前は" size={150} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-6} /></T>
      <T x={26} y={212}><Outlined text="買うな" size={290} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <Tag x={36} y={566} text="iOS 27 非対応" size={84} bg={WHITE} color={RED} />
    </Frame>
  ),
  // 7本目「買ってはいけない5つの条件」 script.md: 電池80%未満／Apple の電池交換 13 は 15,600円
  //   写真: モバイルバッテリーにつないで充電している1台（左右を反転して右に寄せる）。左に赤黒を敷く
  "2026-10-27-dont-buy": () => (
    <Frame bg={BLACK}>
      <Photo file="pexels-37475662.jpg" x={110} w={1280} flip />
      <Shade bg="linear-gradient(90deg, #0B0B0F 0%, #4A0D0D 34%, rgba(74,13,13,0.88) 48%, rgba(40,8,8,0.3) 62%, rgba(0,0,0,0.12) 76%, rgba(0,0,0,0.12) 100%)" />
      <Cross x={24} y={24} size={132} />
      <T x={176} y={38}><Outlined text="電池" size={104} color={WHITE} outer={{ w: 7, c: BLACK }} spacing={-4} /></T>
      <T x={392} y={22}><Outlined text="80%未満" size={132} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-6} /></T>
      <T x={26} y={184}><Outlined text="買うな" size={270} color={WHITE} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <Tag x={36} y={520} text="交換すると15,600円" size={80} bg={YELLOW} color={BLACK} />
    </Frame>
  ),
  // 4本目「店選びの正解は？」 script.md: どの機種でも最安、っていう店はない／16店・41機種
  //   写真: 木の机に並んだ3台（前面）。右に寄せ、左に赤黒を敷く
  "2026-10-24-where-to-buy": () => (
    <Frame bg={BLACK}>
      <Photo file="pexels-4387770.jpg" x={420} w={860} zoom={1.3} fx={0.5} fy={0.22} />
      <Shade bg="linear-gradient(90deg, #2A0A0A 0%, #7A1414 30%, rgba(122,20,20,0.86) 44%, rgba(60,10,10,0.2) 66%, rgba(0,0,0,0) 80%)" />
      <Tag x={0} y={24} text="ぜんぶ安い店は" size={118} bg={YELLOW} color={BLACK} />
      <T x={40} y={196}><Outlined text="0店" size={380} color={WHITE} inner={{ w: 12, c: RED }} outer={{ w: 9, c: BLACK }} spacing={-10} /></T>
      <Tag x={0} y={606} text="16店・41機種で比較" size={74} bg={WHITE} color={BLACK} />
    </Frame>
  ),
  // 3本目「【中古iPad】いま買うならどれ？」 script.md: 7万円なら iPad Air の第5世代／絵を描くなら
  //   写真: 暗い部屋でペンで絵を描く手。右に寄せ、左は黒
  "2026-10-23-ipad-dore": () => (
    <Frame bg={BLACK}>
      <Photo file="pexels-2218171.jpg" x={480} w={950} zoom={1.0} fx={0.5} fy={0.5} />
      <Shade bg="linear-gradient(90deg, #0B0B0F 0%, #0B0B0F 30%, rgba(11,11,15,0.88) 50%, rgba(11,11,15,0.3) 64%, rgba(0,0,0,0) 76%)" />
      <Tag x={0} y={22} text="絵を描く中古iPad" size={80} bg={YELLOW} color={BLACK} />
      <T x={30} y={150}><Outlined text="7万円" size={280} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
      <T x={40} y={492}><Outlined text="Air 第5世代" size={160} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} /></T>
    </Frame>
  ),
};

(async () => {
  const only = process.argv[2]?.replace(/\\/g, "/").split("/").filter(Boolean).pop();
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  for (const [key, plan] of Object.entries(PLANS)) {
    if (only && only !== key) continue;
    const res = new ImageResponse(<>{plan()}</>, { width: W, height: H, fonts });
    writeFileSync(join(__dirname, key, "thumb-H.png"), Buffer.from(await res.arrayBuffer()));
    console.log(`H → longform/${key}`);
  }
})();
