/** 台本 JSON（script.json）の型。テーマ（drops・budget・pixelbudget・ipadbudget・macbudget・probudget・foldbudget・galaxybudget・bigbudget・newused・provs・promax・plusvs・plusmax・oldpro・minie・fold・rank・unused・battery・gen・storage・ios27line・batteryswap・overnew・rakutenmobile・ipadmini・watchgen・macgen・ipadgen・pixelgen・stock・stockandroid）ごとに場面のデータは違うが、comment・outro・youtube・声の設定は共通 */
export type RankItem = { model: string; storage: string; before: number; after: number; drop: number; rate: number };
export type TrendPoint = { date: string; median: number };

/**
 * VOICEVOX の話者と調声。speaker は ID か名前（既定 "春日部つむぎ/ノーマル"。ほかに "ずんだもん/ノーマル"・3 など）。
 * speedScale 既定 1.25。intonationScale（抑揚）・pitchScale（音高）・pauseLengthScale（読点の間の倍率）は 1・0・0.5（間は voice.ts の DEFAULT_PAUSE。10/24〜）
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
  /**
   * つかみの型（任意・10/26〜の実験）。"answer" は問いでなく1位の答え（機種と差額）から始める。
   * いまは minie だけが絵を切り替える。声は narration.hook に答えの文を書く
   */
  hookStyle?: "question" | "answer";
  /**
   * つかみの大きな文字（任意・10/27〜）。書けば問いの代わりにこの行を出す（SplitHook・BudgetHook のテーマ。minie の自動の答えより優先）。
   * 答えから始める回は hookStyle "answer"・hookLines・narration.hook をそろえて書く（SplitHook の札は「最大」→「1位」）
   */
  hookLines?: string[];
  /** TikTok 用の書き出し（render --tiktok・voice.ts の forTikTok が付ける。script.json には書かない）。締めに関連動画・プロフィールのリンクを出さない */
  tiktok?: boolean;
};
/** 検品担当のひと言。人が書き換える（1行16字以内・3行まで） */
type CommentScene = { speaker: string; lines: string[] };
/** question: 締めの最後の問い（なければ「来週の1位は…？」）/ urlTail: URL の下の文（TikTok の「で検索」） */
type OutroScene = { lines: string[]; url: string; note: string; question?: string; urlTail?: string };

/** drops の比べる期間の言い方。なければ1週間（10/24〜 約1か月も。make-short の plan --days） */
export type DropsPeriod = { days: number; lead: string; name: string; span: string; ago: string; next: string };
export const WEEK_PERIOD: DropsPeriod = { days: 7, lead: "今週", name: "今週", span: "1週間で", ago: "1週間前", next: "来週" };
export const MONTH_PERIOD = (days: number): DropsPeriod => ({ days, lead: "この1か月で", name: "この1か月", span: "約1か月で", ago: "約1か月前", next: "来月" });
export const periodOf = (s: DropsScript): DropsPeriod => s.period ?? WEEK_PERIOD;

