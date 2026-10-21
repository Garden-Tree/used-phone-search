/**
 * YouTube ショート（縦 1080x1920・約40秒）を、サイトの相場と同じ数字で作る
 *   npx tsx shorts/make-short.tsx <drops|budget|newused> plan [--force]                     … 台本 JSON を作る（shorts/out/<日付>-<テーマ>/script.json）
 *   npx tsx shorts/make-short.tsx <drops|budget|newused> render [--variant A|B|C|all] [--dir <フォルダ>] [--keep-frames] [--no-voice]  … 台本から short-*.mp4 と youtube.txt を作る
 * テーマ: drops＝今週いちばん値下がりした中古iPhone（型 A・B・C）/ budget＝予算ぴったりで買える中古iPhone（型 A だけ）
 *   npx tsx shorts/make-short.tsx --voice-test "テキスト" [--speaker 8|春日部つむぎ/ノーマル] [--speed 1.25]  … VOICEVOX の声だけ試す（shorts/out/voice-test.wav）
 *   npx tsx shorts/make-short.tsx --voice-dump "テキスト"|script [--dir <フォルダ>] [--speaker …]  … 読み（アクセント句）の直す前と後を出す（script は最後に作った台本）
 * 声（VOICEVOX）は任意。アプリが起動していなければ声なしで書き出す（shorts/voice.ts）
 * 手順は shorts/README.md。DB は既存の集計だけ読む（Neon の転送量に配慮）
 */
import "dotenv/config";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import prisma from "@/lib/prisma";
import { buildDropsScript } from "./themes/drops";
import { buildBudgetScript } from "./themes/budget";
import { buildNewUsedScript } from "./themes/newused";
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
const THEMES = ["drops", "budget", "newused"] as const;
/**
 * テーマごとの声。drops・budget は 春日部つむぎ（ノーマル）＝ DEFAULT_SPEAKER（10/21 ユーザーの指示。1本目の drops は ずんだもんだった）。
 * newused は 青山龍星（ノーマル）（10/21 ユーザーの指示。この PC では ID 13）。
 * 名前で指定するので、ID はエンジン（GET /speakers）から引く。クレジットは render がキャラクター名から自動で入れる
 */
const THEME_SPEAKER: Record<(typeof THEMES)[number], number | string> = { drops: DEFAULT_SPEAKER, budget: DEFAULT_SPEAKER, newused: "青山龍星/ノーマル" };

async function plan() {
  const dir = join(OUT, `${today}-${theme}`);
  const file = join(dir, "script.json");
  if (existsSync(file) && !flag("force")) throw new Error(`${file} はすでにあります（上書きするなら --force。コメントを直した後は上書きしないでください）`);
  const built: Script = theme === "budget" ? await buildBudgetScript(today) : theme === "newused" ? await buildNewUsedScript(today) : await buildDropsScript(today);
  // ナレーションの下書き（全場面・台本の数字だけ）と声の設定。comment は narration から消せば comment.lines を読む（直した lines が声にも反映）
  const { comment: _c, ...narration } = defaultNarration(built);
  void _c;
  const script: Script = { ...built, narration, voice: { speaker: THEME_SPEAKER[built.theme], speedScale: DEFAULT_SPEED } };
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(script, null, 2) + "\n");
  console.log(`台本: ${file}`);
  if (script.theme === "budget") {
    const p = script.scenes.pick;
    script.scenes.budgets.rows.forEach((r) => console.log(`  ${r.label}: ${r.model}（${r.released}・${r.storage}） 相場 ${r.median.toLocaleString()}円`));
    console.log(`注目 ${p.label}: ${p.model} 相場 ${p.median.toLocaleString()}円・在庫 ${p.count}台 / ${script.shopCount}店`);
  } else if (script.theme === "newused") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.model}（${r.storage}・在庫${r.count}件） 新品 ${r.newPrice.toLocaleString()}円 → 中古の相場 ${r.usedMedian.toLocaleString()}円（−${r.diff.toLocaleString()}円・−${r.pct.toFixed(1)}%）`));
    console.log(`${script.shopCount}店 / 新品価格の確認日 ${script.appleChecked}`);
  } else {
    const s = script.scenes;
    console.log(`1位 ${s.hook.model}（${s.hook.storage}） −${s.hook.drop.toLocaleString()}円 / 比較 ${script.fromDate}〜${script.toDate} / ${script.shopCount}店 / 推移 ${s.trend.points.length}点`);
    s.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.model} ${r.storage} −${r.rate.toFixed(1)}%（−${r.drop.toLocaleString()}円）`));
  }
  console.log(`声: ${script.voice?.speaker}・速さ ${script.voice?.speedScale}`);
  console.log(`コメント（要確認・書き換え可）: ${script.scenes.comment.lines.join(" / ")}`);
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
    // --dir がなければ、いちばん最近に書いた台本（テーマを問わない）
    const dir = opt("dir") ? resolve(opt("dir")!) : readdirSync(OUT).map((d) => join(OUT, d, "script.json")).filter(existsSync)
      .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs).pop()!.replace(/[\\/]script\.json$/, "");
    const s: Script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
    cfg = s.voice;
    items = Object.entries(narrationOf(s)).filter(([, t]) => t).map(([k, t]) => [k, t!, s.narrationKana?.[k as keyof typeof s.narrationKana]]);
  }
  const spOpt = opt("speaker");
  if (spOpt) cfg = { ...cfg, speaker: /^\d+$/.test(spOpt) ? Number(spOpt) : spOpt };
  const sp = await resolveSpeaker(cfg?.speaker, true);
  console.log(`話者: ${sp.character}（${sp.style ?? ""}・ID ${sp.id}）`);
  for (const [k, text, override] of items) {
    const { spoken, before, after, longVowels, moras } = await tunedQuery(text, cfg, sp.id, override);
    console.log(`■ ${k}: ${text}
  文: ${spoken}
  before: ${before}
  after : ${after}${after === before ? "（同じ）" : ""}
  長音  : ${longVowels.length ? longVowels.join("・") : "なし"}
  モーラ: ${moras}`);
  }
}

async function main() {
  const vd = opt("voice-dump");
  if (vd !== undefined) return voiceDump(vd);
  const vt = opt("voice-test");
  if (vt !== undefined) return voiceTest(vt);
  if (!THEMES.includes(theme as (typeof THEMES)[number]) || (step !== "plan" && step !== "render")) {
    throw new Error("使い方: npx tsx shorts/make-short.tsx <drops|budget|newused> <plan|render> [--force] [--variant A|B|C|all] [--dir <フォルダ>] [--keep-frames] [--no-voice]\n      npx tsx shorts/make-short.tsx --voice-test \"テキスト\" [--speaker 3] [--speed 1.25]\n      npx tsx shorts/make-short.tsx --voice-dump \"テキスト\"|script [--dir <フォルダ>]");
  }
  await (step === "plan" ? plan() : render());
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
