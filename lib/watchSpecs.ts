/**
 * Apple Watch の健康機能・便利機能の対応表（機種ページ・比較ページの「機能の違い」用）。キーは `lib/watchCatalog.ts` の機種名。
 * 2026-11-11 に Apple 公式（apple.com/jp・support.apple.com/ja-jp）だけで確かめた。推測では埋めない:
 *   - 公式で確かめられない値は null にして、理由をその行のコメントに書く
 *   - false は「公式の比較ページで ×（該当なし）」か「技術仕様に載っておらず、比較ページでも × 」のとき
 *
 * 出典の優先順:
 *   1. 比較ページ WATCH_SOURCES.compare（Series 1〜12・Ultra 全世代・SE 全世代が同じ表に並ぶ。HTML の表を機種の列ごとに読んだ）
 *   2. 各機種の技術仕様（support.apple.com/ja-jp/<specId>）
 *   3. 機能ごとのサポート記事・ニュースルーム（対応機種・必要な watchOS・日本での提供）
 *   4. 日本で使えるか … watchOS の機能の提供状況 WATCH_SOURCES.featureAvailability（watchOS 27 版）
 *
 * 機種を足すときは、比較ページの列と技術仕様で確かめてから足す。毎月1日に見直す（STATE.md の「公式で確かめた値だけ」）。
 */

export const WATCH_SPECS_CHECKED = "2026-11-11";

/** 項目ごとの出典 URL（すべて Apple 公式・日本語ページ） */
export const WATCH_SOURCES = {
  /** 比較ページ（チップ・輝度・常時表示・健康機能・ジェスチャー・UWB・高速充電・耐水／防塵・バッテリー） */
  compare: "https://www.apple.com/jp/watch/compare/",
  /** watchOS 27 で利用できる機能（国・地域ごと。日本で使えるか） */
  featureAvailability: "https://www.apple.com/jp/watchos/feature-availability/",
  /** 高血圧パターンの通知（対応機種・Series 12 / Ultra 4 は地域によって追加承認の申請中） */
  hypertension: "https://support.apple.com/ja-jp/117296",
  /** 高血圧パターンの通知が日本で利用可能に（2025-12-04） */
  hypertensionJapan: "https://www.apple.com/jp/newsroom/2025/12/hypertension-notifications-available-today-on-apple-watch/",
  /** 睡眠時無呼吸の通知（Series 9 以降・Ultra 2 以降・SE 3） */
  sleepApnea: "https://support.apple.com/ja-jp/120031",
  /** watchOS 11 のアップデート（睡眠時無呼吸の通知が Series 9・Ultra 2 で使えるように） */
  watchOS11: "https://support.apple.com/ja-jp/121163",
  /** 血中酸素ウェルネスアプリ（Series 6 以降と Ultra 全モデル。SE は非対応） */
  bloodOxygen: "https://support.apple.com/ja-jp/120358",
  /** 超広帯域無線の対応状況（第1／第2世代の機種・日本では Apple Watch での「正確な場所を見つける」が使えない） */
  uwb: "https://support.apple.com/ja-jp/109512",
  /** タップジェスチャ（Series 9 以降・Ultra 2 以降・SE 3） */
  tapGesture: "https://support.apple.com/ja-jp/108413",
  /** watchOS 10.1 でダブルタップ（Series 9・Ultra 2） */
  doubleTapWatchOS101: "https://www.apple.com/jp/newsroom/2023/10/apple-watch-double-tap-gesture-now-available-with-watchos-10-1/",
  /** watchOS 26 のアップデート（手首フリック＝Series 9 以降・Ultra 2 以降、睡眠スコア） */
  watchOS26: "https://support.apple.com/ja-jp/123002",
  /** 睡眠スコアの対応機種（watchOS 26 の Series 6 以降・SE（第2世代）以降・Ultra 全モデル） */
  sleepScore: "https://www.apple.com/jp/newsroom/2025/09/apple-introduces-apple-watch-series-11/",
  /** SE 3 の「デバイス上の Siri」（S10 チップ） */
  se3Siri: "https://www.apple.com/jp/newsroom/2025/09/apple-introduces-apple-watch-se-3/",
} as const;

