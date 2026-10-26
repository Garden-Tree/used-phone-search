/**
 * YouTube ショート（縦 1080x1920・約40秒）を、サイトの相場と同じ数字で作る
 *   npx tsx shorts/make-short.tsx <drops|budget|pixelbudget|ipadbudget|macbudget|probudget|foldbudget|galaxybudget|bigbudget|newused|provs|promax|plusvs|plusmax|oldpro|minie|fold|rank|unused|battery|gen|storage|ios27line|batteryswap|overnew|rakutenmobile|ipadmini> plan [--force]                     … 台本 JSON を作る（shorts/out/<日付>-<テーマ>/script.json）
 *   npx tsx shorts/make-short.tsx <drops|budget|pixelbudget|ipadbudget|macbudget|probudget|foldbudget|galaxybudget|bigbudget|newused|provs|promax|plusvs|plusmax|oldpro|minie|fold|rank|unused|battery|gen|storage|ios27line|batteryswap|overnew|rakutenmobile|ipadmini> render [--variant A|B|C|all] [--dir <フォルダ>] [--keep-frames] [--no-voice] [--no-bgm] [--tiktok]  … 台本から short-*.mp4 と youtube.txt を作る
 * テーマ: drops＝今週いちばん値下がりした中古iPhone（型 A・B・C）/ budget＝予算ぴったりで買える中古iPhone / newused＝新品より中古でいくら安い？ / provs＝Proと無印、同じ容量でいくら違う？ / fold＝折りたたみスマホ、1世代前にするといくら安い？ / pixelbudget＝予算ぴったりで買える中古Pixel / ipadbudget＝予算ぴったりで買える中古iPad / macbudget＝予算ぴったりで買える中古MacBook / probudget＝予算ぴったりで買える中古iPhone Pro / foldbudget＝予算ぴったりで買える中古折りたたみスマホ / bigbudget＝予算ぴったりで買える 大きい画面の中古iPhone / promax＝Pro MaxとPro、同じ容量でいくら違う？ / plusvs＝Plusと無印、同じ容量でいくら違う？ / plusmax＝大画面はPlusとPro Max、同じ容量でいくら違う？ / oldpro＝1世代前のProと最新の無印、どっちが安い？ / minie＝無印より安い“弟分”（mini・e）、いくら安い？ / unused＝未使用品（ランクS）は、中古（ランクA）よりいくら高い？ / rank＝状態ランクでいくら違う？中古iPhone / battery＝電池90%台だといくら高い？中古iPhone / gen＝iPhone、1世代前にするといくら安い？ / storage＝容量を1つ上げるといくら高い？中古iPhone / ios27line＝iOS 27 に対応する、いちばん安い中古iPhoneは？ / batteryswap＝電池交換を足すと、1つ上の世代と同じ値段？ / overnew＝中古なのに新品より高い？新品との差がいちばん小さい中古iPhone / rakutenmobile＝楽天モバイルは使った量で3段階｜中古iPhone 14と2年でいくら？（広告の回・PR） / ipadmini＝新型iPad mini、中古の旧型ならいくら安い？（drops 以外は型 A だけ）
 * --no-bgm: BGM なし（声と効果音だけ）の short-A-nobgm.mp4 と youtube-nobgm.txt（BGM のクレジットなし）。YouTube アプリの「音源を追加」で流行りの曲を付けて投稿する用
 * --tiktok: TikTok 用の short-A-tiktok.mp4（BGM なし・締めは「全機種の相場は used.gadelog.com で検索」。プロフィールのリンクと関連動画の誘導なし）と youtube-nobgm.txt
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
import { buildProVsScript } from "./themes/provs";
import { buildProMaxScript } from "./themes/promax";
import { buildPlusVsScript } from "./themes/plusvs";
import { buildPlusMaxScript } from "./themes/plusmax";
import { buildOldProScript } from "./themes/oldpro";
import { buildMinieScript } from "./themes/minie";
import { buildUnusedScript } from "./themes/unused";
import { buildMacBudgetScript } from "./themes/macbudget";
import { buildProBudgetScript } from "./themes/probudget";
import { buildFoldBudgetScript } from "./themes/foldbudget";
import { buildGalaxyBudgetScript } from "./themes/galaxybudget";
import { buildBigBudgetScript } from "./themes/bigbudget";
import { buildFoldScript } from "./themes/fold";
import { buildPixelBudgetScript } from "./themes/pixelbudget";
import { buildIpadBudgetScript } from "./themes/ipadbudget";
import { buildRankScript } from "./themes/rank";
import { buildBatteryScript } from "./themes/battery";
import { buildGenScript } from "./themes/gen";
import { buildStorageScript } from "./themes/storage";
import { buildIos27LineScript } from "./themes/ios27line";
import { buildBatterySwapScript } from "./themes/batteryswap";
import { buildOverNewScript } from "./themes/overnew";
import { buildRakutenMobileScript } from "./themes/rakutenmobile";
import { buildIpadMiniScript } from "./themes/ipadmini";
import { renderShort } from "./render";
import { isBudget, isProVs, type Script } from "./types";
import { DEFAULT_SPEAKER, DEFAULT_SPEED, VOICEVOX_URL, defaultNarration, engineAvailable, forTikTok, narrationOf, resolveSpeaker, speakable, synthesize, tunedQuery, voiceCredit } from "./voice";

const args = process.argv.slice(2);
const [theme, step] = args;
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const OUT = resolve(__dirname, "out");
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
const THEMES = ["drops", "budget", "pixelbudget", "ipadbudget", "macbudget", "probudget", "foldbudget", "galaxybudget", "bigbudget", "newused", "provs", "promax", "plusvs", "plusmax", "oldpro", "minie", "fold", "rank", "unused", "battery", "gen", "storage", "ios27line", "batteryswap", "overnew", "rakutenmobile", "ipadmini"] as const;
/**
 * テーマごとの声。drops・budget は 春日部つむぎ（ノーマル）＝ DEFAULT_SPEAKER（10/21 ユーザーの指示。1本目の drops は ずんだもんだった）。
 * newused・provs・fold は 青山龍星（ノーマル）（10/21・10/22 ユーザーの指示。この PC では ID 13）。pixelbudget は 春日部つむぎ、rank は ずんだもん（ノーマル。口調は「です・ます」のまま）（10/22）。ipadbudget・battery は 青山龍星（10/23）。gen は ずんだもん、storage は 春日部つむぎ（10/23）。promax は provs と同じ 青山龍星、macbudget は 春日部つむぎ（10/23）。probudget は 春日部つむぎ（10/24）。foldbudget は fold と同じ 青山龍星（10/24）。ios27line・batteryswap・overnew は ずんだもん（ノーマル。口調は「です・ます」）（10/25）。plusvs は provs と同じ 青山龍星（10/25）。minie・unused も 青山龍星（10/26）。plusmax は 春日部つむぎ、oldpro は ずんだもん（ノーマル。口調は「です・ます」）（10/26。強い「2つを比べて差を言う」型で 青山龍星 以外の声を試す）。bigbudget は 春日部つむぎ（10/26）。rakutenmobile（広告の回）は 春日部つむぎ（10/26。横動画11本目の解説役と同じ）。 ipadmini（新型 iPad mini の回）は 春日部つむぎ（10/27）。
 * 名前で指定するので、ID はエンジン（GET /speakers）から引く。クレジットは render がキャラクター名から自動で入れる
 */
