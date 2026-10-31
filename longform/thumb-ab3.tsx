/**
 * 横動画のサムネ・第3弾（2026-10-26〜）。Studio の「テストと比較」の B・C 案（A は今の thumbnail.png）
 *   npx tsx longform/thumb-ab3.tsx            # 4本ぶん（下の PLANS）と一覧 longform/thumb-ab3-contact.png
 *   npx tsx longform/thumb-ab3.tsx set2       # 10/26 に足した2本（iPad・大きい画面）と一覧 longform/thumb-ab3-contact2.png
 *   npx tsx longform/thumb-ab3.tsx set3       # 10/27 に足した3本（電池・新型 iPad mini・楽天モバイル）と一覧 longform/thumb-ab3-contact3.png
 *   npx tsx longform/thumb-ab3.tsx set4       # 10/28: 13本目（新型 MBP）と、楽天モバイルの B を楽天のピンクに。一覧 longform/thumb-ab3-contact4.png
 *   npx tsx longform/thumb-ab3.tsx set5       # 10/29: 14本目（MBP 4択・A も作り直し）・15本目（Pro と Air）。一覧 longform/thumb-ab3-contact5.png
 *   npx tsx longform/thumb-ab3.tsx set6       # 10/31: 16〜20本目（予算別 MacBook・128GB・Duo か大きい画面・M1 Air・折りたたみ）。一覧 longform/thumb-ab3-contact6.png
 *   npx tsx longform/thumb-ab3.tsx <フォルダ> # 1本だけ
 * 出力: <フォルダ>/thumb-B.png・thumb-C.png（1280x720）。A がある案は thumb-A.png も
 *
 * 10/26 に「中古iPhone おすすめ／買ってはいけない／どこで買う／何世代」「iPhone Pro 無印 どっち」の検索結果（ログアウト）を見て決めた:
 * - B＝色帯の段（黒・赤・黄）＋端末の絵に ✓／✕（「やめとけ5台／正解3台」型。25.6万回・14.9万回）。キャラなし
 *   Pro と無印は左右に割った VS 型（「17 vs 18 Pro」「8.5万円差！」型。32万回）
 * - C＝キャラの表情＋巨大な数字か命令形（「買うな！」「どれが得？」型）。A（紺の地・つむぎの普通の顔）と見た目を大きく変える
 * - 写真・ロゴは使わない（端末は絵。カメラやロゴを描かない）。立ち絵は つむぎ・ずんだもん（README の「立ち絵」）
 * - 文字は 168x94（スマホの関連動画の枠）で読める大きさ: いちばん言いたい語は 180px 以上、補足も 70px 以上
 * - 右下（再生時間の表示）は x1030〜・y600〜 に何も置かない
 * - 数字は各フォルダの script.md・data.json にあるものだけ
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { SITE } from "@/lib/brandColors";

const W = 1280, H = 720;
const RED = SITE.price, NAVY = SITE.brand900, GREEN = SITE.safe, YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";

const b64 = (p: string) => readFileSync(p).toString("base64");
const chara = (name: string, style: Record<string, unknown>) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`data:image/png;base64,${b64(join(__dirname, "assets/chara/expr", `${name}.png`))}`} style={{ position: "absolute", ...style }} />
);

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
const em = (t: string) => Array.from(t).reduce((w, c) => w + (c === " " ? 0.3 : c.charCodeAt(0) > 0x2e80 ? 1 : 0.6), 0);
const fit = (t: string, width: number, max: number) => Math.min(max, Math.floor(width / em(t)));

const Bubble = ({ text, size, style }: { text: string; size: number; style: Record<string, unknown> }) => (
  <div style={{ position: "absolute", display: "flex", flexDirection: "column", padding: "12px 26px", borderRadius: 36, background: WHITE, border: `7px solid ${BLACK}`, ...style }}>
    {text.split("\n").map((l) => <div key={l} style={{ display: "flex", fontSize: size, fontWeight: 900, color: BLACK, lineHeight: 1.12, whiteSpace: "nowrap" }}>{l}</div>)}
  </div>
);

/** ✓（緑の丸）と ✕（赤の丸）。文字ではなく図形で描く（フォントに頼らない） */
const Mark = ({ ok, size, style }: { ok: boolean; size: number; style: Record<string, unknown> }) => (
  <div style={{ position: "absolute", display: "flex", width: size, height: size, borderRadius: size, background: ok ? GREEN : RED, border: `${Math.round(size * 0.08)}px solid ${WHITE}`, boxShadow: "0 6px 16px rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", ...style }}>
    {ok ? (
      <div style={{ display: "flex", width: size * 0.5, height: size * 0.26, marginTop: -size * 0.1, borderLeft: `${size * 0.13}px solid ${WHITE}`, borderBottom: `${size * 0.13}px solid ${WHITE}`, transform: "rotate(-45deg)" }} />
    ) : (
      <div style={{ display: "flex", position: "relative", width: size * 0.56, height: size * 0.56 }}>
        <div style={{ position: "absolute", left: 0, top: size * 0.215, width: size * 0.56, height: size * 0.13, background: WHITE, borderRadius: 6, transform: "rotate(45deg)" }} />
        <div style={{ position: "absolute", left: 0, top: size * 0.215, width: size * 0.56, height: size * 0.13, background: WHITE, borderRadius: 6, transform: "rotate(-45deg)" }} />
      </div>
    )}
  </div>
);

/** 端末の絵（前面・ロゴなし）。dim で色を落とす（✕ の側） */
function Phone({ w, h, screen, dim, bare, style }: { w: number; h: number; screen: [string, string]; dim?: boolean; bare?: boolean; style?: Record<string, unknown> }) {
  return (
    <div style={{ display: "flex", width: w, height: h, borderRadius: w * 0.16, background: "#1F2937", padding: w * 0.05, border: `${Math.max(3, Math.round(w * 0.025))}px solid #9CA3AF`, boxShadow: "0 16px 36px rgba(0,0,0,0.4)", ...style }}>
      <div style={{ display: "flex", flexGrow: 1, borderRadius: w * 0.11, background: dim ? "linear-gradient(160deg, #6B7280, #374151)" : `linear-gradient(160deg, ${screen[0]}, ${screen[1]})`, justifyContent: "center" }}>
        {!bare && <div style={{ display: "flex", width: w * 0.3, height: w * 0.085, marginTop: w * 0.05, borderRadius: 99, background: "#111827" }} />}
      </div>
    </div>
  );
}

/** ノートパソコンの絵（画面＋本体。ロゴなし） */
function Laptop({ w, screen, style }: { w: number; screen: [string, string]; style?: Record<string, unknown> }) {
  const h = Math.round(w * 0.62);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", ...style }}>
      <div style={{ display: "flex", width: w, height: h, borderRadius: w * 0.04, background: "#1F2937", padding: w * 0.035, border: `${Math.max(3, Math.round(w * 0.015))}px solid #9CA3AF`, boxShadow: "0 16px 36px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", flexGrow: 1, borderRadius: w * 0.02, background: `linear-gradient(160deg, ${screen[0]}, ${screen[1]})` }} />
      </div>
      <div style={{ display: "flex", width: w * 1.16, height: w * 0.05, borderRadius: `0 0 ${w * 0.03}px ${w * 0.03}px`, background: "linear-gradient(180deg, #D1D5DB, #9CA3AF)", boxShadow: "0 10px 20px rgba(0,0,0,0.35)" }} />
    </div>
  );
}

