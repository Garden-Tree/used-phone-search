/**
 * VOICEVOX の調声（読み・アクセント句）。手順と根拠は ideas/2026-10-21.md「ショートの調声」
 *
 * 1. ユーザー辞書: shorts/voice-dict.json をエンジンに登録する（同じ表層形があれば上書き。何度呼んでも同じ）
 * 2. アクセント句の直し: /audio_query が返す AquesTalk 風の読み（kana）を、決まった規則で直してから
 *    /accent_phrases?is_kana=true で読み直す（エディタで「アクセント句をつなぐ／切る」のと同じ操作）
 *    - 数字が「ニヒャク/ゴジュウ/ロクギガ」のように細かく切れる → 「ニヒャクゴジュウロクギガ」に（万・億の後は切ったまま）
 *    - 「アイフォンジュウ/ナナプロマックス」→「アイフォン/ジュウナナ/プロマックス」（ブランド・番号・Pro などを別の句に）
 *    - 「ネサガリ/シタ」→「ネサガリシタ」（「した」「します」を前の句につなぐ）
 * 3. 文ごとの手直し: script.json の narrationKana（AquesTalk 風の読み）を書いた場面は、それをそのまま使う
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

/** 規則を変えたら上げる（声のキャッシュを作り直すため）。2: 長音のモーラを延ばす（10/21）。3: ギャラクシー・ピクセルを機種名の頭に（10/22） */
export const TUNING_VERSION = 3;

export type DictWord = { surface: string; pronunciation: string; accent_type: number; word_type?: string; priority?: number };
const DICT_FILE = resolve(__dirname, "voice-dict.json");
export const dictWords = (): DictWord[] => (JSON.parse(readFileSync(DICT_FILE, "utf8")) as { words: DictWord[] }).words;
export const dictHash = () => createHash("sha256").update(JSON.stringify(dictWords())).digest("hex").slice(0, 8);

type Http = (path: string, init?: RequestInit & { timeoutMs?: number }) => Promise<Response>;

/** 辞書を登録する。結果（追加・更新・そのまま）の件数を返す */
export async function ensureDictionary(http: Http): Promise<{ added: number; updated: number; same: number }> {
  const current = (await (await http("/user_dict", { timeoutMs: 5000 })).json()) as Record<string, { surface: string; pronunciation: string; accent_type: number; priority: number }>;
  const norm = (s: string) => s.normalize("NFKC");
  const bySurface = new Map(Object.entries(current).map(([id, w]) => [norm(w.surface), { id, ...w }]));
  const r = { added: 0, updated: 0, same: 0 };
  for (const w of dictWords()) {
    const q = new URLSearchParams({ surface: w.surface, pronunciation: w.pronunciation, accent_type: String(w.accent_type) });
    if (w.word_type) q.set("word_type", w.word_type);
    if (w.priority !== undefined) q.set("priority", String(w.priority));
    const has = bySurface.get(norm(w.surface));
    if (!has) {
      await http(`/user_dict_word?${q}`, { method: "POST" });
      r.added++;
    } else if (has.pronunciation !== w.pronunciation || has.accent_type !== w.accent_type || (w.priority !== undefined && has.priority !== w.priority)) {
      await http(`/user_dict_word/${has.id}?${q}`, { method: "PUT" });
      r.updated++;
    } else r.same++;
  }
  return r;
}

// ---- アクセント句の直し（AquesTalk 風記法: 句は / か 、 で区切る・' がアクセント・_ が無声化・句末の ？ が疑問） ----

