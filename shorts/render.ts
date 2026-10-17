/** 台本 → コマ（ImageResponse）→ ffmpeg で mp4（A・B・C の3つの構成） */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { FPS, H, TIMELINE, VARIANTS, W, sceneFrame, type Variant } from "./scenes";
import type { Script } from "./types";

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

async function renderOne(dir: string, script: Script, variant: Variant, fonts: Awaited<ReturnType<typeof notoSansJp>>, keepFrames: boolean) {
  const framesDir = join(dir, `frames-${variant}`);
  rmSync(framesDir, { recursive: true, force: true });
  const timeline = TIMELINE(script, variant);
  const total = timeline.reduce((a, s) => a + s.dur, 0);
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

  // 音: 無音を土台に、効果音・BGM（低音量）・声（コメント場面の開始から）を重ねる
  const bgm = resolve(__dirname, "assets/bgm.mp3");
  const hasBgm = existsSync(bgm);
  const voice = ["m4a", "mp3", "wav"].map((e) => join(dir, `voice.${e}`)).find(existsSync);
  const commentStart = timeline.slice(0, timeline.findIndex((s) => s.id === "comment")).reduce((a, s) => a + s.dur, 0);
  const inputs = ["-f", "concat", "-safe", "0", "-i", list, "-f", "lavfi", "-t", String(total), "-i", "anullsrc=r=44100:cl=stereo"];
  const { parts, labels } = seFilters(se);
  const mix = ["[1:a]", ...labels];
  let next = 2;
  if (hasBgm) {
    inputs.push("-stream_loop", "-1", "-i", bgm);
    const duck = voice ? `if(between(t,${commentStart},${commentStart + duration(voice)}),0.05,0.15)` : "0.15";
    parts.push(`[${next}:a]atrim=0:${total},asetpts=PTS-STARTPTS,volume='${duck}':eval=frame,afade=t=out:st=${total - 3}:d=3[bgm]`);
    mix.push("[bgm]");
    next++;
  }
  if (voice) {
    inputs.push("-i", voice);
    parts.push(`[${next}:a]adelay=${Math.round(commentStart * 1000)}|${Math.round(commentStart * 1000)}[voice]`);
    mix.push("[voice]");
  }
  parts.push(`${mix.join("")}amix=inputs=${mix.length}:duration=first:normalize=0[a]`);
  const out = join(dir, `short-${variant}.mp4`);
  run(["-y", ...inputs, "-filter_complex", parts.join(";"), "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-t", String(total), "-movflags", "+faststart", out]);
  if (!keepFrames) rmSync(framesDir, { recursive: true, force: true });
  console.log(`${variant}: ${out}（${duration(out).toFixed(1)} 秒・効果音 ${se.length} 回・BGM ${hasBgm ? "あり" : "なし"}・声 ${voice ?? "なし"}）`);
  return out;
}

/** variant を省略すると A・B・C の3つを作る */
export async function renderShort(dir: string, script: Script, keepFrames: boolean, variant: Variant | "all" = "all") {
  const fonts = await notoSansJp(allText(script) + readFileSync(join(__dirname, "scenes.tsx"), "utf8") + "0123456789,.%");
  const outs: string[] = [];
  for (const v of variant === "all" ? VARIANTS : [variant]) outs.push(await renderOne(dir, script, v, fonts, keepFrames));
  const y = script.youtube;
  writeFileSync(join(dir, "youtube.txt"), `${y.title}\n\n${y.description}\n\n${y.hashtags.join(" ")}\n`);
  return outs;
}