/** 技術仕様ページ */
export const watchSpecUrl = (specId: string) => `https://support.apple.com/ja-jp/${specId}`;

/** 日本での提供状況（機能単位。WATCH_SOURCES.featureAvailability の「日本」の行・脚注） */
export const WATCH_JAPAN_NOTES = {
  ecg: "日本で利用できる（管理医療機器。22歳以上）",
  bloodOxygen: "日本で利用できる（ウェルネス目的）。2024-01-18 以降に米国で買われた部品番号末尾 LW/A・LS/A の機種は測定値を iPhone で計算する方式（WATCH_SOURCES.bloodOxygen）",
  irregularRhythm: "日本で利用できる（22歳未満は対象外）",
  ovulation: "過去の排卵の推定は日本で利用できる（皮膚温センサーのある機種）",
  sleepApnea: "日本で利用できる（18歳以上）",
  hypertension: "日本では 2025-12-04 から（Series 9 以降・Ultra 2 以降）。Series 12・Ultra 4 は日本の行に「追加承認を申請中で利用できない場合がある」の脚注",
  uwb: "日本では規制で一部の周波数が使えず、Apple Watch での「正確な場所を見つける」（iPhone を探す）・「人を探す」は使えない。第2世代でも性能は前世代相当",
  satelliteSOS: "衛星経由の緊急SOS・「探す」・メッセージは日本で利用できる（Ultra 3・Ultra 4）",
  siriAI: "Siri AI は watchOS 27 でベータ。日本語に対応",
} as const;

/** 日本で提供されていない（または機種によって使えない）機能 */
export const WATCH_NOT_IN_JAPAN = [
  "Apple Watch での「正確な場所を見つける」（第2世代 UWB で iPhone を探す）と「人を探す」",
  "高血圧パターンの通知（Series 12・Ultra 4 のみ。追加承認の申請中）",
] as const;

export type WatchSpec = {
  /** 技術仕様ページの番号（support.apple.com/ja-jp/<specId>） */
  specId: string;
  /** チップ（比較ページ） */
  chip: string;
  /** 最大輝度（ニト。比較ページ） */
  maxNits: number;
  /** 常時表示ディスプレイ */
  alwaysOn: boolean;

  // ---- 健康 ----
  /** 心電図アプリ */
  ecg: boolean;
  /** 血中酸素ウェルネスアプリ */
  bloodOxygen: boolean;
  /** 皮膚温センサー（過去の排卵の推定・妊娠可能期間の推定・より高精度な月経の予測） */
  skinTemp: boolean;
  /** 睡眠時無呼吸の通知 */
  sleepApnea: boolean;
  /**
   * 高血圧パターンの通知。"申請中" は対応機種だが日本では追加承認の申請中（WATCH_JAPAN_NOTES.hypertension）。
   * null は公式で確かめられない
   */
  hypertension: boolean | "申請中" | null;
  /** 不規則な心拍リズムの通知 */
  irregularRhythm: boolean;
  /** 転倒検出 */
  fallDetection: boolean;
  /** 衝突事故検出 */
  crashDetection: boolean;
  /** 睡眠スコア */
  sleepScore: boolean;

  // ---- 便利 ----
  /** ダブルタップのジェスチャー */
  doubleTap: boolean;
  /** シングルタップのジェスチャー（比較ページで「シングルタップとダブルタップ」の機種） */
  singleTap: boolean;
  /** 手首フリックのジェスチャー */
  wristFlick: boolean;
  /** デバイス上で処理する Siri（技術仕様の「オンデバイス処理対応のSiri」など）。null は公式で確かめられない */
  onDeviceSiri: boolean | null;
  /** 超広帯域チップの世代（2＝第2世代・1＝第1世代〔Series 6/7 の U1 チップを含む〕・false＝なし） */
  uwb: 2 | 1 | false;
  /** 高速充電（0%→80% の時間。比較ページの表記）。false は非対応 */
  fastCharge: string | false;
  /** 耐水性能（ISO 22810:2010） */
  waterResistance: "50m" | "100m";
  /** IP6X の防塵性能。null は公式で確かめられない */
  dustIP6X: boolean | null;
  /** バッテリー駆動時間（通常使用・最大。時間） */
  batteryHours: number;
  /** 低電力モードの最大時間。null は時間の記載なし */
  lowPowerHours: number | null;

  /**
   * 発売後の watchOS で使えるようになった機能と、必要な watchOS（発売時の watchOS で使える機能は書かない）。
   * 値が null は「後から使えるようになったが、公式に版の記載がない（最新の watchOS が必要、とだけある）」
   */
  addedIn?: Partial<Record<"doubleTap" | "wristFlick" | "sleepApnea" | "sleepScore" | "hypertension", string | null>>;
};

