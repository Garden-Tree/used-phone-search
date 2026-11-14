/**
 * 横動画のサムネ・第13弾（2026-11-13）: 「iPhone ◯◯ 今買い？」をシリーズの型にする案（13 と 16 に各4枚）
 *   python -I longform/thumb-v13-imakai-prep.py layers    # 端末の層（assets/v13-layers/*.png）
 *   npx tsx longform/thumb-v13-imakai.tsx                 # 各フォルダの thumb-Q1.png〜thumb-Q4.png
 *   python -I longform/thumb-v13-imakai-prep.py contact   # 一覧 longform/thumb-v13-contact.png
 *
 * 決まり（.claude/tmp/thumb-brief.md）:
 * - 文字は 104px 以上・文字どうしと端末は 12px 以上あける・1枚 2〜3 要素・右下（x1030〜・y600〜）に文字を置かない
 * - 端末の置き場所は prep の LAYERS（wide＝x 917〜／narrow＝x 1000〜）。文字の位置を変えたら重ならないか確かめる
 * - 数字は script.md にあるものだけ。13: 相場 128GB 50,800円（5.1万円）・条件は電池85%以上
 *   16: 中古の相場 120,800円（12.1万円）・新品との差 19,000円（1.9万円）
 * - 型1 問い＋数字の札／型2 問い＋答えの印（○△）／型3 機種の数字だけ大きく／型4 言い切り（比較用）
 * - 色: 13＝緑、16＝オレンジ。型2 は暗い地、型3 は白い地
 * - クレジットは各フォルダの thumb-credit-N.txt と同じ（写真は同じ）
 * - 文字と札は画面の端から 60px 以上離す（EDGE。11/14 ユーザー「隅からは離す・キワキワすぎ」。iPhone 12 の回の thumb.tsx と同じ余白）
 * - 片方の機種だけ出すときは末尾に 13 か 16（例: npx tsx longform/thumb-v13-imakai.tsx 16）。公開済みの回の画像を上書きしないため
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";
/** 文字と札は画面の端から 60px 以上離す（ふち取りの文字は字面の余白のぶん 6px 左へ） */
const EDGE = 60;

function Layer({ name }: { name: string }) {
  const buf = readFileSync(join(__dirname, "assets", "v13-layers", `${name}.png`));
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
const Tag = ({ x, y, text, size, bg, color, pad = 24 }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: bg, boxShadow: "5px 5px 0 rgba(0,0,0,0.45)" }}>
    <Plain text={text} size={size} color={color} />
  </div>
);
const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);
/** 答えの印（図形）。○＝買っていい・△＝条件つき。白ふち＋黒ふち＋色の3重 */
function Mark({ x, y, size, kind, color }: { x: number; y: number; size: number; kind: "maru" | "sankaku"; color: string }) {
  const c = size / 2;
  const shape = (w: number, stroke: string) =>
    kind === "maru"
      ? <circle cx={c} cy={c} r={c - 28} fill="none" stroke={stroke} strokeWidth={w} />
      : <polygon points={`${c},${34} ${size - 30},${size - 40} ${30},${size - 40}`} fill="none" stroke={stroke} strokeWidth={w} strokeLinejoin="round" />;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", left: x, top: y }}>
      {shape(48, WHITE)}
      {shape(38, BLACK)}
      {shape(24, color)}
    </svg>
  );
}

type Model = {
  key: "13" | "16"; dir: string; name: string; num: string; accent: string;
  bright: string; dark: string;
  tag1: { text: string; size: number }; mark: { kind: "maru" | "sankaku"; color: string }; tag2: { text: string; size: number }; tag3: string;
};
const WHITE_BG = "radial-gradient(circle at 80% 45%, #FFFFFF 0%, #F1F4F7 50%, #CBD5DF 100%)";
const M13: Model = {
  key: "13", dir: "2026-11-14-iphone13", name: "iPhone 13", num: "13", accent: "#0FAE5A",
  bright: "radial-gradient(circle at 82% 50%, #8CF2B4 0%, #14B863 46%, #06713A 100%)",
  dark: "radial-gradient(circle at 84% 50%, #23915A 0%, #0C4A2C 48%, #04190E 100%)",
  tag1: { text: "相場 5.1万円", size: 124 }, mark: { kind: "maru", color: "#19D866" }, tag2: { text: "電池85%以上なら", size: 104 }, tag3: "中古 5.1万円",
};
const M16: Model = {
  key: "16", dir: "2026-11-20-iphone16", name: "iPhone 16", num: "16", accent: "#FF7A00",
  bright: "radial-gradient(circle at 84% 50%, #FFD9A0 0%, #FF8A1F 46%, #B84300 100%)",
  dark: "radial-gradient(circle at 84% 50%, #B85A12 0%, #5A2A08 48%, #1C0C02 100%)",
  tag1: { text: "新品と1.9万円差", size: 108 }, mark: { kind: "sankaku", color: YELLOW }, tag2: { text: "新品と1.9万円差", size: 104 }, tag3: "中古 12.1万円",
};

