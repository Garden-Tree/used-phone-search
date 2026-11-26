/**
 * 横動画（1920x1080・30fps）を書き出す。土台（章・字幕のページ・項目・揺れが変わるところだけの PNG）に、毎コマ動く
 * 話している人の立ち絵と字幕の縁の線（小さな透明の PNG）を ffmpeg が毎コマ重ねる（11/24〜。層ごとに concat の一覧）
 *
 *   npx tsx longform/video.tsx longform/2026-10-21-iphone-dore            # 全部（plan → frames → encode → audio → mux → meta）
 *   npx tsx longform/video.tsx longform/2026-10-21-iphone-dore plan       # 区切りの数と見積もりだけ
 *   npx tsx longform/video.tsx longform/2026-10-21-iphone-dore check      # 書き出した video.mp4 の長さ・音量・同期・見本（stills/check-*.png）
 *   ほかに frames / encode / audio / mux / meta（chapters.txt・youtube.txt・thumbnail.png）を1つずつ
 *
 * - 先に voice-draft.ts（今の辞書で声を合成）→ timeline.ts（声の長さから時間割）。古い声（stale）・見積もりの行があれば止める
 * - PNG は LONGFORM_JOBS 本で並べて作る・ffmpeg は LONGFORM_FF_THREADS スレッド・優先度「低」（このプロセスも「通常以下」）
 * - 項目は 0.4 秒かけて出さず、出る秒で一度に出す（切り替え）
 * - 立ち絵: longform/assets/chara/tsumugi.png・zundamon.png（口の開いた絵 tsumugi-talk.png・zundamon-talk.png は任意）。
 *   口は声の大きさで開ける（声の波形がなければ 0.2 秒ごとに開閉）
 * - 音: 声（voice-draft/joined.wav）を -16 LUFS にそろえ、BGM（shorts/assets/bgm.mp3）をくり返して 0.07 倍・頭2秒で上げ・最後4秒で下げる。
 *   2章目からは章の絵が出る秒（声の 0.9 秒前・章の間）に短いジングル（その場で合成した 3音・約0.75秒。外の音源は使わない）。
 *   全体を loudnorm の2パスで -14 LUFS・真のピーク -1 dB
 * - 出力（<フォルダ>/）: video.mp4・chapters.txt・youtube.txt・thumbnail.png（1280x720）。途中のファイルは frames/
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";
import { ImageResponse } from "next/og";
import { ON_DARK, SITE } from "@/lib/brandColors";
import { modelPagePath } from "@/lib/catalog";
import { longFonts } from "./fonts";
import { loadCharaArt } from "./art";
import { visemesOf } from "../shorts/voice";
import { ANIM_STEPS, END_SCREEN, FPS, H, LAYOUT_NAME, MIN_FONT, W, animAt, animEvents, chapterShownAt, emptySprite, growPoints, ringPx, ringSprite, speakerDy, speakerSprite, spriteRegion, subDy, subProgress, plateOpacity, plateFadePoints, fontProblems, endScreenWindow, frameAt, localAt, revealedAt, stateAt, tailOf, lineExpr, type CharaArt, type Expr } from "./scenes";
import type { Who } from "./script";
import type { LongData, ThumbnailData, Timeline } from "./types";

// 最後の台詞のあとに残す秒は scenes.tsx の tailOf（ふだん 1.5 秒。終了画面があれば最後の 20 秒をそろえる）
const BGM_VOLUME = 0.07;
const VOICE_LUFS = -16;
/** 口の開閉（秒） */
const MOUTH = 0.2;
/** utm_campaign は フォルダ名の日付から（2026-10-21-iphone-dore → long_20261021） */
const campaignOf = (dir: string) => `long_${(dir.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "").slice(0, 10).replace(/-/g, "")}`;
/** script.md の「## 概要欄（下書き）」でこの行を置いた所に、実測のチャプターを入れる */
const CHAPTERS_PLACEHOLDER = "（チャプターは書き出し後の実測）";
/** ジングルのピーク（dBFS。声を -16 LUFS にそろえた段で混ぜる。声より控えめ） */
const JINGLE_PEAK_DB = -18;
const SITE_URL = "https://used.gadelog.com";

const ROOT = resolve(__dirname, "..");
/** BGM: longform/assets/sound/ にある曲（OpenTracks「Cyber Society」by のる・ループ版）。なければショートの BGM */
const BGM_LONG = join(ROOT, "longform/assets/sound/Cyber_Society_2.mp3");
const BGM = existsSync(BGM_LONG) ? BGM_LONG : join(ROOT, "shorts/assets/bgm.mp3");
const BGM_CREDIT = existsSync(BGM_LONG) ? "BGM: Cyber Society by のる（OpenTracks）" : "BGM: Okay For Now - Televisions（YouTube オーディオライブラリ）";
/** 章のジングル: 効果音ラボ「シーン切り替え1」（クレジット不要・収益化可）。なければ自作の3音 */
const JINGLE_FILE = join(ROOT, "longform/assets/sound/sceneswitch1.mp3");

// このプロセスと子（ffmpeg）を低い優先度で動かす（Windows では子は親の「通常以下」を受け継ぐ）
try {
  os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
} catch {}

