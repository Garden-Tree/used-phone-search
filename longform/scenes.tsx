/**
 * 横動画の1コマ（1920x1080）。frameAt(timeline, t) が t 秒（動画の頭から）のコマを返す。ImageResponse（next/og）で PNG にする
 *
 * 配置（10/29〜。下の LAYOUTS.d1。それまでの配置は LONGFORM_LAYOUT=legacy）:
 *   上   y24〜96     左上に章の帯（番号＋章の名前）・右上に URL
 *   中央 x190〜1730  白いカード（y112〜872。グラフ・表。data.json の scene を描く）
 *   左右 x0〜180 / x1740〜1920  立ち絵（高さ 300px・カードの下にそろえる。longform/assets/chara/ になければ名前の札だけ）。
 *                名前の札は頭から 10 秒だけ
 *   下   y880〜1042  字幕（白い帯・白の文字＋話し手の色の縁・帯の端の色の線は話している人の側・2行まで。帯の下は再生バーの分あける）
 *   最下行なし（データの日付と店の数は説明欄 youtube.txt）
 *   終了画面（最後の章が endScreen のとき）: カードの中に YouTube の終了画面の要素を置く枠（下の END_SCREEN）。最後の 20 秒
 * 色は lib/brandColors.ts だけ（白いカードの上は SITE、紺の地の上は ON_DARK）
 */
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { ON_DARK, SITE } from "@/lib/brandColors";
import { CHAPTER_LEAD, type Who } from "./script";
import type { BarsScene, BigNumberScene, ChecklistScene, EndScreenScene, PairsScene, TableScene, Timeline, TimelineChapter } from "./types";

export const W = 1920;
export const H = 1080;
export const FPS = 30;

/**
 * 文字の最小（px・1920x1080。10/29 ユーザー指摘「5、6分あたりが文字小さい」「まとめも小さい」）。
 * 本文（見出し・表のセルと見出し行・棒のラベルと値と補足・bigNumber のラベルと値・リストの補足）は MIN_FONT、
 * 脚注（カード下の注記・最下行の日付と出典）は MIN_FOOT。
 * 収まらないときは縮めずに fontProblems が知らせる（render.ts stills・video.tsx が止まる）。data.json の文字を短くして収める
 */
export const MIN_FONT = 34;
export const MIN_FOOT = 22;

/** fontProblems が中身を調べている間だけ、最小に届かない文字をここにためる */
let probe: string[] | null = null;
const report = (msg: string) => {
  if (probe) probe.push(msg);
};

/**
 * 1行に収まる文字の大きさ（px）。数え方は lib/ogFont.ts の fitFontSize と同じ。
 * min に届かなければ min で描き（はみ出す）、fontProblems に知らせる
 */
function fit(text: string, maxWidth: number, maxSize: number, min = MIN_FONT, what = "文字"): number {
  const need = Math.floor(maxWidth / Math.max(0.1, textEm(text)));
  if (need < min) report(`${what}「${text}」は ${need}px にしないと入らない（最小 ${min}px・幅 ${Math.round(maxWidth)}px）`);
  return Math.max(min, Math.min(maxSize, need));
}

const HEADER = { x: 40, y: 24, h: 72 };

/**
 * 画面の配置（1か所にまとめる）。既定は d1（10/29 ユーザーが案 D1 に決めた）。LONGFORM_LAYOUT=legacy でそれまでの配置（10/21〜10/29 に出した回）
 *
 * - card: 中央の白いカード。scale: カードの中の文字の上限（見出し 48px・表 44px など）に掛ける倍率
 * - art: 立ち絵の枠（絵の高さ imgH で枠の下にそろえる。はみ出た左右は切る）
 * - plate: 立ち絵の下の名前の札（always＝いつも・first10＝頭から NAME_FIRST_SEC 秒だけ）
 * - sub: 字幕の帯（白）。tag＝帯の中の名前の札（always・never）・tagW＝その幅、edge＝白の文字を話し手の色で縁取る太さ（0＝黒の文字）、
 *        edgeSide＝帯の端の色の線を付ける側（left＝いつも左・speaker＝話している人の側。ずんだもんは左・つむぎは右）
 * - footY: 最下行（データの日付と店の数）の y。null なら出さない（説明欄に入れる。video.tsx の youtubeText）
 */
