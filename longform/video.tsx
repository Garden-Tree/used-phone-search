/**
 * 横動画（1920x1080・30fps）を書き出す。絵が変わるところ（字幕のページ・項目が出る秒・話し手・章）だけ PNG にし、
 * ffmpeg の concat（1枚ごとの長さ）で動画にする。約10分でも PNG は数百枚
 *
 *   npx tsx longform/video.tsx longform/2026-10-21-iphone-dore            # 全部（plan → frames → encode → audio → mux → meta）
 *   npx tsx longform/video.tsx longform/2026-10-21-iphone-dore plan       # 区切りの数と見積もりだけ
 *   npx tsx longform/video.tsx longform/2026-10-21-iphone-dore check      # 書き出した video.mp4 の長さ・音量・同期・見本（stills/check-*.png）
 *   ほかに frames / encode / audio / mux / meta（chapters.txt・youtube.txt・thumbnail.png）を1つずつ
 *
 * - 先に voice-draft.ts（今の辞書で声を合成）→ timeline.ts（声の長さから時間割）。古い声（stale）・見積もりの行があれば止める
 * - PC が重い処理で落ちるので: 1枚ずつ順に作る・ffmpeg は1本ずつ・-threads 2・優先度「低」（このプロセスも「通常以下」）
 * - 項目は 0.4 秒かけて出さず、出る秒で一度に出す（切り替え）
 * - 立ち絵: longform/assets/chara/tsumugi.png・zundamon.png（口の開いた絵 tsumugi-talk.png・zundamon-talk.png は任意）。
 *   口の絵があれば、話している間は 0.2 秒ごとに開閉（PNG は2枚だけで、ffmpeg の一覧で交互に並べる）
 * - 音: 声（voice-draft/joined.wav）を -16 LUFS にそろえ、BGM（shorts/assets/bgm.mp3）をくり返して 0.07 倍・頭2秒で上げ・最後4秒で下げる。
 *   全体を loudnorm の2パスで -14 LUFS・真のピーク -1 dB
 * - 出力（<フォルダ>/）: video.mp4・chapters.txt・youtube.txt・thumbnail.png（1280x720）。途中のファイルは frames/
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";
import { ImageResponse } from "next/og";
import { ON_DARK, SITE } from "@/lib/brandColors";
import { modelPagePath } from "@/lib/catalog";
import { longFonts } from "./fonts";
import { FPS, H, W, frameAt, revealedAt, stateAt, type ArtImage, type CharaArt } from "./scenes";
import type { Who } from "./script";
import type { LongData, Timeline } from "./types";

/** 最後の台詞のあとに残す秒（BGM が下がりきる） */
const TAIL = 1.5;
const BGM_VOLUME = 0.07;
const VOICE_LUFS = -16;
/** 口の開閉（秒） */
const MOUTH = 0.2;
const CAMPAIGN = "long_20261021";
const SITE_URL = "https://used.gadelog.com";

const ROOT = resolve(__dirname, "..");
const CHARA_DIR = join(__dirname, "assets/chara");
const CHARA_FILE: Record<Who, string> = { つむぎ: "tsumugi", ずんだもん: "zundamon" };
const BGM = join(ROOT, "shorts/assets/bgm.mp3");

// このプロセスと子（ffmpeg）を低い優先度で動かす（Windows では子は親の「通常以下」を受け継ぐ）
try {
  os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
} catch {}

const fmtClock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const now = () => performance.now() / 1000;

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

// ───────── 立ち絵 ─────────

const pngSize = (buf: Buffer) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

/** 立ち絵を読む。大きい絵は枠の2倍の高さ（約1200px）に縮めて frames/ に置く（コマごとの縮小を軽くする） */
function loadCharaArt(work: string): { art: CharaArt; files: string[] } {
  const art: CharaArt = {};
  const files: string[] = [];
  const load = (name: string): ArtImage | undefined => {
    const src = join(CHARA_DIR, `${name}.png`);
    if (!existsSync(src)) return undefined;
    let buf = readFileSync(src);
    if (pngSize(buf).h > 1300) {
      const small = join(work, `chara-${name}.png`);
      const r = spawnSync("ffmpeg", ["-loglevel", "error", "-threads", "1", "-y", "-i", src, "-vf", "scale=-1:1200:flags=lanczos", small]);
      if (r.status !== 0) throw new Error(`立ち絵を縮められませんでした: ${src}`);
      buf = readFileSync(small);
    }
    files.push(src);
    return { src: `data:image/png;base64,${buf.toString("base64")}`, ...pngSize(buf) };
  };
  for (const who of Object.keys(CHARA_FILE) as Who[]) {
    const closed = load(CHARA_FILE[who]);
    if (!closed) continue;
    art[who] = { closed, talk: load(`${CHARA_FILE[who]}-talk`) };
  }
  return { art, files };
}

