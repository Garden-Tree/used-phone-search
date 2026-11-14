/**
 * 横動画のサムネ N2（2026-11-14）: 11/13 の thumb-N（thumb-v10-a/b/c.tsx）4本を「文字と札は端から 60px 以上」の決まりで置き直す
 *   python longform/thumb-n2-prep.py                 # Duo の回の iPhone 16 Pro Max の切り抜きと層（assets/n2-layers/）
 *   npx tsx longform/thumb-n2-edge.tsx               # 各フォルダの thumb-N2.png（thumb-N.png は書き換えない）
 *   npx tsx longform/thumb-n2-edge.tsx --check <dir> # 文字だけ（黒地・写真なし・黒ふちは灰色）を <dir> に出す（余白の検査用）
 *   python -I longform/thumb-n2-contact.py [<dir>]   # 一覧 longform/thumb-n2-contact.png（<dir> があれば余白と重なりも測る）
 *
 * 決まり（thumb-v13-imakai.tsx・thumb-v14-finding.tsx と同じ）: 文字 104px 以上・1枚 2〜3 要素・文字と札は端から 60px 以上・
 *   文字どうしと端末は重ねない（札は端末に少しかかってよい）・右下（x1030〜・y600〜）に文字を置かない
 * 文字・色・写真は thumb-N と同じ（数字の出どころは thumb-v10-a/b/c.tsx の注記）。Duo の回だけ写真を iPhone 16 Pro Max の実機に替えた
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";
const EDGE = 60; // ふち取り文字はふちが左へはみ出すので、測って x に数 px 足している（--check で確かめる）
const CHECK = process.argv[2] === "--check";
/** 検査のときは黒いふちを灰色にして、ふちまで測れるようにする */
const OUTC = (c: string) => (CHECK && c === BLACK ? "#808080" : c);

function Outlined({ text, size, color, inner, outer, spacing = -4 }: { text: string; size: number; color: string; inner?: { w: number; c: string }; outer?: { w: number; c: string }; spacing?: number }) {
  const base = { display: "flex", fontSize: size, fontWeight: 900, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" } as const;
  const ring = (w: number, c: string, key: string) =>
    Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return <div key={`${key}${i}`} style={{ ...base, position: "absolute", left: Math.round(Math.cos(a) * w), top: Math.round(Math.sin(a) * w), color: OUTC(c) }}>{text}</div>;
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
const Gap = ({ w }: { w: number }) => <div style={{ display: "flex", width: w }} />;
const Plain = ({ text, size, color, spacing = -3 }: { text: string; size: number; color: string; spacing?: number }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 900, color, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" }}>{text}</div>
);
const Tag = ({ x, y, text, size, bg, color, pad = 16 }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: CHECK && bg === BLACK ? "#808080" : bg, ...(CHECK ? {} : { boxShadow: "5px 5px 0 rgba(0,0,0,0.45)" }) }}>
    <Plain text={text} size={size} color={color} />
  </div>
);

const ASSETS = join(__dirname, "assets");
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
/** 写真（assets/ からの相対パス）を scale 倍にして、左上を (left, top) に置く */
function Photo({ file, scale, left, top }: { file: string; scale: number; left: number; top: number }) {
  if (CHECK) return null;
  const buf = readFileSync(join(ASSETS, file));
  const [iw, ih] = jpegSize(buf);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`data:image/jpeg;base64,${buf.toString("base64")}`} width={Math.round(iw * scale)} height={Math.round(ih * scale)} alt="" style={{ position: "absolute", left, top }} />;
}
/** 端末の層（thumb-n2-prep.py が作る 1280x720 の透過 PNG・影つき） */
function Layer({ name }: { name: string }) {
  if (CHECK) return null;
  const buf = readFileSync(join(ASSETS, "n2-layers", `${name}.png`));
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`data:image/png;base64,${buf.toString("base64")}`} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />;
}
const Shade = ({ bg, x = 0, y = 0, w = W, h = H }: { bg: string; x?: number; y?: number; w?: number; h?: number }) =>
  CHECK ? null : <div style={{ position: "absolute", left: x, top: y, width: w, height: h, display: "flex", background: bg }} />;
const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: CHECK ? "#000000" : bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);

