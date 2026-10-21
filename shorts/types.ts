/** 台本 JSON（script.json）の型。テーマ（drops・budget・newused）ごとに場面のデータは違うが、comment・outro・youtube・声の設定は共通 */
export type RankItem = { model: string; storage: string; before: number; after: number; drop: number; rate: number };
export type TrendPoint = { date: string; median: number };

/**
 * VOICEVOX の話者と調声。speaker は ID か名前（既定 "春日部つむぎ/ノーマル"。ほかに "ずんだもん/ノーマル"・3 など）。
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
  /** VOICEVOX の設定（任意）。なければ 春日部つむぎ・速さ 1.25 */
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

/** 予算の1行: 相場（在庫がいちばん多い容量の中央値）が予算の帯に入る機種のうち、相場がいちばん高い機種（shorts/themes/budget.ts） */
export type BudgetRow = { budget: number; label: string; model: string; storage: string; median: number; released: string };

/** テーマ budget「予算ぴったりで買える中古iPhoneは？」 */
export type BudgetScript = Common & {
  theme: "budget";
  scenes: {
    /** 場面 ranking: 予算の行（予算の小さい順） */
    budgets: { rows: BudgetRow[] };
    /** 場面 reveal: 注目の1機種（rows のうち PICK_BUDGET の行）と在庫数（販売中の全在庫。相場と同じ母数）。最安は出さない */
    pick: BudgetRow & { count: number };
    comment: CommentScene;
    outro: OutroScene;
  };
};

/**
 * newused の1行: Apple 公式の新品価格と、中古の相場（公式価格のある容量のうち在庫がいちばん多い容量の中央値）の差（shorts/themes/newused.ts）。
 * diff = 新品 − 中古の相場、pct = diff / 新品（%・小数1桁）
 */
export type NewUsedRow = { model: string; storage: string; storageGb: number; released: string; newPrice: number; usedMedian: number; count: number; diff: number; pct: number };

/** テーマ newused「新品より中古でいくら安い？」 */
export type NewUsedScript = Common & {
  theme: "newused";
  /** 新品価格を Apple 公式で確かめた日（lib/applePrices.ts の APPLE_PRICES_CHECKED） */
  appleChecked: string;
  scenes: {
    /** 場面 ranking（3位・2位・伏せた1位）と reveal（1位）。差額の大きい順（items[0] が1位） */
    ranking: { items: NewUsedRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

export type Script = DropsScript | BudgetScript | NewUsedScript;
