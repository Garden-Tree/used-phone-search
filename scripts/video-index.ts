/**
 * これまでのショート・横動画のタイトル・中身・数字を1つの一覧にする（docs/videos.md）。
 *   npx tsx scripts/video-index.ts
 *
 * 読むもの（DB は使わない）:
 *   - shorts/out/<日付>-<テーマ>/youtube.txt・script.json（git に入らないのでこの PC だけ。youtube.txt のある回＝書き出した回）
 *   - longform/<日付>-<名前>/youtube.txt
 *   - docs/video-metrics.tsv（YouTube Studio から取った数字。分析のたびに上書きして、この一覧も作り直す）
 * ネタ出しの前にこの一覧を読み、同じ中身・同じ1位の回を避け、伸びた型・伸びなかった型を確かめる（CLAUDE.md）。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const norm = (t: string) => t.replace(/【PR】/g, "").replace(/\s+/g, "").replace(/！/g, "!").replace(/？/g, "?");
const cell = (t: string) => t.replace(/\|/g, "／").replace(/\r?\n/g, " ").trim();

type Metric = { id: string; views: string; vvs: string; subs: string; date: string };
const metrics = new Map<string, Metric>();
const tsv = join(ROOT, "docs/video-metrics.tsv");
if (existsSync(tsv)) {
  const [head, ...rows] = readFileSync(tsv, "utf8").split(/\r?\n/).filter(Boolean);
  const cols = head.split("\t");
  const at = (r: string[], name: string) => r[cols.findIndex((c) => c.startsWith(name))] ?? "";
  for (const line of rows) {
    const r = line.split("\t");
    metrics.set(norm(at(r, "title")), { id: at(r, "video_id"), views: at(r, "views") || at(r, "views_now"), vvs: at(r, "viewed_vs_swiped"), subs: at(r, "subscribers_gained"), date: at(r, "publish_date_jst") });
  }
}

/** 説明欄の要約（タイトルの次の段落の1文目） */
function summary(txt: string): string {
  const paras = txt.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);
  const p = paras[1] ?? "";
  return cell(p.split(/(?<=。)/)[0] ?? "").slice(0, 90);
}

const lines: string[] = [];
lines.push("# これまでの動画の一覧（自動生成・`npx tsx scripts/video-index.ts`）", "");
lines.push("ネタ出しの前に読む。同じテーマで1位が同じ回・同じ切り口の題を避け、伸びた型と伸びなかった型を確かめる。数字は docs/video-metrics.tsv（取った日の値。空欄＝未取得）。", "");

// ショート
const shortDirs = readdirSync(join(ROOT, "shorts/out")).filter((d) => /^\d{4}-\d{2}-\d{2}-/.test(d) && existsSync(join(ROOT, "shorts/out", d, "youtube.txt"))).sort();
lines.push(`## ショート（${shortDirs.length}本・書き出した回）`, "");
lines.push("| 日付 | テーマ | 声 | 0秒目 | タイトル | 視聴 | 継続 | 登録 | ID |", "|---|---|---|---|---|---|---|---|---|");
for (const d of shortDirs) {
  const dir = join(ROOT, "shorts/out", d);
  const title = readFileSync(join(dir, "youtube.txt"), "utf8").split(/\r?\n/)[0].trim();
  let theme = d.slice(11), voice = "", hook = "カード";
  try {
    const s = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
    theme = s.theme ?? theme;
    voice = String(s.voice?.speaker ?? "").split("/")[0];
    const clip = String(s.liveClip ?? "");
    hook = clip.startsWith("ai-") ? "AI" : clip ? "実写" : "カード";
  } catch { /* 台本なし */ }
  const m = metrics.get(norm(title));
  lines.push(`| ${d.slice(0, 10)} | ${theme} | ${voice} | ${hook} | ${cell(title)} | ${m?.views ?? ""} | ${m?.vvs ?? ""} | ${m?.subs ?? ""} | ${m?.id ?? ""} |`);
}
lines.push("");

// 横動画
const longDirs = readdirSync(join(ROOT, "longform")).filter((d) => /^\d{4}-\d{2}-\d{2}-/.test(d)).sort();
lines.push(`## 横動画（${longDirs.length}本・台本だけの回を含む）`, "");
lines.push("| 日付 | フォルダ | タイトル | 要約 | 視聴 | ID |", "|---|---|---|---|---|---|");
for (const d of longDirs) {
  const yt = join(ROOT, "longform", d, "youtube.txt");
  if (!existsSync(yt)) { lines.push(`| ${d.slice(0, 10)} | ${d.slice(11)} | （youtube.txt なし・台本／構成案のみ） | | | |`); continue; }
  const txt = readFileSync(yt, "utf8");
  const title = txt.split(/\r?\n/)[0].trim();
  const m = metrics.get(norm(title));
  lines.push(`| ${d.slice(0, 10)} | ${d.slice(11)} | ${cell(title)} | ${summary(txt)} | ${m?.views ?? ""} | ${m?.id ?? ""} |`);
}
lines.push("");
writeFileSync(join(ROOT, "docs/videos.md"), lines.join("\n"));
console.log(`docs/videos.md: ショート ${shortDirs.length}・横動画 ${longDirs.length}・数字の対応 ${metrics.size}行`);
