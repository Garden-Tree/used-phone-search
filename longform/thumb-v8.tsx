/**
 * 横動画のサムネ・第8弾（2026-11-13）。v7（I・J）の作り直し: 切り抜きをやり直し、白いふちをやめ、文字は 104px 以上・重なりなし
 *   python longform/thumb-v8-prep.py             # 切り抜き（*-cut2.png）→ 端末の層（assets/v8-layers/*.png・影つき）→ 確認画像
 *   npx tsx longform/thumb-v8.tsx [フォルダ名]   # 下の PLANS
 *   python -I longform/thumb-v8-contact.py       # 一覧 longform/thumb-v8-contact.png（v7 の I・J と v8 の K・L）
 * 出力: <フォルダ>/thumb-K.png（＝I の構図）・thumb-L.png（＝J の構図）・thumb-K-sa.png（CC BY-SA の写真を含む版。あるものだけ）
 *
 * 決まり:
 * - 端末の置き場所・大きさ・傾きは thumb-v8-prep.py の LAYERS（最終の大きさで PIL が描く。satori では拡大縮小しない）。
 *   この tsx は「地 → 端末の層 → 文字」を重ねるだけ。**文字の位置を変えたら LAYERS と重ならないか確かめる**
 * - **文字は 104px 以上**（それより小さい文字は置かない。大きくするか消す）。1枚に 2〜3 要素まで
 * - **文字と文字・文字と端末は 12px 以上あける**（縁取りを含めて）。端末の写真の上に文字を載せない（影の上は可）
 * - 白いふち（ステッカー風）は付けない。やわらかい落ち影だけ
 * - 写真の機種と文字の機種を一致させる。Apple の公式画像は使わない。出どころは assets/commons・assets/stock-photo の SOURCES.md
 * - CC BY-SA の写真（sa）を使った案は、できたサムネにも同じライセンスが及ぶ。使う前にユーザーに確かめる
 * - 右下（x1030〜・y600〜）は再生時間の表示と重なるので文字を置かない
 * - 数字・機種名は各フォルダの script.md にあるものだけ。店の名前は出さない
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";

type Photo = { model: string; credit: string; sa?: boolean };
const PHOTOS = {
  i13: { model: "iPhone 13", credit: "iPhone 13（All iPhone 13 Colors）— Daniel Romero / Unsplash License https://unsplash.com/photos/JSQva3za368" },
  i14: { model: "iPhone 14", credit: "iPhone 14 Blue — Thai Nguyen / Unsplash License https://unsplash.com/photos/zNDH3l4tMs0" },
  i15: { model: "iPhone 15", sa: true, credit: "Back of iPhone 15 — ThePhotoGraphIc / CC BY-SA 4.0 https://commons.wikimedia.org/wiki/File:Back_of_iPhone_15.jpg" },
  i16: { model: "iPhone 16", credit: "iPhone 16 Ultramarine Rear — Padgriffin / CC BY 4.0 https://commons.wikimedia.org/wiki/File:IPhone_16_Ultramarine_Rear.png" },
} satisfies Record<string, Photo>;
type PhotoKey = keyof typeof PHOTOS;

/** 端末の層（thumb-v8-prep.py layers が作る 1280x720 の透過 PNG。影つき） */
function Layer({ name }: { name: string }) {
  const buf = readFileSync(join(__dirname, "assets", "v8-layers", `${name}.png`));
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
const tagBox = (size: number, bg: string, pad: number) =>
  ({ display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: bg, boxShadow: "5px 5px 0 rgba(0,0,0,0.45)" }) as const;
const Tag = ({ x, y, text, size, bg, color, pad = 24 }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, ...tagBox(size, bg, pad) }}><Plain text={text} size={size} color={color} /></div>
);
/** cx を中心にそろえた札 */
const CTag = ({ cx, y, text, size, bg, color, pad = 18 }: { cx: number; y: number; text: string; size: number; bg: string; color: string; pad?: number }) => (
  <div style={{ position: "absolute", left: cx - 300, top: y, width: 600, display: "flex", justifyContent: "center" }}>
    <div style={tagBox(size, bg, pad)}><Plain text={text} size={size} color={color} /></div>
  </div>
);
const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);
const YELLOW_BG = `radial-gradient(circle at 70% 55%, #FFFBE0 0%, ${YELLOW} 55%, #FFC400 100%)`;
const RED_BG = "linear-gradient(100deg, #2A0A0A 0%, #7A1414 45%, #3A0C0C 100%)";

