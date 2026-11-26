/**
 * YouTube の公開動画を Gemini に見せて、秒つきで画面の動き・字幕を書き出す（11/27〜・競合の調査用。読むだけ）
 *   npx tsx scripts/gemini-video.ts <YouTube の URL> [開始秒] [終了秒] [--model=gemini-3.8-flash] [--out=ファイル]
 * - キーは .env.local の GEMINI_API_KEY（Git に入れない）。無料枠は送った中身が Google の改善に使われる → 公開の競合動画だけを送る
 * - 無料枠の YouTube は1日8時間まで。1本は区間（開始〜終了）で切って送る
 */
import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const KEY = env.GEMINI_API_KEY;
if (!KEY) throw new Error(".env.local に GEMINI_API_KEY がない");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=") ?? d;
const [url, from = "0", to = "90"] = args;
if (!url) throw new Error("使い方: npx tsx scripts/gemini-video.ts <URL> [開始秒] [終了秒]");
const model = opt("model", "gemini-3.8-flash");
const promptFile = opt("prompt", "");

const PROMPT = promptFile ? readFileSync(promptFile, "utf8") : `この動画の指定区間を、編集の参考にするために細かく書き出してください。日本語で。
1. 時刻の表（m:ss ごとに1行。画面で何かが変わるたびに1行）: 時刻 / 画面で起きた変化（切り替え・ズームやパン・文字や図が出る・図が伸びる・アイコンに印・キャラの表情やポーズ・写真の差し込み・背景・効果） / 画面の焼き込み字幕やテロップの文字（そのまま） / 話している内容の要約
2. 1分あたりの「画面が変わる回数」と、変化の種類の内訳（多い順）
3. 字幕・テロップの出し方（位置・大きさ・色・強調の仕方・1行の長さ・出るタイミング）
4. 視聴者を引きつけている工夫（冒頭のつかみ、問いかけ、数字の見せ方、間）
5. 静止画・グラフ・写真・合成音声だけで真似できる動きを5つ（どの時刻のものか添えて）
推測で書かず、見えたもの・聞こえたものだけを書いてください。`;

async function main() {
  const body = {
    contents: [{ role: "user", parts: [
      { fileData: { fileUri: url, mimeType: "video/*" }, videoMetadata: { startOffset: `${from}s`, endOffset: `${to}s`, fps: 2 } },
      { text: PROMPT },
    ] }],
  };
  // 混んでいる（503・429）ときは少し待って、次のモデルへ
  const models = [model, ...["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-4-hydrogen"].filter((m) => m !== model)];
  let j: any = null;
  let used = model;
  for (const m of models) {
    for (let a = 0; a < 2; a++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY }, body: JSON.stringify(body),
      });
      const jj = await r.json();
      if (r.ok) { j = jj; used = m; break; }
      console.error(`${m}: ${r.status} ${String(jj.error?.message ?? "").slice(0, 120)}`);
      if (r.status !== 503 && r.status !== 429) break;
      await new Promise((res) => setTimeout(res, 8000));
    }
    if (j) break;
  }
  if (!j) throw new Error("どのモデルも使えなかった");
  const model2 = used;
  const text = (j.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  const u = j.usageMetadata ?? {};
  const head = `# ${url}（${from}〜${to}秒・${model2}）\n入力 ${u.promptTokenCount ?? "?"} トークン・出力 ${u.candidatesTokenCount ?? "?"} トークン\n\n`;
  const out = opt("out", "");
  if (out) writeFileSync(out, head + text);
  console.log(head + text);
}
main();
