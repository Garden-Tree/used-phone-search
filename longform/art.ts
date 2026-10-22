/**
 * 立ち絵（longform/assets/chara/。chara.py が PSD から作る・Git に入れない）を読む。video.tsx と render.ts で共有する
 *
 * - tsumugi.png・zundamon.png（口を閉じた絵）と、任意の *-talk.png（口を開けた絵。同じ大きさ・同じ位置）
 * - 大きい絵（高さ 1300px 超）は 1200px に縮めて work/ に置く（コマごとの縮小を軽くする）
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtImage, CharaArt } from "./scenes";
import type { Who } from "./script";

const CHARA_DIR = join(__dirname, "assets/chara");
const CHARA_FILE: Record<Who, string> = { つむぎ: "tsumugi", ずんだもん: "zundamon" };

const pngSize = (buf: Buffer) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

export function loadCharaArt(work: string): { art: CharaArt; files: string[] } {
  const art: CharaArt = {};
  const files: string[] = [];
  const load = (name: string): ArtImage | undefined => {
    const src = join(CHARA_DIR, `${name}.png`);
    if (!existsSync(src)) return undefined;
    let buf = readFileSync(src);
    if (pngSize(buf).h > 1300) {
      mkdirSync(work, { recursive: true });
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
