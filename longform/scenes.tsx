/**
 * 横動画の1コマ（1920x1080）。frameAt(timeline, t) が t 秒（動画の頭から）のコマを返す。ImageResponse（next/og）で PNG にする
 *
 * 配置（いつも同じ）:
 *   上   y24〜96     左上に章の帯（番号＋章の名前）・右上に URL
 *   中央 x290〜1630  白いカード（グラフ・表。data.json の scene を描く）
 *   左右 x40〜266 / x1654〜1880  話し手の枠（左＝ずんだもん・右＝つむぎ。longform/assets/chara/ に立ち絵があれば立ち絵、なければ名前の札だけ）
 *                立ち絵は画面の端まで使う（x0〜280 / x1640〜1920・y116〜792）
 *   下   y812〜1012  字幕（話し手の名前と色・2行まで）
 *   最下 y1024〜     データの日付と「大手中古ショップ17店の在庫から」
 *   終了画面（最後の章が endScreen のとき）: カードの中に YouTube の終了画面の要素を置く枠（下の END_SCREEN）。最後の 20 秒
 * 色は lib/brandColors.ts だけ（白いカードの上は SITE、紺の地の上は ON_DARK）
 */
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { fitFontSize } from "@/lib/ogFont";
import { ON_DARK, SITE } from "@/lib/brandColors";
import { CHAPTER_LEAD, type Who } from "./script";
import type { BarsScene, BigNumberScene, ChecklistScene, EndScreenScene, PairsScene, TableScene, Timeline, TimelineChapter } from "./types";

export const W = 1920;
export const H = 1080;
export const FPS = 30;

const HEADER = { x: 40, y: 24, h: 72 };
const CARD = { x: 290, y: 116, w: 1340, h: 676, pad: 52 };
const SLOT = { y: 116, w: 226, h: 676, left: 40, right: W - 40 - 226 };
/** 立ち絵の枠: 画面の端からカードの手前まで（左 x0〜280・右 x1640〜1920。カードとは 10px あける）。絵の高さ 560px・はみ出た左右は切る */
const ART = { w: 280, h: SLOT.h, imgH: 560, left: 0, right: W - 280 };
const SUB = { x: 40, y: 812, w: W - 80, h: 200, tag: 210, padX: 36, gap: 30, font: 50, lineHeight: 1.4 };
const FOOT_Y = 1024;

/**
 * 終了画面（YouTube Studio の「終了画面」で要素を重ねる場所。画面の座標・1920x1080）。
 * YouTube の決まり（support.google.com/youtube/answer/6388789・10/25 確認）: 動画の最後の 5〜20 秒・動画は 25 秒以上・
 * 16:9 なら要素は4つまで・位置はプレーヤーの上でドラッグ（グリッドに合わせられる）。要素の大きさの決まりは書かれていない。
 * ここでは「動画2枠（16:9）＋チャンネル登録（丸）」をカードの中に置く。字幕・立ち絵・章の帯には重ねない
 */
export const END_SCREEN = {
  /** 終了画面の長さ（秒。YouTube の上限）。最後の章の絵が出てから動画の終わりまでをこの秒数にする（足りなければ最後に BGM だけの間を足す） */
  sec: 20,
  videos: [
    { x: CARD.x + CARD.pad, y: CARD.y + CARD.pad + 156, w: 600, h: 338 },
    { x: CARD.x + CARD.w - CARD.pad - 600, y: CARD.y + CARD.pad + 156, w: 600, h: 338 },
  ],
  subscribe: { x: CARD.x + CARD.w - CARD.pad - 132, y: CARD.y + CARD.pad, size: 132 },
} as const;

/** 最後の台詞のあとに残す秒（BGM が下がりきる） */
export const TAIL = 1.5;
/** 最後の章が終了画面か */
export const hasEndScreen = (tl: Timeline) => tl.chapters[tl.chapters.length - 1]?.scene.type === "endScreen";
/**
 * 最後の台詞のあとに残す秒。終了画面があるときは、終了画面の章の絵が出てから動画の終わりまでが END_SCREEN.sec になるよう伸ばす
 * （台詞が 20 秒より長いと伸ばさない。timeline.ts が警告する）
 */