const fmtClock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const now = () => performance.now() / 1000;
/** 9:41.2 のように 0.1 秒まで（終了画面の開始秒。Studio の入力に使う） */
const fmtSec = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(1).padStart(4, "0")}`;

/** ffmpeg を1本だけ・優先度「低」で動かして終わるのを待つ */
function ffmpeg(args: string[], label: string): Promise<string> {
  return new Promise((res, rej) => {
    const t0 = now();
    const p = spawn("ffmpeg", ["-hide_banner", "-nostats", "-loglevel", "info", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    try {
      if (p.pid) os.setPriority(p.pid, os.constants.priority.PRIORITY_LOW);
    } catch {}
    let err = "";
    p.stderr.on("data", (d) => {
      err += d;
      if (err.length > 4_000_000) err = err.slice(-2_000_000);
    });
    p.on("close", (code) => {
      if (code !== 0) return rej(new Error(`ffmpeg（${label}）が失敗しました\n${err.slice(-3000)}`));
      console.log(`  ${label}: ${(now() - t0).toFixed(1)} 秒`);
      res(err);
    });
  });
}

const probe = (file: string) => Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).stdout.trim());

/** loudnorm の測定（JSON） */
async function measure(file: string, extra = ""): Promise<Record<string, string>> {
  const err = await ffmpeg(["-i", file, "-af", `${extra}loudnorm=I=-14:TP=-1:LRA=11:print_format=json`, "-f", "null", "-"], `音量の測定 ${file.split(/[\\/]/).pop()}`);
  return JSON.parse(err.slice(err.lastIndexOf("{"), err.lastIndexOf("}") + 1)) as Record<string, string>;
}

// ───────── 区切り ─────────

/**
 * 1枚の絵の作り方（frames/todo.json に入れ、子のプロセスが分けて作る）。
 * base＝土台（話している人の立ち絵と字幕の縁の線を除いた 1920x1080）・spk＝話している人の立ち絵だけ・ring＝縁の線だけ・none＝透明
 */
type Job =
  | { f: string; k: "base"; t: number; level: number }
  | { f: string; k: "spk"; who: Who; open: boolean; dy: number; expr?: Expr; vowel?: string }
  | { f: string; k: "ring"; who: Who; px: number; dy: number }
  | { f: string; k: "none"; w: number; h: number };
/** 重ねる層（土台・左の立ち絵・右の立ち絵・縁の線）。層ごとに「何コマ目からどの絵か」の並び */
const TRACKS = ["base", "ずんだもん", "つむぎ", "ring"] as const;
type Track = (typeof TRACKS)[number];
type Run = { frame: number; job: Job };
type Plan = { runs: Record<Track, Run[]>; jobs: Map<string, Job>; totalFrames: number; points: number };

/**
 * 声の大きさ（0〜3）を 0.1 秒ごとに（voice-draft/joined.wav・16bit。11/23〜: 口の開閉と立ち絵の揺れを声の波形に合わせる）。
 * 段: -42 dBFS 未満 0・-32 未満 1・-24 未満 2・それ以上 3
 */
const LEVEL_STEP = 0.1;
function voiceLevels(dir: string): number[] {
  const f = join(dir, "voice-draft", "joined.wav");
  if (!existsSync(f)) return [];
  const b = readFileSync(f);
  let off = 12, rate = 24000, ch = 1, dataAt = -1, dataLen = 0;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4), len = b.readUInt32LE(off + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(off + 10); rate = b.readUInt32LE(off + 12); }
    if (id === "data") { dataAt = off + 8; dataLen = Math.min(len, b.length - off - 8); break; }
    off += 8 + len + (len % 2);
  }
  if (dataAt < 0) return [];
  const n = Math.floor(dataLen / 2 / ch), win = Math.round(rate * LEVEL_STEP), out: number[] = [];
  for (let i = 0; i < n; i += win) {
    let sum = 0, cnt = 0;
    for (let k = i; k < Math.min(n, i + win); k++) { const v = b.readInt16LE(dataAt + k * 2 * ch) / 32768; sum += v * v; cnt++; }
    const db = 10 * Math.log10(sum / Math.max(1, cnt) + 1e-12);
    const raw = db < -42 ? 0 : db < -32 ? 1 : db < -24 ? 2 : 3;
    // 急に跳ねないよう、0.1 秒に1段までしか変えない（イージングの代わり。11/23 ユーザー「控えめに」）
    const prev = out.length ? out[out.length - 1] : 0;
    out.push(raw > prev ? prev + 1 : raw < prev ? prev - 1 : prev);
  }
  return out;
}

/**
 * 絵を決めるもの（画面のコード・立ち絵・章の中身・字幕・状態）の指紋。同じ指紋の PNG は前の書き出しのものを使い回す（11/23・速くする）
 */
function codeHash(): string {
  // 配置（LONGFORM_LAYOUT）でも絵が変わる
  const h = createHash("sha1").update(LAYOUT_NAME);
  for (const f of ["longform/scenes.tsx", "longform/types.ts", "longform/fonts.ts", "longform/art.ts"]) if (existsSync(f)) h.update(readFileSync(f));
  const chara = "longform/assets/chara";
  if (existsSync(chara)) for (const f of readdirSync(chara).sort()) h.update(f + statSync(join(chara, f)).size);
  return h.digest("hex").slice(0, 12);
}
const sha = (v: unknown) => createHash("sha1").update(JSON.stringify(v)).digest("hex").slice(0, 20);

/**
 * 絵が変わる秒（章・台詞の始まりと終わり・字幕のページ・項目が出る秒・話している間は毎コマ）を集め、秒はコマ（1/30 秒）に丸める
 * （同じコマに2つ来たら後のほうを使う）。11/24〜: 各秒の絵を4つの層に分け、層ごとに前と同じ絵ならまとめる。
 * 土台（1920x1080）は章・字幕・項目・揺れが変わるときだけ作り、毎コマ動く「話している人の立ち絵（声で揺れる・口）」と
 * 「字幕の縁の線（残り時間）」は小さな絵（数百枚）にして、ffmpeg が毎コマ重ねる（30fps のまま。PNG の枚数と ffmpeg の読み込みが減る）
 */
/** 台詞の時刻 → 母音（visemes は [秒, 母音] の並び） */
function vowelAt(vis: [number, string][] | undefined, u: number): string | undefined {
  if (!vis) return undefined;
  let v = "_";
  for (const [s0, x] of vis) { if (s0 > u) break; v = x; }
  return v;
}

function plan(tl: Timeline, art: CharaArt, levels: number[] = [], vis: Map<string, [number, string][]> = new Map()): Plan {
  const code = codeHash();
  const chHash = new Map(tl.chapters.map((c) => [c.index, createHash("sha1").update(JSON.stringify([c.title, c.scene, c.lines.map((l) => [l.who, l.pages.map((p) => p.text)]), tl.chapters.length, tl.date])).digest("hex").slice(0, 12)]));
  const total = tl.total + tailOf(tl);
  const totalFrames = Math.round(total * FPS);
  const points = new Set<number>([0]);
  for (const ch of tl.chapters) {
    points.add(chapterShownAt(ch));
    points.add(ch.start);
    for (const r of Object.values(ch.scene.reveal)) if (r > 0) points.add(ch.start + r);
    for (const l of ch.lines) {
      points.add(l.start);
      points.add(l.end);
      for (const p of l.pages) points.add(p.start);
    }
  }
  // 揺れ（出来事の 1〜8 コマ後）
  for (const e of animEvents(tl)) for (const j of ANIM_STEPS) points.add(e + j / FPS);
  // 名前の札が消える間
  for (const t of plateFadePoints()) points.add(Math.round(t * 1000) / 1000);
  // 横棒が伸びる間
  for (const t of growPoints(tl)) points.add(Math.round(t * 1000) / 1000);
  // 話している間の字幕の縁・立ち絵の揺れは MOTION_STEP（既定 1＝毎コマ。11/24 に 15Hz を試したがユーザーが 30 に戻した）。
  // 声の波形がなければ、口の開閉（MOUTH 秒ごと）の秒
  const step = levels.length ? MOTION_STEP : Math.round(MOUTH * FPS);
  for (const ch of tl.chapters) for (const l of ch.lines) {
    const f0 = levels.length ? Math.ceil(l.start * FPS / step) * step : Math.round(l.start * FPS);
    for (let f = f0; f / FPS < l.end; f += step) points.add(f / FPS);
  }
  const levelAt = (t: number) => {
    const x = t / LEVEL_STEP, i = Math.floor(x), a = levels[i] ?? 0, b = levels[i + 1] ?? a;
    return Math.round((a + (b - a) * (x - i)) * 10) / 10;
  };
  // 同じコマに2つ来たら後のほう
  const byFrame = new Map<number, number>();
  for (const t of [...points].filter((x) => x >= 0 && x < total).sort((a, b) => a - b)) byFrame.set(Math.round(t * FPS), t);
  const jobs = new Map<string, Job>();
  const runs = Object.fromEntries(TRACKS.map((k) => [k, [] as Run[]])) as Record<Track, Run[]>;
  const none = (k: Track): Job => {
    const R = spriteRegion(k === "base" ? "ring" : k);
    return { f: `s-none-${R.w}x${R.h}`, k: "none", w: R.w, h: R.h };
  };
  const push = (k: Track, frame: number, job: Job) => {
    const list = runs[k];
    if (list.length && list[list.length - 1].job.f === job.f) return;
    if (!jobs.has(job.f)) jobs.set(job.f, job);
    list.push({ frame, job });
  };
  const artKeys = Object.keys(art).sort();
  for (const [frame, t] of [...byFrame.entries()].sort((a, b) => a[0] - b[0])) {
    const st = stateAt(tl, t);
    const who = st.line?.who ?? null;
    const a = who ? art[who] : undefined;
    const anim = animAt(tl, t);
    const moving = anim.sub !== undefined || anim.spk !== undefined || Object.keys(anim.items).length > 0 || Object.keys(anim.shake).length > 0 || Object.keys(anim.grow).length > 0;
    const level = levels.length && st.talking && a ? levelAt(t) : 0;
    // 口: 声の波形があれば声の大きさで（0.5 以上で開く）。なければ話している間 MOUTH 秒ごとに開閉（揺れている間は閉じる）
    const lineFrame = st.line ? Math.round(st.line.start * FPS) : 0;
    // リップシンク（11/27〜 LONGFORM_LIPSYNC=1）: 声の母音で口の形を選ぶ。開く・閉じるも母音で決める
    const vowel = st.line && st.talking ? vowelAt(vis.get(st.line.audio ?? ""), t - st.line.start) : undefined;
    const open = vowel !== undefined ? vowel !== "_" : !!(a?.talk && st.talking && (levels.length ? level >= 0.5 : !moving && Math.floor((frame - lineFrame) / step) % 2 === 0));
    // 土台: 話している人の立ち絵・縁の線・声の大きさ・口を含めない
    const { spk: _spk, ...animBase } = anim;
    const key = JSON.stringify([st.ch.index, st.li, st.pi, revealedAt(st.ch.scene.reveal, localAt(st.ch, t)).sort(), animBase, plateOpacity(t)]);
    const plate = t <= 10;
    push("base", frame, { f: `c-${sha(["layers1", code, chHash.get(st.ch.index), key, plate, artKeys])}`, k: "base", t, level });
    for (const side of ["ずんだもん", "つむぎ"] as const) {
      if (who === side && a) {
        const dy = Math.round(speakerDy(anim.spk, level) * 1e6) / 1e6;
        const expr = EXPR_ON && st.line ? lineExpr(side, st.line.text) : undefined;
        push(side, frame, { f: `s-${sha(["spk", code, side, open, dy, expr ?? "", vowel ?? ""])}`, k: "spk", who: side, open, dy, expr, vowel });
      } else push(side, frame, none(side));
    }
    const px = ringPx(who, subProgress(tl, t));
    if (who && px) {
      const dy = subDy(anim.sub);
      push("ring", frame, { f: `s-${sha(["ring", code, who, px, dy])}`, k: "ring", who, px, dy });
    } else push("ring", frame, none("ring"));
  }
  return { runs, jobs, totalFrames, points: byFrame.size };
}

// ───────── 各段 ─────────

/** 表情を台詞で切り替える（12/1 の回から標準・11/27 ユーザー。LONGFORM_EXPR=0 で止める） */
const EXPR_ON = process.env.LONGFORM_EXPR !== "0";
/** ffmpeg のスレッド数（11/23〜 ユーザー「CPU をガンガン使っていい」。既定 論理コア数 − 2・LONGFORM_FF_THREADS で変える） */
const FF_THREADS = String(Number(process.env.LONGFORM_FF_THREADS ?? Math.max(1, os.cpus().length - 2)));
/** 話している間の動き（字幕の縁・立ち絵）を何 Hz で描くか（既定 30＝毎コマ。11/24 ユーザー「15Hz にしないで」。LONGFORM_MOTION_HZ で変える） */
const MOTION_STEP = Math.max(1, Math.round(FPS / Number(process.env.LONGFORM_MOTION_HZ ?? 30)));
/** PNG を並べて作る数（11/23 ユーザー「CPU をガンガン使っていい・24スレッド」）。既定は論理コア数 − 2。LONGFORM_JOBS で変える（1 で1本） */
const JOBS = Math.max(1, Number(process.env.LONGFORM_JOBS ?? Math.max(1, os.cpus().length - 2)));

/** 子のプロセスを n 本立てて、PNG を k 番目ずつ分けて作る（子は frames-part k n で呼ばれる） */
async function renderFramesParallel(dir: string, total: number, n: number) {
  const t0 = now();
  console.log(`  ${n} 本で並べて作る（PNG ${total} 枚）`);
  await Promise.all(Array.from({ length: n }, (_, k) => new Promise<void>((ok, ng) => {
    const child = spawn("npx", ["tsx", "longform/video.tsx", dir, "frames-part", String(k), String(n)], { shell: true, stdio: ["ignore", "ignore", "inherit"] });
    child.on("exit", (code) => (code === 0 ? ok() : ng(new Error(`PNG の子 ${k} が失敗（${code}）`))));
  })));
  console.log(`  PNG ${total} 枚（${(now() - t0).toFixed(0)} 秒）`);
}

async function renderFrames(tl: Timeline, art: CharaArt, work: string, part?: { k: number; n: number }) {
  const fonts = await longFonts(tl);
  const all = JSON.parse(readFileSync(join(work, "todo.json"), "utf8")) as Job[];
  const jobs = part ? all.filter((_, x) => x % part.n === part.k) : all;
  const t0 = now();
  for (const [n, j] of jobs.entries()) {
    const el =
      j.k === "base" ? frameAt(tl, j.t, { instant: true, art, level: j.level, layer: "base" })
      : j.k === "spk" ? speakerSprite(j.who, art[j.who]!, j.open, j.dy, j.expr, j.vowel)
      : j.k === "ring" ? ringSprite(j.who, j.px, j.dy)
      : emptySprite(j.w, j.h);
    const size = j.k === "base" ? { width: W, height: H } : j.k === "none" ? { width: j.w, height: j.h } : (({ w, h }) => ({ width: w, height: h }))(spriteRegion(j.k === "spk" ? j.who : "ring"));
    const res = new ImageResponse(el, { ...size, fonts });
    writeFileSync(join(work, `${j.f}.png`), Buffer.from(await res.arrayBuffer()));
    if (!part && ((n + 1) % 100 === 0 || n + 1 === jobs.length)) {
      const el2 = now() - t0;
      console.log(`  PNG ${n + 1}/${jobs.length}（${el2.toFixed(0)} 秒・残り約 ${(((jobs.length - n - 1) * el2) / (n + 1)).toFixed(0)} 秒）`);
    }
  }
}

/**
 * ffmpeg の concat の一覧（1枚ごとの長さ）。長さはコマの境目の秒（6桁）の差にして、何千枚つないでも丸めの誤差がたまらないようにする
 */
function concatList(runs: Run[], totalFrames: number): string {
  const out = ["ffconcat version 1.0"];
  const sec = (f: number) => (f / FPS).toFixed(6);
  runs.forEach((r, i) => {
    const end = i + 1 < runs.length ? runs[i + 1].frame : totalFrames;
    // option framerate 30: PNG の読み込みの時間の単位を 1/30 秒に（既定の 1/25 秒だと切り替えが 1/25 秒の刻みに丸められ、
    // 6コマに1コマ落ちていた。11/24 に見つけた）
    out.push(`file '${r.job.f}.png'`, `option framerate ${FPS}`, `duration ${(Number(sec(end)) - Number(sec(r.frame))).toFixed(6)}`);
  });
  // concat は最後の1枚の長さを使わないので、もう1度並べる
  out.push(`file '${runs[runs.length - 1].job.f}.png'`, `option framerate ${FPS}`);
  return out.join("\n") + "\n";
}
const LIST: Record<Track, string> = { base: "list.txt", ずんだもん: "list-left.txt", つむぎ: "list-right.txt", ring: "list-ring.txt" };
function writeLists(work: string, p: Plan) {
  for (const k of TRACKS) writeFileSync(join(work, LIST[k]), concatList(p.runs[k], p.totalFrames));
}

/** GPU（AMD AMF）で映像を作る（LONGFORM_GPU=1 のときだけ）。11/23 に比べたら CPU（libx264・16スレッド）79 秒・GPU 128 秒で CPU が速かった（PNG を読む側が重い） */
const USE_GPU = process.env.LONGFORM_GPU === "1";

/**
 * 映像: 土台の一覧に、立ち絵（左・右）と縁の線の一覧を毎コマ重ねる（どれも 30fps にそろえてから）。
 * いつも透明な層（立ち絵がない人など）は読まない
 */
async function encode(work: string, preset: string, p: Plan, tl?: Timeline) {
  // チャンネル登録の重ねも、ここで一緒に（映像を2回作らない）
  const at = tl ? subscribeAt(tl) : null;
  const sub = at !== null && existsSync(SUBSCRIBE_GB);
  const T = (at ?? 0).toFixed(3);
  const inputs: string[] = ["-f", "concat", "-safe", "0", "-i", join(work, LIST.base)];
  const chain: string[] = [`[0:v]fps=${FPS},format=yuv420p[l0]`];
  let last = "l0", n = 1;
  for (const k of ["ずんだもん", "つむぎ", "ring"] as const) {
    if (p.runs[k].every((r) => r.job.k === "none")) continue;
    const R = spriteRegion(k);
    inputs.push("-f", "concat", "-safe", "0", "-i", join(work, LIST[k]));
    chain.push(`[${n}:v]fps=${FPS},format=yuva420p[s${n}]`, `[${last}][s${n}]overlay=${R.x}:${R.y}:format=yuv420:eof_action=repeat[l${n}]`);
    last = `l${n}`;
    n++;
  }
  if (sub) {
    inputs.push("-i", SUBSCRIBE_GB);
    chain.push(`[${n}:v]trim=0:${SUBSCRIBE_SEC},setpts=PTS-STARTPTS+${T}/TB,chromakey=0x00FF01:0.15:0.02,despill=type=green,format=yuva444p,split[ck][ka]`, `[ka]alphaextract,erosion[ke]`, `[ck][ke]alphamerge[ov]`, `[${last}][ov]overlay=0:0:enable='between(t,${T},${((at ?? 0) + SUBSCRIBE_SEC).toFixed(3)})':eof_action=pass,format=yuv420p[v]`);
  } else chain.push(`[${last}]format=yuv420p[v]`);
  const codec = USE_GPU
    ? ["-c:v", "h264_amf", "-quality", "quality", "-rc", "cqp", "-qp_i", "18", "-qp_p", "20", "-qp_b", "22", "-g", String(FPS * 10)]
    : ["-c:v", "libx264", "-preset", preset, "-tune", "stillimage", "-crf", "20", "-g", String(FPS * 10), "-threads", FF_THREADS, "-x264-params", `threads=${FF_THREADS}`];
  await ffmpeg(
    ["-y", "-threads", FF_THREADS, ...inputs, "-filter_complex", chain.join(";"), "-map", "[v]", "-frames:v", String(p.totalFrames + 1), "-fps_mode", "cfr", ...codec, "-an", "-movflags", "+faststart", join(work, "video-only.mp4")],
    `映像（${USE_GPU ? "GPU h264_amf" : `H.264 ${preset}`}・重ねる層 ${n - 1}${sub ? `・チャンネル登録 ${T} 秒` : ""}）`,
  );
}

/**
 * 章のジングル（WAV・48kHz ステレオ）をその場で作る。E5→G#5→B5（ホ長調の和音を下から）を 0.11 秒おきに、
 * 正弦波＋弱い2倍音（鈴っぽく）・立ち上がり 4ms・指数で減衰。全体 0.75 秒・最後の 40ms で消す。外の音源は使わない
 */
function makeJingle(file: string) {
  const rate = 48000, len = 0.75;
  const notes = [{ f: 659.25, at: 0, tau: 0.14 }, { f: 830.61, at: 0.11, tau: 0.14 }, { f: 987.77, at: 0.22, tau: 0.22 }];
  const n = Math.round(rate * len);
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    for (const nt of notes) {
      const u = t - nt.at;
      if (u < 0) continue;
      const env = Math.min(1, u / 0.004) * Math.exp(-u / nt.tau);
      x[i] += env * (Math.sin(2 * Math.PI * nt.f * u) + 0.25 * Math.exp(-u / 0.05) * Math.sin(4 * Math.PI * nt.f * u));
    }
    x[i] *= Math.min(1, (len - t) / 0.04);
  }
  const peak = x.reduce((a, v) => Math.max(a, Math.abs(v)), 0);
  const k = 10 ** (JINGLE_PEAK_DB / 20) / peak;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.round(x[i] * k * 32767);
    buf.writeInt16LE(v, 44 + i * 4);
    buf.writeInt16LE(v, 46 + i * 4);
  }
  writeFileSync(file, buf);
}

async function audio(dir: string, tl: Timeline, work: string) {
  const voice = join(dir, "voice-draft/joined.wav");
  if (!existsSync(voice)) throw new Error(`声がありません: ${voice}（先に voice-draft.ts）`);
  const vd = probe(voice);
  if (Math.abs(vd - tl.total) > 0.1) throw new Error(`声の長さ（${vd.toFixed(2)} 秒）と時間割（${tl.total} 秒）が合いません。voice-draft.ts → timeline.ts をやり直す`);
  if (!existsSync(BGM)) throw new Error(`BGM がありません: ${BGM}`);
  const total = tl.total + tailOf(tl);
  // 声・BGM・ジングルの位置・長さが前と同じなら、前の audio.m4a を使い回す（11/24 ユーザー「声が変わっていない時は使い回す」）
  const at0 = tl.chapters.slice(1).map((c) => Math.round(chapterShownAt(c) * 1000));
  const fileKey = (f: string) => (existsSync(f) ? createHash("sha1").update(readFileSync(f)).digest("hex") : "none");
  const akey = createHash("sha1").update(JSON.stringify([fileKey(voice), fileKey(BGM), fileKey(JINGLE_FILE), total, at0, VOICE_LUFS, BGM_VOLUME, "audio-v1"])).digest("hex").slice(0, 16);
  const cached = join(work, `audio-${akey}.m4a`);
  if (existsSync(cached)) {
    copyFileSync(cached, join(work, "audio.m4a"));
    console.log(`  音は前と同じ → 使い回す（audio-${akey}.m4a）`);
    return;
  }
  const vm = await measure(voice);
  const gain = VOICE_LUFS - Number(vm.input_i);
  console.log(`  声 ${Number(vm.input_i).toFixed(1)} LUFS → ${gain >= 0 ? "+" : ""}${gain.toFixed(1)} dB で ${VOICE_LUFS} LUFS に`);
  const stereo = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo";
  const mix = join(work, "mix.wav");
  const jingle = join(work, "jingle.wav");
  if (existsSync(JINGLE_FILE)) {
    // 48kHz ステレオの WAV にして、ピークを JINGLE_PEAK_DB にそろえる
    await ffmpeg(["-y", "-threads", "2", "-i", JINGLE_FILE, "-af", "aresample=48000,aformat=channel_layouts=stereo,volume=-8dB", "-c:a", "pcm_s16le", jingle], "ジングルを読み込む");
  } else makeJingle(jingle);
  const at = tl.chapters.slice(1).map((c) => Math.round(chapterShownAt(c) * 1000));
  const jingles = `[2:a]${stereo},asplit=${at.length}${at.map((_, i) => `[j${i}]`).join("")};` + at.map((ms, i) => `[j${i}]adelay=${ms}|${ms}[d${i}];`).join("");
  console.log(`  ジングル ${at.length} か所（${at.map((ms) => fmtClock(ms / 1000)).join("・")}）`);
  await ffmpeg(
    ["-y", "-threads", "2", "-i", voice, "-stream_loop", "-1", "-i", BGM, "-i", jingle, "-filter_complex",
      `[0:a]${stereo},volume=${gain.toFixed(2)}dB,apad=whole_dur=${total}[v];` +
      `[1:a]${stereo},atrim=0:${total},asetpts=PTS-STARTPTS,volume=${BGM_VOLUME},afade=t=in:st=0:d=2,afade=t=out:st=${(total - 4).toFixed(3)}:d=4[b];` +
      jingles +
      `[v][b]${at.map((_, i) => `[d${i}]`).join("")}amix=inputs=${at.length + 2}:duration=first:normalize=0[a]`,
      "-map", "[a]", "-t", String(total), "-c:a", "pcm_s16le", mix],
    "声と BGM を混ぜる",
  );
  const m = await measure(mix);
  const second = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
  await ffmpeg(["-y", "-threads", "2", "-i", mix, "-af", second, "-c:a", "aac", "-b:a", "192k", join(work, "audio.m4a")], "-14 LUFS（2パス目）");
  copyFileSync(join(work, "audio.m4a"), cached);
}

/**
 * チャンネル登録のお願いの台詞（終了画面の章を除いて、最初に「チャンネル登録」を言う台詞）に、グリーンバックの動きを全画面で重ねる（11/23）。
 * 素材: みりんの動画素材「チャンネル登録01」（商用・YouTube の収益化可・表記は任意）に、効果音ラボ「クリック」（商用可・表記不要）を
 * クリックの3か所（2.05・3.05・4.25 秒）に重ねたもの。音も本編の音に足す
 */
const SUBSCRIBE_GB = "longform/assets/gb/subscribe-jp-like-bell-green-1080-miirriin01-click.mp4";
const SUBSCRIBE_SEC = 8;
function subscribeAt(tl: Timeline): number | null {
  for (const ch of tl.chapters) {
    if (ch.scene.type === "endScreen") continue;
    const l = ch.lines.find((x) => x.text.includes("チャンネル登録"));
    if (l) return l.start;
  }
  return null;
}

async function mux(dir: string, work: string, tl?: Timeline) {
  const at = tl ? subscribeAt(tl) : null;
  if (at !== null && existsSync(SUBSCRIBE_GB)) {
    // 映像は encode で重ね済み。ここではクリック音だけを本編の音に足す（映像はそのまま写す）
    const ms = Math.round(at * 1000);
    const fc = `[2:a]atrim=0:${SUBSCRIBE_SEC},aresample=48000,adelay=${ms}|${ms},volume=0.8[ca];[1:a][ca]amix=inputs=2:duration=first:normalize=0[a]`;
    await ffmpeg(["-y", "-i", join(work, "video-only.mp4"), "-i", join(work, "audio.m4a"), "-i", SUBSCRIBE_GB, "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", join(dir, "video.mp4")], `映像と音をまとめる（チャンネル登録の音 ${at.toFixed(3)} 秒）`);
    return;
  }
  await ffmpeg(["-y", "-i", join(work, "video-only.mp4"), "-i", join(work, "audio.m4a"), "-map", "0:v", "-map", "1:a", "-c", "copy", "-shortest", "-movflags", "+faststart", join(dir, "video.mp4")], "映像と音をまとめる");
}

// ───────── 説明文・チャプター・サムネ ─────────

function chaptersText(tl: Timeline): string {
  return tl.chapters.map((c, i) => `${fmtClock(i === 0 ? 0 : c.start)} ${c.title}`).join("\n") + "\n";
}

function youtubeText(dir: string, tl: Timeline, artFiles: string[]): string {
  const md = readFileSync(join(dir, "script.md"), "utf8");
  const title = md.match(/^## タイトル案\s*\n1\.\s*(.+)$/m)?.[1]?.trim();
  if (!title) throw new Error("script.md の「## タイトル案」の 1. が見つかりません");
  const data = JSON.parse(readFileSync(join(dir, "data.json"), "utf8")) as LongData;
  const date = data.date.replace(/-/g, "/");
  const first = data.chapters[0].scene;
  const last = data.chapters[data.chapters.length - 1].scene;
  const conclusion = first.type === "bigNumber" ? first.items.map((it) => `${it.label ?? ""}${it.value}`).join("、") : "";
  const summary = last.type === "table" ? last.rows.map((r) => r.cells.join(" ")).join("\n") : "";
  const utm = `utm_source=youtube&utm_medium=social&utm_campaign=${campaignOf(dir)}`;
  const link = (path: string) => `${SITE_URL}${path}?${utm}`;
  const credits = ["VOICEVOX:春日部つむぎ", "VOICEVOX:ずんだもん", BGM_CREDIT];
  if (existsSync(JINGLE_FILE)) credits.push("効果音：効果音ラボ");
  // 立ち絵（chara.py で作った絵を使ったとき）。つむぎ＝春日部つくし（KASUKABEproject）・ずんだもん＝坂本アヒル
  if (artFiles.some((f) => /tsumugi/.test(f))) credits.push("立ち絵：春日部つむぎ公式立ち絵(KASUKABEproject)");
  if (artFiles.some((f) => /zundamon/.test(f))) credits.push("ずんだもん立ち絵：坂本アヒル様");
  // 写真・公式のスクショの出典（data.json の photo の credit。同じものは1回）
  for (const c of new Set(data.chapters.flatMap((ch) => (ch.scene.type === "photo" ? [ch.scene.credit, ...(ch.scene.images ?? []).map((i) => i.credit)].filter(Boolean) : [])))) credits.push(`画像：${c}`);
  // script.md に概要欄の下書き（チャプターの置き場所つき）があれば、それを本文にする。クレジットはここで作る
  const draft = md.match(/^## 概要欄（下書き）\s*\n```\s*\n([\s\S]*?)\n```/m)?.[1];
  if (draft?.includes(CHAPTERS_PLACEHOLDER)) {
    const lines = draft.split(/\r?\n/);
    const creditAt = lines.findIndex((l) => l.startsWith("VOICEVOX:"));
    // 説明欄の形（11/23・ユーザーが SE3 で直した形）: リンク → 紹介1文 → チャプター → クレジット → PR → タグ。
    // 結論・数字の箇条書き・※の注意書きは入れない（下書きにあっても落とす）
    const bodyLines = (creditAt < 0 ? lines : lines.slice(0, creditAt)).map((l) => l.trimEnd());
    const links = bodyLines.filter((l) => /^.+: https:\/\/used\.gadelog\.com/.test(l));
    const pr = lines.filter((l) => l.startsWith("中古スマホにするなら回線も見直す") || l.includes("hb.afl.rakuten.co.jp"));
    // Amazon（11/26 ユーザー）: 【PR】の見出しとリンクをいちばん上に、値段の断り・アソシエイトの1文は下のほうにまとめる
    const amazon = lines.filter((l) => /^【PR】Amazon/.test(l) || /: https:\/\/www\.amazon\.co\.jp\//.test(l));
    const disclaimers = lines.filter((l) => l.startsWith("値段は") || l.startsWith("Amazonのアソシエイトとして"));
    const extraCredits = lines.filter((l) => /^(イラスト|動画素材|サムネイル画像)/.test(l));
    let intro = bodyLines.find((l) => l && l !== CHAPTERS_PLACEHOLDER && !/^(※|結論|・|#|（)/.test(l) && !links.includes(l) && !pr.includes(l) && !amazon.includes(l) && !disclaimers.includes(l) && !extraCredits.includes(l)) ?? "";
    // データの日付と店の数は紹介の1文に（画面の最下行に出さないので、説明欄に必ず置く）
    if (!intro.includes(date)) intro += `（数字は ${date} 時点・大手中古ショップ${tl.shops}店の在庫）`;
    const tags = [...lines].reverse().find((l) => l.startsWith("#")) ?? "#中古iPhone #iPhone";
    const parts = [amazon.join("\n"), links.join("\n"), intro, chaptersText(tl).trim(), [...extraCredits, ...credits].join("\n"), pr.join("\n"), disclaimers.join("\n"), tags];
    return [title, "", parts.filter(Boolean).join("\n\n")].join("\n") + "\n";
  }
  return [
    title,
    "",
    `大手中古ショップ${data.shops}店・約7万件の在庫の相場から、いま買うならどの中古iPhoneがいいかを予算別に選びました。結論は ${conclusion}。`,
    "",
    summary,
    "",
    `※ 数字は ${date} 時点の集計です（相場＝在庫がいちばん多い容量の中央値・新品は Apple 公式の税込価格）。相場は毎日動くので、最新はサイトで確かめてください。`,
    "",
    chaptersText(tl).trim(),
    "",
    `iPhone 13 の店ごとの在庫と最安値: ${link(modelPagePath("iPhone 13"))}`,
    `iPhone 15 の店ごとの在庫と最安値: ${link(modelPagePath("iPhone 15"))}`,
    `全機種の中古相場: ${link("/")}`,
    "",
    ...credits,
    "",
    "#中古iPhone #iPhone",
  ].join("\n") + "\n";
}

/**
 * 終了画面の置き方（YouTube Studio → 動画 → 終了画面 で使う）。開始秒・各要素の動画と位置（画面の % と 1920x1080 の px）
 */
function endScreenText(tl: Timeline): string | null {
  const w = endScreenWindow(tl);
  const last = tl.chapters[tl.chapters.length - 1];
  if (!w || last.scene.type !== "endScreen") return null;
  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(1)}%`;
  const box = (b: { x: number; y: number; w: number; h: number }) =>
    `左 ${pct(b.x, W)}・上 ${pct(b.y, H)}・幅 ${pct(b.w, W)}（px: x${b.x} y${b.y} ${b.w}x${b.h}）`;
  const sub = END_SCREEN.subscribe;
  return [
    `終了画面: ${fmtSec(w.start)}〜${fmtSec(w.end)}（動画の最後の ${END_SCREEN.sec} 秒。3つとも同じ時間）`,
    "",
    ...last.scene.videos.map((v, i) => `動画${i + 1}（特定の動画）: ${v.title}  https://youtu.be/${v.id}\n  ${box(END_SCREEN.videos[i])}`),
    `チャンネル登録: ${box({ x: sub.x, y: sub.y, w: sub.size, h: sub.size })}`,
    "",
    "置き方: Studio のプレビューで、画面に描いた点線の枠に要素の端を合わせる（グリッドに合わせる を使う）。大きさの決まりは YouTube のヘルプにない",
  ].join("\n") + "\n";
}

