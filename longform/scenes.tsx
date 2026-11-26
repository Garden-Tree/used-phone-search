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
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BarsScene, BigNumberScene, ChecklistScene, EndScreenScene, GaugesScene, LineupScene, PairsScene, PhotoScene, ScreenScene, TableScene, VersusScene, TrendScene, FlowScene, ProblemsScene, CostsScene, YearsScene, Timeline, TimelineChapter } from "./types";

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
  art: { w: number; y: number; h: number; imgH: number; left: number; right: number; bust?: number; /** 右（つむぎ）だけの bust（絵の全身が長く顔が小さいので寄せる。11/27） */ bustRight?: number; /** 右だけ絵を上へずらす px（顔を枠の中ほどに） */ topRight?: number; /** 右だけ絵を枠の中で横へずらす px（負で左。11/27 ユーザー「少し左に」） */ dxRight?: number };
  /** 立ち絵がないときの枠（名前の札だけ） */
  slot: { y: number; w: number; h: number; left: number; right: number };
  plate: { w: number; font: number; show: "always" | "first10" };
  sub: { x: number; y: number; w: number; h: number; tag: "always" | "never"; tagW: number; padX: number; gap: number; font: number; lineHeight: number; edge: number; edgeSide: "left" | "speaker" };
  footY: number | null;
  /** カードの脚注（note）を出すか（d2 は出さない。出典は説明欄） */
  notes?: boolean;
  /** 章の帯の x（なければ 40） */
  headerX?: number;
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
  /**
   * 11/23〜（d2・ユーザーの指示）: 立ち絵を字幕の左右（画面の下の角）に下げてバストアップに、字幕の帯をその分短く、カードを左右いっぱい 1888x782（余白 16px）。
   * 脚注は出さない・カードの文字の上限 1.3 倍・字幕 62px・帯の下 14px（YouTube の再生バーは一時停止中だけ重なる）。
   * 立ち絵（高さ 236px）はカードの下の角に 重なる（カードの余白 48px の中・立ち絵はカードの上に描く）。字幕は 58px
   */
  d2: {
    card: { x: 16, y: 104, w: W - 32, h: 782, pad: 44, scale: 1.5 },
    // bust: 絵の上から何割を枠に入れるか（顔〜胸のバストアップ）
    // 11/27 ユーザー: つむぎの顔をずんだもんと同じくらいに（bustRight）・少し左へ（右の余白を詰める）
    art: { w: 200, y: 1066 - 200, h: 200, imgH: 200, left: 4, right: W - 204, bust: 0.5, bustRight: 0.34, topRight: -30, dxRight: -22 },
    slot: { y: 1066 - 200, w: 190, h: 200, left: 9, right: W - 199 },
    plate: { w: 172, font: 26, show: "first10" },
    sub: { x: 212, y: 898, w: W - 424, h: 168, tag: "never", tagW: 200, padX: 28, gap: 20, font: 62, lineHeight: 1.15, edge: 6, edgeSide: "speaker" },
    footY: null,
    notes: false,
    headerX: 16,
  },
};
export const LAYOUT_NAME = process.env.LONGFORM_LAYOUT && LAYOUTS[process.env.LONGFORM_LAYOUT] ? process.env.LONGFORM_LAYOUT : "d2";
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
/** 名前の札は最後の 0.6 秒でフェードして消える（11/23 ユーザー）。0〜1 を 0.05 刻みで */
const NAME_FADE = 0.6;
export function plateOpacity(t: number): number {
  if (L.plate.show === "always" || t <= NAME_FIRST_SEC - NAME_FADE) return 1;
  if (t >= NAME_FIRST_SEC) return 0;
  const x = (t - (NAME_FIRST_SEC - NAME_FADE)) / NAME_FADE;
  return Math.round((1 - easeOut(x)) * 20) / 20;
}
/** フェードの間に PNG にする秒（毎コマ） */
export const plateFadePoints = (): number[] => Array.from({ length: Math.round(NAME_FADE * FPS) + 1 }, (_, j) => NAME_FIRST_SEC - NAME_FADE + j / FPS);

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
/** 集中線（11/27〜）: burst の秒から BURST_SEC 秒だけ出す */
export const BURST_SEC = 1.2;
export const burstOn = (reveal: Record<string, number>, local: number) => reveal.burst !== undefined && local >= reveal.burst && local < reveal.burst + BURST_SEC;
let burstSvg = "";
/** カードの大きさの集中線（端から中へ細くなる線・真ん中は空ける）。一度だけ作る */
function burstImage(w: number, h: number): string {
  if (burstSvg) return burstSvg;
  const cx = w / 2, cy = h / 2, N = 72;
  const R = Math.hypot(w, h) / 2 + 10;
  let paths = "";
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rnd() * 0.05;
    const inner = 0.84 + rnd() * 0.1; // 中ほどの空き（楕円）。文字にかからないよう端の帯だけ
    const ix = cx + Math.cos(a) * (w / 2) * inner, iy = cy + Math.sin(a) * (h / 2) * inner;
    const da = 0.012 + rnd() * 0.018;
    const ox1 = cx + Math.cos(a - da) * R, oy1 = cy + Math.sin(a - da) * R;
    const ox2 = cx + Math.cos(a + da) * R, oy2 = cy + Math.sin(a + da) * R;
    paths += `<path d="M${ix.toFixed(1)},${iy.toFixed(1)} L${ox1.toFixed(1)},${oy1.toFixed(1)} L${ox2.toFixed(1)},${oy2.toFixed(1)} Z"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g fill="#1b1d4a" fill-opacity="0.7">${paths}</g></svg>`;
  burstSvg = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return burstSvg;
}
/** 蛍光ペン（11/27〜）: 台詞の頭で項目に触れた台詞の間、その行に薄い黄色を敷く（timeline.ts の resolveMarks） */
export const MARK_SEC = 1.8;
const MARK_BG = "#FFF1A8";
export function markedKeys(scene: { marks?: Record<string, [number, number][]> }, local: number): string[] {
  return Object.entries(scene.marks ?? {}).filter(([, rs]) => rs.some(([a, b]) => local >= a && local < b)).map(([k]) => k).sort();
}
const isMarked = (scene: object, key: string, t: number) => markedKeys(scene as { marks?: Record<string, [number, number][]> }, t).includes(key);
/** 章の切り替え（11/27〜）: カードが右から SLIDE_PX 寄ってくる（SLIDE_F コマ・ease-out） */
export const SLIDE_F = 10;
const SLIDE_PX = 90;
export function slideFrame(ch: TimelineChapter, t: number): number | undefined {
  if (ch.index <= 1) return undefined;
  const f = Math.floor((t - chapterShownAt(ch)) * FPS + 1e-6);
  return f >= 0 && f < SLIDE_F ? f : undefined;
}
/** 表の金額を 0 から数え上げる（横棒と同じ伸び方。「145,900円（セール）」の頭の数字だけ） */
function countUp(v: string, g: number): string {
  if (g >= 1) return v;
  const m = v.match(/^([0-9]{1,3}(?:,[0-9]{3})+)(.*)$/);
  if (!m) return v;
  return `${Math.round(Number(m[1].replace(/,/g, "")) * g).toLocaleString("ja-JP")}${m[2]}`;
}

/** 写真の図解の寄り（11/27〜）: 最後に出た zoom つきの丸の、出てからのコマ（ZOOM_F まで。過ぎたら ZOOM_F） */
export const ZOOM_F = 18;
export function noteZoom(scene: PhotoScene, reveal: Record<string, number>, t: number, cur: number): { n: PhotoNote; f: number } | null {
  let best: { n: PhotoNote; at: number } | null = null;
  (scene.notes ?? []).forEach((n, i) => {
    const at = reveal[`note:${i}`];
    if (n.zoom && (n.img ?? 0) === cur && at !== undefined && t >= at && (!best || at >= best.at)) best = { n, at };
  });
  if (!best) return null;
  const b = best as { n: PhotoNote; at: number };
  return { n: b.n, f: Math.min(ZOOM_F, Math.floor((t - b.at) * FPS + 1e-6)) };
}
type PhotoNote = NonNullable<PhotoScene["notes"]>[number];