export function tailOf(tl: Timeline): number {
  if (!hasEndScreen(tl)) return TAIL;
  const last = tl.chapters[tl.chapters.length - 1];
  return Math.max(TAIL, Math.round((END_SCREEN.sec - (tl.total - chapterShownAt(last))) * 1000) / 1000);
}
/** 終了画面を置く秒（動画の頭から。start〜end）。終了画面がなければ null */
export function endScreenWindow(tl: Timeline): { start: number; end: number } | null {
  if (!hasEndScreen(tl)) return null;
  const end = tl.total + tailOf(tl);
  return { start: Math.max(0, end - END_SCREEN.sec), end };
}

/** 字幕の文字の幅（px）と1行に入れる量（em。太字の英数字の幅の揺れを見込んで 0.95） */
const SUB_TEXT_W = SUB.w - SUB.tag - SUB.padX * 2 - SUB.gap;
export const SUB_LINE_EM = (SUB_TEXT_W / SUB.font) * 0.95;

/** 太字の目安幅（lib/ogFont.ts の fitFontSize と同じ数え方）: 漢字・かな 1em、英数字 0.6em、空白 0.3em */
export const textEm = (s: string) => Array.from(s).reduce((w, c) => w + (c === " " ? 0.3 : c.charCodeAt(0) > 0x2e80 ? 1 : 0.6), 0);

/**
 * 字幕を行に分ける。英数字のつながり（iPhone・13 Pro の各語・1.5万円・2,538件）とカタカナの語は切らず、
 * 句読点・閉じかっこ・小さい字・長音は行頭に来ないよう前に、開きかっこは後ろにつける
 */
