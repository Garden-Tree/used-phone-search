/**
 * 新しい形式「思い込みを数字で逆転させる掛け合い」（11/6〜の試作。ずんだもんとつむぎ・約20秒）。
 * 調査と判断は ideas/2026-11-04.md。ランキングの読み上げ（make-short.tsx）とは別のスクリプト。
 *
 *   npx tsx shorts/reversal.tsx plan                                   # 数字を取って shorts/out/<日付>-reversal-18pro/script.json
 *   npx tsx shorts/reversal.tsx render --dir shorts/out/<フォルダ>     # video.mp4 と youtube.txt
 *
 * 数字: 相場＝在庫がいちばん多い容量の中央値（getModelMarket）。新品は Apple 公式（lib/applePrices.ts）。容量がそろわなければ止まる。
 * DB は集計だけ（全件は取らない）。絵は端末の写真を使わず、文字と図形と立ち絵だけ
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";
import { activeShops } from "@/lib/activeShops";
import { applePrice } from "@/lib/applePrices";
import { modelPagePath } from "@/lib/catalog";
import { getModelMarket } from "@/lib/marketStats";
import { notoSansJp } from "@/lib/ogFont";
import { SHOPS } from "@/lib/shops";
import { engineAvailable, synthesize, type Clip } from "./voice";

const W = 1080;
const H = 1920;
const FPS = 30;
const SPEED = 1.3;
const GAP = 0.08;
const Z = "ずんだもん/ノーマル";
const T = "春日部つむぎ/ノーマル";
/** 配色。11/6 ユーザー「色がチカチカする」で案を比べる（--palette か script.json の palette）。既定は cream（ユーザーが選んだ）。accent＝悪い数字、good＝良い数字、shout＝驚きの文字 */
const PALETTES = {
  dark: { bg: "linear-gradient(180deg, #14123a 0%, #2a1a5e 70%, #0b0a24 100%)", ink: "#ffffff", sub: "#d1d5db", tagBg: "#ffd60a", tagInk: "#14123a", accent: "#ff3b30", good: "#34d399", shout: "#ffd60a", neutral: "#9ca3af" },
  cream: { bg: "#FFF8EC", ink: "#1b1a3a", sub: "#4b5563", tagBg: "#1b1a3a", tagInk: "#ffffff", accent: "#c8231b", good: "#0f766e", shout: "#1b1a3a", neutral: "#9ca3af" },
  white: { bg: "#F4F5F7", ink: "#111827", sub: "#4b5563", tagBg: "#111827", tagInk: "#ffffff", accent: "#c8231b", good: "#111827", shout: "#111827", neutral: "#b6bbc4" },
  navy: { bg: "#171A33", ink: "#f4f5f7", sub: "#b6bbc8", tagBg: "#f4f5f7", tagInk: "#171A33", accent: "#ff7a6b", good: "#f4f5f7", shout: "#f4f5f7", neutral: "#6b7285" },
} as const;
type Palette = keyof typeof PALETTES;

type Who = "z" | "t";
type Visual =
  | { kind: "big"; kicker: string; lines: string[]; tone?: "accent" | "good" | "shout"; size?: number }
  | { kind: "bars"; show: number };
type Line = { who: Who; text: string; face: { z: string; t: string }; visual: Visual; se?: "pop" | "ta" };
type Plan = {
  palette?: Palette;
  date: string;
  shopCount: number;
  storage: number;
  newPrice: number;
  used: number;
  usedMin: number;
  usedCount: number;
  older: number;
  olderCount: number;
  over: number;
  saved: number;
};

const yen = (n: number) => `${n.toLocaleString()}円`;
/** 声に読ませる額（「1万1,180円」の形。speakable がつなげて読む） */
const say = (n: number) => {
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  return `${man > 0 ? `${man}万` : ""}${rest > 0 ? rest.toLocaleString() : ""}円`;
};