type Layout = {
  card: { x: number; y: number; w: number; h: number; pad: number; scale: number };
  art: { w: number; y: number; h: number; imgH: number; left: number; right: number };
  /** 立ち絵がないときの枠（名前の札だけ） */
  slot: { y: number; w: number; h: number; left: number; right: number };
  plate: { w: number; font: number; show: "always" | "first10" };
  sub: { x: number; y: number; w: number; h: number; tag: "always" | "never"; tagW: number; padX: number; gap: number; font: number; lineHeight: number; edge: number; edgeSide: "left" | "speaker" };
  footY: number | null;
};
const LAYOUTS: Record<string, Layout> = {
  /** 10/29 までの配置。立ち絵の枠: 画面の端からカードの手前まで（左 x0〜280・右 x1640〜1920）・絵の高さ 560px。字幕 50px の黒い文字・帯の中に名前の札・最下行あり */
  legacy: {
    card: { x: 290, y: 116, w: 1340, h: 676, pad: 52, scale: 1 },
    art: { w: 280, y: 116, h: 676, imgH: 560, left: 0, right: W - 280 },
    slot: { y: 116, w: 226, h: 676, left: 40, right: W - 40 - 226 },
    plate: { w: 198, font: 34, show: "always" },
    sub: { x: 40, y: 812, w: W - 80, h: 200, tag: "always", tagW: 210, padX: 36, gap: 30, font: 50, lineHeight: 1.4, edge: 0, edgeSide: "left" },
    footY: 1024,
  },
  /**
   * 10/29〜（案 D1）: 立ち絵を小さく（高さ 300px）・カードを広く 1540x760（文字の上限 1.15 倍）・字幕 60px（白の文字＋話し手の色の縁 6px）。
   * 帯の中の名前の札は出さない・立ち絵の下の札は頭から 10 秒だけ・最下行なし。帯の下は 38px あける（YouTube の再生バー）
   */
  d1: {
    card: { x: 190, y: 112, w: 1540, h: 760, pad: 48, scale: 1.15 },
    art: { w: 180, y: 112, h: 760, imgH: 300, left: 0, right: W - 180 },
    slot: { y: 112, w: 170, h: 760, left: 10, right: W - 180 },
    plate: { w: 172, font: 26, show: "first10" },
    sub: { x: 40, y: 880, w: W - 80, h: 162, tag: "never", tagW: 200, padX: 36, gap: 20, font: 60, lineHeight: 1.18, edge: 6, edgeSide: "speaker" },
    footY: null,
  },
};
export const LAYOUT_NAME = process.env.LONGFORM_LAYOUT && LAYOUTS[process.env.LONGFORM_LAYOUT] ? process.env.LONGFORM_LAYOUT : "d1";
const L = LAYOUTS[LAYOUT_NAME];
const CARD = L.card;
const SLOT = L.slot;
const SUB = L.sub;
const FOOT_Y = L.footY;
/** カードの中の文字の上限（px）。legacy では元の値のまま */
const cap = (px: number) => Math.round(px * CARD.scale);

/**
 * 終了画面（YouTube Studio の「終了画面」で要素を重ねる場所。画面の座標・1920x1080）。
 * YouTube の決まり（support.google.com/youtube/answer/6388789・10/25 確認）: 動画の最後の 5〜20 秒・動画は 25 秒以上・
 * 16:9 なら要素は4つまで・位置はプレーヤーの上でドラッグ（グリッドに合わせられる）。要素の大きさの決まりは書かれていない。
 * ここでは「動画2枠（16:9）＋チャンネル登録（丸）」を横一列に置く。字幕と章の帯には重ねない（立ち絵には重なる。要素が出ている間は隠れる）。
 * 大きさは Studio が実際に置く要素に合わせる（10/25 に6本目の本番で測った値: 動画は幅 32.5%＝624px・16:9、登録は約 296px 四方）。
 * 5・6本目は動画 600px と登録 132px の枠をカードの中に描いていたため、Studio の要素が収まらず、2本目の動画と登録が重なって下にずらすしかなかった
 */