export function wrapSubtitle(text: string, lineEm = SUB_LINE_EM): string[] {
  const chars = Array.from(text);
  const tokens: string[] = [];
  const isWord = (c: string) => /[A-Za-z0-9.,%+\-−'’]/.test(c);
  const isKatakana = (c: string) => /[ァ-ヶー]/.test(c);
  const UNIT = "万円件店台個回日年%";
  const NO_HEAD = "。、！？」』）】,.!?ぁぃぅぇぉっゃゅょゎァィゥェォッャュョーヶ〜…・：";
  const OPEN = "「『（【";
  let pending = "";
  for (let i = 0; i < chars.length; ) {
    let tok = chars[i];
    i++;
    if (isWord(tok)) {
      while (i < chars.length && isWord(chars[i])) tok += chars[i++];
      for (let k = 0; k < 2 && i < chars.length && UNIT.includes(chars[i]); k++) tok += chars[i++];
    } else if (isKatakana(tok)) {
      // カタカナの語（ソフマップ・バッテリー）も切らない
      while (i < chars.length && isKatakana(chars[i])) tok += chars[i++];
    }
    if (OPEN.includes(tok)) {
      pending += tok;
      continue;
    }
    tok = pending + tok;
    pending = "";
    if (tokens.length && NO_HEAD.includes(tok[0])) tokens[tokens.length - 1] += tok;
    else tokens.push(tok);
  }
  if (pending) tokens.push(pending);
  const lines: string[] = [];
  let cur = "";
  for (const tok of tokens) {
    if (cur && textEm(cur + tok) > lineEm) {
      lines.push(cur.trim());
      cur = tok.trimStart();
    } else cur += tok;
  }
  if (cur.trim()) lines.push(cur.trim());
  if (lines.length !== 2) return lines;
  // 2行のときは、句読点の後ろで切れるならそこで切る（真ん中にいちばん近いところ）。語の途中で折れた見た目を減らす
  const total = textEm(text);
  let best = -1;
  let bestGap = Infinity;
  let acc = "";
  for (let i = 0; i < tokens.length - 1; i++) {
    acc += tokens[i];
    if (!/[、。！？」]$/.test(acc)) continue;
    const a = textEm(acc.trim());
    if (a > lineEm || total - a > lineEm) continue;
    if (Math.abs(total / 2 - a) < bestGap) {
      bestGap = Math.abs(total / 2 - a);
      best = i;
    }
  }
  if (best < 0) return lines;
  return [tokens.slice(0, best + 1).join("").trim(), tokens.slice(best + 1).join("").trim()];
}

const C = {
  bg: SITE.brand900,
  bar: SITE.brand800,
  white: ON_DARK.white,
  onDarkSub: ON_DARK.sub,
  url: ON_DARK.safe,
  ink: SITE.ink,
  sub: SITE.inkSub,
  red: SITE.price,
  rowAlt: SITE.ground,
  line: SITE.line,
  /** 棒（白の上で brand-600） */
  barFill: SITE.brand600,
  track: SITE.lineSoft,
};

/** 話し手の色（白い文字を載せる。つむぎ inspect-700 5.02・ずんだもん safe 5.47） */
export const SPEAKER_COLOR: Record<Who, string> = { つむぎ: SITE.inspect700, ずんだもん: SITE.safe };
const SPEAKER_NAME: Record<Who, string> = { つむぎ: "春日部つむぎ", ずんだもん: "ずんだもん" };

const row: CSSProperties = { display: "flex", flexDirection: "row", alignItems: "center" };
const col: CSSProperties = { display: "flex", flexDirection: "column" };
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
/** 項目が出る進み具合（0〜1）。0.4 秒で出きる */
const shown = (reveal: Record<string, number>, key: string, t: number) => ease((t - (reveal[key] ?? 0)) / 0.4);

const money = (v: number, unit: BarsScene["unit"]) => (unit === "万円" ? `${v.toFixed(1)}万円` : `${Math.round(v).toLocaleString("ja-JP")}${unit}`);
const signed = (v: number, unit: BarsScene["unit"]) => `${v >= 0 ? "+" : "−"}${money(Math.abs(v), unit)}`;

/** 棒の目盛りの上限（いちばん大きい値の 1.1 倍を、上2桁で切り上げ） */
function axisMax(values: number[]): number {
  const m = Math.max(...values) * 1.1;
  const step = Math.pow(10, Math.floor(Math.log10(m))) / 10;
  return Math.ceil(m / step) * step;
}

// ───────── 中央のカードの中身 ─────────

const INNER_W = CARD.w - CARD.pad * 2;

function Heading({ text, right }: { text: string; right?: ReactNode }) {
  return (
    <div style={{ ...row, justifyContent: "space-between", width: INNER_W, marginBottom: 28 }}>
      <div style={{ display: "flex", fontSize: fitFontSize(text, right ? INNER_W - 480 : INNER_W, 48), fontWeight: 900, color: C.ink }}>{text}</div>
      {right ?? null}
    </div>
  );
}

function Note({ text }: { text?: string }) {
  if (!text) return null;
  return <div style={{ display: "flex", marginTop: "auto", fontSize: fitFontSize(text, INNER_W, 28, 22), fontWeight: 500, color: C.sub }}>{text}</div>;
}

function BigNumber({ s, t, reveal }: { s: BigNumberScene; t: number; reveal: Record<string, number> }) {
  const colW = Math.floor(INNER_W / s.items.length);
  return (
    <div style={{ ...col, width: INNER_W, height: "100%", alignItems: "center" }}>
      <div style={{ display: "flex", marginTop: 24, fontSize: fitFontSize(s.heading, INNER_W, 72), fontWeight: 900, color: C.ink }}>{s.heading}</div>
      <div style={{ ...row, width: INNER_W, marginTop: 56, alignItems: "flex-start" }}>
        {s.items.map((it, i) => {
          const p = shown(reveal, `item:${i}`, t);
          const valueEm = textEm(it.value) + (it.unit ? textEm(it.unit) * 0.45 : 0);
          return (
            <div key={i} style={{ ...col, width: colW, alignItems: "center", opacity: p, borderLeft: i ? `3px solid ${C.line}` : "none" }}>
              {it.label ? <div style={{ display: "flex", fontSize: fitFontSize(it.label, colW - 40, 36, 24), fontWeight: 500, color: C.sub }}>{it.label}</div> : null}
              <div style={{ ...row, alignItems: "flex-end", marginTop: 8 }}>
                <div style={{ display: "flex", fontSize: Math.min(150, Math.floor((colW - 60) / valueEm)), fontWeight: 900, color: C.red, lineHeight: 1.1 }}>{it.value}</div>
                {it.unit ? <div style={{ display: "flex", fontSize: Math.min(64, Math.floor(((colW - 60) / valueEm) * 0.45)), fontWeight: 900, color: C.ink, marginLeft: 6, marginBottom: 14 }}>{it.unit}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
      <Note text={s.note} />
    </div>
  );
}

function Bars({ s, t, reveal }: { s: BarsScene; t: number; reveal: Record<string, number> }) {
  const LABEL = 300, VALUE = 330, GAP = 28;
  const track = INNER_W - LABEL - VALUE - GAP * 2;
  const max = axisMax(s.rows.flatMap((r) => [r.median, r.min ?? 0]));
  const rowH = Math.min(150, Math.floor(440 / s.rows.length));
  // 5行以上（1行 88px 以下）は文字を小さくして、下の補足（売り場・在庫）が次の行に重ならないように（10/24）
  const dense = rowH < 100;
  const F = dense ? { label: 44, sub: 22, value: 44, small: 22 } : { label: 52, sub: 28, value: 56, small: 28 };
  const DOT = 30;
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      {s.rows.map((r, i) => {
        const p = shown(reveal, `item:${i}`, t);
        const pm = r.min !== undefined ? shown(reveal, `min:${i}`, t) : 0;
        const w = Math.max(4, Math.round((track * r.median * p) / max));
        return (
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, opacity: p > 0 ? 1 : 0, borderTop: i ? `2px solid ${C.line}` : "none" }}>
            <div style={{ ...col, width: LABEL }}>
              <div style={{ ...row }}>
                <div style={{ display: "flex", fontSize: fitFontSize(r.label, r.pick ? LABEL - 150 : LABEL - 10, F.label), fontWeight: 900, color: C.ink, lineHeight: dense ? 1.15 : undefined }}>{r.label}</div>
                {r.pick ? <div style={{ display: "flex", flexShrink: 0, marginLeft: 12, padding: "2px 12px", borderRadius: 8, background: C.red, color: C.white, fontSize: 24, fontWeight: 900 }}>おすすめ</div> : null}
              </div>
              {r.sub ? <div style={{ display: "flex", fontSize: F.sub, fontWeight: 500, color: C.sub, lineHeight: dense ? 1.15 : undefined }}>{r.sub}</div> : null}
            </div>
            <div style={{ display: "flex", position: "relative", width: track, height: DOT + 8, marginLeft: GAP, alignItems: "center" }}>
              <div style={{ display: "flex", position: "absolute", left: 0, top: 4, width: track, height: DOT, background: C.track, borderRadius: 8 }} />
              <div style={{ display: "flex", position: "absolute", left: 0, top: 4, width: w, height: DOT, background: C.barFill, borderRadius: 8 }} />
              {r.min !== undefined && pm > 0 ? (
                <div style={{ display: "flex", position: "absolute", left: Math.round((track * r.min) / max) - (DOT + 8) / 2, top: 0, width: DOT + 8, height: DOT + 8, borderRadius: 999, background: C.red, border: `5px solid ${C.white}`, opacity: pm }} />
              ) : null}
            </div>
            <div style={{ ...col, width: VALUE, marginLeft: GAP, opacity: p }}>
              <div style={{ display: "flex", fontSize: F.value, fontWeight: 900, color: C.ink, lineHeight: 1.1 }}>{money(r.median, s.unit)}</div>
              {r.min !== undefined && pm > 0 ? <div style={{ display: "flex", fontSize: 28, fontWeight: 900, color: C.red, opacity: pm }}>{`最安 ${r.minLabel ?? money(r.min, s.unit)}`}</div> : null}
              {r.stock ? <div style={{ display: "flex", fontSize: F.small, fontWeight: 500, color: C.sub, lineHeight: dense ? 1.15 : undefined }}>{r.stock}</div> : null}
            </div>
          </div>
        );
      })}
      <Note text={s.note} />
    </div>
  );
}

function Pairs({ s, t, reveal }: { s: PairsScene; t: number; reveal: Record<string, number> }) {
  const LABEL = 150, DIFF = 250, VALUE = 250, GAP = 24;
  const track = INNER_W - LABEL - DIFF - VALUE - GAP * 2;
  const max = axisMax(s.rows.flatMap((r) => [r.a, r.b]));
  const rowH = Math.min(130, Math.floor(450 / s.rows.length));
  const barH = Math.min(40, Math.floor((rowH - 24) / 2));
  const colors = s.colors.map((k) => SITE[k]);
  const legend = (
    <div style={{ ...row }}>
      {s.legend.map((l, i) => (
        <div key={i} style={{ ...row, marginLeft: 28 }}>
          <div style={{ display: "flex", width: 28, height: 28, borderRadius: 6, background: colors[i] }} />
          <div style={{ display: "flex", marginLeft: 10, fontSize: 28, fontWeight: 900, color: C.ink }}>{l}</div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} right={legend} />
      {s.rows.map((r, i) => {
        const p = shown(reveal, `item:${i}`, t);
        const diff = r.diffLabel ?? signed(r.b - r.a, s.unit);
        return (
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, opacity: p > 0 ? 1 : 0, borderTop: i ? `2px solid ${C.line}` : "none" }}>
            <div style={{ display: "flex", width: LABEL, fontSize: fitFontSize(r.label, LABEL - 10, 52), fontWeight: 900, color: C.ink }}>{r.label}</div>
            <div style={{ ...col, width: track + VALUE, marginLeft: GAP }}>
              {[r.a, r.b].map((v, k) => (
                <div key={k} style={{ ...row, height: barH + 6 }}>
                  <div style={{ display: "flex", width: Math.max(4, Math.round((track * v * p) / max)), height: barH, background: colors[k], borderRadius: 6 }} />
                  <div style={{ display: "flex", marginLeft: 14, fontSize: Math.min(34, barH), fontWeight: 900, color: C.ink, opacity: p }}>{money(v, s.unit)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", width: DIFF, marginLeft: GAP, justifyContent: "flex-end", fontSize: fitFontSize(diff, DIFF, 46), fontWeight: 900, color: C.red, opacity: p }}>{diff}</div>
          </div>
        );
      })}
      <Note text={s.note} />
    </div>
  );
}

function Table({ s, t, reveal }: { s: TableScene; t: number; reveal: Record<string, number> }) {
  // 列の幅は中身のいちばん長い文字に合わせて配る
  const ems = s.columns.map((c, j) => Math.max(textEm(c), ...s.rows.map((r) => textEm(r.cells[j] ?? "")), 3));
  const sum = ems.reduce((a, b) => a + b, 0);
  const widths = ems.map((e) => Math.floor((INNER_W * e) / sum));
  const rowH = Math.min(104, Math.floor(470 / (s.rows.length + 1)));
  const PADX = 28;
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ ...row, width: INNER_W, height: rowH, background: C.bar, borderRadius: "12px 12px 0 0" }}>
        {s.columns.map((c, j) => (
          <div key={j} style={{ display: "flex", width: widths[j], paddingLeft: PADX, fontSize: fitFontSize(c, widths[j] - PADX * 2, 36, 22), fontWeight: 900, color: C.white }}>{c}</div>
        ))}
      </div>
      {s.rows.map((r, i) => {
        const p = shown(reveal, `item:${i}`, t);
        return (
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, background: i % 2 ? C.rowAlt : C.white, borderBottom: `2px solid ${C.line}`, opacity: p }}>
            {s.columns.map((_, j) => {
              const v = r.cells[j] ?? "";
              const em = s.emphasis?.includes(j);
              return (
                <div key={j} style={{ display: "flex", width: widths[j], paddingLeft: PADX, fontSize: fitFontSize(v || "　", widths[j] - PADX * 2, 44, 22), fontWeight: em ? 900 : 500, color: em ? C.red : C.ink }}>{v}</div>
              );
            })}
          </div>
        );
      })}
      <Note text={s.note} />
    </div>
  );
}

function Checklist({ s, t, reveal }: { s: ChecklistScene; t: number; reveal: Record<string, number> }) {
  const rowH = Math.min(150, Math.floor(480 / s.items.length));
  const NUM = 76;
  const textW = INNER_W - NUM - 32;
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      {s.items.map((it, i) => {
        const p = shown(reveal, `item:${i}`, t);
        return (
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, opacity: p, borderTop: i ? `2px solid ${C.line}` : "none" }}>
            <div style={{ display: "flex", width: NUM, height: NUM, borderRadius: 999, background: SITE.safe, color: C.white, fontSize: 44, fontWeight: 900, alignItems: "center", justifyContent: "center" }}>{String(i + 1)}</div>
            <div style={{ ...col, width: textW, marginLeft: 32 }}>
              <div style={{ display: "flex", fontSize: fitFontSize(it.text, textW, 54), fontWeight: 900, color: C.ink }}>{it.text}</div>
              {it.sub ? <div style={{ display: "flex", marginTop: 4, fontSize: fitFontSize(it.sub, textW, 32, 24), fontWeight: 500, color: C.sub }}>{it.sub}</div> : null}
            </div>
          </div>
        );
      })}
      <Note text={s.note} />
    </div>
  );
}

