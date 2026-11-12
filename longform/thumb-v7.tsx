/**
 * 横動画のサムネ・第7弾（2026-11-13）。実機の写真（Wikimedia Commons）を主役にした I・J 案
 *   python -I longform/thumb-v7-prep.py          # 写真の下ごしらえ（切り抜き・白いふちと影）→ assets/commons/*-st.png
 *   npx tsx longform/thumb-v7.tsx [フォルダ名]   # 2本ぶん（下の PLANS）
 *   python -I longform/thumb-v7-contact.py       # 一覧 longform/thumb-v7-contact.png（G・I・J と 168x94）
 * 出力: <フォルダ>/thumb-I.png・thumb-J.png（1280x720）
 *
 * 決まり:
 * - 写真は longform/assets/commons/（出どころ・作者・ライセンスは同じフォルダの SOURCES.md。git には入れない）
 * - **写真の機種と、札・文字の機種を一致させる**（PHOTOS の model）。Apple の公式画像は使わない
 * - CC BY-SA の写真（PHOTOS の sa）を使った案は、できたサムネにも同じライセンスが及ぶ。使う前にユーザーに確かめる
 * - I＝実機を 3〜4台並べて札を付ける／J＝実機 1〜2台を大きく＋巨大な文字
 * - 文字は 2〜3行・太いふち取り・いちばん言いたい語は 180px 以上。キャラなし・紺のベタ地なし
 * - 右下（x1030〜・y600〜）は再生時間の表示と重なるので文字を置かない
 * - 数字・機種名は各フォルダの script.md にあるものだけ。店の名前は出さない
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";

// ───────────────────────── 写真（Wikimedia Commons） ─────────────────────────

type Photo = { file: string; model: string; credit: string; sa?: boolean };
const PHOTOS = {
  se3: { file: "iphone-se3-red-back-st.png", model: "iPhone SE 第3世代", sa: true, credit: "Back of the iPhone SE (3rd generation) — Hajoon0102 / CC BY-SA 4.0 https://commons.wikimedia.org/wiki/File:Back_of_the_iPhone_SE_(3rd_generation).jpg" },
  i13: { file: "iphone13-tora-st.png", model: "iPhone 13", credit: "iPhone 13 for Tora — Tatsuo Yamashita / CC BY 2.0 https://commons.wikimedia.org/wiki/File:IPhone_13_for_Tora_(52641558635).jpg" },
  i14: { file: "iphone14-red-st.png", model: "iPhone 14", sa: true, credit: "iPhone 14 Product Red — Hajoon0102 / CC BY-SA 4.0 https://commons.wikimedia.org/wiki/File:IPhone_14_Product_Red.jpg" },
  i15: { file: "iphone15-pd-single-st.png", model: "iPhone 15", credit: "Apple iPhone 15 — Ka Kit Pang / Public domain https://commons.wikimedia.org/wiki/File:Apple_iPhone_15.jpeg" },
  i16: { file: "iphone16-ultramarine-st.png", model: "iPhone 16", credit: "iPhone 16 Ultramarine Rear — Padgriffin / CC BY 4.0 https://commons.wikimedia.org/wiki/File:IPhone_16_Ultramarine_Rear.png" },
} satisfies Record<string, Photo>;
type PhotoKey = keyof typeof PHOTOS;

const PHOTO_DIR = join(__dirname, "assets", "commons");
const PAD = 40 / 980; // *-st.png は高さ 980 のうち上下左右 40px が影の余白（thumb-v7-prep.py）
/** 切り抜いた端末を置く。cx＝端末の中心の x・y＝端末の上の端・h＝端末の高さ（余白を除く）・rot＝傾き（度） */
function Phone({ k, cx, y, h, rot = 0 }: { k: PhotoKey; cx: number; y: number; h: number; rot?: number }) {
  const buf = readFileSync(join(PHOTO_DIR, PHOTOS[k].file));
  const iw = buf.readUInt32BE(16), ih = buf.readUInt32BE(20); // PNG の IHDR
  const full = h / (1 - PAD * 2), fw = Math.round((iw / ih) * full), fh = Math.round(full);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`data:image/png;base64,${buf.toString("base64")}`} width={fw} height={fh} alt="" style={{ position: "absolute", left: Math.round(cx - fw / 2), top: Math.round(y - full * PAD), ...(rot ? { transform: `rotate(${rot}deg)` } : {}) }} />
  );
}

