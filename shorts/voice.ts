/**
 * VOICEVOX のナレーション（任意）。VOICEVOX アプリが動いていればエンジン（http://127.0.0.1:50021）に問い合わせて WAV を作る。
 * エンジンに届かなければ、声なしで今まで通りに書き出す（例外にしない）。
 * 読み・アクセント句の直しとユーザー辞書は shorts/voiceTuning.ts。
 * 合成した WAV は (文・読みの手直し・話者・調声の設定・規則の版・辞書) のハッシュで shorts/out/voice-cache/ に置き、同じ文はエンジンなしでも使い回す。
 * 手順は shorts/README.md・docs/youtube-shorts.md
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { RELATED_LONG_THEMES, isBudget, periodOf, type BudgetScript, type DropsScript, type FoldScript, type NarrationKey, type NewUsedScript, type ProVsScript, type BatteryScript, type GenScript, type StorageScript, type RankScript, type Ios27Script, type BatterySwapScript, type OverNewScript, type Script, type VoiceConfig } from "./types";
import { TUNING_VERSION, dictHash, ensureDictionary, clarifyTe, lengthenLongVowels, moraLengths, tuneKana, type AccentPhrase } from "./voiceTuning";

export const VOICEVOX_URL = (process.env.VOICEVOX_URL ?? "http://127.0.0.1:50021").replace(/\/$/, "");
const CACHE = process.env.VOICEVOX_CACHE ? resolve(process.env.VOICEVOX_CACHE) : resolve(__dirname, "out/voice-cache");
/**
 * 既定の話者: 春日部つむぎ（ノーマル）。全テーマの標準の声（10/21 ユーザーの指示。それまでは ずんだもん ID 3）。
 * 名前で指定し、ID はエンジン（GET /speakers）から引く。エンジンに届かないとき（キャッシュだけで書き出すとき）は DEFAULT_SPEAKER_ID
 */
export const DEFAULT_SPEAKER = "春日部つむぎ/ノーマル";
/** 標準の VOICEVOX での春日部つむぎ（ノーマル）の ID */
export const DEFAULT_SPEAKER_ID = 8;
/** エンジンに届かないときのクレジット用（標準の VOICEVOX の ID） */
const KNOWN: Record<number, string> = { 2: "四国めたん", 3: "ずんだもん", 8: "春日部つむぎ" };

/** ナレーションを付けられる場面。hookNum・hookChart（B・C の冒頭）は hook の文を使う */
export type { NarrationKey };
export const narrationKey = (sceneId: string): NarrationKey | null =>
  sceneId === "hookNum" || sceneId === "hookChart" ? "hook"
    : (["hook", "ranking", "reveal", "trend", "comment", "outro"] as const).find((k) => k === sceneId) ?? null;

const yen = (n: number) => `${n.toLocaleString()}円`;
const jpDate = (iso: string) => `${Number(iso.slice(5, 7))}月${Number(iso.slice(8, 10))}日`;

/** 検品担当のひと言を読む文に。「〜でも」「〜は」の後に読点、「おすすめ」で終われば「です」を足す（画面の文字は変えない） */
export function commentSentence(lines: string[]): string {
  const body = lines.map((l, i) => (i < lines.length - 1 && /(でも|は|ので|から|けど|なら|たら|ても)$/.test(l) ? `${l}、` : l)).join("");
  if (/[。！？]$/.test(body)) return body;
  return /おすすめ$/.test(body) ? `${body}です。` : `${body}。`;
}

/**
 * 既定のナレーション（台本の数字だけで作る。数字を足したり丸めたりしない）。
 * hook: 冒頭の問い / ranking: 3位・2位（1位は次の場面まで伏せる）/ reveal: 1位の機種・容量・下がった額と率・相場の前後
 * trend: 推移グラフ（前の日からいちばん下がった日を1文で）/ comment: 検品担当のひと言 / outro: サイトへの誘導と次回の問い
 * script.json の narration に書いた場面はそちらが優先。空文字にするとその場面は声なし
 */
export function defaultNarration(s: Script): Partial<Record<NarrationKey, string>> {
  const n = baseNarration(s);
  // 関連動画（横動画）につながるテーマは、締めの最後に本編への誘導（types.ts の RELATED_LONG_THEMES）
  if (RELATED_LONG_THEMES.has(s.theme) && n.outro) n.outro += "くわしい解説は、下の関連動画からどうぞ。";
  return n;
}

