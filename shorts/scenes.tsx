/**
 * 場面ごとの 1 コマ（1080x1920）。t は場面の開始からの秒数。
 * 配置: 上 250px は YouTube の UI で空け、見出しの帯（y250〜470）・内容（y500〜1380）・注記（y1400〜）、下 440px 以上は空ける。
 * 左右の余白は 80px（内容の幅 920）で、文字はすべて中央そろえ。見出しの帯はどの場面にも出して、途中から見た人にも話題が分かるようにする
 */
import type { ReactElement, ReactNode } from "react";
import { fitFontSize } from "@/lib/ogFont";
import type { Script } from "./types";

export const W = 1080;
export const H = 1920;
export const FPS = 30;
const MARGIN = 80;
const CW = W - MARGIN * 2; // 920
const HEADER = { top: 250, height: 220 };
const BODY = { top: 500, height: 880 };

const C = {
  bg: "#1E1B4B", navy: "#1E1B4B", white: "#FFFFFF", sub: "#C7D2FE", muted: "#475569",
  red: "#E11D48", redLight: "#FB7185", good: "#5EEAD4", line: "#E2E8F0",
  gold: "#F59E0B", silver: "#94A3B8", bronze: "#B45309", amber: "#B45309",
};

export type SceneId = "hook" | "ranking" | "reveal" | "trend" | "comment" | "outro";
/** ランキングは5位から下の順に出す（1位は最後まで「？？？」） */
const RANK_START = 0.5;
const RANK_GAP = 2.0;
/** dur: 場面の長さ（秒）、anim: 動きのある秒数（以降は最後のコマを止める） */
export const TIMELINE = (s: Script): { id: SceneId; dur: number; anim: number }[] => [
  { id: "hook", dur: 3, anim: 3 },
  { id: "ranking", dur: 11, anim: RANK_START + RANK_GAP * 3 + 0.6 },
  { id: "reveal", dur: 5, anim: 2.0 },
  { id: "trend", dur: 8, anim: 2.0 },
  { id: "comment", dur: 9, anim: 0.4 + (s.scenes.comment.lines.length - 1) * 1.0 + 0.5 },
  { id: "outro", dur: 4, anim: 0.6 },
];

