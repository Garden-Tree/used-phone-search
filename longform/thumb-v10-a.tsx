/**
 * 横動画のサムネ・第10弾 a 組（2026-11-13）。iPhone の5本を、実写＋104px 以上の文字で作り直した N 案
 *   python -I longform/thumb-v10-a-prep.py        # 端末の層・反転した写真（assets/v10-layers/）
 *   npx tsx longform/thumb-v10-a.tsx [フォルダ名]  # 下の PLANS
 *   python -I longform/thumb-v10-a-contact.py     # 一覧 longform/thumb-v10-a-contact.png（いまの thumbnail.png・N と 168x94）
 * 出力: <フォルダ>/thumb-N.png（1280x720）・thumb-credit-N.txt（説明欄に貼るクレジット）
 *
 * 決まり（.claude/tmp/thumb-brief.md・README「サムネの文字と切り抜き」「サムネの素材」）:
 * - 104px 未満の文字は置かない。1枚 2〜3 要素。いちばん言いたい語は 180px 以上
 * - 文字どうし・文字と写真の主役（端末・手・ケーブル）を重ねない。ふち取りを含めて 12px 以上あける
 * - 右下（x1030〜・y600〜）に文字を置かない
 * - 数字・機種名は各フォルダの script.md にあるものだけ。機種名を書くのは、その機種だと撮影者が明記した写真のときだけ
 * - 写真の出どころは assets/stock-photo・assets/commons の SOURCES.md。キャラなし・紺のベタ地なし・公式画像なし
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
const Plain = ({ text, size, color, spacing = -3 }: { text: string; size: number; color: string; spacing?: number }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 900, color, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" }}>{text}</div>
);
const Tag = ({ x, y, text, size, bg, color, pad = 16 }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: bg, boxShadow: "5px 5px 0 rgba(0,0,0,0.45)" }}>
    <Plain text={text} size={size} color={color} />
  </div>
);

// ───────────────────────── 写真 ─────────────────────────

const ASSETS = join(__dirname, "assets");
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
/** 写真（assets/ からの相対パス）を scale 倍にして、左上を (left, top) に置く（元の写真の (px,py) は left+px*scale, top+py*scale に来る）。
 *  clipX より左は見せない */
