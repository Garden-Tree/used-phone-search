/**
 * 横動画の台本（<フォルダ>/script.md）を読む。voice-draft.ts（声の試作）と timeline.ts（映像の時間割）で共有する
 *
 * - 本文は最初の --- から次の --- まで
 * - 「## 0:00 章の名前」で章、「【画面】…」はその章で映すもの、「つむぎ: 」「ずんだもん: 」で始まる行が台詞
 */

export type Who = "つむぎ" | "ずんだもん";
export const SPEAKERS: Record<Who, string> = { つむぎ: "春日部つむぎ/ノーマル", ずんだもん: "ずんだもん/ノーマル" };
/** 行の間・章の間（秒）。voice-draft.m4a と同じ。章の間は章のジングル（video.tsx・約0.7秒）が入るよう 1.1 秒 */
export const LINE_GAP = 0.25;
export const CHAPTER_GAP = 1.1;
/** 2章目からは、章の絵（とジングル）を声の始まりの この秒数 前に出す（章の間の 0.2 秒目。前の台詞の余韻を残す） */
export const CHAPTER_LEAD = 0.9;
/** voice-draft の既定の速さ（キャッシュの鍵に入るので、同じ値でないと声のキャッシュに当たらない） */
export const DEFAULT_LONG_SPEED = 1.15;
/** 読点・句点の間の倍率。ショート（shorts/voice.ts の DEFAULT_PAUSE）と同じくエンジンの半分（10/24 ユーザーの指示で横動画も） */
export const LONG_PAUSE = 0.5;

/**
 * shorts の speakable が知らない語・記号を、台本のうちに読みへ直す。
 * 「7万件」「新しめ」などショートでも出る読み違いは shorts/voice.ts の READING_FIXES（speakable が合成の前に通す）
 */
export function forVoice(text: string): string {
  const words: [RegExp, string | ((...a: string[]) => string)][] = [
    [/USB-C/g, "ユーエスビーシー"], [/MagSafe/g, "マグセーフ"], [/(\d+)Hz/g, "$1ヘルツ"], [/\bOS\b/g, "オーエス"],
    [/\bMac\b/g, "マック"], [/\bApple\b/g, "アップル"], [/\bOK\b/g, "オーケー"], [/〜/g, "ー"], [/あーし/g, "アーシ"], [/△/g, "サンカク"], [/×/g, "バツ"],
    // 「へたってる」の「へ」を助詞（エ）と読む・「3.0万円」は「サンテンゼロ」・「数字はね」は「ハネ」・「あと13は」は「アトジュウ／サンワ」（10/22）
    [/へた(?=っ)/g, "ヘタ"], [/(\d)\.0万/g, "$1万"], [/数字はね/g, "数字わね"], [/あと(\d)/g, "あと、$1"],
    // 「今日の分」を「ワケ」・「なんとなく強そう」を「キョウソウ」・「得って」を「エッテ」と読む（10/23）
    [/の分/g, "のぶん"], [/強そう/g, "つよそう"], [/得って/g, "トクって"],
    // 「で十分」を「ジュップン」（10分）と読む（iPad・10/23）
    [/十分/g, "じゅうぶん"],
    // 「最安が」を「サイアンガ」と読む（10/24・どこで買う）
    [/最安が/g, "さいやすが"],
    // 「絵を描く」を「エガク」と読む → 「かく」（お絵描き・描いて も同じ。10/23 ユーザー指示）
    [/描/g, "か"],
    // 「SIM」を「エスアイエム」と読む → 「シム」（eSIM も。10/24 ユーザー指示）
    [/eSIM/g, "イーシム"], [/SIM/g, "シム"],
    // 「LiDAR」を1字ずつ読まないように（Pro と無印・10/25）
    [/LiDAR/g, "ライダー"],
    // 何世代まで（10/25）: 「iOS」を1字ずつ読まない・iPhone X／XS／XR は Apple の読み（テン）・「Intelligence」をカナに。X（旧 Twitter）は台本に「エックス」と書く（X はテンになる）
    // 大きい画面（10/26）: 「39時間」を「サンジュウ／クジカン」と2つに切って読む（30と9時間に聞こえる）
    [/39時間/g, "サンジュウクジカン"], [/29時間/g, "ニジュウクジカン"],
    // 楽天モバイル（10/26）: 「iOS 14.4」がジュウ／ヨンテンヨンに切れる → 1つの数に
    [/iOS 14\.4/g, "アイオーエス ジュウヨンテンヨン"],
    [/iOS/g, "アイオーエス"], [/\bXS\b/g, "テンエス"], [/\bXR\b/g, "テンアール"], [/\bX\b/g, "テン"], [/Intelligence/g, "インテリジェンス"],
    // PROLED・MBP vs Air（10/29）: 「1,600ニト」がイチマンロクセン／ニト・「500ニト」がゴセン／ニトになる（ニを数字と読む）→ 数を漢数字に。
    // 「Adobe」をアドベ・「P3」をピーサン・「Thunderbolt 5」をサンダーボルトゴ・「3分の1」をサンプンノイチと読む
    [/(\d{1,2}),?(\d{3})ニト|(\d{1,3})ニト/g, (m: string) => `${kanjiNum(Number(m.replace(/[^\d]/g, "")))}ニト`],
    [/Adobe/g, "アドビ"], [/\bP3\b/g, "ピースリー"], [/Thunderbolt\s*5/g, "サンダーボルトファイブ"], [/Thunderbolt\s*4/g, "サンダーボルトフォー"],
    [/(\d)分の1/g, "$1ぶんのいち"],
    // 「最大24時間」がニジュウ／ヨジカン、「1.23キロ」がイッテンニイ／サンキロ、「35台のうち11台」がウチジュウ／イチダイに切れる（10/29）
    [/(\d{2})時間/g, (_m: string, n: string) => `${hourKana(Number(n))}ジカン`],
    [/(\d)\.(\d+)キロ/g, (_m: string, i: string, f: string) => `${INT_TEN[i] ?? i + "テン"}${[...f.replace(/0+$/, "")].map((c) => DIGIT_KANA[c]).join("")}キロ`],
    // 「102台のうちランクBが」がウチランク／ビー／ガ、「メモリ16GB」がメモリジュウ／ロクギガに切れる（10/29）→ 読点を足す
    [/のうち(?!、)/g, "のうち、"], [/メモリ(\d)/g, "メモリ、$1"],
  ];
  return words.reduce((t, [re, to]) => t.replace(re, to as string), text);
}