function linesOf(p: Plan): Line[] {
  const calm = { z: "zundamon", t: "tsumugi" };
  const shock = { z: "expr/zundamon-shock", t: "tsumugi" };
  const wow = { z: "expr/zundamon-surprised", t: "tsumugi" };
  return [
    { who: "z", text: "18 Pro、中古なら安いのだ！", face: calm, visual: { kind: "big", kicker: `iPhone 18 Pro ${p.storage}GB`, lines: ["中古なら", "安い？"], size: 190 } },
    { who: "t", text: `それ、新品より${say(p.over)}高いよ。`, face: shock, se: "ta", visual: { kind: "big", kicker: "中古の相場は 新品より", lines: [`+${yen(p.over)}`, "高い"], tone: "accent", size: 150 } },
    { who: "z", text: "中古なのに！？", face: shock, visual: { kind: "big", kicker: "", lines: ["中古なのに", "！？"], tone: "shout", size: 180 } },
    { who: "t", text: `Appleの新品が${say(p.newPrice)}。`, face: wow, se: "pop", visual: { kind: "bars", show: 1 } },
    { who: "t", text: `中古の相場は${say(p.used)}。`, face: wow, se: "pop", visual: { kind: "bars", show: 2 } },
    { who: "z", text: "じゃあ、どれを買えばいいのだ？", face: wow, visual: { kind: "big", kicker: "", lines: ["じゃあ", "どれ？"], size: 210 } },
    { who: "t", text: `1つ前の17 Proなら、${say(p.older)}。`, face: calm, se: "pop", visual: { kind: "bars", show: 3 } },
    { who: "z", text: `${say(p.saved)}も違うのだ！`, face: wow, se: "ta", visual: { kind: "big", kicker: "18 Pro の中古より", lines: [`−${yen(p.saved)}`], tone: "good", size: 140 } },
    { who: "t", text: "あなたなら、どっちを買う？", face: calm, visual: { kind: "big", kicker: "同じ 256GB の中古", lines: ["18 Pro か", "17 Pro か"], size: 150 } },
  ];
}

type Art = Record<string, { src: string; w: number; h: number }>;
const charaDir = resolve(__dirname, "../longform/assets/chara");
function art(name: string, cache: Art) {
  if (cache[name]) return cache[name];
  const buf = readFileSync(join(charaDir, `${name}.png`));
  return (cache[name] = { src: `data:image/png;base64,${buf.toString("base64")}`, w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });
}

function Bars({ p, show }: { p: Plan; show: number }) {
  const c = PALETTES[p.palette ?? "cream"];
  const max = Math.max(p.newPrice, p.used);
  const rows = [
    { label: "18 Pro 新品（Apple公式）", value: p.newPrice, color: c.neutral },
    { label: "18 Pro 中古の相場", value: p.used, color: c.accent },
    { label: "17 Pro 中古の相場", value: p.older, color: c.good },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 34, width: 960 }}>
      {rows.slice(0, show).map((r, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", color: c.ink }}>
            <span style={{ fontSize: 42, fontWeight: 500 }}>{r.label}</span>
            <span style={{ fontSize: 76, fontWeight: 900, color: i === show - 1 && i > 0 ? r.color : c.ink }}>{yen(r.value)}</span>
          </div>
          <div style={{ display: "flex", width: Math.round((r.value / max) * 960), height: 44, borderRadius: 10, background: r.color }} />
        </div>
      ))}
    </div>
  );
}