// provs と promax は同じ台本の型（ProVsScript）
const isProVs = (s: Script): s is ProVsScript => s.theme === "provs" || s.theme === "promax";

function baseNarration(s: Script): Partial<Record<NarrationKey, string>> {
  return isBudget(s) ? budgetNarration(s) : s.theme === "newused" ? newUsedNarration(s) : isProVs(s) ? (s.theme === "promax" ? proMaxNarration(s) : proVsNarration(s))
    : s.theme === "fold" ? foldNarration(s) : s.theme === "rank" ? rankNarration(s) : s.theme === "battery" ? batteryNarration(s)
    : s.theme === "gen" ? genNarration(s) : s.theme === "storage" ? storageNarration(s)
    : s.theme === "ios27line" ? ios27Narration(s) : s.theme === "batteryswap" ? batterySwapNarration(s) : s.theme === "overnew" ? overNewNarration(s) : dropsNarration(s);
}

/**
 * ios27line の既定: hook 問い / ranking 3位・2位を1文ずつ（「3位は<機種>、<容量>。相場<額>です。」。文頭の「○位は」で行を出す）
 * reveal 1位の相場と、同じ容量の iOS 27 非対応で発売がいちばん新しい機種との差（容量は画面だけ。40秒に収めるため） / comment ひと言の本文だけ / outro サイトへの誘導と問い。声は ずんだもんで、口調は「です・ます」
 */
function ios27Narration(s: Ios27Script): Partial<Record<NarrationKey, string>> {
  const items = s.scenes.ranking.items;
  const top = items[0];
  const l = s.scenes.legacy;
  const legacy = !l ? "" : l.diff > 0 ? `iOS 27非対応の${l.model}との差は、${yen(l.diff)}です。`
    : l.diff < 0 ? `iOS 27非対応の${l.model}より、${yen(-l.diff)}安いです。` : `iOS 27非対応の${l.model}と、同じ値段です。`;
  return {
    hook: "iOS 27に対応する、いちばん安い中古iPhoneは…？",
    ranking: [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].model}、${items[i].storage}。相場${yen(items[i].median)}です。`).join(""),
    reveal: `1位は${top.model}。相場${yen(top.median)}。${legacy}`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: "全機種の相場は、プロフィールのリンクから見られます。あなたなら、どの機種にしますか？",
  };
}

/**
 * batteryswap の既定: hook 問い / ranking 3位・2位を1文ずつ（「3位は<古い方>と<1つ上の番号>、<容量>。差は<額>です。」）
 * reveal 1位の「相場＋電池交換」の合計と、1つ上の世代との差 / comment ひと言の本文だけ / outro サイトへの誘導と問い
 */
function batterySwapNarration(s: BatterySwapScript): Partial<Record<NarrationKey, string>> {
  const items = s.scenes.ranking.items;
  const top = items[0];
  const up = top.newer;
  return {
    hook: "電池交換を足すと、1つ上の世代と同じ値段？",
    ranking: [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].older}と${shortName(items[i].newer)}、${items[i].storage}。差は${yen(Math.abs(items[i].gap))}です。`).join(""),
    reveal: `1位は${top.older}。電池交換を足すと、${yen(top.total)}。${top.gap >= 0 ? `${up}との差は、${yen(top.gap)}だけです。` : `${up}の方が、${yen(-top.gap)}安いです。`}`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: "全機種の相場は、プロフィールのリンクから見られます。あなたなら、電池交換？それとも1つ上？",
  };
}

/**
 * overnew の既定: hook 問い / ranking 3位・2位を1文ずつ（「3位は<機種>、<容量>。新品のおよそ<率>%です。」・中古が新品以上なら「新品より<額>高いです。」）
 * reveal 1位（中古が新品以上なら高い額、ほかは率と差）/ comment ひと言の本文だけ / outro サイトへの誘導と問い
 */
