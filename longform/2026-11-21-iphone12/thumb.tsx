/**
 * 「中古iPhone 12は今買い？」のサムネの下書き（型1＝thumb-v13-imakai.tsx の q1。13＝緑・16＝オレンジ・12＝青）
 *   npx tsx longform/2026-11-21-iphone12/thumb.tsx      # thumb-A.png・thumb-B.png（1280x720）と一覧 thumb-contact.png 用の 168x94 は下の python で
 *
 * - 文字は 104px 以上・文字どうし 12px 以上あける・1枚3要素・右下（x1030〜・y600〜）に文字を置かない
 * - 数字は script.md のものだけ: 相場（64GB）3万6,080円・Apple の画面修理 4万5,800円
 * - 端末の写真: longform/assets/v13-layers/12-wide.png があれば右に置く（x 917〜。13・16 と同じ配置）。
 *   無ければ写真なしの配置（文字を大きく）。Commons の iPhone 12 は CC BY-SA だけだった（11/14。SOURCES.md）
 * - 11/14 決定は B 案（赤札）。写真は Unsplash の Thai Nguyen（IegLpS8Eay8・パープル・Unsplash License。assets/stock-photo/SOURCES.md）。
 *   層は python longform/2026-11-21-iphone12/thumb-prep.py（cut layer → この tsx → contact series）。端末は x 918〜1265
 *   写真なしの B は thumb-B-nophoto.png。写真ありの札も「画面修理 4万5,800円」（端末に少し被る。11/14 ユーザー「ちょっと被っても大丈夫」）
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";
const BLUE = "radial-gradient(circle at 84% 50%, #A9D4FF 0%, #1F7BE8 46%, #0A3C8C 100%)";
const LAYER = join(__dirname, "..", "assets", "v13-layers", "12-wide.png");

function Outlined({ text, size, color, outer, spacing = -4 }: { text: string; size: number; color: string; outer: { w: number; c: string }; spacing?: number }) {
  const base = { display: "flex", fontSize: size, fontWeight: 900, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" } as const;
  return (
    <div style={{ display: "flex", position: "relative" }}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <div key={i} style={{ ...base, position: "absolute", left: Math.round(Math.cos(a) * outer.w), top: Math.round(Math.sin(a) * outer.w), color: outer.c }}>{text}</div>;
      })}
      <div style={{ ...base, position: "relative", color }}>{text}</div>
    </div>
  );
}
const T = ({ x, y, children }: { x: number; y: number; children: ReactNode }) => <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "flex-end" }}>{children}</div>;
const Tag = ({ x, y, text, size, bg, color, pad = 24 }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: bg, boxShadow: "5px 5px 0 rgba(0,0,0,0.45)" }}>
    <div style={{ display: "flex", fontSize: size, fontWeight: 900, color, letterSpacing: -3, lineHeight: 1, whiteSpace: "nowrap" }}>{text}</div>
  </div>
);

/** tagPhoto は写真を右に置くとき（文字は x 〜890 まで）の短い札。写真ありの配置は 11/14 に PNG で確認（札の右端 x 840・端末 x 918〜） */
type Plan = { tag: string; tagPhoto: string; tagBg: string; tagColor: string };
const PLANS: Record<string, Plan> = {
  A: { tag: "相場 3万6,080円", tagPhoto: "相場 3万6,080円", tagBg: WHITE, tagColor: BLACK },
  B: { tag: "画面修理 4万5,800円", tagPhoto: "画面修理 4万5,800円", tagBg: RED, tagColor: WHITE },
};

function thumb(p: Plan, photo: string | null) {
  // 写真あり: 13・16 と同じ配置（文字は x 〜890）。写真なし: 文字を大きくして横いっぱいに
  const s = photo ? { name: 130, q: 220, qy: 192, tagY: 470, tag: 104 } : { name: 150, q: 270, qy: 158, tagY: 466, tag: p.tag.length > 11 ? 108 : 124 };
  return (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: BLUE, fontFamily: FONT, overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo ? <img src={photo} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} /> : null}
      <T x={32} y={photo ? 26 : 14}><Outlined text="iPhone 12" size={s.name} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-5} /></T>
      <T x={26} y={s.qy}><Outlined text="今買い？" size={s.q} color={YELLOW} outer={{ w: 11, c: BLACK }} spacing={-10} /></T>
      <Tag x={32} y={s.tagY} text={photo ? p.tagPhoto : p.tag} size={s.tag} bg={p.tagBg} color={p.tagColor} />
    </div>
  );
}

(async () => {
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  const photo = existsSync(LAYER) ? `data:image/png;base64,${readFileSync(LAYER).toString("base64")}` : null;
  for (const [name, p] of Object.entries(PLANS)) {
    const res = new ImageResponse(<>{thumb(p, photo)}</>, { width: W, height: H, fonts });
    writeFileSync(join(__dirname, `thumb-${name}.png`), Buffer.from(await res.arrayBuffer()));
    console.log(`thumb-${name}.png（写真${photo ? "あり" : "なし"}）`);
  }
})();