/** 高血圧通知の必要な watchOS は公式に版がない（サポート記事 117296 は「最新バージョンのwatchOS」とだけ） */
const HTN_VER = null;

export const WATCH_SPECS: Record<string, WatchSpec> = {
  "Apple Watch Series 12": {
    specId: "148589", chip: "S11", maxNits: 2000, alwaysOn: true,
    ecg: true, bloodOxygen: true, skinTemp: true, sleepApnea: true,
    // 比較ページの高血圧の行が空欄・技術仕様にも記載なし。サポート記事 117296 と機能の提供状況（日本の脚注）に
    // 「Series 12・Ultra 4 は追加承認を申請中のため利用できない場合がある」
    hypertension: "申請中",
    irregularRhythm: true, fallDetection: true, crashDetection: true, sleepScore: true,
    doubleTap: true, singleTap: true, wristFlick: true,
    // 技術仕様は「Apple Intelligenceのパワーを活用するSiri」で、「オンデバイス処理」の記載がない（比較ページも「Siri AI」とだけ）
    onDeviceSiri: null,
    uwb: 2, fastCharge: "約30分", waterResistance: "50m", dustIP6X: true, batteryHours: 24, lowPowerHours: 38,
  },
  "Apple Watch Series 11": {
    specId: "125093", chip: "S10", maxNits: 2000, alwaysOn: true,
    ecg: true, bloodOxygen: true, skinTemp: true, sleepApnea: true, hypertension: true,
    irregularRhythm: true, fallDetection: true, crashDetection: true, sleepScore: true,
    doubleTap: true, singleTap: false, wristFlick: true, onDeviceSiri: true,
    uwb: 2, fastCharge: "約30分", waterResistance: "50m", dustIP6X: true, batteryHours: 24, lowPowerHours: 38,
    addedIn: { hypertension: HTN_VER },
  },
  "Apple Watch Series 10": {
    specId: "121202", chip: "S10", maxNits: 2000, alwaysOn: true,
    ecg: true, bloodOxygen: true, skinTemp: true, sleepApnea: true, hypertension: true,
    irregularRhythm: true, fallDetection: true, crashDetection: true, sleepScore: true,
    doubleTap: true, singleTap: false, wristFlick: true, onDeviceSiri: true,
    uwb: 2, fastCharge: "約30分", waterResistance: "50m", dustIP6X: true, batteryHours: 18, lowPowerHours: 36,
    addedIn: { wristFlick: "watchOS 26", sleepScore: "watchOS 26", hypertension: HTN_VER },
  },
  "Apple Watch Series 9": {
    // 技術仕様（111833）には血中酸素・睡眠時無呼吸の記載がないが、比較ページ・サポート記事 120358／120031 で対応
    specId: "111833", chip: "S9", maxNits: 2000, alwaysOn: true,
    ecg: true, bloodOxygen: true, skinTemp: true, sleepApnea: true, hypertension: true,
    irregularRhythm: true, fallDetection: true, crashDetection: true, sleepScore: true,
    doubleTap: true, singleTap: false, wristFlick: true, onDeviceSiri: true,
    uwb: 2, fastCharge: "約45分", waterResistance: "50m", dustIP6X: true, batteryHours: 18, lowPowerHours: 36,
    addedIn: { doubleTap: "watchOS 10.1", sleepApnea: "watchOS 11", wristFlick: "watchOS 26", sleepScore: "watchOS 26", hypertension: HTN_VER },
  },
  "Apple Watch Series 8": {
    specId: "111848", chip: "S8", maxNits: 1000, alwaysOn: true,
    ecg: true, bloodOxygen: true, skinTemp: true, sleepApnea: false, hypertension: false,
    irregularRhythm: true, fallDetection: true, crashDetection: true, sleepScore: true,
    doubleTap: false, singleTap: false, wristFlick: false, onDeviceSiri: false,
    // 低電力モードは比較ページに「低電力モード」とだけあり、時間の記載なし
    uwb: 1, fastCharge: "約45分", waterResistance: "50m", dustIP6X: true, batteryHours: 18, lowPowerHours: null,
    addedIn: { sleepScore: "watchOS 26" },
  },
  "Apple Watch Series 7": {
    specId: "111909", chip: "S7", maxNits: 1000, alwaysOn: true,
    ecg: true, bloodOxygen: true, skinTemp: false, sleepApnea: false, hypertension: false,
    irregularRhythm: true, fallDetection: true, crashDetection: false, sleepScore: true,
    doubleTap: false, singleTap: false, wristFlick: false, onDeviceSiri: false,
    // 低電力モードは時間の記載なし
    uwb: 1, fastCharge: "約45分", waterResistance: "50m", dustIP6X: true, batteryHours: 18, lowPowerHours: null,
    addedIn: { sleepScore: "watchOS 26" },
  },
  "Apple Watch Series 6": {
    specId: "111918", chip: "S6", maxNits: 1000, alwaysOn: true,
    ecg: true, bloodOxygen: true, skinTemp: false, sleepApnea: false, hypertension: false,
    irregularRhythm: true, fallDetection: true, crashDetection: false, sleepScore: true,
    doubleTap: false, singleTap: false, wristFlick: false, onDeviceSiri: false,
    // 防塵: 比較ページの IP6X の行が空欄（SE は「×」と明記されているのと違う）・技術仕様にも記載なし → 確かめられない
    // 低電力モードは時間の記載なし
    uwb: 1, fastCharge: false, waterResistance: "50m", dustIP6X: null, batteryHours: 18, lowPowerHours: null,
    addedIn: { sleepScore: "watchOS 26" },
  },

  "Apple Watch Ultra 4": {
    specId: "148758", chip: "S11", maxNits: 3000, alwaysOn: true,
    ecg: true, bloodOxygen: true, skinTemp: true, sleepApnea: true,
    // Series 12 と同じ（比較ページは空欄・技術仕様に記載なし・日本は追加承認の申請中の脚注）
    hypertension: "申請中",
    irregularRhythm: true, fallDetection: true, crashDetection: true, sleepScore: true,
    doubleTap: true, singleTap: true, wristFlick: true,
    // 技術仕様は「Apple Intelligenceのパワーを活用するSiri」で、「オンデバイス処理」の記載がない
    onDeviceSiri: null,
    uwb: 2, fastCharge: "約45分", waterResistance: "100m", dustIP6X: true, batteryHours: 50, lowPowerHours: 84,
  },
  "Apple Watch Ultra 3": {
    specId: "125095", chip: "S10", maxNits: 3000, alwaysOn: true,
    ecg: true, bloodOxygen: true, skinTemp: true, sleepApnea: true, hypertension: true,
    irregularRhythm: true, fallDetection: true, crashDetection: true, sleepScore: true,
    doubleTap: true, singleTap: false, wristFlick: true, onDeviceSiri: true,
    uwb: 2, fastCharge: "約45分", waterResistance: "100m", dustIP6X: true, batteryHours: 42, lowPowerHours: 72,
    addedIn: { hypertension: HTN_VER },
  },
  "Apple Watch Ultra 2": {
    specId: "111832", chip: "S9", maxNits: 3000, alwaysOn: true,
    ecg: true, bloodOxygen: true, skinTemp: true, sleepApnea: true, hypertension: true,
    irregularRhythm: true, fallDetection: true, crashDetection: true, sleepScore: true,
    doubleTap: true, singleTap: false, wristFlick: true, onDeviceSiri: true,
    uwb: 2, fastCharge: "約1時間", waterResistance: "100m", dustIP6X: true, batteryHours: 36, lowPowerHours: 72,
    addedIn: { doubleTap: "watchOS 10.1", sleepApnea: "watchOS 11", wristFlick: "watchOS 26", sleepScore: "watchOS 26", hypertension: HTN_VER },
  },
  "Apple Watch Ultra": {
    specId: "111852", chip: "S8", maxNits: 2000, alwaysOn: true,
    ecg: true, bloodOxygen: true, skinTemp: true, sleepApnea: false, hypertension: false,
    irregularRhythm: true, fallDetection: true, crashDetection: true, sleepScore: true,
    doubleTap: false, singleTap: false, wristFlick: false, onDeviceSiri: false,
    uwb: 1, fastCharge: "約1時間", waterResistance: "100m", dustIP6X: true, batteryHours: 36, lowPowerHours: 72,
    addedIn: { sleepScore: "watchOS 26" },
  },

  "Apple Watch SE 3": {
    specId: "125094", chip: "S10", maxNits: 1000, alwaysOn: true,
    ecg: false, bloodOxygen: false, skinTemp: true, sleepApnea: true, hypertension: false,
    irregularRhythm: true, fallDetection: true, crashDetection: true, sleepScore: true,
    // デバイス上の Siri はニュースルーム（WATCH_SOURCES.se3Siri）の「S10チップによってデバイス上のSiri」
    doubleTap: true, singleTap: true, wristFlick: true, onDeviceSiri: true,
    uwb: false, fastCharge: "約45分", waterResistance: "50m", dustIP6X: false, batteryHours: 18, lowPowerHours: 32,
  },
  "Apple Watch SE（第2世代）": {
    // 技術仕様に「約1.5時間で最大80%充電」とあるが、比較ページは高速充電「×」（付属は磁気充電ケーブル）
    specId: "111853", chip: "S8", maxNits: 1000, alwaysOn: false,
    ecg: false, bloodOxygen: false, skinTemp: false, sleepApnea: false, hypertension: false,
    irregularRhythm: true, fallDetection: true, crashDetection: true, sleepScore: true,
    doubleTap: false, singleTap: false, wristFlick: false, onDeviceSiri: false,
    // 低電力モードは時間の記載なし
    uwb: false, fastCharge: false, waterResistance: "50m", dustIP6X: false, batteryHours: 18, lowPowerHours: null,
    addedIn: { sleepScore: "watchOS 26" },
  },
  "Apple Watch SE（第1世代）": {
    // watchOS 26 に非対応のため睡眠スコアなし（比較ページ「×」）
    specId: "111862", chip: "S5", maxNits: 1000, alwaysOn: false,
    ecg: false, bloodOxygen: false, skinTemp: false, sleepApnea: false, hypertension: false,
    irregularRhythm: true, fallDetection: true, crashDetection: false, sleepScore: false,
    doubleTap: false, singleTap: false, wristFlick: false, onDeviceSiri: false,
    // 低電力モードは時間の記載なし
    uwb: false, fastCharge: false, waterResistance: "50m", dustIP6X: false, batteryHours: 18, lowPowerHours: null,
  },
};
