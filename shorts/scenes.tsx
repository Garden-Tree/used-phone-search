/**
 * 場面ごとの 1 コマ（1080x1920）。t は場面の開始からの秒数。
 * 配置: 上 250px は YouTube の UI で空け、見出しの帯（y250〜570・3行の大きな文字）・内容（y590〜1400）・注記（y1420〜）、下 440px 以上は空ける。
 * 左右の余白は 80px（内容の幅 920）で、文字はすべて中央そろえ。見出しの帯はどの場面にも出して、途中から見た人にも話題が分かるようにする
 */
import type { ReactElement, ReactNode } from "react";
import { fitFontSize } from "@/lib/ogFont";
import { ON_DARK, SITE } from "@/lib/brandColors";
import { lookOf, type Look } from "./looks";
import { relatedThumb } from "./relatedLong";
import { RELATED_LONG_LINE, RELATED_LONG_THEMES, isBudget, isProVs, periodOf, type BudgetScript, type DropsScript, type FoldScript, type NewUsedScript, type ProVsScript, type RankScript, type BatteryScript, type StorageScript, type Ios27Script, type BatterySwapScript, type BatterySwapRow, type OverNewScript, type UnusedScript, type OldProScript, type OldProRow, type RakutenMobileScript, type Script } from "./types";

export const W = 1080;
export const H = 1920;
export const FPS = 30;
const MARGIN = 80;
const CW = W - MARGIN * 2; // 920
const HEADER = { top: 250, height: 320 };
const BODY = { top: 590, height: 810 };
/** 見出しの帯の文字（上の小さな行・大きな2行） */
const HEAD_SUB = (s: Script) => s.theme === "rakutenmobile" ? `料金は公式・中古は大手中古ショップ${s.shopCount}店の相場`
  : `${s.theme === "drops" && s.period ? "毎日集計" : "毎週更新"}・大手中古ショップ${s.shopCount}店の相場`;
const HEAD_TITLE = (s: Script) =>
  s.theme === "budget" ? ["予算ぴったりで買える", "中古iPhone"] : s.theme === "pixelbudget" ? ["予算ぴったりで買える", "中古Pixel"] : s.theme === "ipadbudget" ? ["予算ぴったりで買える", "中古iPad"] : s.theme === "macbudget" ? ["予算ぴったりで買える", "中古MacBook"] : s.theme === "probudget" ? ["予算ぴったりで買える", "中古iPhone Pro"] : s.theme === "foldbudget" ? ["予算ぴったりで買える", "中古折りたたみスマホ"] : s.theme === "galaxybudget" ? ["予算ぴったりで買える", "中古Galaxy"] : s.theme === "bigbudget" ? ["予算ぴったりで買える", "大きい画面の中古iPhone"]
    : s.theme === "rank" ? ["状態ランクで", "いくら違う？中古iPhone"] : s.theme === "battery" ? ["電池90%台だと", "いくら高い？中古iPhone"]
    : s.theme === "gen" ? ["iPhone", "1世代前でいくら安い？"] : s.theme === "storage" ? ["容量を1つ上げると", "いくら高い？中古iPhone"] : s.theme === "newused" ? ["新品より", "いくら安い？中古iPhone"]
    : s.theme === "ios27line" ? ["iOS 27対応で", "いちばん安い中古iPhone"] : s.theme === "batteryswap" ? ["電池交換を足すと", "1つ上の世代と同じ値段？"] : s.theme === "overnew" ? ["中古なのに", "新品より高い？中古iPhone"]
    : s.theme === "provs" ? ["Proと無印", "同じ容量でいくら違う？"] : s.theme === "promax" ? ["Pro MaxとPro", "同じ容量でいくら違う？"] : s.theme === "plusvs" ? ["Plusと無印", "同じ容量でいくら違う？"] : s.theme === "plusmax" ? ["大画面はPlusとPro Max", "同じ容量でいくら違う？"]
    : s.theme === "oldpro" ? ["1世代前のProと最新の無印", "どっちが安い？中古iPhone"]
    : s.theme === "rakutenmobile" ? ["楽天モバイルは使った量で3段階", `中古${s.scenes.device.model}と2年でいくら？`]
    : s.theme === "minie" ? ["無印より安い“弟分”", "いくら安い？中古iPhone"] : s.theme === "unused" ? ["未使用品（ランクS）は", "中古よりいくら高い？"] : s.theme === "fold" ? ["折りたたみスマホ", "1世代前でいくら安い？"] : [`${periodOf(s as DropsScript).name}の中古iPhone`, "値下がりランキング"];
/** 下の注記（newused は新品と中古の数字の出どころ。provs・fold は2機種を同じ容量で比べる。rank はランクが各店の表記であること。pixelbudget はアップデート保証の出どころ） */
const FOOT = (s: Script) =>
  s.theme === "rank" ? `${s.date.replace(/-/g, "/")}・ランクは各店の表記・同じ容量の中央値`
    : s.theme === "rakutenmobile" ? `${s.date.replace(/-/g, "/")}・料金は楽天モバイル公式（税込・割引なし）
中古は${s.scenes.device.storage}の中央値`
    : s.theme === "unused" ? `${s.date.replace(/-/g, "/")}・ランクは各店の表記（S＝未使用品）・同じ容量の中央値`
    : s.theme === "minie" ? `${s.date.replace(/-/g, "/")}・中古は同じ容量の中央値`
    : s.theme === "battery" ? `${s.date.replace(/-/g, "/")}・電池の%を数字で出す店・同じ容量の中央値`
    : s.theme === "gen" ? `${s.date.replace(/-/g, "/")}・中古は同じ容量の中央値`
    : s.theme === "storage" ? `${s.date.replace(/-/g, "/")}・容量ごとの中央値`
    : s.theme === "pixelbudget" ? `${s.date.replace(/-/g, "/")}・在庫がいちばん多い容量の中央値・アップデートはGoogle公式`
    : s.theme === "ipadbudget" ? `${s.date.replace(/-/g, "/")}・在庫がいちばん多い容量の中央値・PencilはApple公式`
    : s.theme === "macbudget" ? `${s.date.replace(/-/g, "/")}・在庫がいちばん多い容量の中央値`
    : s.theme === "probudget" ? `${s.date.replace(/-/g, "/")}・在庫がいちばん多い容量の中央値・画面と端子はApple公式`
    : s.theme === "bigbudget" ? `${s.date.replace(/-/g, "/")}・在庫がいちばん多い容量の中央値・画面はApple公式`
    : s.theme === "foldbudget" || s.theme === "galaxybudget" ? `${s.date.replace(/-/g, "/")}・在庫がいちばん多い容量の中央値・画面は公式の仕様`
    : s.theme === "newused" || s.theme === "overnew" ? `${s.date.replace(/-/g, "/")}・新品はApple公式・中古は同じ容量の中央値`
    : s.theme === "ios27line" ? `${s.date.replace(/-/g, "/")}・iOS 27対応はApple公式・在庫がいちばん多い容量の中央値`
    : s.theme === "batteryswap" ? `${s.date.replace(/-/g, "/")}・電池交換はApple公式・中古は同じ容量の中央値`
    : s.theme === "provs" || s.theme === "promax" || s.theme === "plusvs" || s.theme === "plusmax" || s.theme === "oldpro" || s.theme === "fold" ? `${s.date.replace(/-/g, "/")}・中古は同じ容量の中央値` : `${s.date.replace(/-/g, "/")}・在庫がいちばん多い容量の中央値`;

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
  /** budget の予算の札（サイトの brand-600。白の文字を載せる）。newused の新品の棒も同じ色 */
  budget: SITE.brand600,
};

export type SceneId = "hook" | "hookNum" | "hookChart" | "ranking" | "reveal" | "trend" | "comment" | "outro";
export type Variant = "A" | "B" | "C";
export const VARIANTS: Variant[] = ["A", "B", "C"];
/** テーマごとの型。drops 以外は A だけ */
export const variantsOf = (s: Script): Variant[] => (s.theme === "drops" ? VARIANTS : ["A"]);
/** 効果音: t は場面の開始からの秒数。pop は行が出る小さな音、ta は 1位発表の二音 */
export type Se = { t: number; kind: "pop" | "ta" };
/** dur: 場面の長さ（秒）、anim: 動きのある秒数（以降は最後のコマを止める）、o: 場面ごとの動きの設定（開始・間隔・拡大率） */
/** o.at: ランキングの行ごとの出る秒（items の添字。1 = 2位・2 = 3位）。声があるときは声の始まりから決める（render.ts） */
/** o.rel: 締めの関連動画の札（横動画のサムネ）が出る秒。声があれば「くわしい解説は…」の声の始まり（render.ts・relatedLong.ts）、なければ 2.2k 秒 */
export type Scene = { id: SceneId; dur: number; anim: number; se?: Se[]; o?: { start?: number; gap?: number; k?: number; at?: number[]; rel?: number } };

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
/**
 * budget の予算の行: 上（小さい予算）から順に出す。at を渡すとその時刻に（声に合わせる。各行は「○万円なら」の声の少し前）、
 * なければ 0.3 秒から 1.6 秒ごと（声なし）。最後の行が出てから約1秒で次の場面へ
 */
export const budgetRows = (at?: number[], minDur = 0): Scene => {
  const times = at ?? [0.3, 1.9, 3.5, 5.1];
  const last = Math.max(...times);
  return { id: "ranking", dur: Math.max(minDur, last + 1.0), anim: last + ROW_FADE + 0.1, se: times.map((t) => ({ t, kind: "pop" as const })), o: { at: times } };
};
const reveal = (dur: number): Scene => ({ id: "reveal", dur, anim: 2.0, se: [{ t: 0.6, kind: "ta" }] });
/** 締め: 「来週の1位は…？」で最初の問いにつなげる。最後の静止は 1秒未満 */
const outro = (k: number): Scene => ({ id: "outro", dur: 1.2 * k + 0.4 + 0.8, anim: 1.2 * k + 0.4, o: { k } });
const comment = (dur: number, start: number, gap: number, n: number): Scene => ({ id: "comment", dur, anim: start + (n - 1) * gap + 0.5, o: { start, gap } });

/**
 * 場面の並び。関連動画につながるテーマ（RELATED_LONG_THEMES）は、締めの「▼ くわしい解説は…」の札が 2.2k 秒で出るので、締めの動き（anim）をそこまで延ばす
 * （10/23 まで anim が 1.2k+0.4 秒で止まり、札が動画に出ていなかった。render.ts は anim の後は最後のコマを止める）
 */
export const TIMELINE = (s: Script, v: Variant): Scene[] =>
  baseTimeline(s, v).map((sc) => {
    if (sc.id !== "outro" || !RELATED_LONG_THEMES.has(s.theme)) return sc;
    const k = sc.o?.k ?? 1.5;
    const anim = Math.max(sc.anim, 2.2 * k + 0.4);
    return { ...sc, anim, dur: Math.max(sc.dur, anim + 0.8), o: { ...sc.o, rel: 2.2 * k } };
  });

