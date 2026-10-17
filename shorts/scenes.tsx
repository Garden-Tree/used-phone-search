/** 場面ごとの 1 コマ（1080x1920）。t は場面の開始からの秒数。YouTube の UI に隠れる範囲（上220・下420・右140）には文字を置かない */
import type { ReactElement, ReactNode } from "react";
import { fitFontSize } from "@/lib/ogFont";
import type { Script } from "./types";

export const W = 1080;
export const H = 1920;
export const FPS = 30;
const SAFE = { top: 220, bottom: 420, left: 60, right: 140 };
const CW = W - SAFE.left - SAFE.right; // 880
const AREA_H = 1220; // 内容を縦中央に置く高さ（y 220〜1440）

// サイトの色（docs/design.md）を暗い藍の地に載せる
const C = { bg: "#1E1B4B", text: "#FFFFFF", sub: "#C7D2FE", drop: "#FF6B6B", good: "#5EEAD4", card: "#FFFBEB", cardLine: "#F5E1A4", amberNum: "#B45309", ink: "#111827" };

export type SceneId = "hook" | "ranking" | "trend" | "comment" | "outro";
/** dur: 場面の長さ（秒）、anim: 動きのある秒数（以降は最後のコマを止める） */
export const TIMELINE = (s: Script): { id: SceneId; dur: number; anim: number }[] => [
  { id: "hook", dur: 3, anim: 1.0 },
  { id: "ranking", dur: 9, anim: 1.4 },
  { id: "trend", dur: 10, anim: 2.0 },
  { id: "comment", dur: 12, anim: 0.4 + (s.scenes.comment.lines.length - 1) * 1.0 + 0.5 },
  { id: "outro", dur: 6, anim: 0.6 },
];

/** 画像に出る固定の文字（フォントのサブセット用） */
export const STATIC_TEXT = "0123456789,.%+−-円万GBTB/：・（）！→最高低相場日検品担当のひと言mm～〜";

/** 太字の幅の見積もりが甘いので 1 割弱の余白を見て文字サイズを決める（改行させない） */
const FIT = (text: string, w: number, max: number, min = 28) => fitFontSize(text, w * 0.92, max, min);
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const prog = (t: number, start: number, dur: number) => ease((t - start) / dur);
const n = (v: number) => v.toLocaleString();
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

function Frame({ s, children, footer = true }: { s: Script; children: ReactNode; footer?: boolean }) {
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", position: "relative", background: C.bg, fontFamily: "Noto Sans JP", color: C.text, }}>
      <div style={{ position: "absolute", left: SAFE.left, top: SAFE.top, width: CW, height: AREA_H, display: "flex", flexDirection: "column", justifyContent: "center" }}>{children}</div>
      {footer && <div style={{ position: "absolute", left: SAFE.left, top: 1460, width: CW, display: "flex", fontSize: 30, color: C.sub }}>
        {`${s.date.replace(/-/g, "/")}・${s.scenes.outro.note.split("・")[0]}`}
      </div>}
    </div>
  );
}

function Hook({ s, t }: { s: Script; t: number }) {
  const h = s.scenes.hook;
  const shown = Math.round(h.drop * prog(t, 0.1, 0.8));
  const fullText = `−${n(h.drop)}円`;
  return (
    <Frame s={s}>
      <div style={{ display: "flex", fontSize: FIT(h.label, CW, 56), whiteSpace: "nowrap", fontWeight: 900, color: C.sub }}>{h.label}</div>
      <div style={{ display: "flex", fontSize: FIT(h.model, CW, 200), whiteSpace: "nowrap", fontWeight: 900, marginTop: 60 }}>{h.model}</div>
      <div style={{ display: "flex", fontSize: FIT(fullText, CW, 220), whiteSpace: "nowrap", fontWeight: 900, color: C.drop, marginTop: 30 }}>{`−${n(shown)}円`}</div>
      <div style={{ display: "flex", fontSize: 90, fontWeight: 900, color: C.drop, marginTop: 10 }}>{`−${s.scenes.ranking.items[0].rate.toFixed(1)}%`}</div>
      <div style={{ display: "flex", fontSize: 48, color: C.sub, marginTop: 60, whiteSpace: "nowrap" }}>{`相場（${h.storage}） ${n(h.before)}円 → ${n(h.after)}円`}</div>
    </Frame>
  );
}

