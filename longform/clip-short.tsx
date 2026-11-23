/**
 * 横動画の切り抜きショート（11/24〜・試し）。横動画の1章を縦 1080x1920 に置き、上に題・下に「続きは関連動画から」。
 *   npx tsx longform/clip-short.tsx <横動画のフォルダ> <区間> "<題の1行目>" "<題の2行目>" [<出力名>]
 *   区間は「開始-終了」をカンマでつなぐ（例 20.0-25.7,8.1-19.8）。1か所を長く抜くより、会話のラリーを3〜4つつなぐ（11/24 ユーザー）。
 *   区間は timeline.json の台詞の start・end に合わせる（台詞の途中で切らない）。つなぎ目は音を 0.06 秒で上げ下げ
 *   → <フォルダ>/clip-<出力名>.mp4（音は横動画のまま。-14 LUFS 済み）と clip-<出力名>-cover.png（0秒目の見本）
 * 文字はショートの安全な帯（上 280・下 480・右 190。shorts/scenes.tsx の SAFE）の中だけに置く。
 * 投稿のときは Studio の「関連動画」にその横動画をつける（ショートの説明欄のリンクは押せないため）
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1080, H = 1920;
const SAFE = { top: 280, bottom: 480, right: 190 };
const VIDEO_Y = 640, VIDEO_H = Math.round((W * 9) / 16); // 608

const [dir, spans, line1, line2, name = "a"] = process.argv.slice(2);
if (!dir || !spans || !line1) throw new Error('使い方: npx tsx longform/clip-short.tsx <フォルダ> <開始-終了,…> "<題1>" "<題2>" [名前]');
const segs = spans.split(",").map((x) => x.split("-").map(Number) as [number, number]);
const total = segs.reduce((a, [s0, e0]) => a + (e0 - s0), 0);
if (total > 59) throw new Error(`ショートは60秒未満に（いま ${total.toFixed(1)} 秒）`);

const Outlined = ({ text, size, color }: { text: string; size: number; color: string }) => {
  const w = Math.round(size / 16);
  const base = { display: "flex", fontSize: size, fontWeight: 900, letterSpacing: -2, lineHeight: 1.15, whiteSpace: "nowrap" } as const;
  return (
    <div style={{ display: "flex", position: "relative" }}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <div key={i} style={{ ...base, position: "absolute", left: Math.round(Math.cos(a) * w), top: Math.round(Math.sin(a) * w), color: "#000" }}>{text}</div>;
      })}
      <div style={{ ...base, position: "relative", color }}>{text}</div>
    </div>
  );
};

(async () => {
  const node = (
    <div style={{ display: "flex", position: "relative", width: W, height: H, background: "linear-gradient(180deg, #0B0B1F 0%, #1A1A3A 55%, #0B0B1F 100%)", fontFamily: "Noto Sans JP" }}>
      {/* 題（安全な帯の上の端から） */}
      <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 60, top: SAFE.top + 20, width: W - 60 - SAFE.right, alignItems: "flex-start" }}>
        <Outlined text={line1} size={92} color="#FFFFFF" />
        {line2 ? <Outlined text={line2} size={104} color="#FFE100" /> : null}
      </div>
      {/* 横動画の枠（ここに動画を重ねる） */}
      <div style={{ display: "flex", position: "absolute", left: 0, top: VIDEO_Y - 6, width: W, height: VIDEO_H + 12, background: "#FFFFFF" }} />
      {/* 下の案内（安全な帯の下の端より上） */}
      <div style={{ display: "flex", position: "absolute", left: 60, top: VIDEO_Y + VIDEO_H + 50, width: W - 60 - SAFE.right, fontSize: 60, fontWeight: 900, color: "#FFFFFF" }}>続きは関連動画から ▶</div>
    </div>
  );
  const fonts = await notoSansJp(`${line1}${line2 ?? ""}続きは関連動画から▶`);
  const bg = join(dir, `clip-${name}-bg.png`);
  writeFileSync(bg, Buffer.from(await new ImageResponse(node, { width: W, height: H, fonts }).arrayBuffer()));

  const out = join(dir, `clip-${name}.mp4`);
  // 区間ごとに映像と音を切り、つなぎ目の音を短く上げ下げしてから concat
  const parts = segs.map(([s0, e0], i) => {
    const d = (e0 - s0).toFixed(3);
    return `[1:v]trim=${s0}:${e0},setpts=PTS-STARTPTS[v${i}];[1:a]atrim=${s0}:${e0},asetpts=PTS-STARTPTS,afade=t=in:d=0.06,afade=t=out:st=${(e0 - s0 - 0.06).toFixed(3)}:d=0.06[a${i}]`;
  }).join(";");
  const cat = segs.map((_, i) => `[v${i}][a${i}]`).join("") + `concat=n=${segs.length}:v=1:a=1[vc][ac]`;
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-i", bg, "-i", join(dir, "video.mp4"),
    "-filter_complex", `${parts};${cat};[vc]scale=${W}:${VIDEO_H}[v];[0:v][v]overlay=0:${VIDEO_Y}:shortest=1,fps=30,format=yuv420p[o]`,
    "-map", "[o]", "-map", "[ac]", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("ffmpeg 失敗");
  spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "0.5", "-i", out, "-frames:v", "1", join(dir, `clip-${name}-cover.png`)]);
  console.log(out);
})();