/** 矢印の絵（11/27〜）。satori は透明な枠線の三角を描けないので SVG で。dir: "both"＝＜ーー＞・"left"＝←ーー */
function arrowSvg(w: number, h: number, dir: "both" | "left", color: string): string {
  const y = h / 2, t = Math.max(6, Math.round(h * 0.22)), ah = Math.min(h * 0.9, w * 0.4);
  const head = (x: number, sgn: number) => `M${x},${y} L${x + sgn * ah},${y - h / 2} L${x + sgn * ah},${y + h / 2} Z`;
  const x0 = dir === "both" ? ah - 1 : ah - 1, x1 = dir === "both" ? w - ah + 1 : w;
  const body = `<rect x="${x0}" y="${y - t / 2}" width="${Math.max(0, x1 - x0)}" height="${t}" fill="${color}"/>`;
  const heads = dir === "both" ? `<path d="${head(0, 1)} ${head(w, -1)}" fill="${color}"/>` : `<path d="${head(0, 1)}" fill="${color}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}${heads}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** 表のセルの ○・× を色つきの丸に（11/27〜） */
function Mark({ v, size, pop = 1 }: { v: string; size: number; pop?: number }) {
  const ok = v === "○" || v === "◯" || v === "✓";
  return (
    <div style={{ display: "flex", width: size, height: size, borderRadius: 999, background: ok ? SITE.safe : C.red, color: C.white, fontSize: Math.round(size * 0.66), fontWeight: 900, lineHeight: 1, alignItems: "center", justifyContent: "center", transform: `scale(${pop})` }}>{ok ? "✓" : "×"}</div>
  );
}

/** ポップ（11/27 動きの見本）: 0 から peak まで 0.12 秒で膨らみ、0.35 秒で 1 に戻る。出る前は 0（見えない）、出たあとは 1 */
const popScale = (u: number, peak = 1.18) => (u < 0 ? 1 : u < 0.12 ? 0.6 + (peak - 0.6) * easeOut(u / 0.12) : u < 0.47 ? peak - (peak - 1) * easeOut((u - 0.12) / 0.35) : 1);

/**
 * 揺れ（11/23〜・ユーザーの指示）: 項目が出た・字幕が切り替わった・話し始めた瞬間に、短く揺らす。
 * 出来事から BURST コマ（約 0.27 秒）の間だけ。video.tsx は出来事の 0・2・4・6・8 コマ後を PNG にする
 */
const BURST = 8;
// 11/23 ユーザー「イージングを入れて・控えめに」: 左右に揺らすのをやめ、少し下から浮き上がって止まる（ease-out cubic）。
// 0・1・2・4・6・8 コマ後を PNG にする（8 で止まる）
export const ANIM_STEPS = [1, 2, 3, 4, 5, 6, 7, 8]; // 毎コマ（ガクガクしないように。11/23）
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
/** 出来事から k コマ目の位置（px）。a から 0 へ ease-out で戻る */
const settle = (k: number, a: number) => Math.round(a * (1 - easeOut(Math.min(1, k / BURST))) * 10) / 10;
const ITEM_Y = 6;
const SUB_Y = 3;
const SPK_UP = -6;
/** 横棒が左から伸びる長さ（コマ。約 0.6 秒・ease-out。値の数字も 0 から数え上がる。11/23） */
const GROW = 18;
/** 横棒が伸びている間に PNG にするコマ（出てから 2・4…18 コマ後） */
export function growPoints(tl: Timeline): number[] {
  const out: number[] = [];
  for (const ch of tl.chapters) {
    if (ch.scene.type !== "bars" && ch.scene.type !== "table" && ch.scene.type !== "gauges" && ch.scene.type !== "costs") continue;
    for (const [k, r] of Object.entries(ch.scene.reveal)) {
      if (!k.startsWith("item:")) continue;
      const base = r > 0 ? ch.start + r : chapterShownAt(ch);
      for (let j = 1; j <= GROW; j++) out.push(base + j / FPS);
    }
  }
  return out;
}
/** 台詞が項目に触れたときの震え（px・コマごと。だんだん小さく） */
const SHAKE_X = [4, -3, -3, 2, 2, -1, -1, 0];
/** 声の大きさ1段あたりに立ち絵を上げる px（11/23・声の波形で揺らす。控えめに 2px） */
const LEVEL_Y = 2;
const bump = (scene: object, key: string): CSSProperties => {
  const s = scene as { pulse?: Record<string, number>; shake?: Record<string, number> };
  const k = s.pulse?.[key];
  if (k !== undefined) return { transform: `translateY(${settle(k, ITEM_Y)}px)` };
  const j = s.shake?.[key];
  return j === undefined ? {} : { transform: `translateX(${SHAKE_X[j]}px)` };
};
/** t 秒の揺れ: 揺らす項目（キー → 何コマ目）・字幕・話し手（何コマ目か。なければ undefined） */
export function animAt(tl: Timeline, t: number): { items: Record<string, number>; shake: Record<string, number>; grow: Record<string, number>; sub?: number; spk?: number } {
  const { ch, line, page } = stateAt(tl, t);
  const ph = (e: number) => {
    const k = Math.floor((t - e) * FPS + 1e-6);
    return k >= 0 && k < BURST ? k : undefined;
  };
  const items: Record<string, number> = {};
  for (const [k, r] of Object.entries(ch.scene.reveal)) {
    if (r <= 0) continue;
    const p = ph(ch.start + r);
    if (p !== undefined) items[k] = p;
  }
  const shake: Record<string, number> = {};
  for (const [k, ts] of Object.entries(ch.scene.mention ?? {})) {
    for (const m of ts) {
      const p = ph(ch.start + m);
      if (p !== undefined && items[k] === undefined) shake[k] = p;
    }
  }
  const grow: Record<string, number> = {};
  if (ch.scene.type === "bars" || ch.scene.type === "table" || ch.scene.type === "gauges" || ch.scene.type === "costs") {
    for (const [k, r] of Object.entries(ch.scene.reveal)) {
      if (!k.startsWith("item:")) continue;
      const base = r > 0 ? ch.start + r : chapterShownAt(ch);
      const f = Math.floor((t - base) * FPS + 1e-6);
      if (f < 0) grow[k] = 0;
      else if (f < GROW) grow[k] = Math.round(easeOut(f / GROW) * 1000) / 1000;
    }
  }
  return { items, shake, grow, sub: page ? ph(page.start) : undefined, spk: line ? ph(line.start) : undefined };
}
/** 揺れの出来事の秒（項目が出る・字幕のページ・台詞の始まり） */
export function animEvents(tl: Timeline): number[] {
  const out: number[] = [];
  for (const ch of tl.chapters) {
    for (const r of Object.values(ch.scene.reveal)) if (r > 0) out.push(ch.start + r);
    for (const ts of Object.values(ch.scene.mention ?? {})) for (const m of ts) out.push(ch.start + m);
    for (const l of ch.lines) for (const p of l.pages) out.push(p.start);
  }
  return out;
}

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
    <div style={{ ...row, justifyContent: "space-between", width: INNER_W, marginTop: HEAD_UP, marginBottom: HEAD_GAP }}>
      <div style={{ display: "flex", fontSize: fit(text, INNER_W - rightW, cap(48), MIN_FONT, "見出し"), fontWeight: 900, color: C.ink }}>{text}</div>
      {right ?? null}
    </div>
  );
}

/** 脚注の大きさ（折り返してよい。最小 MIN_FOOT） */
const noteFont = (text: string) => Math.max(MIN_FOOT, Math.min(28, Math.floor(INNER_W / textEm(text))));
/** 脚注の高さ（px。行数は幅の目安から。行の高さは Noto Sans JP の 1.45 倍） */
const noteH = (text?: string) => {
  if (!text || L.notes === false) return 0;
  const w = textEm(text) * noteFont(text);
  return (w <= INNER_W ? 1 : Math.ceil((w * 1.03) / INNER_W)) * Math.ceil(noteFont(text) * 1.45) + 8;
};
/** 見出し（Heading）の高さ（px。下の余白 28 を含む） */
/** 見出しを上に寄せる量と、下の間（d2 は上に 20px 寄せて間を 12px に。そのぶん写真・棒が大きくなる。11/23） */
const HEAD_UP = L.notes === false ? -20 : 0;
const HEAD_GAP = L.notes === false ? 12 : 28;
const headingH = (text: string, rightW = 0) => Math.ceil(Math.max(MIN_FONT, Math.min(cap(48), Math.floor((INNER_W - rightW) / textEm(text)))) * 1.45) + HEAD_GAP + HEAD_UP;
/**
 * 見出しと脚注を除いた、表・棒に使える高さ（px）。脚注が長いと行が低くなる（10/29: 行の高さを決め打ちにしていて、3行の脚注がカードの外にはみ出た）
 */
const bodyH = (heading: string, note?: string, rightW = 0) => CARD.h - CARD.pad * 2 - headingH(heading, rightW) - noteH(note);

/** 脚注 */
function Note({ text }: { text?: string }) {
  if (!text || L.notes === false) return null;
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
            <div key={i} style={{ ...col, width: colW, flexShrink: 0, alignItems: "center", opacity: p, borderLeft: i ? `3px solid ${C.line}` : "none", ...bump(s, `item:${i}`) }}>
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
    <div style={{ ...col, position: "relative", width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      {s.rows.map((r, i) => {
        const p = shown(reveal, `item:${i}`, t);
        const pm = r.min !== undefined ? shown(reveal, `min:${i}`, t) : 0;
        const g = (s as { grow?: Record<string, number> }).grow?.[`item:${i}`] ?? 1;
        const w = Math.max(4, Math.round((track * r.median * p * g) / max));
        const shownValue = money(r.median * g, s.unit);
        const subs = (r.sub ?? "").split("\n").filter(Boolean);
        const labelFont = fit(r.label, r.pick ? LABEL - PICK : LABEL - 10, F.label, MIN_FONT, "棒のラベル");
        for (const line of subs) fit(line, LABEL - 10, F.sub, MIN_FONT, "棒の補足");
        // 縦: ラベル＋補足・値＋在庫・棒＋最安が行の高さに入るか
        const needH = Math.max(labelFont * LH + subs.length * F.sub * LH, F.value * 1.1 + (r.stock ? F.small * LH : 0), DOT + 8 + (r.min !== undefined ? MIN_H : 0));
        if (needH > rowH + 2) report(`棒の行「${r.label}」は高さ ${Math.round(needH)}px 要るが ${rowH}px しかない（行を減らすか補足を短く）`);
        return (
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, opacity: p > 0 ? 1 : 0, borderTop: i ? `2px solid ${C.line}` : "none", background: isMarked(s, `item:${i}`, t) ? MARK_BG : "transparent", borderRadius: 10, ...bump(s, `item:${i}`) }}>
            <div style={{ ...col, width: LABEL }}>
              <div style={{ ...row }}>
                <div style={{ display: "flex", fontSize: labelFont, fontWeight: 900, color: C.ink, lineHeight: LH, whiteSpace: "nowrap" }}>{r.label}</div>
                {r.pick ? <div style={{ display: "flex", flexShrink: 0, marginLeft: 12, padding: "0 12px", borderRadius: 8, background: C.red, color: C.white, fontSize: MIN_FONT, fontWeight: 900 }}>{r.pickLabel ?? "おすすめ"}</div> : null}
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
            <div style={{ ...col, width: VALUE, marginLeft: GAP, opacity: p, ...(s.motion ? { transform: `scale(${popScale(t - (reveal[`item:${i}`] ?? -99))})`, transformOrigin: "left center" } : {}) }}>
              <div style={{ display: "flex", fontSize: fit(money(r.median, s.unit), VALUE, F.value, MIN_FONT, "棒の値"), fontWeight: 900, color: s.motion && popScale(t - (reveal[`item:${i}`] ?? -99)) > 1.01 ? C.red : C.ink, lineHeight: 1.1, whiteSpace: "nowrap" }}>{shownValue}</div>
              {r.stock ? <div style={{ display: "flex", fontSize: F.small, fontWeight: 500, color: C.sub, lineHeight: LH }}>{r.stock}</div> : null}
            </div>
          </div>
        );
      })}
      {s.motion && s.diffs
        ? s.diffs.map((d, k) => {
            const u = t - (d.at ?? 1e9);
            if (u < 0) return null;
            const headH = headingH(s.heading);
            const y1 = headH + rowH * (d.from + 0.5), y2 = headH + rowH * (d.to + 0.5);
            const sc = popScale(u, 1.25);
            const x = INNER_W - VALUE - GAP - 20;
            return (
              <div key={`d${k}`} style={{ display: "flex", position: "absolute", left: 0, top: 0, width: INNER_W, height: "100%" }}>
                {/* 2つの行をつなぐ括弧（右の値の手前） */}
                <div style={{ display: "flex", position: "absolute", left: x, top: y1, width: 18, height: y2 - y1, borderTop: `6px solid ${C.red}`, borderRight: `6px solid ${C.red}`, borderBottom: `6px solid ${C.red}`, borderRadius: 6, opacity: ease(u / 0.25) }} />
                <div style={{ display: "flex", position: "absolute", right: VALUE + GAP + 60, top: (y1 + y2) / 2 - 46, height: 92, alignItems: "center", padding: "0 28px", borderRadius: 18, background: C.red, color: C.white, fontSize: 52, fontWeight: 900, whiteSpace: "nowrap", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", transform: `scale(${sc})`, transformOrigin: "right center" }}>{d.label}</div>
              </div>
            );
          })
        : null}
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
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, opacity: p > 0 ? 1 : 0, borderTop: i ? `2px solid ${C.line}` : "none", ...bump(s, `item:${i}`) }}>
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
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, background: isMarked(s, `item:${i}`, t) ? MARK_BG : i % 2 ? C.rowAlt : C.white, borderBottom: `2px solid ${C.line}`, opacity: p, ...bump(s, `item:${i}`) }}>
            {s.columns.map((_, j) => {
              const v = r.cells[j] ?? "";
              const em = (r.emphasis ?? s.emphasis)?.includes(j);
              // ○・× だけのセルは色つきの丸に。行が出た瞬間に少し大きく出る（揺れのコマを使う）
              if (j > 0 && /^[○◯×✓]$/.test(v.trim())) {
                const k = (s as { pulse?: Record<string, number> }).pulse?.[`item:${i}`];
                const pop = k === undefined ? 1 : 1 + 0.35 * (1 - Math.min(1, k / 8));
                return <div key={j} style={{ display: "flex", width: widths[j], paddingLeft: PADX }}><Mark v={v.trim()} size={Math.round(cellFont * 1.15)} pop={pop} /></div>;
              }
              return (
                <div key={j} style={{ display: "flex", width: widths[j], paddingLeft: PADX, fontSize: cellFont, fontWeight: em ? 900 : 500, color: em ? C.red : C.ink, whiteSpace: "nowrap" }}>{j > 0 ? countUp(v, (s as { grow?: Record<string, number> }).grow?.[`item:${i}`] ?? 1) : v}</div>
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
  if (s.columns === 2) return <Checklist2 s={s} t={t} reveal={reveal} />;
  // 行の高さはカードの残り（見出し・脚注を除く）で割る（d2 は脚注なし。11/23: 4行で下が切れた）
  const rowH = Math.min(cap(150), Math.floor(bodyH(s.heading, s.note) / s.items.length));
  const NUM = Math.min(cap(76), Math.floor(rowH * 0.62));
  const textW = INNER_W - NUM - 32;
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      {s.items.map((it, i) => {
        const p = shown(reveal, `item:${i}`, t);
        return (
          <div key={i} style={{ ...row, width: INNER_W, height: rowH, opacity: p, borderTop: i ? `2px solid ${C.line}` : "none", background: isMarked(s, `item:${i}`, t) ? MARK_BG : "transparent", borderRadius: 10, ...bump(s, `item:${i}`) }}>
            {(() => {
              // ✓（11/27〜 checks）: checkCue の秒か、項目に台詞が触れた最初の秒から。触れた瞬間に少し大きく
              const sc = s as ChecklistScene & { mention?: Record<string, number[]>; shake?: Record<string, number> };
              // 上から順に付ける（11/27 ユーザー）: 説明した秒を早い順に並べ、上の項目から当てる
              const at = reveal[`chk:${i}`];
              const checked = sc.checks !== false && at !== undefined && t >= at;
              const j = (sc as { pulse?: Record<string, number> }).pulse?.[`chk:${i}`];
              const pop = checked && j !== undefined ? 1 + 0.3 * (1 - Math.min(1, j / 8)) : 1;
              // ✓ は緑（赤の ✓ は日本では「まちがい」に見える。11/27 ユーザー）。✓ の前の番号は灰色
              return <div style={{ display: "flex", width: NUM, height: NUM, borderRadius: 999, background: checked ? SITE.safe : sc.checks !== false && Object.keys(reveal).some((k) => k.startsWith("chk:")) ? C.sub : SITE.safe, color: C.white, fontSize: Math.round(NUM * (checked ? 0.66 : 0.58)), lineHeight: 1, fontWeight: 900, alignItems: "center", justifyContent: "center", flexShrink: 0, paddingBottom: checked ? 0 : Math.round(NUM * 0.1), paddingLeft: checked ? 0 : Math.round(NUM * 0.06), transform: `scale(${pop})` }}>{checked ? "✓" : String(i + 1)}</div>;
            })()}
            <div style={{ ...col, width: textW, marginLeft: 32 }}>
              <div style={{ display: "flex", fontSize: fit(it.text, textW, Math.min(cap(56), Math.floor(rowH * 0.5)), MIN_FONT, "リストの行"), fontWeight: 900, color: C.ink, lineHeight: 1.2 }}>{it.text}</div>
              {it.sub ? <div style={{ display: "flex", marginTop: 2, fontSize: fit(it.sub, textW, Math.min(cap(38), Math.floor(rowH * 0.28)), MIN_FOOT, "リストの補足"), fontWeight: 500, color: C.sub, lineHeight: 1.2 }}>{it.sub}</div> : null}
            </div>
          </div>
        );
      })}
      <Note text={s.note} />
    </div>
  );
}

/** 2列のチェックリスト（1,2 / 3,4 / 5,6・11/26 ユーザー「3x2にできない？」）。1つのマスは番号＋文字（1行）＋補足 */
function Checklist2({ s, t, reveal }: { s: ChecklistScene; t: number; reveal: Record<string, number> }) {
  const GAP = cap(40);
  const cellW = Math.floor((INNER_W - GAP) / 2);
  const rows = Math.ceil(s.items.length / 2);
  const rowH = Math.floor(bodyH(s.heading, s.note) / rows);
  const NUM = Math.min(cap(64), Math.floor(rowH * 0.36));
  const textW = cellW - NUM - 24;
  const size = Math.min(cap(46), Math.floor(rowH * 0.24));
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} style={{ ...row, width: INNER_W, height: rowH, borderTop: r ? `2px solid ${C.line}` : "none", alignItems: "center" }}>
          {[0, 1].map((c) => {
            const i = r * 2 + c;
            const it = s.items[i];
            if (!it) return <div key={c} style={{ display: "flex", width: cellW }} />;
            const p = shown(reveal, `item:${i}`, t);
            return (
              <div key={c} style={{ ...row, width: cellW, marginLeft: c ? GAP : 0, alignItems: "center", opacity: p, ...bump(s, `item:${i}`) }}>
                <div style={{ display: "flex", width: NUM, height: NUM, borderRadius: 999, background: SITE.safe, color: C.white, fontSize: Math.round(NUM * 0.58), lineHeight: 1, fontWeight: 900, alignItems: "center", justifyContent: "center", flexShrink: 0, paddingBottom: Math.round(NUM * 0.1), paddingLeft: Math.round(NUM * 0.06) }}>{String(i + 1)}</div>
                <div style={{ ...col, width: textW, marginLeft: 24 }}>
                  <div style={{ display: "flex", fontSize: fit(it.text, textW, size, MIN_FONT, "リストの行"), fontWeight: 900, color: C.ink, lineHeight: 1.2 }}>{it.text}</div>
                  {it.sub ? <div style={{ display: "flex", marginTop: 4, fontSize: fit(it.sub, textW, cap(32), MIN_FOOT, "リストの補足"), fontWeight: 500, color: C.sub, lineHeight: 1.2 }}>{it.sub}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <Note text={s.note} />
    </div>
  );
}

type Crop = { x: number; y: number; w: number; h: number };

/** 画像を data URI と大きさにする（PNG・JPEG の頭から幅と高さを読む。同じ画像は1回だけ読む） */
const IMAGES = new Map<string, { src: string; w: number; h: number }>();
function loadImage(path: string) {
  const hit = IMAGES.get(path);
  if (hit) return hit;
  const b = readFileSync(resolve(process.cwd(), path));
  let w = 0, h = 0, mime = "image/png";
  if (b[0] === 0x89 && b[1] === 0x50) { w = b.readUInt32BE(16); h = b.readUInt32BE(20); }
  else if (b[0] === 0xff && b[1] === 0xd8) {
    mime = "image/jpeg";
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { h = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); break; }
      i += 2 + len;
    }
  }
  if (!w || !h) throw new Error(`画像の大きさが読めない（PNG か JPEG だけ）: ${path}`);
  const img = { src: `data:${mime};base64,${b.toString("base64")}`, w, h };
  IMAGES.set(path, img);
  return img;
}

/** 写真・公式のスクショ。points があれば左に画像・右に1つずつ出す行、なければ画像だけを大きく。画像の下に出典 */
function Photo({ s, t, reveal }: { s: PhotoScene; t: number; reveal: Record<string, number> }) {
  // images があれば、cue を過ぎたもののうち最後の1枚に差し替える（パラパラ。11/23〜）
  const slides: { src: string; credit: string; crop?: Crop }[] = [{ src: s.src, credit: s.credit, crop: s.crop }, ...(s.images ?? [])];
  let cur = 0;
  slides.forEach((_, i) => { if (i > 0 && t >= (reveal[`img:${i - 1}`] ?? Infinity)) cur = i; });
  const img = loadImage(slides[cur].src);
  const credit = slides[cur].credit;
  const points = s.points ?? [];
  const GAP = cap(40);
  const boxW = points.length ? Math.round(INNER_W * 0.45) : INNER_W;
  const creditFont = MIN_FOOT;
  const boxH = bodyH(s.heading, s.note) - Math.ceil(creditFont * 1.45) - 12;
  // crop: 見せたい所だけを拡大（画像の幅・高さに対する割合。11/23）
  const cr0 = slides[cur].crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const k0 = Math.min(boxW / (img.w * cr0.w), boxH / (img.h * cr0.h));
  const w = Math.round(img.w * cr0.w * k0), h = Math.round(img.h * cr0.h * k0);
  // 図解の寄り（11/27〜）: 丸の所を中心に zoom 倍へ、0.6 秒で寄る（枠の大きさは同じ）
  const zm = noteZoom(s, (s as { revealRaw?: Record<string, number> }).revealRaw ?? reveal, t, cur);
  let cr = cr0;
  if (zm) {
    const p = easeOut(zm.f / ZOOM_F);
    const tw = cr0.w / zm.n.zoom!, th = cr0.h / zm.n.zoom!;
    const tx = Math.min(Math.max(zm.n.x - tw / 2, 0), 1 - tw), ty = Math.min(Math.max(zm.n.y - th / 2, 0), 1 - th);
    cr = { x: cr0.x + (tx - cr0.x) * p, y: cr0.y + (ty - cr0.y) * p, w: cr0.w + (tw - cr0.w) * p, h: cr0.h + (th - cr0.h) * p };
  }
  const k = Math.min(w / (img.w * cr.w), h / (img.h * cr.h));
  // 画像の割合 → 枠の中の px
  const toBox = (fx: number, fy: number) => ({ x: (fx - cr.x) * img.w * k, y: (fy - cr.y) * img.h * k });
  const notesOn = (s.notes ?? []).map((n, i) => ({ n, i })).filter(({ n, i }) => (n.img ?? 0) === cur && reveal[`note:${i}`] !== undefined && t >= reveal[`note:${i}`]);
  const textW = INNER_W - boxW - GAP;
  const rowH = points.length ? Math.min(cap(170), Math.floor(boxH / points.length)) : 0;
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ ...row, width: INNER_W, alignItems: "flex-start" }}>
        <div style={{ ...col, width: boxW, alignItems: "center" }}>
          <div style={{ display: "flex", width: boxW, height: boxH, alignItems: "center", justifyContent: "center", ...(cur > 0 ? bump(s, `img:${cur - 1}`) : {}) }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <div style={{ display: "flex", position: "relative", width: w, height: h, overflow: "hidden", borderRadius: 12 }}>
              <img src={img.src} width={Math.round(img.w * k)} height={Math.round(img.h * k)} style={{ position: "absolute", left: -Math.round(cr.x * img.w * k), top: -Math.round(cr.y * img.h * k), width: Math.round(img.w * k), height: Math.round(img.h * k) }} />
              {notesOn.map(({ n, i }) => {
                const c = toBox(n.x, n.y);
                const r = Math.max(24, (n.r ?? 0.06) * img.w * k);
                const pk = (s as { pulse?: Record<string, number> }).pulse?.[`note:${i}`];
                const pop = pk === undefined ? 1 : 0.6 + 0.6 * easeOut(Math.min(1, pk / 8)) - 0.2 * Math.max(0, (pk - 4) / 4);
                // 札は丸の下（入らなければ上）。写真の枠は狭いので横には置かない
                const labelW = Math.min(w - 16, Math.round(MIN_FONT * 1.0 * n.label.length + 40));
                const lx = Math.min(w - labelW - 8, Math.max(8, c.x - labelW / 2));
                const ly = c.y + r + 14 + 68 <= h - 8 ? c.y + r + 14 : Math.max(8, c.y - r - 14 - 68);
                if (n.kind === "span") {
                  // ＜ーー＞: x から x2 まで（厚さ・幅）。両端に細い縦の線、間に両向きの矢印。札は矢印の下
                  const c2 = toBox(n.x2 ?? n.x, n.y);
                  const x1 = Math.min(c.x, c2.x), x2 = Math.max(c.x, c2.x);
                  const AW = Math.max(40, Math.round(x2 - x1)), AHt = 34;
                  const spanW = n.label.length * MIN_FONT + 40;
                  const sx = Math.min(w - spanW - 8, Math.max(8, (x1 + x2) / 2 - spanW / 2));
                  const guide = { display: "flex", position: "absolute", top: Math.round(c.y - 60), width: 5, height: 120, background: C.red } as const;
                  return (
                    <div key={`n${i}`} style={{ display: "flex", position: "absolute", left: 0, top: 0, width: w, height: h, opacity: Math.min(1, pop) }}>
                      <div style={{ ...guide, left: Math.round(x1 - 2) }} />
                      <div style={{ ...guide, left: Math.round(x2 - 3) }} />
                      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                      <img src={arrowSvg(AW, AHt, "both", C.red)} width={AW} height={AHt} style={{ position: "absolute", left: Math.round((x1 + x2) / 2 - AW / 2), top: Math.round(c.y - AHt / 2), width: AW, height: AHt }} />
                      <div style={{ display: "flex", position: "absolute", left: Math.round(sx), top: Math.round(Math.min(h - 76, c.y + 76)), height: 68, alignItems: "center", padding: "0 18px", borderRadius: 14, background: C.red, color: C.white, fontSize: MIN_FONT, fontWeight: 900, whiteSpace: "nowrap", boxShadow: "0 6px 16px rgba(0,0,0,0.3)", transform: `scale(${pop})` }}>{n.label}</div>
                    </div>
                  );
                }
                return (
                  <div key={`n${i}`} style={{ display: "flex", position: "absolute", left: 0, top: 0, width: w, height: h }}>
                    <div style={{ display: "flex", position: "absolute", left: Math.round(c.x - r), top: Math.round(c.y - r), width: Math.round(r * 2), height: Math.round(r * 2), borderRadius: 999, border: `7px solid ${C.red}`, transform: `scale(${pop})` }} />
                    <div style={{ display: "flex", position: "absolute", left: Math.round(lx), top: Math.round(ly), height: 68, alignItems: "center", padding: "0 18px", borderRadius: 14, background: C.red, color: C.white, fontSize: MIN_FONT, fontWeight: 900, whiteSpace: "nowrap", boxShadow: "0 6px 16px rgba(0,0,0,0.3)", transform: `scale(${pop})` }}>{n.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {credit ? <div style={{ display: "flex", marginTop: 12, width: boxW, justifyContent: "center", fontSize: creditFont, fontWeight: 500, color: C.sub }}>{credit}</div> : null}
        </div>
        {points.length ? (
          <div style={{ ...col, width: textW, marginLeft: GAP }}>
            {points.map((it, i) => (
              <div key={i} style={{ ...col, width: textW, height: rowH, justifyContent: "center", opacity: shown(reveal, `item:${i}`, t), borderTop: i ? `2px solid ${C.line}` : "none", ...bump(s, `item:${i}`) }}>
                <div style={{ display: "flex", fontSize: fit(it.text, textW, Math.min(cap(56), Math.floor(rowH * 0.5)), MIN_FONT, "写真の横の行"), fontWeight: 900, color: C.ink, lineHeight: 1.2 }}>{it.text}</div>
                {it.sub ? <div style={{ display: "flex", marginTop: 2, fontSize: fit(it.sub, textW, Math.min(cap(36), Math.floor(rowH * 0.28)), MIN_FOOT, "写真の横の補足"), fontWeight: 500, color: C.sub, lineHeight: 1.2 }}>{it.sub}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
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


/** 電池の形のゲージ（11/27〜・図解）。cue で1本ずつ、下から値まで満ちる（横棒と同じ伸び方・値も数え上がる） */
function Gauges({ s, t, reveal }: { s: GaugesScene; t: number; reveal: Record<string, number> }) {
  const n = s.items.length;
  const max = s.max ?? Math.max(...s.items.map((it) => it.value)) * 1.1;
  const areaH = bodyH(s.heading, s.note);
  const colW = Math.floor(INNER_W / n);
  const bodyW = Math.min(170, Math.floor(colW * 0.5));
  const capH = 22, labelH = cap(64), valueH = cap(70);
  const bodyHt = areaH - labelH - valueH - capH - 40;
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ ...row, width: INNER_W, height: areaH, alignItems: "flex-end" }}>
        {s.items.map((it, i) => {
          const p = shown(reveal, `item:${i}`, t);
          const g = (s as { grow?: Record<string, number> }).grow?.[`item:${i}`] ?? 1;
          const v = it.value * (p > 0 ? g : 0);
          const fillH = Math.round((bodyHt - 28) * Math.min(1, v / max));
          const color = it.pick ? C.red : SITE.safe;
          return (
            <div key={i} style={{ ...col, width: colW, height: areaH, alignItems: "center", justifyContent: "flex-end", opacity: p > 0 ? 1 : 0.25, ...bump(s, `item:${i}`) }}>
              <div style={{ display: "flex", height: valueH, alignItems: "flex-end", fontSize: cap(60), fontWeight: 900, color: it.pick ? C.red : C.ink, lineHeight: 1 }}>{p > 0 ? `${Math.round(v)}${s.unit}` : ""}</div>
              <div style={{ display: "flex", width: Math.round(bodyW * 0.4), height: capH, marginTop: 12, background: C.ink, borderRadius: "8px 8px 0 0" }} />
              <div style={{ display: "flex", width: bodyW, height: bodyHt, border: `8px solid ${C.ink}`, borderRadius: 20, alignItems: "flex-end", justifyContent: "center", padding: 6 }}>
                <div style={{ display: "flex", width: bodyW - 28, height: Math.max(0, fillH), background: color, borderRadius: 10 }} />
              </div>
              <div style={{ ...col, height: labelH, marginTop: 12, alignItems: "center" }}>
                <div style={{ display: "flex", fontSize: fit(it.label, colW - 16, cap(44), MIN_FONT, "ゲージの名前"), fontWeight: 900, color: C.ink, whiteSpace: "nowrap" }}>{it.label}</div>
                {it.sub ? <div style={{ display: "flex", fontSize: MIN_FOOT, fontWeight: 500, color: C.sub, whiteSpace: "nowrap" }}>{it.sub}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
      <Note text={s.note} />
    </div>
  );
}

/** スマホの画面の絵（11/27〜・図解）。左にスマホの枠と行、cue でその行に赤い枠と矢印、右に説明 */
function Screen({ s, t, reveal }: { s: ScreenScene; t: number; reveal: Record<string, number> }) {
  const areaH = bodyH(s.heading, s.note);
  const phoneH = areaH - 10, phoneW = Math.round(INNER_W * 0.4);
  const HEAD = 120;
  const rowH = Math.min(96, Math.floor((phoneH - HEAD - 40) / Math.max(1, s.rows.length)));
  const points = s.points ?? [];
  const on = points.map((pt, i) => ({ pt, i, p: shown(reveal, `item:${i}`, t) })).filter((x) => x.p > 0);
  const last = on[on.length - 1];
  const PX = 20, BORDER = 12;
  const textX = PX + phoneW + 190;
  const textW = INNER_W - textX;
  const rowTop = (r: number) => BORDER + HEAD + r * rowH;
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ display: "flex", position: "relative", width: INNER_W, height: areaH }}>
        <div style={{ ...col, position: "absolute", left: PX, top: 0, width: phoneW, height: phoneH, background: "#F2F2F7", border: `${BORDER}px solid ${C.ink}`, borderRadius: 48, overflow: "hidden" }}>
          <div style={{ display: "flex", alignSelf: "center", width: 110, height: 26, marginTop: 12, background: C.ink, borderRadius: 20 }} />
          <div style={{ display: "flex", height: HEAD - 38, alignItems: "center", padding: "0 24px", fontSize: 36, fontWeight: 900, color: C.ink, whiteSpace: "nowrap" }}>{s.title}</div>
          {s.rows.map((r, j) => (
            <div key={j} style={{ ...row, height: rowH, margin: "0 14px", padding: "0 18px", background: C.white, borderTop: j ? `1px solid ${C.line}` : "none", justifyContent: "space-between" }}>
              <div style={{ ...col }}>
                <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: C.ink, whiteSpace: "nowrap" }}>{r.label}</div>
                {r.sub ? <div style={{ display: "flex", fontSize: 20, color: C.sub, whiteSpace: "nowrap" }}>{r.sub}</div> : null}
              </div>
              {r.value ? <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: C.sub, whiteSpace: "nowrap" }}>{r.value}</div> : null}
            </div>
          ))}
        </div>
        {on.map(({ pt, i, p }) => (
          <div key={`m${i}`} style={{ display: "flex", position: "absolute", left: PX + BORDER + 6, top: rowTop(pt.row) - 6, width: phoneW - BORDER * 2 - 12, height: rowH + 12, border: `6px solid ${C.red}`, borderRadius: 16, opacity: p }} />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        {last ? <img src={arrowSvg(190, 48, "left", C.red)} width={190} height={48} style={{ position: "absolute", left: PX + phoneW - 14, top: Math.round(rowTop(last.pt.row) + rowH / 2 - 24), width: 190, height: 48, opacity: last.p }} /> : null}
        <div style={{ ...col, position: "absolute", left: textX, top: 40, width: textW }}>
          {on.map(({ pt, i, p }) => (
            <div key={`t${i}`} style={{ ...col, marginBottom: 28, opacity: p, ...bump(s, `item:${i}`) }}>
              <div style={{ display: "flex", fontSize: fit(pt.text, textW, cap(56), MIN_FONT, "画面の説明"), fontWeight: 900, color: i === last?.i ? C.red : C.ink, lineHeight: 1.2 }}>{pt.text}</div>
              {pt.sub ? <div style={{ display: "flex", fontSize: fit(pt.sub, textW, cap(36), MIN_FOOT, "画面の説明の補足"), fontWeight: 500, color: C.sub, lineHeight: 1.2 }}>{pt.sub}</div> : null}
            </div>
          ))}
        </div>
      </div>
      <Note text={s.note} />
    </div>
  );
}


/** 2択のカード（11/27〜）。左右に1枚ずつ cue で出る。真ん中に VS。win の cue で勝った方に札と太い枠 */
function Versus({ s, t, reveal }: { s: VersusScene; t: number; reveal: Record<string, number> }) {
  const areaH = bodyH(s.heading, s.note);
  const GAP = 140;
  const cardW = Math.floor((INNER_W - GAP) / 2);
  const winOn = s.win && reveal.win !== undefined && t >= reveal.win;
  const wk = (s as { pulse?: Record<string, number> }).pulse?.win;
  const winPop = wk === undefined ? 1 : 0.5 + 0.7 * easeOut(Math.min(1, wk / 8)) - 0.2 * Math.max(0, (wk - 4) / 4);
  const card = (c: VersusScene["left"], i: number, side: "left" | "right") => {
    const p = shown(reveal, `item:${i}`, t);
    const won = winOn && s.win!.side === side;
    const lost = winOn && s.win!.side !== side;
    return (
      <div style={{ ...col, position: "relative", width: cardW, height: areaH - 20, alignItems: "center", justifyContent: "center", background: won ? "#FFF5F5" : C.rowAlt, border: `${won ? 10 : 4}px solid ${won ? C.red : C.line}`, borderRadius: 28, opacity: p * (lost ? 0.55 : 1), ...bump(s, `item:${i}`) }}>
        <div style={{ display: "flex", fontSize: fit(c.title, cardW - 60, cap(56), MIN_FONT, "2択の題"), fontWeight: 900, color: C.ink }}>{c.title}</div>
        <div style={{ display: "flex", marginTop: 18, fontSize: fit(c.value, cardW - 60, cap(110), MIN_FONT, "2択の値"), fontWeight: 900, color: won ? C.red : C.ink, lineHeight: 1 }}>{c.value}</div>
        {c.sub ? <div style={{ display: "flex", marginTop: 18, fontSize: fit(c.sub, cardW - 60, cap(36), MIN_FOOT, "2択の補足"), fontWeight: 500, color: C.sub }}>{c.sub}</div> : null}
        {won ? <div style={{ display: "flex", position: "absolute", top: -34, padding: "6px 26px", borderRadius: 999, background: C.red, color: C.white, fontSize: cap(44), fontWeight: 900, transform: `scale(${winPop})` }}>{s.win!.label}</div> : null}
      </div>
    );
  };
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ ...row, position: "relative", width: INNER_W, height: areaH, alignItems: "flex-end" }}>
        {card(s.left, 0, "left")}
        <div style={{ display: "flex", width: GAP, justifyContent: "center", alignSelf: "center" }}>
          <div style={{ display: "flex", width: 110, height: 110, borderRadius: 999, background: C.bar, color: C.white, fontSize: 52, fontWeight: 900, alignItems: "center", justifyContent: "center", opacity: shown(reveal, "item:1", t) > 0 ? 1 : 0.3 }}>VS</div>
        </div>
        {card(s.right, 1, "right")}
      </div>
      <Note text={s.note} />
    </div>
  );
}

/** 並べる（11/27〜）。cue で1枚ずつ。出たばかりの1枚は真ん中に大きく（次の1枚が出るか LINEUP_BIG 秒たつまで）、ほかは下に並ぶ */
export const LINEUP_BIG = 2.2;
function Lineup({ s, t, reveal }: { s: LineupScene; t: number; reveal: Record<string, number> }) {
  const areaH = bodyH(s.heading, s.note);
  const n = s.items.length;
  const GAP = 24;
  const cellW = Math.floor((INNER_W - GAP * (n - 1)) / n);
  const shownIdx = s.items.map((_, i) => i).filter((i) => shown(reveal, `item:${i}`, t) > 0);
  const latest = shownIdx[shownIdx.length - 1];
  const raw = (s as { revealRaw?: Record<string, number> }).revealRaw ?? reveal;
  const big = latest !== undefined && t - (raw[`item:${latest}`] ?? -99) < LINEUP_BIG ? latest : undefined;
  const cell = (it: LineupScene["items"][number], i: number, w: number, h: number, scale: number) => {
    const img = it.src ? loadImage(it.src) : null;
    const imgH = img ? Math.round(h * (scale > 1 ? 0.38 : 0.3)) : 0;
    const imgW = img ? Math.round((img.w * imgH) / img.h) : 0;
    return (
      <div style={{ ...col, width: w, height: h, alignItems: "center", justifyContent: "center", background: it.pick ? "#FFF5F5" : C.white, border: `${it.pick ? 8 : 4}px solid ${it.pick ? C.red : C.line}`, borderRadius: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        {img ? <img src={img.src} width={imgW} height={imgH} style={{ width: imgW, height: imgH, borderRadius: 12 }} /> : null}
        <div style={{ display: "flex", marginTop: 10, fontSize: fit(it.title, w - 30, Math.round(cap(46) * scale), MIN_FONT, "並べる題"), fontWeight: 900, color: C.ink, whiteSpace: "nowrap" }}>{it.title}</div>
        <div style={{ display: "flex", fontSize: fit(it.value, w - 30, Math.round(cap(54) * scale), MIN_FONT, "並べる値"), fontWeight: 900, color: it.pick ? C.red : C.ink, whiteSpace: "nowrap" }}>{it.value}</div>
        {it.sub ? <div style={{ display: "flex", fontSize: fit(it.sub, w - 30, Math.round(cap(32) * scale), MIN_FOOT, "並べる補足"), fontWeight: 500, color: C.sub, whiteSpace: "nowrap" }}>{it.sub}</div> : null}
      </div>
    );
  };
  const smallH = Math.round(areaH * 0.62);
  const bk = big !== undefined ? (s as { pulse?: Record<string, number> }).pulse?.[`item:${big}`] : undefined;
  const bigPop = bk === undefined ? 1 : 0.7 + 0.3 * easeOut(Math.min(1, bk / 8));
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ display: "flex", position: "relative", width: INNER_W, height: areaH }}>
        <div style={{ ...row, position: "absolute", left: 0, top: areaH - smallH, width: INNER_W, height: smallH, alignItems: "flex-end" }}>
          {s.items.map((it, i) => (
            <div key={i} style={{ display: "flex", marginLeft: i ? GAP : 0, opacity: shown(reveal, `item:${i}`, t) > 0 && i !== big ? 1 : i === big ? 0.15 : 0.12 }}>
              {cell(it, i, cellW, smallH, 1)}
            </div>
          ))}
        </div>
        {big !== undefined ? (
          <div style={{ display: "flex", position: "absolute", left: Math.round(INNER_W * 0.2), top: 0, width: Math.round(INNER_W * 0.6), height: areaH - 10, transform: `scale(${bigPop})`, boxShadow: "0 18px 40px rgba(0,0,0,0.25)", borderRadius: 24 }}>
            {cell(s.items[big], big, Math.round(INNER_W * 0.6), areaH - 10, 1.6)}
          </div>
        ) : null}
      </div>
      <Note text={s.note} />
    </div>
  );
}

/** カードの上に重ねるもの（11/27〜）: 出典カード（右下）・はんこ（右上に斜め） */
function Overlays({ ch, t }: { ch: TimelineChapter; t: number }) {
  const s = ch.scene as typeof ch.scene & { pulse?: Record<string, number> };
  const r = s.reveal;
  const src = s.source && r.source !== undefined && t >= r.source ? s.source : null;
  const stp = s.stamp && r.stamp !== undefined && t >= r.stamp ? s.stamp : null;
  const sk = s.pulse?.stamp;
  // はんこ: 大きく出て 0.27 秒で押される（2.2 倍 → 1 倍）
  const stampScale = sk === undefined ? 1 : 2.2 - 1.2 * easeOut(Math.min(1, sk / 8));
  const srcK = s.pulse?.source;
  const srcDy = srcK === undefined ? 0 : Math.round(40 * (1 - easeOut(Math.min(1, srcK / 8))));
  if (!src && !stp) return null;
  return (
    <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: CARD.w, height: CARD.h }}>
      {src ? (
        <div style={{ ...col, position: "absolute", left: CARD.w - Math.round(CARD.w * 0.4) - 30, top: 22, width: Math.round(CARD.w * 0.4), padding: "14px 24px", background: C.white, border: `4px solid ${C.bar}`, borderRadius: 18, boxShadow: "0 10px 26px rgba(0,0,0,0.22)", transform: `translateY(${srcDy}px)` }}>
          <div style={{ display: "flex", fontSize: MIN_FONT, fontWeight: 900, color: C.ink, lineHeight: 1.25 }}>{src.text}</div>
          <div style={{ display: "flex", marginTop: 6, fontSize: MIN_FOOT, fontWeight: 500, color: C.sub }}>{`出典：${src.from}`}</div>
        </div>
      ) : null}
      {stp ? (
        <div style={{ display: "flex", position: "absolute", left: CARD.w - 250 - 70, top: 40, width: 250, height: 250, borderRadius: 999, border: `12px solid ${C.red}`, alignItems: "center", justifyContent: "center", transform: `rotate(-14deg) scale(${stampScale})`, opacity: 0.92 }}>
          <div style={{ display: "flex", width: 206, height: 206, borderRadius: 999, border: `4px solid ${C.red}`, alignItems: "center", justifyContent: "center", textAlign: "center", padding: 10, color: C.red, fontSize: Math.max(...stp.text.split("／").map((x) => x.length)) > 4 ? 44 : 56, fontWeight: 900, lineHeight: 1.1, flexDirection: "column" }}>{stp.text.split("／").map((x, k) => <div key={k} style={{ display: "flex" }}>{x}</div>)}</div>
        </div>
      ) : null}
    </div>
  );
}

/** 思考の吹き出し（11/27〜）: 話し手の立ち絵の上に、もこもこの吹き出し（丸を重ねる）と小さい丸2つ。cue から、その台詞が終わるまで */
export function thinkOn(ch: TimelineChapter, local: number): boolean {
  const s = ch.scene;
  if (!s.think || s.reveal.think === undefined || local < s.reveal.think) return false;
  const l = ch.lines.find((x) => x.start - ch.start <= s.reveal.think! + 0.01 && x.end - ch.start > s.reveal.think!);
  return l ? local < l.end - ch.start + 0.6 : local < s.reveal.think + 3;
}
function ThinkBubble({ ch, t }: { ch: TimelineChapter; t: number }) {
  const s = ch.scene;
  if (!s.think || !thinkOn(ch, t)) return null;
  const left = (s.think.who ?? "ずんだもん") === "ずんだもん";
  const W0 = 760, H0 = 220;
  const x = left ? 40 : W - W0 - 40;
  const y = L.art.y - H0 - 70;
  const puff = [[0.08, 0.42, 0.34], [0.26, 0.2, 0.42], [0.5, 0.16, 0.44], [0.74, 0.22, 0.4], [0.9, 0.46, 0.32], [0.5, 0.62, 0.5], [0.24, 0.66, 0.36], [0.76, 0.66, 0.36]];
  return (
    <div style={{ display: "flex", position: "absolute", left: x, top: y, width: W0, height: H0 + 70 }}>
      {puff.map(([px, py, pr], k) => (
        <div key={k} style={{ display: "flex", position: "absolute", left: Math.round(px * W0 - pr * H0), top: Math.round(py * H0 - pr * H0), width: Math.round(pr * H0 * 2), height: Math.round(pr * H0 * 2), borderRadius: 999, background: C.white, border: `5px solid ${C.ink}` }} />
      ))}
      {puff.map(([px, py, pr], k) => (
        <div key={`f${k}`} style={{ display: "flex", position: "absolute", left: Math.round(px * W0 - pr * H0) + 5, top: Math.round(py * H0 - pr * H0) + 5, width: Math.round(pr * H0 * 2) - 10, height: Math.round(pr * H0 * 2) - 10, borderRadius: 999, background: C.white }} />
      ))}
      <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: W0, height: H0, alignItems: "center", justifyContent: "center", fontSize: s.think.text.length > 12 ? 40 : 48, fontWeight: 900, color: C.ink, paddingTop: 10 }}>{s.think.text}</div>
      <div style={{ display: "flex", position: "absolute", left: left ? 90 : W0 - 130, top: H0 + 6, width: 40, height: 40, borderRadius: 999, background: C.white, border: `5px solid ${C.ink}` }} />
      <div style={{ display: "flex", position: "absolute", left: left ? 60 : W0 - 84, top: H0 + 46, width: 24, height: 24, borderRadius: 999, background: C.white, border: `4px solid ${C.ink}` }} />
    </div>
  );
}


/** 線グラフが左から描かれる（11/27〜・図解）。draw の cue から TREND_SEC 秒で右端まで。先頭の点に今の値 */
export const TREND_SEC = 2.4;
function Trend({ s, t, reveal }: { s: TrendScene; t: number; reveal: Record<string, number> }) {
  const areaH = bodyH(s.heading, s.note);
  const raw = (s as { revealRaw?: Record<string, number> }).revealRaw ?? reveal;
  const t0 = raw.draw ?? 0;
  const prog = Math.max(0, Math.min(1, (t - t0) / TREND_SEC));
  const pe = easeOut(prog);
  const all = s.series.flatMap((x) => x.points.map((p) => p[1]));
  const lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.25 || hi * 0.05;
  const vmin = lo - pad, vmax = hi + pad;
  const W0 = INNER_W - 260, H0 = areaH - 90, X0 = 20, Y0 = 20;
  const n = s.series[0].points.length;
  const xAt = (i: number) => X0 + (W0 * i) / Math.max(1, n - 1);
  const yAt = (v: number) => Y0 + H0 * (1 - (v - vmin) / (vmax - vmin));
  const colors = [C.barFill, C.red, SITE.safe];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W0 + 40}" height="${H0 + 40}" viewBox="0 0 ${W0 + 40} ${H0 + 40}">`;
  for (let g = 0; g <= 4; g++) { const y = Y0 + (H0 * g) / 4; svg += `<line x1="${X0}" y1="${y}" x2="${X0 + W0}" y2="${y}" stroke="#E2E5EE" stroke-width="2"/>`; }
  const heads: { x: number; y: number; v: number; c: string; label: string }[] = [];
  s.series.forEach((ser, k) => {
    const upto = pe * (n - 1);
    const pts: string[] = [];
    for (let i = 0; i <= Math.floor(upto); i++) pts.push(`${xAt(i).toFixed(1)},${yAt(ser.points[i][1]).toFixed(1)}`);
    let hx = xAt(Math.floor(upto)), hv = ser.points[Math.floor(upto)][1];
    if (upto < n - 1) {
      const i = Math.floor(upto), f = upto - i;
      hv = ser.points[i][1] + (ser.points[i + 1][1] - ser.points[i][1]) * f;
      hx = xAt(i) + (xAt(i + 1) - xAt(i)) * f;
      pts.push(`${hx.toFixed(1)},${yAt(hv).toFixed(1)}`);
    }
    const c = ser.color ?? colors[k % colors.length];
    if (pts.length > 1) svg += `<polyline points="${pts.join(" ")}" fill="none" stroke="${c}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>`;
    svg += `<circle cx="${hx}" cy="${yAt(hv)}" r="14" fill="${c}" stroke="#fff" stroke-width="5"/>`;
    heads.push({ x: hx, y: yAt(hv), v: hv, c, label: ser.label });
  });
  svg += `</svg>`;
  const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const first = s.series[0].points[0][0], last = s.series[0].points[n - 1][0];
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ display: "flex", position: "relative", width: INNER_W, height: areaH }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={uri} width={W0 + 40} height={H0 + 40} style={{ position: "absolute", left: 0, top: 0, width: W0 + 40, height: H0 + 40 }} />
        <div style={{ display: "flex", position: "absolute", left: X0, top: H0 + 44, fontSize: MIN_FOOT, color: C.sub, fontWeight: 700 }}>{first}</div>
        <div style={{ display: "flex", position: "absolute", left: X0 + W0 - 80, top: H0 + 44, fontSize: MIN_FOOT, color: C.sub, fontWeight: 700 }}>{last}</div>
        {prog > 0 ? heads.map((h, k) => (
          <div key={k} style={{ ...col, position: "absolute", left: Math.min(INNER_W - 300, h.x + 26), top: Math.round(h.y - 46), padding: "6px 16px", borderRadius: 12, background: h.c, color: C.white }}>
            <div style={{ display: "flex", fontSize: MIN_FOOT, fontWeight: 700 }}>{h.label}</div>
            <div style={{ display: "flex", fontSize: cap(44), fontWeight: 900, lineHeight: 1.05 }}>{`${Math.round(h.v).toLocaleString("ja-JP")}${s.unit}`}</div>
          </div>
        )) : null}
        {prog > 0 ? (
          <div style={{ display: "flex", position: "absolute", left: X0 + 4, top: Math.round(yAt(s.series[0].points[0][1]) - 64), padding: "4px 14px", borderRadius: 10, background: C.white, border: `3px solid ${C.line}`, fontSize: cap(34), fontWeight: 900, color: C.sub }}>{`${s.series[0].points[0][1].toLocaleString("ja-JP")}${s.unit}`}</div>
        ) : null}
        {s.callout && prog >= 1 ? (
          <div style={{ display: "flex", position: "absolute", left: Math.round(W0 * 0.32), top: 10, padding: "10px 26px", borderRadius: 16, background: C.red, color: C.white, fontSize: cap(48), fontWeight: 900, transform: `scale(${(() => { const k = (s as { pulse?: Record<string, number> }).pulse?.callout; return k === undefined ? 1 : 0.6 + 0.4 * easeOut(Math.min(1, k / 8)); })()})` }}>{s.callout.text}</div>
        ) : null}
      </div>
      <Note text={s.note} />
    </div>
  );
}

