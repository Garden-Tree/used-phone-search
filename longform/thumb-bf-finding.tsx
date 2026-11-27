/**
 * 横動画 2026-11-26-blackfriday のサムネ（2026-11-19・型R＝暗い地＋発見が最大。thumb-v14-finding.tsx と同じ部品）
 *   python longform/thumb-bf-prep.py                       # Pixel 10a の切り抜きと層（assets/bf-layers/）
 *   npx tsx longform/thumb-bf-finding.tsx                  # 2026-11-26-blackfriday/thumb-R1.png・R2・R3
 *   npx tsx longform/thumb-bf-finding.tsx --check <dir>    # 文字だけ（黒地・端末なし・黒ふちは灰色）を <dir>/R1.png… に出す
 *   python -I longform/thumb-bf-check.py [<dir>]           # 一覧 thumb-contact.png（<dir> があれば余白・右下・端末との重なりを測る）
 *
 * 決まり: 文字 104px 以上・1枚 2〜3 要素・文字と札は端から 60px 以上・文字どうし／文字と端末は重ねない・右下（x1030〜・y600〜）に文字なし
 * 数字は script.md のものだけ: Pixel 10a 128GB セールの新品 78,880円・中古の相場 82,280円・新品が 3,400円安い
 * 写真: Unsplash の Pixel 10a（Gavin Phillips・Unsplash License。thumb-credit.txt）
 *
 * --set=16e（11/19 追加）: 横動画 2026-12-03-iphone16e-review。`python longform/thumb-bf-prep.py --set=16e` で層（assets/16e-layers/）を作ってから
 *   npx tsx longform/thumb-bf-finding.tsx --set=16e [--check <dir>]  ／  python -I longform/thumb-bf-check.py --set=16e [<dir>]
 *   数字は script.md のものだけ: 1年半で電池の最大容量 93%・売った額 68,400円（6.8万円）・Apple の下取り 53,000円（5.3万円）
 *   写真: 運営者が撮った iPhone 16e（gadelog.com の記事。thumb-credit.txt）
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";
const EDGE = 60;
const SET = process.argv.find((a) => a.startsWith("--set="))?.slice(6) ?? "bf";
const ARGV = process.argv.slice(2).filter((a) => !a.startsWith("--set="));
const CHECK = ARGV[0] === "--check";
const DIR = SET === "14keep" ? "2026-11-28-iphone14-keep" : SET === "bfa" ? "2026-11-28-bf-amazon-iphone" : SET === "dec" ? "2026-12-01-monthly" : SET === "12keep" ? "2026-11-28-iphone12-keep" : SET === "se3keep" || SET === "se3keepB" ? "2026-12-01-iphonese3-keep" : SET === "16e" ? "2026-12-03-iphone16e-review" : SET === "13keep" ? "2026-11-22-iphone13-keep" : SET === "15" ? "2026-11-24-iphone15" : "2026-11-26-blackfriday";
const LAYERS = SET === "14keep" ? "14keep-layers" : SET === "bfa" ? "bfa-layers" : SET === "dec" ? "dec-layers" : SET === "12keep" ? "12keep-layers" : SET === "se3keepB" ? "se3keepB-layers" : SET === "se3keep" ? "se3keep-layers" : SET === "16e" ? "16e-layers" : SET === "13keep" ? "13keep-layers" : SET === "15" ? "15-layers" : "bf-layers";
const OUTC = (c: string) => (CHECK && c === BLACK ? "#808080" : c);

function Layer({ name }: { name: string }) {
  if (CHECK) return null;
  const buf = readFileSync(join(__dirname, "assets", LAYERS, `${name}.png`));
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`data:image/png;base64,${buf.toString("base64")}`} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />;
}
function Outlined({ text, size, color, w, spacing = -4 }: { text: string; size: number; color: string; w: number; spacing?: number }) {
  const base = { display: "flex", fontSize: size, fontWeight: 900, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" } as const;
  return (
    <div style={{ display: "flex", position: "relative" }}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <div key={i} style={{ ...base, position: "absolute", left: Math.round(Math.cos(a) * w), top: Math.round(Math.sin(a) * w), color: OUTC(BLACK) }}>{text}</div>;
      })}
      <div style={{ ...base, position: "relative", color }}>{text}</div>
    </div>
  );
}
const T = ({ x, y, children }: { x: number; y: number; children: ReactNode }) => <div style={{ position: "absolute", left: x, top: y, display: "flex" }}>{children}</div>;
const Plain = ({ text, size, color, spacing = -3 }: { text: string; size: number; color: string; spacing?: number }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 900, color, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" }}>{text}</div>
);
const Tag = ({ x, y, text, size, color, pad = 18, spacing = -3 }: { x: number; y: number; text: string; size: number; color: string; pad?: number; spacing?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: WHITE, ...(CHECK ? {} : { boxShadow: "5px 5px 0 rgba(0,0,0,0.6)" }) }}>
    <Plain text={text} size={size} color={color} spacing={spacing} />
  </div>
);
const Frame = ({ children }: { children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: CHECK ? "#000000" : DARK, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);
// 暗い地（ほぼ黒の紺）。端末のうしろ（右下）だけ少し明るくして輪郭を出す
const DARK = "radial-gradient(circle at 74% 100%, #3A4260 0%, #161B2C 42%, #06070B 100%)";

// R1: Pixel 10a（白 124）／ 新品が安い（黄 196・主役）。2行＋端末＝3要素
const r1 = (
  <Frame>
    <Layer name="bf-bottom" />
    <T x={EDGE + 6} y={60}><Outlined text="Pixel 10a" size={124} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 10} y={212}><Outlined text="新品が安い" size={196} color={YELLOW} w={10} spacing={-10} /></T>
  </Frame>
);
// R2: Pixel 10a（白 116）／ 新品が安い（黄 172・主役）／ 札 −3,400円（赤 104）。端末は少し右（bf-bottom2）
const r2 = (
  <Frame>
    <Layer name="bf-bottom2" />
    <T x={EDGE + 6} y={60}><Outlined text="Pixel 10a" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="新品が安い" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={448} text="−3,400円" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);
// R3: 新品が安い（黄 172・主役）／ 札2行 セール 78,880円（赤）・中古 82,280円（黒）。端末は小さく右下（bf-small）。機種名は写真と題に任せる
const r3 = (
  <Frame>
    <Layer name="bf-small" />
    <T x={EDGE + 9} y={60}><Outlined text="新品が安い" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <div style={{ position: "absolute", left: EDGE, top: 272, display: "flex", flexDirection: "column", padding: "14px 20px", gap: 12, background: WHITE, ...(CHECK ? {} : { boxShadow: "5px 5px 0 rgba(0,0,0,0.6)" }) }}>
      <Plain text="セール78,880円" size={104} color={RED} spacing={-6} />
      <Plain text="中古　82,280円" size={104} color={BLACK} spacing={-6} />
    </div>
  </Frame>
);

// ---- 16e（2026-12-03-iphone16e-review）: 運営者の iPhone 16e（黒）の背面。暗い地＋「電池93%」が最大 ----
// E1: 1年半で（白 124）／ 電池93%（黄 204・主役）。2行＋端末＝3要素
const e1 = (
  <Frame>
    <Layer name="16e-big" />
    <T x={EDGE + 6} y={60}><Outlined text="1年半で" size={124} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 10} y={208}><Outlined text="電池93%" size={204} color={YELLOW} w={10} spacing={-8} /></T>
  </Frame>
);
// E2: 1年半で（白 116）／ 電池93%（黄 196・主役）／ 札 売値6.8万円（赤 104）
const e2 = (
  <Frame>
    <Layer name="16e-mid" />
    <T x={EDGE + 6} y={60}><Outlined text="1年半で" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={200}><Outlined text="電池93%" size={196} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={452} text="売値6.8万円" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);
// E3: 電池93%（黄 196・主役）／ 札2行 下取り 5.3万円（黒）・売値 6.8万円（赤）。「1年半」は題に任せる
const e3 = (
  <Frame>
    <Layer name="16e-small" />
    <T x={EDGE + 9} y={60}><Outlined text="電池93%" size={196} color={YELLOW} w={9} spacing={-8} /></T>
    <div style={{ position: "absolute", left: EDGE, top: 296, display: "flex", flexDirection: "column", padding: "14px 20px", gap: 12, background: WHITE, ...(CHECK ? {} : { boxShadow: "5px 5px 0 rgba(0,0,0,0.6)" }) }}>
      <Plain text="下取り5.3万円" size={104} color={BLACK} spacing={-6} />
      <Plain text="売値　6.8万円" size={104} color={RED} spacing={-6} />
    </div>
  </Frame>
);

// E4（R4・11/19 ユーザー「iPhone 16e を入れて」）: R2 の上に iPhone 16e（白 116）／ 1年半で（白 104）／ 電池93%（黄 172・主役）／ 札 売値6.8万円（赤 104）
const e4 = (
  <Frame>
    <Layer name="16e-r4" />
    <T x={EDGE + 6} y={60}><Outlined text="iPhone 16e" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 6} y={196}><Outlined text="1年半で" size={104} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 8} y={316}><Outlined text="電池93%" size={172} color={YELLOW} w={9} spacing={-7} /></T>
    <Tag x={EDGE} y={516} text="売値6.8万円" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);
// E5（R5）: R1 の上の行を「iPhone 16e 1年半で」（白 104）に ／ 電池93%（黄 220・主役）。札なし・写真を大きく
const e5 = (
  <Frame>
    <Layer name="16e-r5" />
    <T x={EDGE + 6} y={60}><Outlined text="iPhone 16e 1年半で" size={104} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 10} y={196}><Outlined text="電池93%" size={220} color={YELLOW} w={10} spacing={-8} /></T>
  </Frame>
);

// ---- 13keep（2026-11-22-iphone13-keep・11/20）: iPhone 13（スターライト）の背面。数字は script.md のものだけ
//   電池交換 15,600円（Apple 公式・保証対象外）・中古の 14 は 13 と同じ A15・Lightning・売って中古の 15 は +60,200円（11/24 に取り直す）
// K1: iPhone 13（白 116）／ 電池交換（黄 172・主役）／ 札 1.6万円（赤 104）
const k1 = (
  <Frame>
    <Layer name="13k-big" />
    <T x={EDGE + 6} y={60}><Outlined text="iPhone 13" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="電池交換" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={448} text="1.6万円で十分" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);
// K2: 14にしても（白 116）／ 中身は同じ（黄 172・主役）／ 札 A15のまま（赤 104）
const k2 = (
  <Frame>
    <Layer name="13k-mid" />
    <T x={EDGE + 6} y={60}><Outlined text="14にしても" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="中身は同じ" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={448} text="A15のまま" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);
// K3: iPhone 13（白 116）／ まだ使う？（黄 172・主役）／ 札 電池 1.6万円（赤 104）
const k3 = (
  <Frame>
    <Layer name="13k-big" />
    <T x={EDGE + 6} y={60}><Outlined text="iPhone 13" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="まだ使う？" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={448} text="電池1.6万円" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);

// ---- dec（2026-12-01-monthly・11/26）: 17 Pro Max 208,780→199,980（−8,800・11/1→11/26）
const d1 = (
  <Frame>
    <Layer name="17pm" />
    <T x={EDGE + 8} y={64}><Outlined text="12月の中古" size={132} color={WHITE} w={7} spacing={-6} /></T>
    <T x={EDGE + 8} y={222}><Outlined text="買う5台" size={196} color={YELLOW} w={10} spacing={-10} /></T>
    <Tag x={EDGE + 4} y={492} text="買わない3台" size={120} color={RED} pad={22} spacing={-6} />
  </Frame>
);
const d2 = (
  <Frame>
    <Layer name="17pm" />
    <T x={EDGE + 8} y={64}><Outlined text="12月の中古" size={132} color={WHITE} w={7} spacing={-6} /></T>
    <T x={EDGE + 8} y={222}><Outlined text="買う5台" size={196} color={YELLOW} w={10} spacing={-10} /></T>
    <Tag x={EDGE + 4} y={492} text="−8800円" size={128} color={RED} pad={22} spacing={-4} />
  </Frame>
);
// ---- bfa（2026-11-28-bf-amazon-iphone・11/26）: Air の写真を右に。札はセール価格を見てから（11/27 0時〜）
const bfa = (tag: string, size = 112, top = "ブラックフライデー") => (
  <Frame>
    <Layer name="air" />
    <T x={EDGE + 8} y={64}><Outlined text={top} size={104} color={WHITE} w={6} spacing={-6} /></T>
    <T x={EDGE + 8} y={200}><Outlined text="新品と中古" size={160} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE + 4} y={450} text={tag} size={size} color={RED} pad={20} spacing={-5} />
  </Frame>
);
// 11/27 0時: 値下げは Air だけ。1TB はセールの新品 184,900 < 中古 186,780（script.md）
const b1 = bfa("1TBは新品が安い", 104), b2 = bfa("1TBは新品が安い", 104, "Amazonセール");
// ---- 12keep（2026-11-28-iphone12-keep・11/25）: 13・SE3 と同じ形。11（紫）を後ろ・12（緑）を手前に。数字は script.md: 電池交換 15,600円
const n = (tag: string, size = 104) => (
  <Frame>
    <Layer name="11k-back" /><Layer name="12k-front" />
    <T x={EDGE + 6} y={66}><Outlined text="iPhone 12・11" size={112} color={WHITE} w={6} spacing={-4} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="まだ使う？" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={448} text={tag} size={size} color={RED} pad={16} spacing={-5} />
  </Frame>
);
const n1 = n("電池1.6万円"), n2 = n("12は○ 11は？");

// ---- 14keep（2026-11-28-iphone14-keep・11/27）: 13・SE3 と同じ形。iPhone 14（ブルー）の背面。A/B は札だけ変える
//   数字は script.md のもの: 電池交換 17,200円・売って中古の 15 は +49,700円（91,700−42,000）・16e は MagSafe なし
const a = (tag: string) => (
  <Frame>
    <Layer name="14k-big" />
    <T x={EDGE + 6} y={60}><Outlined text="iPhone 14" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="まだ使う？" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={448} text={tag} size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);
const a1 = a("電池1.7万円"), a2 = a("替えるなら+5万円");  // 「16eはMagSafeなし」は札が x979 まで伸びて端末に 8,141px 重なった（11/27）

// ---- se3keep（2026-12-01-iphonese3-keep・11/23）: 13keep の K3 と同じ形。iPhone SE 第3世代（赤）の前面。数字は script.md のもの: 電池交換 12,000円
const s1 = (
  <Frame>
    <Layer name="se3k-big" />
    <T x={EDGE + 6} y={60}><Outlined text="iPhone SE 3" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="まだ使う？" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={448} text="電池1.2万円" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);

// S2（11/24）: S1 と同じ文字・写真だけ明るい背面（スターライト）に。S1 は正面の赤い本体で画面が黒く、関連動画の枠の CTR 0.9%
const s2 = (
  <Frame>
    <Layer name="se3kb-big" />
    <T x={EDGE + 6} y={60}><Outlined text="iPhone SE 3" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="まだ使う？" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={448} text="電池1.2万円" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);

// ---- 15（2026-11-24-iphone15・11/21）: iPhone 15 の前面。数字は script.md のもの（11/17。公開前日 11/27 に取り直す）
//   相場 128GB 90,980円（9.1万円・11/22）・14 との差 26,000円（2.6万円。違いは USB-C と A16）
// F1: iPhone 15（白 116）／ 今買い？（黄 172・主役）／ 札 相場9.2万円（赤 104）＝13 の K3 と同じ形
const f1 = (
  <Frame>
    <Layer name="15-big" />
    <T x={EDGE + 6} y={60}><Outlined text="iPhone 15" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="今買い？" size={172} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={448} text="相場9.1万円" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);
// F2: 14との差は（白 116）／ USB-C（黄 172・主役）／ 札 +2.7万円（赤 104）
const f2 = (
  <Frame>
    <Layer name="15-big" />
    <T x={EDGE + 6} y={60}><Outlined text="14との差は" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="USB-C" size={190} color={YELLOW} w={9} spacing={-6} /></T>
    <Tag x={EDGE} y={448} text="+2.7万円" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);
// F3: iPhone 15（白 116）／ 9.2万円（黄 172・主役）／ 札 14との差USB-C（赤 104）＝台本のサムネ案
const f3 = (
  <Frame>
    <Layer name="15-big" />
    <T x={EDGE + 6} y={60}><Outlined text="iPhone 15" size={116} color={WHITE} w={6} spacing={-3} /></T>
    <T x={EDGE + 9} y={204}><Outlined text="9.2万円" size={190} color={YELLOW} w={9} spacing={-8} /></T>
    <Tag x={EDGE} y={448} text="差はUSB-C" size={104} color={RED} pad={16} spacing={-5} />
  </Frame>
);

(async () => {
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  const plans: [string, ReactNode][] = SET === "14keep" ? [["A1", a1], ["A2", a2]] : SET === "bfa" ? [["B1", b1], ["B2", b2]] : SET === "dec" ? [["D1", d1], ["D2", d2]] : SET === "12keep" ? [["N1", n1], ["N2", n2]] : SET === "se3keepB" ? [["S2", s2]] : SET === "se3keep" ? [["S1", s1]] : SET === "15" ? [["F1", f1], ["F2", f2], ["F3", f3]] : SET === "13keep" ? [["K1", k1], ["K2", k2], ["K3", k3]] : SET === "16e" ? [["R1", e1], ["R2", e2], ["R3", e3], ["R4", e4], ["R5", e5]] : [["R1", r1], ["R2", r2], ["R3", r3]];
  const checkDir = CHECK ? ARGV[1] : "";
  if (CHECK) mkdirSync(checkDir, { recursive: true });
  for (const [name, node] of plans) {
    const res = new ImageResponse(<>{node}</>, { width: W, height: H, fonts });
    const out = CHECK ? join(checkDir, `${name}.png`) : join(__dirname, DIR, `thumb-${name}.png`);
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(out);
  }
})();
