/**
 * 横動画のサムネ・第4弾（2026-11-13）。A/B テストではなく「差し替え」用の D・E 案（A は今の thumbnail.png）
 *   npx tsx longform/thumb-v4a.tsx            # 3本ぶん（下の PLANS）
 *   python -I longform/thumb-v4a-contact.py   # 一覧 longform/thumb-v4a-contact.png（A・D・E と 168x94）
 * 出力: <フォルダ>/thumb-D.png・thumb-E.png（1280x720）
 *
 * 決まり（thumb-ab3.tsx と同じもの＋今回）:
 * - 文字は題の繰り返しにせず「答え・数字・判定」。2〜3行・いちばん言いたい語は 180px 以上、補足も 70px 以上
 * - D は明るい地（黄・白）、E は暗い地（黒・赤・緑）。A（紺＋つむぎ）と一目で違うこと
 * - 写真・ロゴは使わない（端末は絵。前面だけ・ロゴやリンゴの形は描かない）
 * - 右下（x1030〜・y600〜）は再生時間の表示と重なるので何も置かない
 * - 数字・機種名は各フォルダの script.md・data.json にあるものだけ。「最安」「必ず」「絶対」は書かない
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", GREEN = "#0E9F4F", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";

const b64 = (p: string) => readFileSync(p).toString("base64");

/** ふち取り文字（satori は text-stroke を描かないので16方向にずらして重ねる。thumb-ab3.tsx と同じ） */
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

/** 置く場所つきの文字 */
const T = ({ x, y, children }: { x: number; y: number; children: ReactNode }) => <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "flex-end" }}>{children}</div>;
const Plain = ({ text, size, color, spacing = -3 }: { text: string; size: number; color: string; spacing?: number }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 900, color, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" }}>{text}</div>
);
const Tag = ({ x, y, text, size, bg, color, pad = 24 }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: bg, boxShadow: "6px 6px 0 rgba(0,0,0,0.3)" }}>
    <Plain text={text} size={size} color={color} />
  </div>
);