/** 1本目のサムネ（data.json に thumbnail がないとき） */
const DEFAULT_THUMB: ThumbnailData = {
  lines: ["中古iPhone", "予算別の正解"],
  badge: [{ text: "5万円", red: true }, { text: "→" }, { text: "iPhone 13" }],
  footer: "17店・約7万件の相場から ｜ used.gadelog.com",
};
const thumbText = (t: ThumbnailData) => [...t.lines, ...t.badge.map((b) => b.text), t.footer].join("");

function Thumbnail({ art, thumb }: { art: CharaArt; thumb: ThumbnailData }) {
  const tsumugi = art.つむぎ?.closed;
  // 2行目は つむぎ に重ならない幅（約900px）に収める
  const titleSize = Math.min(128, Math.floor(900 / Math.max(1, [...(thumb.lines[1] ?? "")].length)));
  const row = { display: "flex", flexDirection: "row", alignItems: "flex-end" } as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", width: 1280, height: 720, background: SITE.brand900, fontFamily: "Noto Sans JP", padding: "56px 64px" }}>
      {tsumugi ? (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        <img src={tsumugi.src} width={Math.round((tsumugi.w * 660) / tsumugi.h)} height={660} style={{ position: "absolute", right: 0, bottom: 0 }} />
      ) : null}
      <div style={{ display: "flex", fontSize: 92, fontWeight: 900, color: ON_DARK.white, lineHeight: 1.1 }}>{thumb.lines[0]}</div>
      <div style={{ display: "flex", fontSize: titleSize, fontWeight: 900, color: ON_DARK.white, lineHeight: 1.15, marginTop: 8 }}>{thumb.lines[1]}</div>
      <div style={{ ...row, marginTop: 44, padding: "18px 40px 24px", background: ON_DARK.white, borderRadius: 28, alignSelf: "flex-start" }}>
        {thumb.badge.map((b, i) =>
          b.red ? (
            <div key={i} style={{ display: "flex", fontSize: 140, fontWeight: 900, color: SITE.price, lineHeight: 1 }}>{b.text}</div>
          ) : b.text === "→" ? (
            <div key={i} style={{ display: "flex", fontSize: 96, fontWeight: 900, color: SITE.ink, margin: "0 18px 14px", lineHeight: 1 }}>→</div>
          ) : (
            <div key={i} style={{ display: "flex", fontSize: thumb.badge.some((x) => x.text === "→") ? 112 : 96, fontWeight: 900, color: SITE.ink, lineHeight: 1, margin: "0 6px 8px" }}>{b.text}</div>
          ),
        )}
      </div>
      <div style={{ display: "flex", marginTop: "auto", fontSize: 36, fontWeight: 900, color: ON_DARK.safe }}>{thumb.footer}</div>
    </div>
  );
}