// ───────── 区切り ─────────

type Segment = { frame: number; t: number; key: string; flap: boolean };

/**
 * 絵が変わる秒（章・台詞の始まりと終わり・字幕のページ・項目が出る秒）を集め、そこでの「映すもの」が前と同じなら1つにまとめる。
 * 秒はコマ（1/30 秒）に丸め、同じコマに2つ来たら後のほうを使う
 */
function segments(tl: Timeline, art: CharaArt): { segs: Segment[]; totalFrames: number } {
  const total = tl.total + TAIL;
  const points = new Set<number>([0]);
  for (const ch of tl.chapters) {
    points.add(ch.start);
    for (const r of Object.values(ch.scene.reveal)) if (r > 0) points.add(ch.start + r);
    for (const l of ch.lines) {
      points.add(l.start);
      points.add(l.end);
      for (const p of l.pages) points.add(p.start);
    }
  }
  const segs: Segment[] = [];
  for (const t of [...points].filter((x) => x >= 0 && x < total).sort((a, b) => a - b)) {
    const st = stateAt(tl, t);
    const who = st.line?.who;
    const flap = !!(who && art[who]?.talk && st.talking);
    // 立ち絵がなければ「話している最中か」で絵は変わらない
    const talkKey = who && art[who] ? st.talking : false;
    const key = JSON.stringify([st.ch.index, st.li, st.pi, revealedAt(st.ch.scene.reveal, t - st.ch.start).sort(), talkKey]);
    const frame = Math.round(t * FPS);
    const last = segs[segs.length - 1];
    if (last && last.frame === frame) segs.pop();
    const prev = segs[segs.length - 1];
    if (prev && prev.key === key) continue;
    segs.push({ frame, t, key, flap });
  }
  return { segs, totalFrames: Math.round(total * FPS) };
}

const segFile = (i: number, open = false) => `seg-${String(i + 1).padStart(4, "0")}${open ? "-open" : ""}.png`;

// ───────── 各段 ─────────

async function renderFrames(tl: Timeline, segs: Segment[], art: CharaArt, work: string) {
  const fonts = await longFonts(tl);
  const jobs = segs.flatMap((s, i) => [{ s, i, open: false }, ...(s.flap ? [{ s, i, open: true }] : [])]);
  const t0 = now();
  for (const [n, j] of jobs.entries()) {
    const res = new ImageResponse(frameAt(tl, j.s.t, { instant: true, art, mouthOpen: j.open }), { width: W, height: H, fonts });
    writeFileSync(join(work, segFile(j.i, j.open)), Buffer.from(await res.arrayBuffer()));
    if ((n + 1) % 25 === 0 || n + 1 === jobs.length) {
      const el = now() - t0;
      console.log(`  PNG ${n + 1}/${jobs.length}（${el.toFixed(0)} 秒・残り約 ${(((jobs.length - n - 1) * el) / (n + 1)).toFixed(0)} 秒）`);
    }
  }
}

/** ffmpeg の concat の一覧（1枚ごとの長さ）。口の絵があれば話している区切りを 0.2 秒ごとに開閉 */
function concatList(segs: Segment[], totalFrames: number): string {
  const out = ["ffconcat version 1.0"];
  const step = Math.round(MOUTH * FPS);
  let lastFile = "";
  segs.forEach((s, i) => {
    const end = i + 1 < segs.length ? segs[i + 1].frame : totalFrames;
    const add = (file: string, frames: number) => {
      out.push(`file '${file}'`, `duration ${(frames / FPS).toFixed(6)}`);
      lastFile = file;
    };
    if (!s.flap) return add(segFile(i), end - s.frame);
    for (let f = s.frame, open = true; f < end; f += step, open = !open) add(segFile(i, open), Math.min(step, end - f));
  });
  // concat は最後の1枚の長さを使わないので、もう1度並べる
  out.push(`file '${lastFile}'`);
  return out.join("\n") + "\n";
}