/** テーマ drops「今週いちばん値下がりした中古iPhone」 */
export type DropsScript = Common & {
  theme: "drops";
  /** 比べた期間（記録日） */
  fromDate: string;
  toDate: string;
  period?: DropsPeriod;
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
 * chip: その MacBook のチップ（"M2"・"M1 Pro"・"A18 Pro"。lib/macCatalog.ts の MAC_INFO。macbudget だけ）
 * spec: 画面の大きさと端子（"6.1インチ・Lightning"。lib/iphoneSpecs.ts・Apple 公式。probudget）。foldbudget は型と開いたときの画面（"Fold型・開いて7.6インチ"。lib/galaxySpecs.ts・lib/pixelSpecs.ts）
 */
export type BudgetRow = { budget: number; label: string; model: string; storage: string; median: number; released: string; updateUntil?: string; pencil?: string; chip?: string; spec?: string };

/** テーマ budget「予算ぴったりで買える中古iPhoneは？」・pixelbudget「…中古Pixelは？」・ipadbudget「…中古iPadは？」（同じ場面・同じ選び方） */
export type BudgetScript = Common & {
  theme: "budget" | "pixelbudget" | "ipadbudget" | "macbudget" | "probudget" | "foldbudget" | "galaxybudget" | "bigbudget";
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

/** テーマ provs「Proと無印、同じ容量でいくら違う？」・promax「Pro MaxとPro、同じ容量でいくら違う？」（base＝Pro・pro＝Pro Max。shorts/themes/promax.ts）・plusvs「Plusと無印、同じ容量でいくら違う？」（base＝無印・pro＝Plus。shorts/themes/plusvs.ts）・plusmax「大画面はPlusとPro Max、同じ容量でいくら違う？」（base＝Plus・pro＝Pro Max。shorts/themes/plusmax.ts） */
export type ProVsScript = Common & {
  theme: "provs" | "promax" | "plusvs" | "plusmax";
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
  /** 1世代前の容量（watchgen だけ・新しい方とケースの大きさが違うとき。storage は新しい方の大きさ）。ケースは機種ごとに在庫がいちばん多いサイズ */
  olderStorage?: string; olderStorageGb?: number;
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
 * テーマ watchgen「Apple Watch、1世代前にするといくら安い？」・macgen「MacBook Air、1世代前にするといくら安い？」（10/27〜。行と場面は fold・gen と同じ FoldRow。
 * shorts/themes/watchgen.ts・macgen.ts）。watchgen は機種ごとに在庫がいちばん多いケースの大きさで比べる（Series は世代で 45mm→46mm と変わるため。olderStorage）。
 * macgen は両方に在庫5件以上ある SSD の容量のうちいちばん小さい容量
 */
type DeviceGenScenes = {
  ranking: { items: FoldRow[] };
  comment: CommentScene;
  outro: OutroScene;
};
export type WatchGenScript = Common & { theme: "watchgen"; scenes: DeviceGenScenes };
export type MacGenScript = Common & { theme: "macgen"; scenes: DeviceGenScenes };
/** ipadgen「iPad、1世代前にするといくら安い？」・pixelgen「Pixel、1世代前にするといくら安い？」（10/27〜。shorts/themes/ipadgen.ts・pixelgen.ts。容量は macgen と同じ選び方） */
export type IpadGenScript = Common & { theme: "ipadgen"; scenes: DeviceGenScenes };
export type PixelGenScript = Common & { theme: "pixelgen"; scenes: DeviceGenScenes };
export type DeviceGenScript = WatchGenScript | MacGenScript | IpadGenScript | PixelGenScript;

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

/**
 * ios27line の1行: iOS 27 対応の iPhone（lib/catalog.ts の IPHONE_CATALOG・Apple 公式）の相場（在庫がいちばん多い容量の中央値）（shorts/themes/ios27line.ts）
 */
export type Ios27Row = { model: string; storage: string; storageGb: number; median: number; count: number; released: string };
/** 1位と同じ容量で比べた、iOS 27 非対応（LEGACY_SERIES）でいちばん安い機種。diff = 1位の相場 − この機種の相場（負なら1位の方が安い） */
export type Ios27Legacy = { model: string; storage: string; median: number; count: number; diff: number };

/** テーマ ios27line「iOS 27 に対応する、いちばん安い中古iPhoneは？」（相場の安い順。items[0] が1位＝いちばん安い） */
export type Ios27Script = Common & {
  theme: "ios27line";
  scenes: {
    ranking: { items: Ios27Row[] };
    /** 同じ容量で在庫5件以上の非対応機種がなければ無し */
    legacy?: Ios27Legacy;
    comment: CommentScene;
    outro: OutroScene;
  };
};

/**
 * batteryswap の1行: 古い方（older）の相場＋Apple 公式の電池交換の料金（battery）＝ total と、1つ上の世代（newer）の同じ容量の相場（shorts/themes/batteryswap.ts）。
 * gap = newer の相場 − total（正なら「古い方＋電池交換」の方が安い、負なら1つ上の世代の方が安い）
 */
export type BatterySwapRow = {
  older: string; newer: string; storage: string; storageGb: number;
  olderMedian: number; battery: number; total: number; newerMedian: number; olderCount: number; newerCount: number; gap: number;
};

/** テーマ batteryswap「電池交換を足すと、1つ上の世代と同じ値段？」（差の小さい順。items[0] が1位） */
export type BatterySwapScript = Common & {
  theme: "batteryswap";
  scenes: {
    ranking: { items: BatterySwapRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

/** overnew の1行: newused と同じ行に、中古の相場 ÷ 新品（ratio・%・小数1桁）。diff = 新品 − 中古の相場（負なら中古の方が高い） */
export type OverNewRow = NewUsedRow & { ratio: number };

/** テーマ overnew「中古なのに新品より高い？ 新品との差がいちばん小さい中古iPhone」（ratio の高い順。items[0] が1位） */
export type OverNewScript = Common & {
  theme: "overnew";
  appleChecked: string;
  scenes: {
    ranking: { items: OverNewRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

/** テーマ minie「無印より安い“弟分”、いくら安い？」（行と場面は fold・gen と同じ FoldRow。newer＝無印・older＝弟分（mini・e）。diff＝無印 − 弟分・pct は無印に対して。shorts/themes/minie.ts） */
export type MinieScript = Common & {
  theme: "minie";
  scenes: {
    ranking: { items: FoldRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

/**
 * unused の1行: 1機種の在庫がいちばん多い容量で、状態ランク S（未使用品）と A（各店の表記）の中古の相場（中央値）（shorts/themes/unused.ts）。
 * diff = ランクS の相場 − ランクA の相場、pct = diff / ランクA の相場（%・小数1桁）
 */
export type UnusedRow = { model: string; storage: string; storageGb: number; sMedian: number; aMedian: number; sCount: number; aCount: number; diff: number; pct: number };

/** テーマ unused「未使用品（ランクS）は、中古（ランクA）よりいくら高い？」 */
export type UnusedScript = Common & {
  theme: "unused";
  scenes: {
    ranking: { items: UnusedRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

/**
 * oldpro の1行: 1世代前の Pro（older）と次の世代の無印（newer）を、同じ容量の中古の相場（中央値）で比べる（shorts/themes/oldpro.ts）。
 * diff = 無印の相場 − Pro の相場（向きつき。正なら Pro の方が安い）、pct = |diff| / 高い方の相場（%・小数1桁）
 */
export type OldProRow = {
  older: string; newer: string; storage: string; storageGb: number;
  olderMedian: number; newerMedian: number; olderCount: number; newerCount: number; diff: number; pct: number;
};

/** テーマ oldpro「1世代前のProと最新の無印、どっちが安い？」（差の大きさの大きい順） */
export type OldProScript = Common & {
  theme: "oldpro";
  scenes: {
    ranking: { items: OldProRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

/**
 * rakutenmobile の料金の1段: Rakuten最強プランの段（"3GBまで"・"20GBまで"・"無制限"）と月額（税込・割引なし）、
 * twoYears = 月額 × 24、total = 端末の相場 + twoYears（24か月ずっと同じ段の場合。shorts/themes/rakutenmobile.ts）
 */
export type SimTier = { label: string; monthly: number; twoYears: number; total: number };

/**
 * テーマ rakutenmobile「楽天モバイルの料金は使った量で3段階｜中古iPhone 14と2年でいくら？」（広告の回・楽天アフィリエイト。10/26〜）。
 * 画面の左上に「PR」をずっと出し、最初の声で PR を言う（scenes.tsx の PrMark・voice.ts）
 */
export type RakutenMobileScript = Common & {
  theme: "rakutenmobile";
  /** 料金を公式で確かめた日（lib/simPlans.ts の SIM_PRICES_CHECKED） */
  pricesChecked: string;
  scenes: {
    /** 場面 ranking: 料金の3段（安い順。声に合わせて上から出す） */
    tiers: { plan: string; months: number; rows: SimTier[] };
    /** 場面 reveal: 中古の端末（128GB・ジャンクを除く中央値）と、各段の2年の合計 */
    device: { model: string; storage: string; storageGb: number; median: number; count: number };
    /** いちばん上の段の2年 − いちばん下の段の2年 */
    diff: number;
    comment: CommentScene;
    outro: OutroScene;
  };
};

/**
 * ipadmini の1行: 中古の旧型 iPad mini の相場（在庫がいちばん多い容量の中央値・サイトと同じ）と、新型 iPad mini (A20 Pro) の Apple 公式の価格（Wi-Fi）の差（shorts/themes/ipadmini.ts）。
 * newStorageGb: 比べた新型の容量（同じ容量の公式価格があればその容量、なければ 128GB＝最安の始まり）。diff = 新型 − 中古の相場、pct = diff / 新型（%・小数1桁）
 * short: 機種名の括弧の中（「第5世代」「A17 Pro」。行の声の頭）・year: 発売年（行の札）
 */
export type IpadMiniRow = { model: string; short: string; year: string; storage: string; storageGb: number; median: number; count: number; newStorageGb: number; newPrice: number; diff: number; pct: number };

/** テーマ ipadmini「新型iPad mini、中古の旧型ならいくら安い？」（10/27〜・新型の発表に合わせた回。items は発売の新しい順で items[0]＝A17 Pro を最後まで伏せる） */
export type IpadMiniScript = Common & {
  theme: "ipadmini";
  /** 新型の価格・仕様を Apple 公式で確かめた日（lib/ipadMiniA20.ts の IPAD_MINI_A20_CHECKED） */
  appleChecked: string;
  scenes: {
    /** 新型（lib/ipadMiniA20.ts）。price は 128GB（最安の始まり） */
    newModel: { name: string; release: string; price: number };
    /** 場面 ranking（旧型3機種・発売の新しい順。items[0] は伏せて reveal へ） */
    ranking: { items: IpadMiniRow[] };
    /** 場面 reveal: 新型と items[0]（A17 Pro）の公式の仕様の違い（lib/ipadMiniA20.ts の IPAD_MINI_COMPARE から） */
    compare: { label: string; a20: string; a17: string }[];
    comment: CommentScene;
    outro: OutroScene;
  };
};

/**
 * stock・stockandroid の1行: 機種ごとの販売中の在庫（ジャンク品を除く）の件数と、範囲の合計に対する割合（share・%・小数1桁）、
 * 相場（在庫がいちばん多い容量 storage の中央値 median。機種ページ・getModelMarket と同じ）。storageCount はその容量の在庫数（ジャンク品も含む・相場の母数）
 */
export type StockRow = { model: string; count: number; share: number; storage: string; storageGb: number; median: number; storageCount: number };

/** テーマ stock「中古でいちばん出回っているiPhoneは？在庫数ランキング」・stockandroid（同じ Android 版。Pixel・Galaxy・Xperia・AQUOS）（10/27〜。shorts/themes/stock.ts） */
export type StockScript = Common & {
  theme: "stock" | "stockandroid";
  scenes: {
    /** 範囲の全機種の件数の合計（割合の分母）と機種の数 */
    total: number;
    modelCount: number;
    /** 場面 ranking（3位・2位・伏せた1位）と reveal（1位）。件数の多い順（items[0] が1位） */
    ranking: { items: StockRow[] };
    comment: CommentScene;
    outro: OutroScene;
  };
};

export type Script = DropsScript | BudgetScript | NewUsedScript | ProVsScript | FoldScript | RankScript | BatteryScript | GenScript | StorageScript | Ios27Script | BatterySwapScript | OverNewScript | MinieScript | UnusedScript | OldProScript | RakutenMobileScript | IpadMiniScript | DeviceGenScript | StockScript;

/**
 * 関連動画（横動画）につながるテーマ。締めの最後に「くわしい解説は、下の関連動画から」を声と画面で出す（10/23〜。
 * YouTube 公式ブログ 2026/7「最後の5秒で声と画面の両方で誘導」）。いまの横動画は iPhone なので、Pixel・iPad・折りたたみは外す。
 * rakutenmobile は横動画11本目（longform/2026-10-31-rakuten-mobile・10/27 18:00 公開）につなぐ
 */
export const RELATED_LONG_THEMES = new Set<Script["theme"]>(["drops", "budget", "probudget", "bigbudget", "newused", "provs", "promax", "plusvs", "plusmax", "oldpro", "minie", "rank", "unused", "battery", "gen", "storage", "ios27line", "batteryswap", "overnew", "stock", "rakutenmobile"]);
export const RELATED_LONG_LINE = "くわしい解説は 下の関連動画で";
/** 締めに関連動画の誘導を出すか。TikTok（--tiktok）には関連動画がないので出さない */
export const hasRelatedLong = (s: Script) => !s.tiktok && RELATED_LONG_THEMES.has(s.theme);

/** budget・pixelbudget・ipadbudget・macbudget・probudget・foldbudget・galaxybudget・bigbudget（予算の4行・注目の1機種の場面を共有） */
export const isBudget = (s: Script): s is BudgetScript => s.theme === "budget" || s.theme === "pixelbudget" || s.theme === "ipadbudget" || s.theme === "macbudget" || s.theme === "probudget" || s.theme === "foldbudget" || s.theme === "galaxybudget" || s.theme === "bigbudget";
/** provs・promax・plusvs・plusmax（2機種の差のランキング・場面を共有） */
export const isProVs = (s: Script): s is ProVsScript => s.theme === "provs" || s.theme === "promax" || s.theme === "plusvs" || s.theme === "plusmax";
/** stock・stockandroid（在庫数ランキング・場面を共有） */
export const isStock = (s: Script): s is StockScript => s.theme === "stock" || s.theme === "stockandroid";
