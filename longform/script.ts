/**
 * 横動画の台本（<フォルダ>/script.md）を読む。voice-draft.ts（声の試作）と timeline.ts（映像の時間割）で共有する
 *
 * - 本文は最初の --- から次の --- まで
 * - 「## 0:00 章の名前」で章、「【画面】…」はその章で映すもの、「つむぎ: 」「ずんだもん: 」で始まる行が台詞
 */

export type Who = "つむぎ" | "ずんだもん";
export const SPEAKERS: Record<Who, string> = { つむぎ: "春日部つむぎ/ノーマル", ずんだもん: "ずんだもん/ノーマル" };
/** 行の間・章の間（秒）。voice-draft.m4a と同じ */
export const LINE_GAP = 0.25;
export const CHAPTER_GAP = 0.8;
/** voice-draft の既定の速さ（キャッシュの鍵に入るので、同じ値でないと声のキャッシュに当たらない） */
export const DEFAULT_LONG_SPEED = 1.15;

/** shorts の speakable が知らない語・記号を、台本のうちに読みへ直す */
export function forVoice(text: string): string {
  const words: [RegExp, string][] = [
    [/USB-C/g, "ユーエスビーシー"], [/MagSafe/g, "マグセーフ"], [/(\d+)Hz/g, "$1ヘルツ"], [/\bOS\b/g, "オーエス"],
    [/\bMac\b/g, "マック"], [/\bApple\b/g, "アップル"], [/\bOK\b/g, "オーケー"], [/〜/g, "ー"], [/あーし/g, "アーシ"], [/△/g, "サンカク"], [/×/g, "バツ"],
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
