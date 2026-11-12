/**
 * 横動画のサムネ・差し替え案 D・E（2026-11-13。A/B テストではなく差し替え用）
 *   npx tsx longform/thumb-v4b.tsx     # 下の PLANS の2本。出力: <フォルダ>/thumb-D.png・thumb-E.png（1280x720）
 *   python -I <一覧のスクリプト>        # 一覧 longform/thumb-v4b-contact.png は PIL で作る（A・D・E と 168x94）
 *
 * 決まり（thumb-ab3.tsx と同じ＋今回の分）:
 * - 題の繰り返しにせず「答え・数字・判定」を書く。文字は 10〜14字前後・2〜3行。主役の語は 180px 以上、補足も 70px 以上
 * - D は明るい地・キャラなし、E は黒や赤の地。A（紺＋つむぎ）と一目で違うこと
 * - 写真・ロゴは使わない（端末は絵。Apple のロゴ・カメラは描かない）。店の名前を出さない
 * - 右下（x1030〜・y600〜）は再生時間の表示と重なるので何も置かない
 * - 数字は各フォルダの script.md・data.json にあるものだけ。「最安」「必ず」「絶対」の言い切りは使わない
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { SITE } from "@/lib/brandColors";

const W = 1280, H = 720;
const RED = SITE.price, GREEN = "#16A34A", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";

const b64 = (p: string) => readFileSync(p).toString("base64");
const chara = (name: string, style: Record<string, unknown>) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`data:image/png;base64,${b64(join(__dirname, "assets/chara/expr", `${name}.png`))}`} style={{ position: "absolute", ...style }} />
);

/** ふち取り文字（thumb-ab3.tsx と同じ。satori は text-stroke を描かないので16方向にずらして重ねる） */
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

/** 赤い ✕（図形。白い縁つき） */
const Batsu = ({ size, style }: { size: number; style: Record<string, unknown> }) => {
  const t = size * 0.2, o = Math.max(5, size * 0.035);
  const bar = (deg: number, pad: number, c: string) => (
    <div style={{ position: "absolute", left: -pad, top: size / 2 - t / 2 - pad, width: size + pad * 2, height: t + pad * 2, borderRadius: 8, background: c, transform: `rotate(${deg}deg)` }} />
  );
  return (
    <div style={{ position: "absolute", display: "flex", width: size, height: size, ...style }}>
      {bar(45, o, WHITE)}{bar(-45, o, WHITE)}{bar(45, 0, RED)}{bar(-45, 0, RED)}
    </div>
  );
};
/** 緑の ○（輪。白い縁つき） */
const Maru = ({ size, style }: { size: number; style: Record<string, unknown> }) => {
  const t = size * 0.17, o = Math.max(5, size * 0.035);
  return (
    <div style={{ position: "absolute", display: "flex", width: size, height: size, ...style }}>
      <div style={{ position: "absolute", left: -o, top: -o, width: size + o * 2, height: size + o * 2, borderRadius: size, border: `${t + o * 2}px solid ${WHITE}` }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: size, height: size, borderRadius: size, border: `${t}px solid ${GREEN}` }} />
    </div>
  );
};