function Photo({ file, scale, left, top, clipX = 0 }: { file: string; scale: number; left: number; top: number; clipX?: number }) {
  const buf = readFileSync(join(ASSETS, file));
  const [iw, ih] = jpegSize(buf);
  const dw = Math.round(iw * scale), dh = Math.round(ih * scale);
  return (
    <div style={{ position: "absolute", left: clipX, top: 0, width: W - clipX, height: H, display: "flex", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/jpeg;base64,${buf.toString("base64")}`} width={dw} height={dh} alt="" style={{ position: "absolute", left: left - clipX, top }} />
    </div>
  );
}
/** 端末の層（thumb-v10-a-prep.py が作る 1280x720 の透過 PNG。影つき） */
function Layer({ name }: { name: string }) {
  const buf = readFileSync(join(ASSETS, "v10-layers", `${name}.png`));
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
const YELLOW_BG = `radial-gradient(circle at 78% 52%, #FFFBE0 0%, ${YELLOW} 50%, #FFC400 100%)`;

const CREDITS = {
  leather: "革ケースのスマホ — Soulful Pizza / Pexels License https://www.pexels.com/photo/latest-iphone-with-brown-leather-case-7538510/",
  i13: "iPhone 13（All iPhone 13 Colors）— Daniel Romero / Unsplash License https://unsplash.com/photos/JSQva3za368",
  i14: "iPhone 14 Blue — Thai Nguyen / Unsplash License https://unsplash.com/photos/zNDH3l4tMs0",
  hand: "手で持ったスマホ（左右を反転）— Gije Cho / Pexels License https://www.pexels.com/photo/woman-holding-a-black-smartphone-3295213/",
  qi: "置くだけ充電のスマホ — cottonbro studio / Pexels License https://www.pexels.com/photo/green-iphone-case-on-white-surface-5083490/",
  i13pm: "iPhone 13 Pro Max（Iphone 13 pro max.jpg）— Grany29 / CC BY 4.0 https://commons.wikimedia.org/wiki/File:Iphone_13_pro_max.jpg （切り出して文字を追加）",
};

type Plan = { credit: string[]; cut?: boolean; node: () => ReactNode };
const PLANS: Record<string, Plan> = {
  // 「今は買うな｜地雷6台・正解3台」 script.md: 地雷6台（XR・11 Pro・14 Pro・14 Pro Max・17e・18 Pro）・正解3台（13・15・16e）
  //   写真: 暗い地・革ケースの背面（機種の記述なし＝雰囲気。機種の札は付けない）。0.7 倍。端末の左上の角は (820,180)・左の辺は右下へ
  //   文字: 今は買うな 150 ／ 地雷6台 220 ／ 正解は3台 110
  "2026-11-06-jirai": {
    credit: [CREDITS.leather],
    node: () => (
      <Frame bg="#2A0A0A">
        <Photo file="stock-photo/pexels-7538510.jpg" scale={0.7} left={400} top={-100} />
        <Shade bg="linear-gradient(90deg, #2A0A0A 0%, #6A1212 34%, #6A1212 54%, rgba(106,18,18,0) 63%)" />
        <T x={28} y={24}><Outlined text="今は買うな" size={150} color={WHITE} inner={{ w: 7, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-6} /></T>
        <T x={28} y={204}><Outlined text="地雷6台" size={220} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-10} /></T>
        <Tag x={0} y={556} text="正解は3台" size={110} bg={YELLOW} color={BLACK} pad={24} />
      </Frame>
    ),
  },
  // 「おすすめBEST5【2026年11月】」 script.md: 予算 4万・5万・7万・10万・15万円ごとの5台（12・13 mini・14・15・17）
  //   写真: 切り抜きの iPhone 13（赤）と iPhone 14（青）。機種の札は付けない（層は x803 より右）
  //   文字: 2026年11月 130 ／ BEST5 240 ／ 4万〜15万円 108
  "2026-11-01-monthly": {
    credit: [CREDITS.i13, CREDITS.i14],
    cut: true,
    node: () => (
      <Frame bg={YELLOW_BG}>
        <Layer name="a-monthly" />
        <T x={28} y={22}><Outlined text="2026年11月" size={130} color={BLACK} outer={{ w: 7, c: WHITE }} spacing={-5} /></T>
        <T x={28} y={190}><Outlined text="BEST5" size={240} color={RED} inner={{ w: 9, c: WHITE }} outer={{ w: 7, c: BLACK }} spacing={-9} /></T>
        <Tag x={0} y={558} text="4万〜15万円" size={108} bg={BLACK} color={YELLOW} pad={24} />
      </Frame>
    ),
  },
  // 「128GBで足りる？256GBとの差は6,200円から」 script.md: 結論＝迷ったら256GB／13 Pro は 128→256GB で +6,200円（10機種でいちばん小さい差）
  //   写真: 白地・手で持った前面（機種は分からない。左右を反転）。0.62 倍。指の左端は x866・端末は x907〜1176
  //   文字: 迷ったら 140 ／ 256GB 240 ／ 差 6,200円〜 108
  "2026-11-02-storage": {
    credit: [CREDITS.hand],
    node: () => (
      <Frame bg="#1B0B33">
        <Photo file="v10-layers/a-storage-flip.jpg" scale={0.62} left={420} top={0} />
        <Shade bg="linear-gradient(90deg, #1B0B33 0%, #3D1A6E 34%, #3D1A6E 61%, rgba(61,26,110,0) 66.5%)" />
        <T x={28} y={24}><Outlined text="迷ったら" size={140} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
        <T x={28} y={196}><Outlined text="256GB" size={240} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-9} /></T>
        <Tag x={0} y={558} text="差 6,200円〜" size={108} bg={WHITE} color={RED} pad={24} />
      </Frame>
    ),
  },
  // 「バッテリー、何%なら買っていい？」 script.md: 結論＝85%以上なら買っていい
  //   写真: 置くだけ充電・緑の画面（機種は分からない）。0.58 倍。端末の左端は (904,210)・ケーブルは色の下に隠す
  //   文字: 電池は 140 ／ 85%以上 190 ／ なら買っていい 108
  "2026-10-29-battery": {
    credit: [CREDITS.qi],
    node: () => (
      <Frame bg="#04160E">
        <Photo file="stock-photo/pexels-5083490.jpg" scale={0.58} left={550} top={-22} />
        <Shade bg="linear-gradient(90deg, #04160E 0%, #0B3B24 34%, #0B3B24 64%, rgba(11,59,36,0) 69%)" />
        <T x={28} y={24}><Outlined text="電池は" size={140} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
        <T x={28} y={212}><Outlined text="85%以上" size={190} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-8} /></T>
        <Tag x={0} y={558} text="なら買っていい" size={108} bg={YELLOW} color={BLACK} pad={24} />
      </Frame>
    ),
  },
  // 「大きい画面の中古iPhone、どれを買う？」 script.md: 13 Pro Max 6.7インチ・128GB 82,280円（8.2万円）。120Hz と望遠を安くなら1世代前の Pro Max
  //   写真: iPhone 13 Pro Max（シエラブルー・背面と箱。撮影者が機種を明記）。0.45 倍で右 540px。端末の左の辺は x852 より右
  //   文字: 大画面が 140 ／ 8.2万円 210 ／ 13 Pro Max 108
  "2026-10-28-big-screen": {
    credit: [CREDITS.i13pm],
    node: () => (
      <Frame bg="#1A0F08">
        <Photo file="commons/iphone13promax-sierra-back.jpg" scale={0.45} left={740} top={0} />
        <Shade bg="linear-gradient(90deg, #1A0F08 0%, #4A2408 34%, #4A2408 58%, rgba(74,36,8,0) 65.5%)" />
        <T x={28} y={24}><Outlined text="大画面が" size={140} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
        <T x={28} y={204}><Outlined text="8.2万円" size={210} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-9} /></T>
        <Tag x={0} y={558} text="13 Pro Max" size={108} bg={WHITE} color={BLACK} pad={24} />
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
    writeFileSync(join(__dirname, key, "thumb-credit-N.txt"), `サムネイル画像${plan.cut ? "（背景を切り抜き）" : ""}: ${plan.credit.join(" ／ ")}\n`);
    console.log(`N → longform/${key}`);
  }
})();
