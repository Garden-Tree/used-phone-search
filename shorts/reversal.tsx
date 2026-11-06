/**
 * 新しい形式「思い込みを数字で逆転させる掛け合い」（11/6〜の試作。ずんだもんとつむぎ・約20秒）。
 * 調査と判断は ideas/2026-11-04.md。ランキングの読み上げ（make-short.tsx）とは別のスクリプト。
 *
 *   npx tsx shorts/reversal.tsx plan [reversal|jirai|qa]               # 数字を取って shorts/out/<日付>-<型>/script.json（reversal は <日付>-reversal-18pro）
 *   reversal＝思い込みの逆転・jirai＝買わない方がいい6台を早く切り替える（案A）・qa＝もらった質問に検品担当が答える（案B）
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
import { appleRepair } from "@/lib/appleRepairPrices";
import { getModelMarket } from "@/lib/marketStats";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { fitFontSize, notoSansJp } from "@/lib/ogFont";
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
type Tone = "accent" | "good" | "shout";
type BarRow = { label: string; value: number; color: "neutral" | "accent" | "good" };
type Visual =
  | { kind: "big"; kicker: string; lines: string[]; tone?: Tone; size?: number }
  | { kind: "bars"; rows: BarRow[]; unit: "yen" | "pct" }
  | { kind: "card"; tag: string; model: string; reason: string; number?: string };
/** text は画面の吹き出し。voice があれば声はそちらを読む（USB-C が切れるなど） */
type Line = { who: Who; text: string; voice?: string; face: { z: string; t: string }; visual: Visual; se?: "pop" | "ta" };
type Base = { palette?: Palette; date: string; shopCount: number };
type ReversalPlan = Base & { type?: "reversal"; storage: number; newPrice: number; used: number; usedMin: number; usedCount: number; older: number; olderCount: number; over: number; saved: number };
type JiraiPlan = Base & { type: "jirai"; xr: number; se2: number; pro14: number; i15: number; pm14: number; plus15: number; e17: number; e17New: number; pro18: number; pro18New: number };
type QaPlan = Base & { type: "qa"; count13: number; b13: number; min13: number; median13: number; count15: number; b15: number };
type Plan = ReversalPlan | JiraiPlan | QaPlan;

const yen = (n: number) => `${n.toLocaleString()}円`;
/** 声に読ませる額（「1万1,180円」の形。speakable がつなげて読む） */
const say = (n: number) => {
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  return `${man > 0 ? `${man}万` : ""}${rest > 0 ? rest.toLocaleString() : ""}円`;
};

const calm = { z: "zundamon", t: "tsumugi" };
const shock = { z: "expr/zundamon-shock", t: "tsumugi" };
const wow = { z: "expr/zundamon-surprised", t: "tsumugi" };

function reversalLines(p: ReversalPlan): Line[] {
  const rows: BarRow[] = [
    { label: "18 Pro 新品（Apple公式）", value: p.newPrice, color: "neutral" },
    { label: "18 Pro 中古の相場", value: p.used, color: "accent" },
    { label: "17 Pro 中古の相場", value: p.older, color: "good" },
  ];
  return [
    { who: "z", text: "18 Pro、中古なら安いのだ！", face: calm, visual: { kind: "big", kicker: `iPhone 18 Pro ${p.storage}GB`, lines: ["中古なら", "安い？"], size: 190 } },
    { who: "t", text: `それ、新品より${say(p.over)}高いよ。`, face: shock, se: "ta", visual: { kind: "big", kicker: "中古の相場は 新品より", lines: [`+${yen(p.over)}`, "高い"], tone: "accent", size: 150 } },
    { who: "z", text: "中古なのに！？", face: shock, visual: { kind: "big", kicker: "", lines: ["中古なのに", "！？"], tone: "shout", size: 180 } },
    { who: "t", text: `Appleの新品が${say(p.newPrice)}。`, face: wow, se: "pop", visual: { kind: "bars", rows: rows.slice(0, 1), unit: "yen" } },
    { who: "t", text: `中古の相場は${say(p.used)}。`, face: wow, se: "pop", visual: { kind: "bars", rows: rows.slice(0, 2), unit: "yen" } },
    { who: "z", text: "じゃあ、どれを買えばいいのだ？", face: wow, visual: { kind: "big", kicker: "", lines: ["じゃあ", "どれ？"], size: 210 } },
    { who: "t", text: `1つ前の17 Proなら、${say(p.older)}。`, face: calm, se: "pop", visual: { kind: "bars", rows, unit: "yen" } },
    { who: "z", text: `${say(p.saved)}も違うのだ！`, face: wow, se: "ta", visual: { kind: "big", kicker: "18 Pro の中古より", lines: [`−${yen(p.saved)}`], tone: "good", size: 140 } },
    { who: "t", text: "あなたなら、どっちを買う？", face: calm, visual: { kind: "big", kicker: `同じ ${p.storage}GB の中古`, lines: ["18 Pro か", "17 Pro か"], size: 150 } },
  ];
}