/**
 * 終了画面。YouTube の要素が重なる枠（END_SCREEN）に、動画の題とチャンネル登録の丸を描いておく
 * （要素は枠の上に重ねて置く。終了画面が出ない環境でも何の動画かわかる）
 */
function EndScreen({ s }: { s: EndScreenScene }) {
  const ox = CARD.x + CARD.pad;
  const oy = CARD.y + CARD.pad;
  const sub = END_SCREEN.subscribe;
  const label = "チャンネル登録はこちら";
  return (
    <div style={{ display: "flex", position: "relative", width: INNER_W, height: CARD.h - CARD.pad * 2 }}>
      <div style={{ display: "flex", position: "absolute", left: 0, top: 10, width: INNER_W - sub.size - 480, fontSize: fitFontSize(s.heading, INNER_W - sub.size - 480, 52), fontWeight: 900, color: C.ink }}>{s.heading}</div>
      <div style={{ display: "flex", position: "absolute", left: sub.x - ox - 440, top: sub.y - oy + sub.size / 2 - 24, width: 420, justifyContent: "flex-end", fontSize: 34, fontWeight: 900, color: C.red }}>{`${label} →`}</div>
      <div style={{ display: "flex", position: "absolute", left: sub.x - ox, top: sub.y - oy, width: sub.size, height: sub.size, borderRadius: 999, background: C.barFill, border: `6px dashed ${C.line}`, alignItems: "center", justifyContent: "center", color: C.white, fontSize: 34, fontWeight: 900 }}>登録</div>
      {s.videos.map((v, i) => {
        const b = END_SCREEN.videos[i];
        return (
          <div key={i} style={{ ...col, position: "absolute", left: b.x - ox, top: b.y - oy, width: b.w, height: b.h, padding: "26px 30px", background: C.bg, borderRadius: 16, border: `4px dashed ${C.url}` }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 900, color: C.url }}>{i === 0 ? "次におすすめ" : "こちらもどうぞ"}</div>
            <div style={{ display: "flex", marginTop: 14, width: b.w - 68, fontSize: 38, lineHeight: 1.35, fontWeight: 900, color: C.white }}>{v.title}</div>
          </div>
        );
      })}
      {s.note ? (
        <div style={{ display: "flex", position: "absolute", left: 0, top: END_SCREEN.videos[0].y - oy + END_SCREEN.videos[0].h + 22, width: INNER_W, fontSize: fitFontSize(s.note, INNER_W, 28, 22), fontWeight: 500, color: C.sub }}>{s.note}</div>
      ) : null}
    </div>
  );
}

