/**
 * VOICEVOX のナレーション（任意）。VOICEVOX アプリが動いていればエンジン（http://127.0.0.1:50021）に問い合わせて WAV を作る。
 * エンジンに届かなければ、声なしで今まで通りに書き出す（例外にしない）。
 * 合成した WAV は (文・話者・速さ・音量) のハッシュで shorts/out/voice-cache/ に置き、同じ文はエンジンなしでも使い回す。
 * 手順は shorts/README.md・docs/youtube-shorts.md
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Script, VoiceConfig } from "./types";

export const VOICEVOX_URL = (process.env.VOICEVOX_URL ?? "http://127.0.0.1:50021").replace(/\/$/, "");
const CACHE = process.env.VOICEVOX_CACHE ? resolve(process.env.VOICEVOX_CACHE) : resolve(__dirname, "out/voice-cache");
/** 既定の話者: ずんだもん（ノーマル）。標準の VOICEVOX では ID 3 */
export const DEFAULT_SPEAKER = 3;
/** エンジンに届かないときのクレジット用（標準の VOICEVOX の ID） */
const KNOWN: Record<number, string> = { 2: "四国めたん", 3: "ずんだもん" };

/** ナレーションを付けられる場面。hookNum・hookChart（B・C の冒頭）は hook の文を使う */
export type NarrationKey = "hook" | "ranking" | "reveal" | "trend" | "comment" | "outro";
export const narrationKey = (sceneId: string): NarrationKey | null =>
  sceneId === "hookNum" || sceneId === "hookChart" ? "hook"
    : (["hook", "ranking", "reveal", "trend", "comment", "outro"] as const).find((k) => k === sceneId) ?? null;

/**
 * 既定のナレーション（台本の数字だけで作る）。冒頭の問い・1位の発表・検品担当のひと言（comment.lines をつなげる）。
 * script.json の narration に書いた場面はそちらが優先。空文字にするとその場面は声なし
 */
export function defaultNarration(s: Script): Partial<Record<NarrationKey, string>> {
  const h = s.scenes.hook;
  const lines = s.scenes.comment.lines.join("");
  return {
    hook: "今週いちばん値下がりした中古iPhoneは…？",
    reveal: `1位は${h.model}、${h.storage}。1週間で${h.drop.toLocaleString()}円の値下がりです。`,
    comment: `${s.scenes.comment.speaker}のひと言。${lines}${/[。！？]$/.test(lines) ? "" : "。"}`,
  };
}

export function narrationOf(s: Script): Partial<Record<NarrationKey, string>> {
  return { ...defaultNarration(s), ...(s.narration ?? {}) };
}

/** 読み上げ用に直す（画面の文字は変えない）。英字の機種名・容量・記号をカナに */
export function speakable(text: string): string {
  const words: [RegExp, string][] = [
    [/iPhone/g, "アイフォン"], [/iPad/g, "アイパッド"], [/MacBook/g, "マックブック"], [/Apple Watch/g, "アップルウォッチ"],
    [/Pro Max/g, "プロマックス"], [/\bPro\b/g, "プロ"], [/\bMax\b/g, "マックス"], [/\bPlus\b/g, "プラス"], [/\bmini\b/g, "ミニ"],
    [/\bAir\b/g, "エアー"], [/\bSE\b/g, "エスイー"], [/\bDuo\b/g, "デュオ"], [/(\d+)e\b/g, "$1イー"],
    [/(\d+)\s*GB/g, "$1ギガ"], [/(\d+)\s*TB/g, "$1テラ"], [/(\d),(?=\d{3})/g, "$1"], [/%/g, "パーセント"],
    [/−(\d)/g, "マイナス$1"], [/…/g, ""],
  ];
  return words.reduce((t, [re, to]) => t.replace(re, to), text).replace(/\s+/g, "");
}

type Speaker = { name: string; styles: { name: string; id: number }[] };

async function http(path: string, init?: RequestInit & { timeoutMs?: number }) {
  const res = await fetch(`${VOICEVOX_URL}${path}`, { ...init, signal: AbortSignal.timeout(init?.timeoutMs ?? 60_000) });
  if (!res.ok) throw new Error(`VOICEVOX ${path.split("?")[0]} が ${res.status} を返しました: ${(await res.text()).slice(0, 200)}`);
  return res;
}

