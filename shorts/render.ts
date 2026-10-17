/** 台本 → コマ（ImageResponse）→ ffmpeg で mp4 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { FPS, H, STATIC_TEXT, TIMELINE, W, sceneFrame } from "./scenes";
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

export async function renderShort(dir: string, script: Script, keepFrames: boolean) {
  const fonts = await notoSansJp(allText(script) + STATIC_TEXT);
  const framesDir = join(dir, "frames");
  rmSync(framesDir, { recursive: true, force: true });
  const timeline = TIMELINE(script);
  const total = timeline.reduce((a, s) => a + s.dur, 0);
  const segs: string[] = [];

  for (const sc of timeline) {
    const sd = join(framesDir, sc.id);
    mkdirSync(sd, { recursive: true });
    // 動きのある間だけコマを作り、残りは最後のコマを止める
    const count = Math.ceil(sc.anim * FPS) + 1;
    for (let k = 0; k < count; k++) {
      const t = k === count - 1 ? sc.anim : k / FPS;
      const res = new ImageResponse(sceneFrame(sc.id, script, t), { width: W, height: H, fonts });
      writeFileSync(join(sd, `f${String(k + 1).padStart(4, "0")}.png`), Buffer.from(await res.arrayBuffer()));
    }
    const hold = Math.max(0, sc.dur - count / FPS);
    const seg = join(framesDir, `${sc.id}.mp4`);
    run(["-y", "-framerate", String(FPS), "-i", join(sd, "f%04d.png"), "-vf", `tpad=stop_mode=clone:stop_duration=${hold.toFixed(3)},format=yuv420p`,
      "-r", String(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-t", String(sc.dur), seg]);
    segs.push(seg);
    console.log(`場面 ${sc.id}: ${count} コマ + 静止 ${hold.toFixed(1)} 秒`);
  }

  // 場面をつなぐ（同じ設定なので映像は再エンコードしない）
  const list = join(framesDir, "list.txt");
  writeFileSync(list, segs.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));

  // 音: 無音を土台に、BGM（低音量）と声（コメント場面の開始から）を重ねる
  const bgm = resolve(__dirname, "assets/bgm.mp3");
  const hasBgm = existsSync(bgm);
  const voice = ["m4a", "mp3", "wav"].map((e) => join(dir, `voice.${e}`)).find(existsSync);
  const commentStart = timeline.slice(0, timeline.findIndex((s) => s.id === "comment")).reduce((a, s) => a + s.dur, 0);
  const inputs = ["-f", "concat", "-safe", "0", "-i", list, "-f", "lavfi", "-t", String(total), "-i", "anullsrc=r=44100:cl=stereo"];
  const parts: string[] = [];
  const mix = ["[1:a]"];
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
    parts.push(`[${next}:a]adelay=${commentStart * 1000}|${commentStart * 1000}[voice]`);
    mix.push("[voice]");
  }
  parts.push(`${mix.join("")}amix=inputs=${mix.length}:duration=first:normalize=0[a]`);
  const out = join(dir, "short.mp4");
  run(["-y", ...inputs, "-filter_complex", parts.join(";"), "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-t", String(total), "-movflags", "+faststart", out]);

  const y = script.youtube;
  writeFileSync(join(dir, "youtube.txt"), `${y.title}\n\n${y.description}\n\n${y.hashtags.join(" ")}\n`);
  if (!keepFrames) rmSync(framesDir, { recursive: true, force: true });
  console.log(`BGM: ${hasBgm ? "あり" : "なし（無音）"} / 声: ${voice ?? "なし"}`);
  return out;
}