/** 太字の幅の見積もりが甘いので 1 割弱の余白を見て文字サイズを決める（改行させない） */
const FIT = (text: string, w: number, max: number, min = 28) => fitFontSize(text, w * 0.92, max, min);
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const prog = (t: number, start: number, dur: number) => ease((t - start) / dur);
/** 少し行き過ぎてから戻る（ポンと出る動き） */
const back = (x: number) => { const c = 1.70158; const y = clamp(x) - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
const n = (v: number) => v.toLocaleString();
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const rate = (r: number) => r.toFixed(1);

const row = { display: "flex", justifyContent: "center", alignItems: "center", whiteSpace: "nowrap" } as const;

function Frame({ s, children, header = true, footer = true }: { s: Script; children: ReactNode; header?: boolean; footer?: boolean }) {
  return (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: C.bg, fontFamily: "Noto Sans JP", color: C.white }}>
      {header && (
        <div style={{ position: "absolute", left: MARGIN, top: HEADER.top, width: CW, height: HEADER.height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.red, borderRadius: 28 }}>
          <div style={{ ...row, fontSize: 38, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{`毎週更新・大手中古ショップ${s.shopCount}店の相場`}</div>
          <div style={{ ...row, fontSize: FIT("今週の中古iPhone 値下がりランキング", CW - 40, 64), fontWeight: 900, marginTop: 10 }}>今週の中古iPhone 値下がりランキング</div>
        </div>
      )}
      <div style={{ position: "absolute", left: MARGIN, top: BODY.top, width: CW, height: BODY.height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
      {footer && (
        <div style={{ position: "absolute", left: MARGIN, top: 1400, width: CW, display: "flex", justifyContent: "center", fontSize: 30, fontWeight: 500, color: C.sub, whiteSpace: "nowrap" }}>
          {`${s.date.replace(/-/g, "/")}・在庫がいちばん多い容量の中央値`}
        </div>
      )}
    </div>
  );
}

const card = { display: "flex", flexDirection: "column", alignItems: "center", background: C.white, borderRadius: 28, color: C.navy } as const;

function Hook({ s, t }: { s: Script; t: number }) {
  const lines = ["今週いちばん値下がりした", "中古iPhoneは…？"];
  const pulse = 1 + 0.035 * Math.sin(t * Math.PI * 2 * 1.2);
  return (
    <Frame s={s}>
      {lines.map((l, i) => (
        <div key={i} style={{ ...row, fontSize: FIT(l, CW, 96), fontWeight: 900, marginBottom: 14 }}>{l}</div>
      ))}
      <div style={{ ...card, flexDirection: "row", justifyContent: "center", width: CW, height: 170, marginTop: 60, transform: `scale(${pulse})` }}>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 900, color: C.white, background: C.gold, borderRadius: 18, padding: "8px 28px" }}>1位</div>
        <div style={{ display: "flex", fontSize: 80, fontWeight: 900, marginLeft: 36 }}>？？？</div>
      </div>
    </Frame>
  );
}

const BADGE = [C.gold, C.silver, C.bronze, C.navy, C.navy];

function Ranking({ s, t }: { s: Script; t: number }) {
  const { items } = s.scenes.ranking;
  return (
    <Frame s={s}>
      <div style={{ ...card, width: CW, padding: "10px 24px" }}>
        {items.map((it, i) => {
          // 5位（下）から順に出す。1位は最後まで出さない
          const p = i === 0 ? 1 : prog(t, RANK_START + RANK_GAP * (items.length - 1 - i), 0.5);
          const secret = i === 0;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", width: "100%", height: 150, borderBottom: i < items.length - 1 ? `2px solid ${C.line}` : "none", opacity: p, transform: `translateX(${Math.round((1 - p) * 80)}px)` }}>
              <div style={{ display: "flex", justifyContent: "center", width: 120, flexShrink: 0, fontSize: 52, fontWeight: 900, color: C.white, background: BADGE[i] ?? C.navy, borderRadius: 18, padding: "10px 0" }}>{`${i + 1}位`}</div>
              {secret ? (
                <div style={{ ...row, width: 710, flexShrink: 0, fontSize: 84, fontWeight: 900 }}>？？？</div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 470, flexShrink: 0, margin: "0 12px" }}>
                    <div style={{ ...row, fontSize: FIT(it.model, 470, 52), fontWeight: 900 }}>{it.model}</div>
                    <div style={{ ...row, fontSize: 34, fontWeight: 900, color: C.muted }}>{it.storage}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 240, flexShrink: 0 }}>
                    <div style={{ ...row, fontSize: 58, fontWeight: 900, color: C.red }}>{`−${rate(it.rate)}%`}</div>
                    <div style={{ ...row, fontSize: 32, fontWeight: 900, color: C.muted }}>{`−${n(it.drop)}円`}</div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

function Reveal({ s, t }: { s: Script; t: number }) {
  const h = s.scenes.hook;
  const r = s.scenes.ranking.items[0];
  const shown = Math.round(h.drop * prog(t, 1.0, 0.9));
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const dropText = `−${n(h.drop)}円`;
  const sub = `相場（${h.storage}） ${n(h.before)}円 → ${n(h.after)}円`;
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 84, fontWeight: 900, marginBottom: 40, opacity: prog(t, 0, 0.4) }}>1位は…</div>
      <div style={{ ...card, width: CW, padding: "44px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(h.model, CW - 60, 120), fontWeight: 900 }}>{h.model}</div>
        <div style={{ ...row, fontSize: FIT(dropText, CW - 60, 170), fontWeight: 900, color: C.red, marginTop: 20 }}>{`−${n(shown)}円`}</div>
        <div style={{ ...row, fontSize: 84, fontWeight: 900, color: C.red }}>{`−${rate(r.rate)}%`}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 44), fontWeight: 500, color: C.muted, marginTop: 24 }}>{sub}</div>
      </div>
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
  const title = <div style={{ ...row, fontSize: FIT(heading, CW, 56), fontWeight: 900, marginBottom: 26 }}>{heading}</div>;
  if (points.length < 2) {
    const h = s.scenes.hook;
    return (
      <Frame s={s}>
        {title}
        <div style={{ ...card, width: CW, padding: "40px 0" }}>
          <div style={{ ...row, fontSize: 44, fontWeight: 900, color: C.muted }}>1週間前</div>
          <div style={{ ...row, fontSize: 90, fontWeight: 900 }}>{`${n(h.before)}円`}</div>
          <div style={{ ...row, fontSize: 44, fontWeight: 900, color: C.muted, marginTop: 24 }}>いま</div>
          <div style={{ ...row, fontSize: 110, fontWeight: 900, color: C.red }}>{`${n(h.after)}円`}</div>
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
  const CWI = CW - 56;
  const CH = 400;
  const PAD = 24;
  const xy: [number, number][] = points.map((p, i) => [PAD + (i / (points.length - 1)) * (CWI - PAD * 2), PAD + (1 - (p.median - lo) / (hi - lo)) * (CH - PAD * 2)]);
  const drawn = partial(xy, prog(t, 0.3, 1.5));
  const d = drawn.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [ex, ey] = drawn[drawn.length - 1];
  const last = points[points.length - 1];
  const lab = { display: "flex", fontSize: 36, fontWeight: 900, color: C.muted } as const;
  return (
    <Frame s={s}>
      {title}
      <div style={{ ...card, width: CW, padding: "24px 28px", alignItems: "stretch" }}>
        <div style={lab}>{`最高 ${n(Math.max(...vals))}円`}</div>
        <svg width={CWI} height={CH} viewBox={`0 0 ${CWI} ${CH}`}>
          <path d={d} fill="none" stroke={C.red} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={ex} cy={ey} r="16" fill={C.red} />
        </svg>
        <div style={lab}>{`最低 ${n(Math.min(...vals))}円`}</div>
        <div style={{ ...lab, justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ display: "flex" }}>{md(points[0].date)}</span>
          <span style={{ display: "flex" }}>{md(last.date)}</span>
        </div>
      </div>
      <div style={{ ...row, fontSize: 100, fontWeight: 900, marginTop: 28, opacity: t >= 1.8 ? 1 : 0 }}>
        <span style={{ display: "flex" }}>いま</span>
        <span style={{ display: "flex", color: C.redLight, marginLeft: 24 }}>{`${n(last.median)}円`}</span>
      </div>
    </Frame>
  );
}

function Comment({ s, t }: { s: Script; t: number }) {
  const { speaker, lines } = s.scenes.comment;
  const size = Math.min(...lines.map((l) => FIT(l, CW - 100, 72, 36))); // 行ごとに大きさが違わないよう最小にそろえる
  return (
    <Frame s={s}>
      <div style={{ ...card, width: CW, padding: "56px 40px" }}>
        <div style={{ ...row, fontSize: 40, fontWeight: 900, color: C.white, background: C.amber, padding: "8px 32px", borderRadius: 999 }}>{`${speaker}のひと言`}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 44 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ ...row, fontSize: size, fontWeight: 900, marginBottom: 26, opacity: prog(t, 0.4 + i * 1.0, 0.4) }}>{l}</div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function Outro({ s, t }: { s: Script; t: number }) {
  const o = s.scenes.outro;
  return (
    <Frame s={s} header={false} footer={false}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: prog(t, 0, 0.5) }}>
        {o.lines.map((l, i) => (
          <div key={i} style={{ ...row, fontSize: FIT(l, CW, 88), fontWeight: 900, marginBottom: 14 }}>{l}</div>
        ))}
        <div style={{ ...row, fontSize: FIT(o.url, CW, 80), fontWeight: 900, color: C.good, marginTop: 56 }}>{o.url}</div>
        <div style={{ ...row, fontSize: 34, fontWeight: 500, color: C.sub, marginTop: 56 }}>{o.note}</div>
      </div>
    </Frame>
  );
}

export function sceneFrame(id: SceneId, s: Script, t: number): ReactElement {
  switch (id) {
    case "hook": return <Hook s={s} t={t} />;
    case "ranking": return <Ranking s={s} t={t} />;
    case "reveal": return <Reveal s={s} t={t} />;
    case "trend": return <Trend s={s} t={t} />;
    case "comment": return <Comment s={s} t={t} />;
    case "outro": return <Outro s={s} t={t} />;
  }
}
