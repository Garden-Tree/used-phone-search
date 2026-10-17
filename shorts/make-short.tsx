/**
 * YouTube ショート（縦 1080x1920・約40秒）を、サイトの相場と同じ数字で作る
 *   npx tsx shorts/make-short.tsx drops plan [--force]                              … 台本 JSON を作る（shorts/out/<日付>-drops/script.json）
 *   npx tsx shorts/make-short.tsx drops render [--variant A|B|C|all] [--dir <フォルダ>] [--keep-frames]  … 台本から short.mp4 と youtube.txt を作る
 * 手順は shorts/README.md。DB は既存の集計だけ読む（Neon の転送量に配慮）
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import prisma from "@/lib/prisma";
import { buildDropsScript } from "./themes/drops";
import { renderShort } from "./render";
import type { Script } from "./types";

const args = process.argv.slice(2);
const [theme, step] = args;
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const OUT = resolve(__dirname, "out");
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

async function plan() {
  const dir = join(OUT, `${today}-${theme}`);
  const file = join(dir, "script.json");
  if (existsSync(file) && !flag("force")) throw new Error(`${file} はすでにあります（上書きするなら --force。コメントを直した後は上書きしないでください）`);
  const script = await buildDropsScript(today);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(script, null, 2) + "\n");
  const s = script.scenes;
  console.log(`台本: ${file}`);
  console.log(`1位 ${s.hook.model}（${s.hook.storage}） −${s.hook.drop.toLocaleString()}円 / 比較 ${script.fromDate}〜${script.toDate} / ${script.shopCount}店 / 推移 ${s.trend.points.length}点`);
  s.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.model} ${r.storage} −${r.rate.toFixed(1)}%（−${r.drop.toLocaleString()}円）`));
  console.log(`コメント（要確認・書き換え可）: ${s.comment.lines.join(" / ")}`);
  console.log(`タイトル: ${script.youtube.title}`);
}

async function render() {
  let dir = opt("dir");
  if (dir) dir = resolve(dir);
  else {
    const found = existsSync(OUT) ? readdirSync(OUT).filter((d) => d.endsWith(`-${theme}`) && existsSync(join(OUT, d, "script.json"))).sort() : [];
    if (found.length === 0) throw new Error("台本がありません。先に plan を実行してください");
    dir = join(OUT, found[found.length - 1]);
  }
  const script: Script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
  const t0 = Date.now();
  const v = (opt("variant") ?? "all").toUpperCase();
  if (!["A", "B", "C", "ALL"].includes(v)) throw new Error("--variant は A・B・C・all のどれか");
  const outs = await renderShort(dir, script, flag("keep-frames"), v === "ALL" ? "all" : (v as "A" | "B" | "C"));
  console.log(`書き出し: ${outs.join(", ")}（${Math.round((Date.now() - t0) / 1000)} 秒）`);
}

async function main() {
  if (theme !== "drops" || (step !== "plan" && step !== "render")) {
    throw new Error("使い方: npx tsx shorts/make-short.tsx drops <plan|render> [--force] [--variant A|B|C|all] [--dir <フォルダ>] [--keep-frames]");
  }
  await (step === "plan" ? plan() : render());
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