async function encode(work: string, preset: string) {
  await ffmpeg(
    ["-y", "-threads", "2", "-f", "concat", "-safe", "0", "-i", join(work, "list.txt"), "-vf", `fps=${FPS},format=yuv420p`, "-fps_mode", "cfr",
      "-c:v", "libx264", "-preset", preset, "-tune", "stillimage", "-crf", "20", "-g", String(FPS * 10), "-threads", "2", "-x264-params", "threads=2:lookahead-threads=1",
      "-an", "-movflags", "+faststart", join(work, "video-only.mp4")],
    `映像（H.264 ${preset}）`,
  );
}

async function audio(dir: string, tl: Timeline, work: string) {
  const voice = join(dir, "voice-draft/joined.wav");
  if (!existsSync(voice)) throw new Error(`声がありません: ${voice}（先に voice-draft.ts）`);
  const vd = probe(voice);
  if (Math.abs(vd - tl.total) > 0.1) throw new Error(`声の長さ（${vd.toFixed(2)} 秒）と時間割（${tl.total} 秒）が合いません。voice-draft.ts → timeline.ts をやり直す`);
  if (!existsSync(BGM)) throw new Error(`BGM がありません: ${BGM}`);
  const total = tl.total + TAIL;
  const vm = await measure(voice);
  const gain = VOICE_LUFS - Number(vm.input_i);
  console.log(`  声 ${Number(vm.input_i).toFixed(1)} LUFS → ${gain >= 0 ? "+" : ""}${gain.toFixed(1)} dB で ${VOICE_LUFS} LUFS に`);
  const stereo = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo";
  const mix = join(work, "mix.wav");
  await ffmpeg(
    ["-y", "-threads", "2", "-i", voice, "-stream_loop", "-1", "-i", BGM, "-filter_complex",
      `[0:a]${stereo},volume=${gain.toFixed(2)}dB,apad=whole_dur=${total}[v];` +
      `[1:a]${stereo},atrim=0:${total},asetpts=PTS-STARTPTS,volume=${BGM_VOLUME},afade=t=in:st=0:d=2,afade=t=out:st=${(total - 4).toFixed(3)}:d=4[b];` +
      `[v][b]amix=inputs=2:duration=first:normalize=0[a]`,
      "-map", "[a]", "-t", String(total), "-c:a", "pcm_s16le", mix],
    "声と BGM を混ぜる",
  );
  const m = await measure(mix);
  const second = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
  await ffmpeg(["-y", "-threads", "2", "-i", mix, "-af", second, "-c:a", "aac", "-b:a", "192k", join(work, "audio.m4a")], "-14 LUFS（2パス目）");
}

async function mux(dir: string, work: string) {
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
  const utm = `utm_source=youtube&utm_medium=social&utm_campaign=${CAMPAIGN}`;
  const link = (path: string) => `${SITE_URL}${path}?${utm}`;
  const credits = ["VOICEVOX:春日部つむぎ", "VOICEVOX:ずんだもん", "BGM: Okay For Now - Televisions（YouTube オーディオライブラリ）"];
  if (artFiles.length) credits.push("立ち絵: （ここに立ち絵の作者・配布元のクレジット。各規約の表記どおりに）");
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

function Thumbnail({ art }: { art: CharaArt }) {
  const tsumugi = art.つむぎ?.closed;
  const row = { display: "flex", flexDirection: "row", alignItems: "flex-end" } as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", width: 1280, height: 720, background: SITE.brand900, fontFamily: "Noto Sans JP", padding: "56px 64px" }}>
      {tsumugi ? (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        <img src={tsumugi.src} width={Math.round((tsumugi.w * 660) / tsumugi.h)} height={660} style={{ position: "absolute", right: 0, bottom: 0 }} />
      ) : null}
      <div style={{ display: "flex", fontSize: 92, fontWeight: 900, color: ON_DARK.white, lineHeight: 1.1 }}>中古iPhone</div>
      <div style={{ display: "flex", fontSize: 128, fontWeight: 900, color: ON_DARK.white, lineHeight: 1.15, marginTop: 8 }}>予算別の正解</div>
      <div style={{ ...row, marginTop: 44, padding: "18px 40px 24px", background: ON_DARK.white, borderRadius: 28, alignSelf: "flex-start" }}>
        <div style={{ display: "flex", fontSize: 140, fontWeight: 900, color: SITE.price, lineHeight: 1 }}>5万円</div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 900, color: SITE.ink, margin: "0 18px 14px", lineHeight: 1 }}>→</div>
        <div style={{ display: "flex", fontSize: 112, fontWeight: 900, color: SITE.ink, lineHeight: 1 }}>iPhone 13</div>
      </div>
      <div style={{ display: "flex", marginTop: "auto", fontSize: 36, fontWeight: 900, color: ON_DARK.safe }}>17店・約7万件の相場から ｜ used.gadelog.com</div>
    </div>
  );
}