function Ranking({ s, t }: { s: Script; t: number }) {
  const { title, items } = s.scenes.ranking;
  const max = Math.max(...items.map((i) => i.rate));
  return (
    <Frame s={s}>
      <div style={{ display: "flex", fontSize: 72, fontWeight: 900, marginBottom: 50 }}>{title}</div>
      {items.map((it, i) => {
        const p = prog(t, 0.2 + i * 0.15, 0.4);
        const name = `${it.model} ${it.storage}`;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", marginBottom: 56, opacity: Math.min(1, p * 3) }}>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ display: "flex", width: 70, fontSize: 56, fontWeight: 900, color: i === 0 ? C.drop : C.sub }}>{String(i + 1)}</span>
              <span style={{ display: "flex", fontSize: FIT(name, CW - 70, 56), whiteSpace: "nowrap", fontWeight: 900 }}>{name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
              <div style={{ display: "flex", width: 340, height: 44, background: "#312E81", borderRadius: 14 }}>
                <div style={{ display: "flex", width: Math.round((it.rate / max) * 340 * p), height: 44, background: i === 0 ? C.drop : "#818CF8", borderRadius: 14 }} />
              </div>
              <span style={{ display: "flex", marginLeft: 24, fontSize: 42, whiteSpace: "nowrap", fontWeight: 900, color: C.drop }}>{`−${it.rate.toFixed(1)}%（−${n(it.drop)}円）`}</span>
            </div>
          </div>
        );
      })}
    </Frame>
  );
}

/** 折れ線の先頭 p（0〜1）までの座標列。最後の線分は途中まで */
function partial(pts: [number, number][], p: number): [number, number][] {
  const segs = pts.length - 1;
  const pos = p * segs;
  const full = Math.floor(pos);
  const out = pts.slice(0, Math.min(full, segs) + 1);
  if (full < segs) {
    const f = pos - full;
    const [x0, y0] = pts[full];
    const [x1, y1] = pts[full + 1];
    out.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]);
  }
  return out;
}