const THEME_SPEAKER: Record<(typeof THEMES)[number], number | string> = {
  drops: DEFAULT_SPEAKER, budget: DEFAULT_SPEAKER, pixelbudget: DEFAULT_SPEAKER, macbudget: "春日部つむぎ/ノーマル", probudget: "春日部つむぎ/ノーマル", foldbudget: "青山龍星/ノーマル", galaxybudget: "青山龍星/ノーマル", bigbudget: "春日部つむぎ/ノーマル", promax: "青山龍星/ノーマル", plusvs: "青山龍星/ノーマル", plusmax: "春日部つむぎ/ノーマル", oldpro: "ずんだもん/ノーマル", minie: "青山龍星/ノーマル", unused: "青山龍星/ノーマル",
  ipadbudget: "青山龍星/ノーマル", newused: "青山龍星/ノーマル", provs: "青山龍星/ノーマル", fold: "青山龍星/ノーマル", rank: "ずんだもん/ノーマル", battery: "青山龍星/ノーマル", gen: "ずんだもん/ノーマル", storage: "春日部つむぎ/ノーマル",
  ios27line: "ずんだもん/ノーマル", batteryswap: "ずんだもん/ノーマル", overnew: "ずんだもん/ノーマル",
  rakutenmobile: "春日部つむぎ/ノーマル",
  ipadmini: "春日部つむぎ/ノーマル",
};

