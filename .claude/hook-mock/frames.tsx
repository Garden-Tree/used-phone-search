/**
 * つかみ（hook）の動きの確認: 台本のフォルダと時刻を指定して、その時刻のコマを PNG に書く。
 *   npx tsx .claude/hook-mock/frames.tsx shorts/out/2026-11-03-battery 0.2 0.6 1.2
 * 出力は .claude/hook-mock/frame-<フォルダ名>-<t>.png と、横に並べた .claude/hook-mock/frames-<フォルダ名>.png
 */
import React from "react";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { H, TIMELINE, W, sceneFrame } from "../../shorts/scenes";
import type { Script } from "../../shorts/types";

const OUT = resolve(__dirname);
function allText(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(allText).join("");
  if (v && typeof v === "object") return Object.values(v).map(allText).join("");
  return "";
}
async function main() {
  const [dir, ...ts] = process.argv.slice(2);
  const script: Script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
  const src = readFileSync(resolve(__dirname, "../../shorts/scenes.tsx"), "utf8") + readFileSync(resolve(__dirname, "../../shorts/looks.ts"), "utf8");
  const fonts = await notoSansJp(allText(script) + src + "0123456789,.%？");
  const sc = TIMELINE(script, "A").find((x) => x.id === "hook")!;
  const files: string[] = [];
  for (const t of ts.map(Number)) {
    const res = new ImageResponse(sceneFrame(sc, script, t), { width: W, height: H, fonts });
    const f = join(OUT, `frame-${basename(dir)}-${t}.png`);
    writeFileSync(f, Buffer.from(await res.arrayBuffer()));
    files.push(f);
  }
  const inputs = files.flatMap((f) => ["-i", f]);
  const filt = files.map((_, i) => `[${i}]scale=360:640[v${i}]`).join(";") + ";" + files.map((_, i) => `[v${i}]`).join("") + `hstack=${files.length},pad=iw+48:ih+24:24:12:white`;
  const sheet = join(OUT, `frames-${basename(dir)}.png`);
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filt, sheet], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  console.log(sheet);
}
main();