function overNewNarration(s: OverNewScript): Partial<Record<NarrationKey, string>> {
  const items = s.scenes.ranking.items;
  const top = items[0];
  const of = (r: OverNewScript["scenes"]["ranking"]["items"][number]) => (r.diff < 0 ? `新品より${yen(-r.diff)}高いです。` : `新品のおよそ${Math.round(r.ratio)}%です。`);
  return {
    hook: "中古なのに、新品より高い？",
    ranking: [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].model}、${items[i].storage}。${of(items[i])}`).join(""),
    reveal: top.diff < 0
      ? `1位は${top.model}、${top.storage}。中古の相場が、新品より${yen(-top.diff)}高くなっています。`
      : `1位は${top.model}、${top.storage}。中古の相場は新品のおよそ${Math.round(top.ratio)}%、差は${yen(top.diff)}だけです。`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: "全機種の相場は、プロフィールのリンクから見られます。あなたなら、この差で中古を選びますか？",
  };
}

/**
 * rank の既定: hook 問い / ranking 3位・2位を1文ずつ（「3位は<機種>、<容量>。ランクAより、ランクCが<額>安いです。」。文頭の「○位は」で行を出す）
 * reveal 1位の差（約○.○万円）と率（およそ○%）だけ。容量・ランクごとの額は画面に出す（40秒に収めるため） / comment ひと言の本文だけ / outro サイトへの誘導と問い
 * 声は ずんだもんだが、口調は「です・ます」（「のだ」は使わない）。「ランクAとC」は1字ずつ切れるので「ランクA」「ランクC」と書く（voiceTuning.ts の 6）
 */
function rankNarration(s: RankScript): Partial<Record<NarrationKey, string>> {
  const items = s.scenes.ranking.items;
  const top = items[0];
  return {
    hook: "状態ランクで、中古iPhoneはいくら違う？",
    ranking: [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].model}、${items[i].storage}。ランクAより、ランクCが${yen(items[i].diff)}安いです。`).join(""),
    reveal: `1位は${top.model}。ランクCにすると、約${(Math.round(top.diff / 1000) / 10).toFixed(1)}万円、およそ${Math.round(top.pct)}%安くなります。`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: "全機種の相場は、プロフィールのリンクから見られます。あなたなら、ランクAとランクC、どちらにしますか？",
  };
}

/**
 * battery の既定: hook 問い / ranking 3位・2位を1文ずつ（「3位は<機種>、<容量>。電池80%台より、<額>高いです。」。文頭の「○位は」で行を出す）
 * reveal 1位の差額と Apple 公式の電池交換の料金。容量・帯ごとの額・率は画面に出す / comment ひと言の本文だけ / outro サイトへの誘導と問い
 */
function batteryNarration(s: BatteryScript): Partial<Record<NarrationKey, string>> {
  const items = s.scenes.ranking.items;
  const top = items[0];
  return {
    hook: "電池が90%台だと、中古iPhoneはいくら高い？",
    ranking: [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].model}、${items[i].storage}。電池80%台より、${yen(items[i].diff)}高いです。`).join(""),
    // 差は1万円未満なので「約○.○万円」でなく額のまま読む。公式の電池交換の料金があれば並べる（画面にも出す）
    reveal: `1位は${top.model}。電池90%台にすると、${yen(top.diff)}高くなります。${top.repair ? `Appleの電池交換は、${yen(top.repair)}です。` : ""}`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: "全機種の相場は、プロフィールのリンクから見られます。あなたなら、電池90%台と80%台、どちらにしますか？",
  };
}

/**
 * gen の既定: hook 問い / ranking 3位・2位を1文ずつ（「3位は<新>から<旧の番号>、<容量>。差は<額>です。」。文頭の「○位は」で行を出す）
 * reveal 1位の差（約○.○万円）と率（およそ○%）だけ / comment ひと言の本文だけ / outro サイトへの誘導と問い。声は ずんだもんで、口調は「です・ます」
 */
function genNarration(s: GenScript): Partial<Record<NarrationKey, string>> {
  const items = s.scenes.ranking.items;
  const top = items[0];
  return {
    hook: "iPhone、1世代前にすると、いくら安い？",
    ranking: [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].newer}から${shortName(items[i].older)}、${items[i].storage}。差は${yen(items[i].diff)}です。`).join(""),
    reveal: `1位は${top.newer}から${shortName(top.older)}。1世代前にすると、約${(Math.round(top.diff / 1000) / 10).toFixed(1)}万円、およそ${Math.round(top.pct)}%安くなります。`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: "全機種の相場は、プロフィールのリンクから見られます。あなたは、最新派？1世代前派？",
  };
}

/**
 * storage の既定: hook 問い / ranking 3位・2位を1文ずつ（「3位は<機種>。<from>から<to>で、<額>高くなります。」）
 * reveal 1位の差額（額のまま）と容量 / comment ひと言の本文だけ / outro サイトへの誘導と問い
 */
