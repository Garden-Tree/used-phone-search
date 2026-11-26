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
import { CHAPTER_GAP, DEFAULT_LONG_SPEED, LINE_GAP, LONG_PAUSE, SPEAKERS, forVoice, scriptChapters } from "./script";
import { END_SCREEN, FPS, H, W, chapterShownAt, tailOf, wrapSubtitle } from "./scenes";
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

/**
 * 項目に台詞が触れた秒（11/23 ユーザー「内容に触れ始めたら一瞬震わせる」）。項目の言葉（ラベル・行の先頭の語）を含む台詞の始まりを、
 * 項目が出た後（出たその台詞は除く）から集める。キーは item:i、値は章の頭からの秒
 */
function keywordOf(text: string | undefined): string | null {
  if (!text) return null;
  const k = text.replace(/^(中古の|新品の)/, "").split(/[・（(→\s]| → /)[0].trim();
  return k.length >= 2 ? k : null; // 1字（「8」など）は「2028年」にも当たるので使わない
}
/** 項目ごとの言葉（ラベル・行の先頭の語） */
function itemWords(scene: SceneData): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  switch (scene.type) {
    case "bigNumber": scene.items.forEach((it, i) => (out[`item:${i}`] = keywordOf(it.label))); break;
    case "checklist": scene.items.forEach((it, i) => (out[`item:${i}`] = keywordOf(it.text.split(" → ").pop()))); break;
    case "bars": case "pairs": scene.rows.forEach((r, i) => (out[`item:${i}`] = (r as { say?: string }).say ?? keywordOf(r.label))); break;
    case "table": scene.rows.forEach((r, i) => (out[`item:${i}`] = keywordOf(r.cells[0]))); break;
    case "photo": (scene.points ?? []).forEach((it, i) => (out[`item:${i}`] = (it as { say?: string }).say ?? keywordOf(it.text))); break;
    default: break;
  }
  return out;
}

/** scene の cue → 章の頭からの秒。見つからない cue は警告して 0（最初から出す） */
function resolveReveal(scene: SceneData, lines: TimelineLine[], chStart: number, chTitle: string, warn: string[]): { reveal: Record<string, number>; lastLine: number } {
  const reveal: Record<string, number> = {};
  const words = itemWords(scene);
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
    // その台詞の中に項目の言葉があれば、言葉の位置まで遅らせる（棒が台詞に合わせて1本ずつ伸びる。11/23）
    const w = words[key];
    const l = lines[i];
    const idx = w ? l.text.indexOf(w) : -1;
    reveal[key] = round((idx > 0 ? l.start + ((l.end - l.start) * idx) / Math.max(1, l.text.length) : l.start) - chStart);
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
    case "photo":
      (scene.points ?? []).forEach((it, i) => find(`item:${i}`, it.cue));
      (scene.images ?? []).forEach((it, i) => find(`img:${i}`, it.cue));
      break;
    case "endScreen":
      // 項目は出し分けない（YouTube の要素を重ねる枠。章の絵と一緒に全部出す）
      break;
  }
  // 集中線（11/27〜）: その言葉を言い始める秒
  if (scene.burst) { words.burst = scene.burst; find("burst", scene.burst); }
  if (scene.type === "checklist") scene.items.forEach((it, i) => { if (it.checkCue) { words[`check:${i}`] = null; find(`check:${i}`, it.checkCue); } });
  // 同じ秒に出る項目が並んだら、0.2 秒ずつずらして上から順に出す（横棒が1本ずつ伸びる。11/23）
  if (scene.type === "bars") {
    const seen: Record<string, number> = {};
    for (const k of Object.keys(reveal).filter((k) => k.startsWith("item:"))) {
      const t0 = String(reveal[k]);
      const n = seen[t0] ?? 0;
      seen[t0] = n + 1;
      if (n > 0) reveal[k] = round(reveal[k] + 0.2 * n);
    }
  }
  return { reveal, lastLine };
}