const DIGIT_KANA: Record<string, string> = { "0": "ゼロ", "1": "イチ", "2": "ニー", "3": "サン", "4": "ヨン", "5": "ゴー", "6": "ロク", "7": "ナナ", "8": "ハチ", "9": "キュー" };
const INT_TEN: Record<string, string> = { "1": "イッテン", "2": "ニーテン", "3": "サンテン" };
/** 10〜99 の時間の読み（24 → ニジュウヨ。後ろにジカン） */
function hourKana(n: number): string {
  const ones = ["", "イチ", "ニ", "サン", "ヨ", "ゴ", "ロク", "ナナ", "ハチ", "ク"];
  const tens = ["", "ジュウ", "ニジュウ", "サンジュウ", "ヨンジュウ", "ゴジュウ", "ロクジュウ", "ナナジュウ", "ハチジュウ", "キュウジュウ"];
  return tens[Math.floor(n / 10)] + ones[n % 10];
}

/** 1〜99999 を漢数字に（「千六百」。ニトの前だけで使う） */
function kanjiNum(n: number): string {
  const d = "〇一二三四五六七八九";
  const units: [number, string][] = [[10000, "万"], [1000, "千"], [100, "百"], [10, "十"]];
  let out = "";
  for (const [u, k] of units) {
    const q = Math.floor(n / u);
    if (q) out += (q === 1 && u !== 10000 ? "" : d[q]) + k;
    n %= u;
  }
  return out + (n ? d[n] : "");
}

export type ScriptItem = { chapter?: string; who?: Who; text?: string };

/** 本文を章・台詞の並びにする（voice-draft.ts の読み方そのまま） */
export function scriptItems(md: string): ScriptItem[] {
  const body = md.split(/^---$/m)[1] ?? md;
  const items: ScriptItem[] = [];
  for (const line of body.split(/\r?\n/)) {
    const ch = line.match(/^## (\d+:\d+) (.+)$/);
    if (ch) items.push({ chapter: ch[2] });
    const m = line.match(/^(つむぎ|ずんだもん): (.+)$/);
    if (m) items.push({ who: m[1] as Who, text: m[2] });
  }
  return items;
}

export type ScriptChapter = { title: string; cues: string[]; lines: { who: Who; text: string }[] };

/** 章ごとにまとめる（【画面】の指示も持つ） */
export function scriptChapters(md: string): ScriptChapter[] {
  const body = md.split(/^---$/m)[1] ?? md;
  const out: ScriptChapter[] = [];
  for (const line of body.split(/\r?\n/)) {
    const ch = line.match(/^## (\d+:\d+) (.+)$/);
    if (ch) out.push({ title: ch[2], cues: [], lines: [] });
    const cur = out[out.length - 1];
    if (!cur) continue;
    const cue = line.match(/^【画面】\s*(.+)$/);
    if (cue) cur.cues.push(cue[1]);
    const m = line.match(/^(つむぎ|ずんだもん): (.+)$/);
    if (m) cur.lines.push({ who: m[1] as Who, text: m[2] });
  }
  return out;
}