async function meta(dir: string, tl: Timeline, art: CharaArt, artFiles: string[]) {
  writeFileSync(join(dir, "chapters.txt"), chaptersText(tl));
  writeFileSync(join(dir, "youtube.txt"), youtubeText(dir, tl, artFiles));
  const es = endScreenText(tl);
  if (es) writeFileSync(join(dir, "endscreen.txt"), es);
  const thumb = (JSON.parse(readFileSync(join(dir, "data.json"), "utf8")) as LongData).thumbnail ?? DEFAULT_THUMB;
  const fonts = await longFonts(tl, thumbText(thumb));
  const res = new ImageResponse(<Thumbnail art={art} thumb={thumb} />, { width: 1280, height: 720, fonts });
  writeFileSync(join(dir, "thumbnail.png"), Buffer.from(await res.arrayBuffer()));
  console.log(`  chapters.txt・youtube.txt・${es ? "endscreen.txt・" : ""}thumbnail.png → ${dir}`);
}

// ───────── 確かめる ─────────

/** 音の大きさ（RMS dB）。from〜to 秒 */
function rmsDb(file: string, from: number, to: number): number {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-threads", "1", "-ss", from.toFixed(3), "-t", (to - from).toFixed(3), "-i", file, "-vn", "-af", "astats=measure_overall=RMS_level:measure_perchannel=none", "-f", "null", "-"], { encoding: "utf8" });
  return Number(r.stderr.match(/RMS level dB:\s*(-?[\d.]+|-inf)/)?.[1] ?? NaN);
}