/** スマホの絵（前面だけ。ロゴ・カメラなし） */
const Phone = ({ w, h, screen, dim, style }: { w: number; h: number; screen: [string, string]; dim?: boolean; style?: Record<string, unknown> }) => (
  <div style={{ display: "flex", width: w, height: h, borderRadius: w * 0.16, background: "#1F2937", padding: w * 0.05, border: `${Math.max(3, Math.round(w * 0.025))}px solid #9CA3AF`, boxShadow: "0 16px 36px rgba(0,0,0,0.4)", ...style }}>
    <div style={{ display: "flex", flexGrow: 1, borderRadius: w * 0.11, background: dim ? "linear-gradient(160deg, #9CA3AF, #4B5563)" : `linear-gradient(160deg, ${screen[0]}, ${screen[1]})`, justifyContent: "center" }}>
      <div style={{ display: "flex", width: w * 0.3, height: w * 0.085, marginTop: w * 0.05, borderRadius: 99, background: "#111827" }} />
    </div>
  </div>
);
/** タブレットの絵（板だけ。縦でも横でも。ロゴなし） */
const Tablet = ({ w, h, screen, dim, style }: { w: number; h: number; screen: [string, string]; dim?: boolean; style?: Record<string, unknown> }) => {
  const m = Math.min(w, h);
  return (
    <div style={{ display: "flex", width: w, height: h, borderRadius: m * 0.09, background: "#1F2937", padding: m * 0.055, border: `${Math.max(4, Math.round(m * 0.018))}px solid #9CA3AF`, boxShadow: "0 18px 40px rgba(0,0,0,0.45)", ...style }}>
      <div style={{ display: "flex", flexGrow: 1, borderRadius: m * 0.035, background: dim ? "linear-gradient(160deg, #9CA3AF, #4B5563)" : `linear-gradient(160deg, ${screen[0]}, ${screen[1]})` }} />
    </div>
  );
};
/** ペンの絵（白い棒。お絵描きの回） */
const Pen = ({ len, style }: { len: number; style: Record<string, unknown> }) => (
  <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", ...style }}>
    <div style={{ display: "flex", width: 14, height: 30, borderRadius: "14px 14px 0 0", background: "#9CA3AF" }} />
    <div style={{ display: "flex", width: 30, height: len, borderRadius: "4px 4px 15px 15px", background: WHITE, border: "4px solid #6B7280", boxShadow: "0 10px 20px rgba(0,0,0,0.35)" }} />
  </div>
);

const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);
const Tag = ({ text, size, bg, color, style }: { text: string; size: number; bg: string; color: string; style: Record<string, unknown> }) => (
  <div style={{ position: "absolute", display: "flex", alignItems: "center", height: Math.round(size * 1.3), padding: "0 26px", background: bg, color, fontSize: size, fontWeight: 900, letterSpacing: -2, lineHeight: 1, whiteSpace: "nowrap", ...style }}>{text}</div>
);

type Plan = { D: () => ReactNode; E: () => ReactNode };