function Frame({ p, line, cache, talk, scale }: { p: Plan; line: Line; cache: Art; talk: boolean; scale: number }) {
  const v = line.visual;
  const c = PALETTES[p.palette ?? "cream"];
  const chara = (who: Who) => {
    const active = line.who === who;
    const name = line.face[who];
    const base = name === "zundamon" || name === "tsumugi" ? (active && talk ? `${name}-talk` : name) : name;
    const a = art(base, cache);
    const height = active ? 620 : 500;
    return <img src={a.src} width={Math.round((a.w / a.h) * height)} height={height} style={{ opacity: active || p.palette === "cream" || !p.palette ? 1 : 0.75 }} />;
  };
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", background: c.bg, fontFamily: "Noto Sans JP", position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 690, marginTop: 130, transform: `scale(${scale})` }}>
        {v.kind === "bars" ? <Bars p={p} show={v.show} /> : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {v.kicker && <div style={{ display: "flex", fontSize: 54, fontWeight: 900, color: c.tagInk, background: c.tagBg, borderRadius: 12, padding: "6px 26px", marginBottom: 26 }}>{v.kicker}</div>}
            {v.lines.map((l, i) => (
              <div key={i} style={{ display: "flex", fontSize: i === 1 && l === "高い" ? 120 : v.size ?? 150, lineHeight: 1.18, fontWeight: 900, color: v.tone && !(i === 1 && l === "高い") ? c[v.tone] : c.ink }}>{l}</div>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 40, right: 110, top: 900, display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 630 }}>
        {chara("z")}
        {chara("t")}
      </div>
      <div style={{ position: "absolute", left: 30, right: 30, top: 825, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", maxWidth: 1000, background: "#fff", color: "#111827", borderRadius: 20, padding: "10px 26px", fontSize: 46, fontWeight: 900, textAlign: "center", border: `6px solid ${line.who === "z" ? "#22c55e" : "#f59e0b"}` }}>{line.text}</div>
      </div>
      <div style={{ position: "absolute", left: 40, top: 1548, display: "flex", width: 860, fontSize: 28, fontWeight: 500, color: c.sub, lineHeight: 1.35 }}>
        {`${p.storage}GB・相場は${p.shopCount}店の中央値（${p.date.replace(/-/g, "/")}）・18 Pro の最安は${yen(p.usedMin)}・新品はApple公式`}
      </div>
    </div>
  );
}

function run(args: string[], bin = "ffmpeg") {
  const r = spawnSync(bin, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${bin} が失敗しました\n${r.stderr}`);
  return r.stdout;
}

async function plan() {
  const date = process.env.REVERSAL_DATE ?? new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const m = await getModelMarket(["iPhone 18 Pro", "iPhone 17 Pro"]);
  const a = m.get("iPhone 18 Pro");
  const b = m.get("iPhone 17 Pro");
  if (!a?.medianStorage || !b?.medianStorage) throw new Error("相場がありません");
  if (a.medianStorage !== b.medianStorage) throw new Error(`容量がそろいません: ${a.medianStorage}GB と ${b.medianStorage}GB`);
  const newPrice = applePrice("iPhone 18 Pro", a.medianStorage);
  if (newPrice === null) throw new Error("新品の価格がありません");
  if (a.medianPrice <= newPrice) throw new Error(`中古の相場（${a.medianPrice}）が新品（${newPrice}）以下です。この台本は使えません`);
  const shops = await activeShops(SHOPS);
  const p: Plan = {
    palette: "cream", date, shopCount: shops.length, storage: a.medianStorage, newPrice, used: a.medianPrice, usedMin: a.minPrice, usedCount: a.count,
    older: b.medianPrice, olderCount: b.count, over: a.medianPrice - newPrice, saved: a.medianPrice - b.medianPrice,
  };
  const dir = resolve(__dirname, `out/${date}-reversal-18pro`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "script.json"), JSON.stringify(p, null, 2) + "\n");
  console.log(dir, p);
}

async function render(dirArg: string) {
  const dir = resolve(dirArg);
  const p = JSON.parse(readFileSync(join(dir, "script.json"), "utf8")) as Plan;
  const lines = linesOf(p);
  const online = await engineAvailable();
  if (!online) throw new Error("VOICEVOX を起動してください");
  const clips: Clip[] = [];
  for (const l of lines) {
    const c = await synthesize(l.text, { speaker: l.who === "z" ? Z : T, speedScale: SPEED }, online);
    if (!c) throw new Error(`声を作れません: ${l.text}`);
    clips.push(c);
    console.log(`${c.dur.toFixed(2)}秒 ${l.who} ${l.text}\n  ${c.kana ?? ""}`);
  }
  const frames = join(dir, "frames");
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const text = JSON.stringify(lines) + JSON.stringify(p) + "0123456789,.+−円万・（）18 Pro 新品Apple公式中古の相場17GB店中央値最安はとiPhone";
  const fonts = await notoSansJp(text);
  const cache: Art = {};
  const shot = async (name: string, el: React.ReactElement) => {
    const file = join(frames, name);
    writeFileSync(file, Buffer.from(await new ImageResponse(el, { width: W, height: H, fonts }).arrayBuffer()));
    return file;
  };
  const list: string[] = [];
  const seAt: { at: number; kind: "pop" | "ta" }[] = [];
  const voiceAt: { file: string; at: number }[] = [];
  let at = 0;
  const POPS = [1.18, 1.06];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const c = clips[i];
    const dur = c.dur + GAP;
    voiceAt.push({ file: c.file, at });
    if (l.se) seAt.push({ at, kind: l.se });
    const closed = await shot(`${i}-c.png`, <Frame p={p} line={l} cache={cache} talk={false} scale={1} />);
    const open = await shot(`${i}-o.png`, <Frame p={p} line={l} cache={cache} talk scale={1} />);
    let t = 0;
    for (let k = 0; k < POPS.length; k++) {
      const f = await shot(`${i}-p${k}.png`, <Frame p={p} line={l} cache={cache} talk scale={POPS[k]} />);
      list.push(`file '${f.replace(/\\/g, "/")}'`, `duration ${(2 / FPS).toFixed(4)}`);
      t += 2 / FPS;
    }
    let mouth = true;
    while (t < dur - 0.001) {
      const d = Math.min(0.14, dur - t);
      list.push(`file '${(t + d < c.dur && mouth ? open : closed).replace(/\\/g, "/")}'`, `duration ${d.toFixed(4)}`);
      t += d;
      mouth = !mouth;
    }
    at += dur;
  }
  const total = at + 0.25;
  const last = list[list.length - 2];
  list.push(last, "duration 0.25", last);
  const listFile = join(frames, "list.txt");
  writeFileSync(listFile, list.join("\n") + "\n");
  const silent = join(frames, "v.mp4");
  run(["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-vf", `fps=${FPS},format=yuv420p`, "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-threads", "2", silent]);

  const inputs = ["-i", silent, "-stream_loop", "-1", "-i", resolve(__dirname, "assets/bgm.mp3")];
  const parts: string[] = [`[1:a]atrim=0:${total},asetpts=PTS-STARTPTS,volume=0.05,afade=t=out:st=${total - 1}:d=1[bgm]`];
  const mix = ["[bgm]"];
  voiceAt.forEach((v, i) => {
    const ms = Math.round(v.at * 1000);
    inputs.push("-i", v.file);
    parts.push(`[${i + 2}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,acompressor=threshold=0.1:ratio=3:attack=5:release=120:makeup=2,volume=1.3,adelay=${ms}|${ms}[v${i}]`);
    mix.push(`[v${i}]`);
  });
  const fmt = "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo";
  seAt.forEach((e, i) => {
    const ms = Math.round(e.at * 1000);
    if (e.kind === "pop") {
      parts.push(`sine=frequency=880:duration=0.08:sample_rate=44100,afade=t=out:st=0:d=0.08,volume=0.9,${fmt},adelay=${ms}|${ms}[se${i}]`);
      mix.push(`[se${i}]`);
    } else {
      const ms2 = ms + 140;
      parts.push(`sine=frequency=784:duration=0.16:sample_rate=44100,afade=t=out:st=0:d=0.16,volume=1.4,${fmt},adelay=${ms}|${ms}[se${i}a]`);
      parts.push(`sine=frequency=1175:duration=0.5:sample_rate=44100,afade=t=out:st=0:d=0.5,volume=1.4,${fmt},adelay=${ms2}|${ms2}[se${i}b]`);
      mix.push(`[se${i}a]`, `[se${i}b]`);
    }
  });
  parts.push(`${mix.join("")}amix=inputs=${mix.length}:duration=first:normalize=0[a]`);
  const mixed = join(frames, "mixed.mkv");
  run(["-y", ...inputs, "-filter_complex", parts.join(";"), "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "pcm_s16le", "-t", String(total), mixed]);
  const LN = "loudnorm=I=-11:TP=-1:LRA=7";
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", mixed, "-af", `${LN}:print_format=json`, "-f", "null", "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const m = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf("{"), r.stderr.lastIndexOf("}") + 1)) as Record<string, string>;
  const second = `${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset},aresample=44100`;
  const out = join(dir, "video.mp4");
  run(["-y", "-i", mixed, "-map", "0:v", "-map", "0:a", "-c:v", "copy", "-af", second, "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out]);

  const utm = `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${p.date.replace(/-/g, "")}_reversal`;
  const bgm = JSON.parse(readFileSync(resolve(__dirname, "assets/bgm.json"), "utf8")) as { title: string; artist: string; source: string };
  writeFileSync(join(dir, "youtube.txt"), [
    `iPhone 18 Pro、中古なのに新品より${yen(p.over)}高い！`,
    "",
    `iPhone 18 Pro（${p.storage}GB）の中古の相場は${yen(p.used)}で、Appleの新品${yen(p.newPrice)}より${yen(p.over)}高い状態です（最安は${yen(p.usedMin)}・在庫${p.usedCount}件）。1つ前の17 Pro（${p.storage}GB）の相場は${yen(p.older)}で、18 Proの中古より${yen(p.saved)}低いです。`,
    "",
    `相場は在庫がいちばん多い容量の中央値。データ: 大手中古ショップ${p.shopCount}店の在庫（${p.date.replace(/-/g, "/")}時点）。新品は Apple 公式の価格（税込）。`,
    "",
    `iPhone 18 Proの店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath("iPhone 18 Pro")}?${utm}`,
    `iPhone 17 Proの店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath("iPhone 17 Pro")}?${utm}`,
    "",
    "VOICEVOX:ずんだもん",
    "VOICEVOX:春日部つむぎ",
    `BGM: ${bgm.title} - ${bgm.artist}（${bgm.source}）`,
    "立ち絵：春日部つむぎ公式立ち絵(KASUKABEproject)",
    "ずんだもん立ち絵：坂本アヒル様",
    "",
    "#中古iPhone #iPhone18Pro",
  ].join("\n") + "\n");
  console.log(`${out} ${run(["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], "ffprobe").trim()}秒`);
  if (existsSync(join(frames, "mixed.mkv"))) rmSync(join(frames, "mixed.mkv"));
}

/** 配色の比較用に、指定した場面の静止画だけ書く（動画は作らない） */
async function stills(dirArg: string) {
  const dir = resolve(dirArg);
  const base = JSON.parse(readFileSync(join(dir, "script.json"), "utf8")) as Plan;
  const out = join(dir, "palettes");
  mkdirSync(out, { recursive: true });
  const lines = linesOf(base);
  const fonts = await notoSansJp(JSON.stringify(lines) + JSON.stringify(base) + "0123456789,.+−円万・（）18 Pro 新品Apple公式中古の相場17GB店中央値最安はとiPhone");
  const cache: Art = {};
  for (const name of Object.keys(PALETTES) as Palette[]) {
    for (const i of [1, 2, 6]) {
      const el = <Frame p={{ ...base, palette: name }} line={lines[i]} cache={cache} talk scale={1} />;
      writeFileSync(join(out, `${name}-${i}.png`), Buffer.from(await new ImageResponse(el, { width: W, height: H, fonts }).arrayBuffer()));
    }
  }
  console.log(out);
}

const [cmd] = process.argv.slice(2);
const dirIdx = process.argv.indexOf("--dir");
(cmd === "plan" ? plan() : cmd === "stills" && dirIdx > 0 ? stills(process.argv[dirIdx + 1]) : cmd === "render" && dirIdx > 0 ? render(process.argv[dirIdx + 1]) : Promise.reject(new Error("使い方: plan / render --dir <フォルダ>")))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