/** 案A: 6台を1台2〜3秒で。順位ではなく番号（どれが1位かは主観になるので順位と言わない）。最後は新品より高い額のいちばん大きい機種 */
function jiraiLines(p: JiraiPlan): Line[] {
  const card = (n: number, text: string, model: string, reason: string, number?: string, voice?: string): Line => ({
    who: "t", text, voice, face: wow, se: "pop", visual: { kind: "card", tag: `買わない方がいい ${n}/6`, model, reason, number },
  });
  return [
    { who: "z", text: "今買わない方がいい中古iPhone、6台なのだ！", face: calm, visual: { kind: "big", kicker: "2026年11月の相場で判定", lines: ["今は買うな", "6台"], tone: "accent", size: 170 } },
    card(1, "11 Pro、電池交換の料金表にない。", "iPhone 11 Pro", "Appleの電池交換の料金表にない"),
    card(2, `XR、${say(p.se2 - p.xr)}足すとiOS 27が入る。`, "iPhone XR", "足すと iOS 27 が入る SE 第2世代に", `+${yen(p.se2 - p.xr)}`),
    card(3, `14 Pro Max、15 Plusより${say(p.pm14 - p.plus15)}高い。`, "iPhone 14 Pro Max", "USB-C の 15 Plus より高い（128GB）", `+${yen(p.pm14 - p.plus15)}`),
    card(4, `14 Pro、USB-Cの15まで、あと${say(p.i15 - p.pro14)}。`, "iPhone 14 Pro", "足すと USB-C の 15 に（128GB）", `+${yen(p.i15 - p.pro14)}`, `14 Pro、ユーエスビーシーの15まで、あと${say(p.i15 - p.pro14)}。`),
    card(5, `17e、新品より${say(p.e17 - p.e17New)}高い。`, "iPhone 17e", "中古の相場が 新品より高い（256GB）", `+${yen(p.e17 - p.e17New)}`),
    card(6, `18 Pro、新品より${say(p.pro18 - p.pro18New)}高い。`, "iPhone 18 Pro", "中古の相場が 新品より高い（256GB）", `+${yen(p.pro18 - p.pro18New)}`),
    { who: "z", text: "正解は13、15、16eなのだ。くわしくは、下の関連動画で！", face: calm, se: "ta", visual: { kind: "big", kicker: "正解の3台", lines: ["13・15・16e"], tone: "good", size: 150 } },
  ];
}