// ───────────────────────── 文字（thumb-v5・v6 と同じ） ─────────────────────────

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
const tagBox = (size: number, bg: string, pad: number, border?: string) =>
  ({ display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: bg, boxShadow: "5px 5px 0 rgba(0,0,0,0.45)", ...(border ? { border: `4px solid ${border}` } : {}) }) as const;
const Tag = ({ x, y, text, size, bg, color, pad = 24 }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, ...tagBox(size, bg, pad) }}><Plain text={text} size={size} color={color} /></div>
);
/** 端末に付ける札（cx を中心にそろえる） */
const CTag = ({ cx, y, text, size, bg, color, pad = 16, border }: { cx: number; y: number; text: string; size: number; bg: string; color: string; pad?: number; border?: string }) => (
  <div style={{ position: "absolute", left: cx - 250, top: y, width: 500, display: "flex", justifyContent: "center" }}>
    <div style={tagBox(size, bg, pad, border)}><Plain text={text} size={size} color={color} spacing={-2} /></div>
  </div>
);
const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);
const YELLOW_BG = `radial-gradient(circle at 70% 55%, #FFFBE0 0%, ${YELLOW} 55%, #FFC400 100%)`;
const RED_BG = "linear-gradient(100deg, #2A0A0A 0%, #7A1414 45%, #3A0C0C 100%)";