type Plan = { use: PhotoKey[]; node: (layer: string) => ReactNode };
const PLANS: Record<string, Record<string, Plan>> = {
  // 1本目「いま買うならどれ？」 script.md: 5万円なら iPhone 13（相場 5.1万円・128GB）／7万円前後 iPhone 14／10万円前後 iPhone 15
  "2026-10-21-iphone-dore": {
    // 文字: 予算別の正解 150 ／ 5万円 120・iPhone 13 104 ／ 7万円 120・iPhone 14 104
    K: {
      use: ["i13", "i14"],
      node: (layer) => (
        <Frame bg={YELLOW_BG}>
          <Layer name={layer} />
          <T x={28} y={18}><Outlined text="予算別の正解" size={150} color={RED} inner={{ w: 8, c: WHITE }} outer={{ w: 6, c: BLACK }} spacing={-5} /></T>
          <Tag x={28} y={248} text="5万円" size={120} bg={BLACK} color={YELLOW} pad={14} />
          <T x={376} y={272}><Plain text="iPhone 13" size={104} color={BLACK} spacing={-4} /></T>
          <Tag x={28} y={476} text="7万円" size={120} bg={BLACK} color={YELLOW} pad={14} />
          <T x={376} y={500}><Plain text="iPhone 14" size={104} color={BLACK} spacing={-4} /></T>
        </Frame>
      ),
    },
    // CC BY-SA の iPhone 15 を含む版。文字: 予算別の正解 170 ／ 札 5万円・7万円・10万円 各 104
    "K-sa": {
      use: ["i13", "i14", "i15"],
      node: (layer) => (
        <Frame bg={YELLOW_BG}>
          <Layer name={layer} />
          <T x={130} y={12}><Outlined text="予算別の正解" size={170} color={RED} inner={{ w: 8, c: WHITE }} outer={{ w: 6, c: BLACK }} spacing={-5} /></T>
          <CTag cx={214} y={218} text="5万円" size={104} bg={BLACK} color={YELLOW} />
          <CTag cx={640} y={218} text="7万円" size={104} bg={BLACK} color={YELLOW} />
          <CTag cx={1066} y={218} text="10万円" size={104} bg={BLACK} color={YELLOW} />
        </Frame>
      ),
    },
    // 文字: 5万円 270 ／ iPhone 13 160 ／ 相場 5.1万円 110
    L: {
      use: ["i13"],
      node: (layer) => (
        <Frame bg={YELLOW_BG}>
          <Layer name={layer} />
          <T x={30} y={22}><Outlined text="5万円" size={270} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
          <T x={34} y={336}><Plain text="iPhone 13" size={160} color={BLACK} spacing={-6} /></T>
          <Tag x={34} y={540} text="相場 5.1万円" size={110} bg={BLACK} color={WHITE} />
        </Frame>
      ),
    },
  },
  // 4本目「店選びの正解は？」 script.md: どの機種でも最安、っていう店はない／16店・41機種／安い順に5店並べた1位と5位の差（128GB）: 16 は 1万5,820円（＝1.6万円）
  "2026-10-24-where-to-buy": {
    // 文字: 同じ機種でも店で 104 ／ 1.6万 250 ／ 円の差 190
    K: {
      use: ["i13", "i16"],
      node: (layer) => (
        <Frame bg={RED_BG}>
          <Layer name={layer} />
          <Tag x={0} y={20} text="同じ機種でも店で" size={104} bg={YELLOW} color={BLACK} />
          <T x={24} y={184}><Outlined text="1.6万" size={250} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-10} /></T>
          <T x={28} y={472}><Outlined text="円の差" size={190} color={WHITE} inner={{ w: 9, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-6} /></T>
        </Frame>
      ),
    },
    // 文字: ぜんぶ安い店は 104 ／ 0店 350 ／ 16店で比較 104
    L: {
      use: ["i13", "i16"],
      node: (layer) => (
        <Frame bg={RED_BG}>
          <Layer name={layer} />
          <Tag x={0} y={20} text="ぜんぶ安い店は" size={104} bg={YELLOW} color={BLACK} />
          <T x={44} y={188}><Outlined text="0店" size={350} color={WHITE} inner={{ w: 12, c: RED }} outer={{ w: 9, c: BLACK }} spacing={-10} /></T>
          <Tag x={0} y={572} text="16店で比較" size={104} bg={WHITE} color={BLACK} />
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
      const res = new ImageResponse(<>{plan.node(`${key}-${name}`)}</>, { width: W, height: H, fonts });
      writeFileSync(join(__dirname, key, `thumb-${name}.png`), Buffer.from(await res.arrayBuffer()));
      const sa = plan.use.some((k) => (PHOTOS[k] as Photo).sa);
      credit.push(`■ thumb-${name}.png を使うとき（説明欄に貼る）${sa ? "　※ CC BY-SA の写真を含む（サムネにも CC BY-SA 4.0 が及ぶ。使う前に確認）" : ""}`);
      credit.push(`サムネイル画像（背景を切り抜き）: ${plan.use.map((k) => PHOTOS[k].credit).join(" ／ ")}`, "");
      console.log(`${name} → longform/${key}${sa ? "（BY-SA を含む）" : ""}`);
    }
    // 旧 I・J（v7）の分は残し、K 以降だけ書き直す
    const file = join(__dirname, key, "thumb-credit.txt");
    const old = existsSync(file) ? readFileSync(file, "utf8").split("■ thumb-K")[0].trimEnd() : "";
    writeFileSync(file, (old ? old + "\n\n" : "") + credit.join("\n"));
  }
})();
