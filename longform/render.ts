/**
 * 横動画のコマを PNG にする（ImageResponse = next/og。ショートと同じ作り方）
 *
 *   npx tsx longform/render.ts longform/2026-10-21-iphone-dore stills       # 章ごとに1枚（stills/ch01.png〜）と一覧（stills/contact.png）
 *   npx tsx longform/render.ts longform/2026-10-21-iphone-dore frame 95.5   # その秒の1枚（stills/at-95.5.png）
 *
 * - 先に timeline.ts で timeline.json を作る（なければここで作る）
 * - 動画全体は video.tsx（絵が変わるところだけ PNG にする）。ここは見本だけ。ffmpeg は一覧の1回だけ・1スレッド
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { longFonts } from "./fonts";
import { H, W, frameAt } from "./scenes";
import { buildTimeline } from "./timeline";
import type { Timeline } from "./types";

async function loadTimeline(dir: string): Promise<Timeline> {
  const f = join(dir, "timeline.json");
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8")) as Timeline;
  const { timeline, warnings } = await buildTimeline(dir);
  for (const w of warnings) console.warn("注意:", w);
  writeFileSync(f, JSON.stringify(timeline, null, 2));
  return timeline;
}

(async () => {
  const [dir, mode = "stills", at] = process.argv.slice(2);
  if (!dir) throw new Error("使い方: npx tsx longform/render.ts <台本のフォルダ> [stills | frame <秒>]");
  const tl = await loadTimeline(dir);
  const fonts = await longFonts(tl);
  const out = join(dir, "stills");
  mkdirSync(out, { recursive: true });
  const save = async (t: number, file: string) => {
    const res = new ImageResponse(frameAt(tl, t), { width: W, height: H, fonts });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log("saved", file);
  };

  if (mode === "frame") {
    const t = Number(at);
    if (!Number.isFinite(t)) throw new Error("秒を指定してください（例: frame 95.5）");
    await save(t, join(out, `at-${t}.png`));
    return;
  }

  for (const ch of tl.chapters) await save(ch.stillAt, join(out, `ch${String(ch.index).padStart(2, "0")}.png`));
  // 一覧（3列×4段・1枚 640x360）。ffmpeg は1回・1スレッド
  const cols = 3;
  const rows = Math.ceil(tl.chapters.length / cols);
  const r = spawnSync("ffmpeg", ["-loglevel", "error", "-threads", "1", "-y", "-start_number", "1", "-i", join(out, "ch%02d.png"), "-vf", `scale=640:360,tile=${cols}x${rows}:padding=8:color=white`, "-frames:v", "1", join(out, "contact.png")], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg が失敗しました\n${r.stderr}`);
  console.log("saved", join(out, "contact.png"));
})();