function storageNarration(s: StorageScript): Partial<Record<NarrationKey, string>> {
  const items = s.scenes.ranking.items;
  const top = items[0];
  return {
    hook: "容量を1つ上げると、中古iPhoneはいくら高い？",
    ranking: [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].model}。${items[i].from}から${items[i].to}で、${yen(items[i].diff)}高くなります。`).join(""),
    reveal: `1位は${top.model}。${top.from}から${top.to}にしても、${yen(top.diff)}しか変わりません。`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: "全機種の相場は、プロフィールのリンクから見られます。あなたは、何ギガ派ですか？",
  };
}

/** "iPhone 16 Pro" → "16 Pro"（組の2つ目は世代の番号から読む） */
const shortName = (model: string) => model.replace(/^iPhone\s+/, "");

/** "Galaxy Z Fold7" → "Fold7"、"Pixel 10 Pro Fold" → "10 Pro Fold"（fold の組の2つ目） */
const foldShort = (model: string) => model.replace(/^Galaxy Z\s+|^Pixel\s+/, "");

/**
 * fold の既定: hook 問い / ranking 3位・2位を1文ずつ（「3位は<新>から<旧>、<容量>。差は<額>です。」。文頭の「○位は」で行を出す）
 * reveal 1位の差（約○.○万円）と率（およそ○%）だけ。細かい額は画面に出す / comment ひと言の本文だけ / outro サイトへの誘導と問い
 */
function foldNarration(s: FoldScript): Partial<Record<NarrationKey, string>> {
  const items = s.scenes.ranking.items;
  const top = items[0];
  return {
    hook: "折りたたみスマホ、1世代前にすると、いくら安い？",
    ranking: [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].newer}から${foldShort(items[i].older)}、${items[i].storage}。差は${yen(items[i].diff)}です。`).join(""),
    reveal: `1位は${top.newer}から${foldShort(top.older)}。1世代前にすると、約${(Math.round(top.diff / 1000) / 10).toFixed(1)}万円、およそ${Math.round(top.pct)}%安くなります。`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: "全機種の相場は、プロフィールのリンクから見られます。あなたなら、最新と1世代前、どっちにしますか？",
  };
}

/**
 * provs の既定: hook 問い / ranking 3位・2位を1文ずつ（「3位は<無印>と<Pro>、<容量>。差は<額>です。」。文頭の「○位は」で行を出す）
 * reveal 1位の差（約○.○万円）と率（およそ○%）だけ。細かい額は画面に出す / comment ひと言の本文だけ / outro サイトへの誘導と問い
 */
function proVsNarration(s: ProVsScript): Partial<Record<NarrationKey, string>> {
  const items = s.scenes.ranking.items;
  const top = items[0];
  return {
    hook: "Proと無印、同じ容量だと、いくら違う？",
    ranking: [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].base}と${shortName(items[i].pro)}、${items[i].storage}。差は${yen(items[i].diff)}です。`).join(""),
    reveal: `1位は${top.base}と${shortName(top.pro)}。Proにすると、約${(Math.round(top.diff / 1000) / 10).toFixed(1)}万円、およそ${Math.round(top.pct)}%高くなります。`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: "全機種の相場は、プロフィールのリンクから見られます。あなたは、Pro派？無印派？",
  };
}

/**
 * promax の既定（provs と同じ形。base＝Pro・pro＝Pro Max）: ranking「3位は<Pro>と<番号 Pro Max>、<容量>。差は<額>です。」/ reveal「Pro Maxにすると、約○.○万円、およそ○%高くなります。」
 */
function proMaxNarration(s: ProVsScript): Partial<Record<NarrationKey, string>> {
  const items = s.scenes.ranking.items;
  const top = items[0];
  return {
    hook: "Pro MaxとPro、同じ容量だと、いくら違う？",
    ranking: [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].base}と${shortName(items[i].pro)}、${items[i].storage}。差は${yen(items[i].diff)}です。`).join(""),
    reveal: `1位は${top.base}と${shortName(top.pro)}。Pro Maxにすると、約${(Math.round(top.diff / 1000) / 10).toFixed(1)}万円、およそ${Math.round(top.pct)}%高くなります。`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: "全機種の相場は、プロフィールのリンクから見られます。あなたは、Pro Max派？Pro派？",
  };
}

