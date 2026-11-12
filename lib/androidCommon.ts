/**
 * Xperia（lib/xperiaCatalog.ts）・AQUOS（lib/aquosCatalog.ts）で共通の型と、型番の読み取り。2026-10-15〜
 *
 * 載せるのは 2021年以降の機種。Galaxy と違い商品名に型番が必ず付くことが多いので、
 * 機種の見分けは「型番 → 名前」の順にする（Xperia の世代はローマ数字で、IV・V・VI の取り違えが起きやすいため）。
 * 型番体系: ドコモ SO-5xY / SH-5xY（末尾の英字が年。B=2021 … G=2026）、au は SOG・SHG の連番、
 * SoftBank・Y!mobile は A+3桁+SO/SH、SIM フリーは XQ-xxxx・SH-Mxx（AQUOS R8 系は SH-R80・SH-R80P）
 */

export type AndroidInfo = {
  /** 日本での発売（年月 "2025-10"。年だけ分かるものは "2023"。公式で確かめられていなければ null） */
  released: string | null;
  /**
   * 発売日の出どころの注記（"報道" ＝ メーカーの公式発表ではなく報道ベース／"au" ＝ ドコモではなく au の発売日）。
   * OPPO・Xiaomi（2026-11-12〜）は「Y!mobile（2024年6月27日）」のような自由な文（どの売り場で最初に出たか）
   */
  releasedNote?: "報道" | "au" | (string & {});
  /** 型番（キャリア別）。複数あるものは配列。rakuten・uq は OPPO・Xiaomi 用（2026-11-12〜） */
  codes: { docomo?: string[]; au?: string[]; uq?: string[]; softbank?: string[]; ymobile?: string[]; rakuten?: string[]; simfree?: string[] };
  /** 型番のうち、公式ページで未確認のもの（辞書には入れてあるが、機種ページの型番表示には出さない） */
  unconfirmed?: string[];
  /** OS アップデートの公式の方針（"最大3回・5年" など）。公式の記載を確かめられていなければ null（推測で埋めない） */
  osPolicy: string | null;
  /** セキュリティ更新の終了（"2028-06"）。メーカーの法人向け資料（Sony AER・Sharp AER）の値。なければ null */
  securityUntil: string | null;
};

/** 機種ページの「型番」の行の表示名（この順に並べる）。uq・rakuten は OPPO・Xiaomi 用（Xperia・AQUOS には値がないので表示は変わらない） */
export const CARRIER_LABELS = { docomo: "ドコモ", au: "au", uq: "UQ mobile", softbank: "SoftBank", ymobile: "Y!mobile", rakuten: "楽天モバイル", simfree: "SIMフリー" } as const;

/** 型番の比較用の形（ハイフンを除き、大文字にする）: "SO-51F" → "SO51F" */
export const codeKey = (code: string): string => code.replace(/-/g, "").toUpperCase();

/** 商品名の中の型番らしい語（Xperia と AQUOS の両方の体系）。前後が英数字のものは除く */
const CODE_TOKEN =
  /(?<![A-Za-z0-9])(?:SO-?\d{2}[A-Z]|SOG\d{2}|A\d{3}SO|XQ-?[A-Z]{2}\d{2}|SH-?\d{2}[A-Z]|SHG\d{2}|A\d{3}SH|SH-?M\d{2}|SH-?RM\d{2}[sS]?|SH-?R\d{2}P?)(?![A-Za-z0-9])/gi;

/** 機種の情報から、型番 → 機種名の辞書を作る */
export function buildCodeIndex(info: Record<string, AndroidInfo>): Map<string, string> {
  const index = new Map<string, string>();
  for (const [model, i] of Object.entries(info)) {
    const all = [...Object.values(i.codes).flat(), ...(i.unconfirmed ?? [])];
    for (const code of all) index.set(codeKey(code), model);
  }
  return index;
}

/** 商品名に含まれる型番のうち、辞書にあるもので機種を決める。なければ null */
export function modelByCode(raw: string, index: Map<string, string>): string | null {
  for (const m of raw.matchAll(CODE_TOKEN)) {
    const model = index.get(codeKey(m[0]));
    if (model) return model;
  }
  return null;
}

/** 商品名に含まれる型番らしい語をすべて返す（色の読み取りで型番を除くため。辞書にあるかは問わない） */
export function codeTokens(raw: string): string[] {
  return [...raw.matchAll(CODE_TOKEN)].map((m) => m[0]);
}