type Phrase = { raw: string; sep: string };
const strip = (raw: string) => raw.replace(/['_？]/g, "");
const NUM_WORD = "(?:イチ|イッ|ニ|サン|ヨン|ゴ|ロク|ロッ|ナナ|シチ|ハチ|ハッ|キュウ|ジュウ|ジュッ|ヒャク|ビャク|ピャク|セン|ゼン|マン|テン)";
const ALL_NUM = new RegExp(`^${NUM_WORD}+$`);
const STARTS_NUM = new RegExp(`^${NUM_WORD}`);
/** 機種名の頭（アクセントは voice-dict.json と同じ） */
const BRANDS: Record<string, string> = {
  アイフォン: "アイフォ'ン", アイパッド: "アイパ'ッド", マックブック: "マックブ'ック",
  // fold（10/22）: 「ピ'クセルジュウ/イチプロ…」と切られて「11」が「10・1」に聞こえたので、頭で切ってから数字をつなぎ直す
  ギャラクシイ: "ギャラ'_クシイ", ピクセル: "ピ'_クセル",
};
/** 番号の後ろにつく型名（長いものから） */
const MODEL_SUFFIX = ["プロマックス", "プラス", "プロ", "エアア", "ミニ", "イイ"];
/** 前の句につなぐ「する」の形 */
const SURU = new Set(["シタ", "シマシタ", "シテ", "スル", "シマス", "サレタ", "シテイマス"]);

function parse(kana: string): Phrase[] {
  const parts = kana.split(/([/、])/);
  const out: Phrase[] = [];
  for (let i = 0; i < parts.length; i += 2) if (parts[i]) out.push({ raw: parts[i], sep: parts[i + 1] ?? "" });
  return out;
}
const build = (ps: Phrase[]) => ps.map((p, i) => p.raw + (i < ps.length - 1 ? p.sep || "/" : "")).join("");

/** raw を、記号を除いた n 文字目の位置で 2 つに切る */
function cut(raw: string, n: number): [string, string] {
  let seen = 0;
  for (let i = 0; i < raw.length; i++) {
    if (seen === n && !"'".includes(raw[i])) return [raw.slice(0, i), raw.slice(i)];
    if (!"'_？".includes(raw[i])) seen++;
  }
  return [raw, ""];
}

/** 2 つの句をつなぐ。アクセントは後ろの句のもの（複合語は後ろの語で決まることが多い） */
const joinLast = (a: string, b: string) => a.replace(/'/g, "") + b;
/** 前の句が平板（' が句末）なら後ろの印、そうでなければ前の句のアクセントを残す */
const joinSuru = (a: string, b: string) => (/'？?$/.test(a) ? a.replace(/'/g, "") + b : a + b.replace(/'/g, ""));

/**
 * 読み（kana）を直す。kanaOf は「この文字列をエンジンが読むとどうなるか」（アクセントが分からない句に使う）
 */
export async function tuneKana(kana: string, kanaOf: (text: string) => Promise<string>): Promise<string> {
  let ps = parse(kana);
  // 1) 機種名の頭を切り離す: アイフォ'ンジュウ → アイフォ'ン / ジュウ
  ps = ps.flatMap((p) => {
    const s = strip(p.raw);
    const brand = Object.keys(BRANDS).find((b) => s.startsWith(b) && s.length > b.length);
    if (!brand) return [p];
    const [, rest] = cut(p.raw, brand.length);
    return [{ raw: BRANDS[brand], sep: "/" }, { raw: rest, sep: p.sep }];
  });
  // 2) 番号と型名を分ける: ナナプロマ'ッ_クス → ナナ / プロマ'ッ_クス
  ps = ps.flatMap((p) => {
    const s = strip(p.raw);
    const m = s.match(new RegExp(`^(${NUM_WORD}+)(${MODEL_SUFFIX.join("|")})`));
    if (!m) return [p];
    const [a, b] = cut(p.raw, m[1].length);
    return [{ raw: a, sep: "/" }, { raw: b, sep: p.sep }];
  });
  // 3) 切ってアクセントの印がなくなった句は、エンジンにその部分だけ読ませて決める
  const resolved: Phrase[] = [];
  for (const p of ps) {
    if (p.raw.includes("'")) {
      resolved.push(p);
      continue;
    }
    const sub = parse(await kanaOf(strip(p.raw)));
    sub.forEach((q, i) => resolved.push({ raw: q.raw, sep: i < sub.length - 1 ? q.sep || "/" : p.sep }));
  }
  ps = resolved;
  // 4) 数字のつなぎ直し: ニヒャク'/ゴジュウ'/ロクギ'ガ → ニヒャクゴジュウロクギ'ガ（「万」の後は切ったまま。、の所はつながない）
  // 5) 「した」をつなぐ: ネサガリ'/_シタ' → ネサガリ_シタ'
  const out: Phrase[] = [];
  for (const p of ps) {
    const prev = out[out.length - 1];
    if (prev && prev.sep === "/") {
      const a = strip(prev.raw);
      const b = strip(p.raw);
      if (ALL_NUM.test(a) && !/(マン|オク)$/.test(a) && STARTS_NUM.test(b)) {
        out[out.length - 1] = { raw: joinLast(prev.raw, p.raw), sep: p.sep };
        continue;
      }
      if (SURU.has(b)) {
        out[out.length - 1] = { raw: joinSuru(prev.raw, p.raw), sep: p.sep };
        continue;
      }
    }
    out.push({ ...p });
  }
  return build(out);
}

// ---- 長音（10/21）: 「ジュウ」「パア」「ソオ」の伸ばす音が短すぎて「じゅよん」「ぱせんと」と聞こえる ----
// エンジンの読みは長音を「母音だけのモーラ」（ジュ＋ウ）で持ち、その母音の長さが 0.03〜0.07 秒しかない（春日部つむぎで目立つ。速さ 1.25 でさらに縮む）。
// AquesTalk 風の読みの「ー」はエンジンが受け付けない（is_kana=true で 400）ので、読みは変えずに、合成直前のクエリでそのモーラの母音を延ばす。
// アクセントの位置・句の切れ目は変えない

export type Mora = { text: string; consonant?: string | null; consonant_length?: number | null; vowel: string; vowel_length: number; pitch?: number };
export type AccentPhrase = { moras: Mora[]; accent: number; pause_mora?: Mora | null; is_interrogative?: boolean };

/** 長音とみなす母音のモーラの、母音の長さの下限（秒・話速 1.0 のとき） */
export const LONG_VOWEL_MIN = 0.12;
/** 前のモーラの母音に続けて伸ばす母音（オ段の後のウ＝「ホウ→ホー」を含む。エ段の後のイ（エイ）は入れない） */
const CONTINUES: Record<string, string[]> = { a: ["a"], i: ["i"], u: ["u"], e: ["e"], o: ["o", "u"] };

/**
 * 子音のない母音だけのモーラが、前のモーラの母音を伸ばすもの（長音）なら、母音の長さを LONG_VOWEL_MIN まで延ばし、無声化（大文字の母音）をやめる。
 * 直したモーラを「句の番号:モーラ」の形で返す（--voice-dump の表示用）
 */
export function lengthenLongVowels(aps: AccentPhrase[]): string[] {
  const changed: string[] = [];
  aps.forEach((ap, ai) => {
    ap.moras.forEach((m, i) => {
      const prev = i > 0 ? ap.moras[i - 1] : null;
      if (!prev || m.consonant || !/^[アイウエオ]$/.test(m.text)) return;
      const pv = prev.vowel.toLowerCase();
      const v = m.vowel.toLowerCase();
      if (!CONTINUES[pv]?.includes(v)) return;
      const before = m.vowel_length;
      m.vowel = v;
      if (m.vowel_length < LONG_VOWEL_MIN) m.vowel_length = LONG_VOWEL_MIN;
      changed.push(`${ai}:${prev.text}${m.text} ${before.toFixed(2)}→${m.vowel_length.toFixed(2)}`);
    });
  });
  return changed;
}

/** モーラごとの母音の長さ（確認用）。例 ジュ(u.06)ウ(u.12) */
export const moraLengths = (aps: AccentPhrase[]) =>
  aps.map((ap) => ap.moras.map((m) => `${m.text}(${m.vowel}${m.vowel_length.toFixed(2).replace(/^0/, "")})`).join("")).join(" / ");