async function check(dir: string, tl: Timeline) {
  const video = join(dir, "video.mp4");
  const dur = probe(video);
  const size = statSync(video).size / 1024 / 1024;
  console.log(`長さ ${dur.toFixed(2)} 秒（声 ${tl.total.toFixed(2)} 秒＋余白 ${tailOf(tl)} 秒＝${(tl.total + tailOf(tl)).toFixed(2)}）・${size.toFixed(1)} MB`);
  const m = await measure(video, "");
  console.log(`音量 ${m.input_i} LUFS・真のピーク ${m.input_tp} dBTP・LRA ${m.input_lra}`);
  const stills = join(dir, "stills");
  mkdirSync(stills, { recursive: true });
  const grab = (t: number, file: string) => {
    const r = spawnSync("ffmpeg", ["-loglevel", "error", "-threads", "1", "-y", "-ss", t.toFixed(3), "-i", video, "-frames:v", "1", join(stills, file)]);
    if (r.status !== 0) throw new Error(`コマを取り出せませんでした（${t} 秒）`);
  };
  const esw = endScreenWindow(tl);
  if (esw) {
    console.log(`終了画面 ${fmtSec(esw.start)}〜${fmtSec(esw.end)}（動画の長さとの差 ${(dur - esw.end).toFixed(2)} 秒）`);
    grab(Math.min(dur - 0.2, esw.start + 1), "check-endscreen.png");
    console.log("  見本 check-endscreen.png（点線の枠に Studio で要素を重ねる）");
  }
  // 同期: 前の台詞と話し手が違う行の始まり3つ（2割・5割・8割のところ）。始まる直前は静か、直後に声、字幕はその行
  const lines = tl.chapters.flatMap((c) => c.lines);
  const picks = [0.2, 0.5, 0.8].map((q) => {
    let i = Math.floor(lines.length * q);
    while (i < lines.length - 1 && lines[i].who === lines[i - 1].who) i++;
    return lines[i];
  });
  for (const [k, l] of picks.entries()) {
    const before = rmsDb(video, l.start - 0.22, l.start - 0.02);
    const after = rmsDb(video, l.start + 0.05, l.start + 0.45);
    grab(l.start + 0.1, `check-sync${k + 1}.png`);
    console.log(`同期${k + 1} ${l.start.toFixed(2)} 秒 ${l.who}「${l.pages[0].text}」: 直前 ${before.toFixed(1)} dB → 直後 ${after.toFixed(1)} dB（check-sync${k + 1}.png）`);
  }
  // 見本 6 枚（章 1・3・5・7・10・12 の見本の秒）
  for (const n of [1, 3, 5, 7, 10, 12]) {
    const c = tl.chapters[n - 1];
    if (!c) continue;
    grab(c.stillAt, `check-ch${String(n).padStart(2, "0")}.png`);
    const st = stateAt(tl, c.stillAt);
    console.log(`見本 ch${n} ${c.stillAt} 秒: ${st.line?.who ?? "-"}「${st.page?.text ?? ""}」`);
  }
}