// ---- 名前での機種の見分け（OPPO・Xiaomi。2026-11-12〜） ----
//
// 店の書き方は空白がゆれる（"Reno13A"・"Xiaomi14T"・"REDMI15 5G"・"Redmi Note13 Pro 5G"）。そこで NFKC → 小文字 → 英字と数字の境目・"+" の前後で区切った
// 語の並びにして、カタログの機種名の語の並びが続けて含まれるかを、語の多い機種から順に見る。
// - 当たった語のすぐ後ろが「別の機種を表す語」（pro・ultra・max・+・lite など）や、数字にくっついた・単独の英字1文字（"15T"・"A5x"・"Reno14 A"）なら
//   当てない（"Xiaomi 15 Ultra" を Xiaomi 15 に、"OPPO A5x" を A5 5G にしない）。後ろに数字が続く英字（"M2003J6A1R" の "M"）は型番なので気にしない
// - 末尾の "5G" は、同じ語幹の別機種がカタログに無ければ、商品名に無くても当てる（"Redmi 12" → Redmi 12 5G）
// - ブランドの語（"oppo"・"xiaomi"）は、その後ろがシリーズの語（Reno・Find・Redmi・POCO・Mi）のときだけ省いてよい（"OPPO A5" の "a 5" や "Xiaomi 15" の "15" だけでは当てない）

type NameToken = { t: string; gluedPrev: boolean; gluedNext: boolean };

/** 語の並びと、前後の語とのくっつき（間に空白・記号がないか） */
function tokenize(raw: string): NameToken[] {
  const s = raw.normalize("NFKC").toLowerCase();
  const ms = [...s.matchAll(/[a-z]+|\d+|\+/g)];
  return ms.map((m, i) => ({
    t: m[0],
    gluedPrev: i > 0 && ms[i - 1].index! + ms[i - 1][0].length === m.index,
    gluedNext: i + 1 < ms.length && m.index! + m[0].length === ms[i + 1].index,
  }));
}

/** 商品名・機種名を比べるための語の並び: "Redmi Note13 Pro+ 5G" → ["redmi", "note", "13", "pro", "+", "5", "g"] */
export function nameTokens(raw: string): string[] {
  return tokenize(raw).map((x) => x.t);
}

/** すぐ後ろに来たら「別の機種」とみなす語 */
const VARIANT_WORDS = new Set(["pro", "ultra", "max", "plus", "+", "lite", "mini", "neo", "se", "fold", "flip", "je", "prime", "edge", "fe"]);
const isVariantWord = (x: NameToken | undefined): boolean =>
  x !== undefined && (VARIANT_WORDS.has(x.t) || (/^[a-z]$/.test(x.t) && (x.gluedPrev || !x.gluedNext)));

/**
 * カタログの機種名から、商品名 → 機種名の関数を作る。
 * brand はブランドの語（"oppo"）、series はブランドの語を省いてよいシリーズの語（["reno", "find"]）
 */
export function buildNameMatcher(models: readonly string[], brand: string, series: readonly string[]): (raw: string) => string | null {
  const patterns: { tokens: string[]; model: string }[] = [];
  const full = models.map((m) => ({ model: m, tokens: nameTokens(m) }));
  const stemOf = (t: string[]) => (t.length > 2 && t[t.length - 2] === "5" && t[t.length - 1] === "g" ? t.slice(0, -2) : null);
  const key = (t: string[]) => t.join(" ");
  const fullKeys = new Set(full.map((f) => key(f.tokens)));
  const stemCount = new Map<string, number>();
  for (const f of full) { const s = stemOf(f.tokens); if (s) stemCount.set(key(s), (stemCount.get(key(s)) ?? 0) + 1); }
  for (const { model, tokens } of full) {
    const variants = [tokens];
    const stem = stemOf(tokens);
    // 同じ語幹の別機種（"… 5G" が2つ・"5G" なしの機種が別にある）がなければ、"5G" なしでも当てる
    if (stem && stemCount.get(key(stem)) === 1 && !fullKeys.has(key(stem))) variants.push(stem);
    for (const v of [...variants]) if (v[0] === brand && series.includes(v[1])) variants.push(v.slice(1));
    for (const v of variants) patterns.push({ tokens: v, model });
  }
  patterns.sort((a, b) => b.tokens.length - a.tokens.length);
  return (raw: string) => {
    const t = tokenize(raw);
    for (const p of patterns) {
      const n = p.tokens.length;
      for (let i = 0; i + n <= t.length; i++) {
        let ok = true;
        for (let j = 0; j < n; j++) if (t[i + j].t !== p.tokens[j]) { ok = false; break; }
        if (ok && !isVariantWord(t[i + n])) return p.model;
      }
    }
    return null;
  };
}