type Plan = { use: PhotoKey[]; node: () => ReactNode };
const PLANS: Record<string, { I: Plan; J: Plan }> = {
  // 1本目「いま買うならどれ？」 script.md: 3万円台 SE 第3世代（相場 3.3万円）／5万円なら iPhone 13（5.1万円・128GB）／7万円前後 iPhone 14（6.6万円）／10万円前後 iPhone 15（9.1万円）
  "2026-10-21-iphone-dore": {
    I: {
      use: ["se3", "i13", "i14", "i15"],
      node: () => {
        const cols: { k: PhotoKey; budget: string; name: string; cx: number; h: number }[] = [
          { k: "se3", budget: "3万円", name: "SE 第3世代", cx: 166, h: 356 },
          { k: "i13", budget: "5万円", name: "iPhone 13", cx: 482, h: 380 },
          { k: "i14", budget: "7万円", name: "iPhone 14", cx: 798, h: 380 },
          { k: "i15", budget: "10万円", name: "iPhone 15", cx: 1114, h: 380 },
        ];
        return (
          <Frame bg={YELLOW_BG}>
            <T x={96} y={10}><Outlined text="予算別の正解" size={186} color={RED} inner={{ w: 9, c: WHITE }} outer={{ w: 7, c: BLACK }} spacing={-6} /></T>
            {cols.map((c) => <Phone key={c.k} k={c.k} cx={c.cx} y={396 + (380 - c.h)} h={c.h} />)}
            {cols.map((c) => <CTag key={c.k} cx={c.cx} y={212} text={c.budget} size={76} bg={BLACK} color={YELLOW} pad={20} />)}
            {cols.map((c) => <CTag key={c.k} cx={c.cx} y={318} text={c.name} size={46} bg={WHITE} color={BLACK} border={BLACK} />)}
          </Frame>
        );
      },
    },
    J: {
      use: ["i13"],
      node: () => (
        <Frame bg={YELLOW_BG}>
          <Phone k="i13" cx={1052} y={18} h={690} rot={7} />
          <T x={30} y={30}><Outlined text="5万円" size={270} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
          <T x={690} y={180}><Outlined text="なら" size={100} color={BLACK} inner={{ w: 6, c: WHITE }} spacing={-3} /></T>
          <T x={32} y={330}><Outlined text="iPhone 13" size={176} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} /></T>
          <Tag x={36} y={566} text="中古の相場 5.1万円" size={78} bg={BLACK} color={WHITE} />
        </Frame>
      ),
    },
  },
  // 4本目「店選びの正解は？」 script.md: どの機種でも最安、っていう店はない／16店・41機種／
  //   安い順に5店並べた1位と5位の差（128GB）: 13 は 5,200円・15 は 7,266円・16 は 1万5,820円（＝1.6万円）
  "2026-10-24-where-to-buy": {
    I: {
      use: ["i13", "i15", "i16"],
      node: () => {
        const cols: { k: PhotoKey; name: string; diff: string; cx: number; hot?: boolean }[] = [
          { k: "i13", name: "iPhone 13", diff: "5,200円差", cx: 716 },
          { k: "i15", name: "iPhone 15", diff: "7,266円差", cx: 934 },
          { k: "i16", name: "iPhone 16", diff: "1.6万円差", cx: 1152, hot: true },
        ];
        return (
          <Frame bg={RED_BG}>
            {cols.map((c) => <Phone key={c.k} k={c.k} cx={c.cx} y={100} h={410} />)}
            {cols.map((c) => <CTag key={c.k} cx={c.cx} y={26} text={c.name} size={38} bg={WHITE} color={BLACK} pad={12} />)}
            {cols.map((c) => <CTag key={c.k} cx={c.cx} y={524} text={c.diff} size={c.hot ? 44 : 38} bg={c.hot ? YELLOW : BLACK} color={c.hot ? RED : WHITE} pad={10} border={c.hot ? BLACK : WHITE} />)}
            <Tag x={0} y={24} text="同じ機種でも店で" size={62} bg={YELLOW} color={BLACK} />
            <T x={22} y={120}><Outlined text="1.6万" size={236} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-10} /></T>
            <T x={26} y={376}><Outlined text="円の差" size={184} color={WHITE} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-6} /></T>
            <Tag x={0} y={606} text="16店・41機種で比較" size={56} bg={WHITE} color={BLACK} />
          </Frame>
        );
      },
    },
    J: {
      use: ["i13", "i16"],
      node: () => (
        <Frame bg={RED_BG}>
          <Phone k="i13" cx={846} y={150} h={560} rot={-9} />
          <Phone k="i16" cx={1082} y={36} h={660} rot={8} />
          <Tag x={0} y={24} text="ぜんぶ安い店は" size={104} bg={YELLOW} color={BLACK} />
          <T x={40} y={186}><Outlined text="0店" size={380} color={WHITE} inner={{ w: 12, c: RED }} outer={{ w: 9, c: BLACK }} spacing={-10} /></T>
          <Tag x={0} y={606} text="16店・41機種で比較" size={74} bg={WHITE} color={BLACK} />
        </Frame>
      ),
    },
  },
};

(async () => {
  const only = process.argv[2]?.replace(/\\/g, "/").split("/").filter(Boolean).pop();
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  for (const [key, plans] of Object.entries(PLANS)) {
    if (only && only !== key) continue;
    const credit: string[] = [];
    for (const [name, plan] of Object.entries(plans)) {
      const res = new ImageResponse(<>{plan.node()}</>, { width: W, height: H, fonts });
      writeFileSync(join(__dirname, key, `thumb-${name}.png`), Buffer.from(await res.arrayBuffer()));
      const sa = plan.use.some((k) => (PHOTOS[k] as Photo).sa);
      credit.push(`■ thumb-${name}.png を使うとき（説明欄に貼る）${sa ? "　※ CC BY-SA の写真を含む（サムネにも CC BY-SA 4.0 が及ぶ。使う前に確認）" : ""}`);
      credit.push(`サムネイル画像（Wikimedia Commons・背景を切り抜き）: ${plan.use.map((k) => PHOTOS[k].credit).join(" ／ ")}`, "");
      console.log(`${name} → longform/${key}${sa ? "（BY-SA を含む）" : ""}`);
    }
    writeFileSync(join(__dirname, key, "thumb-credit.txt"), credit.join("\n"));
  }
})();