function SceneBody({ ch, t }: { ch: TimelineChapter; t: number }) {
  const s = ch.scene;
  const reveal = s.reveal;
  switch (s.type) {
    case "bigNumber":
      return <BigNumber s={s} t={t} reveal={reveal} />;
    case "bars":
      return <Bars s={s} t={t} reveal={reveal} />;
    case "pairs":
      return <Pairs s={s} t={t} reveal={reveal} />;
    case "table":
      return <Table s={s} t={t} reveal={reveal} />;
    case "checklist":
      return <Checklist s={s} t={t} reveal={reveal} />;
    case "endScreen":
      return <EndScreen s={s} />;
  }
}

// ───────── いつも出ている枠 ─────────

function ChapterBar({ ch, count }: { ch: TimelineChapter; count: number }) {
  const num = String(ch.index); // ゼロ埋めしない（「9/9」。10/23 ユーザー指示）
  return (
    <div style={{ ...row, position: "absolute", left: HEADER.x, top: HEADER.y, height: HEADER.h, background: C.bar, borderRadius: 14, paddingRight: 32 }}>
      <div style={{ ...row, height: HEADER.h, padding: "0 22px", background: C.red, borderRadius: "14px 0 0 14px", color: C.white, fontSize: 36, fontWeight: 900 }}>{`${num}/${count}`}</div>
      <div style={{ display: "flex", marginLeft: 24, fontSize: fitFontSize(ch.title, 1200, 40), fontWeight: 900, color: C.white }}>{ch.title}</div>
    </div>
  );
}

