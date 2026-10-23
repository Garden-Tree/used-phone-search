/**
 * 台本（script.md）＋数字（data.json）＋台詞ごとの声の長さ → 時間割（timeline.json）
 *
 *   npx tsx longform/timeline.ts longform/2026-10-21-iphone-dore [--speed 1.15]
 *
 * - 声の長さは voice-draft.ts が作ったキャッシュ（shorts/out/voice-cache）から読む。エンジンは使わない（合成もしない）。
 *   キャッシュにない台詞は文字数から見積もり（estimated: true）。合成し直すなら先に voice-draft.ts を回す
 * - 行の間・章の間は voice-draft.m4a と同じ（script.ts の LINE_GAP・CHAPTER_GAP）なので、章の開始秒は chapters.txt と一致する
 * - data.json の各章の scene の cue（台詞の一部）を、その台詞が始まる秒（章の頭から）に直す
 * - 長い台詞は字幕を「2行まで」のページに分け、文字数の割合で時間を配る
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { synthesize } from "../shorts/voice";
import { CHAPTER_GAP, DEFAULT_LONG_SPEED, LINE_GAP, SPEAKERS, forVoice, scriptChapters } from "./script";
import { FPS, H, W, wrapSubtitle } from "./scenes";
import type { LongData, SceneData, SubPage, Timeline, TimelineChapter, TimelineLine } from "./types";

/** キャッシュにない台詞の秒／文字（voice-draft の実測 約575秒・約3,600字・速さ 1.15 から） */
const SEC_PER_CHAR = 0.15;

/**
 * 声のキャッシュの鍵には辞書（shorts/voice-dict.json）の中身が入るので、ショートで辞書を足すと横動画の声は当たらなくなる。
 * 長さを知るだけなら古い声で足りるので、キャッシュの横のメモ（*.json）から「同じ文・同じ話し手・同じ速さ」の新しいものを探す
 */
function staleCacheIndex(): Map<string, string> {
  const dir = resolve(__dirname, "../shorts/out/voice-cache");
  const idx = new Map<string, { file: string; mtime: number }>();
  let names: string[] = [];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith(".json"));
  } catch {
    return new Map();
  }
  for (const n of names) {
    try {
      const j = JSON.parse(readFileSync(join(dir, n), "utf8")) as { text: string; speaker: { character: string; style?: string }; params: unknown[] };
      const key = `${j.speaker.character}/${j.speaker.style ?? "ノーマル"}|${j.params[0]}|${j.text}`;
      const file = join(dir, n.replace(/\.json$/, ".wav"));
      const mtime = statSync(file).mtimeMs;
      if ((idx.get(key)?.mtime ?? -1) < mtime) idx.set(key, { file, mtime });
    } catch {}
  }
  return new Map([...idx].map(([k, v]) => [k, v.file]));
}

const probe = (file: string) => Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).stdout.trim());

/** 1つの台詞を2行までのページに分ける（文末 → 読点 → 語の順で切る。行の分け方は scenes.tsx の wrapSubtitle） */
export function subtitlePages(text: string): string[] {
  const fits = (x: string) => wrapSubtitle(x.trim()).length <= 2;
  if (fits(text)) return [text];
  // 文末: 「。」と、後ろが空白か終わりの「！」「？」（「いくら？」は のようなかっこの中では切らない）
  const sentences = text.split(/(?<=。[」』）]*[　 ]*|[！？]+[　 ]+)/).filter(Boolean);
  const pieces: string[] = [];
  for (const s of sentences) {
    if (fits(s)) {
      pieces.push(s);
      continue;
    }
    for (const p of s.match(/[^、]*、|[^、]+$/g) ?? [s]) {
      if (fits(p)) pieces.push(p);
      else {
        // 読点でも収まらなければ2行ずつに切る
        const ls = wrapSubtitle(p);
        for (let i = 0; i < ls.length; i += 2) pieces.push(ls.slice(i, i + 2).join(""));
      }
    }
  }
  const pages: string[] = [];
  let cur = "";
  for (const p of pieces) {
    if (cur && !fits(cur + p)) {
      pages.push(cur.trim());
      cur = "";
    }
    cur += p;
  }
  if (cur.trim()) pages.push(cur.trim());
  return pages;
}

