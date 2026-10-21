/** 台本 JSON（script.json）の型。テーマ（drops・budget）ごとに場面のデータは違うが、comment・outro・youtube・声の設定は共通 */
export type RankItem = { model: string; storage: string; before: number; after: number; drop: number; rate: number };
export type TrendPoint = { date: string; median: number };

/**
 * VOICEVOX の話者と調声。speaker は ID（既定 3＝ずんだもん ノーマル）か名前（"ずんだもん"・"ずんだもん/ノーマル"・"春日部つむぎ/ノーマル"）。
 * speedScale 既定 1.25。intonationScale（抑揚）・pitchScale（音高）・pauseLengthScale（読点の間の倍率）はエンジンの既定（1・0・1）
 */
export type VoiceConfig = { speaker?: number | string; speedScale?: number; volume?: number; intonationScale?: number; pitchScale?: number; pauseLengthScale?: number };

export type NarrationKey = "hook" | "ranking" | "reveal" | "trend" | "comment" | "outro";

type Common = {
  /** 作成日（JST） */
  date: string;
  shopCount: number;
  youtube: { title: string; description: string; hashtags: string[] };
  /** ナレーション（任意）。場面ごとの読み上げ文。書かない場面は既定の文（shorts/voice.ts の defaultNarration）、空文字は声なし */
  narration?: Partial<Record<NarrationKey, string>>;
  /** 場面ごとの読みの手直し（任意・AquesTalk 風記法。例 "イチイ'ワ、アイフォ'ン/ジュウナ'ナ"）。書いた場面は文の自動の読みより優先（shorts/voiceTuning.ts） */
  narrationKana?: Partial<Record<NarrationKey, string>>;
  /** VOICEVOX の設定（任意）。なければ ずんだもん・速さ 1.25 */
  voice?: VoiceConfig;
};
/** 検品担当のひと言。人が書き換える（1行16字以内・3行まで） */
type CommentScene = { speaker: string; lines: string[] };
/** question: 締めの最後の問い（なければ「来週の1位は…？」） */
type OutroScene = { lines: string[]; url: string; note: string; question?: string };

/** テーマ drops「今週いちばん値下がりした中古iPhone」 */
export type DropsScript = Common & {
  theme: "drops";
  /** 比べた期間（記録日） */
  fromDate: string;
  toDate: string;
  scenes: {
    hook: { label: string; model: string; storage: string; drop: number; before: number; after: number };
    ranking: { title: string; items: RankItem[] };
    trend: { model: string; storage: string; days: number; points: TrendPoint[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

/** 予算の1行: 相場（在庫がいちばん多い容量の中央値）が予算に収まる、いちばん新しい機種 */
export type BudgetRow = { budget: number; label: string; model: string; storage: string; median: number; released: string };

/** テーマ budget「○万円で買える中古iPhone、いちばん新しいのは？」 */
export type BudgetScript = Common & {
  theme: "budget";
  scenes: {
    /** 場面 ranking: 予算の行（予算の小さい順） */
    budgets: { rows: BudgetRow[] };
    /** 場面 reveal: 注目の1機種（rows のうち pickBudget の行）。最安と在庫数はジャンク品を除く（予算別ページと同じ条件） */
    pick: BudgetRow & { minPrice: number; count: number };
    comment: CommentScene;
    outro: OutroScene;
  };
};

export type Script = DropsScript | BudgetScript;