/** 立ち絵（longform/assets/chara/。video.tsx の loadCharaArt が読む）。src は data URI、w・h は元の画像の大きさ */
export type ArtImage = { src: string; w: number; h: number };
export type CharaArt = Partial<Record<Who, { closed: ArtImage; talk?: ArtImage }>>;

/** 話し手の名前の札（話している人は塗り、もう1人は線だけ） */
function NamePlate({ who, active }: { who: Who; active: boolean }) {
  const color = SPEAKER_COLOR[who];
  return (
    <div
      style={{
        display: "flex", width: SLOT.w - 28, marginBottom: 14, padding: "14px 0", justifyContent: "center", borderRadius: 14,
        background: active ? color : C.bg, border: `3px solid ${active ? color : C.onDarkSub}`,
        color: active ? C.white : C.onDarkSub, fontSize: fitFontSize(SPEAKER_NAME[who], SLOT.w - 60, 34), fontWeight: 900,
      }}
    >
      {SPEAKER_NAME[who]}
    </div>
  );
}

/**
 * 話し手の枠。立ち絵があれば胸から上を高さ ART.imgH で下ぞろえ（枠からはみ出た左右は切る）、名前の札は絵の下に重ねる。
 * 話している人は濃く、もう1人は 0.92 倍・暗く。口の開いた絵（*-talk.png）があり mouthOpen なら、話している人はそちらを使う。
 * 立ち絵がなければ名前の札だけ
 */
