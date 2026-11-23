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
  rows: { label: string; sub?: string; median: number; min?: number; minLabel?: string; stock?: string; pick?: boolean; /** 札の文字（なければ「おすすめ」） */ pickLabel?: string; cue?: string; minCue?: string }[];
  note?: string;
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
  items: { text: string; sub?: string; cue?: string }[];
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
  points?: { text: string; sub?: string; cue?: string }[];
  /** 差し替える画像（cue の台詞が始まったら次の画像に替わる。最初は src）。credit はそれぞれ */
  images?: { src: string; credit: string; cue: string }[];
  note?: string;
};

export type SceneData = BigNumberScene | BarsScene | PairsScene | TableScene | ChecklistScene | PhotoScene | EndScreenScene;

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
  scene: SceneData & { reveal: Record<string, number>; pulse?: Record<string, number>; mention?: Record<string, number[]>; shake?: Record<string, number> };
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