const ES_VIDEO_W = 624;
const ES_VIDEO_H = 351;
const ES_SUB = 296;
const ES_GAP = 20;
const ES_LEFT = Math.round((W - (ES_VIDEO_W * 2 + ES_GAP + 40 + ES_SUB)) / 2);
export const END_SCREEN = {
  /** 終了画面の長さ（秒。YouTube の上限）。最後の章の絵が出てから動画の終わりまでをこの秒数にする（足りなければ最後に BGM だけの間を足す） */
  sec: 20,
  videos: [
    { x: ES_LEFT, y: 300, w: ES_VIDEO_W, h: ES_VIDEO_H },
    { x: ES_LEFT + ES_VIDEO_W + ES_GAP, y: 300, w: ES_VIDEO_W, h: ES_VIDEO_H },
  ],
  subscribe: { x: ES_LEFT + ES_VIDEO_W * 2 + ES_GAP + 40, y: 300 + Math.round((ES_VIDEO_H - ES_SUB) / 2), size: ES_SUB },
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

/** 字幕の文字の幅（px）と1行に入れる量（em。太字の英数字の幅の揺れを見込んで 0.95）。帯の中の名前の札がなければ、端の色の線 14px を引く */
const SUB_TEXT_W = SUB.tag === "always" ? SUB.w - SUB.tagW - SUB.padX * 2 - SUB.gap : SUB.w - SUB.padX * 2 - 14;
export const SUB_LINE_EM = (SUB_TEXT_W / SUB.font) * 0.95;
/** 名前の札（first10）を出しておく秒 */
const NAME_FIRST_SEC = 10;

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

function Heading({ text, rightW = 0, right }: { text: string; rightW?: number; right?: ReactNode }) {
  return (
    <div style={{ ...row, justifyContent: "space-between", width: INNER_W, marginBottom: 28 }}>
      <div style={{ display: "flex", fontSize: fit(text, INNER_W - rightW, cap(48), MIN_FONT, "見出し"), fontWeight: 900, color: C.ink }}>{text}</div>
      {right ?? null}
    </div>
  );
}

/** 脚注の大きさ（折り返してよい。最小 MIN_FOOT） */
const noteFont = (text: string) => Math.max(MIN_FOOT, Math.min(28, Math.floor(INNER_W / textEm(text))));
/** 脚注の高さ（px。行数は幅の目安から。行の高さは Noto Sans JP の 1.45 倍） */
const noteH = (text?: string) => {
  if (!text) return 0;
  const w = textEm(text) * noteFont(text);
  return (w <= INNER_W ? 1 : Math.ceil((w * 1.03) / INNER_W)) * Math.ceil(noteFont(text) * 1.45) + 8;
};
/** 見出し（Heading）の高さ（px。下の余白 28 を含む） */
const headingH = (text: string, rightW = 0) => Math.ceil(Math.max(MIN_FONT, Math.min(cap(48), Math.floor((INNER_W - rightW) / textEm(text)))) * 1.45) + 28;
/**
 * 見出しと脚注を除いた、表・棒に使える高さ（px）。脚注が長いと行が低くなる（10/29: 行の高さを決め打ちにしていて、3行の脚注がカードの外にはみ出た）
 */
const bodyH = (heading: string, note?: string, rightW = 0) => CARD.h - CARD.pad * 2 - headingH(heading, rightW) - noteH(note);

/** 脚注 */
function Note({ text }: { text?: string }) {
  if (!text) return null;
  return <div style={{ display: "flex", marginTop: "auto", fontSize: noteFont(text), fontWeight: 500, color: C.sub }}>{text}</div>;
}

function BigNumber({ s, t, reveal }: { s: BigNumberScene; t: number; reveal: Record<string, number> }) {
  const colW = Math.floor(INNER_W / s.items.length);
  // 値・単位・ラベルの大きさは全項目で同じ（いちばん窮屈な項目に合わせる。項目ごとに決めると値段の高さがそろわない。10/29 ユーザー指摘）
  const valueFont = Math.min(cap(150), ...s.items.map((it) => {
    // 単位は値の 0.45 倍の大きさで横に並ぶ
    const need = Math.floor((colW - 40) / (textEm(it.value) + (it.unit ? textEm(it.unit) * 0.45 : 0)));
    if (need < MIN_FONT) report(`大きな数字「${it.value}${it.unit ?? ""}」は ${need}px にしないと入らない（最小 ${MIN_FONT}px）`);
    return Math.max(MIN_FONT, need);
  }));
  const unitFont = Math.min(cap(64), Math.floor(valueFont * 0.45));
  const labels = s.items.map((it) => it.label).filter((l): l is string => !!l);
  const labelFont = labels.length ? Math.min(...labels.map((l) => fit(l, colW - 40, cap(36), MIN_FONT, "数字のラベル"))) : 0;
  return (
    <div style={{ ...col, width: INNER_W, height: "100%", alignItems: "center" }}>
      <div style={{ display: "flex", marginTop: 24, fontSize: fit(s.heading, INNER_W, cap(72), MIN_FONT, "見出し"), fontWeight: 900, color: C.ink }}>{s.heading}</div>
      {/* 下ぞろえ（ラベルのない項目があっても値の下の線がそろう） */}
      <div style={{ ...row, width: INNER_W, marginTop: 56, alignItems: "flex-end" }}>
        {s.items.map((it, i) => {
          const p = shown(reveal, `item:${i}`, t);
          return (
            <div key={i} style={{ ...col, width: colW, flexShrink: 0, alignItems: "center", opacity: p, borderLeft: i ? `3px solid ${C.line}` : "none" }}>
              {it.label ? <div style={{ display: "flex", fontSize: labelFont, fontWeight: 500, color: C.sub, whiteSpace: "nowrap" }}>{it.label}</div> : null}
              <div style={{ ...row, alignItems: "flex-end", marginTop: 8 }}>
                <div style={{ display: "flex", fontSize: valueFont, fontWeight: 900, color: C.red, lineHeight: 1.1, whiteSpace: "nowrap" }}>{it.value}</div>
                {it.unit ? <div style={{ display: "flex", fontSize: unitFont, fontWeight: 900, color: C.ink, marginLeft: 6, marginBottom: Math.round(valueFont * 0.1) }}>{it.unit}</div> : null}
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
  const LABEL = cap(340), VALUE = cap(300), GAP = 28, PICK = 190;
  const track = INNER_W - LABEL - VALUE - GAP * 2;
  const max = axisMax(s.rows.flatMap((r) => [r.median, r.min ?? 0]));
  const rowH = Math.min(cap(150), Math.floor(bodyH(s.heading, s.note) / s.rows.length));
  // 1行 100px 未満か、補足が2行（sub に改行）の行があれば行の間を詰める（10/24・10/25）。補足・在庫も本文なので MIN_FONT より小さくしない（10/29）
  const dense = rowH < 100 || s.rows.some((r) => r.sub?.includes("\n"));
  const LH = dense ? 1.1 : 1.2;
  // 上限を広げた配置（scale > 1）でも、ラベル＋補足1行・値＋在庫が行の高さに入る大きさまで（legacy では 44・52・56 のまま）
  const fitRow = (px: number, lh: number) => (CARD.scale > 1 ? Math.max(MIN_FONT, Math.min(px, Math.floor((rowH - MIN_FONT * LH) / lh))) : px);
  const F = dense
    ? { label: fitRow(cap(44), LH), sub: MIN_FONT, value: fitRow(cap(44), 1.1), small: MIN_FONT }
    : { label: fitRow(cap(52), LH), sub: MIN_FONT, value: fitRow(cap(56), 1.1), small: MIN_FONT };
  const DOT = 30;
  const MIN_H = MIN_FONT + 4;
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      {s.rows.map((r, i) => {
        const p = shown(reveal, `item:${i}`, t);
        const pm = r.min !== undefined ? shown(reveal, `min:${i}`, t) : 0;
        const w = Math.max(4, Math.round((track * r.median * p) / max));
        const subs = (r.sub ?? "").split("\n").filter(Boolean);
        const labelFont = fit(r.label, r.pick ? LABEL - PICK : LABEL - 10, F.label, MIN_FONT, "棒のラベル");
        for (const line of subs) fit(line, LABEL - 10, F.sub, MIN_FONT, "棒の補足");
        // 縦: ラベル＋補足・値＋在庫・棒＋最安が行の高さに入るか
        const needH = Math.max(labelFont * LH + subs.length * F.sub * LH, F.value * 1.1 + (r.stock ? F.small * LH : 0), DOT + 8 + (r.min !== undefined ? MIN_H : 0));
        if (needH > rowH + 2) report(`棒の行「${r.label}」は高さ ${Math.round(needH)}px 要るが ${rowH}px しかない（行を減らすか補足を短く）`);
        return (
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, opacity: p > 0 ? 1 : 0, borderTop: i ? `2px solid ${C.line}` : "none" }}>
            <div style={{ ...col, width: LABEL }}>
              <div style={{ ...row }}>
                <div style={{ display: "flex", fontSize: labelFont, fontWeight: 900, color: C.ink, lineHeight: LH, whiteSpace: "nowrap" }}>{r.label}</div>
                {r.pick ? <div style={{ display: "flex", flexShrink: 0, marginLeft: 12, padding: "0 12px", borderRadius: 8, background: C.red, color: C.white, fontSize: MIN_FONT, fontWeight: 900 }}>おすすめ</div> : null}
              </div>
              {subs.map((line, k) => (
                <div key={k} style={{ display: "flex", fontSize: F.sub, fontWeight: 500, color: C.sub, lineHeight: LH, whiteSpace: "nowrap" }}>{line}</div>
              ))}
            </div>
            {/* 最安は赤い点の下に（右の列に3行並べると、5行の表で次の行の罫線に重なった。10/25） */}
            <div style={{ display: "flex", position: "relative", width: track, height: DOT + 8 + (r.min !== undefined ? MIN_H : 0), marginLeft: GAP, alignItems: "flex-start" }}>
              <div style={{ display: "flex", position: "absolute", left: 0, top: 4, width: track, height: DOT, background: C.track, borderRadius: 8 }} />
              <div style={{ display: "flex", position: "absolute", left: 0, top: 4, width: w, height: DOT, background: C.barFill, borderRadius: 8 }} />
              {r.min !== undefined && pm > 0 ? (
                <div style={{ display: "flex", position: "absolute", left: Math.round((track * r.min) / max) - (DOT + 8) / 2, top: 0, width: DOT + 8, height: DOT + 8, borderRadius: 999, background: C.red, border: `5px solid ${C.white}`, opacity: pm }} />
              ) : null}
              {r.min !== undefined && pm > 0 ? (
                <div style={{ display: "flex", position: "absolute", left: Math.max(0, Math.round((track * r.min) / max) - 40), top: DOT + 10, fontSize: MIN_H - 4, fontWeight: 900, color: C.red, opacity: pm, whiteSpace: "nowrap" }}>{`最安 ${r.minLabel ?? money(r.min, s.unit)}`}</div>
              ) : null}
            </div>
            <div style={{ ...col, width: VALUE, marginLeft: GAP, opacity: p }}>
              <div style={{ display: "flex", fontSize: fit(money(r.median, s.unit), VALUE, F.value, MIN_FONT, "棒の値"), fontWeight: 900, color: C.ink, lineHeight: 1.1, whiteSpace: "nowrap" }}>{money(r.median, s.unit)}</div>
              {r.stock ? <div style={{ display: "flex", fontSize: F.small, fontWeight: 500, color: C.sub, lineHeight: LH }}>{r.stock}</div> : null}
            </div>
          </div>
        );
      })}
      <Note text={s.note} />
    </div>
  );
}

function Pairs({ s, t, reveal }: { s: PairsScene; t: number; reveal: Record<string, number> }) {
  const LABEL = cap(170), DIFF = cap(250), VALUE = cap(250), GAP = 24;
  const track = INNER_W - LABEL - DIFF - VALUE - GAP * 2;
  const max = axisMax(s.rows.flatMap((r) => [r.a, r.b]));
  const rowH = Math.min(cap(130), Math.floor(cap(450) / s.rows.length));
  const barH = Math.min(40, Math.floor((rowH - 24) / 2));
  const valueFont = MIN_FONT;
  if (barH + 6 < valueFont) report(`2本の棒の行が低すぎる（棒 ${barH}px・値は ${valueFont}px。行を減らす）`);
  const colors = s.colors.map((k) => SITE[k]);
  const LEG = MIN_FONT;
  const legendW = s.legend.reduce((w, l) => w + 28 + LEG + 10 + Math.ceil(textEm(l) * LEG), 0);
  const legend = (
    <div style={{ ...row }}>
      {s.legend.map((l, i) => (
        <div key={i} style={{ ...row, marginLeft: 28 }}>
          <div style={{ display: "flex", width: LEG, height: LEG, borderRadius: 6, background: colors[i] }} />
          <div style={{ display: "flex", marginLeft: 10, fontSize: LEG, fontWeight: 900, color: C.ink, whiteSpace: "nowrap" }}>{l}</div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} rightW={legendW + 20} right={legend} />
      {s.rows.map((r, i) => {
        const p = shown(reveal, `item:${i}`, t);
        const diff = r.diffLabel ?? signed(r.b - r.a, s.unit);
        return (
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, opacity: p > 0 ? 1 : 0, borderTop: i ? `2px solid ${C.line}` : "none" }}>
            <div style={{ display: "flex", width: LABEL, fontSize: fit(r.label, LABEL - 10, cap(52), MIN_FONT, "2本の棒のラベル"), fontWeight: 900, color: C.ink, whiteSpace: "nowrap" }}>{r.label}</div>
            <div style={{ ...col, width: track + VALUE, marginLeft: GAP }}>
              {[r.a, r.b].map((v, k) => (
                <div key={k} style={{ ...row, height: barH + 6 }}>
                  <div style={{ display: "flex", width: Math.max(4, Math.round((track * v * p) / max)), height: barH, background: colors[k], borderRadius: 6 }} />
                  <div style={{ display: "flex", marginLeft: 14, fontSize: fit(money(v, s.unit), VALUE - 14, valueFont, MIN_FONT, "2本の棒の値"), fontWeight: 900, color: C.ink, opacity: p, whiteSpace: "nowrap" }}>{money(v, s.unit)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", width: DIFF, marginLeft: GAP, justifyContent: "flex-end", fontSize: fit(diff, DIFF, cap(46), MIN_FONT, "差"), fontWeight: 900, color: C.red, opacity: p, whiteSpace: "nowrap" }}>{diff}</div>
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
  const PADX = 24;
  // 左の余白は列ごとに同じだけ取り、残りを文字の長さで分ける（幅だけを比で分けると、短い列ほど余白に食われて字が小さくなる）
  const textW = INNER_W - PADX * 2 * s.columns.length;
  const widths = ems.map((e) => PADX * 2 + Math.floor((textW * e) / sum));
  const rowH = Math.min(cap(104), Math.floor(bodyH(s.heading, s.note) / (s.rows.length + 1)));
  // 文字の大きさは表の中でそろえる（いちばん窮屈なセルに合わせる。セルごとに縮めると大小がまざって読みにくい）。MIN_FONT に届かないセルは fontProblems が知らせる
  // 列の幅は文字の長さに比例するので、どのセルもほぼ textW / sum の大きさになる。届かなければ表ごとに1回だけ知らせる（各列のいちばん長いセルを添える）
  const need = Math.min(...s.columns.flatMap((_, j) => s.rows.map((r) => Math.floor((widths[j] - PADX * 2) / Math.max(0.1, textEm(r.cells[j] || "　"))))));
  if (need < MIN_FONT) {
    const longest = s.columns.map((_, j) => s.rows.map((r) => r.cells[j] ?? "").reduce((a, b) => (textEm(b) > textEm(a) ? b : a), ""));
    report(`表の文字が ${need}px になる（最小 ${MIN_FONT}px）。列のいちばん長い文字の合計 ${sum.toFixed(1)}em、${s.columns.length}列なら ${(textW / MIN_FONT).toFixed(1)}em まで。長い順: ${longest.map((c, j) => `「${c || s.columns[j]}」${ems[j].toFixed(1)}em`).join("・")}`);
  }
  const cellFont = Math.max(MIN_FONT, Math.min(cap(44), need, Math.floor(rowH / 1.2)));
  const headFont = Math.min(...s.columns.map((c, j) => fit(c || "　", widths[j] - PADX * 2, cap(36), MIN_FONT, "表の見出し行")));
  if (cellFont * 1.2 > rowH) report(`表の行が低すぎる（${s.rows.length}行・1行 ${rowH}px に ${cellFont}px の文字。行を減らす）`);
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ ...row, width: INNER_W, height: rowH, background: C.bar, borderRadius: "12px 12px 0 0" }}>
        {s.columns.map((c, j) => (
          <div key={j} style={{ display: "flex", width: widths[j], paddingLeft: PADX, fontSize: headFont, fontWeight: 900, color: C.white, whiteSpace: "nowrap" }}>{c}</div>
        ))}
      </div>
      {s.rows.map((r, i) => {
        const p = shown(reveal, `item:${i}`, t);
        return (
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, background: i % 2 ? C.rowAlt : C.white, borderBottom: `2px solid ${C.line}`, opacity: p }}>
            {s.columns.map((_, j) => {
              const v = r.cells[j] ?? "";
              const em = (r.emphasis ?? s.emphasis)?.includes(j);
              return (
                <div key={j} style={{ display: "flex", width: widths[j], paddingLeft: PADX, fontSize: cellFont, fontWeight: em ? 900 : 500, color: em ? C.red : C.ink, whiteSpace: "nowrap" }}>{v}</div>
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
  const rowH = Math.min(cap(150), Math.floor(cap(480) / s.items.length));
  const NUM = cap(76);
  const textW = INNER_W - NUM - 32;
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      {s.items.map((it, i) => {
        const p = shown(reveal, `item:${i}`, t);
        return (
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, opacity: p, borderTop: i ? `2px solid ${C.line}` : "none" }}>
            <div style={{ display: "flex", width: NUM, height: NUM, borderRadius: 999, background: SITE.safe, color: C.white, fontSize: cap(44), fontWeight: 900, alignItems: "center", justifyContent: "center" }}>{String(i + 1)}</div>
            <div style={{ ...col, width: textW, marginLeft: 32 }}>
              <div style={{ display: "flex", fontSize: fit(it.text, textW, cap(54), MIN_FONT, "リストの行"), fontWeight: 900, color: C.ink }}>{it.text}</div>
              {it.sub ? <div style={{ display: "flex", marginTop: 4, fontSize: fit(it.sub, textW, cap(36), MIN_FONT, "リストの補足"), fontWeight: 500, color: C.sub }}>{it.sub}</div> : null}
            </div>
          </div>
        );
      })}
      <Note text={s.note} />
    </div>
  );
}

/**
 * 終了画面のカードの中身（見出しと注記だけ）。要素を置く枠は EndScreenSlots が画面の座標で上に重ねる
 */
function EndScreen({ s }: { s: EndScreenScene }) {
  const oy = CARD.y + CARD.pad;
  return (
    <div style={{ display: "flex", position: "relative", width: INNER_W, height: CARD.h - CARD.pad * 2 }}>
      <div style={{ display: "flex", position: "absolute", left: 0, top: 10, width: INNER_W, fontSize: fit(s.heading, INNER_W, cap(52), MIN_FONT, "見出し"), fontWeight: 900, color: C.ink }}>{s.heading}</div>
      {s.note ? (
        <div style={{ display: "flex", position: "absolute", left: 0, top: END_SCREEN.videos[0].y - oy + END_SCREEN.videos[0].h + 22, width: INNER_W, fontSize: Math.max(MIN_FOOT, Math.min(28, Math.floor(INNER_W / textEm(s.note)))), fontWeight: 500, color: C.sub }}>{s.note}</div>
      ) : null}
    </div>
  );
}

/**
 * 終了画面の要素を置く枠（END_SCREEN・画面の座標）。カードと立ち絵の上に重ねて、動画の題とチャンネル登録の丸を描く
 * （Studio で要素をこの枠に合わせて置く。終了画面が出ない環境でも何の動画かわかる）
 */
function EndScreenSlots({ s }: { s: EndScreenScene }) {
  const sub = END_SCREEN.subscribe;
  return (
    <>
      {s.videos.map((v, i) => {
        const b = END_SCREEN.videos[i];
        return (
          <div key={i} style={{ ...col, position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, padding: "26px 30px", background: C.bg, borderRadius: 16, border: `4px dashed ${C.url}` }}>
            <div style={{ display: "flex", fontSize: MIN_FONT, fontWeight: 900, color: C.url }}>{i === 0 ? "次におすすめ" : "こちらもどうぞ"}</div>
            <div style={{ display: "flex", marginTop: 14, width: b.w - 68, fontSize: 38, lineHeight: 1.35, fontWeight: 900, color: C.white }}>{v.title}</div>
          </div>
        );
      })}
      <div style={{ display: "flex", position: "absolute", left: sub.x, top: sub.y, width: sub.size, height: sub.size, borderRadius: 999, background: C.barFill, border: `6px dashed ${C.line}`, alignItems: "center", justifyContent: "center", color: C.white, fontSize: 56, fontWeight: 900 }}>登録</div>
      <div style={{ display: "flex", position: "absolute", left: sub.x - 40, top: sub.y + sub.size + 16, width: sub.size + 80, justifyContent: "center", fontSize: MIN_FONT, fontWeight: 900, color: C.url }}>チャンネル登録</div>
    </>
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
      <div style={{ display: "flex", marginLeft: 24, fontSize: fit(ch.title, 1200, 40, MIN_FONT, "章の帯"), fontWeight: 900, color: C.white }}>{ch.title}</div>
    </div>
  );
}

/** 立ち絵（longform/assets/chara/。video.tsx の loadCharaArt が読む）。src は data URI、w・h は元の画像の大きさ */
export type ArtImage = { src: string; w: number; h: number };
export type CharaArt = Partial<Record<Who, { closed: ArtImage; talk?: ArtImage }>>;

/** 話し手の名前の札（話している人は塗り、もう1人は線だけ） */
function NamePlate({ who, active, style }: { who: Who; active: boolean; style?: CSSProperties }) {
  const color = SPEAKER_COLOR[who];
  return (
    <div
      style={{
        display: "flex", width: L.plate.w, marginBottom: 14, padding: "14px 0", justifyContent: "center", borderRadius: 14,
        background: active ? color : C.bg, border: `3px solid ${active ? color : C.onDarkSub}`,
        color: active ? C.white : C.onDarkSub, fontSize: Math.min(L.plate.font, Math.floor((L.plate.w - 32) / textEm(SPEAKER_NAME[who]))), fontWeight: 900,
        ...style,
      }}
    >
      {SPEAKER_NAME[who]}
    </div>
  );
}

/**
 * 話し手の枠。立ち絵があれば高さ art.imgH で下ぞろえ（枠からはみ出た左右は切る）、名前の札は絵の下に重ねる。
 * 話している人は濃く、もう1人は 0.92 倍・暗く。口の開いた絵（*-talk.png）があり mouthOpen なら、話している人はそちらを使う。
 * 立ち絵がなければ名前の札だけ
 */
function SpeakerSlot({ who, x, active, art, mouthOpen, plate }: { who: Who; x: number; active: boolean; art?: CharaArt[Who]; mouthOpen?: boolean; plate: boolean }) {
  const color = SPEAKER_COLOR[who];
  const A = L.art;
  if (art) {
    const img = active && mouthOpen && art.talk ? art.talk : art.closed;
    const h = Math.round(A.imgH * (active ? 1 : 0.92));
    const w = Math.round((img.w * h) / img.h);
    const left = x === SLOT.left ? A.left : A.right;
    return (
      <div style={{ ...col, position: "absolute", left, top: A.y, width: A.w, height: A.h, justifyContent: "flex-end", alignItems: "center", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={img.src} width={w} height={h} style={{ position: "absolute", left: Math.round((A.w - w) / 2), top: A.h - h, width: w, height: h, opacity: active ? 1 : 0.5 }} />
        {plate ? <NamePlate who={who} active={active} /> : null}
      </div>
    );
  }
  return (
    <div style={{ ...col, position: "absolute", left: x, top: SLOT.y, width: SLOT.w, height: SLOT.h, justifyContent: "flex-end", alignItems: "center", border: `3px dashed ${active ? color : C.bar}`, borderRadius: 20 }}>
      <NamePlate who={who} active={active} />
    </div>
  );
}

/**
 * 字幕の1行。edge のときは白い文字を話し手の色で縁取る（袋文字: 縁取りした文字の上に、縁なしの白い文字を重ねる。
 * WebkitTextStroke は線の中心が字の輪郭で内側にも食い込むので、外へ出す太さの2倍の縁の層と、白の層を2枚重ねる）
 */
function SubLine({ text, who }: { text: string; who: Who | null }) {
  const base: CSSProperties = { display: "flex", fontSize: SUB.font, lineHeight: SUB.lineHeight, fontWeight: 900, whiteSpace: "nowrap" };
  if (!SUB.edge) return <div style={{ ...base, color: C.ink }}>{text}</div>;
  const edge = who ? SPEAKER_COLOR[who] : C.bar;
  return (
    <div style={{ display: "flex", position: "relative" }}>
      <div style={{ ...base, color: edge, WebkitTextStroke: `${SUB.edge * 2}px ${edge}` }}>{text}</div>
      <div style={{ ...base, position: "absolute", left: 0, top: 0, color: C.white }}>{text}</div>
    </div>
  );
}

function Subtitle({ who, text }: { who: Who | null; text: string }) {
  // 帯の端の色の線: いつも左か、話している人の側（つむぎは右）
  const right = SUB.edgeSide === "speaker" && who === "つむぎ";
  const edgeLine = `14px solid ${who ? SPEAKER_COLOR[who] : C.bar}`;
  const tag = SUB.tag === "always";
  return (
    <div style={{ ...row, position: "absolute", left: SUB.x, top: SUB.y, width: SUB.w, height: SUB.h, background: C.white, borderRadius: 20, borderLeft: right ? "none" : edgeLine, borderRight: right ? edgeLine : "none" }}>
      {tag ? (
        <div style={{ ...row, width: SUB.tagW, justifyContent: "center", marginLeft: SUB.padX - 14 }}>
          {who ? (
            <div style={{ display: "flex", padding: "10px 18px", borderRadius: 12, background: SPEAKER_COLOR[who], color: C.white, fontSize: Math.min(32, Math.floor((SUB.tagW - 36) / textEm(SPEAKER_NAME[who]))), fontWeight: 900 }}>{SPEAKER_NAME[who]}</div>
          ) : null}
        </div>
      ) : null}
      <div style={{ ...col, width: SUB_TEXT_W, marginLeft: tag ? SUB.gap : right ? SUB.padX : SUB.padX - 14 }}>
        {wrapSubtitle(text).map((l, i) => (
          <SubLine key={i} text={l} who={who} />
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

/** React の要素を、関数の部品を呼んで最後まで開く（描かずに fit の計算だけを走らせる） */
function expand(node: ReactNode): void {
  if (node == null || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach(expand);
  const el = node as ReactElement<{ children?: ReactNode }>;
  if (typeof el.type === "function") return expand((el.type as (p: unknown) => ReactNode)(el.props));
  expand(el.props?.children);
}

/**
 * 本文が MIN_FONT に届かない所・行の高さに入らない所の一覧（「3章「…」: 表のセル（2列目）「…」は 28px …」）。
 * 空なら問題なし。render.ts stills・video.tsx はこれが空でなければ止まる（data.json の文字を短くする・行を減らす）
 */
export function fontProblems(tl: Timeline): string[] {
  const out: string[] = [];
  for (const ch of tl.chapters) {
    probe = [];
    try {
      expand(frameAt(tl, ch.stillAt, { instant: true }));
    } finally {
      for (const p of new Set(probe)) out.push(`${ch.index}章「${ch.title}」: ${p}`);
      probe = null;
    }
  }
  return out;
}

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
      <div style={{ display: "flex", position: "absolute", right: 48, top: HEADER.y + 16, fontSize: MIN_FONT, fontWeight: 900, color: C.url }}>used.gadelog.com</div>
      <SpeakerSlot who="ずんだもん" x={SLOT.left} active={who === "ずんだもん"} art={opts.art?.ずんだもん} mouthOpen={opts.mouthOpen} plate={L.plate.show === "always" || t <= NAME_FIRST_SEC} />
      <SpeakerSlot who="つむぎ" x={SLOT.right} active={who === "つむぎ"} art={opts.art?.つむぎ} mouthOpen={opts.mouthOpen} plate={L.plate.show === "always" || t <= NAME_FIRST_SEC} />
      <div style={{ ...col, position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, padding: CARD.pad, background: C.white, borderRadius: 24 }}>
        <SceneBody ch={scene} t={local} />
      </div>
      {ch.scene.type === "endScreen" ? <EndScreenSlots s={ch.scene} /> : null}
      <Subtitle who={who} text={page?.text ?? ""} />
      {FOOT_Y === null ? null : <div style={{ display: "flex", position: "absolute", left: SUB.x + 8, top: FOOT_Y, fontSize: 26, fontWeight: 500, color: C.onDarkSub }}>{`${date} 時点・大手中古ショップ${tl.shops}店の在庫から`}</div>}
    </div>
  );
}
