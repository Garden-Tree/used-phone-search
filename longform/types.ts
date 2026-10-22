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
  unit: "万円" | "円";
  rows: { label: string; sub?: string; median: number; min?: number; minLabel?: string; stock?: string; pick?: boolean; cue?: string; minCue?: string }[];
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
  rows: { cells: string[]; cue?: string }[];
  note?: string;
};

/** 1つずつ出すチェックリスト */
export type ChecklistScene = {
  type: "checklist";
  heading: string;
  items: { text: string; sub?: string; cue?: string }[];
  note?: string;
};

export type SceneData = BigNumberScene | BarsScene | PairsScene | TableScene | ChecklistScene;

export type LongData = {
  date: string;
  shops: number;
  source?: string;
  chapters: { title: string; scene: SceneData }[];
};

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
  scene: SceneData & { reveal: Record<string, number> };
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
