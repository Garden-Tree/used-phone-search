/**
 * 横動画のデータ（<フォルダ>/data.json）と時間割（timeline.json）の型。
 * cue は「この文字列を含む台詞が始まったら出す」。timeline.ts が章の頭からの秒（revealAt）に直す
 */
import type { SITE } from "@/lib/brandColors";
import type { Who } from "./script";

export type PaletteKey = keyof typeof SITE;

/** 大きな数字・言葉のカード（タイトル・結論・調べ方） */
export type BigNumberScene = {
  type: "bigNumber";
  heading: string;
  items: { label?: string; value: string; unit?: string; cue?: string }[];
  note?: string;
};

/** 横棒（機種×相場）。最安があれば赤い点 */
export type BarsScene = {
  type: "bars";
  heading: string;
  /** 件・機種は数の棒（店ごとの在庫数・最安の機種の数。10/24〜） */
  unit: "万円" | "円" | "件" | "機種" | "年" | "時間" | "g";
  rows: { label: string; sub?: string; median: number; min?: number; minLabel?: string; stock?: string; pick?: boolean; /** 札の文字（なければ「おすすめ」） */ pickLabel?: string; /** 台詞の中でこの行を指す言葉（なければラベルの先頭の語） */ say?: string; cue?: string; minCue?: string }[];
  note?: string;
  /** 2つの行の差の札（11/27 動きの見本〜）。at はその章の頭からの秒（timeline が cue から入れる） */
  diffs?: { from: number; to: number; label: string; cue?: string; at?: number }[];
  /** 数字の札・値のポップを出す（11/27 動きの見本〜） */
  motion?: boolean;
};

/** 2本ずつの棒（新品と中古・無印と Pro） */
export type PairsScene = {
  type: "pairs";
  heading: string;
  unit: "万円" | "円";
  legend: [string, string];
  colors: [PaletteKey, PaletteKey];
  rows: { label: string; a: number; b: number; diffLabel?: string; cue?: string }[];
  note?: string;
};

export type TableScene = {
  type: "table";
  heading: string;
  columns: string[];
  /** 赤く太くする列 */
  emphasis?: number[];
  /** emphasis はその行だけ列を変える（[] でその行は赤くしない。新旧で同じ値の行など。10/27〜） */
  rows: { cells: string[]; cue?: string; emphasis?: number[] }[];
  note?: string;
};

/** 1つずつ出すチェックリスト */
export type ChecklistScene = {
  type: "checklist";
  heading: string;
  items: { text: string; sub?: string; cue?: string; /** ✓ を付ける台詞（なければ、項目に台詞が触れた最初の秒）。11/27〜 */ checkCue?: string }[];
  /** 番号の丸を、説明した項目から ✓ に替える（12/1 の回〜標準。false で止める） */
  checks?: boolean;
  /** 2 で2列（左→右・上→下に 1,2 / 3,4 / 5,6。6項目を3x2に。11/26〜）。行の文字は1行（長ければ縮める） */
  columns?: 1 | 2;
  note?: string;
};

/**
 * 終了画面（最後の章・10/25〜）。YouTube Studio の終了画面の要素（動画2枠・チャンネル登録）を重ねる場所を空けた画面。
 * 枠の中には動画の題を描いておく（終了画面が出ない環境・要素を置く前でも何の動画かわかるように）。位置は scenes.tsx の END_SCREEN
 */
export type EndScreenScene = {
  type: "endScreen";
  heading: string;
  /** 次に出す横動画（lib/videos.ts の id と題。左・右の順） */
  videos: [EndScreenVideo, EndScreenVideo];
  note?: string;
};
export type EndScreenVideo = { id: string; title: string };

/**
 * 写真・公式のスクショ（11/23〜）。src はリポジトリの根からの PNG／JPEG のパス（例 longform/<フォルダ>/img/battery.png）。
 * credit は画像の下に小さく出し、説明欄のクレジットにも「画像：」で足す（CC は作者・ライセンス・URL、公式のスクショは「出典：Apple（URL）」）。
 * points があれば右に1つずつ出す（機能の紹介など）。公式の画像は引用として使う: 説明が主・画像は従、出典を必ず書く
 */