// 型1（問い＋数字の札）: 機種名 130 ／ 今買い？ 220（主役）／ 札。端末は wide
const q1 = (m: Model) => (
  <Frame bg={m.bright}>
    <Layer name={`${m.key}-wide`} />
    <T x={EDGE} y={48}><Outlined text={m.name} size={130} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
    <T x={EDGE - 6} y={204}><Outlined text="今買い？" size={220} color={YELLOW} outer={{ w: 11, c: BLACK }} spacing={-10} /></T>
    <Tag x={EDGE} y={482} pad={18} text={m.tag1.text} size={m.tag1.size} bg={WHITE} color={BLACK} />
  </Frame>
);
// 型2（問い＋答えの印）: 機種名 120 ／ 今買い？ 190 ＋ ○△ 210（図形）／ 札 104。端末は narrow（x 1000〜）・暗い地
const q2 = (m: Model) => (
  <Frame bg={m.dark}>
    <Layer name={`${m.key}-narrow`} />
    <T x={EDGE} y={50}><Outlined text={m.name} size={120} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-4} /></T>
    <T x={EDGE - 6} y={214}><Outlined text="今買い？" size={186} color={YELLOW} outer={{ w: 10, c: BLACK }} spacing={-10} /></T>
    <Mark x={784} y={206} size={204} kind={m.mark.kind} color={m.mark.color} />
    <Tag x={EDGE} y={486} pad={18} text={m.tag2.text} size={m.tag2.size} bg={WHITE} color={BLACK} />
  </Frame>
);
// 型3（機種の数字だけ大きく）: 13／16 340 ＋ は 160 ／ 今買い？ 190 ／ 札 110。「iPhone」の語は端末の写真に任せて省く・白い地
const q3 = (m: Model) => (
  <Frame bg={WHITE_BG}>
    <Layer name={`${m.key}-wide`} />
    <T x={EDGE - 10} y={-10}>
      <Outlined text={m.num} size={300} color={m.accent} outer={{ w: 11, c: BLACK }} spacing={-14} />
      <div style={{ display: "flex", marginLeft: 22, marginBottom: 34 }}><Plain text="は" size={160} color={BLACK} /></div>
    </T>
    <T x={EDGE - 6} y={304}><Outlined text="今買い？" size={184} color={RED} inner={{ w: 7, c: WHITE }} outer={{ w: 6, c: BLACK }} spacing={-10} /></T>
    <Tag x={EDGE} y={520} pad={18} text={m.tag3} size={108} bg={BLACK} color={YELLOW} />
  </Frame>
);
// 型4（言い切り・比較用）13: 機種名 130 ／ 今も買い 220 ／ 札 条件は電池85% 110
const q4_13 = (m: Model) => (
  <Frame bg={m.bright}>
    <Layer name="13-wide" />
    <T x={EDGE} y={48}><Outlined text={m.name} size={130} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
    <T x={EDGE - 6} y={204}><Outlined text="今も買い" size={220} color={YELLOW} outer={{ w: 11, c: BLACK }} spacing={-12} /></T>
    <Tag x={EDGE} y={482} pad={18} text="条件は電池85%" size={110} bg={WHITE} color={BLACK} />
  </Frame>
);
// 型4（言い切り・比較用）16: 機種名 120 ／ 新品と 116 ＋ 1.9万円差 196（主役）／ 札 今買い？ 112
const q4_16 = (m: Model) => (
  <Frame bg={m.bright}>
    <Layer name="16-wide" />
    <T x={EDGE} y={46}><Outlined text={m.name} size={120} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-4} /></T>
    <T x={EDGE} y={174}><Outlined text="新品と" size={116} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-4} /></T>
    <T x={EDGE - 2} y={300}><Outlined text="1.9万円差" size={196} color={YELLOW} outer={{ w: 10, c: BLACK }} spacing={-11} /></T>
    <Tag x={EDGE} y={516} pad={18} text="今買い？" size={112} bg={WHITE} color={RED} />
  </Frame>
);

(async () => {
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  const only = process.argv[2];
  for (const m of [M13, M16].filter((x) => !only || x.key === only)) {
    const plans: Record<string, ReactNode> = { Q1: q1(m), Q2: q2(m), Q3: q3(m), Q4: m.key === "13" ? q4_13(m) : q4_16(m) };
    for (const [name, node] of Object.entries(plans)) {
      const res = new ImageResponse(<>{node}</>, { width: W, height: H, fonts });
      writeFileSync(join(__dirname, m.dir, `thumb-${name}.png`), Buffer.from(await res.arrayBuffer()));
      console.log(`${m.dir}/thumb-${name}.png`);
    }
  }
})();