const PLANS: Record<string, Plan> = {
  // 4本目「中古iPhone、店選びの正解は？」（1,037／1.5%）。A は写真（リンゴのロゴ入り）＋つむぎなので差し替え
  "2026-10-24-where-to-buy": {
    // D: ✕と○の対比・黄の地・キャラなし。「保証で選ぶなら 30日 ✕／1年 ○」
    //   script.md「6:20 保証の長さ」: いちばん長いのは1年間の返品・交換／30日以内の返品・交換、初期不良30日の店もある。
    //   「初めての中古で不安なら、保証の長いお店」。下の「16店を比較」は「0:00」
    D: () => (
      <Frame bg={`linear-gradient(180deg, #FFF27A 0%, ${YELLOW} 100%)`}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 160, display: "flex", alignItems: "center", justifyContent: "center", background: BLACK }}>
          <Outlined text="保証で選ぶなら" size={124} color={YELLOW} spacing={-2} />
        </div>
        <div style={{ position: "absolute", left: 640, top: 160, width: 640, height: 560, display: "flex", background: WHITE }} />
        <Phone w={150} h={270} screen={["#BAE6FD", "#A7F3D0"]} dim style={{ position: "absolute", left: 40, top: 230 }} />
        <Batsu size={190} style={{ left: 20, top: 270 }} />
        <div style={{ position: "absolute", left: 215, top: 250, display: "flex" }}><Outlined text="30日" size={200} color="#374151" inner={{ w: 7, c: WHITE }} spacing={-8} /></div>
        <Phone w={150} h={270} screen={["#BAE6FD", "#A7F3D0"]} style={{ position: "absolute", left: 670, top: 230 }} />
        <Maru size={190} style={{ left: 650, top: 270 }} />
        <div style={{ position: "absolute", left: 845, top: 225, display: "flex" }}><Outlined text="1年" size={250} color={RED} inner={{ w: 9, c: WHITE }} outer={{ w: 7, c: BLACK }} spacing={-8} /></div>
        <Tag text="中古iPhone 16店を比較" size={78} bg={BLACK} color={WHITE} style={{ left: 0, top: 580 }} />
      </Frame>
    ),
    // E: 言い切り＋数字・赤黒の地・ずんだもん小さめ。「ぜんぶ最安の店は 0店」
    //   script.md「0:00 結論」: いちばん安い店は機種ごとに入れ替わる。どの機種でも最安、っていう店はない。
    //   「0:50」: 16店・最安を数えた41機種
    E: () => (
      <Frame bg="radial-gradient(circle at 30% 55%, #9B1C1C 0%, #2A0A0A 60%, #0B0B0F 100%)">
        <Tag text="ぜんぶ最安の店は" size={124} bg={YELLOW} color={BLACK} style={{ left: 0, top: 26 }} />
        <div style={{ position: "absolute", left: 50, top: 205, display: "flex" }}><Outlined text="0店" size={370} color={WHITE} inner={{ w: 12, c: RED }} outer={{ w: 9, c: BLACK }} spacing={-10} /></div>
        <div style={{ position: "absolute", left: 800, top: 215, width: 350, height: 350, overflow: "hidden", display: "flex", background: YELLOW, border: `10px solid ${WHITE}` }}>
          {chara("zundamon-shock", { left: -60, top: -55, height: 800 })}
        </div>
        <Tag text="16店・41機種で比較" size={76} bg={WHITE} color={BLACK} style={{ left: 0, top: 604 }} />
      </Frame>
    ),
  },
  // 3本目「【中古iPad】いま買うならどれ？」（1,513／2.8%）。A＝紺の地＋つむぎ「7万円→Air 第5世代」
  "2026-10-23-ipad-dore": {
    // D: 予算＋答え・白の地・キャラなし。「7万円 → Air 第5世代」＋縦の iPad 1台とペン
    //   script.md「0:00 結論」: 7万円なら iPad Air の第5世代／「4:00」: Air 第5世代（64GB）相場 71,280円・第2世代の Pencil が使える
    D: () => (
      <Frame bg={`linear-gradient(180deg, ${WHITE} 0%, #FFF3A6 100%)`}>
        <Tag text="中古iPad 買うなら" size={80} bg={BLACK} color={YELLOW} style={{ left: 0, top: 24 }} />
        <div style={{ position: "absolute", left: 30, top: 150, display: "flex" }}><Outlined text="7万円" size={310} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-12} /></div>
        <div style={{ position: "absolute", left: 40, top: 488, display: "flex" }}><Outlined text="Air 第5世代" size={160} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} /></div>
        <Tablet w={320} h={440} screen={["#C7D2FE", "#F0ABFC"]} style={{ position: "absolute", left: 900, top: 30, transform: "rotate(5deg)" }} />
        <Pen len={330} style={{ left: 1205, top: 120, transform: "rotate(18deg)" }} />
      </Frame>
    ),
    // E: ✕と○の対比・黒の地・キャラなし。「第8世代 ✕／第9世代 ○」＋「iPadOS 27 非対応」
    //   script.md「1:30 安すぎるiPadの落とし穴」: 第8世代は iPadOS 27 に対応していない。無印で対応しているのは第9世代から
    E: () => (
      <Frame bg={`linear-gradient(90deg, #4A0D0D 0%, ${BLACK} 46%, ${BLACK} 54%, #0B3B1E 100%)`}>
        <div style={{ position: "absolute", left: 40, top: 22, display: "flex" }}><Outlined text="第8世代" size={150} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-6} /></div>
        <div style={{ position: "absolute", left: 690, top: 22, display: "flex" }}><Outlined text="第9世代" size={150} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-6} /></div>
        <Tablet w={420} h={300} screen={["#FECACA", "#FDE68A"]} dim style={{ position: "absolute", left: 110, top: 210 }} />
        <Batsu size={330} style={{ left: 155, top: 195 }} />
        <Tablet w={420} h={300} screen={["#BAE6FD", "#A7F3D0"]} style={{ position: "absolute", left: 760, top: 210 }} />
        <Maru size={320} style={{ left: 810, top: 200 }} />
        <Tag text="iPadOS 27 非対応" size={96} bg={RED} color={WHITE} style={{ left: 0, top: 568 }} />
      </Frame>
    ),
  },
};

(async () => {
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  for (const [key, plan] of Object.entries(PLANS)) {
    const dir = join(__dirname, key);
    for (const v of ["D", "E"] as const) {
      const res = new ImageResponse(<>{plan[v]()}</>, { width: W, height: H, fonts });
      writeFileSync(join(dir, `thumb-${v}.png`), Buffer.from(await res.arrayBuffer()));
    }
    console.log(`D・E → ${dir}`);
  }
})();