async function meta(dir: string, tl: Timeline, art: CharaArt, artFiles: string[]) {
  writeFileSync(join(dir, "chapters.txt"), chaptersText(tl));
  writeFileSync(join(dir, "youtube.txt"), youtubeText(dir, tl, artFiles));
  const fonts = await longFonts(tl, "中古iPhone予算別の正解5万円→iPhone 13 17店・約7万件の相場から｜used.gadelog.com");
  const res = new ImageResponse(<Thumbnail art={art} />, { width: 1280, height: 720, fonts });
  writeFileSync(join(dir, "thumbnail.png"), Buffer.from(await res.arrayBuffer()));
  console.log(`  chapters.txt・youtube.txt・thumbnail.png → ${dir}`);
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
  console.log(`長さ ${dur.toFixed(2)} 秒（声 ${tl.total.toFixed(2)} 秒＋余白 ${TAIL} 秒＝${(tl.total + TAIL).toFixed(2)}）・${size.toFixed(1)} MB`);
  const m = await measure(video, "");
  console.log(`音量 ${m.input_i} LUFS・真のピーク ${m.input_tp} dBTP・LRA ${m.input_lra}`);
  const stills = join(dir, "stills");
  mkdirSync(stills, { recursive: true });
  const grab = (t: number, file: string) => {
    const r = spawnSync("ffmpeg", ["-loglevel", "error", "-threads", "1", "-y", "-ss", t.toFixed(3), "-i", video, "-frames:v", "1", join(stills, file)]);
    if (r.status !== 0) throw new Error(`コマを取り出せませんでした（${t} 秒）`);
  };
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
  const preset = process.argv.includes("--preset") ? process.argv[process.argv.indexOf("--preset") + 1] : "veryfast";
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

  const bad = tl.chapters.flatMap((c) => c.lines).filter((l) => l.stale || l.estimated);
  if (bad.length) throw new Error(`古い声・見積もりの行が ${bad.length} 行あります。voice-draft.ts → timeline.ts をやり直してください`);

  const { segs, totalFrames } = segments(tl, art);
  const pngs = segs.length + segs.filter((s) => s.flap).length;
  const who = (Object.keys(art) as Who[]).map((w) => `${w}${art[w]?.talk ? "（口あり）" : ""}`).join("・") || "なし（名前の札）";
  console.log(`長さ ${fmtClock(tl.total + TAIL)}（${totalFrames} コマ）・区切り ${segs.length}・PNG ${pngs} 枚・立ち絵 ${who}`);
  console.log(`見積もり: PNG 1枚 0.5〜1.5 秒 → ${Math.round((pngs * 0.5) / 60)}〜${Math.round((pngs * 1.5) / 60)} 分、映像 3〜8 分、音 1〜2 分`);
  if (mode === "plan") return;

  if (mode === "all" || mode === "frames") {
    console.log("PNG を作る");
    for (const f of readdirSync(work)) if (/^seg-\d+(-open)?\.png$/.test(f)) rmSync(join(work, f));
    await renderFrames(tl, segs, art, work);
    writeFileSync(join(work, "list.txt"), concatList(segs, totalFrames));
  }
  if (mode === "all" || mode === "encode") {
    console.log("映像");
    writeFileSync(join(work, "list.txt"), concatList(segs, totalFrames));
    await encode(work, preset);
  }
  if (mode === "all" || mode === "audio") {
    console.log("音");
    await audio(dir, tl, work);
  }
  if (mode === "all" || mode === "mux") {
    console.log("まとめ");
    await mux(dir, work);
  }
  if (mode === "all") {
    console.log("説明文・チャプター・サムネ");
    await meta(dir, tl, art, artFiles);
  }
  console.log(`終わり（${((now() - T0) / 60).toFixed(1)} 分）`);
})();