/** ✕（赤の丸）。図形で描く */
const Cross = ({ x, y, size }: { x: number; y: number; size: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", width: size, height: size, borderRadius: size, background: RED, border: `${Math.round(size * 0.07)}px solid ${WHITE}`, boxShadow: "0 6px 16px rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
    <div style={{ display: "flex", position: "relative", width: size * 0.56, height: size * 0.56 }}>
      <div style={{ position: "absolute", left: 0, top: size * 0.21, width: size * 0.56, height: size * 0.14, background: WHITE, borderRadius: 6, transform: "rotate(45deg)" }} />
      <div style={{ position: "absolute", left: 0, top: size * 0.21, width: size * 0.56, height: size * 0.14, background: WHITE, borderRadius: 6, transform: "rotate(-45deg)" }} />
    </div>
  </div>
);
/** ○（白い丸の中に緑の輪） */
const Maru = ({ x, y, size }: { x: number; y: number; size: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", width: size, height: size, borderRadius: size, background: WHITE, boxShadow: "0 6px 16px rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
    <div style={{ display: "flex", width: size * 0.78, height: size * 0.78, borderRadius: size, border: `${Math.round(size * 0.15)}px solid ${GREEN}` }} />
  </div>
);

/** 端末の絵（前面だけ・ロゴなし）。画面の中に文字か電池の絵を入れられる */
function Device({ x, y, w, h, screen, dim, rotate, children }: { x: number; y: number; w: number; h: number; screen: [string, string]; dim?: boolean; rotate?: number; children?: ReactNode }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", width: w, height: h, borderRadius: w * 0.17, background: "#111827", padding: w * 0.05, border: `${Math.max(3, Math.round(w * 0.028))}px solid ${dim ? "#6B7280" : "#D1D5DB"}`, boxShadow: "0 14px 30px rgba(0,0,0,0.45)", ...(rotate ? { transform: `rotate(${rotate}deg)` } : {}) }}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignItems: "center", borderRadius: w * 0.12, background: dim ? "linear-gradient(160deg, #9CA3AF, #4B5563)" : `linear-gradient(160deg, ${screen[0]}, ${screen[1]})` }}>
        <div style={{ display: "flex", width: w * 0.3, height: w * 0.08, marginTop: w * 0.05, borderRadius: 99, background: "#111827" }} />
        <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center" }}>{children}</div>
      </div>
    </div>
  );
}
/** 電池の絵（端末の画面に入れる。fill＝残りの割合 0〜1） */
const Cell = ({ w, fill, color }: { w: number; fill: number; color: string }) => (
  <div style={{ display: "flex", alignItems: "center" }}>
    <div style={{ display: "flex", width: w, height: w * 0.5, borderRadius: w * 0.1, border: `${Math.round(w * 0.07)}px solid #111827`, background: WHITE, padding: w * 0.04 }}>
      <div style={{ display: "flex", width: `${Math.round(fill * 100)}%`, height: "100%", borderRadius: w * 0.04, background: color }} />
    </div>
    <div style={{ display: "flex", width: w * 0.07, height: w * 0.2, borderRadius: 3, background: "#111827" }} />
  </div>
);
/** 丸い枠に入れたキャラ（小さめ。顔のあたりだけ） */
const Badge = ({ name, x, y, size, bg, imgW, imgH, imgX, imgY }: { name: string; x: number; y: number; size: number; bg: string; imgW: number; imgH: number; imgX: number; imgY: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", width: size, height: size, borderRadius: size, background: WHITE, padding: 6, boxShadow: "0 6px 16px rgba(0,0,0,0.45)" }}>
    <div style={{ display: "flex", flexGrow: 1, borderRadius: size, backgroundColor: bg, backgroundImage: `url(data:image/png;base64,${b64(join(__dirname, "assets/chara/expr", `${name}.png`))})`, backgroundRepeat: "no-repeat", backgroundSize: `${imgW}px ${imgH}px`, backgroundPosition: `${imgX}px ${imgY}px` }} />
  </div>
);

const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);
const LILAC: [string, string] = ["#C7D2FE", "#F0ABFC"], MINT: [string, string] = ["#BAE6FD", "#A7F3D0"], PEACH: [string, string] = ["#FECACA", "#FDE68A"];

type Plan = { D: () => ReactNode; E: () => ReactNode };

const PLANS: Record<string, Plan> = {
  // 1本目「いま買うならどれ？」。型＝予算＋価格（答えを1つだけ）
  //   数字: 「0:00 結論から」迷ったら、5万円なら iPhone 13 ／「3:05 5万円前後」13 の相場 5.1万（128GB）
  "2026-10-21-iphone-dore": {
    // D: 黄の地・キャラなし。「5万円なら／iPhone 13」＋端末1台
    D: () => (
      <Frame bg={`radial-gradient(circle at 30% 35%, #FFF7AE 0%, ${YELLOW} 50%, #F5B400 100%)`}>
        <T x={34} y={36}><Outlined text="5万円" size={300} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
        <T x={790} y={206}><Plain text="なら" size={104} color={BLACK} /></T>
        <T x={36} y={352}><Plain text="iPhone 13" size={196} color={BLACK} spacing={-6} /></T>
        <Device x={1010} y={36} w={226} h={420} screen={MINT} />
        <Maru x={1060} y={170} size={130} />
        <Tag x={36} y={576} text="中古の相場 5.1万円" size={78} bg={BLACK} color={WHITE} />
      </Frame>
    ),
    // E: 黒の地・つむぎは丸い枠で小さく。「迷ったら／iPhone 13／5万円の正解」＋大きい端末
    E: () => (
      <Frame bg={`linear-gradient(105deg, ${BLACK} 0%, ${BLACK} 30%, #5B0F0F 100%)`}>
        <Device x={50} y={70} w={300} h={570} screen={LILAC} rotate={-7}>
          <Plain text="13" size={150} color={BLACK} spacing={-6} />
        </Device>
        <T x={430} y={36}><Outlined text="迷ったら" size={136} color={WHITE} outer={{ w: 7, c: BLACK }} spacing={-4} /></T>
        <T x={436} y={388}><Plain text="iPhone" size={96} color={WHITE} /></T>
        <T x={770} y={150}><Outlined text="13" size={370} color={YELLOW} inner={{ w: 10, c: BLACK }} outer={{ w: 7, c: WHITE }} spacing={-14} /></T>
        <Tag x={436} y={500} text="5万円の正解" size={84} bg={RED} color={WHITE} />
        <Badge name="tsumugi-wink" x={1066} y={16} size={180} bg="#FDE68A" imgW={307} imgH={560} imgX={-70} imgY={-40} />
      </Frame>
    ),
  },
  // 6本目「何世代まで買っていい？」。型＝境界線（D）・✕と○の対比（E）
  //   数字: 「0:00 結論」最低ラインは iPhone 11 と SE 第2世代／「1:35 iOS 27で分かれるライン」X・XR は非対応、11・SE 第2世代・12 は対応
  "2026-10-26-how-old": {
    // D: 白の地・キャラなし。5台を並べて赤い線で分ける
    D: () => (
      <Frame bg={WHITE}>
        <div style={{ position: "absolute", left: 0, top: 362, width: 500, height: 358, display: "flex", background: "#FEE2E2" }} />
        <div style={{ position: "absolute", left: 500, top: 362, width: 780, height: 358, display: "flex", background: "#D1FAE5" }} />
        <T x={34} y={14}><Plain text="11より前は" size={132} color={BLACK} spacing={-5} /></T>
        <T x={30} y={146}><Outlined text="買うな" size={212} color={RED} inner={{ w: 0, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-8} /></T>
        <Tag x={760} y={34} text="中古iPhone" size={76} bg={BLACK} color={WHITE} />
        <T x={762} y={150}><Plain text="iOS 27が" size={88} color={BLACK} /></T>
        <T x={762} y={246}><Plain text="入らない" size={88} color={RED} /></T>
        {[{ x: 50, t: "X", ok: false }, { x: 270, t: "XR", ok: false }, { x: 570, t: "11", ok: true }, { x: 790, t: "SE2", ok: true }, { x: 1010, t: "12", ok: true }].map((p) => (
          <Device key={p.t} x={p.x} y={378} w={160} h={214} screen={p.ok ? MINT : PEACH} dim={!p.ok}>
            <Plain text={p.t} size={p.t.length > 2 ? 60 : 74} color={p.ok ? BLACK : WHITE} spacing={-2} />
          </Device>
        ))}
        <div style={{ position: "absolute", left: 493, top: 350, width: 14, height: 370, display: "flex", background: RED }} />
        <Cross x={40} y={612} size={84} />
        <T x={140} y={618}><Plain text="非対応" size={72} color={RED} /></T>
        <Maru x={560} y={612} size={84} />
        <T x={660} y={618}><Plain text="対応" size={72} color={GREEN} /></T>
      </Frame>
    ),
    // E: 赤と緑に割った暗い地・キャラなし。「XR ✕／11 ○」
    E: () => (
      <Frame bg="linear-gradient(98deg, #7F1D1D 0%, #3B0A0A 49.8%, #064E3B 50.2%, #022C22 100%)">
        <T x={44} y={10}><Outlined text="XR" size={280} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-8} /></T>
        <Cross x={440} y={60} size={180} />
        <Device x={60} y={296} w={190} h={300} screen={PEACH} dim />
        <T x={286} y={350}><Plain text="iOS 27" size={84} color={WHITE} /></T>
        <T x={286} y={446}><Plain text="非対応" size={96} color="#FCA5A5" /></T>
        <T x={690} y={10}><Outlined text="11" size={280} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-8} /></T>
        <Maru x={1050} y={60} size={180} />
        <Device x={700} y={296} w={190} h={300} screen={MINT} />
        <T x={926} y={350}><Plain text="iOS 27" size={84} color={WHITE} /></T>
        <T x={926} y={446}><Plain text="対応" size={96} color="#6EE7B7" /></T>
        <Tag x={300} y={612} text="中古の最低ライン" size={72} bg={YELLOW} color={BLACK} />
      </Frame>
    ),
  },
  // 7本目「買ってはいけない5つの条件」。型＝✕と○の対比（D）・✕と数の断定（E）
  //   数字: 「3:25 最安の1台に飛びつかない」13（128GB）いちばん安い1台 35,800円・電池80%未満／電池85%以上の1台 37,500円・+1,700円
  //         「1:30 電池80%未満は買わない」Apple の電池交換 13 は 15,600円
  "2026-10-27-dont-buy": {
    // D: 薄い赤と緑に割った明るい地・キャラなし。「80%未満 ✕／85%以上 ○／差は1,700円」
    D: () => (
      <Frame bg="linear-gradient(90deg, #FFE4E6 0%, #FFE4E6 50%, #D1FAE5 50%, #D1FAE5 100%)">
        <Device x={44} y={50} w={160} h={300} screen={PEACH}><Cell w={96} fill={0.2} color={RED} /></Device>
        <Cross x={14} y={14} size={110} />
        <T x={222} y={44}><Outlined text="80%" size={188} color={RED} outer={{ w: 6, c: WHITE }} spacing={-8} /></T>
        <T x={330} y={240}><Plain text="未満" size={112} color={BLACK} /></T>
        <Device x={664} y={50} w={160} h={300} screen={MINT}><Cell w={96} fill={0.86} color={GREEN} /></Device>
        <Maru x={634} y={14} size={110} />
        <T x={842} y={44}><Outlined text="85%" size={188} color={GREEN} outer={{ w: 6, c: WHITE }} spacing={-8} /></T>
        <T x={950} y={240}><Plain text="以上" size={112} color={BLACK} /></T>
        <div style={{ position: "absolute", left: 210, top: 392, display: "flex", alignItems: "flex-end", height: 176, padding: "0 44px 14px", borderRadius: 30, background: BLACK, boxShadow: "8px 8px 0 rgba(0,0,0,0.25)" }}>
          <div style={{ display: "flex", marginBottom: 12, marginRight: 12 }}><Plain text="差は" size={100} color={WHITE} /></div>
          <Plain text="1,700円" size={150} color={YELLOW} spacing={-5} />
        </div>
        <T x={40} y={608}><Plain text="iPhone 13の安い1台どうし" size={72} color={BLACK} /></T>
      </Frame>
    ),
    // E: 黒の地・ずんだもんは丸い枠で小さく。「電池80%未満／買うな／交換すると15,600円」
    E: () => (
      <Frame bg={`radial-gradient(circle at 15% 60%, #7F1D1D 0%, ${BLACK} 55%)`}>
        <Device x={50} y={90} w={230} h={420} screen={PEACH} dim rotate={-6}><Cell w={140} fill={0.18} color={RED} /></Device>
        <Cross x={56} y={30} size={150} />
        <T x={336} y={26}><Plain text="電池" size={116} color={WHITE} /></T>
        <T x={580} y={10}><Outlined text="80%未満" size={156} color={YELLOW} outer={{ w: 6, c: BLACK }} spacing={-6} /></T>
        <T x={330} y={180}><Outlined text="買うな" size={290} color={WHITE} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-10} /></T>
        <Tag x={340} y={492} text="交換すると15,600円" size={80} bg={YELLOW} color={BLACK} />
        <Badge name="zundamon-shock" x={40} y={500} size={200} bg="#14532D" imgW={292} imgH={520} imgX={-52} imgY={-62} />
      </Frame>
    ),
  },
};

(async () => {
  const only = process.argv[2]?.replace(/\\/g, "/").split("/").filter(Boolean).pop();
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  for (const [key, plan] of Object.entries(PLANS)) {
    if (only && only !== key) continue;
    for (const v of ["D", "E"] as const) {
      const res = new ImageResponse(<>{plan[v]()}</>, { width: W, height: H, fonts });
      writeFileSync(join(__dirname, key, `thumb-${v}.png`), Buffer.from(await res.arrayBuffer()));
    }
    console.log(`D・E → longform/${key}`);
  }
})();
