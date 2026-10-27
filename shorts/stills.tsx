/**
 * 動画を書き出さずに、場面の静止画だけ作って見た目を確かめる（PC に重い全コマの書き出しをしない）。
 *   npx tsx shorts/stills.tsx [テーマ…]
 * テーマごとに shorts/out の最新の台本（<日付>-<テーマ>/script.json）から、型 A の つかみ（t=0）・ランキング（全行が出たところ）・1位の発表（動きの終わり）の3枚を
 * shorts/out/looks/<テーマ>-<場面>.png に1枚ずつ順に書き、全部を縮めて並べた shorts/out/looks-contact.png（テーマ×3枚）を作る。声は使わない（場面の長さは声なしの値）
 *   npx tsx shorts/stills.tsx --outro [テーマ…]
 * 締め（outro）の最後のコマだけを shorts/out/looks/<テーマ>-outro.png に書く（関連動画の札・横動画のサムネの確かめ。一覧は looks-contact-outro.png）
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { H, TIMELINE, W, sceneFrame, type SceneId } from "./scenes";
import type { Script } from "./types";

const OUT = resolve(__dirname, "out");
const THEMES = ["drops", "budget", "pixelbudget", "ipadbudget", "macbudget", "probudget", "foldbudget", "galaxybudget", "bigbudget", "newused", "provs", "promax", "plusvs", "plusmax", "oldpro", "minie", "fold", "rank", "unused", "battery", "gen", "storage", "ios27line", "batteryswap", "overnew", "rakutenmobile", "ipadmini", "watchgen", "macgen", "ipadgen", "pixelgen"] as const;
const OUTRO = process.argv.includes("--outro");
const SHOTS: { id: SceneId; at: "start" | "end" }[] = OUTRO ? [{ id: "outro", at: "end" }] : [{ id: "hook", at: "start" }, { id: "ranking", at: "end" }, { id: "reveal", at: "end" }];
/** 一覧の1枚の大きさ（1080x1920 の 1/4） */
const TW = 270;
const TH = 480;

function allText(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(allText).join("");
  if (v && typeof v === "object") return Object.values(v).map(allText).join("");
  return "";
}

async function main() {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const themes = wanted.length ? THEMES.filter((t) => wanted.includes(t)) : [...THEMES];
  const dir = join(OUT, "looks");
  mkdirSync(dir, { recursive: true });
  const src = readFileSync(join(__dirname, "scenes.tsx"), "utf8") + readFileSync(join(__dirname, "looks.ts"), "utf8");
  const files: string[] = [];
  for (const theme of themes) {
    const found = readdirSync(OUT).filter((d) => d.endsWith(`-${theme}`) && existsSync(join(OUT, d, "script.json"))).sort();
    if (!found.length) {
      console.warn(`${theme}: 台本がないので飛ばします`);
      continue;
    }
    const script: Script = JSON.parse(readFileSync(join(OUT, found[found.length - 1], "script.json"), "utf8"));
    const fonts = await notoSansJp(allText(script) + src + "0123456789,.%");
    const timeline = TIMELINE(script, "A");
    for (const shot of SHOTS) {
      const sc = timeline.find((x) => x.id === shot.id) ?? timeline[0];
      const t = shot.at === "start" ? 0 : sc.anim;
      const res = new ImageResponse(sceneFrame(sc, script, t), { width: W, height: H, fonts });
      const file = join(dir, `${theme}-${shot.id}.png`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      files.push(file);
      console.log(`${found[found.length - 1]} ${shot.id} t=${t.toFixed(2)} → ${file}`);
    }
  }
  if (!files.length) return;
  // 一覧: 連番にコピーして ffmpeg の tile で並べる（行＝テーマ、列＝つかみ・ランキング・発表）
  const seq = join(dir, "seq");
  rmSync(seq, { recursive: true, force: true });
  mkdirSync(seq);
  files.forEach((f, i) => writeFileSync(join(seq, `${String(i).padStart(3, "0")}.png`), readFileSync(f)));
  const cols = OUTRO ? Math.min(files.length, 4) : SHOTS.length;
  const rows = Math.ceil(files.length / cols);
  const sheet = join(OUT, OUTRO ? "looks-contact-outro.png" : "looks-contact.png");
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "1", "-i", join(seq, "%03d.png"),
    "-vf", `scale=${TW}:${TH},tile=${cols}x${rows}:padding=12:margin=12:color=white`, "-frames:v", "1", sheet], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  rmSync(seq, { recursive: true, force: true });
  console.log(`一覧: ${sheet}`);
}

main();