/**
 * 読む長さの目安（字幕のページを声に合わせる）。字の幅（textEm）で割ると、数字・英字の多いページが
 * 読み終わる前に次へ進んでいた（10/23「6万5,980円」）。数字は桁ごとに「ろく・まん」のように読むので重く、
 * 漢字は2拍くらい、読点・句点は間の分を足す
 */
export function spokenWeight(text: string): number {
  let w = 0;
  for (const m of text.matchAll(/[0-9][0-9,.]*|[A-Za-z]+|./gu)) {
    const tok = m[0];
    if (/^[0-9]/.test(tok)) {
      const digits = tok.replace(/[,.]/g, "");
      w += [...digits].filter((d) => d !== "0").length * 3.5 + (tok.includes(".") ? 2 : 0);
    } else if (/^[A-Za-z]/.test(tok)) w += tok.length * 1.6;
    else if (/[、。！？]/.test(tok)) w += 1.5;
    else if (/[一-鿿]/.test(tok)) w += 1.8; // 漢字
    else if (/[぀-ヿ]/.test(tok)) w += 1; // かな
    else w += 0.3;
  }
  return Math.max(w, 1);
}

/** 声の切れ目（無音 0.12 秒以上）の終わり＝次に話し出す秒（台詞の頭からの秒） */
function speechResumes(file: string): number[] {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=n=-35dB:d=0.12", "-f", "null", "-"], { encoding: "utf8" });
  return [...(r.stderr ?? "").matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
}

function pagesWithTime(text: string, start: number, end: number, audio?: string): SubPage[] {
  const texts = subtitlePages(text);
  const total = texts.reduce((a, p) => a + spokenWeight(p), 0);
  // ページの切り替えは、見積もりにいちばん近い声の切れ目（1.5秒以内）に合わせる（話し出す 0.05 秒前）
  const resumes = texts.length > 1 && audio ? speechResumes(audio).map((x) => start + x - 0.05) : [];
  let t = start;
  return texts.map((p, i) => {
    let e = i === texts.length - 1 ? end : t + ((end - start) * spokenWeight(p)) / total;
    if (i < texts.length - 1) {
      const near = resumes.filter((x) => x > t + 0.5 && x < end - 0.3).sort((x, y) => Math.abs(x - e) - Math.abs(y - e))[0];
      if (near !== undefined && Math.abs(near - e) <= 1.5) e = near;
    }
    const page = { text: p, start: round(t), end: round(e) };
    t = e;
    return page;
  });
}

const round = (x: number) => Math.round(x * 1000) / 1000;

/** scene の cue → 章の頭からの秒。見つからない cue は警告して 0（最初から出す） */
function resolveReveal(scene: SceneData, lines: TimelineLine[], chStart: number, chTitle: string, warn: string[]): { reveal: Record<string, number>; lastLine: number } {
  const reveal: Record<string, number> = {};
  let lastLine = -1;
  const find = (key: string, cue: string | undefined) => {
    if (!cue) {
      reveal[key] = 0;
      return;
    }
    const i = lines.findIndex((l) => l.text.includes(cue));
    if (i < 0) {
      warn.push(`「${chTitle}」の cue「${cue}」に当たる台詞がありません（最初から出します）`);
      reveal[key] = 0;
      return;
    }
    reveal[key] = round(lines[i].start - chStart);
    lastLine = Math.max(lastLine, i);
  };
  switch (scene.type) {
    case "bigNumber":
    case "checklist":
      scene.items.forEach((it, i) => find(`item:${i}`, it.cue));
      break;
    case "bars":
      scene.rows.forEach((r, i) => {
        find(`item:${i}`, r.cue);
        if (r.min !== undefined) find(`min:${i}`, r.minCue ?? r.cue);
      });
      break;
    case "pairs":
    case "table":
      scene.rows.forEach((r, i) => find(`item:${i}`, r.cue));
      break;
  }
  return { reveal, lastLine };
}

export async function buildTimeline(dir: string, speed = DEFAULT_LONG_SPEED): Promise<{ timeline: Timeline; warnings: string[]; missing: number; staleCount: number }> {
  const md = readFileSync(join(dir, "script.md"), "utf8");
  const data = JSON.parse(readFileSync(join(dir, "data.json"), "utf8")) as LongData;
  const chapters = scriptChapters(md);
  const warnings: string[] = [];
  if (chapters.length !== data.chapters.length) throw new Error(`章の数が合いません（script.md ${chapters.length}・data.json ${data.chapters.length}）`);

  let t = 0;
  let missing = 0;
  let staleCount = 0;
  const stale = staleCacheIndex();
  const out: TimelineChapter[] = [];
  for (const [ci, ch] of chapters.entries()) {
    const d = data.chapters[ci];
    if (d.title !== ch.title) warnings.push(`${ci + 1}章の名前が違います（script.md「${ch.title}」・data.json「${d.title}」）`);
    if (ci > 0) t += CHAPTER_GAP;
    const chStart = t;
    const lines: TimelineLine[] = [];
    for (const [li, l] of ch.lines.entries()) {
      if (li > 0) t += LINE_GAP;
      const spoken = forVoice(l.text);
      const fresh = await synthesize(spoken, { speaker: SPEAKERS[l.who], speedScale: speed }, false);
      const staleFile = fresh ? undefined : stale.get(`${SPEAKERS[l.who]}|${speed}|${spoken}`);
      const clip = fresh ?? (staleFile ? { file: staleFile, dur: probe(staleFile) } : null);
      if (!clip) missing++;
      if (staleFile) staleCount++;
      const dur = clip?.dur ?? Array.from(l.text).length * SEC_PER_CHAR;
      lines.push({ who: l.who, text: l.text, start: round(t), end: round(t + dur), audio: clip?.file ?? null, estimated: !clip, stale: !!staleFile, pages: pagesWithTime(l.text, t, t + dur, clip?.file) });
      t += dur;
    }
    const { reveal, lastLine } = resolveReveal(d.scene, lines, chStart, ch.title, warnings);
    // 見本の静止画: 最後に出る項目の台詞（なければ真ん中の台詞）の最初のページの途中
    const sl = lines[lastLine >= 0 ? lastLine : Math.floor(lines.length / 2)];
    const p0 = sl.pages[0];
    const stillAt = round(Math.max(p0.start + 0.6, Math.min(p0.end - 0.1, (p0.start + p0.end) / 2)));
    out.push({ index: ci + 1, title: ch.title, start: round(chStart), end: round(t), cues: ch.cues, scene: { ...d.scene, reveal }, lines, stillAt });
  }
  return { timeline: { date: data.date, shops: data.shops, width: W, height: H, fps: FPS, speed, total: round(t), chapters: out }, warnings, missing, staleCount };
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

if (process.argv[1]?.replace(/\\/g, "/").endsWith("longform/timeline.ts")) {
  (async () => {
    const dir = process.argv[2];
    if (!dir) throw new Error("使い方: npx tsx longform/timeline.ts <台本のフォルダ> [--speed 1.15]");
    const i = process.argv.indexOf("--speed");
    const { timeline, warnings, missing, staleCount } = await buildTimeline(dir, i >= 0 ? Number(process.argv[i + 1]) : DEFAULT_LONG_SPEED);
    writeFileSync(join(dir, "timeline.json"), JSON.stringify(timeline, null, 2));
    for (const w of warnings) console.warn("注意:", w);
    const lines = timeline.chapters.reduce((a, c) => a + c.lines.length, 0);
    console.log(`${timeline.chapters.length} 章・${lines} 行・${fmt(timeline.total)}（声: 辞書が変わる前のキャッシュ ${staleCount} 行・なし ${missing} 行は文字数から見積もり）→ ${join(dir, "timeline.json")}`);
    for (const c of timeline.chapters) console.log(`${fmt(c.start)} ${c.title}  [${c.scene.type}]`);
  })();
}