/** 案B: もらった質問に検品担当が数字で答える（X でもらった質問を、誰のものか分からない形に言い換える） */
function qaLines(p: QaPlan): Line[] {
  const pct13 = Math.round((p.b13 / p.count13) * 1000) / 10;
  const pct15 = Math.round((p.b15 / p.count15) * 1000) / 10;
  const rows: BarRow[] = [
    { label: "iPhone 13（128GB）", value: pct13, color: "accent" },
    { label: "iPhone 15（128GB）", value: pct15, color: "good" },
  ];
  const wari = (n: number) => `${Math.round(n / 10)}割`;
  return [
    { who: "z", text: "質問が来たのだ！中古iPhoneって、当たり外れがあるのだ？", face: calm, visual: { kind: "big", kicker: "もらった質問", lines: ["中古って", "当たり外れ", "ある？"], size: 150 } },
    { who: "t", text: "検品担当の答えは、まず電池の表記を見ること。", face: wow, se: "ta", visual: { kind: "big", kicker: "検品担当の答え", lines: ["電池の表記を", "見る"], tone: "accent", size: 130 } },
    { who: "t", text: `電池85%以上の在庫は、iPhone 13だと${wari(pct13)}くらい。`, face: wow, se: "pop", visual: { kind: "bars", rows: rows.slice(0, 1), unit: "pct" } },
    { who: "t", text: `iPhone 15だと${wari(pct15)}くらい。`, face: wow, se: "pop", visual: { kind: "bars", rows, unit: "pct" } },
    { who: "z", text: "そんなに違うのだ！？", face: shock, visual: { kind: "big", kicker: "", lines: ["そんなに", "違う！？"], tone: "shout", size: 170 } },
    { who: "t", text: `13なら、電池85%以上は${say(p.min13)}から。相場は${say(p.median13)}だよ。`, face: calm, se: "pop", visual: { kind: "big", kicker: "iPhone 13 128GB・電池85%以上", lines: [`${yen(p.min13)}〜`], tone: "good", size: 130 } },
    { who: "z", text: "あなたなら、電池は何%以上で買うのだ？", face: calm, visual: { kind: "big", kicker: "", lines: ["電池は", "何%以上で", "買う？"], size: 150 } },
  ];
}

const linesOf = (p: Plan): Line[] => (p.type === "jirai" ? jiraiLines(p) : p.type === "qa" ? qaLines(p) : reversalLines(p));

/** 画面の下の注記（出典と条件） */
function noteOf(p: Plan): string {
  const day = p.date.replace(/-/g, "/");
  if (p.type === "jirai") return `${p.shopCount}店の相場（中央値・${day}）と Apple 公式の値で判定。今の値段での判断で、使い方によっては別`;
  if (p.type === "qa") return `${p.shopCount}店の在庫（${day}）。「電池85%以上」と書いてある在庫の割合。店によって書き方が違う`;
  return `${p.storage}GB・相場は${p.shopCount}店の中央値（${day}）・18 Pro の最安は${yen(p.usedMin)}・新品はApple公式`;
}

type Art = Record<string, { src: string; w: number; h: number }>;
const charaDir = resolve(__dirname, "../longform/assets/chara");
function art(name: string, cache: Art) {
  if (cache[name]) return cache[name];
  const buf = readFileSync(join(charaDir, `${name}.png`));
  return (cache[name] = { src: `data:image/png;base64,${buf.toString("base64")}`, w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });
}

function Bars({ p, rows, unit }: { p: Plan; rows: BarRow[]; unit: "yen" | "pct" }) {
  const c = PALETTES[p.palette ?? "cream"];
  const max = unit === "pct" ? 100 : Math.max(...rows.map((r) => r.value), ("used" in p ? p.used : 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 34, width: 960 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", color: c.ink }}>
            <span style={{ fontSize: 42, fontWeight: 500 }}>{r.label}</span>
            <span style={{ fontSize: 76, fontWeight: 900, color: i === rows.length - 1 && r.color !== "neutral" ? c[r.color] : c.ink }}>{unit === "pct" ? `${r.value}%` : yen(r.value)}</span>
          </div>
          <div style={{ display: "flex", width: Math.max(12, Math.round((r.value / max) * 960)), height: 44, borderRadius: 10, background: c[r.color] }} />
        </div>
      ))}
    </div>
  );
}