function resolveMentions(scene: SceneData, lines: TimelineLine[], chStart: number, reveal: Record<string, number>): Record<string, number[]> {
  const words = Object.entries(itemWords(scene));
  const out: Record<string, number[]> = {};
  for (const [key, w] of words) {
    if (!w) continue;
    const at = reveal[key] ?? 0;
    // 台詞の中の位置で秒を割り振る（「電池交換、14 Pro、15、17e」を言うたびに震わせる。11/23）。出た瞬間から 0.3 秒以内は除く
    const ts: number[] = [];
    for (const l of lines) {
      for (let idx = l.text.indexOf(w); idx >= 0; idx = l.text.indexOf(w, idx + w.length)) {
        const tm = round(l.start + ((l.end - l.start) * idx) / Math.max(1, l.text.length) - chStart);
        if (tm > at + 0.3) ts.push(tm);
      }
    }
    if (ts.length) out[key] = ts;
  }
  return out;
}

/**
 * 蛍光ペン（11/27〜）: 台詞の頭（10字以内）に項目の言葉がある台詞の間だけ、その行に色を敷く。1つの台詞に1行だけ（いちばん前に出る言葉）。
 * 「Appleで256GBを買う値段より」のように後ろで触れただけの行は塗らない。値は章の頭からの [始め, 終わり]
 */
function resolveMarks(scene: SceneData, lines: TimelineLine[], chStart: number, reveal: Record<string, number>): Record<string, [number, number][]> {
  const words = Object.entries(itemWords(scene)).filter((e): e is [string, string] => !!e[1]);
  const out: Record<string, [number, number][]> = {};
  for (const l of lines) {
    let best: [string, number] | null = null;
    for (const [key, w] of words) {
      const idx = l.text.indexOf(w);
      if (idx >= 0 && idx < 10 && (!best || idx < best[1])) best = [key, idx];
    }
    if (!best) continue;
    const s0 = round(l.start - chStart), e0 = round(l.end - chStart);
    if (s0 < (reveal[best[0]] ?? 0) + 0.3) continue; // 出たその台詞は塗らない
    (out[best[0]] ??= []).push([s0, e0]);
  }
  return out;
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
      const fresh = await synthesize(spoken, { speaker: SPEAKERS[l.who], speedScale: speed, pauseLengthScale: LONG_PAUSE }, false);
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
    const mention = resolveMentions(d.scene, lines, chStart, reveal);
    // チェックリストの ✓（11/27〜）: 説明した秒（checkCue か最初に触れた秒）を早い順に並べ、上の項目から chk:i に当てる（上から順に付く）
    if (d.scene.type === "checklist" && d.scene.checks !== false) {
      const ts = d.scene.items.map((_, i) => reveal[`check:${i}`] ?? mention[`item:${i}`]?.[0]).filter((x): x is number => x !== undefined).sort((a, b) => a - b);
      ts.forEach((x, i) => (reveal[`chk:${i}`] = Math.max(x, reveal[`item:${i}`] ?? 0)));
    }
    const marks = resolveMarks(d.scene, lines, chStart, reveal);
    out.push({ index: ci + 1, title: ch.title, start: round(chStart), end: round(t), cues: ch.cues, scene: { ...d.scene, reveal, mention, marks }, lines, stillAt });
  }
  const timeline: Timeline = { date: data.date, shops: data.shops, width: W, height: H, fps: FPS, speed, total: round(t), chapters: out };
  // 終了画面: 最後の章だけ・絵が出てから最後の台詞の終わりまでが END_SCREEN.sec 秒以内（超えると要素が出る前に台詞が始まる）
  out.forEach((c, i) => {
    if (c.scene.type === "endScreen" && i !== out.length - 1) warnings.push(`「${c.title}」（終了画面）は最後の章にしてください`);
  });
  const last = out[out.length - 1];
  if (last?.scene.type === "endScreen") {
    const spoken = round(timeline.total - chapterShownAt(last));
    if (spoken > END_SCREEN.sec) warnings.push(`終了画面の章の台詞が ${spoken} 秒あります（${END_SCREEN.sec} 秒以内に。終了画面は最後の ${END_SCREEN.sec} 秒しか置けない）`);
    else console.log(`終了画面: 台詞 ${spoken} 秒＋BGM だけ ${round(tailOf(timeline))} 秒＝${END_SCREEN.sec} 秒`);
  }
  return { timeline, warnings, missing, staleCount };
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