/**
 * newused の既定: hook 問い / ranking 3位・2位を1文ずつ（「3位は<機種>、<容量>。新品より<額>安いです。」。文頭の「○位は」で行を出す）
 * reveal 1位の差額（約○.○万円）と率（およそ○%）だけ。細かい額は画面に出す（4つの額を読むと13秒かかった・10/21）/ comment ひと言の本文だけ / outro サイトへの誘導と問い
 */
function newUsedNarration(s: NewUsedScript): Partial<Record<NarrationKey, string>> {
  const items = s.scenes.ranking.items;
  const top = items[0];
  return {
    hook: "新品より、中古でいくら安くなる？",
    ranking: [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].model}、${items[i].storage}。新品より${yen(items[i].diff)}安いです。`).join(""),
    reveal: `1位は${top.model}、${top.storage}。中古の相場は、新品より約${(Math.round(top.diff / 1000) / 10).toFixed(1)}万円、およそ${Math.round(top.pct)}%安くなります。`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: "全機種の相場は、プロフィールのリンクから見られます。あなたなら、新品と中古、どちらにしますか？",
  };
}

/**
 * 機種名の読み上げ用（画面の文字は変えない）。iPad の「(M2)」「(A16)」のような括弧のチップ名は括弧で間が空くので読点に（「iPad Air 11インチ、M2」）。
 * 「(第9世代)」は speakable が括弧を外す
 */
const spokenModel = (model: string) => model.replace(/\s*\(((?:M|A)\d+(?: Pro)?)\)/, "、$1");

/**
 * budget の既定: hook 問い / ranking 予算ごとに1文（「3万円なら、<機種>、相場<額>です。」。文ごとに合成して行を声に合わせて出す）
 * reveal 注目の機種の相場と在庫数（最安は読まない） / comment ひと言の本文だけ / outro サイトへの誘導と問い
 */
function budgetNarration(s: BudgetScript): Partial<Record<NarrationKey, string>> {
  const p = s.scenes.pick;
  // pixelbudget: 問いと締めは「Pixel」、注目は在庫数の代わりにアップデート保証の終わり（「2031年5月まで」）を読む
  const pixel = s.theme === "pixelbudget";
  const ipad = s.theme === "ipadbudget";
  const mac = s.theme === "macbudget";
  const pro = s.theme === "probudget";
  const fold = s.theme === "foldbudget";
  const galaxy = s.theme === "galaxybudget";
  const until = p.updateUntil ? `${Number(p.updateUntil.slice(0, 4))}年${Number(p.updateUntil.slice(5, 7))}月` : "";
  return {
    hook: pixel ? "予算ぴったりで買える中古Pixelは…？" : ipad ? "予算ぴったりで買える中古iPadは…？" : mac ? "予算ぴったりで買える中古MacBookは…？" : pro ? "予算ぴったりで買える中古iPhone Proは…？" : fold ? "予算ぴったりで買える中古折りたたみスマホは…？" : galaxy ? "予算ぴったりで買える中古Galaxyは…？" : "予算ぴったりで買える中古iPhoneは…？",
    ranking: s.scenes.budgets.rows.map((r) => `${r.label}なら、${spokenModel(r.model)}、相場${yen(r.median)}です。`).join(""),
    reveal: pixel && until
      ? `注目は${p.label}の${p.model}。相場${yen(p.median)}、アップデートは${until}までです。`
      : `注目は${p.label}の${spokenModel(p.model)}。相場${yen(p.median)}、在庫は${p.count.toLocaleString()}台です。`,
    comment: commentSentence(s.scenes.comment.lines),
    outro: pixel ? "全機種の相場は、プロフィールのリンクから見られます。あなたの予算なら、どのPixelにしますか？"
      : ipad ? "全機種の相場は、プロフィールのリンクから見られます。あなたの予算なら、どのiPadにしますか？"
      : mac ? "全機種の相場は、プロフィールのリンクから見られます。あなたの予算なら、どのMacBookにしますか？"
      : pro ? "全機種の相場は、プロフィールのリンクから見られます。あなたの予算なら、どのProにしますか？"
      : fold ? "全機種の相場は、プロフィールのリンクから見られます。あなたの予算なら、どの折りたたみにしますか？"
      : galaxy ? "全機種の相場は、プロフィールのリンクから見られます。あなたの予算なら、どのGalaxyにしますか？"
      : "全機種の相場は、プロフィールのリンクから見られます。あなたの予算なら、どの機種にしますか？",
  };
}

function dropsNarration(s: DropsScript): Partial<Record<NarrationKey, string>> {
  const h = s.scenes.hook;
  const items = s.scenes.ranking.items;
  const top = items[0];
  const per = periodOf(s);
  const ranking = [2, 1].filter((i) => items[i]).map((i) => `${i + 1}位は${items[i].model}、マイナス${yen(items[i].drop)}。`).join("");
  const pts = s.scenes.trend.points;
  let trend = "";
  if (pts.length >= 2) {
    const first = pts[0];
    // 前の日からいちばん下がった日（同じ額なら早い日）
    let big = { i: 0, d: 0 };
    for (let i = 1; i < pts.length; i++) if (pts[i - 1].median - pts[i].median > big.d) big = { i, d: pts[i - 1].median - pts[i].median };
    // 1文だけ。いちばん下がった日（なければ推移の最初の日）
    trend = big.d > 0 ? `${jpDate(pts[big.i].date)}に大きく下がりました。` : `${jpDate(first.date)}からの推移です。`;
  }
  return {
    hook: `${per.lead}いちばん値下がりした中古iPhoneは…？`,
    ranking,
    reveal: `1位は${h.model}、${h.storage}。${per.span}${yen(h.drop)}、${top.rate.toFixed(1)}%の値下がりです。`,
    trend,
    // 「検品担当のひと言」は画面の札に出ているので読まない
    comment: commentSentence(s.scenes.comment.lines),
    outro: `全機種の相場は、プロフィールのリンクから見られます。${per.next}の1位は、どの機種でしょう？`,
  };
}

export function narrationOf(s: Script): Partial<Record<NarrationKey, string>> {
  return { ...defaultNarration(s), ...(s.narration ?? {}) };
}

/**
 * エンジンが読み違える語（かなに開いて読ませる）。ショートと横動画（longform/script.ts の forVoice の後）で共有。10/22 に春日部つむぎ（ID 8）で確認:
 * 高すぎ→コオスギ・新すぎ→シンスギ・古すぎ→イニシエスギ・古め→イニシエメ・大きすぎ→タイキスギ・新しめ→シンシメ・7万件→ナナマンゲン・1つ上→ヒトツジョウ（10/25 ずんだもん）。
 * 怖すぎ・安すぎ・重すぎ・多すぎ・高め・安めは正しく読むので入れない
 */
export const READING_FIXES: [RegExp, string][] = [
  [/高すぎ/g, "たかすぎ"], [/新すぎ/g, "あたらしすぎ"], [/古すぎ/g, "ふるすぎ"], [/古め/g, "ふるめ"], [/大きすぎ/g, "おおきすぎ"],
  [/新しめ/g, "あたらしめ"], [/万件/g, "万けん"],
  // batteryswap（10/25・ずんだもん）: 「1つ上」を「ヒトツジョウ」と読む
  [/1つ上/g, "ひとつうえ"],
];

/** 読み上げ用に直す（画面の文字は変えない）。読み違える語（READING_FIXES）・英字の機種名・容量・記号をカナに */
export function speakable(text: string): string {
  const words: [RegExp, string][] = [
    ...READING_FIXES,
    // ios27line（10/25）: 「iOS」を1字ずつ読まない・iPhone X／XS／XR は Apple の読み（テン）。longform/script.ts の forVoice と同じ
    [/iOS/g, "アイオーエス"], [/\bXS\b/g, "テンエス"], [/\bXR\b/g, "テンアール"], [/\bX\b/g, "テン"],
    [/iPhone/g, "アイフォン"], [/iPad/g, "アイパッド"], [/MacBook/g, "マックブック"], [/Apple Watch/g, "アップルウォッチ"],
    // 「Galaxy A53 5G」は空白を詰めると「A535G」で「ゴヒャクサンジュウゴ」と読むので、5G を先にカナに（galaxybudget・10/24）
    [/Galaxy/g, "ギャラクシー"], [/\b5G\b/g, "ファイブジー"], [/\bUltra\b/g, "ウルトラ"], [/\bZ\s*(?=Fold|Flip)/g, "ゼット"], [/Fold/g, "フォールド"], [/Flip/g, "フリップ"], [/Pixel/g, "ピクセル"],
    [/Pro Max/g, "プロマックス"], [/\bPro\b/g, "プロ"], [/\bMax\b/g, "マックス"], [/\bPlus\b/g, "プラス"], [/\bmini\b/g, "ミニ"],
    [/\bAir\b/g, "エアー"], [/\bSE\b/g, "エスイー"], [/\bDuo\b/g, "デュオ"], [/(\d+)e\b/g, "$1イー"], [/(\d+)a\b/g, "$1エー"], [/\bXL\b/g, "エックスエル"],
    [/(\d+)\s*GB/g, "$1ギガ"], [/(\d+)\s*TB/g, "$1テラ"], [/(\d),(?=\d{3})/g, "$1"], [/%/g, "パーセント"],
    [/−(\d)/g, "マイナス$1"], [/…/g, ""], [/○/g, "マル"], [/\s*\(第(\d)世代\)/g, "第$1世代"],
  ];
  return words.reduce((t, [re, to]) => t.replace(re, to), text).replace(/\s+/g, "");
}

type Speaker = { name: string; styles: { name: string; id: number }[] };

async function http(path: string, init?: RequestInit & { timeoutMs?: number }) {
  const res = await fetch(`${VOICEVOX_URL}${path}`, { ...init, signal: AbortSignal.timeout(init?.timeoutMs ?? 60_000) });
  if (!res.ok) throw new Error(`VOICEVOX ${path.split("?")[0]} が ${res.status} を返しました: ${(await res.text()).slice(0, 200)}`);
  return res;
}

/** エンジンが動いているか（2秒で見切る） */
export async function engineAvailable(): Promise<boolean> {
  try {
    await http("/version", { timeoutMs: 2000 });
    return true;
  } catch {
    return false;
  }
}

let speakersCache: Speaker[] | null = null;
async function speakers(): Promise<Speaker[]> {
  speakersCache ??= (await (await http("/speakers", { timeoutMs: 5000 })).json()) as Speaker[];
  return speakersCache;
}

/**
 * 話者の指定（数値の ID・"春日部つむぎ"・"春日部つむぎ/ノーマル"・"ずんだもん/ノーマル"）を ID とキャラクター名にする。
 * 名前の指定はエンジンが要る。ID の指定でエンジンに届かないときは、既知の ID だけ名前が分かる
 */
export async function resolveSpeaker(spec: VoiceConfig["speaker"], online: boolean): Promise<{ id: number; character: string; style?: string }> {
  const want = spec ?? DEFAULT_SPEAKER;
  if (online) {
    const list = await speakers();
    if (typeof want === "number") {
      for (const sp of list) for (const st of sp.styles) if (st.id === want) return { id: st.id, character: sp.name, style: st.name };
      throw new Error(`VOICEVOX に話者 ID ${want} がありません`);
    }
    const [name, style] = want.split(/[/／:：]/).map((x) => x.trim());
    const sp = list.find((x) => x.name === name);
    const st = sp?.styles.find((x) => x.name === (style || "ノーマル")) ?? (style ? undefined : sp?.styles[0]);
    if (!sp || !st) throw new Error(`VOICEVOX に話者「${want}」がありません（GET ${VOICEVOX_URL}/speakers で名前を確認）`);
    return { id: st.id, character: sp.name, style: st.name };
  }
  if (typeof want === "number") return { id: want, character: KNOWN[want] ?? `話者${want}` };
  if (spec === undefined || want === DEFAULT_SPEAKER) return { id: DEFAULT_SPEAKER_ID, character: KNOWN[DEFAULT_SPEAKER_ID] };
  throw new Error(`話者を名前（${want}）で指定するときは VOICEVOX を起動してください`);
}

const probe = (file: string) => {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  return Number(r.stdout.trim());
};

export type Clip = { file: string; dur: number; text: string; cached: boolean; kana?: string };

/** エンジンが読んだときの AquesTalk 風の読み */
async function kanaOf(text: string, speaker: number): Promise<string> {
  return ((await (await http(`/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, { method: "POST" })).json()) as { kana: string }).kana;
}

