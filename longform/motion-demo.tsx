/**
 * 動きの見本（11/27・競合の調査から）: 1つの章だけを毎コマ（30fps）描いて、カメラの寄り・引きと差の札・値のポップを試す。
 *   npx tsx longform/motion-demo.tsx <横動画のフォルダ> <章の番号(1〜)> [秒数]
 *   → <フォルダ>/motion-demo.mp4（音は video.mp4 の同じ区間）
 * 差の札は data.json に足さず、ここで入れる（見本だけ）。良ければ data.json の diffs・motion と video.tsx に入れる
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadCharaArt } from "./art";
import { longFonts } from "./fonts";
import { FPS, H, W, frameAt } from "./scenes";
import type { Timeline } from "./types";

const [dir, chNo = "4", secArg] = process.argv.slice(2);
const tl = JSON.parse(readFileSync(join(dir, "timeline.json"), "utf8")) as Timeline;
const ch = tl.chapters[Number(chNo) - 1];
if (ch.scene.type !== "bars") throw new Error("見本は横棒の章だけ");
const lines = (ch as unknown as { lines: { start: number; end: number; text: string }[] }).lines;
const lineEnd = (part: string) => {
  const l = lines.find((x) => x.text.includes(part));
  if (!l) throw new Error(`台詞が見つからない: ${part}`);
  return l;
};
// 差の札（BF の「512GBと1TB」の章）: 台詞のその言葉を言うあたりで出す
const d1 = lineEnd("中古が9,120円安い");
const d2 = lineEnd("ここだけ新品のほうが安い");
const scene = ch.scene;
scene.motion = true;
scene.diffs = [
  { from: 0, to: 1, label: "中古が 9,120円 安い", at: d1.end - ch.start - 1.6 },
  { from: 2, to: 3, label: "新品が 1,880円 安い", at: d2.end - ch.start - 2.4 },
];

const dur = Number(secArg ?? Math.min(26, ch.end - ch.start));
const rv = (i: number) => (ch.scene as { reveal: Record<string, number> }).reveal[`item:${i}`] ?? 0;
const n = scene.rows.length;
// 行の中心（カードの高さに対する割合・おおよそ）。カードの中心からのずれ
const rowOff = (i: number) => (0.14 + (0.86 * (i + 0.5)) / n - 0.5) * 560;

// カメラの段取り（章の頭からの秒・拡大・y）。行が出たらその行へ寄り、差の札で引く
type K = { t: number; s: number; y: number };
const keys: K[] = [{ t: 0, s: 1.0, y: 0 }];
const focus = (t: number, i: number) => keys.push({ t, s: 1.04, y: -rowOff(i) * 0.08 });
focus(rv(0), 0);
focus(rv(1), 1);
keys.push({ t: scene.diffs[0].at!, s: 1.0, y: 0 });
focus(rv(2), 2);
focus(rv(3), 3);
keys.push({ t: scene.diffs[1].at!, s: 1.0, y: 0 });
keys.sort((a, b) => a.t - b.t);
const MOVE = 0.9; // 次の段へ移る秒
const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function camAt(u: number) {
  let cur = keys[0];
  let prev = keys[0];
  for (const k of keys) if (k.t <= u) { prev = cur; cur = k; }
  const p = inOut(Math.min(1, (u - cur.t) / MOVE));
  const s = prev.s + (cur.s - prev.s) * p;
  const y = prev.y + (cur.y - prev.y) * p;
  // ずっと少しだけ横へ流す（止まって見えないように）
  const x = -6 + (12 * u) / dur;
  return { scale: s, x, y };
}

(async () => {
  const fonts = await longFonts(tl);
  const { art } = loadCharaArt(join(dir, "frames"));
  const out = join(dir, "motion-frames");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const total = Math.round(dur * FPS);
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    const u = f / FPS;
    const res = new ImageResponse(frameAt(tl, ch.start + u, { art, camera: camAt(u) }), { width: W, height: H, fonts });
    writeFileSync(join(out, `f${String(f).padStart(5, "0")}.png`), Buffer.from(await res.arrayBuffer()));
    if (f % 60 === 0) console.log(`${f}/${total} コマ（${((Date.now() - t0) / 1000).toFixed(0)} 秒）`);
  }
  const mp4 = join(dir, "motion-demo.mp4");
  const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(FPS), "-i", join(out, "f%05d.png"), "-ss", String(ch.start), "-t", String(dur), "-i", join(dir, "video.mp4"), "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", mp4], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  // 比べる用: 今の書き出しの同じ区間
  spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(ch.start), "-t", String(dur), "-i", join(dir, "video.mp4"), "-c:v", "libx264", "-crf", "26", "-c:a", "aac", join(dir, "motion-before.mp4")]);
  console.log("→", mp4);
})();