/** 電池の絵（%の代わりに文字を入れる） */
const Battery = ({ w, label, style }: { w: number; label: string; style: Record<string, unknown> }) => (
  <div style={{ position: "absolute", display: "flex", alignItems: "center", ...style }}>
    <div style={{ display: "flex", width: w, height: w * 0.46, borderRadius: w * 0.08, border: `${w * 0.05}px solid ${WHITE}`, background: BLACK, padding: w * 0.03, boxShadow: "0 8px 20px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", width: "12%", height: "100%", borderRadius: w * 0.04, background: RED }} />
      <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center", fontSize: w * 0.17, fontWeight: 900, color: WHITE, whiteSpace: "nowrap" }}>{label}</div>
    </div>
    <div style={{ display: "flex", width: w * 0.06, height: w * 0.18, marginLeft: 2, borderRadius: 4, background: WHITE }} />
  </div>
);

type Band = { text: string; bg: string; color: string; size: number };
/** 色帯の段（左寄せ・帯の幅は文字に合わせる） */
const Bands = ({ bands, left = 0, top = 24, gap = 14 }: { bands: Band[]; left?: number; top?: number; gap?: number }) => (
  <div style={{ position: "absolute", left, top, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
    {bands.map((b, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", height: Math.round(b.size * 1.2), padding: "0 30px 0 34px", marginBottom: gap, background: b.bg, boxShadow: "8px 8px 0 rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", fontSize: b.size, fontWeight: 900, color: b.color, letterSpacing: -6, lineHeight: 1, whiteSpace: "nowrap" }}>{b.text}</div>
      </div>
    ))}
  </div>
);

/** 端末＋上の札＋✓／✕（B の右側に並べる） */
const Labeled = ({ x, y, w, h, label, ok, screen, labelSize = 64, bare }: { x: number; y: number; w: number; h: number; label: string; ok: boolean; screen: [string, string]; labelSize?: number; bare?: boolean }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", flexDirection: "column", alignItems: "center", width: w + 40 }}>
    <div style={{ display: "flex", padding: "0 14px", marginBottom: 8, background: ok ? WHITE : "#D1D5DB", color: BLACK, fontSize: labelSize, fontWeight: 900, lineHeight: 1.15, letterSpacing: -2, whiteSpace: "nowrap" }}>{label}</div>
    <Phone w={w} h={h} screen={screen} dim={!ok} bare={bare} />
    <Mark ok={ok} size={Math.round(Math.min(w, h) * 0.95)} style={{ left: 20 + w * 0.025, top: labelSize * 1.15 + 8 + h * 0.5 - w * 0.47 }} />
  </div>
);

const SCREENS: [string, string][] = [["#C7D2FE", "#F0ABFC"], ["#BAE6FD", "#A7F3D0"], ["#FECACA", "#FDE68A"], ["#E9D5FF", "#93C5FD"]];
const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);
const YELLOW_BG = `radial-gradient(circle at 65% 45%, #FFF7AE 0%, ${YELLOW} 45%, #F59E0B 100%)`;
/** 楽天モバイルの回だけ（広告の回の色。ショートの rakutenmobile と同じピンク） */
const PINK = "#D9005B";
const DARKRED_BG = "radial-gradient(circle at 70% 40%, #8B1A1A 0%, #2A0A0A 70%)";

/** A は省略可（省略すると今の thumbnail.png が A）。A を作るときは thumb-A.png に書き出し、Studio のサムネもそれに替える */
type Plan = { id: string; A?: () => ReactNode; B: () => ReactNode; C: () => ReactNode };

// 数字の出どころ（script.md）は各案の上に書く
const PLANS: Record<string, Plan> = {
  // 4本目 P78xAKBa274。A＝色帯「中古iPhone／どこで買う？／1.6万円差」＋写真＋つむぎ
  "2026-10-24-where-to-buy": {
    id: "P78xAKBa274",
    // B: 同じ機種を2台並べて値札（「4:00 人気4機種」: iPhone 16 128GB の最安 93,980円・安い順の5位との差 15,820円）
    B: () => (
      <Frame bg={`linear-gradient(180deg, ${WHITE} 0%, #E5E7EB 100%)`}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 170, display: "flex", alignItems: "center", paddingLeft: 36, background: BLACK }}>
          <Outlined text="中古iPhone どこで買う？" size={fit("中古iPhone どこで買う？", 1180, 118)} color={YELLOW} spacing={-6} />
        </div>
        <div style={{ position: "absolute", left: 40, top: 196, display: "flex", fontSize: 66, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>同じiPhone 16でも…</div>
        {[{ x: 60, tag: "1位の店", ok: true }, { x: 330, tag: "5位の店", ok: false }].map((p, i) => (
          <div key={i} style={{ position: "absolute", left: p.x, top: 290, display: "flex", flexDirection: "column", alignItems: "center", width: 230 }}>
            <Phone w={170} h={300} screen={SCREENS[1]} dim={!p.ok} />
            <div style={{ display: "flex", marginTop: 12, padding: "2px 16px", background: p.ok ? RED : "#4B5563", color: WHITE, fontSize: 56, fontWeight: 900, whiteSpace: "nowrap" }}>{p.tag}</div>
          </div>
        ))}
        <div style={{ position: "absolute", left: 570, top: 260, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="1.6万円" size={fit("1.6万円", 670, 210)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-10} />
          <div style={{ display: "flex", marginTop: 6 }}><Outlined text="違う！" size={150} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} /></div>
        </div>
      </Frame>
    ),
    // C: 驚くずんだもん＋「最安の店は機種で変わる」（「0:00 結論」: どの機種でも最安という店はない・16店）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-surprised", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 76, fontWeight: 900, letterSpacing: -2 }}>中古iPhone 16店で比較</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="最安の店は" size={140} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="機種で" size={170} color={RED} inner={{ w: 9, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
          <div style={{ display: "flex", marginTop: 8 }}><Outlined text="変わる!?" size={170} color={RED} inner={{ w: 9, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
        </div>
        <Bubble text={"1店で\n決めちゃ\nダメなのだ"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 5本目 Bmp5EgeiqW0。A＝紺の地「中古iPhone Proと無印どっち？／差は最大4.3万円」＋つむぎ
  "2026-10-25-pro-or-standard": {
    id: "Bmp5EgeiqW0",
    // B: 左右に割った VS（「1:40」: 17 と 17 Pro 256GB の相場の差 4.3万円＝最大）
    B: () => (
      <Frame bg={`linear-gradient(100deg, ${NAVY} 0%, ${NAVY} 50%, #E5E7EB 50%, #F8FAFC 100%)`}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 150, display: "flex", alignItems: "center", justifyContent: "center", background: BLACK }}>
          <Outlined text="中古iPhone どっち買う？" size={112} color={WHITE} spacing={-6} />
        </div>
        <div style={{ position: "absolute", left: 60, top: 175, display: "flex" }}><Outlined text="Pro" size={170} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-6} /></div>
        <Phone w={150} h={270} screen={["#312E81", "#A78BFA"]} style={{ position: "absolute", left: 400, top: 190 }} />
        <div style={{ position: "absolute", left: 700, top: 175, display: "flex" }}><Outlined text="無印" size={170} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} /></div>
        <Phone w={150} h={270} screen={SCREENS[1]} style={{ position: "absolute", left: 1070, top: 190 }} />
        <div style={{ position: "absolute", left: 560, top: 250, display: "flex", width: 160, height: 160, borderRadius: 160, background: RED, border: `8px solid ${WHITE}`, alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 84, fontWeight: 900, fontStyle: "italic" }}>VS</div>
        <div style={{ position: "absolute", left: 0, top: 486, height: 200, display: "flex", alignItems: "center", padding: "0 30px 0 36px", background: YELLOW, boxShadow: "8px 8px 0 rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", fontSize: 100, fontWeight: 900, color: BLACK, letterSpacing: -4, marginRight: 8 }}>差は最大</div>
          <Outlined text="4.3万円" size={170} color={RED} inner={{ w: 7, c: WHITE }} outer={{ w: 5, c: BLACK }} spacing={-8} />
        </div>
      </Frame>
    ),
    // C: 「13 Pro と 14 は 180円差」（「0:00」「5:10」: 128GB の相場 13 Pro 65,980円・14 65,800円）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-surprised", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 76, fontWeight: 900, letterSpacing: -2 }}>中古iPhone 相場</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="13 Proと14" size={150} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="差180円!?" size={fit("差180円!?", 800, 196)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-10} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 505, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 74, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>Proがほぼ同じ値段</div>
        <Bubble text={"Proのほうが\nお得なのだ!?"} size={50} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 6本目 T7ltgSB-4XM（「中古iPhone 何世代」の検索で1位・10/26）。A＝紺の地「何世代まで買っていい？／最低ラインは iPhone 11」
  "2026-10-26-how-old": {
    id: "T7ltgSB-4XM",
    // B: 色帯＋端末の絵に ✓✕（「1:35」: iOS 27 は 11・SE 第2世代以降が対応、X・XR は非対応）
    B: () => (
      <Frame bg={`linear-gradient(135deg, #1F2937 0%, ${BLACK} 70%)`}>
        <Bands bands={[{ text: "中古iPhone", bg: WHITE, color: BLACK, size: 100 }, { text: "何世代まで？", bg: RED, color: WHITE, size: 104 }, { text: "11まで", bg: YELLOW, color: BLACK, size: 196 }]} />
        <Labeled x={780} y={14} w={130} h={200} label="XR" ok={false} screen={SCREENS[2]} />
        <Labeled x={1010} y={14} w={130} h={200} label="X" ok={false} screen={SCREENS[3]} />
        <Labeled x={780} y={300} w={130} h={200} label="11" ok screen={SCREENS[0]} />
        <Labeled x={1010} y={300} w={130} h={200} label="SE2" ok screen={SCREENS[1]} />
        <div style={{ position: "absolute", left: 34, top: 560, display: "flex", fontSize: 66, fontWeight: 900, color: WHITE, letterSpacing: -2 }}>iOS 27 が入る最低ライン</div>
      </Frame>
    ),
    // C: 青ざめたずんだもん＋「XRは買うな」（「0:00」: XR は iOS 27 非対応・SE 第2世代と 64GB の相場 1,100円差）
    C: () => (
      <Frame bg={DARKRED_BG}>
        {chara("zundamon-shock", { left: 860, top: 140, height: 640 })}
        <div style={{ position: "absolute", left: 40, top: 30, display: "flex" }}><Outlined text="中古iPhone 何世代まで？" size={90} color={WHITE} outer={{ w: 7, c: BLACK }} spacing={-4} /></div>
        <div style={{ position: "absolute", left: 30, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="XRは" size={200} color={YELLOW} inner={{ w: 9, c: BLACK }} outer={{ w: 7, c: WHITE }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 6 }}><Outlined text="買うな" size={250} color={WHITE} inner={{ w: 10, c: RED }} outer={{ w: 9, c: BLACK }} spacing={-10} /></div>
        </div>
        <div style={{ position: "absolute", left: 40, top: 590, display: "flex", padding: "2px 22px", background: YELLOW, color: BLACK, fontSize: 72, fontWeight: 900, letterSpacing: -2 }}>iOS 27 非対応</div>
      </Frame>
    ),
  },
  // 7本目 amx5UxG6wpI。A＝紺の地「中古iPhone 買ってはいけない／検品担当が選んだ 5 つ」
  "2026-10-27-dont-buy": {
    id: "amx5UxG6wpI",
    // B: 色帯＋✕ の端末と電池（「0:00」: 5つの条件の1つ目が 電池80%未満）
    B: () => (
      <Frame bg={`linear-gradient(135deg, #1F2937 0%, ${BLACK} 70%)`}>
        <Bands bands={[{ text: "中古iPhone", bg: WHITE, color: BLACK, size: 116 }, { text: "買っちゃダメ", bg: RED, color: WHITE, size: 130 }, { text: "5つの条件", bg: YELLOW, color: BLACK, size: 160 }]} />
        <Phone w={220} h={390} screen={SCREENS[0]} dim style={{ position: "absolute", left: 930, top: 40, transform: "rotate(8deg)" }} />
        <Mark ok={false} size={220} style={{ left: 930, top: 120 }} />
        <Battery w={340} label="80%未満" style={{ left: 850, top: 430 }} />
        <div style={{ position: "absolute", left: 34, top: 560, display: "flex", fontSize: 70, fontWeight: 900, color: WHITE, letterSpacing: -2 }}>検品担当が選んだ</div>
      </Frame>
    ),
    // C: 青ざめたずんだもん＋「最安値に飛びつくな」（「3:25」: iPhone 13 128GB のいちばん安い1台は電池80%未満・+1,700円で85%以上）
    C: () => (
      <Frame bg={DARKRED_BG}>
        {chara("zundamon-shock", { left: 860, top: 140, height: 640 })}
        <div style={{ position: "absolute", left: 40, top: 30, display: "flex" }}><Outlined text="中古iPhone" size={100} color={WHITE} outer={{ w: 7, c: BLACK }} spacing={-4} /></div>
        <div style={{ position: "absolute", left: 30, top: 160, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="最安値に" size={180} color={YELLOW} inner={{ w: 9, c: BLACK }} outer={{ w: 7, c: WHITE }} spacing={-8} />
          <div style={{ display: "flex", marginTop: 10 }}><Outlined text="飛びつくな" size={180} color={WHITE} inner={{ w: 10, c: RED }} outer={{ w: 9, c: BLACK }} spacing={-10} /></div>
        </div>
        <div style={{ position: "absolute", left: 40, top: 560, display: "flex", padding: "2px 22px", background: YELLOW, color: BLACK, fontSize: 64, fontWeight: 900, letterSpacing: -2 }}>13の最安は電池80%未満</div>
      </Frame>
    ),
  },
  // 3本目 SHyQRQ8wAic。A＝紺の地「中古iPad／使い方で選ぶ正解」＋「7万円→Air 第5世代」＋つむぎ
  "2026-10-23-ipad-dore": {
    id: "SHyQRQ8wAic",
    // B: 色帯＋✕／✓ の iPad（「1:30」: 第8世代 32GB 25,916円は iPadOS 27 非対応・「2:40」: 第9世代 64GB 43,670円）
    B: () => (
      <Frame bg={`linear-gradient(135deg, #1F2937 0%, ${BLACK} 70%)`}>
        <Bands bands={[{ text: "中古iPad", bg: WHITE, color: BLACK, size: 116 }, { text: "第8世代は", bg: RED, color: WHITE, size: 130 }, { text: "買っちゃダメ", bg: YELLOW, color: BLACK, size: 136 }]} />
        <Labeled x={850} y={20} w={150} h={210} label="第8" ok={false} screen={SCREENS[2]} bare />
        <Labeled x={1060} y={20} w={150} h={210} label="第9" ok screen={SCREENS[0]} bare />
        {[{ x: 850, t: "2.6万円", bg: "#4B5563" }, { x: 1060, t: "4.4万円", bg: RED }].map((p) => (
          <div key={p.t} style={{ position: "absolute", left: p.x, top: 330, width: 190, display: "flex", justifyContent: "center" }}>
            <div style={{ display: "flex", padding: "0 12px", background: p.bg, color: WHITE, fontSize: 52, fontWeight: 900, letterSpacing: -2, whiteSpace: "nowrap" }}>{p.t}</div>
          </div>
        ))}
        <div style={{ position: "absolute", left: 34, top: 560, display: "flex", fontSize: 70, fontWeight: 900, color: WHITE, letterSpacing: -2 }}>iPadOS 27 非対応</div>
      </Frame>
    ),
    // C: 驚くずんだもん＋「Proが10万以下!?」（「0:00」「6:40」: Pro 11インチ 第3世代 128GB 98,532円）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-surprised", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 76, fontWeight: 900, letterSpacing: -2 }}>中古iPad 16店の相場</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="iPad Proが" size={150} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="10万以下!?" size={fit("10万以下!?", 800, 196)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-10} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 490, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 70, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>Pro 第3世代 9.9万円</div>
        <Bubble text={"Proも\n買えるのだ!?"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 8本目（未公開）。A＝紺の地「中古iPhone／大きい画面ならどれ？」＋「Plus・Air・Pro Max」＋つむぎ
  "2026-10-28-big-screen": {
    id: "未公開",
    // B: 色帯＋Plus と Pro Max の絵（「3:20」: 同じ容量で Pro Max は Plus より +31,939〜33,841円・「4:00」: Pro Max で増えるのは 120Hz と望遠）
    B: () => (
      <Frame bg={`linear-gradient(135deg, #1F2937 0%, ${BLACK} 70%)`}>
        <Bands bands={[{ text: "中古iPhone", bg: WHITE, color: BLACK, size: 100 }, { text: "Plus→Pro Max", bg: RED, color: WHITE, size: 104 }, { text: "3万円差", bg: YELLOW, color: BLACK, size: 196 }]} />
        {[{ x: 820, w: 160, h: 290, label: "Plus", s: SCREENS[1] }, { x: 1030, w: 180, h: 330, label: "Pro Max", s: ["#312E81", "#A78BFA"] as [string, string] }].map((p) => (
          <div key={p.label} style={{ position: "absolute", left: p.x, top: 24, display: "flex", flexDirection: "column", alignItems: "center", width: p.w + 40 }}>
            <div style={{ display: "flex", padding: "0 12px", marginBottom: 10, background: WHITE, color: BLACK, fontSize: 52, fontWeight: 900, lineHeight: 1.15, letterSpacing: -2, whiteSpace: "nowrap" }}>{p.label}</div>
            <Phone w={p.w} h={p.h} screen={p.s} />
          </div>
        ))}
        {["120Hz", "望遠"].map((t, i) => (
          <div key={t} style={{ position: "absolute", left: 1040, top: 455 + i * 66, display: "flex", alignItems: "center" }}>
            <Mark ok size={54} style={{ position: "relative" }} />
            <div style={{ display: "flex", marginLeft: 10, fontSize: 50, fontWeight: 900, color: WHITE, letterSpacing: -1 }}>{t}</div>
          </div>
        ))}
        <div style={{ position: "absolute", left: 34, top: 560, display: "flex", fontSize: 66, fontWeight: 900, color: WHITE, letterSpacing: -2 }}>14〜16 同じ容量どうし</div>
      </Frame>
    ),
    // C: 驚くずんだもん＋「Airのほうが安い!?」（「0:00」「4:40」: 256GB で Air 142,681円・16 Plus 151,200円＝8,519円安い）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-surprised", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 68, fontWeight: 900, letterSpacing: -2 }}>大きい画面の中古iPhone</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="Airのほうが" size={140} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="安い!?" size={220} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-10} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 490, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 64, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>16 Plusより8,519円安い</div>
        <Bubble text={"新しいのに\n安いのだ!?"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 10本目 GcXIO15l6fU。A＝「中古iPhoneのバッテリー／何%なら買っていい？」＋「答えは 85%」
  "2026-10-29-battery": {
    id: "GcXIO15l6fU",
    // B: 色帯＋電池の絵 2つ（「0:00」: 85%以上なら買っていい・80〜84%と85〜89%の相場の差は8機種で最大 5,312円）
    B: () => (
      <Frame bg={`linear-gradient(135deg, #1F2937 0%, ${BLACK} 70%)`}>
        <Bands bands={[{ text: "中古iPhone", bg: WHITE, color: BLACK, size: 100 }, { text: "電池は何%？", bg: RED, color: WHITE, size: 112 }, { text: "85%以上", bg: YELLOW, color: BLACK, size: 180 }]} />
        <Mark ok size={110} style={{ left: 720, top: 75 }} />
        <Battery w={380} label="85%以上" style={{ left: 840, top: 60 }} />
        <Battery w={380} label="80%台前半" style={{ left: 840, top: 300 }} />
        <div style={{ position: "absolute", left: 34, top: 560, display: "flex", fontSize: 66, fontWeight: 900, color: WHITE, letterSpacing: -2 }}>相場の差は最大5,312円</div>
      </Frame>
    ),
    // C: 驚くずんだもん＋「100%にこだわるな」（「0:00」: 85%以上なら買っていい・100%は、いちばん高いとは限らない）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-surprised", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 76, fontWeight: 900, letterSpacing: -2 }}>中古iPhoneの電池</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="100%に" size={170} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="こだわるな" size={fit("こだわるな", 800, 170)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-10} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 505, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 74, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>85%以上で十分</div>
        <Bubble text={"100%が\nいいのだ!?"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 12本目 N2slZY_hJ9s。A＝「新型iPad mini／中古の旧型にする？」＋「差 3.6万円」
  "2026-10-30-ipad-mini": {
    id: "N2slZY_hJ9s",
    // B: 左右に割った VS（「0:00」: 新型 128GB 119,800円・中古の A17 Pro 128GB の相場 83,800円・差 36,000円）
    B: () => (
      <Frame bg={`linear-gradient(100deg, ${NAVY} 0%, ${NAVY} 50%, #E5E7EB 50%, #F8FAFC 100%)`}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 150, display: "flex", alignItems: "center", justifyContent: "center", background: BLACK }}>
          <Outlined text="iPad mini どっち買う？" size={112} color={WHITE} spacing={-6} />
        </div>
        <div style={{ position: "absolute", left: 50, top: 175, display: "flex" }}><Outlined text="新型" size={170} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-6} /></div>
        <Phone w={190} h={270} screen={["#312E81", "#A78BFA"]} bare style={{ position: "absolute", left: 360, top: 190 }} />
        <div style={{ position: "absolute", left: 700, top: 175, display: "flex" }}><Outlined text="中古" size={170} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} /></div>
        <Phone w={190} h={270} screen={SCREENS[1]} bare style={{ position: "absolute", left: 1030, top: 190 }} />
        <div style={{ position: "absolute", left: 560, top: 250, display: "flex", width: 160, height: 160, borderRadius: 160, background: RED, border: `8px solid ${WHITE}`, alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 84, fontWeight: 900, fontStyle: "italic" }}>VS</div>
        <div style={{ position: "absolute", left: 0, top: 486, height: 200, display: "flex", alignItems: "center", padding: "0 30px 0 36px", background: YELLOW, boxShadow: "8px 8px 0 rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", fontSize: 100, fontWeight: 900, color: BLACK, letterSpacing: -4, marginRight: 8 }}>差は</div>
          <Outlined text="3.6万円" size={170} color={RED} inner={{ w: 7, c: WHITE }} outer={{ w: 5, c: BLACK }} spacing={-8} />
        </div>
      </Frame>
    ),
    // C: 驚くずんだもん＋「旧型なら3.6万円安い!?」（「0:00」: 中古の A17 Pro 128GB の相場 83,800円）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-surprised", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 76, fontWeight: 900, letterSpacing: -2 }}>新型iPad mini 発表</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="旧型なら" size={150} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="3.6万円安い" size={fit("3.6万円安い", 800, 180)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-10} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 490, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 70, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>中古A17 Pro 8.4万円</div>
        <Bubble text={"新型を\n待つのだ!?"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 11本目 Ua3ZRui2G4w（広告の回）。A＝「中古iPhone＋楽天モバイル／2年でいくら？」＋「14＋20GB → 11.8万円」。B・C も「PR」を出す（楽天の指針）
  "2026-10-31-rakuten-mobile": {
    id: "Ua3ZRui2G4w",
    // B: 楽天のピンクの地＋端末（10/28 ユーザー「楽天ピンクも使ってみて」。前の B＝黒地の色帯はテストの結果が出る前に入れ替え）
    //   数字は「0:00」: 14 128GB の相場 65,980円＋20GBまでの料金2年 52,272円＝118,252円・月あたり約4,900円
    B: () => (
      <Frame bg={`radial-gradient(circle at 75% 40%, #F0457F 0%, ${PINK} 45%, #8C003A 100%)`}>
        <Bands bands={[{ text: "中古iPhone＋楽天モバイル", bg: WHITE, color: PINK, size: 80 }, { text: "2年でいくら？", bg: BLACK, color: WHITE, size: 112 }]} />
        <div style={{ position: "absolute", left: 34, top: 330, display: "flex", alignItems: "center", padding: "6px 34px", background: WHITE, borderRadius: 24, boxShadow: "10px 10px 0 rgba(0,0,0,0.3)" }}>
          <Outlined text="11.8万円" size={200} color={PINK} spacing={-10} />
        </div>
        <Labeled x={930} y={150} w={170} h={290} label="14" ok screen={["#FBCFE8", "#F9A8D4"]} />
        <div style={{ position: "absolute", left: 34, top: 600, display: "flex", fontSize: 62, fontWeight: 900, color: WHITE, letterSpacing: -2 }}>20GBまで・月あたり約4,900円</div>
        <div style={{ position: "absolute", left: 1150, top: 20, display: "flex", padding: "0 14px", background: WHITE, color: BLACK, fontSize: 48, fontWeight: 900 }}>PR</div>
      </Frame>
    ),
    // C: 驚くずんだもん＋「2年で11.8万円」（「0:00」: 端末の相場と料金、ぜんぶ込み）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-surprised", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 68, fontWeight: 900, letterSpacing: -2 }}>中古iPhone＋楽天モバイル</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="2年で" size={150} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="11.8万円" size={fit("11.8万円", 800, 200)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-10} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 490, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 70, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>14＋20GBまで</div>
        <Bubble text={"端末込み\nなのだ!?"} size={52} style={{ left: 20, top: 20 }} />
        <div style={{ position: "absolute", left: 1150, top: 120, display: "flex", padding: "0 14px", background: BLACK, color: WHITE, fontSize: 48, fontWeight: 900 }}>PR</div>
      </Frame>
    ),
  },
  // 13本目 iAzTGx6wsTs（10/28 公開）。A＝「新型MacBook Pro／中古にする？／差 7.9万円」＋つむぎ
  "2026-10-29-mbp-m6": {
    id: "iAzTGx6wsTs",
    // B: 左右に割った VS（「0:00」: 新型 M6 16GB・1TB 339,800円・中古の M4 同じ構成の相場 260,980円・差 78,820円）
    B: () => (
      <Frame bg={`linear-gradient(100deg, ${NAVY} 0%, ${NAVY} 50%, #E5E7EB 50%, #F8FAFC 100%)`}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 150, display: "flex", alignItems: "center", justifyContent: "center", background: BLACK }}>
          <Outlined text="MacBook Pro どっち？" size={112} color={WHITE} spacing={-6} />
        </div>
        <div style={{ position: "absolute", left: 40, top: 165, display: "flex" }}><Outlined text="新型M6" size={130} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-6} /></div>
        <Laptop w={300} screen={["#312E81", "#A78BFA"]} style={{ position: "absolute", left: 90, top: 320 }} />
        <div style={{ position: "absolute", left: 700, top: 165, display: "flex" }}><Outlined text="中古M4" size={130} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} /></div>
        <Laptop w={300} screen={SCREENS[1]} style={{ position: "absolute", left: 830, top: 320 }} />
        <div style={{ position: "absolute", left: 560, top: 270, display: "flex", width: 160, height: 160, borderRadius: 160, background: RED, border: `8px solid ${WHITE}`, alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 84, fontWeight: 900, fontStyle: "italic" }}>VS</div>
        <div style={{ position: "absolute", left: 0, top: 540, height: 170, display: "flex", alignItems: "center", padding: "0 30px 0 36px", background: YELLOW, boxShadow: "8px 8px 0 rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", fontSize: 90, fontWeight: 900, color: BLACK, letterSpacing: -4, marginRight: 8 }}>差は</div>
          <Outlined text="7.9万円" size={150} color={RED} inner={{ w: 7, c: WHITE }} outer={{ w: 5, c: BLACK }} spacing={-8} />
        </div>
      </Frame>
    ),
    // C: 驚くずんだもん＋「中古M4なら7.9万円安い」（「0:00」: 同じ 16GB・1TB の相場 260,980円）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-surprised", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 70, fontWeight: 900, letterSpacing: -2 }}>新型MacBook Pro 発表</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="中古M4なら" size={140} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="7.9万円安い" size={fit("7.9万円安い", 800, 180)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-10} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 490, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 64, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>新型 33.98万円／中古 26.1万円</div>
        <Bubble text={"中古で\nいいのだ!?"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 14本目 goOpevlUKTw（10/29 公開）。前の A（紺の地「MacBook Pro どれ買う？ 4択」）は言葉が弱いので、ユーザーの指示で A も作り直し（PROLED・M6 を入れる。10/29）
  "2026-10-31-mbp-proled": {
    id: "goOpevlUKTw",
    // A: 左右に PROLED と M6（「0:00 結論」: どちらも 24GB・1TB で PROLED 499,800円・M6 375,800円）＋下に「今のモデル・中古も」
    A: () => (
      <Frame bg={`linear-gradient(100deg, #1E1B4B 0%, #1E1B4B 50%, ${NAVY} 50%, ${NAVY} 100%)`}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 150, display: "flex", alignItems: "center", justifyContent: "center", background: BLACK }}>
          <Outlined text="新型MacBook Pro どれ買う？" size={fit("新型MacBook Pro どれ買う？", 1200, 104)} color={WHITE} spacing={-5} />
        </div>
        <div style={{ position: "absolute", left: 30, top: 168, display: "flex" }}><Outlined text="PROLED" size={124} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-6} /></div>
        <Laptop w={280} screen={["#0B0B0F", "#7C3AED"]} style={{ position: "absolute", left: 90, top: 315 }} />
        <div style={{ position: "absolute", left: 790, top: 168, display: "flex" }}><Outlined text="M6" size={150} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-6} /></div>
        <Laptop w={280} screen={SCREENS[3]} style={{ position: "absolute", left: 790, top: 315 }} />
        <div style={{ position: "absolute", left: 560, top: 280, display: "flex", width: 160, height: 160, borderRadius: 160, background: RED, border: `8px solid ${WHITE}`, alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 84, fontWeight: 900, fontStyle: "italic" }}>VS</div>
        <div style={{ position: "absolute", left: 0, top: 560, height: 140, display: "flex", alignItems: "center", padding: "0 30px 0 36px", background: YELLOW, boxShadow: "8px 8px 0 rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 900, color: BLACK, letterSpacing: -4, marginRight: 10 }}>今のモデル・中古と</div>
          <Outlined text="4択" size={120} color={RED} inner={{ w: 6, c: WHITE }} outer={{ w: 5, c: BLACK }} spacing={-6} />
        </div>
      </Frame>
    ),
    // B: 色帯3段＋4台の値札（「0:00 結論」: 24GB・1TB で PROLED 499,800・今のミニLED 429,800・M6 375,800・中古 M5 Pro 相場 402,980）
    B: () => (
      <Frame bg={`linear-gradient(180deg, ${WHITE} 0%, #E5E7EB 100%)`}>
        <Bands top={40} bands={[
          { text: "新型PROLED", bg: BLACK, color: YELLOW, size: 112 },
          { text: "新型M6", bg: RED, color: WHITE, size: 120 },
          { text: "どれ買う？", bg: YELLOW, color: BLACK, size: 132 },
        ]} />
        {[
          { x: 720, y: 30, label: "PROLED", price: "49.98万", screen: ["#0B0B0F", "#7C3AED"] as [string, string] },
          { x: 990, y: 30, label: "今のモデル", price: "42.98万", screen: SCREENS[0] },
          { x: 720, y: 300, label: "M6", price: "37.58万", screen: SCREENS[3] },
          { x: 990, y: 300, label: "中古", price: "40.3万", screen: SCREENS[1] },
        ].map((p) => (
          <div key={p.label} style={{ position: "absolute", left: p.x, top: p.y, display: "flex", flexDirection: "column", alignItems: "center", width: 250 }}>
            <div style={{ display: "flex", padding: "0 12px", marginBottom: 8, background: BLACK, color: WHITE, fontSize: 44, fontWeight: 900, lineHeight: 1.2, whiteSpace: "nowrap" }}>{p.label}</div>
            <Laptop w={190} screen={p.screen} />
            <div style={{ display: "flex", marginTop: 6 }}><Outlined text={p.price} size={fit(p.price, 250, 64)} color={RED} inner={{ w: 5, c: WHITE }} spacing={-3} /></div>
          </div>
        ))}
        <div style={{ position: "absolute", left: 40, top: 600, display: "flex", fontSize: 46, fontWeight: 900, color: BLACK, letterSpacing: -1 }}>14インチ・24GB・1TBでそろえて</div>
      </Frame>
    ),
    // C: 驚くつむぎ＋「PROLED？M6？」（「1:14」: 同じ M5 Pro でタッチの PROLED は今のモデルより +70,000円）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("tsumugi-surprised", { left: -30, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 68, fontWeight: 900, letterSpacing: -2 }}>新型MacBook Pro 2機種</div>
        <div style={{ position: "absolute", left: 420, top: 140, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="PROLED？" size={fit("PROLED？", 820, 170)} color={RED} inner={{ w: 9, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} />
          <div style={{ display: "flex", marginTop: 10 }}><Outlined text="M6？" size={180} color={NAVY} inner={{ w: 9, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 500, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 60, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>タッチ対応で ＋7万円</div>
        <Bubble text={"どれが\n正解なの？"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 15本目 7NQettpZxHk（10/30 18:00 公開）。A＝紺の地「Pro と Air どっち？ 差 11.5万円」＋つむぎ
  "2026-11-01-mbp-vs-mba": {
    id: "7NQettpZxHk",
    // B: 左右に割った VS（「1:18」: 新品 Air 13インチ M5 224,800円・Pro 14インチ M6 339,800円・差 115,000円）
    B: () => (
      <Frame bg={`linear-gradient(100deg, ${NAVY} 0%, ${NAVY} 50%, #E5E7EB 50%, #F8FAFC 100%)`}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 150, display: "flex", alignItems: "center", justifyContent: "center", background: BLACK }}>
          <Outlined text="MacBook どっち買う？" size={112} color={WHITE} spacing={-6} />
        </div>
        <div style={{ position: "absolute", left: 120, top: 165, display: "flex" }}><Outlined text="Pro" size={150} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-6} /></div>
        <Laptop w={300} screen={["#312E81", "#A78BFA"]} style={{ position: "absolute", left: 90, top: 330 }} />
        <div style={{ position: "absolute", left: 860, top: 165, display: "flex" }}><Outlined text="Air" size={150} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} /></div>
        <Laptop w={280} screen={SCREENS[1]} style={{ position: "absolute", left: 840, top: 340 }} />
        <div style={{ position: "absolute", left: 560, top: 270, display: "flex", width: 160, height: 160, borderRadius: 160, background: RED, border: `8px solid ${WHITE}`, alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 84, fontWeight: 900, fontStyle: "italic" }}>VS</div>
        <div style={{ position: "absolute", left: 0, top: 545, height: 165, display: "flex", alignItems: "center", padding: "0 30px 0 36px", background: YELLOW, boxShadow: "8px 8px 0 rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 900, color: BLACK, letterSpacing: -4, marginRight: 8 }}>差は</div>
          <Outlined text="11.5万円" size={140} color={RED} inner={{ w: 7, c: WHITE }} outer={{ w: 5, c: BLACK }} spacing={-8} />
        </div>
      </Frame>
    ),
    // C: ショックのずんだもん＋「ほとんどの人はAirで十分」（「0:00 結論」: ネット・動画・書類なら Air）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-shock", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 70, fontWeight: 900, letterSpacing: -2 }}>MacBook Pro と Air</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="ほとんどの人は" size={110} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="Airで十分" size={fit("Airで十分", 800, 180)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-10} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 490, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 60, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>新品 Air 22.5万／Pro 34万</div>
        <Bubble text={"Proいらない\nのだ!?"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 16本目 0mnQbnBO_dE。A＝紺の地「中古MacBook いま買うならどれ？ 12万円→Neo」＋つむぎ
  "2026-11-02-macbook": {
    id: "0mnQbnBO_dE",
    // B: 色帯3段＋予算別の4台（「0:00 結論」: 10万 Pro 13インチ M1 8.8万・12万 Neo 11.7万・15万 Air M3 14.4万・20万 Air M4 17.7万）
    B: () => (
      <Frame bg={`linear-gradient(180deg, ${WHITE} 0%, #E5E7EB 100%)`}>
        <Bands top={40} bands={[
          { text: "中古MacBook", bg: BLACK, color: YELLOW, size: 112 },
          { text: "予算別", bg: RED, color: WHITE, size: 132 },
          { text: "4台の正解", bg: YELLOW, color: BLACK, size: 132 },
        ]} />
        {[
          { x: 720, y: 30, label: "10万円", name: "Pro M1", screen: ["#312E81", "#A78BFA"] as [string, string] },
          { x: 990, y: 30, label: "12万円", name: "Neo", screen: SCREENS[2] },
          { x: 720, y: 300, label: "15万円", name: "Air M3", screen: SCREENS[1] },
          { x: 990, y: 300, label: "20万円", name: "Air M4", screen: SCREENS[3] },
        ].map((p) => (
          <div key={p.label} style={{ position: "absolute", left: p.x, top: p.y, display: "flex", flexDirection: "column", alignItems: "center", width: 250 }}>
            <div style={{ display: "flex", padding: "0 12px", marginBottom: 8, background: RED, color: WHITE, fontSize: 48, fontWeight: 900, lineHeight: 1.2, whiteSpace: "nowrap" }}>{p.label}</div>
            <Laptop w={190} screen={p.screen} />
            <div style={{ display: "flex", marginTop: 6 }}><Outlined text={p.name} size={fit(p.name, 250, 60)} color={BLACK} inner={{ w: 5, c: WHITE }} spacing={-2} /></div>
          </div>
        ))}
        <div style={{ position: "absolute", left: 40, top: 600, display: "flex", fontSize: 46, fontWeight: 900, color: BLACK, letterSpacing: -1 }}>3店・1,990件の相場で選んだ</div>
      </Frame>
    ),
    // C: 驚くずんだもん＋「10万円でProが買える」（「1:43」: Pro 13インチ M1 512GB の相場 87,800円）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-surprised", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 76, fontWeight: 900, letterSpacing: -2 }}>中古MacBook 予算別</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="10万円で" size={150} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="Proが買える" size={fit("Proが買える", 820, 170)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 500, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 60, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>Pro 13インチ M1 8.8万円</div>
        <Bubble text={"Proなのに\n10万円以下!?"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 17本目 6xT8CuQi0J4（10/31 12:00 公開）。A＝紺の地「128GBで足りる？ 256GBとの差 6,200円」＋つむぎ
  "2026-11-02-storage": {
    id: "6xT8CuQi0J4",
    // B: 左右に割った VS（「0:00 結論」: 中古の 13 Pro は 128→256GB で +6,200円）
    B: () => (
      <Frame bg={`linear-gradient(100deg, ${NAVY} 0%, ${NAVY} 50%, #E5E7EB 50%, #F8FAFC 100%)`}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 150, display: "flex", alignItems: "center", justifyContent: "center", background: BLACK }}>
          <Outlined text="中古iPhone 容量どっち？" size={108} color={WHITE} spacing={-6} />
        </div>
        <div style={{ position: "absolute", left: 40, top: 180, display: "flex" }}><Outlined text="128GB" size={110} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-6} /></div>
        <Phone w={120} h={230} screen={SCREENS[0]} style={{ position: "absolute", left: 440, top: 200 }} />
        <div style={{ position: "absolute", left: 700, top: 180, display: "flex" }}><Outlined text="256GB" size={110} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} /></div>
        <Phone w={120} h={230} screen={SCREENS[1]} style={{ position: "absolute", left: 1110, top: 200 }} />
        <div style={{ position: "absolute", left: 560, top: 240, display: "flex", width: 160, height: 160, borderRadius: 160, background: RED, border: `8px solid ${WHITE}`, alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 84, fontWeight: 900, fontStyle: "italic" }}>VS</div>
        <div style={{ position: "absolute", left: 0, top: 470, height: 200, display: "flex", alignItems: "center", padding: "0 30px 0 36px", background: YELLOW, boxShadow: "8px 8px 0 rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 900, color: BLACK, letterSpacing: -4, marginRight: 8 }}>差はたった</div>
          <Outlined text="6,200円" size={150} color={RED} inner={{ w: 7, c: WHITE }} outer={{ w: 5, c: BLACK }} spacing={-8} />
        </div>
      </Frame>
    ),
    // C: 驚くずんだもん＋「迷ったら256GB」（「0:00 結論」: 10機種のうち8機種は +1万円未満）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-surprised", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 76, fontWeight: 900, letterSpacing: -2 }}>中古iPhone 10機種</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="迷ったら" size={150} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="256GB" size={fit("256GB", 820, 200)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 525, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 60, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>8機種は +1万円未満</div>
        <Bubble text={"倍なのに\n6,200円!?"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 18本目 Foz4YDEnV1U。A＝紺の地「大きい画面なら Duoでなくていい？ 16万〜28万円安い」＋つむぎ
  "2026-11-03-duo-vs-mini": {
    id: "Foz4YDEnV1U",
    // B: 左右に割った VS（「0:00 結論」: Duo 256GB 新品 364,800円・中古 15 Pro Max 256GB 146,980円・約21.8万円安い）
    B: () => (
      <Frame bg={`linear-gradient(100deg, ${NAVY} 0%, ${NAVY} 50%, #E5E7EB 50%, #F8FAFC 100%)`}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 150, display: "flex", alignItems: "center", justifyContent: "center", background: BLACK }}>
          <Outlined text="大きい画面 どっち買う？" size={108} color={WHITE} spacing={-6} />
        </div>
        <div style={{ position: "absolute", left: 50, top: 170, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="Duo" size={150} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 6, fontSize: 56, fontWeight: 900, color: WHITE }}>新品 36.5万</div>
        </div>
        <Phone w={190} h={190} screen={["#312E81", "#A78BFA"]} bare style={{ position: "absolute", left: 380, top: 200 }} />
        <div style={{ position: "absolute", left: 720, top: 170, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="Pro Max" size={92} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 6, fontSize: 56, fontWeight: 900, color: BLACK }}>中古 14.7万</div>
        </div>
        <Phone w={140} h={260} screen={SCREENS[1]} style={{ position: "absolute", left: 1110, top: 180 }} />
        <div style={{ position: "absolute", left: 590, top: 380, display: "flex", width: 140, height: 140, borderRadius: 140, background: RED, border: `8px solid ${WHITE}`, alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 72, fontWeight: 900, fontStyle: "italic" }}>VS</div>
        <div style={{ position: "absolute", left: 0, top: 535, height: 165, display: "flex", alignItems: "center", padding: "0 30px 0 36px", background: YELLOW, boxShadow: "8px 8px 0 rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 900, color: BLACK, letterSpacing: -4, marginRight: 8 }}>中古なら</div>
          <Outlined text="21.8万円" size={140} color={RED} inner={{ w: 7, c: WHITE }} outer={{ w: 5, c: BLACK }} spacing={-8} />
          <div style={{ display: "flex", fontSize: 84, fontWeight: 900, color: BLACK, letterSpacing: -4, marginLeft: 8 }}>安い</div>
        </div>
      </Frame>
    ),
    // C: 驚くつむぎ＋「Duoじゃなくていいかも」（「0:00 結論」: 家で読む・観るなら中古の iPad mini A17 Pro 83,980円）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("tsumugi-surprised", { left: -30, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 76, fontWeight: 900, letterSpacing: -2 }}>大きい画面がほしいだけ</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="Duoじゃなくて" size={fit("Duoじゃなくて", 820, 130)} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="いいかも" size={190} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 500, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 60, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>中古iPad mini 8.4万円</div>
        <Bubble text={"たたまなくて\nよくない？"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 19本目 lmlZcklod7E（11/1 18:00 公開予約）。A＝紺の地「M1 Air まだ使える？ 中古8.4万円」＋つむぎ
  "2026-11-03-m1-air": {
    id: "lmlZcklod7E",
    // B: 左右に割った VS（「0:00 結論」: 8GB・256GB で M1 Air 83,980円・M2 Air 111,980円・差 28,000円）
    B: () => (
      <Frame bg={`linear-gradient(100deg, ${NAVY} 0%, ${NAVY} 50%, #E5E7EB 50%, #F8FAFC 100%)`}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 150, display: "flex", alignItems: "center", justifyContent: "center", background: BLACK }}>
          <Outlined text="中古MacBook Air どっち？" size={100} color={WHITE} spacing={-6} />
        </div>
        <div style={{ position: "absolute", left: 60, top: 165, display: "flex", alignItems: "flex-end" }}>
          <Outlined text="M1" size={150} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginLeft: 16, marginBottom: 14, fontSize: 64, fontWeight: 900, color: WHITE }}>8.4万</div>
        </div>
        <Laptop w={280} screen={SCREENS[1]} style={{ position: "absolute", left: 90, top: 340 }} />
        <div style={{ position: "absolute", left: 780, top: 165, display: "flex", alignItems: "flex-end" }}>
          <Outlined text="M2" size={150} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} />
          <div style={{ display: "flex", marginLeft: 16, marginBottom: 14, fontSize: 64, fontWeight: 900, color: BLACK }}>11.2万</div>
        </div>
        <Laptop w={280} screen={SCREENS[3]} style={{ position: "absolute", left: 840, top: 340 }} />
        <div style={{ position: "absolute", left: 560, top: 270, display: "flex", width: 160, height: 160, borderRadius: 160, background: RED, border: `8px solid ${WHITE}`, alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 84, fontWeight: 900, fontStyle: "italic" }}>VS</div>
        <div style={{ position: "absolute", left: 0, top: 545, height: 165, display: "flex", alignItems: "center", padding: "0 30px 0 36px", background: YELLOW, boxShadow: "8px 8px 0 rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 900, color: BLACK, letterSpacing: -4, marginRight: 8 }}>M1なら</div>
          <Outlined text="2.8万円" size={140} color={RED} inner={{ w: 7, c: WHITE }} outer={{ w: 5, c: BLACK }} spacing={-8} />
          <div style={{ display: "flex", fontSize: 88, fontWeight: 900, color: BLACK, letterSpacing: -4, marginLeft: 8 }}>安い</div>
        </div>
      </Frame>
    ),
    // C: 驚くつむぎ＋「2026年でもまだ使える」（「0:00 結論」: macOS 27 対応・中古 8GB・256GB 83,980円）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("tsumugi-surprised", { left: -30, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 76, fontWeight: 900, letterSpacing: -2 }}>M1 MacBook Air</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="2026年でも" size={140} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="まだ使える" size={fit("まだ使える", 820, 180)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 500, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 56, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>macOS 27対応・中古8.4万円</div>
        <Bubble text={"2020年の\nMacなのに!?"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
  // 20本目 bAVv69vtRlA。A＝紺の地「折りたたみスマホ どれを買う？ 中古なら17.3万円」＋つむぎ
  "2026-11-04-foldables": {
    id: "bAVv69vtRlA",
    // B: 色帯3段＋2台の値札（「0:00 結論」: Duo 新品 256GB 364,800円・中古 Pixel 10 Pro Fold 172,800円）
    B: () => (
      <Frame bg={`linear-gradient(180deg, ${WHITE} 0%, #E5E7EB 100%)`}>
        <Bands top={40} bands={[
          { text: "折りたたみ", bg: BLACK, color: YELLOW, size: 120 },
          { text: "中古なら", bg: RED, color: WHITE, size: 132 },
          { text: "半額以下", bg: YELLOW, color: BLACK, size: 150 },
        ]} />
        {[
          { x: 690, label: "Duo 新品", price: "36.5万", ok: false, screen: ["#312E81", "#A78BFA"] as [string, string] },
          { x: 980, label: "Pixel 中古", price: "17.3万", ok: true, screen: SCREENS[1] },
        ].map((p) => (
          <div key={p.label} style={{ position: "absolute", left: p.x, top: 60, display: "flex", flexDirection: "column", alignItems: "center", width: 270 }}>
            <div style={{ display: "flex", padding: "0 12px", marginBottom: 10, background: p.ok ? RED : BLACK, color: WHITE, fontSize: 46, fontWeight: 900, lineHeight: 1.2, whiteSpace: "nowrap" }}>{p.label}</div>
            <Phone w={240} h={240} screen={p.screen} bare />
            <div style={{ display: "flex", marginTop: 10 }}><Outlined text={p.price} size={fit(p.price, 270, 84)} color={p.ok ? RED : BLACK} inner={{ w: 5, c: WHITE }} spacing={-3} /></div>
          </div>
        ))}
        <div style={{ position: "absolute", left: 40, top: 600, display: "flex", fontSize: 46, fontWeight: 900, color: BLACK, letterSpacing: -1 }}>Pixel 10 Pro Fold・Duo は 256GB</div>
      </Frame>
    ),
    // C: ショックのずんだもん＋「Duoの値段で中古が2台」（「0:00 結論」: Pixel 10 Pro Fold 2台で 345,600円）
    C: () => (
      <Frame bg={YELLOW_BG}>
        {chara("zundamon-shock", { left: -40, top: 150, height: 640 })}
        <div style={{ position: "absolute", left: 420, top: 24, display: "flex", padding: "4px 24px", background: BLACK, color: WHITE, fontSize: 76, fontWeight: 900, letterSpacing: -2 }}>折りたたみスマホ</div>
        <div style={{ position: "absolute", left: 420, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Outlined text="Duoの値段で" size={fit("Duoの値段で", 820, 140)} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
          <div style={{ display: "flex", marginTop: 14 }}><Outlined text="中古が2台" size={fit("中古が2台", 820, 180)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
        </div>
        <div style={{ position: "absolute", left: 440, top: 500, display: "flex", padding: "4px 22px", background: WHITE, border: `6px solid ${BLACK}`, fontSize: 52, fontWeight: 900, color: BLACK, letterSpacing: -2 }}>Pixel 10 Pro Fold 2台で34.6万</div>
        <Bubble text={"2台も\n買えるのだ!?"} size={52} style={{ left: 20, top: 20 }} />
      </Frame>
    ),
  },
};

/** 一覧のまとまり（引数なし＝第3弾の4本、set2＝10/26 に足した2本、set3＝10/27 に足した3本、set4＝10/28） */
const GROUPS: Record<string, { keys: string[]; out: string }> = {
  "": { keys: ["2026-10-24-where-to-buy", "2026-10-25-pro-or-standard", "2026-10-26-how-old", "2026-10-27-dont-buy"], out: "thumb-ab3-contact.png" },
  set2: { keys: ["2026-10-23-ipad-dore", "2026-10-28-big-screen"], out: "thumb-ab3-contact2.png" },
  set3: { keys: ["2026-10-29-battery", "2026-10-30-ipad-mini", "2026-10-31-rakuten-mobile"], out: "thumb-ab3-contact3.png" },
  set4: { keys: ["2026-10-29-mbp-m6", "2026-10-31-rakuten-mobile"], out: "thumb-ab3-contact4.png" },
  set5: { keys: ["2026-10-31-mbp-proled", "2026-11-01-mbp-vs-mba"], out: "thumb-ab3-contact5.png" },
  set6: { keys: ["2026-11-02-macbook", "2026-11-02-storage", "2026-11-03-duo-vs-mini", "2026-11-03-m1-air", "2026-11-04-foldables"], out: "thumb-ab3-contact6.png" },
};

/** 一覧: 動画ごとに A・B・C を 400x225 と、スマホの関連動画の大きさ 168x94 で並べる */
async function contact(dirs: string[], out: string, fonts: Awaited<ReturnType<typeof notoSansJp>>) {
  const BW = 400, BH = 225, SW = 168, SH = 94, rowH = 44 + BH + 10 + SH + 26;
  const src = (p: string) => `data:image/png;base64,${b64(p)}`;
  const el = (
    <div style={{ width: 40 + 3 * (BW + 20), height: 20 + dirs.length * rowH, display: "flex", flexDirection: "column", padding: 20, background: "#F3F4F6", fontFamily: FONT }}>
      {dirs.map((d) => {
        const key = d.split("/").pop()!;
        const files = [join(d, PLANS[key].A ? "thumb-A.png" : "thumbnail.png"), join(d, "thumb-B.png"), join(d, "thumb-C.png")];
        return (
          <div key={d} style={{ display: "flex", flexDirection: "column", height: rowH }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 900, color: BLACK, height: 44, alignItems: "center" }}>{`${key}（${PLANS[key].id}）  A／B／C`}</div>
            <div style={{ display: "flex" }}>
              {files.map((f, i) => (
                <div key={f} style={{ display: "flex", flexDirection: "column", width: BW, marginRight: 20 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src(f)} width={BW} height={BH} style={{ borderRadius: 10 }} />
                  <div style={{ display: "flex", marginTop: 10, alignItems: "flex-end" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src(f)} width={SW} height={SH} style={{ borderRadius: 6 }} />
                    <div style={{ display: "flex", marginLeft: 12, fontSize: 40, fontWeight: 900, color: SITE.inkSub }}>{"ABC"[i]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
  const res = new ImageResponse(el, { width: 40 + 3 * (BW + 20), height: 20 + dirs.length * rowH, fonts });
  writeFileSync(join(__dirname, out), Buffer.from(await res.arrayBuffer()));
}

(async () => {
  const arg = process.argv[2];
  const group = GROUPS[arg ?? ""];
  const keys = group ? group.keys : [arg.replace(/\\/g, "/").split("/").filter(Boolean).pop()!];
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  for (const key of keys) {
    const plan = PLANS[key];
    if (!plan) throw new Error(`サムネの案がありません: ${key}`);
    const dir = join(__dirname, key);
    for (const v of ["A", "B", "C"] as const) {
      const draw = plan[v];
      if (!draw) continue;
      const res = new ImageResponse(<>{draw()}</>, { width: W, height: H, fonts });
      writeFileSync(join(dir, `thumb-${v}.png`), Buffer.from(await res.arrayBuffer()));
    }
    console.log(`B・C → ${dir}`);
  }
  if (group) {
    await contact(group.keys.map((k) => join(__dirname, k).replace(/\\/g, "/")), group.out, fonts);
    console.log(`一覧 → longform/${group.out}`);
  }
})();