let dictDone = false;
/** ユーザー辞書（shorts/voice-dict.json）を1回だけ登録する */
export async function prepareEngine(): Promise<void> {
  if (dictDone) return;
  const r = await ensureDictionary(http);
  dictDone = true;
  if (r.added || r.updated) console.log(`VOICEVOX のユーザー辞書: 追加 ${r.added}・更新 ${r.updated}・そのまま ${r.same}`);
}

/** 文 → 合成用のクエリ（辞書・アクセント句の直し・話速などを入れる）。読みの before/after も返す */
export async function tunedQuery(text: string, cfg: VoiceConfig | undefined, speakerId: number, kanaOverride?: string) {
  await prepareEngine();
  const spoken = speakable(text);
  const query = (await (await http(`/audio_query?text=${encodeURIComponent(spoken)}&speaker=${speakerId}`, { method: "POST" })).json()) as Record<string, unknown> & { kana: string };
  const before = query.kana;
  const after = kanaOverride?.trim() || (await tuneKana(before, (t) => kanaOf(t, speakerId)));
  if (after !== before) {
    query.accent_phrases = await (await http(`/accent_phrases?text=${encodeURIComponent(after)}&speaker=${speakerId}&is_kana=true`, { method: "POST" })).json();
  }
  // 長音（ジュウ・パア・ソオ）の母音を延ばす（voiceTuning.ts の lengthenLongVowels）
  const longVowels = lengthenLongVowels(query.accent_phrases as AccentPhrase[]);
  // 「〜てね」の「テ」を少し延ばす（voiceTuning.ts の clarifyTe）
  longVowels.push(...clarifyTe(query.accent_phrases as AccentPhrase[]));
  const moras = moraLengths(query.accent_phrases as AccentPhrase[]);
  query.speedScale = cfg?.speedScale ?? DEFAULT_SPEED;
  query.volumeScale = cfg?.volume ?? 1.0;
  if (cfg?.intonationScale !== undefined) query.intonationScale = cfg.intonationScale;
  if (cfg?.pitchScale !== undefined) query.pitchScale = cfg.pitchScale;
  query.pauseLengthScale = cfg?.pauseLengthScale ?? DEFAULT_PAUSE;
  query.prePhonemeLength = 0.05;
  query.postPhonemeLength = 0.1;
  return { query, spoken, before, after, longVowels, moras };
}