const PLANS: Record<string, { credit?: string; node: () => ReactNode }> = {
  // thumb-v10-a.tsx「2026-11-02-storage」と同じ文字・色・写真（迷ったら 140 ／ 256GB 240 ／ 差 6,200円〜 108）。端から 60px へ寄せ、行の間を詰めた
  "2026-11-02-storage": {
    node: () => (
      <Frame bg="#1B0B33">
        <Photo file="v10-layers/a-storage-flip.jpg" scale={0.62} left={440} top={0} />
        <Shade bg="linear-gradient(90deg, #1B0B33 0%, #3D1A6E 34%, #3D1A6E 62%, rgba(61,26,110,0) 68%)" />
        <T x={EDGE + 8} y={58}><Outlined text="迷ったら" size={140} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
        <T x={EDGE + 11} y={210}><Outlined text="256GB" size={240} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-9} /></T>
        <Tag x={EDGE} y={500} text="差 6,200円〜" size={108} bg={WHITE} color={RED} pad={24} />
      </Frame>
    ),
  },
  // thumb-v10-b.tsx「2026-11-03-duo-vs-mini」と同じ文字・色（大画面だけなら 106 ／ 16〜28万円 176＋114 ／ Duoより安い 136）。
  //   写真を「機種の分からない黒いスマホ」から iPhone 16 Pro Max（デザートチタニウムの背面・撮影者が機種を明記）の切り抜きに替えた。
  //   動画は中古の Pro Max（17／16／15）・iPad mini と Duo の比較（youtube.txt）。機種名の札は付けない（3要素のまま）
  "2026-11-03-duo-vs-mini": {
    credit: "サムネイル画像（背景を切り抜き）: iPhone 16 Pro Max（IPhone 16 Pro Max Desert Titanium Rear.png）— Padgriffin / CC BY 4.0 https://commons.wikimedia.org/wiki/File:IPhone_16_Pro_Max_Desert_Titanium_Rear.png",
    node: () => (
      <Frame bg="radial-gradient(circle at 84% 50%, #5B2C9E 0%, #3A1668 38%, #150A26 100%)">
        <Layer name="duo-16pm" />
        <Tag x={EDGE} y={EDGE} text="大画面だけなら" size={106} bg={YELLOW} color={BLACK} />
        <T x={EDGE + 5} y={228}>
          <Outlined text="16〜28" size={176} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-10} />
          <Gap w={16} />
          <div style={{ display: "flex", paddingBottom: 10 }}><Outlined text="万円" size={114} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} /></div>
        </T>
        <T x={EDGE} y={462}><Outlined text="Duoより安い" size={136} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      </Frame>
    ),
  },
  // thumb-v10-c.tsx「2026-11-01-mbp-vs-mba」と同じ文字・色・写真（新品11.5万円差 108 ／ Airで 164 ／ 十分 220）。
  //   縦に 600px しかないので Airで 196→164・十分 250→220 に（どちらも 104px 以上）。写真は少し右下へ
  "2026-11-01-mbp-vs-mba": {
    node: () => (
      <Frame bg="#101216">
        <Photo file="stock-photo/unsplash-6M9bAK5l4_o-macbook-air-open-desk.jpg" scale={0.36} left={470} top={176} />
        <Shade h={330} bg="linear-gradient(180deg, #101216 0%, #101216 52%, rgba(16,18,22,0) 64%)" />
        <Shade bg="linear-gradient(90deg, #101216 0%, #101216 45%, rgba(16,18,22,0) 52%)" />
        <Tag x={EDGE} y={EDGE} text="新品11.5万円差" size={108} bg={YELLOW} color={BLACK} />
        <T x={EDGE + 12} y={212}><Outlined text="Airで" size={164} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-7} /></T>
        <T x={EDGE + 10} y={402}><Outlined text="十分" size={220} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-10} /></T>
      </Frame>
    ),
  },
  // thumb-v10-c.tsx「2026-11-02-macbook」と同じ文字・色・写真（中古MacBook 104 ／ 正解4台 184 ／ 10万円〜 150）。写真を 30px 右へ
  "2026-11-02-macbook": {
    node: () => (
      <Frame bg="#1B1B1D">
        <Photo file="stock-photo/unsplash-2QnzuTES1n8-macbook-lid-headphones.jpg" scale={0.45} left={720} top={0} />
        <Shade bg="linear-gradient(90deg, #1B1B1D 0%, #1B1B1D 55.5%, rgba(27,27,29,0) 59%)" />
        <Tag x={EDGE} y={EDGE} text="中古MacBook" size={104} bg={YELLOW} color={BLACK} />
        <T x={EDGE + 13} y={222}><Outlined text="正解4台" size={184} color={YELLOW} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-10} /></T>
        <T x={EDGE} y={458}><Outlined text="10万円〜" size={150} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-6} /></T>
      </Frame>
    ),
  },
};

(async () => {
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  const checkDir = CHECK ? process.argv[3] : "";
  if (CHECK) mkdirSync(checkDir, { recursive: true });
  for (const [key, plan] of Object.entries(PLANS)) {
    const res = new ImageResponse(<>{plan.node()}</>, { width: W, height: H, fonts });
    const out = CHECK ? join(checkDir, `${key}.png`) : join(__dirname, key, "thumb-N2.png");
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    if (!CHECK && plan.credit) writeFileSync(join(__dirname, key, "thumb-credit-N2.txt"), `${plan.credit}\n取得: 2026-11-14 ／ 元画像 https://upload.wikimedia.org/wikipedia/commons/e/e2/IPhone_16_Pro_Max_Desert_Titanium_Rear.png ／ 切り抜き longform/assets/commons/iphone16promax-desert-cut2.png（thumb-n2-prep.py）\n`);
    console.log(out);
  }
})();