export type PhotoScene = {
  type: "photo";
  heading: string;
  src: string;
  credit: string;
  points?: { text: string; sub?: string; cue?: string; say?: string }[];
  /** 差し替える画像（cue の台詞が始まったら次の画像に替わる。最初は src）。credit はそれぞれ */
  images?: { src: string; credit: string; cue: string; crop?: { x: number; y: number; w: number; h: number } }[];
  /** 見せたい所だけ拡大（画像の幅・高さに対する割合 x・y・w・h） */
  crop?: { x: number; y: number; w: number; h: number };
  /**
   * 図解（11/27〜）: 写真の上に赤い丸と札を、cue の台詞で出す。img は何枚目の画像の上か（0＝src）。x・y・r は画像の幅・高さに対する割合（r は幅に対する半径）。
   * zoom を付けると、出た瞬間に丸の所へ 0.6 秒で寄る（2＝2倍）
   */
  notes?: { img?: number; x: number; y: number; r?: number; label: string; cue?: string; zoom?: number; side?: "left" | "right"; /** span＝x から x2 までの横の矢印（＜ーー＞。厚さ・幅） */ kind?: "circle" | "span"; x2?: number }[];
  note?: string;
};

/** 電池の形のゲージ（11/27〜・図解）: 値まで下から満ちる。cue で1本ずつ */
export type GaugesScene = {
  type: "gauges";
  heading: string;
  unit: string;
  /** ゲージのいちばん上の値（なければいちばん大きい値の 1.1 倍） */
  max?: number;
  items: { label: string; value: number; sub?: string; cue?: string; pick?: boolean }[];
  note?: string;
};

/** スマホの画面の絵（11/27〜・図解）: 設定の画面などを行で描き、cue でその行に赤い丸と矢印。実物の画面ではないので見出しに「イメージ」 */
export type ScreenScene = {
  type: "screen";
  heading: string;
  /** 画面の上の題（例「バッテリーの状態と充電」） */
  title: string;
  rows: { label: string; value?: string; sub?: string }[];
  /** 丸と矢印で指す行と、横に出す説明 */
  points?: { row: number; text: string; sub?: string; cue?: string }[];
  note?: string;
};

/** どの場面にも付けられるもの（11/27〜）: burst＝この言葉を言う瞬間にカードのまわりへ集中線（約1.2秒）。11/27 ユーザー「微妙」で使わない */
export type SceneExtras = {
  burst?: string;
  /** 出典カード（11/27〜）: カードの右下に「出典 …」を cue で出す（Apple の仕様・修理料金など） */
  source?: { text: string; from: string; cue?: string; /** 置き場所（割合・左上）。なければ右下 */ x?: number; y?: number };
  /** 思考の吹き出し（11/27〜）: ずんだもんの上にもこもこの吹き出し（迷っていること）。cue から次の台詞まで */
  think?: { text: string; cue?: string; who?: "ずんだもん" | "つむぎ" };
  /** はんこ（11/27〜）: cue で赤い丸はんこが斜めに押される（結論・逆転） */
  stamp?: { text: string; cue?: string; /** 置き場所（カードの幅・高さに対する割合・左上）と大きさ px。なければ右上・250 */ x?: number; y?: number; size?: number; /** circle（丸・既定）・square（角はんこ）・ribbon（赤い札） */ style?: "circle" | "square" | "ribbon" };
};

/** 線グラフが左から描かれる（11/27〜）。points は [日付の札, 値]。draw の cue で描き始める。callout は描き終わりに出す札 */
export type TrendScene = {
  type: "trend";
  heading: string;
  unit: string;
  series: { label: string; points: [string, number][]; color?: string }[];
  draw?: string;
  callout?: { text: string };
  note?: string;
};

/** 分かれ道（11/27〜）: 問いの箱から、cue で答えへ矢印が伸びる */
export type FlowScene = {
  type: "flow";
  heading: string;
  q: string;
  branches: { label: string; answer: string; sub?: string; cue?: string; pick?: boolean }[];
  /** 次の答えが出ても前の答えを薄くしない（既定は今の答えだけ明るく） */
  keepAll?: boolean;
  note?: string;
};

/** 困りごとのカード（11/27〜・タコの冒頭の型）: 人の絵と名札＋困りごとが cue で1つずつ */
export type ProblemsScene = {
  type: "problems";
  heading: string;
  who: string;
  img?: string;
  items: { text: string; cue?: string }[];
  note?: string;
};

