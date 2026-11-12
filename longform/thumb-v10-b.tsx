/**
 * 横動画のサムネ・第10弾 b 組（2026-11-13）。iPhone の5本を、ユーザーの基準（README「サムネの文字と切り抜き」「サムネの素材」）で作り直した N 案
 *   python -I longform/thumb-v10-b-prep.py layers    # 端末の層（assets/v10-b-layers/*.png・影つき）と、左右を返した写真
 *   npx tsx longform/thumb-v10-b.tsx [フォルダ名]    # 下の PLANS
 *   python -I longform/thumb-v10-b-prep.py contact   # 一覧 longform/thumb-v10-b-contact.png（いまの thumbnail.png と N・168x94）
 * 出力: <フォルダ>/thumb-N.png（1280x720）・thumb-credit-N.txt（説明欄に貼るクレジット）
 *
 * 決まり:
 * - 104px 未満の文字は置かない。1枚 2〜3 要素（広告の回の「PR」は別に必ず入れる）。いちばん言いたい語は 180px 以上
 * - 文字どうし・文字と写真の主役（端末・手・充電器）を重ねない。ふち取りを含めて 12px 以上あける
 * - 右下（x1030〜・y600〜）に文字を置かない
 * - 数字・機種名は各フォルダの script.md にあるものだけ。店の名前・「最安」「必ず」「絶対」は書かない
 * - 写真の機種と文字の機種を食い違わせない（機種名を書く回は、撮影者がその機種だと明記した写真だけ）。
 *   機種が分からないストック写真には機種名の札を付けない。Apple の公式画像・キャラ・紺のベタ地は使わない
 * - 端末の切り抜きの置き場所は thumb-v10-b-prep.py の LAYERS（文字の位置を変えたら重ならないか確かめる）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";

// ───────────────────────── 文字（thumb-v9.tsx と同じ） ─────────────────────────

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
const Gap = ({ w }: { w: number }) => <div style={{ display: "flex", width: w }} />;
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
const LAYER_DIR = join(__dirname, "assets", "v10-b-layers");
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
/** 写真を scale 倍にして、左上を (left, top) に置く（元の写真の (px,py) は left+px*scale, top+py*scale に来る）。clipX より左は見せない */
function Photo({ file, dir = PHOTO_DIR, scale, left, top, clipX = 0 }: { file: string; dir?: string; scale: number; left: number; top: number; clipX?: number }) {
  const buf = readFileSync(join(dir, file));
  const [iw, ih] = jpegSize(buf);
  const dw = Math.round(iw * scale), dh = Math.round(ih * scale);
  return (
    <div style={{ position: "absolute", left: clipX, top: 0, width: W - clipX, height: H, display: "flex", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/jpeg;base64,${buf.toString("base64")}`} width={dw} height={dh} alt="" style={{ position: "absolute", left: left - clipX, top }} />
    </div>
  );
}
/** 端末の層（thumb-v10-b-prep.py layers が作る 1280x720 の透過 PNG。影つき） */
function Layer({ name }: { name: string }) {
  const buf = readFileSync(join(LAYER_DIR, `${name}.png`));
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`data:image/png;base64,${buf.toString("base64")}`} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />;
}
/** 写真の上に敷く色（グラデーション） */
const Shade = ({ bg, x = 0, y = 0, w = W, h = H }: { bg: string; x?: number; y?: number; w?: number; h?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, display: "flex", background: bg }} />
);
const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);

const CREDIT = {
  i13pro: "iPhone 13 Pro（Apple iPhone 13 Pro Alpine Green）— Thai Nguyen / Unsplash License https://unsplash.com/photos/53JH0A7Zx3o",
  i13: "iPhone 13（All iPhone 13 Colors）— Daniel Romero / Unsplash License https://unsplash.com/photos/JSQva3za368",
  i14: "iPhone 14 Blue — Thai Nguyen / Unsplash License https://unsplash.com/photos/zNDH3l4tMs0",
  charge: "置くだけ充電のスマホ — cottonbro studio / Pexels License https://www.pexels.com/photo/green-iphone-case-on-white-surface-5083490/",
  hand: "スマホを持つ手（左右を反転）— Gije Cho / Pexels License https://www.pexels.com/photo/woman-holding-a-black-smartphone-3295213/",
};

type Plan = { credit: string; cut?: boolean; node: () => ReactNode };
const PLANS: Record<string, Plan> = {
  // 5本目「Proの差額で何が増える？」 script.md 0:00・5:10: iPhone 13 Pro と 14 の 128GB は相場の差が 180円（65,800円・65,980円）
  //   写真: 手に持った iPhone 13 Pro（アルパイングリーン・背面3眼。撮影者の説明「Apple iPhone 13 Pro Alpine Green」）。0.3 倍で右へ
  //   文字: 13 Proと14は 128 ／ ほぼ同額 184 ／ 差は180円 112
  "2026-10-25-pro-or-standard": {
    credit: CREDIT.i13pro,
    node: () => (
      <Frame bg="#07130F">
        <Photo file="unsplash-53JH0A7Zx3o-iphone13pro-green.jpg" scale={0.3} left={656} top={135} />
        <Shade bg="linear-gradient(90deg, #07130F 0%, #0C2A20 30%, #0C2A20 50%, rgba(12,42,32,0) 60%)" />
        <Shade h={190} bg="linear-gradient(180deg, #07130F 0%, #07130F 72%, rgba(7,19,15,0) 100%)" />
        <T x={28} y={22}><Outlined text="13 Proと14は" size={128} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
        <T x={28} y={200}><Outlined text="ほぼ同額" size={184} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-8} /></T>
        <Tag x={0} y={556} text="差は180円" size={112} bg={WHITE} color={RED} />
      </Frame>
    ),
  },
  // 2本目「どこにお金をかけるべき？」 script.md 0:00・6:40: 電池は差が小さいから、ケチらないほうが得／14（128GB）電池80%台 62,300円・90%台 68,400円＝差 +6,100円
  //   写真: 置くだけ充電の1台（機種は分からない・札は付けない）。0.5625 倍（高さいっぱい）で右へ
  //   文字: 電池は 150 ／ ケチるな 188 ／ 差は6,100円 108
  "2026-10-23-iphone-priority": {
    credit: CREDIT.charge,
    node: () => (
      <Frame bg="#2A0A0A">
        <Photo file="pexels-5083490.jpg" scale={0.5625} left={505} top={0} />
        <Shade bg="linear-gradient(90deg, #2A0A0A 0%, #5B1010 30%, #5B1010 61%, rgba(91,16,16,0) 66%)" />
        <T x={28} y={24}><Outlined text="電池は" size={150} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
        <T x={28} y={204}><Outlined text="ケチるな" size={188} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-8} /></T>
        <Tag x={0} y={562} text="差は6,100円" size={108} bg={WHITE} color={RED} />
      </Frame>
    ),
  },
  // 18本目「売って買い替えると実質いくら？」 script.md 0:00: 13（128GB）を売る 37,000円／14（128GB）を中古で買う 65,980円／足すのは +28,980円
  //   写真: iPhone 13（レッド）と iPhone 14（ブルー）の切り抜き（左＝売る 13・右＝買う 14）
  //   文字: 13を売って14に 110 ／ 足すのは 124 ／ 28,980 210・円 112
  "2026-11-05-sell-swap": {
    credit: `${CREDIT.i13} ／ ${CREDIT.i14}`,
    cut: true,
    node: () => (
      <Frame bg="radial-gradient(circle at 78% 60%, #3FD6C4 0%, #0FA596 50%, #06665E 100%)">
        <Layer name="2026-11-05-sell-swap" />
        <Tag x={0} y={20} text="13を売って14に" size={110} bg={YELLOW} color={BLACK} />
        <T x={28} y={196}><Outlined text="足すのは" size={124} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
        <T x={24} y={360}>
          <Outlined text="28,980" size={210} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-10} />
          <Gap w={12} />
          <div style={{ display: "flex", paddingBottom: 10 }}><Outlined text="円" size={112} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} /></div>
        </T>
      </Frame>
    ),
  },
  // 14本目【PR】「中古iPhone＋楽天モバイル、2年でいくら」 script.md 0:00: 中古 iPhone 14 128GB 65,980円＋20GBまでの料金2年 52,272円＝118,252円（章の見出し「14＋20GBまでで2年11.8万円」）
  //   広告の回: 「PR」を 104px 以上で。ポイント・キャンペーン・「最安」「実質0円」「お得」は書かない。楽天のロゴ・公式画像は使わない
  //   写真: iPhone 14（ブルー）の切り抜き
  //   文字: PR 110 ／ 楽天モバイル 110 ／ 14＋20GBまで 118 ／ 2年 120・11.8 206・万円 120
  "2026-10-31-rakuten-mobile": {
    credit: CREDIT.i14,
    cut: true,
    node: () => (
      <Frame bg={`radial-gradient(circle at 80% 62%, #FFF3C4 0%, ${YELLOW} 45%, #FF9D00 100%)`}>
        <Layer name="2026-10-31-rakuten-mobile" />
        <Tag x={0} y={20} text="PR" size={110} bg={BLACK} color={WHITE} pad={22} />
        <T x={222} y={36}><Outlined text="楽天モバイル" size={110} color={BLACK} outer={{ w: 7, c: WHITE }} spacing={-4} /></T>
        <T x={28} y={212}><Plain text="14＋20GBまで" size={118} color={BLACK} spacing={-4} /></T>
        <T x={24} y={400}>
          <div style={{ display: "flex", paddingBottom: 12 }}><Outlined text="2年" size={120} color={BLACK} outer={{ w: 7, c: WHITE }} /></div>
          <Gap w={22} />
          <Outlined text="11.8" size={206} color={RED} inner={{ w: 9, c: WHITE }} outer={{ w: 7, c: BLACK }} spacing={-9} />
          <Gap w={20} />
          <div style={{ display: "flex", paddingBottom: 12 }}><Outlined text="万円" size={120} color={RED} inner={{ w: 9, c: WHITE }} outer={{ w: 7, c: BLACK }} /></div>
        </T>
      </Frame>
    ),
  },
  // 17本目「iPhone Duoじゃなくていい？」 script.md 冒頭・0:00: 大きい画面がほしいだけなら Duo でなくていい。Duo より約16万〜28万円安い
  //   （中古の 17 Pro Max 約15.6万円安い 〜 中古の iPad mini A17 Pro 約28.1万円安い）
  //   写真: 手で持ったスマホ（前面・画面は黒。機種は分からない＝札は付けない。Duo の使える実機写真は無い）。左右を返して腕を右下へ
  //   文字: 大画面だけなら 106 ／ 16〜28 186・万円 120 ／ Duoより安い 136
  "2026-11-03-duo-vs-mini": {
    credit: CREDIT.hand,
    node: () => (
      <Frame bg="#150A26">
        <Photo file="pexels-3295213-flip.jpg" dir={LAYER_DIR} scale={0.6} left={500} top={40} />
        <Shade h={40} bg={WHITE} />
        <Shade bg="linear-gradient(90deg, #150A26 0%, #3A1668 30%, #3A1668 60%, rgba(58,22,104,0) 70%)" />
        <Tag x={0} y={20} text="大画面だけなら" size={106} bg={YELLOW} color={BLACK} />
        <T x={24} y={198}>
          <Outlined text="16〜28" size={186} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-10} />
          <Gap w={18} />
          <div style={{ display: "flex", paddingBottom: 10 }}><Outlined text="万円" size={120} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} /></div>
        </T>
        <T x={28} y={456}><Outlined text="Duoより安い" size={136} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      </Frame>
    ),
  },
};

(async () => {
  const only = process.argv[2]?.replace(/\\/g, "/").split("/").filter(Boolean).pop();
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  for (const [key, plan] of Object.entries(PLANS)) {
    if (only && only !== key) continue;
    const res = new ImageResponse(<>{plan.node()}</>, { width: W, height: H, fonts });
    writeFileSync(join(__dirname, key, "thumb-N.png"), Buffer.from(await res.arrayBuffer()));
    writeFileSync(join(__dirname, key, "thumb-credit-N.txt"), `サムネイル画像${plan.cut ? "（背景を切り抜き）" : ""}: ${plan.credit}\n`);
    console.log(`N → longform/${key}`);
  }
})();
