/** 台本 JSON（script.json）の型。テーマ（drops・budget・pixelbudget・ipadbudget・newused・provs・fold・rank・battery・gen・storage）ごとに場面のデータは違うが、comment・outro・youtube・声の設定は共通 */
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

/**
 * 予算の1行: 相場（在庫がいちばん多い容量の中央値）が予算の帯に入る機種のうち、相場がいちばん高い機種（shorts/themes/budget.ts）。
 * updateUntil: Pixel のアップデート保証の終わり（"2027-07"。lib/pixelCatalog.ts の updateUntil。pixelbudget だけ）
 * pencil: その iPad で使える Apple Pencil（新しい順・"USB-C／第1世代"。lib/ipadPencil.ts。ipadbudget だけ）
 */
export type BudgetRow = { budget: number; label: string; model: string; storage: string; median: number; released: string; updateUntil?: string; pencil?: string };

/** テーマ budget「予算ぴったりで買える中古iPhoneは？」・pixelbudget「…中古Pixelは？」・ipadbudget「…中古iPadは？」（同じ場面・同じ選び方） */
export type BudgetScript = Common & {
  theme: "budget" | "pixelbudget" | "ipadbudget";
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

/**
 * provs の1行: 同じ世代の無印と Pro を、同じ容量の中古の相場（中央値）で比べる（shorts/themes/provs.ts）。
 * diff = Pro の相場 − 無印の相場、pct = diff / 無印の相場（%・小数1桁）
 */
export type ProVsRow = {
  base: string; pro: string; storage: string; storageGb: number;
  baseMedian: number; proMedian: number; baseCount: number; proCount: number; diff: number; pct: number;
};
/** 1位の無印を1つ上の容量にしたときの相場の差（同じ中央値の決め方。在庫が足りなければ台本に入れない） */
export type ProVsUpgrade = { model: string; from: string; to: string; fromMedian: number; toMedian: number; diff: number };

/** テーマ provs「Proと無印、同じ容量でいくら違う？」 */
export type ProVsScript = Common & {
  theme: "provs";
  scenes: {
    /** 場面 ranking（3位・2位・伏せた1位）と reveal（1位）。差額の大きい順（items[0] が1位） */
    ranking: { items: ProVsRow[] };
    upgrade?: ProVsUpgrade;
    comment: CommentScene;
    outro: OutroScene;
  };
};

/**
 * fold の1行: 折りたたみスマホの連続する2世代（新しい方 → 1世代前）を、同じ容量の中古の相場（中央値）で比べる（shorts/themes/fold.ts）。
 * diff = 新しい方の相場 − 1世代前の相場、pct = diff / 新しい方の相場（%・小数1桁）
 */
export type FoldRow = {
  newer: string; older: string; storage: string; storageGb: number;
  newerMedian: number; olderMedian: number; newerCount: number; olderCount: number; diff: number; pct: number;
};

/** テーマ fold「折りたたみスマホ、1世代前にするといくら安い？」 */
export type FoldScript = Common & {
  theme: "fold";
  scenes: {
    /** 場面 ranking（3位・2位・伏せた1位）と reveal（1位）。差額の大きい順（items[0] が1位） */
    ranking: { items: FoldRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

/**
 * rank の1行: 1機種の在庫がいちばん多い容量で、状態ランク A・B・C（各店の表記。S＝未使用品・D・ジャンク・不明は除く）ごとの中古の相場（中央値）（shorts/themes/rank.ts）。
 * diff = ランクA の相場 − ランクC の相場、pct = diff / ランクA の相場（%・小数1桁）
 */
export type RankBucket = { rank: "A" | "B" | "C"; median: number; count: number };
export type RankRow = { model: string; storage: string; storageGb: number; buckets: RankBucket[]; diff: number; pct: number };

/** テーマ rank「状態ランクでいくら違う？中古iPhone」 */
export type RankScript = Common & {
  theme: "rank";
  scenes: {
    /** 場面 ranking（3位・2位・伏せた1位）と reveal（1位）。差額の大きい順（items[0] が1位） */
    ranking: { items: RankRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

/**
 * battery の1行: 1機種の在庫がいちばん多い容量で、電池（バッテリー最大容量）90%台（90〜99）と 80%台（81〜89）の中古の相場（中央値）（shorts/themes/battery.ts）。
 * diff = 90%台の相場 − 80%台の相場、pct = diff / 80%台の相場（%・小数1桁）
 */
export type BatteryRow = { model: string; storage: string; storageGb: number; hiMedian: number; loMedian: number; hiCount: number; loCount: number; diff: number; pct: number;
  /** Apple 公式の電池交換の料金（保証対象外・税込。lib/appleRepairPrices.ts。載っていない機種は無し） */
  repair?: number };

/** テーマ battery「電池90%台だと、中古iPhoneはいくら高い？」 */
export type BatteryScript = Common & {
  theme: "battery";
  scenes: {
    /** 場面 ranking（3位・2位・伏せた1位）と reveal（1位）。差額の大きい順（items[0] が1位） */
    ranking: { items: BatteryRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

/** テーマ gen「iPhone、1世代前にするといくら安い？」（行と場面は fold と同じ FoldRow。shorts/themes/gen.ts） */
export type GenScript = Common & {
  theme: "gen";
  scenes: {
    ranking: { items: FoldRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

/**
 * storage の1行: 1機種の、在庫5件以上でいちばん小さい容量（from）と次の容量（to）の中古の相場（中央値）（shorts/themes/storage.ts）。
 * diff = to の相場 − from の相場、pct = diff / from の相場（%・小数1桁）
 */
export type StorageRow = {
  model: string; from: string; to: string; fromGb: number; toGb: number;
  fromMedian: number; toMedian: number; fromCount: number; toCount: number; diff: number; pct: number;
};

/** テーマ storage「容量を1つ上げると、中古iPhoneはいくら高い？」（差の小さい順） */
export type StorageScript = Common & {
  theme: "storage";
  scenes: {
    ranking: { items: StorageRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

export type Script = DropsScript | BudgetScript | NewUsedScript | ProVsScript | FoldScript | RankScript | BatteryScript | GenScript | StorageScript;

/** budget・pixelbudget・ipadbudget（予算の4行・注目の1機種の場面を共有） */
export const isBudget = (s: Script): s is BudgetScript => s.theme === "budget" || s.theme === "pixelbudget" || s.theme === "ipadbudget";
