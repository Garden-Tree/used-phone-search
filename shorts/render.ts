/** 台本 → コマ（ImageResponse）→ ffmpeg で mp4（drops は A・B・C の3つの構成、budget は A だけ） */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { FPS, H, RANK_SHOWN, TIMELINE, W, budgetRows, countdown, sceneFrame, variantsOf, type Variant } from "./scenes";
import { isBudget, type Script } from "./types";
import { VOICEVOX_URL, cachedCharacter, engineAvailable, narrationKey, narrationOf, resolveSpeaker, synthesize, voiceCredit, type Clip, type NarrationKey } from "./voice";

function run(args: string[], bin = "ffmpeg") {
  const r = spawnSync(bin, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${bin} が失敗しました\n${r.stderr}`);
  return r.stdout;
}

/** script.json の全文字列を集める（フォントのサブセット用） */
function allText(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(allText).join("");
  if (v && typeof v === "object") return Object.values(v).map(allText).join("");
  return "";
}

const duration = (file: string) => Number(run(["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], "ffprobe").trim());

/** 効果音を ffmpeg の合成音で作る（ダウンロードなし）。pop = 小さく柔らかい音、ta = 二音の「ターン」 */
function seFilters(times: { at: number; kind: "pop" | "ta" }[]): { parts: string[]; labels: string[] } {
  const parts: string[] = [];
  const labels: string[] = [];
  const fmt = "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo";
  times.forEach((e, i) => {
    const tone = (hz: number, dur: number, vol: number, at: number, tag: string) => {
      const ms = Math.round(at * 1000);
      parts.push(`sine=frequency=${hz}:duration=${dur}:sample_rate=44100,afade=t=out:st=0:d=${dur},volume=${vol},${fmt},adelay=${ms}|${ms}[${tag}]`);
      labels.push(`[${tag}]`);
    };
    if (e.kind === "pop") tone(880, 0.08, 0.9, e.at, `se${i}`);
    else {
      tone(784, 0.16, 1.4, e.at, `se${i}a`);
      tone(1175, 0.5, 1.4, e.at + 0.14, `se${i}b`);
    }
  });
  return { parts, labels };
}

/** 声の後ろに残す間（秒）。声のある場面は「声の始まり＋声＋この間」の長さにする（動きが終わるまでは切らない） */
const VOICE_PAD = 0.5;
const MAX_TOTAL = 60;

/**
 * ranking は文ごとの声。row はその文で出す行（items・rows の添字）。なければ null（前の行の続きの文）
 * drops: 文頭の「○位」→ 添字 ○−1（2位・3位だけ）/ budget: 文頭の「○万円なら」→ その予算の行
 */
type Voices = { clips: Partial<Record<NarrationKey, Clip>>; ranking?: { clip: Clip; row: number | null }[]; manual?: { file: string; dur: number } };
/** ランキングの声を流し始める秒・行を声より先に出す秒（行は ROW_FADE で出きる） */
const RANK_VOICE_AT = 0.3;
const RANK_LEAD = 0.15;

async function renderOne(dir: string, script: Script, variant: Variant, fonts: Awaited<ReturnType<typeof notoSansJp>>, keepFrames: boolean, voices: Voices, useBgm = true) {
  // BGM なし（--no-bgm）は別の名前（short-A-nobgm.mp4）。BGM 入りの版を上書きしない
  const suffix = useBgm ? "" : "-nobgm";
  const framesDir = join(dir, `frames-${variant}${suffix}`);
  rmSync(framesDir, { recursive: true, force: true });
  // 声のある場面は、声の長さ＋間より短ければ延ばす（延びた分は最後のコマを止める）。声は場面の頭から。
  // ランキングは文ごとの声を続けて流し、各行は「○位は」の声の始まる RANK_LEAD 秒前に出す
  const segVoices: { file: string; at: number; dur: number; label: string }[] = [];
  const log: string[] = [];
  let at = 0;
  const timeline = TIMELINE(script, variant).map((sc) => {
    const key = narrationKey(sc.id);
    if (sc.id === "ranking" && voices.ranking?.length) {
      const budget = isBudget(script);
      const times = [...(sc.o?.at ?? [0, 2.1, 0.5])];
      let cur = RANK_VOICE_AT;
      let found = 0;
      for (const part of voices.ranking) {
        segVoices.push({ file: part.clip.file, at: at + cur, dur: part.clip.dur, label: `ranking${part.row !== null ? `-${budget ? `行${part.row + 1}` : `${part.row + 1}位`}` : ""}` });
        if (part.row !== null && part.row < times.length) {
          times[part.row] = Math.max(0, cur - RANK_LEAD);
          found++;
        }
        cur += part.clip.dur;
      }
      // 行の始まりが分からない（narrationKana で1文にした等）ときは、声の長さを行の数で等分して出す
      const shown = budget ? times.length : 2;
      if (budget ? found < shown : found === 0) {
        const step = (cur - RANK_VOICE_AT) / shown;
        if (budget) times.forEach((_, i) => (times[i] = Math.max(0, RANK_VOICE_AT + step * i - RANK_LEAD)));
        else [times[2], times[1]] = [Math.max(0, RANK_VOICE_AT - RANK_LEAD), RANK_VOICE_AT + step - RANK_LEAD];
      }
      const minDur = Math.ceil((cur + VOICE_PAD) * 10) / 10;
      const out = budget ? budgetRows(times, minDur) : countdown(sc.o?.start ?? 0.5, sc.o?.gap ?? 1.6, times, minDur);
      const rowLog = budget
        ? times.map((t, i) => `行${i + 1} ${(at + t).toFixed(2)}s`).join("・")
        : times.slice(1).map((t, i) => `${i + 2}位 ${(at + t).toFixed(2)}s`).reverse().join("・");
      log.push(`  ${at.toFixed(2)}s ranking（${out.dur.toFixed(1)}秒）行: ${rowLog}`);
      at += out.dur;
      return out;
    }
    const clip = sc.id === "comment" && voices.manual ? voices.manual : key ? voices.clips[key] : undefined;
    // 声のある場面は「声＋VOICE_PAD」に合わせて延ばす／縮める（声の後に動かない絵が長く残らないように）。動きの途中では切らない
    const out = clip ? { ...sc, dur: Math.max(Math.ceil((sc.anim + 0.3) * 10) / 10, Math.ceil((clip.dur + VOICE_PAD) * 10) / 10) } : sc;
    if (clip) segVoices.push({ file: clip.file, at, dur: clip.dur, label: sc.id });
    if (sc.id === "ranking") log.push(`  ${at.toFixed(2)}s ranking（${out.dur.toFixed(1)}秒）行: ${(out.o?.at ?? []).map((t, i) => `${i} ${(at + t).toFixed(2)}s`).join("・")}`);
    else log.push(`  ${at.toFixed(2)}s ${sc.id}（${out.dur.toFixed(1)}秒）`);
    at += out.dur;
    return out;
  });
  console.log([`タイムライン ${variant}:`, ...log, ...segVoices.map((v) => `  声 ${v.label}: ${v.at.toFixed(2)}〜${(v.at + v.dur).toFixed(2)}s`)].join("\n"));
  const total = timeline.reduce((a, s) => a + s.dur, 0);
  if (total > MAX_TOTAL) console.warn(`注意: ${variant} が ${total.toFixed(1)} 秒になりました（ショートは ${MAX_TOTAL} 秒以内に）。ナレーションを短くするか voice.speedScale を上げてください`);
  const segs: string[] = [];
  const se: { at: number; kind: "pop" | "ta" }[] = [];
  let offset = 0;

  timeline.forEach((sc, idx) => {
    for (const e of sc.se ?? []) se.push({ at: offset + e.t, kind: e.kind });
    offset += sc.dur;
    void idx;
  });

  for (const [idx, sc] of timeline.entries()) {
    const sd = join(framesDir, `${idx}-${sc.id}`);
    mkdirSync(sd, { recursive: true });
    // 動きのある間だけコマを作り、残りは最後のコマを止める
    const count = Math.ceil(sc.anim * FPS) + 1;
    for (let k = 0; k < count; k++) {
      const t = k === count - 1 ? sc.anim : k / FPS;
      const res = new ImageResponse(sceneFrame(sc, script, t), { width: W, height: H, fonts });
      writeFileSync(join(sd, `f${String(k + 1).padStart(4, "0")}.png`), Buffer.from(await res.arrayBuffer()));
    }
    const hold = Math.max(0, sc.dur - count / FPS);
    const seg = join(framesDir, `${idx}-${sc.id}.mp4`);
    run(["-y", "-framerate", String(FPS), "-i", join(sd, "f%04d.png"), "-vf", `tpad=stop_mode=clone:stop_duration=${hold.toFixed(3)},format=yuv420p`,
      "-r", String(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-t", String(sc.dur), seg]);
    segs.push(seg);
  }

  // 場面をつなぐ（同じ設定なので映像は再エンコードしない）
  const list = join(framesDir, "list.txt");
  writeFileSync(list, segs.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));

  // 音: 無音を土台に、効果音・BGM（低音量）・声（各場面の頭から）を重ねる。
  // 声の間は効果音と BGM を下げ、声があるときだけ全体を -11 LUFS にそろえる（10/21 ユーザーの指示「音圧を大きく、特に声」）。
  // 声はコンプレッサーで粒をそろえて持ち上げ、BGM は声の有無で上げ下げせず 4% で一定（声の切れ目で一瞬大きくなるのをやめた。10/21）。YouTube は再生時に -14 前後へ下げるので、効くのは「声と BGM の差」と声の密度
  const bgm = resolve(__dirname, "assets/bgm.mp3");
  const hasBgm = useBgm && existsSync(bgm);
  const duck = (normal: number, low: number) =>
    segVoices.length ? `if(${segVoices.map((v) => `between(t,${v.at.toFixed(3)},${(v.at + v.dur).toFixed(3)})`).join("+")},${low},${normal})` : String(normal);
  const inputs = ["-f", "concat", "-safe", "0", "-i", list, "-f", "lavfi", "-t", String(total), "-i", "anullsrc=r=44100:cl=stereo"];
  const { parts, labels } = seFilters(se);
  let mix = ["[1:a]", ...labels];
  if (segVoices.length) {
    parts.push(`${mix.join("")}amix=inputs=${mix.length}:duration=first:normalize=0,volume='${duck(1, 0.25)}':eval=frame[sfx]`);
    mix = ["[sfx]"];
  }
  let next = 2;
  if (hasBgm) {
    inputs.push("-stream_loop", "-1", "-i", bgm);
    parts.push(`[${next}:a]atrim=0:${total},asetpts=PTS-STARTPTS,volume=0.04,afade=t=out:st=${total - 3}:d=3[bgm]`);
    mix.push("[bgm]");
    next++;
  }
  segVoices.forEach((v, i) => {
    const ms = Math.round(v.at * 1000);
    inputs.push("-i", v.file);
    parts.push(`[${next}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,acompressor=threshold=0.1:ratio=3:attack=5:release=120:makeup=2,volume=1.3,adelay=${ms}|${ms}[v${i}]`);
    mix.push(`[v${i}]`);
    next++;
  });
  parts.push(`${mix.join("")}amix=inputs=${mix.length}:duration=first:normalize=0[a]`);
  const out = join(dir, `short-${variant}${suffix}.mp4`);
  if (!segVoices.length) {
    // 声がなければ今まで通り（音量はそろえない）
    run(["-y", ...inputs, "-filter_complex", parts.join(";"), "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-t", String(total), "-movflags", "+faststart", out]);
  } else {
    // 声があるときは -14 LUFS（YouTube の目安）に。1回の loudnorm だと山（真のピーク）に押さえられて -15.5 ほどで止まるので、
    // いったん無圧縮で書き、測ってから2回目で合わせる（ffmpeg の loudnorm の2パス）
    const mixed = join(framesDir, "mixed.mkv");
    run(["-y", ...inputs, "-filter_complex", parts.join(";"), "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "pcm_s16le", "-t", String(total), mixed]);
    const LN = "loudnorm=I=-11:TP=-1:LRA=7";
    const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", mixed, "-af", `${LN}:print_format=json`, "-f", "null", "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const m = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf("{"), r.stderr.lastIndexOf("}") + 1)) as Record<string, string>;
    const second = `${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset},aresample=44100`;
    run(["-y", "-i", mixed, "-map", "0:v", "-map", "0:a", "-c:v", "copy", "-af", second, "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out]);
  }
  if (!keepFrames) rmSync(framesDir, { recursive: true, force: true });
  console.log(`${variant}: ${out}（${duration(out).toFixed(1)} 秒・効果音 ${se.length} 回・BGM ${hasBgm ? "あり" : "なし"}・声 ${segVoices.length ? `${segVoices.length} か所` : "なし"}）`);
  return out;
}

/** ランキングの文が出す行（Voices の row） */
function rowOf(script: Script, sentence: string): number | null {
  if (isBudget(script)) {
    const m = sentence.match(/^(\d+)万円なら/);
    const i = m ? script.scenes.budgets.rows.findIndex((r) => r.budget === Number(m[1]) * 10000) : -1;
    return i >= 0 ? i : null;
  }
  const rank = Number(sentence.match(/^(\d+)位/)?.[1]);
  return rank >= 2 && rank <= RANK_SHOWN ? rank - 1 : null;
}

/**
 * BGM のクレジット。shorts/assets/bgm.json（{ "title": "曲名", "artist": "アーティスト", "source": "YouTube オーディオライブラリ" }）を
 * bgm.mp3 と一緒に置くと、説明文に「BGM: 曲名 - アーティスト（入手元）」が入る。bgm.mp3 がなければ入れない
 */
function bgmCredit(): string | null {
  if (!existsSync(resolve(__dirname, "assets/bgm.mp3"))) return null;
  const meta = resolve(__dirname, "assets/bgm.json");
  if (!existsSync(meta)) {
    console.warn("注意: shorts/assets/bgm.json がないので、説明文に BGM のクレジットが入りません");
    return null;
  }
  const b = JSON.parse(readFileSync(meta, "utf8")) as { title: string; artist: string; source?: string };
  return `BGM: ${b.title} - ${b.artist}${b.source ? `（${b.source}）` : ""}`;
}

/**
 * 声を用意する。<出力先>/voice.m4a（mp3・wav）があればコメント場面はそれを使う（VOICEVOX より優先）。
 * VOICEVOX に届かなければ、キャッシュにある文だけ使い、残りは声なし（止めない）
 */
async function prepareVoices(dir: string, script: Script, useVoicevox: boolean): Promise<{ voices: Voices; credit: string | null }> {
  const voices: Voices = { clips: {} };
  const manual = ["m4a", "mp3", "wav"].map((e) => join(dir, `voice.${e}`)).find(existsSync);
  if (manual) voices.manual = { file: manual, dur: duration(manual) };
  if (!useVoicevox) {
    console.log("声: VOICEVOX を使わない（--no-voice）");
    return { voices, credit: null };
  }
  const online = await engineAvailable();
  if (!online) console.log(`声: VOICEVOX（${VOICEVOX_URL}）に接続できません。VOICEVOX アプリを起動すると声が入ります。キャッシュにない文は声なしで書き出します`);
  let credit: string | null = null;
  try {
    for (const [key, text] of Object.entries(narrationOf(script)) as [NarrationKey, string | undefined][]) {
      if (!text?.trim() || (key === "comment" && manual)) continue;
      const kana = script.narrationKana?.[key];
      if (key === "ranking" && !kana) {
        // 文ごとに分けて合成する（行を声に合わせて出すため）
        const parts: { clip: Clip; row: number | null }[] = [];
        for (const sentence of text.split(/(?<=[。！？])/).map((x) => x.trim()).filter(Boolean)) {
          const c = await synthesize(sentence, script.voice, online);
          if (!c) {
            parts.length = 0;
            break;
          }
          parts.push({ clip: c, row: rowOf(script, sentence) });
          console.log(`声 ranking: ${c.dur.toFixed(1)} 秒「${sentence}」${c.cached ? "（キャッシュ）" : ""}${c.kana ? `
  読み: ${c.kana}` : ""}`);
        }
        if (!parts.length) continue;
        voices.ranking = parts;
        credit ??= voiceCredit(online
          ? (await resolveSpeaker(script.voice?.speaker, true)).character
          : (cachedCharacter(parts[0].clip) ?? (await resolveSpeaker(script.voice?.speaker, false)).character));
        continue;
      }
      const clip = await synthesize(text, script.voice, online, kana);
      if (!clip) continue;
      voices.clips[key] = clip;
      console.log(`声 ${key}: ${clip.dur.toFixed(1)} 秒「${text}」${clip.cached ? "（キャッシュ）" : ""}${clip.kana ? `
  読み: ${clip.kana}` : ""}`);
      credit ??= voiceCredit(online
        ? (await resolveSpeaker(script.voice?.speaker, true)).character
        : (cachedCharacter(clip) ?? (await resolveSpeaker(script.voice?.speaker, false)).character));
    }
  } catch (e) {
    console.warn(`声: VOICEVOX の合成に失敗したので、VOICEVOX の声なしで書き出します\n  ${e instanceof Error ? e.message : e}`);
    return { voices: { clips: {}, manual: voices.manual }, credit: null };
  }
  return { voices, credit };
}

/**
 * variant を省略するとテーマの全部の型（drops は A・B・C、budget は A）を作る。voice=false で VOICEVOX を使わない（--no-voice）。
 * bgm=false（--no-bgm）は BGM を入れず（声と効果音だけ・音量の決め方は同じ）、short-<型>-nobgm.mp4 と youtube-nobgm.txt（BGM のクレジットなし）を書く。
 * YouTube アプリの「音源を追加」で流行りの曲を付けて投稿する用
 */
export async function renderShort(dir: string, script: Script, keepFrames: boolean, variant: Variant | "all" = "all", voice = true, bgm = true) {
  const fonts = await notoSansJp(allText(script) + readFileSync(join(__dirname, "scenes.tsx"), "utf8") + "0123456789,.%");
  const { voices, credit } = await prepareVoices(dir, script, voice);
  const outs: string[] = [];
  for (const v of variant === "all" ? variantsOf(script) : [variant]) outs.push(await renderOne(dir, script, v, fonts, keepFrames, voices, bgm));
  const y = script.youtube;
  // VOICEVOX の声を使ったときは、説明文の最後にクレジット（例「VOICEVOX:春日部つむぎ」）を必ず入れる。BGM があれば曲のクレジットも
  const credits = [credit, bgm ? bgmCredit() : null].filter(Boolean) as string[];
  const description = credits.length ? `${y.description}\n\n${credits.join("\n")}` : y.description;
  writeFileSync(join(dir, bgm ? "youtube.txt" : "youtube-nobgm.txt"), `${y.title}\n\n${description}\n\n${y.hashtags.join(" ")}\n`);
  if (credits.length) console.log(`${bgm ? "youtube.txt" : "youtube-nobgm.txt"} に「${credits.join("」「")}」を入れました`);
  return outs;
}