/** 積み上げの総額（11/27〜・タコの「2年でいくら？」）。minus は斜線（下取り・売って戻る分）。diff は2本の差の点線と札 */
export type CostsScene = {
  type: "costs";
  heading: string;
  unit: string;
  items: { label: string; parts: { label: string; value: number; minus?: boolean; color?: string }[]; cue?: string; pick?: boolean }[];
  diff?: { from: number; to: number; label: string; cue?: string };
  /** rows（横棒・既定 11/27〜）・stack（前の積み上げ）・net（縦棒＝払う額）・cards（カード＋内訳） */
  style?: "stack" | "net" | "rows" | "cards";
  legend?: { label: string; color: string; minus?: boolean }[];
  note?: string;
};

/** 年表（11/27〜）: 行ごとに from 年からの帯。sweep の cue で「今日」の線が start から today へ進み、各行に「◯年目」 */
export type YearsScene = {
  type: "years";
  heading: string;
  start: number;
  end: number;
  today: number;
  todayLabel?: string;
  rows: { label: string; from: number; to?: number; cue?: string; pick?: boolean }[];
  sweep?: string;
  note?: string;
};

/** 2択のカード（11/27〜）: 左右に1枚ずつ、cue で出る。win の cue で勝った方に札 */
export type VersusScene = {
  type: "versus";
  heading: string;
  left: { title: string; value: string; sub?: string; cue?: string; /** ない機能: 言葉の上に赤い ✕（cue で出る・11/27〜） */ crosses?: { text: string; cue?: string }[] };
  right: { title: string; value: string; sub?: string; cue?: string; crosses?: { text: string; cue?: string }[] };
  win?: { side: "left" | "right"; label: string; cue?: string };
  note?: string;
};

/** 並べる（11/27〜）: cue で1枚ずつ、まず真ん中に大きく出て、次の1枚が出たら自分の場所へ */
export type LineupScene = {
  type: "lineup";
  heading: string;
  items: { title: string; value: string; sub?: string; src?: string; cue?: string; pick?: boolean; tag?: string }[];
  /** tab（頭に帯・既定 11/27〜）・plain（前のカード）・steps（階段）・rows（横長の行） */
  style?: "plain" | "tab" | "steps" | "rows";
  note?: string;
};
export type SceneData = (BigNumberScene | BarsScene | PairsScene | TableScene | ChecklistScene | PhotoScene | EndScreenScene | GaugesScene | ScreenScene | VersusScene | LineupScene | TrendScene | FlowScene | ProblemsScene | CostsScene | YearsScene) & SceneExtras;

export type LongData = {
  date: string;
  shops: number;
  source?: string;
  /** サムネの文字（なければ 1本目の「予算別の正解 5万円→iPhone 13」）。badge は白い札の中の文字（red で赤い大きな数字） */
  thumbnail?: ThumbnailData;
  chapters: { title: string; scene: SceneData }[];
};

export type ThumbnailData = { lines: string[]; badge: { text: string; red?: boolean }[]; footer: string };

/** 時間割の字幕の1ページ（2行まで） */
export type SubPage = { text: string; start: number; end: number };

export type TimelineLine = {
  who: Who;
  text: string;
  /** 動画の頭からの秒 */
  start: number;
  end: number;
  /** 声のキャッシュ（shorts/out/voice-cache）。なければ null（長さは文字数からの見積もり） */
  audio: string | null;
  estimated: boolean;
  /** 辞書（shorts/voice-dict.json）が変わる前の声。長さの目安には使えるが、書き出す前に voice-draft.ts で合成し直す */
  stale: boolean;
  pages: SubPage[];
};

export type TimelineChapter = {
  index: number;
  title: string;
  start: number;
  end: number;
  /** 台本の【画面】（参考。実際に映すのは scene） */
  cues: string[];
  /** data.json の scene。各項目の cue は revealAt（章の頭からの秒）に直してある */
  /** pulse: 揺らす項目（キー → 出てから何コマ目か。frameAt が animAt から入れる） */
  /** mention: 台詞が項目に触れた秒（震わせる）。shake: 震えている項目（frameAt が入れる） */
  scene: SceneData & { reveal: Record<string, number>; pulse?: Record<string, number>; mention?: Record<string, number[]>; marks?: Record<string, [number, number][]>; shake?: Record<string, number>; grow?: Record<string, number> };
  lines: TimelineLine[];
  /** 見本の静止画に使う秒（動画の頭から） */
  stillAt: number;
};

export type Timeline = {
  date: string;
  shops: number;
  width: number;
  height: number;
  fps: number;
  speed: number;
  total: number;
  chapters: TimelineChapter[];
};