function Trend({ s, t }: { s: Script; t: number }) {
  const { model, storage, days, points } = s.scenes.trend;
  const heading = `${model}（${storage}）の相場 ${days}日`;
  if (points.length < 2) {
    const h = s.scenes.hook;
    return (
      <Frame s={s}>
        <div style={{ display: "flex", fontSize: FIT(heading, CW, 56), whiteSpace: "nowrap", fontWeight: 900 }}>{heading}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 80, padding: 50, background: "#312E81", borderRadius: 32 }}>
          <div style={{ display: "flex", fontSize: 40, color: C.sub }}>1週間前</div>
          <div style={{ display: "flex", fontSize: 90, fontWeight: 900 }}>{`${n(h.before)}円`}</div>
          <div style={{ display: "flex", fontSize: 40, color: C.sub, marginTop: 30 }}>いま</div>
          <div style={{ display: "flex", fontSize: 110, fontWeight: 900, color: C.drop }}>{`${n(h.after)}円`}</div>
        </div>
      </Frame>
    );
  }
  const vals = points.map((p) => p.median);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  // 縦軸は最高値の±20%の幅を最低限とる（数%の値動きが崖のように見えないように）
  const span = Math.max(hi - lo, hi * 0.2);
  lo = Math.max(0, (hi + lo) / 2 - span / 2);
  hi = lo + span;
  const CH = 720;
  const PAD = 30;
  const xy: [number, number][] = points.map((p, i) => [PAD + (i / (points.length - 1)) * (CW - PAD * 2), PAD + (1 - (p.median - lo) / (hi - lo)) * (CH - PAD * 2)]);
  const drawn = partial(xy, prog(t, 0.3, 1.5));
  const d = drawn.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [ex, ey] = drawn[drawn.length - 1];
  const last = points[points.length - 1];
  return (
    <Frame s={s}>
      <div style={{ display: "flex", fontSize: FIT(heading, CW, 56), whiteSpace: "nowrap", fontWeight: 900 }}>{heading}</div>
      <div style={{ display: "flex", fontSize: 36, color: C.sub, marginTop: 30, marginBottom: 8 }}>{`最高 ${n(Math.max(...vals))}円`}</div>
      <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`}>
        <rect x="0" y="0" width={CW} height={CH} rx="24" fill="#2A2766" />
        <path d={d} fill="none" stroke={C.good} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={ex} cy={ey} r="14" fill={C.drop} />
      </svg>
      <div style={{ display: "flex", fontSize: 36, color: C.sub, marginTop: 8 }}>{`最低 ${n(Math.min(...vals))}円`}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, color: C.sub, marginTop: 8 }}>
        <span style={{ display: "flex" }}>{md(points[0].date)}</span>
        <span style={{ display: "flex" }}>{md(last.date)}</span>
      </div>
      <div style={{ display: "flex", fontSize: 110, whiteSpace: "nowrap", fontWeight: 900, color: C.drop, marginTop: 8, opacity: t >= 1.8 ? 1 : 0 }}>{`いま ${n(last.median)}円`}</div>
    </Frame>
  );
}

function Comment({ s, t }: { s: Script; t: number }) {
  const { speaker, lines } = s.scenes.comment;
  const size = Math.min(...lines.map((l) => FIT(l, CW - 108, 76, 36))); // 行ごとに大きさが違わないよう最小にそろえる
  return (
    <Frame s={s}>
      <div style={{ display: "flex", flexDirection: "column", padding: "64px 50px", background: C.card, border: `4px solid ${C.cardLine}`, borderRadius: 36 }}>
        <div style={{ display: "flex" }}>
          <span style={{ display: "flex", fontSize: 40, fontWeight: 900, color: "#FFFFFF", background: C.amberNum, padding: "6px 26px", borderRadius: 999 }}>{`${speaker}のひと言`}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 50 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "flex", fontSize: size, whiteSpace: "nowrap", fontWeight: 900, color: C.ink, marginBottom: 28, opacity: prog(t, 0.4 + i * 1.0, 0.4) }}>{l}</div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function Outro({ s, t }: { s: Script; t: number }) {
  const o = s.scenes.outro;
  return (
    <Frame s={s} footer={false}>
      <div style={{ display: "flex", flexDirection: "column", opacity: prog(t, 0, 0.5) }}>
        {o.lines.map((l, i) => (
          <div key={i} style={{ display: "flex", fontSize: FIT(l, CW, 96), whiteSpace: "nowrap", fontWeight: 900, marginBottom: 14 }}>{l}</div>
        ))}
        <div style={{ display: "flex", fontSize: FIT(o.url, CW, 84), whiteSpace: "nowrap", fontWeight: 900, color: C.good, marginTop: 50 }}>{o.url}</div>
        <div style={{ display: "flex", fontSize: 36, color: C.sub, marginTop: 60 }}>{o.note}</div>
      </div>
    </Frame>
  );
}

export function sceneFrame(id: SceneId, s: Script, t: number): ReactElement {
  switch (id) {
    case "hook": return <Hook s={s} t={t} />;
    case "ranking": return <Ranking s={s} t={t} />;
    case "trend": return <Trend s={s} t={t} />;
    case "comment": return <Comment s={s} t={t} />;
    case "outro": return <Outro s={s} t={t} />;
  }
}
