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
  /** 発売日の出どころの注記（"報道" ＝ メーカーの公式発表ではなく報道ベース／"au" ＝ ドコモではなく au の発売日） */
  releasedNote?: "報道" | "au";
  /** 型番（キャリア別）。複数あるものは配列 */
  codes: { docomo?: string[]; au?: string[]; softbank?: string[]; ymobile?: string[]; simfree?: string[] };
  /** 型番のうち、公式ページで未確認のもの（辞書には入れてあるが、機種ページの型番表示には出さない） */
  unconfirmed?: string[];
  /** OS アップデートの公式の方針（"最大3回・5年" など）。公式の記載を確かめられていなければ null（推測で埋めない） */
  osPolicy: string | null;
  /** セキュリティ更新の終了（"2028-06"）。メーカーの法人向け資料（Sony AER・Sharp AER）の値。なければ null */
  securityUntil: string | null;
};

export const CARRIER_LABELS = { docomo: "ドコモ", au: "au", softbank: "SoftBank", ymobile: "Y!mobile", simfree: "SIMフリー" } as const;

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