function Card({ p, v }: { p: Plan; v: Extract<Visual, { kind: "card" }> }) {
  const c = PALETTES[p.palette ?? "cream"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 1000 }}>
      <div style={{ display: "flex", fontSize: 50, fontWeight: 900, color: c.tagInk, background: c.tagBg, borderRadius: 12, padding: "6px 26px", marginBottom: 24 }}>{v.tag}</div>
      <div style={{ display: "flex", fontSize: fitFontSize(v.model, 980, 130), lineHeight: 1.15, fontWeight: 900, color: c.ink }}>{v.model}</div>
      {v.number && <div style={{ display: "flex", fontSize: 130, lineHeight: 1.2, fontWeight: 900, color: c.accent }}>{v.number}</div>}
      <div style={{ display: "flex", fontSize: fitFontSize(v.reason, 980, v.number ? 54 : 66), lineHeight: 1.3, fontWeight: 900, color: v.number ? c.ink : c.accent, marginTop: 12 }}>{v.reason}</div>
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
        {v.kind === "bars" ? <Bars p={p} rows={v.rows} unit={v.unit} /> : v.kind === "card" ? <Card p={p} v={v} /> : (
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
        <div style={{ display: "flex", maxWidth: 1000, background: "#fff", color: "#111827", borderRadius: 20, padding: "10px 24px", fontSize: 42, fontWeight: 900, textAlign: "center", border: `6px solid ${line.who === "z" ? "#22c55e" : "#f59e0b"}` }}>{line.text}</div>
      </div>
      <div style={{ position: "absolute", left: 40, top: 1548, display: "flex", width: 860, fontSize: 28, fontWeight: 500, color: c.sub, lineHeight: 1.35 }}>
        {noteOf(p)}
      </div>
    </div>
  );
}