/** エンジンが動いているか（2秒で見切る） */
export async function engineAvailable(): Promise<boolean> {
  try {
    await http("/version", { timeoutMs: 2000 });
    return true;
  } catch {
    return false;
  }
}

let speakersCache: Speaker[] | null = null;
async function speakers(): Promise<Speaker[]> {
  speakersCache ??= (await (await http("/speakers", { timeoutMs: 5000 })).json()) as Speaker[];
  return speakersCache;
}

/**
 * 話者の指定（数値の ID・"ずんだもん"・"ずんだもん/ノーマル"）を ID とキャラクター名にする。
 * 名前の指定はエンジンが要る。ID の指定でエンジンに届かないときは、既知の ID だけ名前が分かる
 */
export async function resolveSpeaker(spec: VoiceConfig["speaker"], online: boolean): Promise<{ id: number; character: string; style?: string }> {
  const want = spec ?? DEFAULT_SPEAKER;
  if (online) {
    const list = await speakers();
    if (typeof want === "number") {
      for (const sp of list) for (const st of sp.styles) if (st.id === want) return { id: st.id, character: sp.name, style: st.name };
      throw new Error(`VOICEVOX に話者 ID ${want} がありません`);
    }
    const [name, style] = want.split(/[/／:：]/).map((x) => x.trim());
    const sp = list.find((x) => x.name === name);
    const st = sp?.styles.find((x) => x.name === (style || "ノーマル")) ?? (style ? undefined : sp?.styles[0]);
    if (!sp || !st) throw new Error(`VOICEVOX に話者「${want}」がありません（GET ${VOICEVOX_URL}/speakers で名前を確認）`);
    return { id: st.id, character: sp.name, style: st.name };
  }
  if (typeof want === "number") return { id: want, character: KNOWN[want] ?? `話者${want}` };
  throw new Error(`話者を名前（${want}）で指定するときは VOICEVOX を起動してください`);
}

const probe = (file: string) => {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  return Number(r.stdout.trim());
};

export type Clip = { file: string; dur: number; text: string; cached: boolean };

/**
 * 1つの文を WAV にする。キャッシュにあればエンジンを使わない。
 * online=false でキャッシュにもなければ null
 */
export async function synthesize(text: string, cfg: VoiceConfig | undefined, online: boolean): Promise<Clip | null> {
  const spoken = speakable(text);
  const spec = cfg?.speaker ?? DEFAULT_SPEAKER;
  const speed = cfg?.speedScale ?? 1.1;
  const volume = cfg?.volume ?? 1.0;
  const key = createHash("sha256").update(JSON.stringify([spoken, String(spec), speed, volume])).digest("hex").slice(0, 20);
  const file = join(CACHE, `${key}.wav`);
  if (existsSync(file)) return { file, dur: probe(file), text, cached: true };
  if (!online) return null;
  const sp = await resolveSpeaker(spec, true);
  const query = (await (await http(`/audio_query?text=${encodeURIComponent(spoken)}&speaker=${sp.id}`, { method: "POST" })).json()) as Record<string, unknown>;
  query.speedScale = speed;
  query.volumeScale = volume;
  query.prePhonemeLength = 0.05;
  query.postPhonemeLength = 0.1;
  const wav = Buffer.from(await (await http(`/synthesis?speaker=${sp.id}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query),
  })).arrayBuffer());
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, wav);
  writeFileSync(file.replace(/\.wav$/, ".json"), JSON.stringify({ text, spoken, speaker: sp, speedScale: speed, volume }, null, 2));
  return { file, dur: probe(file), text, cached: false };
}

/** キャッシュの横に置いたメモからキャラクター名を読む（エンジンなしでクレジットを出すため） */
export function cachedCharacter(clip: Clip): string | null {
  try {
    return (JSON.parse(readFileSync(clip.file.replace(/\.wav$/, ".json"), "utf8")) as { speaker: { character: string } }).speaker.character;
  } catch {
    return null;
  }
}

/** YouTube の説明文に入れるクレジット（VOICEVOX の各キャラクターの規約で求められる表記） */
export const voiceCredit = (character: string) => `VOICEVOX:${character}`;
