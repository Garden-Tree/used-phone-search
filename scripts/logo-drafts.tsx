/**
 * ロゴの案を作る（2026-10-23〜）。ファビコン（紺の角丸に白い「中」）を記号に使う
 * 参考にした型（10/23 に見たもの）: 価格.com（太い字＋「.com」だけ色違い＋一言）・Back Market（簡単な記号＋太い字・1色）
 *   イオシス（丸い記号＋名前＋赤い一言）・じゃんぱら（丸みのある太い字）・Skyscanner（小さな記号＋字・暗い地でも同じ形）
 *   npx tsx scripts/logo-drafts.tsx → scratch/logo/<案>.png と見本 sheet.png
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { ON_DARK, SITE } from "@/lib/brandColors";

const NAVY = SITE.brand900, INDIGO = SITE.brand600, RED = SITE.price;
const OUT = "scratch/logo";
const W = 1320, H = 260;

/** 記号: 紺の角丸に白い「中」（ファビコンと同じ） */
const Mark = ({ size, bg = NAVY, fg = "white" }: { size: number; bg?: string; fg?: string }) => (
  <div style={{ display: "flex", width: size, height: size, alignItems: "center", justifyContent: "center", borderRadius: size * 0.215, background: bg, flexShrink: 0 }}>
    <div style={{ display: "flex", position: "relative", top: -size * 0.043, fontSize: size * 0.78, fontWeight: 900, color: fg, lineHeight: 1 }}>中</div>
  </div>
);

type Tone = { bg: string; text: string; accent: string; sub: string; red: string; mark: { bg: string; fg: string } };
const LIGHT: Tone = { bg: "white", text: NAVY, accent: INDIGO, sub: "#64748B", red: RED, mark: { bg: NAVY, fg: "white" } };
// 紺の地では赤を明るい版に（brandColors の ON_DARK。紺に対してコントラスト 5.98）
const DARK: Tone = { bg: NAVY, text: "white", accent: "#A5B4FC", sub: "#C7D2FE", red: ON_DARK.price, mark: { bg: "white", fg: NAVY } };

const DRAFTS: Record<string, (t: Tone) => React.ReactElement> = {
  // 1: 記号＋1行の名前。「一括検索」だけ色を変える（価格.com の「.com」の考え方）
  "1": (t) => (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Mark size={150} {...t.mark} />
      <div style={{ display: "flex", marginLeft: 34, fontSize: 96, fontWeight: 900, letterSpacing: -2, color: t.text }}>中古スマホ<span style={{ color: t.accent }}>一括検索</span></div>
    </div>
  ),
  // 2: 記号＋2段（小さい「中古スマホ」・大きい「一括検索」）。横幅が足りない場所向け
  "2": (t) => (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Mark size={170} {...t.mark} />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 30 }}>
        <div style={{ display: "flex", fontSize: 58, fontWeight: 900, color: t.accent, letterSpacing: 2, lineHeight: 1.1 }}>中古スマホ</div>
        <div style={{ display: "flex", fontSize: 112, fontWeight: 900, color: t.text, letterSpacing: -2, lineHeight: 1.05 }}>一括検索</div>
      </div>
    </div>
  ),
  // 3: 記号＋名前＋下に一言（イオシスの「けっこう安い。」の考え方）。一言は赤
  "3": (t) => (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Mark size={170} {...t.mark} />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 32 }}>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 900, color: t.text, letterSpacing: -2, lineHeight: 1.1 }}>中古スマホ一括検索</div>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: t.sub, marginTop: 6 }}>16店の最安値を、<span style={{ color: t.red, fontWeight: 900 }}>まとめて。</span></div>
      </div>
    </div>
  ),
  // 4: 記号なし・名前だけ（じゃんぱら・Back Market の考え方）。「中」を記号と同じ角丸に入れて頭文字にする
  "4": (t) => (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Mark size={118} {...t.mark} />
      <div style={{ display: "flex", marginLeft: 8, fontSize: 104, fontWeight: 900, letterSpacing: -2, color: t.text }}>古スマホ<span style={{ color: t.accent }}>一括検索</span></div>
    </div>
  ),
  // 5: 記号＋名前＋右に「by ガデログ」（ブログとの関係を見せる）
  "5": (t) => (
    <div style={{ display: "flex", alignItems: "flex-end" }}>
      <Mark size={140} {...t.mark} />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 30 }}>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 900, color: t.text, letterSpacing: -2, lineHeight: 1.1 }}>中古スマホ<span style={{ color: t.accent }}>一括検索</span></div>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: t.sub, marginTop: 4 }}>by ガデログ ・ used.gadelog.com</div>
      </div>
    </div>
  ),
};

(async () => {
  mkdirSync(OUT, { recursive: true });
  const fonts = await notoSansJp("中古スマホ一括検索16店の最安値を、まとめて。by ガデログ・used.gadelog.com");
  for (const [name, f] of Object.entries(DRAFTS)) {
    for (const [tn, t] of Object.entries({ light: LIGHT, dark: DARK })) {
      const el = <div style={{ width: W, height: H, display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "0 40px", background: t.bg, fontFamily: "Noto Sans JP" }}>{f(t)}</div>;
      const res = new ImageResponse(el, { width: W, height: H, fonts });
      writeFileSync(`${OUT}/${name}-${tn}.png`, Buffer.from(await res.arrayBuffer()));
    }
  }
  console.log("ok");
})();