export const DEFAULT_SPEED = 1.25;
/** 読点・句点の間の倍率。エンジンの既定（1）だと「、」ごとに約0.4秒あいて間延びした（10/24 ユーザーの指示で半分に）。場面の切り替わりの間（render.ts の VOICE_PAD）は別 */
export const DEFAULT_PAUSE = 0.5;

/**
 * 1つの文を WAV にする。キャッシュにあればエンジンを使わない。
 * online=false でキャッシュにもなければ null。kanaOverride は script.json の narrationKana
 */
export async function synthesize(text: string, cfg: VoiceConfig | undefined, online: boolean, kanaOverride?: string): Promise<Clip | null> {
  const spoken = speakable(text);
  const spec = cfg?.speaker ?? DEFAULT_SPEAKER;
  const params = [cfg?.speedScale ?? DEFAULT_SPEED, cfg?.volume ?? 1.0, cfg?.intonationScale ?? null, cfg?.pitchScale ?? null, cfg?.pauseLengthScale ?? DEFAULT_PAUSE];
  const key = createHash("sha256").update(JSON.stringify([spoken, kanaOverride ?? "", String(spec), params, TUNING_VERSION, dictHash()])).digest("hex").slice(0, 20);
  const file = join(CACHE, `${key}.wav`);
  if (existsSync(file)) {
    let kana: string | undefined;
    try {
      kana = (JSON.parse(readFileSync(file.replace(/\.wav$/, ".json"), "utf8")) as { kana?: string }).kana;
    } catch {}
    return { file, dur: probe(file), text, cached: true, kana };
  }
  if (!online) return null;
  const sp = await resolveSpeaker(spec, true);
  const { query, after } = await tunedQuery(text, cfg, sp.id, kanaOverride);
  const wav = Buffer.from(await (await http(`/synthesis?speaker=${sp.id}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query),
  })).arrayBuffer());
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, wav);
  writeFileSync(file.replace(/\.wav$/, ".json"), JSON.stringify({ text, spoken, kana: after, speaker: sp, params }, null, 2));
  return { file, dur: probe(file), text, cached: false, kana: after };
}

/** キャッシュの横に置いたメモからキャラクター名を読む（エンジンなしでクレジットを出すため） */
export function cachedCharacter(clip: Clip): string | null {
  try {
    return (JSON.parse(readFileSync(clip.file.replace(/\.wav$/, ".json"), "utf8")) as { speaker: { character: string } }).speaker.character;
  } catch {
    return null;
  }
}

/** YouTube の説明文に入れるクレジット（VOICEVOX の各キャラクターの規約で求められる表記） */
export const voiceCredit = (character: string) => `VOICEVOX:${character}`;
