/** 台本 JSON（script.json）の型。テーマが増えても場面の形はそろえる */
export type RankItem = { model: string; storage: string; before: number; after: number; drop: number; rate: number };
export type TrendPoint = { date: string; median: number };

/**
 * VOICEVOX の話者と調声。speaker は ID（既定 3＝ずんだもん ノーマル）か名前（"ずんだもん"・"ずんだもん/ノーマル"）。
 * speedScale 既定 1.25。intonationScale（抑揚）・pitchScale（音高）・pauseLengthScale（読点の間の倍率）はエンジンの既定（1・0・1）
 */
export type VoiceConfig = { speaker?: number | string; speedScale?: number; volume?: number; intonationScale?: number; pitchScale?: number; pauseLengthScale?: number };

export type Script = {
  theme: string;
  /** 作成日（JST） */
  date: string;
  /** 比べた期間（記録日） */
  fromDate: string;
  toDate: string;
  shopCount: number;
  scenes: {
    hook: { label: string; model: string; storage: string; drop: number; before: number; after: number };
    ranking: { title: string; items: RankItem[] };
    trend: { model: string; storage: string; days: number; points: TrendPoint[] };
    /** 検品担当のひと言。人が書き換える（1行16字以内・3行まで） */
    comment: { speaker: string; lines: string[] };
    outro: { lines: string[]; url: string; note: string };
  };
  youtube: { title: string; description: string; hashtags: string[] };
  /** ナレーション（任意）。場面ごとの読み上げ文。書かない場面は既定の文（shorts/voice.ts の defaultNarration）、空文字は声なし */
  narration?: Partial<Record<"hook" | "ranking" | "reveal" | "trend" | "comment" | "outro", string>>;
  /** 場面ごとの読みの手直し（任意・AquesTalk 風記法。例 "イチイ'ワ、アイフォ'ン/ジュウナ'ナ"）。書いた場面は文の自動の読みより優先（shorts/voiceTuning.ts） */
  narrationKana?: Partial<Record<"hook" | "ranking" | "reveal" | "trend" | "comment" | "outro", string>>;
  /** VOICEVOX の設定（任意）。なければ ずんだもん・速さ 1.25 */
  voice?: VoiceConfig;
};