/** 分かれ道（11/27〜・図解）: 上に問いの箱、cue で下の答えへ矢印が1本ずつ伸びる */
function Flow({ s, t, reveal }: { s: FlowScene; t: number; reveal: Record<string, number> }) {
  const areaH = bodyH(s.heading, s.note);
  const n = s.branches.length;
  const qW = Math.round(INNER_W * 0.5), qH = 120;
  const GAP = 40;
  const bW = Math.floor((INNER_W - GAP * (n - 1)) / n), bH = Math.round(areaH * 0.42);
  const bY = areaH - bH - 10;
  const qX = Math.round((INNER_W - qW) / 2);
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ display: "flex", position: "relative", width: INNER_W, height: areaH }}>
        <div style={{ display: "flex", position: "absolute", left: qX, top: 0, width: qW, height: qH, borderRadius: 24, background: C.bar, color: C.white, alignItems: "center", justifyContent: "center", fontSize: fit(s.q, qW - 40, cap(56), MIN_FONT, "分かれ道の問い"), fontWeight: 900 }}>{s.q}</div>
        {s.branches.map((b, i) => {
          const p = shown(reveal, `item:${i}`, t);
          const bx = i * (bW + GAP);
          const cx = bx + bW / 2;
          // 問いの箱の下から答えの箱の上へ、斜めの線（SVG）
          const x1 = qX + qW / 2 + (i - (n - 1) / 2) * 60, y1 = qH;
          const x2 = cx, y2 = bY - 4;
          const minX = Math.min(x1, x2) - 30, wS = Math.abs(x2 - x1) + 60, hS = y2 - y1;
          const len = Math.hypot(x2 - x1, hS);
          const ang = Math.atan2(hS, x2 - x1);
          const ex = x2 - minX, ey = hS;
          const ah = 30;
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${wS}" height="${hS}" viewBox="0 0 ${wS} ${hS}"><line x1="${x1 - minX}" y1="0" x2="${ex - Math.cos(ang) * ah * 0.8}" y2="${ey - Math.sin(ang) * ah * 0.8}" stroke="${C.red}" stroke-width="10" stroke-linecap="round"/><path d="M${ex},${ey} L${ex - Math.cos(ang - 0.45) * ah},${ey - Math.sin(ang - 0.45) * ah} L${ex - Math.cos(ang + 0.45) * ah},${ey - Math.sin(ang + 0.45) * ah} Z" fill="${C.red}"/></svg>`;
          void len;
          return (
            <div key={i} style={{ display: "flex", position: "absolute", left: 0, top: 0, width: INNER_W, height: areaH, opacity: p * (s.branches.some((_, j) => j > i && shown(reveal, `item:${j}`, t) > 0) && !s.keepAll ? 0.35 : 1) }}>
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
              <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} width={wS} height={hS} style={{ position: "absolute", left: Math.round(minX), top: y1, width: wS, height: hS }} />
              <div style={{ display: "flex", position: "absolute", left: Math.round((x1 + x2) / 2 - 110), top: Math.round((y1 + y2) / 2 - 30), width: 220, height: 60, borderRadius: 999, background: C.white, border: `4px solid ${C.red}`, color: C.red, alignItems: "center", justifyContent: "center", fontSize: MIN_FONT, fontWeight: 900 }}>{b.label}</div>
              <div style={{ ...col, position: "absolute", left: bx, top: bY, width: bW, height: bH, borderRadius: 24, border: `6px solid ${b.pick ? C.red : C.line}`, background: b.pick ? "#FFF5F5" : C.rowAlt, alignItems: "center", justifyContent: "center", ...bump(s, `item:${i}`) }}>
                <div style={{ display: "flex", fontSize: fit(b.answer, bW - 40, cap(64), MIN_FONT, "分かれ道の答え"), fontWeight: 900, color: b.pick ? C.red : C.ink }}>{b.answer}</div>
                {b.sub ? <div style={{ display: "flex", marginTop: 10, fontSize: fit(b.sub, bW - 40, cap(36), MIN_FOOT, "分かれ道の補足"), fontWeight: 500, color: C.sub }}>{b.sub}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
      <Note text={s.note} />
    </div>
  );
}


/** 困りごとのカード（11/27〜・タコの冒頭の型）: 左に人（いらすとや）と名札、右に困りごとが cue で1つずつ */
function Problems({ s, t, reveal }: { s: ProblemsScene; t: number; reveal: Record<string, number> }) {
  const areaH = bodyH(s.heading, s.note);
  const leftW = Math.round(INNER_W * 0.36);
  const img = s.img ? loadImage(s.img) : null;
  const ih = Math.round(areaH * 0.7);
  const iw = img ? Math.round((img.w * ih) / img.h) : 0;
  const textW = INNER_W - leftW - 40;
  const rowH = Math.min(cap(130), Math.floor((areaH - 20) / Math.max(1, s.items.length)));
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ ...row, width: INNER_W, height: areaH, alignItems: "flex-start" }}>
        <div style={{ ...col, width: leftW, height: areaH, alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          {img ? <img src={img.src} width={iw} height={ih} style={{ width: iw, height: ih }} /> : null}
          <div style={{ display: "flex", marginTop: 10, padding: "8px 22px", borderRadius: 999, background: C.bar, color: C.white, fontSize: fit(s.who, leftW - 20, cap(40), MIN_FONT, "困りごとの名札"), fontWeight: 900, whiteSpace: "nowrap" }}>{s.who}</div>
        </div>
        <div style={{ ...col, width: textW, marginLeft: 40, height: areaH, justifyContent: "center" }}>
          {s.items.map((it, i) => {
            const p = shown(reveal, `item:${i}`, t);
            return (
              <div key={i} style={{ ...row, width: textW, height: rowH, opacity: p, ...bump(s, `item:${i}`) }}>
                <div style={{ display: "flex", width: 56, height: 56, borderRadius: 999, background: C.red, color: C.white, fontSize: 36, fontWeight: 900, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>!</div>
                <div style={{ display: "flex", marginLeft: 22, fontSize: fit(it.text, textW - 90, Math.min(cap(60), Math.floor(rowH * 0.55)), MIN_FONT, "困りごと"), fontWeight: 900, color: C.ink, whiteSpace: "nowrap" }}>{it.text}</div>
              </div>
            );
          })}
        </div>
      </div>
      <Note text={s.note} />
    </div>
  );
}

/** 積み上げの総額（11/27〜・タコの「2年でいくら？」）: 縦の棒を部分ごとに積む。minus は斜線（下取り・売って戻る分）。diff の cue で2本の差に点線と札 */
function Costs({ s, t, reveal }: { s: CostsScene; t: number; reveal: Record<string, number> }) {
  const areaH = bodyH(s.heading, s.note);
  const n = s.items.length;
  const colW = Math.floor(INNER_W / n);
  const barW = Math.min(260, Math.floor(colW * 0.5));
  const labelH = cap(60), topPad = 80;
  const plotH = areaH - labelH - topPad - 10;
  const total = (it: CostsScene["items"][number]) => it.parts.filter((p) => !p.minus).reduce((a, p) => a + p.value, 0);
  const max = Math.max(...s.items.map(total)) * 1.05;
  const yOf = (v: number) => topPad + plotH * (1 - v / max);
  const colors = [C.barFill, "#E08A1E", SITE.safe, "#7A5AF8"];
  // 斜線（satori はくり返しのグラデーションを読めないので SVG の模様で）
  const hatchImg = (w: number, h: number, c: string) => {
    const W1 = Math.max(1, Math.round(w)), H1 = Math.max(1, Math.round(h));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W1}" height="${H1}"><defs><pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="20" fill="${c}"/></pattern></defs><rect width="${W1}" height="${H1}" fill="#ffffff"/><rect width="${W1}" height="${H1}" fill="url(#p)"/></svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  };
  const diffOn = s.diff && reveal.diff !== undefined && t >= reveal.diff;
  const dk = (s as { pulse?: Record<string, number> }).pulse?.diff;
  const dPop = dk === undefined ? 1 : 0.6 + 0.4 * easeOut(Math.min(1, dk / 8));
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ display: "flex", position: "relative", width: INNER_W, height: areaH }}>
        {s.items.map((it, i) => {
          const p = shown(reveal, `item:${i}`, t);
          const g = (s as { grow?: Record<string, number> }).grow?.[`item:${i}`] ?? 1;
          const cx = colW * i + colW / 2;
          let acc = 0;
          const segs = it.parts.filter((q) => !q.minus).map((q, k) => {
            const y1 = yOf((acc + q.value) * g), y0 = yOf(acc * g);
            acc += q.value;
            return <div key={k} style={{ display: "flex", position: "absolute", left: Math.round(cx - barW / 2), top: Math.round(y1), width: barW, height: Math.max(0, Math.round(y0 - y1)), background: q.color ?? colors[k % colors.length], borderTop: "3px solid #fff" }} />;
          });
          const tot = total(it);
          const minus = it.parts.filter((q) => q.minus);
          let macc = tot;
          const msegs = minus.map((q, k) => {
            const y0 = yOf(macc * g), y1 = yOf((macc - q.value) * g);
            macc -= q.value;
            const hh = Math.max(1, Math.round(y1 - y0));
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            return <img key={`m${k}`} src={hatchImg(barW - 16, hh, q.color ?? SITE.safe)} width={barW - 16} height={hh} style={{ position: "absolute", left: Math.round(cx - barW / 2) + 8, top: Math.round(y0), width: barW - 16, height: hh }} />;
          });
          return (
            <div key={i} style={{ display: "flex", position: "absolute", left: 0, top: 0, width: INNER_W, height: areaH, opacity: p > 0 ? 1 : 0.18 }}>
              {segs}
              {msegs}
              <div style={{ display: "flex", position: "absolute", left: Math.round(cx - 160), top: Math.round(yOf(tot * g)) - 78, width: 320, justifyContent: "center", fontSize: cap(48), fontWeight: 900, color: it.pick ? C.red : C.ink, whiteSpace: "nowrap" }}>{p > 0 ? `${Math.round(tot * g).toLocaleString("ja-JP")}${s.unit}` : ""}</div>
              <div style={{ display: "flex", position: "absolute", left: Math.round(cx - colW / 2), top: areaH - labelH, width: colW, justifyContent: "center", fontSize: fit(it.label, colW - 20, cap(44), MIN_FONT, "総額の名前"), fontWeight: 900, color: C.ink }}>{it.label}</div>
            </div>
          );
        })}
        {diffOn ? (() => {
          const a = s.items[s.diff!.from], b = s.items[s.diff!.to];
          const ya = yOf(total(a)), yb = yOf(total(b));
          const xa = colW * s.diff!.from + colW / 2 + barW / 2 + 20, xb = colW * s.diff!.to + colW / 2 - barW / 2 - 20;
          const yTop = Math.min(ya, yb), yBot = Math.max(ya, yb);
          return (
            <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: INNER_W, height: areaH }}>
              <div style={{ display: "flex", position: "absolute", left: Math.round(Math.min(xa, xb)), top: Math.round(ya), width: Math.round(Math.abs(xb - xa)), height: 0, borderTop: `5px dashed ${C.red}` }} />
              <div style={{ display: "flex", position: "absolute", left: Math.round(xb - 4), top: Math.round(yTop), width: 0, height: Math.round(yBot - yTop), borderLeft: `5px dashed ${C.red}` }} />
              <div style={{ display: "flex", position: "absolute", left: Math.round(colW * s.diff!.to + colW / 2 - (s.diff!.label.length * cap(46) * 0.62 + 44) / 2), top: Math.round(Math.max(yTop + 30, (yTop + yBot) / 2 - 36)), whiteSpace: "nowrap", padding: "8px 22px", borderRadius: 14, background: C.red, color: C.white, fontSize: cap(46), fontWeight: 900, transform: `scale(${dPop})` }}>{s.diff!.label}</div>
            </div>
          );
        })() : null}
        {s.legend ? (
          <div style={{ ...row, position: "absolute", left: 0, top: 0, width: INNER_W, justifyContent: "flex-end" }}>
            {s.legend.map((lg, k) => (
              <div key={k} style={{ ...row, marginLeft: 28 }}>
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                {lg.minus ? <img src={hatchImg(30, 30, lg.color)} width={30} height={30} style={{ width: 30, height: 30, borderRadius: 6 }} /> : <div style={{ display: "flex", width: 30, height: 30, borderRadius: 6, background: lg.color }} />}
                <div style={{ display: "flex", marginLeft: 10, fontSize: MIN_FOOT, fontWeight: 700, color: C.sub }}>{lg.label}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <Note text={s.note} />
    </div>
  );
}


/** 年表（11/27〜・タコの年表の型）: 機種ごとの横の帯（from 年 → to 年）。sweep の cue で「今日」の縦線が左から右へ進み、各行に「◯年目」の札 */
export const YEARS_SEC = 2.0;
function Years({ s, t, reveal }: { s: YearsScene; t: number; reveal: Record<string, number> }) {
  const areaH = bodyH(s.heading, s.note);
  const raw = (s as { revealRaw?: Record<string, number> }).revealRaw ?? reveal;
  const LABEL = 300, R = 40, axisH = 56;
  const W0 = INNER_W - LABEL - R;
  const rowH = Math.min(cap(110), Math.floor((areaH - axisH - 20) / s.rows.length));
  const xOf = (y: number) => LABEL + (W0 * (y - s.start)) / (s.end - s.start);
  const sw = raw.sweep !== undefined ? Math.max(0, Math.min(1, (t - raw.sweep) / YEARS_SEC)) : 0;
  const nowY = s.start + (s.today - s.start) * easeOut(sw);
  const years: number[] = [];
  for (let y = Math.ceil(s.start); y <= s.end; y++) years.push(y);
  return (
    <div style={{ ...col, width: INNER_W, height: "100%" }}>
      <Heading text={s.heading} />
      <div style={{ display: "flex", position: "relative", width: INNER_W, height: areaH }}>
        {years.map((y) => (
          <div key={y} style={{ display: "flex", position: "absolute", left: Math.round(xOf(y)) - 1, top: 0, width: 2, height: areaH - axisH, background: C.line }} />
        ))}
        {years.map((y) => (
          <div key={`l${y}`} style={{ display: "flex", position: "absolute", left: Math.round(xOf(y)) - 40, top: areaH - axisH + 8, width: 80, justifyContent: "center", fontSize: MIN_FOOT, fontWeight: 700, color: C.sub }}>{String(y)}</div>
        ))}
        {s.rows.map((r, i) => {
          const p = shown(reveal, `item:${i}`, t);
          const y0 = 10 + i * rowH;
          const x0 = xOf(r.from), x1 = xOf(Math.min(r.to ?? s.today, nowY > r.from ? Math.max(r.from, nowY) : r.from));
          const age = Math.max(0, Math.floor(nowY - r.from) + 1);
          return (
            <div key={i} style={{ display: "flex", position: "absolute", left: 0, top: y0, width: INNER_W, height: rowH, opacity: p > 0 ? 1 : 0.15 }}>
              <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: LABEL - 20, height: rowH, alignItems: "center", fontSize: fit(r.label, LABEL - 30, cap(44), MIN_FONT, "年表の名前"), fontWeight: 900, color: r.pick ? C.red : C.ink, whiteSpace: "nowrap" }}>{r.label}</div>
              <div style={{ display: "flex", position: "absolute", left: Math.round(x0), top: Math.round(rowH * 0.25), width: Math.max(8, Math.round(x1 - x0)), height: Math.round(rowH * 0.5), borderRadius: 10, background: r.pick ? C.red : C.barFill }} />
              {sw > 0 && nowY > r.from ? (
                <div style={{ display: "flex", position: "absolute", left: Math.round(x1) + 14, top: Math.round(rowH * 0.2), height: Math.round(rowH * 0.6), alignItems: "center", padding: "0 14px", borderRadius: 10, background: C.white, border: `3px solid ${r.pick ? C.red : C.bar}`, fontSize: MIN_FONT, fontWeight: 900, color: r.pick ? C.red : C.ink, whiteSpace: "nowrap" }}>{`${age}年目`}</div>
              ) : null}
            </div>
          );
        })}
        {sw > 0 ? (
          <div style={{ display: "flex", position: "absolute", left: Math.round(xOf(nowY)) - 4, top: 0, width: 8, height: areaH - axisH, background: "#F4B400", boxShadow: "0 0 18px rgba(244,180,0,0.8)" }} />
        ) : null}
        {sw > 0 ? (
          <div style={{ display: "flex", position: "absolute", left: Math.round(xOf(nowY)) - 70, top: -6, width: 140, justifyContent: "center", padding: "2px 0", borderRadius: 999, background: "#F4B400", color: C.ink, fontSize: MIN_FOOT, fontWeight: 900 }}>{sw >= 1 ? s.todayLabel ?? "今日" : String(Math.floor(nowY))}</div>
        ) : null}
      </div>
      <Note text={s.note} />
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
    case "photo":
      return <Photo s={s} t={t} reveal={reveal} />;
    case "endScreen":
      return <EndScreen s={s} />;
    case "gauges":
      return <Gauges s={s} t={t} reveal={reveal} />;
    case "screen":
      return <Screen s={s} t={t} reveal={reveal} />;
    case "versus":
      return <Versus s={s} t={t} reveal={reveal} />;
    case "lineup":
      return <Lineup s={s} t={t} reveal={reveal} />;
    case "trend":
      return <Trend s={s} t={t} reveal={reveal} />;
    case "flow":
      return <Flow s={s} t={t} reveal={reveal} />;
    case "problems":
      return <Problems s={s} t={t} reveal={reveal} />;
    case "costs":
      return <Costs s={s} t={t} reveal={reveal} />;
    case "years":
      return <Years s={s} t={t} reveal={reveal} />;
  }
}

// ───────── いつも出ている枠 ─────────

function ChapterBar({ ch, count }: { ch: TimelineChapter; count: number }) {
  const num = String(ch.index); // ゼロ埋めしない（「9/9」。10/23 ユーザー指示）
  return (
    <div style={{ ...row, position: "absolute", left: L.headerX ?? HEADER.x, top: HEADER.y, height: HEADER.h, background: C.bar, borderRadius: 14, paddingRight: 32 }}>
      <div style={{ ...row, height: HEADER.h, padding: "0 22px", background: C.red, borderRadius: "14px 0 0 14px", color: C.white, fontSize: 36, fontWeight: 900 }}>{`${num}/${count}`}</div>
      <div style={{ display: "flex", marginLeft: 24, fontSize: fit(ch.title, 1200, 40, MIN_FONT, "章の帯"), fontWeight: 900, color: C.white }}>{ch.title}</div>
    </div>
  );
}

/** 立ち絵（longform/assets/chara/。video.tsx の loadCharaArt が読む）。src は data URI、w・h は元の画像の大きさ */
export type ArtImage = { src: string; w: number; h: number };
export type CharaArt = Partial<Record<Who, { closed: ArtImage; talk?: ArtImage; /** 母音ごとの口（11/27〜） */ mouth?: Partial<Record<string, ArtImage>>; /** 表情違い（11/27〜・chara-video-expr.py） */ expr?: Partial<Record<Expr, { closed: ArtImage; talk?: ArtImage }>> }>>;
export type Expr = "surprised" | "shock" | "wink";
/**
 * 台詞から表情を決める（11/27〜・競合の調査: 合成音声の動画は表情・ポーズの切り替えがいちばん多い）。
 * ずんだもん: 「！」・「え、」で驚き、困る言葉で青ざめ。つむぎ: 「！」で驚き、勧める・締める言葉で得意げ
 */
export function lineExpr(who: Who, text: string): Expr | undefined {
  if (who === "ずんだもん") {
    if (/^(え[、っ]|ええ|えっ)|！|びっくり|すごい/.test(text)) return "surprised";
    if (/(高い|高くなる|足りない|困る|止まる|割れ|損|使えない|ないのだ)/.test(text)) return "shock";
    return undefined;
  }
  if (/！/.test(text)) return "surprised";
  if (/(いいね|安心だよ|おすすめ|選んでね|見てね|だね。$)/.test(text)) return "wink";
  return undefined;
}

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
/** 立ち絵の枠（絵だけ）。ox・oy は描く紙の左上（video.tsx が話している人の絵だけを小さな紙に描くときに使う） */
function SpeakerArt({ x, active, art, mouthOpen, dy = 0, ox = 0, oy = 0 }: { x: number; active: boolean; art: NonNullable<CharaArt[Who]>; mouthOpen?: boolean; dy?: number; ox?: number; oy?: number }) {
  const A = L.art;
  const img = active && mouthOpen && art.talk ? art.talk : art.closed;
  // バストアップ（bust）: 絵の上から bust 割を枠の高さに合わせて拡大し、上ぞろえで切る
  const bust = x === SLOT.left ? A.bust : (A.bustRight ?? A.bust);
  const h = bust ? Math.round((A.h / bust) * (active ? 1 : 0.94)) : Math.round(A.imgH * (active ? 1 : 0.92));
  const w = Math.round((img.w * h) / img.h);
  const left = x === SLOT.left ? A.left : A.right;
  const top = A.bust ? Math.round(A.h * (active ? 0 : 0.06)) + (x === SLOT.left ? 0 : (A.topRight ?? 0)) : A.h - h;
  return (
    <div style={{ ...col, position: "absolute", left: left - ox, top: A.y + dy - oy, width: A.w, height: A.h, justifyContent: "flex-end", alignItems: "center", overflow: "hidden", borderRadius: A.bust ? 20 : 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={img.src} width={w} height={h} style={{ position: "absolute", left: Math.round((A.w - w) / 2) + (x === SLOT.left ? 0 : (A.dxRight ?? 0)), top, width: w, height: h, opacity: active ? 1 : 0.5 }} />
    </div>
  );
}

function SpeakerSlot({ who, x, active, art, mouthOpen, plate, dy = 0, hideArt = false }: { who: Who; x: number; active: boolean; art?: CharaArt[Who]; mouthOpen?: boolean; plate: number; dy?: number; hideArt?: boolean }) {
  const color = SPEAKER_COLOR[who];
  const A = L.art;
  if (art) {
    const left = x === SLOT.left ? A.left : A.right;
    // 名前の札は立ち絵の上に出す（絵に重ねない。11/23 ユーザー）
    const plateTop = A.y - Math.ceil(L.plate.font * 1.45) - 28 - 8;
    return (
      <>
        {hideArt ? null : <SpeakerArt x={x} active={active} art={art} mouthOpen={mouthOpen} dy={dy} />}
        {plate > 0 ? <NamePlate who={who} active={active} style={{ position: "absolute", left: left + Math.round((A.w - L.plate.w) / 2), top: plateTop, marginBottom: 0, opacity: plate }} /> : null}
      </>
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

/**
 * 字幕の残り時間（11/23〜）: そのページが替わるまでを、話し手の色の線が帯の上辺を左から右へ等速で伸びて表す。
 * prog は 0〜1（SUB_STEPS 段）。video.tsx は線だけの小さな絵（ringSprite）を毎コマ重ねる
 */
const RING = 10;
export const SUB_STEPS = 240;
/** 字幕の縁の線の長さ（px）。0 なら描かない */
export const ringPx = (who: Who | null, prog: number) => (!who || prog <= 0 ? 0 : Math.round(prog * SUB.w));
function SubRing({ who, prog, dy, ox = 0, oy = 0 }: { who: Who | null; prog: number; dy: number; ox?: number; oy?: number }) {
  const px = ringPx(who, prog);
  if (!who || !px) return null;
  const w = SUB.w, h = SUB.h, color = SPEAKER_COLOR[who];
  // 上辺だけを左から右へ（11/23 ユーザー「上辺だけにして」）
  const seg: CSSProperties[] = [{ left: 0, top: 0, width: px, height: RING }];
  return (
    <div style={{ display: "flex", position: "absolute", left: SUB.x - ox, top: SUB.y + dy - oy, width: w, height: h, borderRadius: 20, overflow: "hidden" }}>
      {seg.map((st, i) => <div key={i} style={{ display: "flex", position: "absolute", background: color, ...st }} />)}
    </div>
  );
}
/** t 秒の字幕の縁の進み（0〜1・SUB_STEPS 段） */
export function subProgress(tl: Timeline, t: number): number {
  const { page } = stateAt(tl, t);
  if (!page || !(page.end > page.start)) return 0;
  return Math.min(1, Math.floor(((t - page.start) / (page.end - page.start)) * SUB_STEPS + 1e-6) / SUB_STEPS);
}

function Subtitle({ who, text, dy = 0 }: { who: Who | null; text: string; dy?: number }) {
  // 帯の端の線は見えない色にして字の位置だけ残す（色の線は SubRing が縁を一周させる。11/23）
  const right = SUB.edgeSide === "speaker" && who === "つむぎ";
  const edgeLine = `14px solid ${C.white}`;
  const tag = SUB.tag === "always";
  return (
    <div style={{ ...row, position: "absolute", left: SUB.x, top: SUB.y + dy, width: SUB.w, height: SUB.h, background: C.white, borderRadius: 20, borderLeft: right ? "none" : edgeLine, borderRight: right ? edgeLine : "none" }}>
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
  /** 声の大きさ（0〜3。video.tsx が声の波形から入れる）。話している人を上に弾ませる */
  level?: number;
  /**
   * "base": 毎コマ動くもの（話している人の立ち絵・字幕の縁の線）を描かない土台（11/24〜 video.tsx。動くものは
   * speakerSprite・ringSprite の小さな絵を ffmpeg で毎コマ重ねる）
   */
  layer?: "base";
  /** カメラ（11/27 動きの見本〜）: カードの中身を拡大・移動する。x・y は px（拡大の後） */
  camera?: { scale: number; x: number; y: number };
};

/** 話している人の立ち絵の y のずれ（話し始めの浮き上がり＋声の大きさ）。frameAt と video.tsx で同じ式 */
export const speakerDy = (spk: number | undefined, level = 0) => (spk === undefined ? 0 : settle(spk, SPK_UP)) - level * LEVEL_Y;
/** 字幕（と縁の線）の y のずれ（ページが替わったときの浮き上がり） */
export const subDy = (sub: number | undefined) => (sub === undefined ? 0 : settle(sub, SUB_Y));

/**
 * ffmpeg で重ねる小さな絵の場所（1920x1080 の座標・すべて偶数）。立ち絵は浮き上がり（最大 SPK_UP＋声 3段）の分だけ上に広く、
 * 縁の線は字幕の浮き上がり（SUB_Y）の分だけ下に広く取る
 */
const even = (v: number, up = false) => (up ? Math.ceil(v / 2) * 2 : Math.floor(v / 2) * 2);
export function spriteRegion(kind: Who | "ring"): { x: number; y: number; w: number; h: number } {
  if (kind === "ring") return { x: even(SUB.x), y: even(SUB.y), w: even(SUB.w + 2, true), h: even(RING + SUB_Y + 4, true) };
  const A = L.art;
  const left = kind === "ずんだもん" ? A.left : A.right;
  const x = Math.max(0, even(left - 2)), y = Math.max(0, even(A.y + SPK_UP - 3 * LEVEL_Y - 4));
  return { x, y, w: even(Math.min(W, left + A.w + 2) - x, true), h: even(Math.min(H, A.y + A.h + 2) - y, true) };
}
/** 話している人の立ち絵だけ（spriteRegion の大きさの透明な紙） */
export function speakerSprite(who: Who, art: NonNullable<CharaArt[Who]>, mouthOpen: boolean, dy: number, expr?: Expr, vowel?: string): ReactElement {
  const R = spriteRegion(who);
  // 母音の口（表情がないときだけ。表情のときは開く・閉じるの2つ）
  const vm = !expr && vowel && vowel !== "_" ? art.mouth?.[vowel] : undefined;
  const a = vm ? { closed: vm } : (expr && art.expr?.[expr]) || art;
  return (
    <div style={{ display: "flex", position: "relative", width: R.w, height: R.h }}>
      <SpeakerArt x={who === "ずんだもん" ? SLOT.left : SLOT.right} active art={a} mouthOpen={mouthOpen} dy={dy} ox={R.x} oy={R.y} />
    </div>
  );
}
/** 字幕の縁の線だけ（px の長さ。spriteRegion("ring") の大きさの透明な紙） */
export function ringSprite(who: Who, px: number, dy: number): ReactElement {
  const R = spriteRegion("ring");
  return (
    <div style={{ display: "flex", position: "relative", width: R.w, height: R.h }}>
      <SubRing who={who} prog={px / SUB.w} dy={dy} ox={R.x} oy={R.y} />
    </div>
  );
}
/** 何も描かない透明な紙 */
export const emptySprite = (w: number, h: number): ReactElement => <div style={{ display: "flex", width: w, height: h }} />;

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
  const anim = animAt(tl, t);
  const base = shownSet ? { ...ch, scene: { ...ch.scene, reveal: Object.fromEntries(Object.keys(ch.scene.reveal).map((k) => [k, shownSet.has(k) ? -1000 : 1000])) } } : ch;
  const scene = { ...base, scene: { ...base.scene, pulse: anim.items, shake: anim.shake, grow: anim.grow, revealRaw: ch.scene.reveal } };
  const spkDy = speakerDy(anim.spk, opts.level ?? 0);
  // 土台（layer: "base"）では、話している人の立ち絵（立ち絵があるとき）と縁の線を描かない
  const base0 = opts.layer === "base";
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H, background: C.bg, fontFamily: "Noto Sans JP" }}>
      <ChapterBar ch={ch} count={tl.chapters.length} />
      <div style={{ display: "flex", position: "absolute", right: (L.headerX ?? 40) + 8, top: HEADER.y + 16, fontSize: MIN_FONT, fontWeight: 900, color: C.url }}>used.gadelog.com</div>
      <div style={{ ...col, position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, padding: CARD.pad, background: C.white, borderRadius: 24, ...(opts.camera ? { overflow: "hidden" } : {}), ...(() => { const f = slideFrame(ch, t); return f === undefined ? {} : { transform: `translateX(${Math.round(SLIDE_PX * (1 - easeOut(f / SLIDE_F)))}px)`, opacity: 0.35 + 0.65 * easeOut(f / SLIDE_F) }; })() }}>
        {opts.camera ? (
          <div style={{ ...col, width: "100%", height: "100%", transform: `translate(${opts.camera.x}px, ${opts.camera.y}px) scale(${opts.camera.scale})`, transformOrigin: "center center" }}>
            <SceneBody ch={scene} t={local} />
          </div>
        ) : (
          <SceneBody ch={scene} t={local} />
        )}
        <Overlays ch={scene} t={local} />
        {burstOn(ch.scene.reveal, local) ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={burstImage(CARD.w, CARD.h)} width={CARD.w} height={CARD.h} style={{ position: "absolute", left: 0, top: 0, width: CARD.w, height: CARD.h, borderRadius: 24 }} />
        ) : null}
      </div>
      {ch.scene.type === "endScreen" ? <EndScreenSlots s={ch.scene} /> : null}
      <ThinkBubble ch={ch} t={local} />
      {/* 立ち絵はカードの上に描く（d2 では立ち絵がカードの下の角に少し重なる） */}
      <SpeakerSlot who="ずんだもん" x={SLOT.left} active={who === "ずんだもん"} art={opts.art?.ずんだもん} mouthOpen={opts.mouthOpen} plate={plateOpacity(t)} dy={who === "ずんだもん" ? spkDy : 0} hideArt={base0 && who === "ずんだもん"} />
      <SpeakerSlot who="つむぎ" x={SLOT.right} active={who === "つむぎ"} art={opts.art?.つむぎ} mouthOpen={opts.mouthOpen} plate={plateOpacity(t)} dy={who === "つむぎ" ? spkDy : 0} hideArt={base0 && who === "つむぎ"} />
      <Subtitle who={who} text={page?.text ?? ""} dy={subDy(anim.sub)} />
      {base0 ? null : <SubRing who={who} prog={subProgress(tl, t)} dy={subDy(anim.sub)} />}
      {FOOT_Y === null ? null : <div style={{ display: "flex", position: "absolute", left: SUB.x + 8, top: FOOT_Y, fontSize: 26, fontWeight: 500, color: C.onDarkSub }}>{`${date} 時点・大手中古ショップ${tl.shops}店の在庫から`}</div>}
    </div>
  );
}