async function plan() {
  // drops の --days（既定7）。7日以外は別のフォルダ（<日付>-drops-<日数>d）
  const days = Number(opt("days") ?? 7);
  const dir = join(OUT, `${today}-${theme}${theme === "drops" && days !== 7 ? `-${days}d` : ""}`);
  const file = join(dir, "script.json");
  if (existsSync(file) && !flag("force")) throw new Error(`${file} はすでにあります（上書きするなら --force。コメントを直した後は上書きしないでください）`);
  // 予算別の --budgets 40000,60000,80000,120000 --pick 40000（同じ中身の回を避けるため。themes/budget.ts の BudgetOpts）
  const budgetOpts = { budgets: opt("budgets")?.split(",").map(Number), pick: opt("pick") ? Number(opt("pick")) : undefined };
  const built: Script = theme === "budget" ? await buildBudgetScript(today, budgetOpts) : theme === "newused" ? await buildNewUsedScript(today)
    : theme === "provs" ? await buildProVsScript(today) : theme === "promax" ? await buildProMaxScript(today) : theme === "plusvs" ? await buildPlusVsScript(today) : theme === "plusmax" ? await buildPlusMaxScript(today) : theme === "oldpro" ? await buildOldProScript(today) : theme === "minie" ? await buildMinieScript(today) : theme === "unused" ? await buildUnusedScript(today) : theme === "macbudget" ? await buildMacBudgetScript(today) : theme === "probudget" ? await buildProBudgetScript(today) : theme === "foldbudget" ? await buildFoldBudgetScript(today, budgetOpts) : theme === "galaxybudget" ? await buildGalaxyBudgetScript(today) : theme === "bigbudget" ? await buildBigBudgetScript(today) : theme === "fold" ? await buildFoldScript(today)
    : theme === "pixelbudget" ? await buildPixelBudgetScript(today, budgetOpts) : theme === "ipadbudget" ? await buildIpadBudgetScript(today, budgetOpts) : theme === "rank" ? await buildRankScript(today) : theme === "battery" ? await buildBatteryScript(today) : theme === "gen" ? await buildGenScript(today) : theme === "storage" ? await buildStorageScript(today)
    : theme === "ios27line" ? await buildIos27LineScript(today) : theme === "batteryswap" ? await buildBatterySwapScript(today) : theme === "overnew" ? await buildOverNewScript(today) : theme === "rakutenmobile" ? await buildRakutenMobileScript(today) : theme === "ipadmini" ? await buildIpadMiniScript(today) : await buildDropsScript(today, days);
  // ナレーションの下書き（全場面・台本の数字だけ）と声の設定。comment は narration から消せば comment.lines を読む（直した lines が声にも反映）
  const { comment: _c, ...narration } = defaultNarration(built);
  void _c;
  const script: Script = { ...built, narration, voice: { speaker: THEME_SPEAKER[built.theme], speedScale: DEFAULT_SPEED } };
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(script, null, 2) + "\n");
  console.log(`台本: ${file}`);
  if (isBudget(script)) {
    const p = script.scenes.pick;
    script.scenes.budgets.rows.forEach((r) => console.log(`  ${r.label}: ${r.model}（${r.released}・${r.storage}） 相場 ${r.median.toLocaleString()}円${r.updateUntil ? `・アップデート保証 ${r.updateUntil} まで` : ""}${r.pencil ? `・Pencil ${r.pencil}` : ""}${r.chip ? `・${r.chip}チップ` : ""}${r.spec ? `・${r.spec}` : ""}`));
    console.log(`注目 ${p.label}: ${p.model} 相場 ${p.median.toLocaleString()}円・在庫 ${p.count}台 / ${script.shopCount}店`);
  } else if (script.theme === "newused") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.model}（${r.storage}・在庫${r.count}件） 新品 ${r.newPrice.toLocaleString()}円 → 中古の相場 ${r.usedMedian.toLocaleString()}円（−${r.diff.toLocaleString()}円・−${r.pct.toFixed(1)}%）`));
    console.log(`${script.shopCount}店 / 新品価格の確認日 ${script.appleChecked}`);
  } else if (isProVs(script)) {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.base}／${r.pro}（${r.storage}・在庫${r.baseCount}件／${r.proCount}件） ${r.baseMedian.toLocaleString()}円 → ${r.proMedian.toLocaleString()}円（+${r.diff.toLocaleString()}円・+${r.pct.toFixed(1)}%）`));
    const u = script.scenes.upgrade;
    console.log(u ? `容量を上げると: ${u.model} ${u.from}→${u.to} +${u.diff.toLocaleString()}円` : "容量を上げる差: なし");
  } else if (script.theme === "rank") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.model}（${r.storage}） ${r.buckets.map((b) => `${b.rank} ${b.median.toLocaleString()}円（${b.count}件）`).join("・")}（A−C ${r.diff.toLocaleString()}円・−${r.pct.toFixed(1)}%）`));
  } else if (script.theme === "battery") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.model}（${r.storage}） 90%台 ${r.hiMedian.toLocaleString()}円（${r.hiCount}件）・80%台 ${r.loMedian.toLocaleString()}円（${r.loCount}件）（+${r.diff.toLocaleString()}円・+${r.pct.toFixed(1)}%）`));
  } else if (script.theme === "storage") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.model} ${r.from} ${r.fromMedian.toLocaleString()}円 → ${r.to} ${r.toMedian.toLocaleString()}円（+${r.diff.toLocaleString()}円・+${r.pct.toFixed(1)}%）`));
  } else if (script.theme === "ios27line") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.model}（${r.storage}・在庫${r.count}件・${r.released}発売） 相場 ${r.median.toLocaleString()}円`));
    const l = script.scenes.legacy;
    console.log(l ? `iOS 27 非対応でいちばん新しい世代（${l.storage}）: ${l.model} 相場 ${l.median.toLocaleString()}円（在庫${l.count}件）・1位との差 ${l.diff >= 0 ? "+" : "−"}${Math.abs(l.diff).toLocaleString()}円` : "iOS 27 非対応の比較: なし");
  } else if (script.theme === "batteryswap") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.older}（${r.storage}） ${r.olderMedian.toLocaleString()}円＋電池 ${r.battery.toLocaleString()}円＝${r.total.toLocaleString()}円 vs ${r.newer} ${r.newerMedian.toLocaleString()}円（差 ${r.gap >= 0 ? "+" : "−"}${Math.abs(r.gap).toLocaleString()}円・在庫${r.olderCount}件／${r.newerCount}件）`));
  } else if (script.theme === "overnew") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.model}（${r.storage}・在庫${r.count}件） 新品 ${r.newPrice.toLocaleString()}円・中古の相場 ${r.usedMedian.toLocaleString()}円（新品の${r.ratio.toFixed(1)}%・差 ${r.diff >= 0 ? "−" : "+"}${Math.abs(r.diff).toLocaleString()}円）`));
    console.log(`${script.shopCount}店 / 新品価格の確認日 ${script.appleChecked}`);
  } else if (script.theme === "rakutenmobile") {
    const d = script.scenes.device;
    const t = script.scenes.tiers;
    console.log(`  ${t.plan}（税込・割引なし・${script.pricesChecked} 確認）: ${t.rows.map((r) => `${r.label} 月${r.monthly.toLocaleString()}円`).join("・")}`);
    console.log(`  中古${d.model} ${d.storage}（ジャンク以外 ${d.count}件）相場 ${d.median.toLocaleString()}円`);
    t.rows.forEach((r) => console.log(`  2年 ${r.label}: ${d.median.toLocaleString()}円 + ${r.monthly.toLocaleString()}円×${t.months} = ${r.total.toLocaleString()}円`));
    console.log(`  上と下の段の差（2年）: ${script.scenes.diff.toLocaleString()}円 / ${script.shopCount}店`);
  } else if (script.theme === "ipadmini") {
    const nm = script.scenes.newModel;
    console.log(`  新型 ${nm.name}（${nm.release} 発売・Apple 公式 ${script.appleChecked} 確認）128GB ${nm.price.toLocaleString()}円〜`);
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i === 0 ? "伏せ" : `行${i + 1}`}. ${r.model}（${r.year}・${r.storage}・在庫${r.count}件） 相場 ${r.median.toLocaleString()}円 / 新型 ${r.newStorageGb}GB ${r.newPrice.toLocaleString()}円（−${r.diff.toLocaleString()}円・−${r.pct.toFixed(1)}%）`));
    script.scenes.compare.forEach((c) => console.log(`  違い ${c.label}: 新型 ${c.a20} / A17 Pro ${c.a17}`));
  } else if (script.theme === "oldpro") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.older}／${r.newer}（${r.storage}・在庫${r.olderCount}件／${r.newerCount}件） Pro ${r.olderMedian.toLocaleString()}円・無印 ${r.newerMedian.toLocaleString()}円（${r.diff > 0 ? "Pro" : "無印"}が${Math.abs(r.diff).toLocaleString()}円安い・−${r.pct.toFixed(1)}%）`));
  } else if (script.theme === "minie") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.older}／${r.newer}（${r.storage}・在庫${r.olderCount}件／${r.newerCount}件） 弟分 ${r.olderMedian.toLocaleString()}円・無印 ${r.newerMedian.toLocaleString()}円（−${r.diff.toLocaleString()}円・−${r.pct.toFixed(1)}%）`));
  } else if (script.theme === "unused") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.model}（${r.storage}） 未使用品S ${r.sMedian.toLocaleString()}円（${r.sCount}件）・ランクA ${r.aMedian.toLocaleString()}円（${r.aCount}件）（+${r.diff.toLocaleString()}円・+${r.pct.toFixed(1)}%）`));
  } else if (script.theme === "fold" || script.theme === "gen") {
    script.scenes.ranking.items.forEach((r, i) => console.log(`  ${i + 1}. ${r.newer}→${r.older}（${r.storage}・在庫${r.newerCount}件／${r.olderCount}件） ${r.newerMedian.toLocaleString()}円 → ${r.olderMedian.toLocaleString()}円（−${r.diff.toLocaleString()}円・−${r.pct.toFixed(1)}%）`));
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
  // --tiktok は BGM なし（--no-bgm と同じ）で、締めだけ TikTok 用に（voice.ts の forTikTok）
  const tiktok = flag("tiktok");
  const outs = await renderShort(dir, tiktok ? forTikTok(script) : script, flag("keep-frames"), v === "ALL" ? "all" : (v as "A" | "B" | "C"), !flag("no-voice"), !flag("no-bgm") && !tiktok);
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
    throw new Error("使い方: npx tsx shorts/make-short.tsx <drops|budget|pixelbudget|ipadbudget|macbudget|probudget|foldbudget|galaxybudget|bigbudget|newused|provs|promax|plusvs|plusmax|oldpro|minie|fold|rank|unused|battery|gen|storage|ios27line|batteryswap|overnew|rakutenmobile|ipadmini> <plan|render> [--force] [--variant A|B|C|all] [--dir <フォルダ>] [--keep-frames] [--no-voice] [--no-bgm] [--tiktok]\n      npx tsx shorts/make-short.tsx --voice-test \"テキスト\" [--speaker 3] [--speed 1.25]\n      npx tsx shorts/make-short.tsx --voice-dump \"テキスト\"|script [--dir <フォルダ>]");
  }
  await (step === "plan" ? plan() : render());
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
