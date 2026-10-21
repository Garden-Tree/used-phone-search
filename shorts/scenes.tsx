/**
 * 場面ごとの 1 コマ（1080x1920）。t は場面の開始からの秒数。
 * 配置: 上 250px は YouTube の UI で空け、見出しの帯（y250〜570・3行の大きな文字）・内容（y590〜1400）・注記（y1420〜）、下 440px 以上は空ける。
 * 左右の余白は 80px（内容の幅 920）で、文字はすべて中央そろえ。見出しの帯はどの場面にも出して、途中から見た人にも話題が分かるようにする
 */
import type { ReactElement, ReactNode } from "react";
import { fitFontSize } from "@/lib/ogFont";
import { ON_DARK, SITE } from "@/lib/brandColors";
import type { Script } from "./types";

export const W = 1080;
export const H = 1920;
export const FPS = 30;
const MARGIN = 80;
const CW = W - MARGIN * 2; // 920
const HEADER = { top: 250, height: 320 };
const BODY = { top: 590, height: 810 };
/** 見出しの帯の文字（上の小さな行・大きな2行） */
const HEAD_SUB = (shops: number) => `毎週更新・大手中古ショップ${shops}店の相場`;
const HEAD_TITLE = ["今週の中古iPhone", "値下がりランキング"];

/**
 * 色はサイトと同じ（lib/brandColors.ts = app/globals.css の @theme）。白いカードの上は SITE、紺の地の上は ON_DARK
 */
const C = {
  bg: SITE.brand900, navy: SITE.brand900, white: ON_DARK.white, sub: ON_DARK.sub,
  /** 白いカードの上の補足（容量・注記） */
  muted: SITE.inkSub,
  /** 白いカードの上の値下がり・グラフの線・見出しの帯 */
  red: SITE.price,
  /** 紺の地の上の金額 */
  redLight: ON_DARK.price,
  /** 紺の地の上の URL */
  good: ON_DARK.safe,
  line: SITE.line,
  /** 順位の札（白い文字を載せる。白とのコントラスト 5.66・4.83・5.02） */
  gold: SITE.price, silver: SITE.inkMute, bronze: SITE.inspect700,
  /** 検品担当の札（サイトの検品担当の色） */
  amber: SITE.inspect700,
};

export type SceneId = "hook" | "hookNum" | "hookChart" | "ranking" | "reveal" | "trend" | "comment" | "outro";
export type Variant = "A" | "B" | "C";
export const VARIANTS: Variant[] = ["A", "B", "C"];
/** 効果音: t は場面の開始からの秒数。pop は行が出る小さな音、ta は 1位発表の二音 */
export type Se = { t: number; kind: "pop" | "ta" };
/** dur: 場面の長さ（秒）、anim: 動きのある秒数（以降は最後のコマを止める）、o: 場面ごとの動きの設定（開始・間隔・拡大率） */
/** o.at: ランキングの行ごとの出る秒（items の添字。1 = 2位・2 = 3位）。声があるときは声の始まりから決める（render.ts） */
export type Scene = { id: SceneId; dur: number; anim: number; se?: Se[]; o?: { start?: number; gap?: number; k?: number; at?: number[] } };

/** ランキングに出す数（1位は伏せた枠・2位・3位）。4位・5位は出さない（声が 3位から読むため） */
export const RANK_SHOWN = 3;
/** 行が出る動きの秒数 */
export const ROW_FADE = 0.25;

/**
 * カウントダウン: 3位 → 2位の順に出し、2位が出てから約1秒で 1位の発表へ（1位は最後まで「？？？」）。
 * at を渡すとその時刻に出す（声に合わせる）。なければ start から gap ごと（声なし）
 */
