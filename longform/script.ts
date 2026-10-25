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
  const words: [RegExp, string][] = [
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
    [/iOS/g, "アイオーエス"], [/\bXS\b/g, "テンエス"], [/\bXR\b/g, "テンアール"], [/\bX\b/g, "テン"], [/Intelligence/g, "インテリジェンス"],
  ];
  return words.reduce((t, [re, to]) => t.replace(re, to), text);
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
