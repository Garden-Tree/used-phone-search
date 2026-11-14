/**
 * 安全な帯（scenes.tsx の SAFE）の外に、読ませるもの（文字・数字・棒・札）が出ていないかを確かめる。動画は書き出さない。
 *   npx tsx shorts/safe-check.tsx [テーマ…] [--dir <台本のフォルダ>] [--out <画像の置き場所>]
 * テーマごとに shorts/out の最新の台本（--dir があればその台本だけ）で、全場面の動きの終わりのコマを、台本のまま・実写モード・図だけの両方で作り、
 * 地の色と違う画素がある y の範囲を出す。帯の外（y < top・y > 1920−bottom）に出ていたら「✗」、見出しの帯・内容・注記の間に食い込んでいたら「△」。
 * 画像には帯の境界（赤）と右のボタンの幅（橙）の線を引いて <out>（既定 shorts/out/safe）に書き、一覧 contact-N.png に並べる。右の幅は目で見る
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { notoSansJp } from "@/lib/ogFont";
import { BODY, H, HEADER, NOTE, SAFE, TIMELINE, W, sceneFrame, variantsOf } from "./scenes";
import type { Script } from "./types";

const OUT = resolve(__dirname, "out");
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };

function allText(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(allText).join("");
  if (v && typeof v === "object") return Object.values(v).map(allText).join("");
  return "";
}

/** 地（左上の画素）と違う画素がある行。透明の地（実写モード）は、ぼかした影を数えないよう不透明度で見る */
async function rowsUsed(png: Buffer): Promise<boolean[]> {
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = [data[0], data[1], data[2], data[3]];
  const clear = bg[3] < 16;
  const diff = (i: number, j: number) => Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]);
  const used: boolean[] = new Array(H).fill(false);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // 地にグラデーションがある見た目（DROPS など）は、同じ行の左の端の画素と比べる
      if (clear ? data[i + 3] > 150 : diff(i, 0) > 40 && diff(i, y * W * 4) > 40) { used[y] = true; break; }
    }
  }
  return used;
}

const guides = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect x="0" y="0" width="${W}" height="${SAFE.top}" fill="rgba(255,0,0,0.18)"/><rect x="0" y="${H - SAFE.bottom}" width="${W}" height="${SAFE.bottom}" fill="rgba(255,0,0,0.18)"/>
<rect x="${W - SAFE.right}" y="${SAFE.top}" width="${SAFE.right}" height="${H - SAFE.top - SAFE.bottom}" fill="rgba(255,150,0,0.16)"/>
<line x1="0" y1="${SAFE.top}" x2="${W}" y2="${SAFE.top}" stroke="red" stroke-width="4"/><line x1="0" y1="${H - SAFE.bottom}" x2="${W}" y2="${H - SAFE.bottom}" stroke="red" stroke-width="4"/>
<line x1="${W - SAFE.right}" y1="${SAFE.top}" x2="${W - SAFE.right}" y2="${H - SAFE.bottom}" stroke="orange" stroke-width="4"/></svg>`);

async function main() {
  const skip = new Set([arg("dir"), arg("out")]);
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith("--") && !skip.has(a));
  const dir = resolve(arg("out") ?? join(OUT, "safe"));
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const folders = arg("dir") ? [resolve(arg("dir")!)] : (() => {
    const latest = new Map<string, string>();
    for (const d of readdirSync(OUT).sort()) {
      const m = d.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
      if (m && existsSync(join(OUT, d, "script.json")) && (!wanted.length || wanted.includes(m[1]))) latest.set(m[1], join(OUT, d));
    }
    return [...latest.values()];
  })();
  const src = readFileSync(join(__dirname, "scenes.tsx"), "utf8") + readFileSync(join(__dirname, "looks.ts"), "utf8");
  const files: string[] = [];
  let bad = 0;
  let warn = 0;
  for (const folder of folders) {
    const base: Script = JSON.parse(readFileSync(join(folder, "script.json"), "utf8"));
    if (!base.scenes?.comment) { console.log(`- ${folder}: ショートの台本ではないので飛ばします`); continue; }
    const fonts = await notoSansJp(allText(base) + src + "0123456789,.%");
    // 台本のまま・もう片方のモード（実写 ⇔ 図だけ）
    const modes: [string, Script][] = [[base.liveClip ? "live" : "plain", base], base.liveClip ? ["plain", { ...base, liveClip: undefined }] : ["live", { ...base, liveClip: "check" }]];
    for (const [mode, script] of modes) {
      for (const v of variantsOf(script)) {
        for (const sc of TIMELINE(script, v)) {
          let png: Buffer;
          try {
            png = Buffer.from(await new ImageResponse(sceneFrame(sc, script, sc.anim), { width: W, height: H, fonts }).arrayBuffer());
          } catch (e) {
            console.log(`- ${script.theme} ${mode} ${v} ${sc.id}: 作れません（${(e as Error).message.slice(0, 60)}）`);
            continue;
          }
          const used = await rowsUsed(png);
          const top = used.indexOf(true);
          const bottom = used.lastIndexOf(true);
          const out = top >= 0 && (top < SAFE.top || bottom > H - SAFE.bottom);
          // 見出しの帯と内容の間・内容と注記の間（締めは帯がないので見ない）
          const gap = sc.id !== "outro" && [[HEADER.top + HEADER.height, BODY.top], [BODY.top + BODY.height, NOTE.top]].some(([a, b]) => used.slice(a + 1, b - 1).some(Boolean)) && !(mode === "live" && sc.id === "hook");
          if (out) bad++;
          else if (gap) warn++;
          const name = `${script.theme}-${mode}-${v}-${sc.id}.png`;
          console.log(`${out ? "✗" : gap ? "△" : "○"} ${script.theme} ${mode} ${v} ${sc.id}: y ${top}〜${bottom}${out ? "（帯の外）" : gap ? "（帯・内容・注記の間に食い込み）" : ""}`);
          const file = join(dir, name);
          // 透明の地は灰色に敷いて見えるように
          writeFileSync(file, await sharp(png).flatten({ background: "#555" }).composite([{ input: guides }]).png().toBuffer());
          files.push(file);
        }
      }
    }
  }
  console.log(`帯 y${SAFE.top}〜${H - SAFE.bottom}・右 x${W - SAFE.right}〜: 帯の外 ${bad} 場面・食い込み ${warn} 場面（${files.length} 場面）`);
  // 一覧（1枚に 10列×3行）
  const PER = 30;
  for (let p = 0; p * PER < files.length; p++) {
    const seq = join(dir, "seq");
    rmSync(seq, { recursive: true, force: true });
    mkdirSync(seq);
    const part = files.slice(p * PER, (p + 1) * PER);
    part.forEach((f, i) => writeFileSync(join(seq, `${String(i).padStart(3, "0")}.png`), readFileSync(f)));
    const sheet = join(dir, `contact-${p + 1}.png`);
    const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "1", "-i", join(seq, "%03d.png"), "-vf", `scale=216:384,tile=10x${Math.ceil(part.length / 10)}:padding=6:margin=6:color=white`, "-frames:v", "1", sheet], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr);
    rmSync(seq, { recursive: true, force: true });
    console.log(`一覧: ${sheet}`);
  }
  if (bad) process.exitCode = 1;
}

main();