function SpeakerSlot({ who, x, active, art, mouthOpen }: { who: Who; x: number; active: boolean; art?: CharaArt[Who]; mouthOpen?: boolean }) {
  const color = SPEAKER_COLOR[who];
  if (art) {
    const img = active && mouthOpen && art.talk ? art.talk : art.closed;
    const h = Math.round(ART.imgH * (active ? 1 : 0.92));
    const w = Math.round((img.w * h) / img.h);
    const left = x === SLOT.left ? ART.left : ART.right;
    return (
      <div style={{ ...col, position: "absolute", left, top: SLOT.y, width: ART.w, height: ART.h, justifyContent: "flex-end", alignItems: "center", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={img.src} width={w} height={h} style={{ position: "absolute", left: Math.round((ART.w - w) / 2), top: ART.h - h, width: w, height: h, opacity: active ? 1 : 0.5 }} />
        <NamePlate who={who} active={active} />
      </div>
    );
  }
  return (
    <div style={{ ...col, position: "absolute", left: x, top: SLOT.y, width: SLOT.w, height: SLOT.h, justifyContent: "flex-end", alignItems: "center", border: `3px dashed ${active ? color : C.bar}`, borderRadius: 20 }}>
      <NamePlate who={who} active={active} />
    </div>
  );
}

function Subtitle({ who, text }: { who: Who | null; text: string }) {
  return (
    <div style={{ ...row, position: "absolute", left: SUB.x, top: SUB.y, width: SUB.w, height: SUB.h, background: C.white, borderRadius: 20, borderLeft: `14px solid ${who ? SPEAKER_COLOR[who] : C.bar}` }}>
      <div style={{ ...row, width: SUB.tag, justifyContent: "center", marginLeft: SUB.padX - 14 }}>
        {who ? (
          <div style={{ display: "flex", padding: "10px 18px", borderRadius: 12, background: SPEAKER_COLOR[who], color: C.white, fontSize: fitFontSize(SPEAKER_NAME[who], SUB.tag - 36, 32), fontWeight: 900 }}>{SPEAKER_NAME[who]}</div>
        ) : null}
      </div>
      <div style={{ ...col, width: SUB_TEXT_W, marginLeft: SUB.gap }}>
        {wrapSubtitle(text).map((l, i) => (
          <div key={i} style={{ display: "flex", fontSize: SUB.font, lineHeight: SUB.lineHeight, fontWeight: 900, color: C.ink, whiteSpace: "nowrap" }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

/** 章の絵が出る秒（2章目からは声の CHAPTER_LEAD 秒前。章のジングルと同時。その間は字幕なし） */
export const chapterShownAt = (c: TimelineChapter) => (c.index > 1 ? c.start - CHAPTER_LEAD : c.start);
/** 章の頭（声の始まり）からの秒。章の絵が先に出ている間は 0（cue の秒 0 の項目は章の絵と一緒に出る） */
export const localAt = (c: TimelineChapter, t: number) => Math.max(0, t - c.start);

/** t 秒（動画の頭から）に映すもの: 章・台詞（行の間は直前の台詞を残す）・字幕のページ */
export function stateAt(tl: Timeline, t: number) {
  const ch = [...tl.chapters].reverse().find((c) => chapterShownAt(c) <= t) ?? tl.chapters[0];
  const li = ch.lines.findLastIndex((l) => l.start <= t);
  const line = li >= 0 ? ch.lines[li] : null;
  const pi = line ? Math.max(0, line.pages.findLastIndex((p) => p.start <= t)) : -1;
  return { ch, li, line, pi, page: line ? line.pages[pi] : null, talking: !!line && t < line.end };
}

export type FrameOpts = {
  /** 項目を 0.4 秒かけて出さず、出る秒で一度に出す（video.tsx。絵が変わるところだけ PNG にするため） */
  instant?: boolean;
  art?: CharaArt;
  /** 話している人の口を開いた絵にする（立ち絵に *-talk.png があるとき） */
  mouthOpen?: boolean;
};

/** 項目が出たか（instant のとき）。reveal は四捨五入してあるので 2ms の余裕を見る */
export const revealedAt = (reveal: Record<string, number>, local: number) => Object.keys(reveal).filter((k) => local >= reveal[k] - 0.002);

/** t 秒（動画の頭から）のコマ */
export function frameAt(tl: Timeline, t: number, opts: FrameOpts = {}): ReactElement {
  const { ch, line, page } = stateAt(tl, t);
  const local = localAt(ch, t);
  const who = line?.who ?? null;
  const date = tl.date.replace(/-/g, "/");
  // instant: 出た項目はずっと前に、まだの項目はずっと後に出ることにする（shown が 1 か 0 になる）
  const shownSet = opts.instant ? new Set(revealedAt(ch.scene.reveal, local)) : null;
  const scene = shownSet ? { ...ch, scene: { ...ch.scene, reveal: Object.fromEntries(Object.keys(ch.scene.reveal).map((k) => [k, shownSet.has(k) ? -1000 : 1000])) } } : ch;
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H, background: C.bg, fontFamily: "Noto Sans JP" }}>
      <ChapterBar ch={ch} count={tl.chapters.length} />
      <div style={{ display: "flex", position: "absolute", right: 48, top: HEADER.y + 18, fontSize: 30, fontWeight: 900, color: C.url }}>used.gadelog.com</div>
      <SpeakerSlot who="ずんだもん" x={SLOT.left} active={who === "ずんだもん"} art={opts.art?.ずんだもん} mouthOpen={opts.mouthOpen} />
      <SpeakerSlot who="つむぎ" x={SLOT.right} active={who === "つむぎ"} art={opts.art?.つむぎ} mouthOpen={opts.mouthOpen} />
      <div style={{ ...col, position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, padding: CARD.pad, background: C.white, borderRadius: 24 }}>
        <SceneBody ch={scene} t={local} />
      </div>
      <Subtitle who={who} text={page?.text ?? ""} />
      <div style={{ display: "flex", position: "absolute", left: SUB.x + 8, top: FOOT_Y, fontSize: 26, fontWeight: 500, color: C.onDarkSub }}>{`${date} 時点・大手中古ショップ${tl.shops}店の在庫から`}</div>
    </div>
  );
}
