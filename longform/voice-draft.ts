/**
 * 横動画の台本（script.md）の台詞に声だけを付ける試作。映像は作らない
 *
 *   npx tsx longform/voice-draft.ts longform/2026-10-21-iphone-dore [--speed 1.15]
 *
 * - 「つむぎ: 」「ずんだもん: 」で始まる行を順に合成し、行の間 0.25 秒・章（## 見出し）の間 0.8 秒をあけてつなぐ
 * - 声の直し（辞書・アクセント句・長音）はショートと同じ shorts/voice.ts の synthesize を使う
 * - PC に負荷をかけないよう、行ごとに 0.4 秒休む（--rest 秒）。ffmpeg は2スレッド。エンジンは CPU（GPU を使うと PC が落ちた・10/21）
 * - 出力: <フォルダ>/voice-draft.m4a（-14 LUFS）と chapters.txt（章の開始秒。YouTube のチャプター用）
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { engineAvailable, synthesize } from "../shorts/voice";
import { CHAPTER_GAP, DEFAULT_LONG_SPEED, LINE_GAP, SPEAKERS, forVoice, scriptItems } from "./script";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

(async () => {
  const dir = process.argv[2];
  if (!dir) throw new Error("使い方: npx tsx longform/voice-draft.ts <台本のフォルダ> [--speed 1.15]");
  if (!(await engineAvailable())) throw new Error("VOICEVOX が起動していません（127.0.0.1:50021）");
  const speed = Number(arg("--speed") ?? DEFAULT_LONG_SPEED);
  const rest = Number(arg("--rest") ?? 0.4);
  const md = readFileSync(join(dir, "script.md"), "utf8");
  const items = scriptItems(md);

  const work = join(dir, "voice-draft");
  mkdirSync(work, { recursive: true });
  const parts: string[] = [];
  const chapters: string[] = [];
  let t = 0;
  let pendingGap = 0;
  const silence = (sec: number) => {
    const f = join(work, `sil-${sec}.wav`);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", String(sec), "-c:a", "pcm_s16le", f]);
    return f;
  };
  const sil = { line: silence(LINE_GAP), chapter: silence(CHAPTER_GAP) };
  let n = 0;
  for (const it of items) {
    if (it.chapter) {
      if (parts.length) pendingGap = CHAPTER_GAP;
      const mm = Math.floor((t + pendingGap) / 60), ss = Math.floor((t + pendingGap) % 60);
      chapters.push(`${mm}:${String(ss).padStart(2, "0")} ${it.chapter}`);
      continue;
    }
    if (parts.length) {
      const gap = pendingGap || LINE_GAP;
      parts.push(gap === CHAPTER_GAP ? sil.chapter : sil.line);
      t += gap;
    }
    pendingGap = 0;
    const clip = await synthesize(forVoice(it.text!), { speaker: SPEAKERS[it.who!], speedScale: speed }, true);
    if (!clip) throw new Error(`合成できませんでした: ${it.text}`);
    if (!clip.cached && rest > 0) await new Promise((r) => setTimeout(r, rest * 1000));
    parts.push(clip.file);
    t += clip.dur;
    n++;
    if (n % 20 === 0) console.log(`${n} 行（${t.toFixed(0)} 秒）`);
  }

  // つないで -14 LUFS（YouTube の再生音量）にそろえる
  const list = join(work, "list.txt");
  writeFileSync(list, parts.map((p) => `file '${resolve(p).replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"));
  const wav = join(work, "joined.wav");
  execFileSync("ffmpeg", ["-loglevel", "error", "-threads", "2", "-y", "-f", "concat", "-safe", "0", "-i", list, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
  const out = join(dir, "voice-draft.m4a");
  execFileSync("ffmpeg", ["-loglevel", "error", "-threads", "2", "-y", "-i", wav, "-af", "loudnorm=I=-14:TP=-1:LRA=9", "-ar", "48000", "-c:a", "aac", "-b:a", "160k", out]);
  writeFileSync(join(dir, "chapters.txt"), chapters.join("\n") + "\n");
  console.log(`${n} 行・${Math.floor(t / 60)}分${Math.round(t % 60)}秒（速さ ${speed}）→ ${out}`);
  console.log(chapters.join("\n"));
})();