/** 声なしの長さ: A「標準」約29秒 / B「速い」約19秒（数字先出し・グラフなし）/ C「グラフ先」約24秒（最初に推移グラフ）。声があると場面が延びる（render.ts） */
const baseTimeline = (s: Script, v: Variant): Scene[] => {
  const n = s.scenes.comment.lines.length;
  // budget（声なし約26秒）: 問い（声が約2秒と短いので動きも2秒で止め、声＋0.5秒で次へ）→ 予算の4行（声に合わせて上から出す）→ 注目の機種 → ひと言 → 締め
  if (isBudget(s)) return [
    { id: "hook", dur: 2.5, anim: 2 }, budgetRows(), reveal(5), comment(8, 0, 1.0, n), outro(1.5),
  ];
  // rakutenmobile（声なし約25秒）: 題と PR（声は PR の1文）→ 料金の3段（声に合わせて上から出す）→ 端末の相場と2年の合計・上と下の差 → ひと言 → 締め
  if (s.theme === "rakutenmobile") return [
    { id: "hook", dur: 2.5, anim: 2 }, budgetRows([0.3, 1.9, 3.5]), reveal(5), comment(8, 0, 1.0, n), outro(1.5),
  ];
  // newused（声なし約25秒）: 問い → 3位・2位・伏せた1位（声に合わせて出す）→ 1位の新品と中古の相場 → ひと言 → 締め。推移グラフはなし
  // provs・fold も newused と同じ（問い → 3位・2位・伏せた1位 → 1位の2本の棒 → ひと言 → 締め）
  // rank も同じ（問い → 3位・2位・伏せた1位 → 1位のランクA・B・Cの3本の棒 → ひと言 → 締め）
  // battery も同じ（問い → 3位・2位・伏せた1位 → 1位の電池90%台と80%台の2本の棒 → ひと言 → 締め）
  if (s.theme === "newused" || s.theme === "provs" || s.theme === "promax" || s.theme === "plusvs" || s.theme === "plusmax" || s.theme === "oldpro" || s.theme === "minie" || s.theme === "unused" || s.theme === "fold" || s.theme === "rank" || s.theme === "battery" || s.theme === "gen" || s.theme === "storage"
    || s.theme === "ios27line" || s.theme === "batteryswap" || s.theme === "overnew") return [
    { id: "hook", dur: 2.5, anim: 2 }, countdown(0.5, 1.6), reveal(5), comment(8, 0, 1.0, n), outro(1.5),
  ];
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
/** "2031-05" → "2031年5月" */
const jaYm = (ym: string) => `${Number(ym.slice(0, 4))}年${Number(ym.slice(5, 7))}月`;
const rate = (r: number) => r.toFixed(1);

const row = { display: "flex", justifyContent: "center", alignItems: "center", whiteSpace: "nowrap" } as const;

/** 見出しの帯（形と色はテーマの look。上端 y250・高さ 320 はどの形でも同じ） */
function Band({ s, L }: { s: Script; L: Look }) {
  const b = L.band;
  const tab = b.shape === "tab";
  const full = b.shape === "full";
  // 文字の幅: pill は丸い端の分、tab は左の余白の分だけ狭く
  const frame = b.shape === "frame";
  const tw = full ? CW : b.shape === "pill" ? CW - 160 : tab ? CW - 110 : frame ? CW - 90 : CW - 60;
  const radius = full ? 0 : b.shape === "pill" ? HEADER.height / 2 : b.shape === "tab" ? "0 28px 28px 0" : b.shape === "leaf" ? "110px 0 110px 0" : frame ? 44 : 28;
  const title = HEAD_TITLE(s);
  return (
    <div style={{
      position: "absolute", left: full ? 0 : MARGIN, top: HEADER.top, width: full ? W : CW, height: HEADER.height, display: "flex", flexDirection: "column",
      alignItems: tab ? "flex-start" : "center", justifyContent: "center", paddingLeft: tab ? 60 : 0,
      background: b.fill, borderRadius: radius, color: b.text, border: frame ? `10px solid ${b.stripe ?? b.text}` : "none",
      boxShadow: tab && b.stripe ? `-18px 0 0 0 ${b.stripe}` : "none",
    }}>
      <div style={{ ...row, fontSize: FIT(HEAD_SUB(s), tw, 52), fontWeight: 700, color: b.sub }}>{HEAD_SUB(s)}</div>
      {title.map((l, i) => (
        <div key={i} style={{ ...row, fontSize: Math.min(...title.map((x) => FIT(x, tw, 104))), fontWeight: 900, lineHeight: 1.15, marginTop: i ? 0 : 6 }}>{l}</div>
      ))}
      {b.shape === "underline" && b.stripe && (
        <div style={{ position: "absolute", left: 0, bottom: 0, width: CW, height: 16, borderRadius: 8, background: b.stripe }} />
      )}
    </div>
  );
}

/**
 * 広告の回（rakutenmobile）の「PR」の札。どの場面にも、見出しの帯のすぐ上の左に小さく出す（最初から最後まで。楽天アフィの決まり・shorts-ideas.md）。
 * 色は地の上の文字（fg）の枠と文字なので、コントラストは地の文字と同じ
 */
function PrMark({ L }: { L: Look }) {
  return (
    <div style={{ position: "absolute", left: MARGIN, top: HEADER.top - 66, display: "flex", fontSize: 36, fontWeight: 900, lineHeight: 1.2, color: L.fg, border: `3px solid ${L.fg}`, borderRadius: 10, padding: "2px 16px", background: L.bg }}>PR</div>
  );
}

function Frame({ s, children, header = true, footer = true, body = BODY }: { s: Script; children: ReactNode; header?: boolean; footer?: boolean; body?: { top: number; height: number } }) {
  const L = lookOf(s);
  return (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: L.bg, fontFamily: "Noto Sans JP", color: L.fg }}>
      {s.theme === "rakutenmobile" && <PrMark L={L} />}
      {header && <Band s={s} L={L} />}
      <div style={{ position: "absolute", left: MARGIN, top: body.top, width: CW, height: body.height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
      {footer && (
        // 「\n」で行を分ける（長い注記が 24px でも幅に入らないとき。rakutenmobile）。大きさはいちばん長い行で決める
        <div style={{ position: "absolute", left: MARGIN, top: 1420, width: CW, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.4, fontSize: Math.min(...FOOT(s).split("\n").map((l) => FIT(l, CW, 30, 24))), fontWeight: 500, color: L.sub, whiteSpace: "nowrap" }}>
          {FOOT(s).split("\n").map((l) => <div key={l} style={{ display: "flex" }}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

/** 白いカード（角と縁はテーマの look） */
const card = (L: Look) => ({ display: "flex", flexDirection: "column", alignItems: "center", background: C.white, borderRadius: L.card.radius, boxShadow: L.card.shadow, color: C.navy }) as const;

/**
 * つかみ（1コマ目）。t=0 で絵がそろっている（出る動きはなし。札だけ小さく脈打つ）。型はテーマの look.hook（shorts/looks.ts）。
 * 数字は台本の1位の値（items[0]＝差額がいちばん大きい）。画像・ロゴ・製品写真は使わず、文字と図形だけ
 */
const pulseOf = (t: number) => 1 + 0.035 * Math.sin(t * Math.PI * 2 * 1.2);

/** 問いの行（大きさは行どうしでそろえる） */
function Question({ lines, max = 96 }: { lines: string[]; max?: number }) {
  const size = Math.min(...lines.map((x) => FIT(x, CW, max)));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {lines.map((l, i) => (
        <div key={i} style={{ ...row, fontSize: size, fontWeight: 900, lineHeight: 1.2 }}>{l}</div>
      ))}
    </div>
  );
}

/** 「最大 −12,345円」（地の上の強調色） */
function Teaser({ s, label, value, mt = 34 }: { s: Script; label: string; value: string; mt?: number }) {
  const L = lookOf(s);
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: mt }}>
      <div style={{ ...row, fontSize: 52, fontWeight: 900, color: L.fg, marginRight: 16 }}>{label}</div>
      <div style={{ ...row, fontSize: FIT(value, CW - 260, 110), fontWeight: 900, color: L.accentOnBg }}>{value}</div>
    </div>
  );
}

/** drops: 問い＋1位の下がった額（機種は伏せる） */
function Hook({ s, t }: { s: DropsScript; t: number }) {
  const h = s.scenes.hook;
  const full = `−${n(h.drop)}円`;
  return (
    <Frame s={s}>
      <Question lines={[`${periodOf(s).lead}いちばん値下がりした`, "中古iPhoneは…？"]} />
      <div style={{ ...card(lookOf(s)), width: CW, padding: "30px 30px 40px", marginTop: 44, transform: `scale(${pulseOf(t)})` }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 900, color: C.white, background: C.gold, borderRadius: 18, padding: "6px 26px" }}>1位</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 900, marginLeft: 26 }}>？？？</div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 900, color: C.muted, marginLeft: 26 }}>{periodOf(s).span}</div>
        </div>
        <div style={{ ...row, fontSize: FIT(full, CW - 60, 200), fontWeight: 900, color: C.red, marginTop: 6 }}>{full}</div>
      </div>
    </Frame>
  );
}

/** budget・pixelbudget: 問い＋予算の札（2×2）。pixelbudget は札にアップデート保証の終わり、budget は「なら？」 */
function BudgetHook({ s, t }: { s: BudgetScript; t: number }) {
  const L = lookOf(s);
  const rows = s.scenes.budgets.rows;
  const lines = ["予算ぴったりで買える", s.theme === "pixelbudget" ? "中古Pixelは…？" : s.theme === "macbudget" ? "中古MacBookは…？" : s.theme === "probudget" ? "中古iPhone Proは…？" : s.theme === "foldbudget" ? "中古折りたたみスマホは…？" : s.theme === "galaxybudget" ? "中古Galaxyは…？" : s.theme === "bigbudget" ? "大きい画面の中古iPhoneは…？" : "中古iPhoneは…？"];
  const TW = (CW - 30) / 2;
  return (
    <Frame s={s}>
      <Question lines={lines} max={92} />
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", width: CW, marginTop: 40, transform: `scale(${pulseOf(t)})` }}>
        {rows.map((r, i) => {
          // pixelbudget はアップデート保証の終わり、macbudget はチップ（M1・M2…）、budget は「なら？」
          const sub = r.updateUntil ? `更新 ${jaYm(r.updateUntil)}まで` : r.chip ? `${r.chip}チップ` : "なら？";
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: TW, height: 190, marginTop: i >= 2 ? 30 : 0, background: L.chip, borderRadius: Math.min(L.card.radius, 32), boxShadow: L.card.shadow, color: C.white }}>
              <div style={{ ...row, fontSize: FIT(r.label, TW - 40, 92), fontWeight: 900, lineHeight: 1.1 }}>{r.label}</div>
              <div style={{ ...row, fontSize: FIT(sub, TW - 40, 40), fontWeight: 700, marginTop: 6 }}>{sub}</div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

/** ipadbudget: 問い＋予算の丸い札（2×2。数字を大きく「万円」を下に・紺の影）＋「使えるApple Pencilも」 */
function CoinHook({ s, t }: { s: BudgetScript; t: number }) {
  const L = lookOf(s);
  const coin = L.coin ?? { fill: L.chip, text: C.white };
  const rows = s.scenes.budgets.rows;
  const D = 210;
  const label = "使えるApple Pencilも";
  const coinOf = (r: BudgetScript["scenes"]["budgets"]["rows"][number], i: number) => {
    const man = r.label.endsWith("万円");
    const num = man ? r.label.replace(/万円$/, "") : r.label;
    return (
      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: D, height: D, borderRadius: D / 2,
        marginLeft: i % 2 ? 90 : 0, background: coin.fill, color: coin.text, boxShadow: `10px 10px 0 0 ${SITE.brand900}` }}>
        <div style={{ ...row, fontSize: FIT(num, D - 50, 116), fontWeight: 900, lineHeight: 1 }}>{num}</div>
        {man && <div style={{ ...row, fontSize: 42, fontWeight: 900, marginTop: 2 }}>万円</div>}
      </div>
    );
  };
  return (
    <Frame s={s}>
      <Question lines={["予算ぴったりで買える", "中古iPadは…？"]} max={84} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 26, transform: `scale(${pulseOf(t)})` }}>
        {[0, 2].map((k) => (
          <div key={k} style={{ display: "flex", marginTop: k ? 22 : 0 }}>{rows.slice(k, k + 2).map((r, j) => coinOf(r, k + j))}</div>
        ))}
      </div>
      <div style={{ ...row, fontSize: FIT(label, CW, 56), fontWeight: 900, color: L.accentOnBg, marginTop: 26 }}>{label}</div>
    </Frame>
  );
}

type Tile = { label: string; sub: string; fill: string };

/** newused・provs: 問い＋2つを並べた札（真ん中に vs）＋1位の差額 */
function SplitHook({ s, t, lines, left, right, teaser, label = "最大" }: { s: Script; t: number; lines: string[]; left: Tile; right: Tile; teaser: string; label?: string }) {
  const L = lookOf(s);
  const TW = 400;
  const TH = 250;
  const VS = 130;
  const tile = (x: Tile) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: TW, height: TH, background: x.fill, borderRadius: Math.min(L.card.radius, 28), boxShadow: L.card.shadow, color: C.white }}>
      <div style={{ ...row, fontSize: FIT(x.label, TW - 60, 120), fontWeight: 900, lineHeight: 1.1 }}>{x.label}</div>
      <div style={{ ...row, fontSize: FIT(x.sub, TW - 60, 40), fontWeight: 700, marginTop: 8 }}>{x.sub}</div>
    </div>
  );
  return (
    <Frame s={s}>
      <Question lines={lines} max={88} />
      <div style={{ display: "flex", position: "relative", justifyContent: "space-between", width: CW, height: TH, marginTop: 40, transform: `scale(${pulseOf(t)})` }}>
        {tile(left)}
        {tile(right)}
        <div style={{ position: "absolute", left: (CW - VS) / 2, top: (TH - VS) / 2, width: VS, height: VS, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: VS / 2, background: L.bg, boxShadow: `0 0 0 6px ${L.fg}`, fontSize: 56, fontWeight: 900, lineHeight: 1, color: L.fg }}>VS</div>
      </div>
      <Teaser s={s} label={label} value={teaser} />
    </Frame>
  );
}

