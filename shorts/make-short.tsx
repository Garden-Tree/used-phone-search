/**
 * YouTube ショート（縦 1080x1920・約40秒）を、サイトの相場と同じ数字で作る
 *   npx tsx shorts/make-short.tsx drops plan [--force]                              … 台本 JSON を作る（shorts/out/<日付>-drops/script.json）
 *   npx tsx shorts/make-short.tsx drops render [--variant A|B|C|all] [--dir <フォルダ>] [--keep-frames] [--no-voice]  … 台本から short.mp4 と youtube.txt を作る
 *   npx tsx shorts/make-short.tsx --voice-test "テキスト" [--speaker 3|ずんだもん/ノーマル] [--speed 1.25]  … VOICEVOX の声だけ試す（shorts/out/voice-test.wav）
 *   npx tsx shorts/make-short.tsx --voice-dump "テキスト"|script [--dir <フォルダ>]  … 読み（アクセント句）の直す前と後を出す
 * 声（VOICEVOX）は任意。アプリが起動していなければ声なしで書き出す（shorts/voice.ts）
 * 手順は shorts/README.md。DB は既存の集計だけ読む（Neon の転送量に配慮）
 */
import "dotenv/config";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import prisma from "@/lib/prisma";
import { buildDropsScript } from "./themes/drops";
import { renderShort } from "./render";
import type { Script } from "./types";
import { DEFAULT_SPEAKER, DEFAULT_SPEED, VOICEVOX_URL, defaultNarration, engineAvailable, narrationOf, resolveSpeaker, speakable, synthesize, tunedQuery, voiceCredit } from "./voice";

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
  const built = await buildDropsScript(today);
  // ナレーションの下書き（全場面・台本の数字だけ）と声の設定。comment は narration から消せば comment.lines を読む（直した lines が声にも反映）
  const { comment: _c, ...narration } = defaultNarration(built);
  void _c;
  const script: Script = { ...built, narration, voice: { speaker: DEFAULT_SPEAKER, speedScale: DEFAULT_SPEED } };
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(script, null, 2) + "\n");
  const s = script.scenes;
  console.log(`台本: ${file}`);
  console.log(`1位 ${s.hook.model}（${s.hook.storage}） −${s.hook.drop.toLocaleString()}円 / 比較 ${script.fromDate}〜${script.toDate} / ${script.shopCount}店 / 推移 ${s.trend.points.length}点`);
  s.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.model} ${r.storage} −${r.rate.toFixed(1)}%（−${r.drop.toLocaleString()}円）`));
  console.log(`コメント（要確認・書き換え可）: ${s.comment.lines.join(" / ")}`);
  for (const [k, v] of Object.entries(narration)) console.log(`ナレーション ${k}: ${v}`);
  console.log("ナレーション comment: comment.lines を読む");
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
  const outs = await renderShort(dir, script, flag("keep-frames"), v === "ALL" ? "all" : (v as "A" | "B" | "C"), !flag("no-voice"));
  console.log(`書き出し: ${outs.join(", ")}（${Math.round((Date.now() - t0) / 1000)} 秒）`);
}

/** VOICEVOX の声だけ作って確かめる（エンジンに届くか・話者・読み・長さ）。結果は shorts/out/voice-test.wav */
async function voiceTest(text: string) {
  if (!(await engineAvailable())) {
    console.error(`VOICEVOX（${VOICEVOX_URL}）に接続できません。VOICEVOX アプリを起動してから試してください`);
    process.exitCode = 1;
    return;
  }
  const sp = opt("speaker");
  const speaker = sp === undefined ? undefined : /^\d+$/.test(sp) ? Number(sp) : sp;
  const speed = opt("speed");
  const cfg = { speaker, speedScale: speed ? Number(speed) : undefined };
  const who = await resolveSpeaker(speaker, true);
  const clip = await synthesize(text, cfg, true);
  if (!clip) throw new Error("合成できませんでした");
  const out = join(OUT, "voice-test.wav");
  mkdirSync(OUT, { recursive: true });
  copyFileSync(clip.file, out);
  console.log(`話者: ${who.character}（${who.style ?? ""}・ID ${who.id}）/ 読み: ${speakable(text)} / ${clip.dur.toFixed(2)} 秒`);
  console.log(`書き出し: ${out}（キャッシュ ${clip.file}）/ クレジット: ${voiceCredit(who.character)}`);
}

/**
 * 読みの確認（聞かずに確かめる）: 文ごとに、エンジンの読み（before）と直した読み（after）を AquesTalk 風記法で出す。
 * 引数が "script" なら最新の台本（または --dir）の全ナレーション
 */
async function voiceDump(arg: string) {
  if (!(await engineAvailable())) throw new Error(`VOICEVOX（${VOICEVOX_URL}）に接続できません`);
  let items: [string, string, string | undefined][] = [["text", arg, undefined]];
  let cfg: Script["voice"];
  if (arg === "script") {
    const dir = opt("dir") ? resolve(opt("dir")!) : join(OUT, readdirSync(OUT).filter((d) => /-drops$/.test(d)).sort().pop()!);
    const s: Script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
    cfg = s.voice;
    items = Object.entries(narrationOf(s)).filter(([, t]) => t).map(([k, t]) => [k, t!, s.narrationKana?.[k as keyof typeof s.narrationKana]]);
  }
  const sp = await resolveSpeaker(cfg?.speaker, true);
  for (const [k, text, override] of items) {
    const { spoken, before, after } = await tunedQuery(text, cfg, sp.id, override);
    console.log(`■ ${k}: ${text}
  文: ${spoken}
  before: ${before}
  after : ${after}${after === before ? "（同じ）" : ""}`);
  }
}

async function main() {
  const vd = opt("voice-dump");
  if (vd !== undefined) return voiceDump(vd);
  const vt = opt("voice-test");
  if (vt !== undefined) return voiceTest(vt);
  if (theme !== "drops" || (step !== "plan" && step !== "render")) {
    throw new Error("使い方: npx tsx shorts/make-short.tsx drops <plan|render> [--force] [--variant A|B|C|all] [--dir <フォルダ>] [--keep-frames] [--no-voice]\n      npx tsx shorts/make-short.tsx --voice-test \"テキスト\" [--speaker 3] [--speed 1.25]\n      npx tsx shorts/make-short.tsx --voice-dump \"テキスト\"|script [--dir <フォルダ>]");
  }
  await (step === "plan" ? plan() : render());
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