// ───────── 本体 ─────────

(async () => {
  const [dir, mode = "all"] = process.argv.slice(2);
  const preset = process.argv.includes("--preset") ? process.argv[process.argv.indexOf("--preset") + 1] : "ultrafast";
  if (!dir) throw new Error("使い方: npx tsx longform/video.tsx <台本のフォルダ> [all | plan | frames | encode | audio | mux | meta | check] [--preset veryfast]");
  const tlFile = join(dir, "timeline.json");
  if (!existsSync(tlFile)) throw new Error(`${tlFile} がありません（先に timeline.ts）`);
  const tl = JSON.parse(readFileSync(tlFile, "utf8")) as Timeline;
  const work = join(dir, "frames");
  mkdirSync(work, { recursive: true });
  const { art, files: artFiles } = loadCharaArt(work);
  const T0 = now();

  if (mode === "check") return check(dir, tl);
  if (mode === "meta") return meta(dir, tl, art, artFiles);

  const small = fontProblems(tl);
  if (small.length) {
    for (const p of small) console.error("文字が小さい:", p);
    throw new Error(`本文が ${MIN_FONT}px に届かない所が ${small.length} か所あります（render.ts stills と同じ確かめ）。data.json を直して timeline.ts からやり直してください`);
  }
  const bad = tl.chapters.flatMap((c) => c.lines).filter((l) => l.stale || l.estimated);
  if (bad.length) throw new Error(`古い声・見積もりの行が ${bad.length} 行あります。voice-draft.ts → timeline.ts をやり直してください`);

  // リップシンク（12/1 の回から標準・11/27 ユーザー。LONGFORM_LIPSYNC=0 で止める）: 台詞の WAV ごとに母音の時刻表を読む
  // （なければ VOICEVOX でクエリを作り直す。エンジンが止まっていれば、その声は今までの開く・閉じるだけ）
  const vis = new Map<string, [number, string][]>();
  if (process.env.LONGFORM_LIPSYNC !== "0") {
    for (const ch of tl.chapters) for (const l of ch.lines) if (l.audio && !vis.has(l.audio)) {
      try { const v = await visemesOf(l.audio); if (v) vis.set(l.audio, v); } catch { /* エンジンなし */ }
    }
    console.log(`  リップシンク: ${vis.size} 本の声`);
  }
  const p = plan(tl, art, voiceLevels(dir), vis);
  const who = (Object.keys(art) as Who[]).map((w) => `${w}${art[w]?.talk ? "（口あり）" : ""}`).join("・") || "なし（名前の札）";
  const count = (k: Job["k"]) => [...p.jobs.values()].filter((j) => j.k === k).length;
  const es = endScreenWindow(tl);
  if (es) console.log(`終了画面 ${fmtSec(es.start)}〜${fmtSec(es.end)}（最後の ${END_SCREEN.sec} 秒。BGM だけの間 ${tailOf(tl)} 秒）`);
  console.log(`長さ ${fmtClock(tl.total + tailOf(tl))}（${p.totalFrames} コマ）・区切り ${p.points}・PNG 土台 ${count("base")} 枚＋重ねる絵 ${p.jobs.size - count("base")} 枚・立ち絵 ${who}`);
  console.log(`見積もり: 土台 1枚 0.5〜1.5 秒（${JOBS} 本で並べる）、映像 1〜3 分、音 1 分`);
  if (mode === "plan") return;

  if (mode === "frames-part") {
    const k = Number(process.argv[4]), n = Number(process.argv[5]);
    await renderFrames(tl, art, work, { k, n });
    return;
  }
  if (mode === "all" || mode === "frames") {
    console.log("PNG を作る");
    // 同じ指紋の PNG はそのまま使う。足りない分だけ作り、使わなくなった PNG は消す
    for (const f of readdirSync(work)) if (/^(seg-\d+|c-[0-9a-f]+|s-[0-9a-z-]+)(-open)?\.png$/.test(f) && !p.jobs.has(f.slice(0, -4))) rmSync(join(work, f));
    // 土台（重い）を先に並べ、子に均等に配る
    const todo = [...p.jobs.values()].filter((j) => !existsSync(join(work, `${j.f}.png`))).sort((x, y) => Number(y.k === "base") - Number(x.k === "base"));
    writeFileSync(join(work, "todo.json"), JSON.stringify(todo));
    const nb = todo.filter((j) => j.k === "base").length;
    console.log(`  使い回し ${p.jobs.size - todo.length} 枚・新しく作る ${todo.length} 枚（土台 ${nb}・重ねる絵 ${todo.length - nb}）`);
    if (todo.length) {
      const n = Math.min(JOBS, Math.ceil(todo.length / 40));
      if (n > 1) await renderFramesParallel(dir, todo.length, n);
      else await renderFrames(tl, art, work);
    }
    writeLists(work, p);
  }
  if (mode === "all" || mode === "encode") {
    console.log("映像");
    writeLists(work, p);
    await encode(work, preset, p, tl);
  }
  if (mode === "all" || mode === "audio") {
    console.log("音");
    await audio(dir, tl, work);
  }
  if (mode === "all" || mode === "mux") {
    console.log("まとめ");
    await mux(dir, work, tl);
  }
  if (mode === "all") {
    console.log("説明文・チャプター・サムネ");
    await meta(dir, tl, art, artFiles);
  }
  console.log(`終わり（${((now() - T0) / 60).toFixed(1)} 分）`);
})();