function run(args: string[], bin = "ffmpeg") {
  const r = spawnSync(bin, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${bin} が失敗しました\n${r.stderr}`);
  return r.stdout;
}

/** 同じ容量の中央値（在庫5件未満は止まる） */
async function at(model: string, storage: number) {
  const where = { AND: [await modelWhere(model), { storage }] };
  const a = await prisma.deviceInventory.aggregate({ where, _count: { _all: true }, _min: { price: true } });
  const count = a._count._all;
  if (count < 5) throw new Error(`${model} ${storage}GB の在庫が ${count} 件です`);
  const median = await medianPrice(where, count);
  if (median === null) throw new Error(`${model} ${storage}GB の中央値がありません`);
  return { where, count, median, min: a._min.price ?? 0 };
}

async function planJirai(base: Base): Promise<JiraiPlan> {
  const xr = await at("iPhone XR", 64);
  const se2 = await at("iPhone SE (第2世代)", 64);
  const pro14 = await at("iPhone 14 Pro", 128);
  const i15 = await at("iPhone 15", 128);
  const pm14 = await at("iPhone 14 Pro Max", 128);
  const plus15 = await at("iPhone 15 Plus", 128);
  const e17 = await at("iPhone 17e", 256);
  const pro18 = await at("iPhone 18 Pro", 256);
  const e17New = applePrice("iPhone 17e", 256);
  const pro18New = applePrice("iPhone 18 Pro", 256);
  if (e17New === null || pro18New === null) throw new Error("新品の価格がありません");
  // 地雷の回（longform/2026-11-06-jirai/outline.md）の条件にまだ当たるか。外れたら作らない
  const check: [boolean, string][] = [
    [appleRepair("iPhone 11 Pro")?.battery == null, "11 Pro が電池交換の料金表にある"],
    [se2.median > xr.median && se2.median - xr.median < 2000, `XR と SE 第2世代の差 ${se2.median - xr.median}`],
    [i15.median > pro14.median && i15.median - pro14.median < 5000, `14 Pro と 15 の差 ${i15.median - pro14.median}`],
    [pm14.median > plus15.median && pm14.median - plus15.median < 5000, `14 Pro Max と 15 Plus の差 ${pm14.median - plus15.median}`],
    [e17.median > e17New, `17e と新品の差 ${e17.median - e17New}`],
    [pro18.median > pro18New, `18 Pro と新品の差 ${pro18.median - pro18New}`],
  ];
  for (const [ok, why] of check) if (!ok) throw new Error(`条件に当たらなくなりました: ${why}`);
  return { ...base, type: "jirai", xr: xr.median, se2: se2.median, pro14: pro14.median, i15: i15.median, pm14: pm14.median, plus15: plus15.median, e17: e17.median, e17New, pro18: pro18.median, pro18New };
}

async function planQa(base: Base): Promise<QaPlan> {
  const notJunk = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
  const b85 = (where: object) => prisma.deviceInventory.aggregate({ where: { AND: [where, { batteryHealth: { gte: 85 } }, notJunk] }, _count: { _all: true }, _min: { price: true } });
  const i13 = await at("iPhone 13", 128);
  const i15 = await at("iPhone 15", 128);
  const a13 = await b85(i13.where);
  const a15 = await b85(i15.where);
  if (a13._min.price === null || a13._count._all < 100 || a15._count._all < 100) throw new Error("電池85%以上の在庫が足りません");
  return { ...base, type: "qa", count13: i13.count, b13: a13._count._all, min13: a13._min.price, median13: i13.median, count15: i15.count, b15: a15._count._all };
}

async function planReversal(base: Base): Promise<ReversalPlan> {
  const m = await getModelMarket(["iPhone 18 Pro", "iPhone 17 Pro"]);
  const a = m.get("iPhone 18 Pro");
  const b = m.get("iPhone 17 Pro");
  if (!a?.medianStorage || !b?.medianStorage) throw new Error("相場がありません");
  if (a.medianStorage !== b.medianStorage) throw new Error(`容量がそろいません: ${a.medianStorage}GB と ${b.medianStorage}GB`);
  const newPrice = applePrice("iPhone 18 Pro", a.medianStorage);
  if (newPrice === null) throw new Error("新品の価格がありません");
  if (a.medianPrice <= newPrice) throw new Error(`中古の相場（${a.medianPrice}）が新品（${newPrice}）以下です。この台本は使えません`);
  return {
    ...base, storage: a.medianStorage, newPrice, used: a.medianPrice, usedMin: a.minPrice, usedCount: a.count,
    older: b.medianPrice, olderCount: b.count, over: a.medianPrice - newPrice, saved: a.medianPrice - b.medianPrice,
  };
}

async function plan(type: string) {
  const date = process.env.REVERSAL_DATE ?? new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const base: Base = { palette: "cream", date, shopCount: (await activeShops(SHOPS)).length };
  const p: Plan = type === "jirai" ? await planJirai(base) : type === "qa" ? await planQa(base) : await planReversal(base);
  const dir = resolve(__dirname, `out/${date}-${type === "jirai" ? "talk-jirai" : type === "qa" ? "talk-qa" : "reversal-18pro"}`);
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
    const c = await synthesize(l.voice ?? l.text, { speaker: l.who === "z" ? Z : T, speedScale: SPEED }, online);
    if (!c) throw new Error(`声を作れません: ${l.text}`);
    clips.push(c);
    console.log(`${c.dur.toFixed(2)}秒 ${l.who} ${l.text}\n  ${c.kana ?? ""}`);
  }
  const frames = join(dir, "frames");
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const text = JSON.stringify(lines) + noteOf(p) + "0123456789,.+−%円万・（）";
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

  writeFileSync(join(dir, "youtube.txt"), youtubeText(p));
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
  const fonts = await notoSansJp(JSON.stringify(lines) + noteOf(base) + "0123456789,.+−%円万・（）");
  const cache: Art = {};
  for (const name of Object.keys(PALETTES) as Palette[]) {
    for (const i of [1, 2, 6]) {
      const el = <Frame p={{ ...base, palette: name } as Plan} line={lines[i]} cache={cache} talk scale={1} />;
      writeFileSync(join(out, `${name}-${i}.png`), Buffer.from(await new ImageResponse(el, { width: W, height: H, fonts }).arrayBuffer()));
    }
  }
  console.log(out);
}

function youtubeText(p: Plan): string {
  const utm = `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${p.date.replace(/-/g, "")}_${p.type ?? "reversal"}`;
  const day = p.date.replace(/-/g, "/");
  const page = (m: string) => `${m}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(m)}?${utm}`;
  const bgm = JSON.parse(readFileSync(resolve(__dirname, "assets/bgm.json"), "utf8")) as { title: string; artist: string; source: string };
  const body: string[] =
    p.type === "jirai" ? [
      `今買わない方がいい中古iPhone 6台！新品より1.1万円高い機種も`,
      "",
      `2026年11月の相場で、今は買わない方がいい6台です。お店の話ではなく、今の値段で見た機種の判断です。`,
      `・11 Pro: Apple の電池交換の料金表にない`,
      `・XR（64GB）${yen(p.xr)}: iOS 27 が入る SE 第2世代 ${yen(p.se2)} まで +${yen(p.se2 - p.xr)}`,
      `・14 Pro Max（128GB）${yen(p.pm14)}: USB-C の 15 Plus ${yen(p.plus15)} より +${yen(p.pm14 - p.plus15)}`,
      `・14 Pro（128GB）${yen(p.pro14)}: USB-C の 15 ${yen(p.i15)} まで +${yen(p.i15 - p.pro14)}`,
      `・17e（256GB）${yen(p.e17)}: Apple の新品 ${yen(p.e17New)} より +${yen(p.e17 - p.e17New)}`,
      `・18 Pro（256GB）${yen(p.pro18)}: Apple の新品 ${yen(p.pro18New)} より +${yen(p.pro18 - p.pro18New)}`,
      `120Hz や望遠を使う人など、理由があれば別です。正解の3台は 13・15・16e。くわしくは関連動画で。`,
      "",
      `相場は同じ容量の中央値。データ: 大手中古ショップ${p.shopCount}店の在庫（${day}時点）。新品・修理の料金は Apple 公式。`,
      "",
      page("iPhone 15"),
      page("iPhone 13"),
    ] : p.type === "qa" ? [
      `中古iPhoneの当たり外れは？検品担当の答えは電池の表記`,
      "",
      `もらった質問に検品担当が答えます。128GB の在庫のうち「電池85%以上」と書いてあるのは、iPhone 13 が ${p.count13.toLocaleString()}件中 ${p.b13.toLocaleString()}件、iPhone 15 が ${p.count15.toLocaleString()}件中 ${p.b15.toLocaleString()}件。iPhone 13 は電池85%以上が ${yen(p.min13)} から（相場 ${yen(p.median13)}）です。`,
      "",
      `データ: 大手中古ショップ${p.shopCount}店の在庫（${day}時点）。電池の書き方は店によって違い、書いていない在庫もあります。`,
      "",
      page("iPhone 13"),
      page("iPhone 15"),
    ] : [
      `iPhone 18 Pro、中古なのに新品より${yen(p.over)}高い！`,
      "",
      `iPhone 18 Pro（${p.storage}GB）の中古の相場は${yen(p.used)}で、Appleの新品${yen(p.newPrice)}より${yen(p.over)}高い状態です（最安は${yen(p.usedMin)}・在庫${p.usedCount}件）。1つ前の17 Pro（${p.storage}GB）の相場は${yen(p.older)}で、18 Proの中古より${yen(p.saved)}低いです。`,
      "",
      `相場は在庫がいちばん多い容量の中央値。データ: 大手中古ショップ${p.shopCount}店の在庫（${day}時点）。新品は Apple 公式の価格（税込）。`,
      "",
      page("iPhone 18 Pro"),
      page("iPhone 17 Pro"),
    ];
  return [...body, "", "VOICEVOX:ずんだもん", "VOICEVOX:春日部つむぎ", `BGM: ${bgm.title} - ${bgm.artist}（${bgm.source}）`, "立ち絵：春日部つむぎ公式立ち絵(KASUKABEproject)", "ずんだもん立ち絵：坂本アヒル様", "", p.type === "qa" ? "#中古iPhone #バッテリー" : p.type === "jirai" ? "#中古iPhone #iPhone" : "#中古iPhone #iPhone18Pro"].join("\n") + "\n";
}

const [cmd, arg] = process.argv.slice(2);
const dirIdx = process.argv.indexOf("--dir");
(cmd === "plan" ? plan(arg ?? "reversal") : cmd === "stills" && dirIdx > 0 ? stills(process.argv[dirIdx + 1]) : cmd === "render" && dirIdx > 0 ? render(process.argv[dirIdx + 1]) : Promise.reject(new Error("使い方: plan / render --dir <フォルダ>")))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