/** fold: 問い＋開いた折りたたみの形（図形だけ。左が新しい方、右が1世代前、間に蝶番）＋1位の差額 */
function FoldHook({ s, t }: { s: FoldScript; t: number }) {
  const L = lookOf(s);
  const r = s.scenes.ranking.items[0];
  const PW = 230;
  const PH = 260;
  return (
    <Frame s={s}>
      <Question lines={["折りたたみスマホ、", "1世代前にすると", "いくら安い？"]} max={80} />
      <div style={{ display: "flex", alignItems: "center", marginTop: 36, transform: `scale(${pulseOf(t)})` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: PW, height: PH, background: C.white, borderRadius: "40px 6px 6px 40px", boxShadow: `0 0 0 8px ${SITE.ink}`, color: C.navy }}>
          <div style={{ ...row, fontSize: 64, fontWeight: 900 }}>最新</div>
        </div>
        <div style={{ display: "flex", width: 18, height: PH + 16, background: L.accentOnBg, borderRadius: 9 }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: PW, height: PH, background: SITE.brand200, borderRadius: "6px 40px 40px 6px", boxShadow: `0 0 0 8px ${SITE.ink}`, color: C.navy }}>
          <div style={{ ...row, fontSize: 52, fontWeight: 900 }}>1世代前</div>
        </div>
      </div>
      <Teaser s={s} label="最大" value={`−${n(r.diff)}円`} mt={36} />
    </Frame>
  );
}

/** rank: 問い＋ランク A・B・C の札（色は1位の発表の棒と同じ）＋1位の A→C の差額 */
function AbcHook({ s, t }: { s: RankScript; t: number }) {
  const r = s.scenes.ranking.items[0];
  const L = lookOf(s);
  const SZ = 250;
  const chips = [{ k: "A", c: C.budget }, { k: "B", c: C.silver }, { k: "C", c: C.red }];
  return (
    <Frame s={s}>
      <Question lines={["状態ランクで、", "中古iPhoneは", "いくら違う？"]} max={88} />
      <div style={{ display: "flex", justifyContent: "space-between", width: CW - 60, marginTop: 36, transform: `scale(${pulseOf(t)})` }}>
        {chips.map((x) => (
          <div key={x.k} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: SZ, height: SZ, background: x.c, borderRadius: L.card.radius, boxShadow: L.card.shadow, color: C.white }}>
            <div style={{ ...row, fontSize: 40, fontWeight: 700 }}>ランク</div>
            <div style={{ ...row, fontSize: 150, fontWeight: 900, lineHeight: 1 }}>{x.k}</div>
          </div>
        ))}
      </div>
      <Teaser s={s} label="A→C 最大" value={`−${n(r.diff)}円`} />
    </Frame>
  );
}

/** battery: 問い＋縦の電池の形2つ（90%台・80%台。中の塗りの高さは 95%・85% の見た目）＋1位の差額 */
function BatteryHook({ s, t }: { s: BatteryScript; t: number }) {
  const L = lookOf(s);
  const r = s.scenes.ranking.items[0];
  const BW = 230;
  const BH = 300;
  const cell = (label: string, level: number, fill: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", width: 80, height: 22, background: L.fg, borderRadius: "10px 10px 0 0" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: BW, height: BH, padding: 14, borderRadius: 30, boxShadow: `0 0 0 10px ${L.fg}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: Math.round((BH - 28) * level), background: fill, borderRadius: 16, color: C.white, fontSize: 56, fontWeight: 900, whiteSpace: "nowrap" }}>{label}</div>
      </div>
    </div>
  );
  return (
    <Frame s={s}>
      <Question lines={["電池が90%台だと、", "中古iPhoneは", "いくら高い？"]} max={74} />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", width: CW, marginTop: 40, transform: `scale(${pulseOf(t)})` }}>
        {cell("90%台", 0.95, SITE.safe)}
        <div style={{ ...row, width: 150, fontSize: 56, fontWeight: 900, lineHeight: 1, color: L.fg, paddingBottom: 110 }}>VS</div>
        {cell("80%台", 0.85, C.budget)}
      </div>
      <Teaser s={s} label="最大" value={`+${n(r.diff)}円`} mt={36} />
    </Frame>
  );
}

const BADGE = [C.gold, C.silver, C.bronze, C.navy, C.navy];

/** ランキングの行の下段の欄（文字・幅・最大の大きさ・色）。幅の合計は右の列（680）に収める */
type Cell = { text: string; w: number; max: number; color: string };