export const countdown = (start: number, gap: number, at?: number[], minDur = 0): Scene => {
  const times = at ?? [0, start + gap, start];
  const last = Math.max(...times.slice(1));
  return {
    id: "ranking",
    dur: Math.max(minDur, last + 1.0),
    anim: last + ROW_FADE + 0.1,
    se: times.slice(1).map((t) => ({ t, kind: "pop" as const })),
    o: { start, gap, at: times },
  };
};
const reveal = (dur: number): Scene => ({ id: "reveal", dur, anim: 2.0, se: [{ t: 0.6, kind: "ta" }] });
/** 締め: 「来週の1位は…？」で最初の問いにつなげる。最後の静止は 1秒未満 */
const outro = (k: number): Scene => ({ id: "outro", dur: 1.2 * k + 0.4 + 0.8, anim: 1.2 * k + 0.4, o: { k } });
const comment = (dur: number, start: number, gap: number, n: number): Scene => ({ id: "comment", dur, anim: start + (n - 1) * gap + 0.5, o: { start, gap } });

/** 声なしの長さ: A「標準」約29秒 / B「速い」約19秒（数字先出し・グラフなし）/ C「グラフ先」約24秒（最初に推移グラフ）。声があると場面が延びる（render.ts） */
export const TIMELINE = (s: Script, v: Variant): Scene[] => {
  const n = s.scenes.comment.lines.length;
  if (v === "B") return [
    { id: "hookNum", dur: 4, anim: 1.0 }, countdown(0.8, 1.2), reveal(4), comment(5.5, 0, 0.7, n), outro(1.2),
  ];
  if (v === "C") return [
    { id: "hookChart", dur: 4.5, anim: 3.4 }, countdown(0.5, 1.6), reveal(5), comment(8.5, 0, 1.0, n), outro(1.5),
  ];
  return [
    { id: "hook", dur: 3, anim: 3 }, countdown(0.5, 1.6), reveal(5), { id: "trend", dur: 4, anim: 1.7 }, comment(8, 0, 1.0, n), outro(1.5),
  ];
};

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
          <div style={{ ...row, fontSize: FIT(HEAD_SUB(s.shopCount), CW - 60, 52), fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{HEAD_SUB(s.shopCount)}</div>
          {HEAD_TITLE.map((l, i) => (
            <div key={i} style={{ ...row, fontSize: Math.min(...HEAD_TITLE.map((x) => FIT(x, CW - 60, 104))), fontWeight: 900, lineHeight: 1.15, marginTop: i ? 0 : 6 }}>{l}</div>
          ))}
        </div>
      )}
      <div style={{ position: "absolute", left: MARGIN, top: BODY.top, width: CW, height: BODY.height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
      {footer && (
        <div style={{ position: "absolute", left: MARGIN, top: 1420, width: CW, display: "flex", justifyContent: "center", fontSize: 30, fontWeight: 500, color: C.sub, whiteSpace: "nowrap" }}>
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

function Ranking({ s, t, o }: { s: Script; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN);
  // 1行 260px・3行。機種名は右の列の幅いっぱい、その下に 容量・率・額
  const RH = 260;
  const RIGHT = 680;
  return (
    <Frame s={s}>
      <div style={{ ...card, width: CW, padding: "6px 24px" }}>
        {items.map((it, i) => {
          // 3位（下）→ 2位の順に出す。1位は最後まで出さない
          const at = o?.at?.[i] ?? (o?.start ?? 0.5) + (o?.gap ?? 1.6) * (items.length - 1 - i);
          const p = i === 0 ? 1 : prog(t, at, ROW_FADE);
          const secret = i === 0;
          const rateText = `−${rate(it.rate)}%`;
          const dropText = `−${n(it.drop)}円`;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", width: "100%", height: RH, borderBottom: i < items.length - 1 ? `3px solid ${C.line}` : "none", opacity: p, transform: `translateX(${Math.round((1 - p) * 80)}px)` }}>
              <div style={{ display: "flex", justifyContent: "center", width: 160, flexShrink: 0, fontSize: 68, fontWeight: 900, color: C.white, background: BADGE[i] ?? C.navy, borderRadius: 22, padding: "14px 0" }}>{`${i + 1}位`}</div>
              {secret ? (
                <div style={{ ...row, width: RIGHT, flexShrink: 0, marginLeft: 20, fontSize: 120, fontWeight: 900 }}>？？？</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: RIGHT, flexShrink: 0, marginLeft: 20 }}>
                  <div style={{ ...row, fontSize: FIT(it.model, RIGHT, 80), fontWeight: 900 }}>{it.model}</div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", width: RIGHT, marginTop: 8 }}>
                    <div style={{ ...row, width: 170, fontSize: FIT(it.storage, 170, 44), fontWeight: 900, color: C.muted }}>{it.storage}</div>
                    <div style={{ ...row, width: 250, fontSize: FIT(rateText, 250, 80), fontWeight: 900, color: C.red }}>{rateText}</div>
                    <div style={{ ...row, width: 260, fontSize: FIT(dropText, 260, 50), fontWeight: 900, color: C.red }}>{dropText}</div>
                  </div>
                </div>
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

type Pt = { date: string; median: number };

/** 折れ線のカード。p は線が描かれた割合（0〜1）。labels=true で最高・最低・日付を入れる */
/** mark: 印を付ける点の添字（いちばん下がった日）。線がそこまで描かれたら出す */
function ChartCard({ points, p, labels, chartH = 400, mark }: { points: Pt[]; p: number; labels: boolean; chartH?: number; mark?: number }) {
  const vals = points.map((q) => q.median);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  // 縦軸は最高値の±20%の幅を最低限とる（数%の値動きが崖のように見えないように）
  const span = Math.max(hi - lo, hi * 0.2);
  lo = Math.max(0, (hi + lo) / 2 - span / 2);
  hi = lo + span;
  const CWI = CW - 56;
  const PAD = 24;
  const xy: [number, number][] = points.map((q, i) => [PAD + (i / (points.length - 1)) * (CWI - PAD * 2), PAD + (1 - (q.median - lo) / (hi - lo)) * (chartH - PAD * 2)]);
  const drawn = partial(xy, p);
  const d = drawn.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [ex, ey] = drawn[drawn.length - 1];
  const lab = { display: "flex", fontSize: 36, fontWeight: 900, color: C.muted } as const;
  return (
    <div style={{ ...card, width: CW, padding: "24px 28px", alignItems: "stretch" }}>
      {labels && <div style={lab}>{`最高 ${n(Math.max(...vals))}円`}</div>}
      <svg width={CWI} height={chartH} viewBox={`0 0 ${CWI} ${chartH}`}>
        <path d={d} fill="none" stroke={C.red} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        {mark !== undefined && mark > 0 && p * (points.length - 1) >= mark && (
          <circle cx={xy[mark][0]} cy={xy[mark][1]} r="18" fill={C.white} stroke={C.red} strokeWidth="8" />
        )}
        <circle cx={ex} cy={ey} r="16" fill={C.red} />
      </svg>
      {labels && <div style={lab}>{`最低 ${n(Math.min(...vals))}円`}</div>}
      {labels && (
        <div style={{ ...lab, justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ display: "flex" }}>{md(points[0].date)}</span>
          <span style={{ display: "flex" }}>{md(points[points.length - 1].date)}</span>
        </div>
      )}
    </div>
  );
}

function Trend({ s, t }: { s: Script; t: number }) {
  const { model, storage, points } = s.scenes.trend;
  const heading = `${model}（${storage}）の相場`;
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
  // 線・最初と最後の値・いちばん下がった日の印だけ（最高・最低・日付の目盛りは出さない）
  const first = points[0];
  const last = points[points.length - 1];
  let mark = 0;
  for (let i = 1, d = 0; i < points.length; i++) if (points[i - 1].median - points[i].median > d) [mark, d] = [i, points[i - 1].median - points[i].median];
  const shown = t >= 1.6 ? 1 : 0;
  const startText = `${md(first.date)} ${n(first.median)}円`;
  const endText = `${md(last.date)} ${n(last.median)}円`;
  return (
    <Frame s={s}>
      {title}
      <ChartCard points={points} p={prog(t, 0, 1.3)} labels={false} mark={mark} />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", width: CW, marginTop: 28, opacity: shown }}>
        <span style={{ ...row, width: 340, justifyContent: "flex-start", fontSize: FIT(startText, 340, 40), fontWeight: 900, color: C.sub }}>{startText}</span>
        <span style={{ ...row, width: 560, justifyContent: "flex-end", fontSize: FIT(endText, 560, 72), fontWeight: 900, color: C.redLight }}>{endText}</span>
      </div>
    </Frame>
  );
}

/** B のつかみ: 下がった額を先に見せ、機種は伏せる */
function HookNum({ s, t }: { s: Script; t: number }) {
  const h = s.scenes.hook;
  const full = `−${n(h.drop)}円`;
  const lines = ["1週間でこれだけ下がった", "中古iPhoneは…？"];
  return (
    <Frame s={s}>
      <div style={{ ...card, width: CW, padding: "50px 0" }}>
        <div style={{ ...row, fontSize: FIT(full, CW - 60, 190), fontWeight: 900, color: C.red }}>{`−${n(Math.round(h.drop * prog(t, 0.1, 0.8)))}円`}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 56 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ ...row, fontSize: FIT(l, CW, 84), fontWeight: 900, marginBottom: 12 }}>{l}</div>
        ))}
      </div>
    </Frame>
  );
}

/** C のつかみ: 1位の30日の推移グラフが描かれ、機種は伏せる。描き終わりに下がった額を出す */
function HookChart({ s, t }: { s: Script; t: number }) {
  const { points } = s.scenes.trend;
  const h = s.scenes.hook;
  if (points.length < 2) return <Hook s={s} t={t} />;
  const heading = "この iPhone、30日でこう動いた";
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: FIT(heading, CW, 64), fontWeight: 900, marginBottom: 30 }}>{heading}</div>
      <ChartCard points={points} p={prog(t, 0.3, 2.5)} labels={false} chartH={520} />
      <div style={{ ...row, fontSize: 110, fontWeight: 900, color: C.redLight, marginTop: 36, opacity: clamp((t - 2.8) / 0.3) }}>{`1週間で−${n(h.drop)}円`}</div>
    </Frame>
  );
}

function Comment({ s, t, o }: { s: Script; t: number; o: Scene["o"] }) {
  const { speaker, lines } = s.scenes.comment;
  const size = Math.min(...lines.map((l) => FIT(l, CW - 100, 72, 36))); // 行ごとに大きさが違わないよう最小にそろえる
  return (
    <Frame s={s}>
      <div style={{ ...card, width: CW, padding: "56px 40px" }}>
        <div style={{ ...row, fontSize: 40, fontWeight: 900, color: C.white, background: C.amber, padding: "8px 32px", borderRadius: 999 }}>{`${speaker}のひと言`}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 44 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ ...row, fontSize: size, fontWeight: 900, marginBottom: 26, opacity: prog(t, (o?.start ?? 0.4) + i * (o?.gap ?? 1.0), 0.25) }}>{l}</div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function Outro({ s, t, o }: { s: Script; t: number; o: Scene["o"] }) {
  const out = s.scenes.outro;
  const k = o?.k ?? 1.5;
  return (
    <Frame s={s} header={false} footer={false}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: prog(t, 0, 0.25) }}>
          {out.lines.map((l, i) => (
            <div key={i} style={{ ...row, fontSize: FIT(l, CW, 88), fontWeight: 900, marginBottom: 14 }}>{l}</div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: prog(t, 0.6 * k, 0.4) }}>
          <div style={{ ...row, fontSize: FIT(out.url, CW, 80), fontWeight: 900, color: C.good, marginTop: 56 }}>{out.url}</div>
          <div style={{ ...row, fontSize: 34, fontWeight: 500, color: C.sub, marginTop: 40 }}>{out.note}</div>
        </div>
        <div style={{ ...row, fontSize: 52, fontWeight: 900, marginTop: 64, opacity: prog(t, 1.2 * k, 0.4) }}>来週の1位は…？</div>
      </div>
    </Frame>
  );
}

export function sceneFrame(sc: Scene, s: Script, t: number): ReactElement {
  switch (sc.id) {
    case "hook": return <Hook s={s} t={t} />;
    case "hookNum": return <HookNum s={s} t={t} />;
    case "hookChart": return <HookChart s={s} t={t} />;
    case "ranking": return <Ranking s={s} t={t} o={sc.o} />;
    case "reveal": return <Reveal s={s} t={t} />;
    case "trend": return <Trend s={s} t={t} />;
    case "comment": return <Comment s={s} t={t} o={sc.o} />;
    case "outro": return <Outro s={s} t={t} o={sc.o} />;
  }
}