function Ranking({ s, t, o }: { s: DropsScript; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: it.model,
    cells: [
      { text: it.storage, w: 170, max: 44, color: C.muted },
      { text: `−${rate(it.rate)}%`, w: 250, max: 80, color: C.red },
      { text: `−${n(it.drop)}円`, w: 260, max: 50, color: C.red },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/** newused のランキング: 下段は 容量・新品との差（額・大）・率 */
function NewUsedRanking({ s, t, o }: { s: NewUsedScript; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: it.model,
    cells: [
      { text: it.storage, w: 170, max: 44, color: C.muted },
      { text: `−${n(it.diff)}円`, w: 320, max: 76, color: C.red },
      { text: `−${rate(it.pct)}%`, w: 190, max: 50, color: C.red },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/** "iPhone 16" と "iPhone 16 Pro" → "iPhone 16／16 Pro"（行と1位の機種名） */
const pairName = (base: string, pro: string) => `${base}／${pro.replace(/^iPhone\s+/, "")}`;

/** provs のランキング: 機種名は「無印／Pro」、下段は 容量・Pro との差（額・大）・率 */
function ProVsRanking({ s, t, o }: { s: ProVsScript; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: pairName(it.base, it.pro),
    cells: [
      { text: it.storage, w: 170, max: 44, color: C.muted },
      { text: `+${n(it.diff)}円`, w: 320, max: 76, color: lookOf(s).accent },
      { text: `+${rate(it.pct)}%`, w: 190, max: 50, color: lookOf(s).accent },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/** battery のランキング: 機種名、下段は 容量・90%台にした差（額・大）・率（80%台に対して） */
function BatteryRanking({ s, t, o }: { s: BatteryScript; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: it.model,
    cells: [
      { text: it.storage, w: 170, max: 44, color: C.muted },
      { text: `+${n(it.diff)}円`, w: 320, max: 76, color: lookOf(s).accent },
      { text: `+${rate(it.pct)}%`, w: 190, max: 50, color: lookOf(s).accent },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/** storage のランキング: 機種名、下段は 容量（from→to）・上乗せ（額・大）・率（from に対して） */
function StorageRanking({ s, t, o }: { s: StorageScript; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: it.model,
    cells: [
      { text: `${it.from}→${it.to}`, w: 230, max: 40, color: C.muted },
      { text: `+${n(it.diff)}円`, w: 290, max: 76, color: lookOf(s).accent },
      { text: `+${rate(it.pct)}%`, w: 160, max: 46, color: lookOf(s).accent },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/**
 * storage の1位: 機種名、小さい容量と次の容量の相場の2本の棒（大きい容量を幅いっぱいにした比。件数を添える）、上乗せ（大）と率。
 * 棒は 0.8 秒から伸び、差額は数え上げる
 */
function StorageReveal({ s, t }: { s: StorageScript; t: number }) {
  const r = s.scenes.ranking.items[0];
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const diffText = `+${n(r.diff)}円`;
  const sub = "中古の相場（容量ごとの中央値）";
  const LABEL = 170;
  const BAR = CW - 60 - LABEL - 20;
  const bars = [
    { label: r.from, price: r.fromMedian, count: r.fromCount, color: C.budget, w: Math.round((BAR * r.fromMedian) / r.toMedian) },
    { label: r.to, price: r.toMedian, count: r.toCount, color: lookOf(s).accent, w: BAR },
  ];
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 52, fontWeight: 900, marginBottom: 8, opacity: prog(t, 0, 0.25) }}>1位は…</div>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "20px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(r.model, CW - 60, 88), fontWeight: 900 }}>{r.model}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 40), fontWeight: 900, color: C.muted, marginTop: 4 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 12 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 12 : 0 }}>
              <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: FIT(b.label, LABEL, 48), fontWeight: 900, color: b.color }}>{b.label}</div>
              <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <div style={{ ...row, fontSize: 50, fontWeight: 900, color: b.color }}>{`${n(b.price)}円`}</div>
                  <div style={{ ...row, fontSize: 34, fontWeight: 700, color: C.muted, marginLeft: 14 }}>{`${n(b.count)}件`}</div>
                </div>
                <div style={{ display: "flex", width: Math.max(8, Math.round(b.w * grow)), height: 30, background: b.color, borderRadius: 12, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 8 }}>
          <div style={{ ...row, fontSize: FIT(diffText, 600, 112), fontWeight: 900, color: lookOf(s).accent }}>{`+${n(Math.round(r.diff * prog(t, 1.0, 0.9)))}円`}</div>
          <div style={{ ...row, fontSize: 64, fontWeight: 900, color: lookOf(s).accent, marginLeft: 16 }}>{`+${rate(r.pct)}%`}</div>
        </div>
      </div>
    </Frame>
  );
}

/** "Galaxy Z Fold8" と "Galaxy Z Fold7" → "Galaxy Z Fold8／Fold7"、"Pixel 11 Pro Fold" と "Pixel 10 Pro Fold" → "Pixel 11 Pro Fold／10 Pro Fold" */
const foldShort = (model: string) => model.replace(/^Galaxy Z\s+|^Pixel\s+|^iPhone\s+/, "");
const foldName = (newer: string, older: string) => `${newer}／${foldShort(older)}`;

/** fold のランキング: 機種名は「新しい方／1世代前」、下段は 容量・1世代前にした差（額・大）・率（新しい方に対して） */
function FoldRanking({ s, t, o, nameOf = foldName }: { s: FoldScript; t: number; o: Scene["o"]; nameOf?: (newer: string, older: string) => string }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: nameOf(it.newer, it.older),
    cells: [
      { text: it.storage, w: 170, max: 44, color: C.muted },
      { text: `−${n(it.diff)}円`, w: 320, max: 76, color: lookOf(s).accent },
      { text: `−${rate(it.pct)}%`, w: 190, max: 50, color: lookOf(s).accent },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/** 3位・2位・伏せた1位の行（drops・newused・provs・fold で共通）。items[0] が1位 */
function RankRows({ s, t, o, items }: { s: Script; t: number; o: Scene["o"]; items: { model: string; cells: Cell[] }[] }) {
  // 1行 260px・3行。機種名は右の列の幅いっぱい、その下に下段の欄
  const RH = 260;
  const RIGHT = 680;
  return (
    <Frame s={s}>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "6px 24px" }}>
        {items.map((it, i) => {
          // 3位（下）→ 2位の順に出す。1位は最後まで出さない
          const at = o?.at?.[i] ?? (o?.start ?? 0.5) + (o?.gap ?? 1.6) * (items.length - 1 - i);
          const p = i === 0 ? 1 : prog(t, at, ROW_FADE);
          const secret = i === 0;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", width: "100%", height: RH, borderBottom: i < items.length - 1 ? `3px solid ${C.line}` : "none", opacity: p, transform: `translateX(${Math.round((1 - p) * 80)}px)` }}>
              <div style={{ display: "flex", justifyContent: "center", width: 160, flexShrink: 0, fontSize: 68, fontWeight: 900, color: C.white, background: BADGE[i] ?? C.navy, borderRadius: 22, padding: "14px 0" }}>{`${i + 1}位`}</div>
              {secret ? (
                <div style={{ ...row, width: RIGHT, flexShrink: 0, marginLeft: 20, fontSize: 120, fontWeight: 900 }}>？？？</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: RIGHT, flexShrink: 0, marginLeft: 20 }}>
                  <div style={{ ...row, fontSize: FIT(it.model, RIGHT, 80), fontWeight: 900 }}>{it.model}</div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", width: RIGHT, marginTop: 8 }}>
                    {it.cells.map((c, k) => (
                      <div key={k} style={{ ...row, width: c.w, fontSize: FIT(c.text, c.w, c.max), fontWeight: 900, color: c.color }}>{c.text}</div>
                    ))}
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

function Reveal({ s, t }: { s: DropsScript; t: number }) {
  const h = s.scenes.hook;
  const r = s.scenes.ranking.items[0];
  const shown = Math.round(h.drop * prog(t, 1.0, 0.9));
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const dropText = `−${n(h.drop)}円`;
  const sub = `相場（${h.storage}） ${n(h.before)}円 → ${n(h.after)}円`;
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 84, fontWeight: 900, marginBottom: 40, opacity: prog(t, 0, 0.4) }}>1位は…</div>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "44px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
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
function ChartCard({ s, points, p, labels, chartH = 400, mark }: { s: Script; points: Pt[]; p: number; labels: boolean; chartH?: number; mark?: number }) {
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
    <div style={{ ...card(lookOf(s)), width: CW, padding: "24px 28px", alignItems: "stretch" }}>
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

function Trend({ s, t }: { s: DropsScript; t: number }) {
  const { model, storage, points } = s.scenes.trend;
  const heading = `${model}（${storage}）の相場`;
  const title = <div style={{ ...row, fontSize: FIT(heading, CW, 56), fontWeight: 900, marginBottom: 26 }}>{heading}</div>;
  if (points.length < 2) {
    const h = s.scenes.hook;
    return (
      <Frame s={s}>
        {title}
        <div style={{ ...card(lookOf(s)), width: CW, padding: "40px 0" }}>
          <div style={{ ...row, fontSize: 44, fontWeight: 900, color: C.muted }}>{periodOf(s).ago}</div>
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
      <ChartCard s={s} points={points} p={prog(t, 0, 1.3)} labels={false} mark={mark} />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", width: CW, marginTop: 28, opacity: shown }}>
        <span style={{ ...row, width: 340, justifyContent: "flex-start", fontSize: FIT(startText, 340, 40), fontWeight: 900, color: lookOf(s).sub }}>{startText}</span>
        <span style={{ ...row, width: 560, justifyContent: "flex-end", fontSize: FIT(endText, 560, 72), fontWeight: 900, color: lookOf(s).accentOnBg }}>{endText}</span>
      </div>
    </Frame>
  );
}

/** B のつかみ: 下がった額を先に見せ、機種は伏せる */
function HookNum({ s, t }: { s: DropsScript; t: number }) {
  const h = s.scenes.hook;
  const full = `−${n(h.drop)}円`;
  const lines = [`${periodOf(s).span}これだけ下がった`, "中古iPhoneは…？"];
  return (
    <Frame s={s}>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "50px 0" }}>
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
function HookChart({ s, t }: { s: DropsScript; t: number }) {
  const { points } = s.scenes.trend;
  const h = s.scenes.hook;
  if (points.length < 2) return <Hook s={s} t={t} />;
  const heading = "この iPhone、30日でこう動いた";
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: FIT(heading, CW, 64), fontWeight: 900, marginBottom: 30 }}>{heading}</div>
      <ChartCard s={s} points={points} p={prog(t, 0.3, 2.5)} labels={false} chartH={520} />
      <div style={{ ...row, fontSize: 110, fontWeight: 900, color: lookOf(s).accentOnBg, marginTop: 36, opacity: clamp((t - 2.8) / 0.3) }}>{`${periodOf(s).span}−${n(h.drop)}円`}</div>
    </Frame>
  );
}

function Comment({ s, t, o }: { s: Script; t: number; o: Scene["o"] }) {
  const { speaker, lines } = s.scenes.comment;
  const size = Math.min(...lines.map((l) => FIT(l, CW - 100, 72, 36))); // 行ごとに大きさが違わないよう最小にそろえる
  return (
    <Frame s={s}>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "56px 40px" }}>
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

/** 締めの関連動画の札: 横動画のサムネの幅（画面の約72%・16:9）と、札・サムネ・矢印を置く範囲（上 250px・下 440px の YouTube の表示を避ける） */
const REL_THUMB = { w: 780, h: Math.round((780 * 9) / 16) };
const REL_BODY = { top: 270, height: 1200 };

function Outro({ s, t, o }: { s: Script; t: number; o: Scene["o"] }) {
  const out = s.scenes.outro;
  const k = o?.k ?? 1.5;
  const L = lookOf(s);
  const question = out.question ?? `${s.theme === "drops" ? periodOf(s).next : "来週"}の1位は…？`;
  const related = RELATED_LONG_THEMES.has(s.theme);
  const thumb = related ? relatedThumb(s) : null;
  if (thumb) {
    // 関連動画（横動画）のサムネを、声の「くわしい解説は…」に合わせて出す（relatedLong.ts）。上の文字は小さくして詰め、重ならないようにする
    const relAt = o?.rel ?? 2.2 * k;
    const p = prog(t, relAt, 0.4);
    return (
      <Frame s={s} header={false} footer={false} body={REL_BODY}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: prog(t, 0, 0.25) }}>
            {out.lines.map((l, i) => (
              <div key={i} style={{ ...row, fontSize: FIT(l, CW, 72), fontWeight: 900, marginBottom: 10 }}>{l}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: prog(t, 0.6 * k, 0.4) }}>
            <div style={{ ...row, fontSize: FIT(out.url, CW, 68), fontWeight: 900, color: L.url, marginTop: 24 }}>{out.url}</div>
            {out.note.split("\n").map((l, i) => <div key={i} style={{ ...row, fontSize: FIT(l, CW, 30, 24), fontWeight: 500, color: L.sub, marginTop: i ? 4 : 14 }}>{l}</div>)}
          </div>
          <div style={{ ...row, fontSize: FIT(question, CW, 50), fontWeight: 900, marginTop: 34, opacity: prog(t, 1.2 * k, 0.4) }}>{question}</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40, opacity: p, transform: `translateY(${Math.round((1 - p) * 40)}px)` }}>
            <div style={{ ...row, fontSize: 40, fontWeight: 900, padding: "10px 32px", borderRadius: 999, background: L.chip, color: C.white }}>くわしい解説はこちら</div>
            <div style={{ display: "flex", marginTop: 18, borderRadius: 18, overflow: "hidden", boxShadow: `0 0 0 4px ${L.dark ? C.white : C.line}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} width={REL_THUMB.w} height={REL_THUMB.h} style={{ width: REL_THUMB.w, height: REL_THUMB.h }} alt="" />
            </div>
            <div style={{ ...row, fontSize: 46, fontWeight: 900, color: L.accentOnBg, marginTop: 14 }}>{"▼ 下の関連動画から ▼"}</div>
          </div>
        </div>
      </Frame>
    );
  }
  return (
    <Frame s={s} header={false} footer={false}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: prog(t, 0, 0.25) }}>
          {out.lines.map((l, i) => (
            <div key={i} style={{ ...row, fontSize: FIT(l, CW, 88), fontWeight: 900, marginBottom: 14 }}>{l}</div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: prog(t, 0.6 * k, 0.4) }}>
          <div style={{ ...row, fontSize: FIT(out.url, CW, 80), fontWeight: 900, color: L.url, marginTop: 56 }}>{out.url}</div>
          {/* 「\n」で行を分ける（長い注記が幅に入らないとき。rakutenmobile）。幅に入らない行は縮める */}
          {out.note.split("\n").map((l, i) => <div key={i} style={{ ...row, fontSize: FIT(l, CW, 34, 24), fontWeight: 500, color: L.sub, marginTop: i ? 6 : 40 }}>{l}</div>)}
        </div>
        <div style={{ ...row, fontSize: 52, fontWeight: 900, marginTop: 64, opacity: prog(t, 1.2 * k, 0.4) }}>{question}</div>
        {/* 関連動画（横動画）への誘導。サムネのファイルがないとき（relatedLong.ts）は文字の札だけ。画面の下の関連動画のリンクを指す */}
        {related && (
          <div style={{ ...row, fontSize: 46, fontWeight: 900, marginTop: 56, padding: "14px 30px", borderRadius: 999, background: L.chip, color: C.white, opacity: prog(t, o?.rel ?? 2.2 * k, 0.4) }}>{`▼ ${RELATED_LONG_LINE}`}</div>
        )}
      </div>
    </Frame>
  );
}

/**
 * budget の予算の行（4行・1行 190px）。左に予算の札、右に機種名と「容量・相場」。上から順に、声に合わせて出す。
 * pixelbudget は3段目にアップデート保証の終わり（「アップデート 2031年5月まで」）を出す（機種名と相場の文字を少し小さく）
 */
function BudgetRows({ s, t, o }: { s: BudgetScript; t: number; o: Scene["o"] }) {
  const rows = s.scenes.budgets.rows;
  const RH = 190;
  const RIGHT = 660;
  // 3段目: pixelbudget はアップデート保証の終わり、ipadbudget は使える Apple Pencil、macbudget はチップと発売年
  const extraOf = (r: BudgetScript["scenes"]["budgets"]["rows"][number]) => (r.updateUntil ? `アップデート ${jaYm(r.updateUntil)}まで` : r.pencil ? `Pencil ${r.pencil}` : r.chip ? `${r.chip}チップ・${r.released}発売` : r.spec ? `${r.spec}・${r.released}発売` : "");
  const upd = rows.some((r) => extraOf(r));
  return (
    <Frame s={s}>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "4px 24px" }}>
        {rows.map((r, i) => {
          const p = prog(t, o?.at?.[i] ?? 0.3 + 1.6 * i, ROW_FADE);
          const price = `相場 ${n(r.median)}円`;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", width: "100%", height: RH, borderBottom: i < rows.length - 1 ? `3px solid ${C.line}` : "none", opacity: p, transform: `translateX(${Math.round((1 - p) * 80)}px)` }}>
              <div style={{ display: "flex", justifyContent: "center", width: 190, flexShrink: 0, fontSize: FIT(r.label, 170, 60), fontWeight: 900, color: C.white, background: lookOf(s).chip, borderRadius: 22, padding: "14px 0" }}>{r.label}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: RIGHT, flexShrink: 0, marginLeft: 22 }}>
                <div style={{ ...row, fontSize: FIT(r.model, RIGHT, upd ? 58 : 66), fontWeight: 900, lineHeight: upd ? 1.15 : undefined }}>{r.model}</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", width: RIGHT, marginTop: upd ? 2 : 6 }}>
                  <div style={{ ...row, fontSize: upd ? 32 : 36, fontWeight: 900, color: C.muted, marginRight: 24 }}>{r.storage}</div>
                  <div style={{ ...row, fontSize: FIT(price, 440, upd ? 46 : 52), fontWeight: 900, color: C.red, lineHeight: upd ? 1.15 : undefined }}>{price}</div>
                </div>
                {extraOf(r) && <div style={{ ...row, fontSize: FIT(extraOf(r), RIGHT, 32), fontWeight: 900, color: C.muted, marginTop: 2 }}>{extraOf(r)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

/** budget の注目: 見出し「注目は○万円」→ 機種名・容量と発売年・相場（大）・在庫数（最安は出さない。3万円の行より安く見えるため） */
function Pick({ s, t }: { s: BudgetScript; t: number }) {
  const p = s.scenes.pick;
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const price = `相場 ${n(p.median)}円`;
  const sub = `${p.storage}・${p.released}発売`;
  const stock = `在庫 ${n(p.count)}台`;
  // pixelbudget: アップデート保証の終わり（ナレーションも読む）
  // ipadbudget: 使える Apple Pencil（ナレーションは在庫数を読む）・macbudget: チップ（ナレーションは在庫数を読む）
  const upd = p.updateUntil ? `アップデート ${jaYm(p.updateUntil)}まで` : p.pencil ? `Apple Pencil ${p.pencil}` : p.chip ? `${p.chip}チップ` : p.spec ? p.spec : "";
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 84, fontWeight: 900, marginBottom: 40, opacity: prog(t, 0, 0.25) }}>{`注目は${p.label}`}</div>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "44px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(p.model, CW - 60, 120), fontWeight: 900 }}>{p.model}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 48), fontWeight: 900, color: C.muted, marginTop: 10 }}>{sub}</div>
        <div style={{ ...row, fontSize: FIT(price, CW - 60, 130), fontWeight: 900, color: C.red, marginTop: 20 }}>{price}</div>
        {upd && <div style={{ ...row, fontSize: FIT(upd, CW - 60, 56), fontWeight: 900, color: C.navy, marginTop: 16 }}>{upd}</div>}
        <div style={{ ...row, fontSize: FIT(stock, CW - 60, 50), fontWeight: 700, color: C.muted, marginTop: upd ? 12 : 20 }}>{stock}</div>
      </div>
    </Frame>
  );
}

/**
 * newused の1位: 機種名・容量と発売年、新品（Apple 公式）と中古の相場の2本の棒（新品を幅いっぱいにした比）、差額（大）と率。
 * 棒は 0.8 秒から伸び、差額は数え上げる
 */
function NewUsedReveal({ s, t }: { s: NewUsedScript; t: number }) {
  const r = s.scenes.ranking.items[0];
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const diffText = `−${n(r.diff)}円`;
  const sub = `${r.storage}・${r.released}発売`;
  const LABEL = 230;
  const BAR = CW - 60 - LABEL - 20;
  const bars = [
    { label: "新品", price: r.newPrice, color: C.budget, w: BAR },
    { label: "中古の相場", price: r.usedMedian, color: C.red, w: Math.round((BAR * r.usedMedian) / r.newPrice) },
  ];
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 60, fontWeight: 900, marginBottom: 14, opacity: prog(t, 0, 0.25) }}>1位は…</div>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "26px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(r.model, CW - 60, 110), fontWeight: 900 }}>{r.model}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 44), fontWeight: 900, color: C.muted, marginTop: 4 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 18 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 18 : 0 }}>
              <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: FIT(b.label, LABEL, 40), fontWeight: 900, color: C.muted }}>{b.label}</div>
              <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
                <div style={{ ...row, justifyContent: "flex-start", fontSize: FIT(`${n(b.price)}円`, BAR, 56), fontWeight: 900, color: b.color }}>{`${n(b.price)}円`}</div>
                <div style={{ display: "flex", width: Math.max(8, Math.round(b.w * grow)), height: 34, background: b.color, borderRadius: 12, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 14 }}>
          <div style={{ ...row, fontSize: FIT(diffText, 600, 130), fontWeight: 900, color: C.red }}>{`−${n(Math.round(r.diff * prog(t, 1.0, 0.9)))}円`}</div>
          <div style={{ ...row, fontSize: 64, fontWeight: 900, color: C.red, marginLeft: 16 }}>{`−${rate(r.pct)}%`}</div>
        </div>
      </div>
    </Frame>
  );
}

/**
 * provs の1位: 「無印／Pro」・容量、無印と Pro の相場の2本の棒（Pro を幅いっぱいにした比）、差額（大）と率、
 * あれば無印を1つ上の容量にしたときの差（台本の upgrade。同じ中央値の決め方）。棒は 0.8 秒から伸び、差額は数え上げる
 */
function ProVsReveal({ s, t }: { s: ProVsScript; t: number }) {
  const r = s.scenes.ranking.items[0];
  const u = s.scenes.upgrade;
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const name = pairName(r.base, r.pro);
  const diffText = `+${n(r.diff)}円`;
  const sub = `${r.storage}・中古の相場`;
  // promax は base＝Pro・pro＝Pro Max、plusvs は base＝無印・pro＝Plus（棒の札と容量の注記の呼び方だけ変える）
  // plusmax は base＝Plus・pro＝Pro Max
  const [baseLabel, proLabel] = s.theme === "promax" ? ["Pro", "Pro Max"] : s.theme === "plusvs" ? ["無印", "Plus"] : s.theme === "plusmax" ? ["Plus", "Pro Max"] : ["無印", "Pro"];
  const note = u ? `${baseLabel}を${u.to}にするなら +${n(u.diff)}円` : "";
  const LABEL = s.theme === "promax" || s.theme === "plusmax" ? 210 : 150;
  const BAR = CW - 60 - LABEL - 20;
  const bars = [
    { label: baseLabel, price: r.baseMedian, color: C.budget, w: Math.round((BAR * r.baseMedian) / r.proMedian) },
    { label: proLabel, price: r.proMedian, color: lookOf(s).accent, w: BAR },
  ];
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 60, fontWeight: 900, marginBottom: 14, opacity: prog(t, 0, 0.25) }}>1位は…</div>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "26px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(name, CW - 60, 100), fontWeight: 900 }}>{name}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 44), fontWeight: 900, color: C.muted, marginTop: 4 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 18 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 18 : 0 }}>
              <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: FIT(b.label, LABEL, 48), fontWeight: 900, color: b.color }}>{b.label}</div>
              <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
                <div style={{ ...row, justifyContent: "flex-start", fontSize: FIT(`${n(b.price)}円`, BAR, 56), fontWeight: 900, color: b.color }}>{`${n(b.price)}円`}</div>
                <div style={{ display: "flex", width: Math.max(8, Math.round(b.w * grow)), height: 34, background: b.color, borderRadius: 12, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 14 }}>
          <div style={{ ...row, fontSize: FIT(diffText, 600, 130), fontWeight: 900, color: lookOf(s).accent }}>{`+${n(Math.round(r.diff * prog(t, 1.0, 0.9)))}円`}</div>
          <div style={{ ...row, fontSize: 64, fontWeight: 900, color: lookOf(s).accent, marginLeft: 16 }}>{`+${rate(r.pct)}%`}</div>
        </div>
        {note && <div style={{ ...row, fontSize: FIT(note, CW - 60, 44), fontWeight: 900, color: C.muted, marginTop: 10, opacity: prog(t, 1.6, 0.3) }}>{note}</div>}
      </div>
    </Frame>
  );
}

/**
 * battery の1位: 機種名・容量、電池80%台と90%台の相場の2本の棒（90%台を幅いっぱいにした比。在庫の件数を添える）、差額（大）と率（80%台に対して）、Apple 公式の電池交換の料金。
 * 棒は 0.8 秒から伸び、差額は数え上げる
 */
function BatteryReveal({ s, t }: { s: BatteryScript; t: number }) {
  const r = s.scenes.ranking.items[0];
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const diffText = `+${n(r.diff)}円`;
  const sub = `${r.storage}・中古の相場`;
  const LABEL = 170;
  const BAR = CW - 60 - LABEL - 20;
  const bars = [
    { label: "80%台", price: r.loMedian, count: r.loCount, color: C.budget, w: Math.round((BAR * r.loMedian) / r.hiMedian) },
    { label: "90%台", price: r.hiMedian, count: r.hiCount, color: lookOf(s).accent, w: BAR },
  ];
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 52, fontWeight: 900, marginBottom: 8, opacity: prog(t, 0, 0.25) }}>1位は…</div>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "20px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(r.model, CW - 60, 88), fontWeight: 900 }}>{r.model}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 44), fontWeight: 900, color: C.muted, marginTop: 4 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 12 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 12 : 0 }}>
              <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: 48, fontWeight: 900, color: b.color }}>{b.label}</div>
              <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <div style={{ ...row, fontSize: 50, fontWeight: 900, color: b.color }}>{`${n(b.price)}円`}</div>
                  <div style={{ ...row, fontSize: 34, fontWeight: 700, color: C.muted, marginLeft: 14 }}>{`${n(b.count)}件`}</div>
                </div>
                <div style={{ display: "flex", width: Math.max(8, Math.round(b.w * grow)), height: 30, background: b.color, borderRadius: 12, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 8 }}>
          <div style={{ ...row, fontSize: FIT(diffText, 600, 112), fontWeight: 900, color: lookOf(s).accent }}>{`+${n(Math.round(r.diff * prog(t, 1.0, 0.9)))}円`}</div>
          <div style={{ ...row, fontSize: 64, fontWeight: 900, color: lookOf(s).accent, marginLeft: 16 }}>{`+${rate(r.pct)}%`}</div>
        </div>
        {r.repair && <div style={{ ...row, fontSize: 44, fontWeight: 900, color: C.muted, marginTop: 10, opacity: prog(t, 1.6, 0.3) }}>{`Appleの電池交換は ${n(r.repair)}円`}</div>}
      </div>
    </Frame>
  );
}

/**
 * fold の1位: 「新しい方／1世代前」・容量、新しい方と1世代前の相場の2本の棒（新しい方を幅いっぱいにした比）、差額（大）と率（新しい方に対して）。
 * 棒は 0.8 秒から伸び、差額は数え上げる
 */
function FoldReveal({ s, t, nameOf = foldName }: { s: FoldScript; t: number; nameOf?: (newer: string, older: string) => string }) {
  const r = s.scenes.ranking.items[0];
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const name = nameOf(r.newer, r.older);
  const diffText = `−${n(r.diff)}円`;
  const sub = `${r.storage}・中古の相場`;
  const LABEL = 230;
  const BAR = CW - 60 - LABEL - 20;
  const bars = [
    { label: foldShort(r.newer), price: r.newerMedian, color: C.budget, w: BAR },
    { label: foldShort(r.older), price: r.olderMedian, color: lookOf(s).accent, w: Math.round((BAR * r.olderMedian) / r.newerMedian) },
  ];
  const labelSize = Math.min(...bars.map((b) => FIT(b.label, LABEL, 48)));
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 60, fontWeight: 900, marginBottom: 14, opacity: prog(t, 0, 0.25) }}>1位は…</div>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "26px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(name, CW - 60, 100), fontWeight: 900 }}>{name}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 44), fontWeight: 900, color: C.muted, marginTop: 4 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 18 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 18 : 0 }}>
              <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: labelSize, fontWeight: 900, color: b.color }}>{b.label}</div>
              <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
                <div style={{ ...row, justifyContent: "flex-start", fontSize: FIT(`${n(b.price)}円`, BAR, 56), fontWeight: 900, color: b.color }}>{`${n(b.price)}円`}</div>
                <div style={{ display: "flex", width: Math.max(8, Math.round(b.w * grow)), height: 34, background: b.color, borderRadius: 12, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 14 }}>
          <div style={{ ...row, fontSize: FIT(diffText, 600, 130), fontWeight: 900, color: lookOf(s).accent }}>{`−${n(Math.round(r.diff * prog(t, 1.0, 0.9)))}円`}</div>
          <div style={{ ...row, fontSize: 64, fontWeight: 900, color: lookOf(s).accent, marginLeft: 16 }}>{`−${rate(r.pct)}%`}</div>
        </div>
      </div>
    </Frame>
  );
}

/** rank のランキング: 機種名、下段は 容量・ランクAからCにした差（額・大）・率（A に対して） */
function RankRanking({ s, t, o }: { s: RankScript; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: it.model,
    cells: [
      { text: it.storage, w: 170, max: 44, color: C.muted },
      { text: `−${n(it.diff)}円`, w: 320, max: 76, color: C.red },
      { text: `−${rate(it.pct)}%`, w: 190, max: 50, color: C.red },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/**
 * rank の1位: 機種名・容量、ランクA・B・C の相場の3本の棒（A を幅いっぱいにした比。在庫の件数を添える）、A→C の差額（大）と率。
 * 棒は 0.8 秒から伸び、差額は数え上げる
 */
function RankReveal({ s, t }: { s: RankScript; t: number }) {
  const r = s.scenes.ranking.items[0];
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const diffText = `−${n(r.diff)}円`;
  const sub = `${r.storage}・ランク別の中古の相場`;
  const LABEL = 190;
  const BAR = CW - 60 - LABEL - 20;
  const top = r.buckets[0].median;
  const color = { A: C.budget, B: C.silver, C: C.red } as const;
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 60, fontWeight: 900, marginBottom: 14, opacity: prog(t, 0, 0.25) }}>1位は…</div>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "24px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(r.model, CW - 60, 100), fontWeight: 900 }}>{r.model}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 40), fontWeight: 900, color: C.muted, marginTop: 2 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 12 }}>
          {r.buckets.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 10 : 0 }}>
              <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: 44, fontWeight: 900, color: color[b.rank] }}>{`ランク${b.rank}`}</div>
              <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline", width: BAR }}>
                  <div style={{ ...row, fontSize: 50, fontWeight: 900, color: color[b.rank] }}>{`${n(b.median)}円`}</div>
                  <div style={{ ...row, fontSize: 30, fontWeight: 700, color: C.muted, marginLeft: 14 }}>{`${n(b.count)}件`}</div>
                </div>
                <div style={{ display: "flex", width: Math.max(8, Math.round(((BAR * b.median) / top) * grow)), height: 28, background: color[b.rank], borderRadius: 10, marginTop: 2 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 12 }}>
          <div style={{ ...row, fontSize: 44, fontWeight: 900, color: C.muted, marginRight: 14 }}>A→C</div>
          <div style={{ ...row, fontSize: FIT(diffText, 520, 120), fontWeight: 900, color: C.red }}>{`−${n(Math.round(r.diff * prog(t, 1.0, 0.9)))}円`}</div>
          <div style={{ ...row, fontSize: 56, fontWeight: 900, color: C.red, marginLeft: 14 }}>{`−${rate(r.pct)}%`}</div>
        </div>
      </div>
    </Frame>
  );
}

/** ios27line: 問い＋スマホの形（画面に「iOS 27」と「対応」の札。図形と文字だけ）＋1位の相場（機種は伏せる） */
function PhoneHook({ s, t }: { s: Ios27Script; t: number }) {
  const L = lookOf(s);
  const r = s.scenes.ranking.items[0];
  return (
    <Frame s={s}>
      <Question lines={["iOS 27に対応する", "いちばん安い", "中古iPhoneは…？"]} max={76} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 300, height: 260, marginTop: 28, borderRadius: 44, boxShadow: `0 0 0 10px ${L.fg}`, transform: `scale(${pulseOf(t)})` }}>
        <div style={{ display: "flex", width: 90, height: 18, borderRadius: 9, background: L.fg, marginBottom: 22 }} />
        <div style={{ ...row, fontSize: 68, fontWeight: 900, color: L.fg }}>iOS 27</div>
        <div style={{ ...row, fontSize: 52, fontWeight: 900, color: C.white, background: L.chip, borderRadius: 999, padding: "4px 34px", marginTop: 10, marginBottom: 22 }}>対応</div>
      </div>
      <Teaser s={s} label="最安" value={`${n(r.median)}円`} mt={20} />
    </Frame>
  );
}

/** ios27line のランキング: 機種名、下段は 容量・相場（大）・発売年 */
function Ios27Ranking({ s, t, o }: { s: Ios27Script; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: it.model,
    cells: [
      { text: it.storage, w: 170, max: 44, color: C.muted },
      { text: `${n(it.median)}円`, w: 320, max: 76, color: lookOf(s).accent },
      { text: `${it.released}発売`, w: 190, max: 40, color: C.muted },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/**
 * ios27line の1位: 機種名・容量と発売年・相場（大）、あれば同じ容量の iOS 27 非対応で発売がいちばん新しい機種との2本の棒（高い方を幅いっぱい）と差。
 * 棒は 0.8 秒から伸び、相場は数え上げる
 */
function Ios27Reveal({ s, t }: { s: Ios27Script; t: number }) {
  const r = s.scenes.ranking.items[0];
  const l = s.scenes.legacy;
  const L = lookOf(s);
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const sub = `${r.storage}・${r.released}発売`;
  const price = `相場 ${n(r.median)}円`;
  const LABEL = 200;
  const BAR = CW - 60 - LABEL - 20;
  const max = Math.max(r.median, l?.median ?? 0);
  const bars = l ? [
    { label: "iOS 27対応", name: r.model, price: r.median, color: L.accent },
    { label: "非対応", name: l.model, price: l.median, color: C.silver },
  ] : [];
  const diff = !l ? "" : l.diff > 0 ? `非対応との差 +${n(l.diff)}円` : l.diff < 0 ? `非対応より ${n(-l.diff)}円安い` : "非対応と同じ相場";
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 60, fontWeight: 900, marginBottom: 14, opacity: prog(t, 0, 0.25) }}>1位は…</div>
      <div style={{ ...card(L), width: CW, padding: "26px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(r.model, CW - 60, 100), fontWeight: 900 }}>{r.model}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 44), fontWeight: 900, color: C.muted, marginTop: 4 }}>{sub}</div>
        <div style={{ ...row, fontSize: FIT(price, CW - 60, 110), fontWeight: 900, color: L.accent, marginTop: 6 }}>{`相場 ${n(Math.round(r.median * prog(t, 1.0, 0.9)))}円`}</div>
        {l && (
          <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 14, paddingTop: 14, borderTop: `3px solid ${C.line}`, opacity: prog(t, 1.2, 0.3) }}>
            {bars.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 14 : 0 }}>
                <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: FIT(b.label, LABEL, 42), fontWeight: 900, color: b.color }}>{b.label}</div>
                <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
                  <div style={{ display: "flex", alignItems: "baseline" }}>
                    <div style={{ ...row, fontSize: 50, fontWeight: 900, color: b.color }}>{`${n(b.price)}円`}</div>
                    <div style={{ ...row, fontSize: FIT(b.name, BAR - 280, 34, 22), fontWeight: 700, color: C.muted, marginLeft: 14 }}>{b.name}</div>
                  </div>
                  <div style={{ display: "flex", width: Math.max(8, Math.round(((BAR * b.price) / max) * grow)), height: 30, background: b.color, borderRadius: 12, marginTop: 4 }} />
                </div>
              </div>
            ))}
            <div style={{ ...row, fontSize: FIT(diff, CW - 60, 60), fontWeight: 900, color: C.navy, marginTop: 14 }}>{diff}</div>
          </div>
        )}
      </div>
    </Frame>
  );
}

/** "iPhone 13 Pro" → "13 Pro"（batteryswap の組の2つ目・棒の札） */
const genNo = (model: string) => model.replace(/^iPhone\s+/, "");
/** batteryswap の差の向き（1つ上の世代が高いか安いか） */
const swapSide = (r: BatterySwapRow) => `${swapLabel(r.newer)}が${r.gap >= 0 ? "高い" : "安い"}`;
/** 棒の札・差の向きの短い名前（"iPhone 13 Pro" → "13 Pro"、"iPhone SE (第3世代)" → "SE第3"） */
const swapLabel = (model: string) => genNo(model).replace(/^SE \(第(\d)世代\)$/, "SE第$1");
/** 組の名前（"iPhone 13／14"、SE は "iPhone SE (第2／第3世代)"） */
const swapPair = (older: string, newer: string) => {
  const se = [older, newer].map((m) => m.match(/^iPhone SE \(第(\d)世代\)$/)?.[1]);
  return se[0] && se[1] ? `iPhone SE (第${se[0]}／第${se[1]}世代)` : `${older}／${genNo(newer)}`;
};

/** batteryswap: 問い＋「中古＋電池交換 ＝ 1つ上」の式（札3つ）＋1位の差 */
function EquationHook({ s, t }: { s: BatterySwapScript; t: number }) {
  const L = lookOf(s);
  const r = s.scenes.ranking.items[0];
  const TW = 250;
  const TH = 220;
  const tile = (label: string, sub: string, fill: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: TW, height: TH, background: fill, borderRadius: Math.min(L.card.radius, 28), color: C.white }}>
      <div style={{ ...row, fontSize: FIT(label, TW - 30, 72), fontWeight: 900, lineHeight: 1.1 }}>{label}</div>
      <div style={{ ...row, fontSize: FIT(sub, TW - 30, 34), fontWeight: 700, marginTop: 8 }}>{sub}</div>
    </div>
  );
  const op = (x: string) => <div style={{ ...row, width: (CW - TW * 3) / 2, fontSize: 72, fontWeight: 900, color: L.fg }}>{x}</div>;
  return (
    <Frame s={s}>
      <Question lines={["電池交換を足すと、", "1つ上の世代と", "同じ値段？"]} max={84} />
      <div style={{ display: "flex", alignItems: "center", width: CW, marginTop: 40, transform: `scale(${pulseOf(t)})` }}>
        {tile("中古", "いまの世代", C.budget)}
        {op("＋")}
        {tile("電池交換", "Apple公式", SITE.inspect700)}
        {op("＝")}
        {tile("1つ上", "の世代の中古", L.chip)}
      </div>
      <Teaser s={s} label="差 最小" value={`${n(Math.abs(r.gap))}円`} mt={36} />
    </Frame>
  );
}

/** batteryswap のランキング: 機種名は「古い方／1つ上」、下段は 容量・差（額・大）・どちらが高いか */
function BatterySwapRanking({ s, t, o }: { s: BatterySwapScript; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: swapPair(it.older, it.newer),
    cells: [
      { text: it.storage, w: 150, max: 44, color: C.muted },
      { text: `差 ${n(Math.abs(it.gap))}円`, w: 300, max: 70, color: lookOf(s).accent },
      { text: it.gap >= 0 ? "1つ上が高い" : "1つ上が安い", w: 230, max: 40, color: C.muted },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/**
 * batteryswap の1位: 「古い方／1つ上」・容量、古い方の相場＋電池交換（積み上げの棒）と1つ上の世代の相場の2本の棒（長い方を幅いっぱい）、差（大）。
 * 棒は 0.8 秒から伸び、差は数え上げる
 */
function BatterySwapReveal({ s, t }: { s: BatterySwapScript; t: number }) {
  const r = s.scenes.ranking.items[0];
  const L = lookOf(s);
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const name = swapPair(r.older, r.newer);
  const sub = `${r.storage}・中古の相場`;
  const LABEL = 170;
  const BAR = CW - 60 - LABEL - 20;
  const max = Math.max(r.total, r.newerMedian);
  const w = (x: number) => Math.round(((BAR * x) / max) * grow);
  const amber = SITE.inspect700;
  const parts = [`${n(r.olderMedian)}円`, `＋ 電池交換 ${n(r.battery)}円`];
  const partSize = FIT(parts.join("　"), BAR, 40, 24);
  const labelSize = Math.min(FIT(swapLabel(r.older), LABEL, 48), FIT(swapLabel(r.newer), LABEL, 48));
  const gapText = `差 ${n(Math.abs(r.gap))}円`;
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 60, fontWeight: 900, marginBottom: 14, opacity: prog(t, 0, 0.25) }}>1位は…</div>
      <div style={{ ...card(L), width: CW, padding: "24px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(name, CW - 60, 96), fontWeight: 900 }}>{name}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 40), fontWeight: 900, color: C.muted, marginTop: 2 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", width: CW - 60 }}>
            <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: labelSize, fontWeight: 900, color: C.budget }}>{swapLabel(r.older)}</div>
            <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
              <div style={{ ...row, justifyContent: "flex-start", fontSize: 50, fontWeight: 900, color: C.navy }}>{`${n(r.total)}円`}</div>
              <div style={{ display: "flex", marginTop: 4 }}>
                <div style={{ display: "flex", width: Math.max(8, w(r.olderMedian)), height: 32, background: C.budget, borderRadius: "12px 0 0 12px" }} />
                <div style={{ display: "flex", width: Math.max(4, w(r.battery)), height: 32, background: amber, borderRadius: "0 12px 12px 0" }} />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", marginTop: 4 }}>
                <div style={{ ...row, fontSize: partSize, fontWeight: 900, color: C.budget }}>{parts[0]}</div>
                <div style={{ ...row, fontSize: partSize, fontWeight: 900, color: amber, marginLeft: 10 }}>{parts[1]}</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: 16 }}>
            <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: labelSize, fontWeight: 900, color: L.chip }}>{swapLabel(r.newer)}</div>
            <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
              <div style={{ ...row, justifyContent: "flex-start", fontSize: 50, fontWeight: 900, color: C.navy }}>{`${n(r.newerMedian)}円`}</div>
              <div style={{ display: "flex", width: Math.max(8, w(r.newerMedian)), height: 32, background: L.chip, borderRadius: 12, marginTop: 4 }} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 12 }}>
          <div style={{ ...row, fontSize: FIT(gapText, 560, 120), fontWeight: 900, color: L.accent }}>{`差 ${n(Math.round(Math.abs(r.gap) * prog(t, 1.0, 0.9)))}円`}</div>
          <div style={{ ...row, fontSize: FIT(swapSide(r), 300, 52), fontWeight: 900, color: C.muted, marginLeft: 16 }}>{swapSide(r)}</div>
        </div>
      </div>
    </Frame>
  );
}

/** overnew: 問い＋新品（100%）と中古の相場（1位の割合）の2本の棒＋1位の割合（中古が新品以上なら高い額） */
function RatioHook({ s, t }: { s: OverNewScript; t: number }) {
  const L = lookOf(s);
  const r = s.scenes.ranking.items[0];
  const LABEL = 150;
  const BAR = CW - 60 - LABEL - 20;
  const max = Math.max(r.newPrice, r.usedMedian);
  const bars = [
    { label: "新品", pct: "100%", w: Math.round((BAR * r.newPrice) / max), color: C.budget },
    { label: "中古", pct: `${rate(r.ratio)}%`, w: Math.round((BAR * r.usedMedian) / max), color: L.accent },
  ];
  return (
    <Frame s={s}>
      <Question lines={["中古なのに、", "新品より高い？"]} max={100} />
      <div style={{ ...card(L), width: CW, padding: "30px 30px", marginTop: 40, transform: `scale(${pulseOf(t)})` }}>
        {bars.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 22 : 0 }}>
            <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: 56, fontWeight: 900, color: b.color }}>{b.label}</div>
            <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
              <div style={{ ...row, justifyContent: "flex-start", fontSize: 52, fontWeight: 900, color: b.color }}>{b.pct}</div>
              <div style={{ display: "flex", width: Math.max(8, b.w), height: 44, background: b.color, borderRadius: 14, marginTop: 4 }} />
            </div>
          </div>
        ))}
      </div>
      {r.diff < 0 ? <Teaser s={s} label="新品より" value={`+${n(-r.diff)}円`} /> : <Teaser s={s} label="最大" value={`新品の${rate(r.ratio)}%`} />}
    </Frame>
  );
}

/** overnew のランキング: 機種名、下段は 容量・新品に対する割合（大）・差（中古が新品以上なら +） */
function OverNewRanking({ s, t, o }: { s: OverNewScript; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: it.model,
    cells: [
      { text: it.storage, w: 170, max: 44, color: C.muted },
      { text: `新品の${rate(it.ratio)}%`, w: 330, max: 66, color: lookOf(s).accent },
      { text: it.diff >= 0 ? `−${n(it.diff)}円` : `+${n(-it.diff)}円`, w: 180, max: 44, color: lookOf(s).accent },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/**
 * overnew の1位: 機種名・容量と発売年、新品（Apple 公式）と中古の相場の2本の棒（高い方を幅いっぱい）、
 * 中古が新品以上なら「新品より +○円」、ほかは「新品の○%」（大）と差。棒は 0.8 秒から伸びる
 */
function OverNewReveal({ s, t }: { s: OverNewScript; t: number }) {
  const r = s.scenes.ranking.items[0];
  const L = lookOf(s);
  const over = r.diff < 0;
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const sub = `${r.storage}・${r.released}発売`;
  const LABEL = 230;
  const BAR = CW - 60 - LABEL - 20;
  const max = Math.max(r.newPrice, r.usedMedian);
  const bars = [
    { label: "新品", price: r.newPrice, color: C.budget },
    { label: "中古の相場", price: r.usedMedian, color: L.accent },
  ];
  const big = over ? `新品より +${n(-r.diff)}円` : `新品の${rate(r.ratio)}%`;
  const small = over ? `新品の${rate(r.ratio)}%` : `差 −${n(r.diff)}円`;
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 60, fontWeight: 900, marginBottom: 14, opacity: prog(t, 0, 0.25) }}>1位は…</div>
      <div style={{ ...card(L), width: CW, padding: "22px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(r.model, CW - 60, 92), fontWeight: 900 }}>{r.model}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 44), fontWeight: 900, color: C.muted, marginTop: 4 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 12 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 12 : 0 }}>
              <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: FIT(b.label, LABEL, 40), fontWeight: 900, color: C.muted }}>{b.label}</div>
              <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
                <div style={{ ...row, justifyContent: "flex-start", fontSize: FIT(`${n(b.price)}円`, BAR, 56), fontWeight: 900, color: b.color }}>{`${n(b.price)}円`}</div>
                <div style={{ display: "flex", width: Math.max(8, Math.round(((BAR * b.price) / max) * grow)), height: 34, background: b.color, borderRadius: 12, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ ...row, fontSize: FIT(big, CW - 60, 100), fontWeight: 900, color: L.accent, marginTop: 8, opacity: prog(t, 1.0, 0.3) }}>{big}</div>
        <div style={{ ...row, fontSize: FIT(small, CW - 60, 52), fontWeight: 900, color: C.muted, marginTop: 4, opacity: prog(t, 1.3, 0.3) }}>{small}</div>
      </div>
    </Frame>
  );
}

/** minie の機種名: 弟分を先に「iPhone 13 mini／13」（ナレーション「<弟分>と<無印>」と同じ順。行の型は FoldRow で newer＝無印・older＝弟分） */
const minieName = (base: string, sib: string) => `${sib}／${foldShort(base)}`;

/** unused のランキング: 機種名、下段は 容量・未使用品にした差（額・大）・率（ランクA に対して） */
function UnusedRanking({ s, t, o }: { s: UnusedScript; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: it.model,
    cells: [
      { text: it.storage, w: 170, max: 44, color: C.muted },
      { text: `+${n(it.diff)}円`, w: 320, max: 76, color: lookOf(s).accent },
      { text: `+${rate(it.pct)}%`, w: 190, max: 50, color: lookOf(s).accent },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/**
 * unused の1位: 機種名・容量、ランクAと未使用品（ランクS）の相場の2本の棒（未使用品を幅いっぱいにした比。在庫の件数を添える）、差額（大）と率（A に対して）。
 * 棒は 0.8 秒から伸び、差額は数え上げる（battery の1位と同じ形）
 */
function UnusedReveal({ s, t }: { s: UnusedScript; t: number }) {
  const r = s.scenes.ranking.items[0];
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const diffText = `+${n(r.diff)}円`;
  const sub = `${r.storage}・ランク別の中古の相場`;
  const LABEL = 200;
  const BAR = CW - 60 - LABEL - 20;
  const bars = [
    { label: "ランクA", price: r.aMedian, count: r.aCount, color: C.budget, w: Math.round((BAR * r.aMedian) / r.sMedian) },
    { label: "未使用品", price: r.sMedian, count: r.sCount, color: lookOf(s).accent, w: BAR },
  ];
  const labelSize = Math.min(...bars.map((b) => FIT(b.label, LABEL, 48)));
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 52, fontWeight: 900, marginBottom: 8, opacity: prog(t, 0, 0.25) }}>1位は…</div>
      <div style={{ ...card(lookOf(s)), width: CW, padding: "20px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(r.model, CW - 60, 88), fontWeight: 900 }}>{r.model}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 44), fontWeight: 900, color: C.muted, marginTop: 4 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 12 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 12 : 0 }}>
              <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: labelSize, fontWeight: 900, color: b.color }}>{b.label}</div>
              <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <div style={{ ...row, fontSize: 50, fontWeight: 900, color: b.color }}>{`${n(b.price)}円`}</div>
                  <div style={{ ...row, fontSize: 34, fontWeight: 700, color: C.muted, marginLeft: 14 }}>{`${n(b.count)}件`}</div>
                </div>
                <div style={{ display: "flex", width: Math.max(8, Math.round(b.w * grow)), height: 30, background: b.color, borderRadius: 12, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 8 }}>
          <div style={{ ...row, fontSize: FIT(diffText, 600, 112), fontWeight: 900, color: lookOf(s).accent }}>{`+${n(Math.round(r.diff * prog(t, 1.0, 0.9)))}円`}</div>
          <div style={{ ...row, fontSize: 64, fontWeight: 900, color: lookOf(s).accent, marginLeft: 16 }}>{`+${rate(r.pct)}%`}</div>
        </div>
        <div style={{ ...row, fontSize: 40, fontWeight: 900, color: C.muted, marginTop: 10, opacity: prog(t, 1.6, 0.3) }}>ランクは各店の表記</div>
      </div>
    </Frame>
  );
}

/** oldpro の安い方の短い名前（"iPhone 15 Pro" → "15 Pro"。diff ＝ 無印 − Pro が正なら Pro が安い） */
const oldProCheaper = (r: OldProRow) => foldShort(r.diff > 0 ? r.older : r.newer);

/** oldpro のランキング: 機種名は「1世代前の Pro／次の無印」、下段は 容量・差（額・大）・どちらが安いか（batteryswap と同じ形） */
function OldProRanking({ s, t, o }: { s: OldProScript; t: number; o: Scene["o"] }) {
  const items = s.scenes.ranking.items.slice(0, RANK_SHOWN).map((it) => ({
    model: pairName(it.older, it.newer),
    cells: [
      { text: it.storage, w: 150, max: 44, color: C.muted },
      { text: `差 ${n(Math.abs(it.diff))}円`, w: 300, max: 70, color: lookOf(s).accent },
      { text: `${oldProCheaper(it)}が安い`, w: 230, max: 44, color: C.muted },
    ],
  }));
  return <RankRows s={s} t={t} o={o} items={items} />;
}

/**
 * oldpro の1位: 「1世代前の Pro／次の無印」・容量、2機種の相場の2本の棒（高い方を幅いっぱい）、差（大）とどちらが安いか・率（高い方に対して）。
 * 棒は 0.8 秒から伸び、差は数え上げる（provs の1位と同じ形）
 */
function OldProReveal({ s, t }: { s: OldProScript; t: number }) {
  const r = s.scenes.ranking.items[0];
  const L = lookOf(s);
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const name = pairName(r.older, r.newer);
  const sub = `${r.storage}・中古の相場`;
  const LABEL = 190;
  const BAR = CW - 60 - LABEL - 20;
  const max = Math.max(r.olderMedian, r.newerMedian);
  const bars = [
    { label: foldShort(r.older), price: r.olderMedian, color: L.chip, w: Math.round((BAR * r.olderMedian) / max) },
    { label: foldShort(r.newer), price: r.newerMedian, color: C.budget, w: Math.round((BAR * r.newerMedian) / max) },
  ];
  const labelSize = Math.min(...bars.map((b) => FIT(b.label, LABEL, 48)));
  const gapText = `差 ${n(Math.abs(r.diff))}円`;
  const side = `${oldProCheaper(r)}が安い`;
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 60, fontWeight: 900, marginBottom: 14, opacity: prog(t, 0, 0.25) }}>1位は…</div>
      <div style={{ ...card(L), width: CW, padding: "26px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(name, CW - 60, 100), fontWeight: 900 }}>{name}</div>
        <div style={{ ...row, fontSize: FIT(sub, CW - 60, 44), fontWeight: 900, color: C.muted, marginTop: 4 }}>{sub}</div>
        <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 18 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 18 : 0 }}>
              <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: labelSize, fontWeight: 900, color: b.color }}>{b.label}</div>
              <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
                <div style={{ ...row, justifyContent: "flex-start", fontSize: FIT(`${n(b.price)}円`, BAR, 56), fontWeight: 900, color: b.color }}>{`${n(b.price)}円`}</div>
                <div style={{ display: "flex", width: Math.max(8, Math.round(b.w * grow)), height: 34, background: b.color, borderRadius: 12, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 14 }}>
          <div style={{ ...row, fontSize: FIT(gapText, 600, 120), fontWeight: 900, color: L.accent }}>{`差 ${n(Math.round(Math.abs(r.diff) * prog(t, 1.0, 0.9)))}円`}</div>
          <div style={{ ...row, fontSize: 64, fontWeight: 900, color: L.accent, marginLeft: 16 }}>{`−${rate(r.pct)}%`}</div>
        </div>
        <div style={{ ...row, fontSize: FIT(side, CW - 60, 56), fontWeight: 900, color: C.navy, marginTop: 8, opacity: prog(t, 1.4, 0.3) }}>{side}</div>
      </div>
    </Frame>
  );
}

/** rakutenmobile: 題＋料金の3段の階段（高さは月額の比。額は伏せる）＋2年の上と下の差 */
function TiersHook({ s, t }: { s: RakutenMobileScript; t: number }) {
  const L = lookOf(s);
  const rows = s.scenes.tiers.rows;
  const max = Math.max(...rows.map((r) => r.monthly));
  const STEP = 220;
  const COL = 240;
  return (
    <Frame s={s}>
      <Question lines={["楽天モバイルの料金は", "使った量で3段階"]} max={88} />
      <div style={{ ...card(L), width: CW, padding: "30px 30px 26px", marginTop: 36, transform: `scale(${pulseOf(t)})` }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", width: CW - 60, height: STEP + 60 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: COL, marginLeft: i ? 30 : 0 }}>
              <div style={{ ...row, fontSize: 48, fontWeight: 900, color: L.accent }}>？円</div>
              <div style={{ display: "flex", width: COL, height: Math.round((STEP * r.monthly) / max), background: L.chip, borderRadius: "16px 16px 0 0", marginTop: 6 }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", width: CW - 60, borderTop: `3px solid ${C.line}`, paddingTop: 10 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ ...row, width: COL, marginLeft: i ? 30 : 0, fontSize: FIT(r.label, COL, 44), fontWeight: 900, color: C.navy }}>{r.label}</div>
          ))}
        </div>
      </div>
      <Teaser s={s} label="2年で差" value={`${n(s.scenes.diff)}円`} mt={24} />
    </Frame>
  );
}

/** rakutenmobile の料金の3段（3行・1行 170px）。左に段の札、右に月額（税込）。上から順に、声に合わせて出す。上に「税込・割引なし」、下に「使った量で決まる」 */
function TierRows({ s, t, o }: { s: RakutenMobileScript; t: number; o: Scene["o"] }) {
  const L = lookOf(s);
  const rows = s.scenes.tiers.rows;
  const RH = 170;
  const RIGHT = 600;
  const head = `${s.scenes.tiers.plan}の月額（税込・割引なし）`;
  const foot = "段は、その月に使った量で決まる";
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: FIT(head, CW, 48), fontWeight: 900, marginBottom: 24 }}>{head}</div>
      <div style={{ ...card(L), width: CW, padding: "4px 24px" }}>
        {rows.map((r, i) => {
          const p = prog(t, o?.at?.[i] ?? 0.3 + 1.6 * i, ROW_FADE);
          const price = `月 ${n(r.monthly)}円`;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", width: "100%", height: RH, borderBottom: i < rows.length - 1 ? `3px solid ${C.line}` : "none", opacity: p, transform: `translateX(${Math.round((1 - p) * 80)}px)` }}>
              <div style={{ display: "flex", justifyContent: "center", width: 250, flexShrink: 0, fontSize: FIT(r.label, 230, 56), fontWeight: 900, color: C.white, background: L.chip, borderRadius: 22, padding: "14px 0" }}>{r.label}</div>
              <div style={{ ...row, width: RIGHT, flexShrink: 0, marginLeft: 22, fontSize: FIT(price, RIGHT, 92), fontWeight: 900, color: C.navy }}>{price}</div>
            </div>
          );
        })}
      </div>
      <div style={{ ...row, fontSize: FIT(foot, CW, 56), fontWeight: 900, color: L.accentOnBg, marginTop: 30 }}>{foot}</div>
    </Frame>
  );
}

/**
 * rakutenmobile の2年の合計: 中古の端末（容量・相場）、段ごとの「相場＋月額×24」の棒（いちばん上の段を幅いっぱいにした比）、上と下の段の差（大）。
 * 棒は 0.8 秒から伸び、差は数え上げる。下に「ずっと同じ段の場合・各種手数料等別」
 */
function TierTotals({ s, t }: { s: RakutenMobileScript; t: number }) {
  const L = lookOf(s);
  const d = s.scenes.device;
  const rows = s.scenes.tiers.rows;
  const pop = 0.8 + 0.2 * back((t - 0.6) / 0.6);
  const grow = prog(t, 0.8, 0.7);
  const name = `中古${d.model} ${d.storage}`;
  const median = `相場 ${n(d.median)}円 ＋ 月額×${s.scenes.tiers.months}`;
  const note = `${s.scenes.tiers.months}か月ずっと同じ段の場合・各種手数料等別`;
  const LABEL = 210;
  const BAR = CW - 60 - LABEL - 20;
  const max = Math.max(...rows.map((r) => r.total));
  return (
    <Frame s={s}>
      <div style={{ ...row, fontSize: 52, fontWeight: 900, marginBottom: 10, opacity: prog(t, 0, 0.25) }}>2年でいくら？</div>
      <div style={{ ...card(L), width: CW, padding: "22px 30px", opacity: clamp((t - 0.6) / 0.25), transform: `scale(${pop})` }}>
        <div style={{ ...row, fontSize: FIT(name, CW - 60, 72), fontWeight: 900 }}>{name}</div>
        <div style={{ ...row, fontSize: FIT(median, CW - 60, 40), fontWeight: 900, color: C.muted, marginTop: 4 }}>{median}</div>
        <div style={{ display: "flex", flexDirection: "column", width: CW - 60, marginTop: 12 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", width: CW - 60, marginTop: i ? 10 : 0 }}>
              <div style={{ ...row, justifyContent: "flex-end", width: LABEL, fontSize: FIT(r.label, LABEL, 44), fontWeight: 900, color: C.muted }}>{r.label}</div>
              <div style={{ display: "flex", flexDirection: "column", width: BAR, marginLeft: 20 }}>
                <div style={{ ...row, justifyContent: "flex-start", fontSize: FIT(`${n(r.total)}円`, BAR, 48), fontWeight: 900, color: C.navy }}>{`${n(r.total)}円`}</div>
                <div style={{ display: "flex", width: Math.max(8, Math.round(((BAR * r.total) / max) * grow)), height: 24, background: L.chip, borderRadius: 10, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 14 }}>
          <div style={{ ...row, fontSize: 48, fontWeight: 900, color: C.navy, marginRight: 16 }}>上と下の差</div>
          <div style={{ ...row, fontSize: FIT(`${n(s.scenes.diff)}円`, 520, 96), fontWeight: 900, color: L.accent }}>{`${n(Math.round(s.scenes.diff * prog(t, 1.0, 0.9)))}円`}</div>
        </div>
        <div style={{ ...row, fontSize: FIT(note, CW - 60, 34, 24), fontWeight: 700, color: C.muted, marginTop: 4 }}>{note}</div>
      </div>
    </Frame>
  );
}

export function sceneFrame(sc: Scene, s: Script, t: number): ReactElement {
  if (s.theme === "rakutenmobile") {
    switch (sc.id) {
      case "hook": return <TiersHook s={s} t={t} />;
      case "ranking": return <TierRows s={s} t={t} o={sc.o} />;
      case "reveal": return <TierTotals s={s} t={t} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`${s.theme} に場面 ${sc.id} はありません`);
    }
  }
  if (s.theme === "ios27line" || s.theme === "batteryswap" || s.theme === "overnew") {
    if (sc.id === "comment") return <Comment s={s} t={t} o={sc.o} />;
    if (sc.id === "outro") return <Outro s={s} t={t} o={sc.o} />;
    if (s.theme === "ios27line") {
      if (sc.id === "hook") return <PhoneHook s={s} t={t} />;
      if (sc.id === "ranking") return <Ios27Ranking s={s} t={t} o={sc.o} />;
      if (sc.id === "reveal") return <Ios27Reveal s={s} t={t} />;
    } else if (s.theme === "batteryswap") {
      if (sc.id === "hook") return <EquationHook s={s} t={t} />;
      if (sc.id === "ranking") return <BatterySwapRanking s={s} t={t} o={sc.o} />;
      if (sc.id === "reveal") return <BatterySwapReveal s={s} t={t} />;
    } else {
      if (sc.id === "hook") return <RatioHook s={s} t={t} />;
      if (sc.id === "ranking") return <OverNewRanking s={s} t={t} o={sc.o} />;
      if (sc.id === "reveal") return <OverNewReveal s={s} t={t} />;
    }
    throw new Error(`${s.theme} に場面 ${sc.id} はありません`);
  }
  if (s.theme === "minie") {
    // 行と1位は fold・gen と同じ部品（FoldRow。newer＝無印・older＝弟分）。機種名は弟分を先に。つかみは「無印 vs mini・e」の札
    const f = s as unknown as FoldScript;
    switch (sc.id) {
      case "hook": {
        const r = s.scenes.ranking.items[0];
        // hookStyle "answer"（10/26〜の実験）: 問いでなく1位の答えから（「iPhone 17eは／無印より／約2.6万円安い」）
        const lines = s.hookStyle === "answer"
          ? [`iPhone ${r.older.replace(/^iPhone /, "")}は`, "無印より", `約${(r.diff / 10000).toFixed(1)}万円安い`]
          : ["miniとeは、", "無印より", "いくら安い？"];
        return <SplitHook s={s} t={t} lines={lines} teaser={`−${n(r.diff)}円`} label={s.hookStyle === "answer" ? "1位" : "最大"}
          left={{ label: "無印", sub: r.storage, fill: C.budget }} right={{ label: "mini・e", sub: "弟分", fill: C.red }} />;
      }
      case "ranking": return <FoldRanking s={f} t={t} o={sc.o} nameOf={minieName} />;
      case "reveal": return <FoldReveal s={f} t={t} nameOf={minieName} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`minie に場面 ${sc.id} はありません`);
    }
  }
  if (s.theme === "oldpro") {
    switch (sc.id) {
      case "hook": {
        const r = s.scenes.ranking.items[0];
        return <SplitHook s={s} t={t} lines={["1世代前のProと、", "最新の無印、", "どっちが安い？"]} teaser={`${n(Math.abs(r.diff))}円`} label="差 最大"
          left={{ label: "前のPro", sub: "1世代前", fill: lookOf(s).chip }} right={{ label: "無印", sub: "次の世代", fill: C.budget }} />;
      }
      case "ranking": return <OldProRanking s={s} t={t} o={sc.o} />;
      case "reveal": return <OldProReveal s={s} t={t} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`oldpro に場面 ${sc.id} はありません`);
    }
  }
  if (s.theme === "unused") {
    switch (sc.id) {
      case "hook": {
        const r = s.scenes.ranking.items[0];
        return <SplitHook s={s} t={t} lines={["未使用品、", "中古より", "いくら高い？"]} teaser={`+${n(r.diff)}円`}
          left={{ label: "ランクA", sub: "中古", fill: C.budget }} right={{ label: "未使用品", sub: "ランクS", fill: lookOf(s).chip }} />;
      }
      case "ranking": return <UnusedRanking s={s} t={t} o={sc.o} />;
      case "reveal": return <UnusedReveal s={s} t={t} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`unused に場面 ${sc.id} はありません`);
    }
  }
  if (s.theme === "gen") {
    // 場面は fold と同じ（行の型が同じ）。つかみだけ「最新 vs 1世代前」の札
    const f = s as unknown as FoldScript;
    switch (sc.id) {
      case "hook": {
        const r = s.scenes.ranking.items[0];
        return <SplitHook s={s} t={t} lines={["iPhone、", "1世代前にすると", "いくら安い？"]} teaser={`−${n(r.diff)}円`}
          left={{ label: "最新", sub: r.storage, fill: C.budget }} right={{ label: "1世代前", sub: r.storage, fill: lookOf(s).chip }} />;
      }
      case "ranking": return <FoldRanking s={f} t={t} o={sc.o} />;
      case "reveal": return <FoldReveal s={f} t={t} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`gen に場面 ${sc.id} はありません`);
    }
  }
  if (s.theme === "storage") {
    switch (sc.id) {
      case "hook": {
        const r = s.scenes.ranking.items[0];
        return <SplitHook s={s} t={t} lines={["容量を1つ上げると、", "中古iPhoneは", "いくら高い？"]} teaser={`+${n(r.diff)}円`} label="最小"
          left={{ label: r.from, sub: "いまの容量", fill: C.budget }} right={{ label: r.to, sub: "1つ上", fill: lookOf(s).chip }} />;
      }
      case "ranking": return <StorageRanking s={s} t={t} o={sc.o} />;
      case "reveal": return <StorageReveal s={s} t={t} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`storage に場面 ${sc.id} はありません`);
    }
  }
  if (s.theme === "battery") {
    switch (sc.id) {
      case "hook": return <BatteryHook s={s} t={t} />;
      case "ranking": return <BatteryRanking s={s} t={t} o={sc.o} />;
      case "reveal": return <BatteryReveal s={s} t={t} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`battery に場面 ${sc.id} はありません`);
    }
  }
  if (s.theme === "rank") {
    switch (sc.id) {
      case "hook": return <AbcHook s={s} t={t} />;
      case "ranking": return <RankRanking s={s} t={t} o={sc.o} />;
      case "reveal": return <RankReveal s={s} t={t} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`rank に場面 ${sc.id} はありません`);
    }
  }
  if (s.theme === "fold") {
    switch (sc.id) {
      case "hook": return <FoldHook s={s} t={t} />;
      case "ranking": return <FoldRanking s={s} t={t} o={sc.o} />;
      case "reveal": return <FoldReveal s={s} t={t} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`fold に場面 ${sc.id} はありません`);
    }
  }
  if (isProVs(s)) {
    const pm = s.theme === "promax";
    const pl = s.theme === "plusvs";
    const px = s.theme === "plusmax";
    const [baseLabel, proLabel] = pm ? ["Pro", "Pro Max"] : pl ? ["無印", "Plus"] : px ? ["Plus", "Pro Max"] : ["無印", "Pro"];
    switch (sc.id) {
      case "hook": {
        const r = s.scenes.ranking.items[0];
        return <SplitHook s={s} t={t} lines={[pm ? "Pro MaxとPro、" : px ? "PlusとPro Max、" : `${proLabel}と無印、`, "同じ容量だと", "いくら違う？"]} teaser={`+${n(r.diff)}円`}
          left={{ label: baseLabel, sub: r.storage, fill: C.budget }} right={{ label: proLabel, sub: r.storage, fill: lookOf(s).chip }} />;
      }
      case "ranking": return <ProVsRanking s={s} t={t} o={sc.o} />;
      case "reveal": return <ProVsReveal s={s} t={t} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`${s.theme} に場面 ${sc.id} はありません`);
    }
  }
  if (s.theme === "newused") {
    switch (sc.id) {
      case "hook": {
        const r = s.scenes.ranking.items[0];
        return <SplitHook s={s} t={t} lines={["新品より、中古で", "いくら安くなる？"]} teaser={`−${n(r.diff)}円`}
          left={{ label: "新品", sub: "Apple公式", fill: C.budget }} right={{ label: "中古", sub: "相場", fill: lookOf(s).chip }} />;
      }
      case "ranking": return <NewUsedRanking s={s} t={t} o={sc.o} />;
      case "reveal": return <NewUsedReveal s={s} t={t} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`newused に場面 ${sc.id} はありません`);
    }
  }
  if (isBudget(s)) {
    switch (sc.id) {
      case "hook": return lookOf(s).hook === "coins" ? <CoinHook s={s} t={t} /> : <BudgetHook s={s} t={t} />;
      case "ranking": return <BudgetRows s={s} t={t} o={sc.o} />;
      case "reveal": return <Pick s={s} t={t} />;
      case "comment": return <Comment s={s} t={t} o={sc.o} />;
      case "outro": return <Outro s={s} t={t} o={sc.o} />;
      default: throw new Error(`${s.theme} に場面 ${sc.id} はありません`);
    }
  }
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
