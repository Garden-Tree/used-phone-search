/**
 * Sharp AQUOS のカタログ（機種別ページ /aquos/[slug]・検索の機種照合・楽天4店の読み取りで共有する）。2026-10-15〜
 *
 * 載せるのは 2021年以降の R・sense・wish（R6〜R11、sense6〜sense10、wish〜wish6）。sense4 以前・lite/basic の旧機種は範囲外（読み取りは null）。
 * 機種名は Sharp の表記（"AQUOS sense9"）。sense6 と sense6s、sense7 と sense7 plus、R8 と R8 pro、R9 と R9 pro は別の機種。
 *
 * 出典（2026-10-15）:
 *   - 型番 … 各社の発表・docomo サポートページ・jp.sharp の各機種 specs ページ（例 https://jp.sharp/k-tai/products/aquos-sense9/specs/）
 *   - OS アップデートの方針 … https://k-tai.sharp.co.jp/support/osv/lineup.html
 *   - セキュリティ更新の終了時期 … Sharp の法人向け資料 https://k-tai.sharp.co.jp/business/aer_models.html （AER）
 * 公式で確かめられていない値は null（OS の回数・年数など）。推測で埋めない。
 * 発売は日本（ドコモ）の発売日。au 先行の機種（sense6s・wish）は au の発売日（releasedNote）。
 */
import { buildCodeIndex, modelByCode, type AndroidInfo } from "@/lib/androidCommon";

export const AQUOS_INFO: Record<string, AndroidInfo> = {
  "AQUOS R11": {
    released: "2026-07",
    codes: { docomo: ["SH-51G"], softbank: ["A602SH"], simfree: ["SH-M35"] },
    osPolicy: "最大3回・5年", securityUntil: "2031-06",
  },
  "AQUOS wish6": {
    released: null,
    codes: { simfree: ["SH-M36"] },
    osPolicy: "最大2回・4年", securityUntil: "2030-08",
  },
  "AQUOS sense10": {
    released: "2025-11",
    codes: { docomo: ["SH-53F"], softbank: ["A505SH"], simfree: ["SH-M33"] },
    osPolicy: "最大3回・5年", securityUntil: "2030-10",
  },
  "AQUOS R10": {
    released: "2025-07",
    codes: { docomo: ["SH-51F"], softbank: ["A501SH"], simfree: ["SH-M31"] },
    osPolicy: "最大3回・5年", securityUntil: "2030-06",
  },
  "AQUOS wish5": {
    released: "2025-06",
    codes: { docomo: ["SH-52F"], ymobile: ["A502SH"], simfree: ["SH-M32"] },
    osPolicy: "最大2回・4年", securityUntil: "2029-05",
  },
  "AQUOS R9 pro": {
    released: "2024-12",
    codes: { docomo: ["SH-54E"], softbank: ["A504SH"], simfree: ["SH-M30"] },
    osPolicy: null, securityUntil: "2029-11",
  },
  "AQUOS sense9": {
    released: "2024-11",
    codes: { docomo: ["SH-53E"], au: ["SHG14"], softbank: ["A405SH"], simfree: ["SH-M29"] },
    osPolicy: "最大3回・5年", securityUntil: "2029-10",
  },
  "AQUOS R9": {
    released: "2024-07",
    codes: { docomo: ["SH-51E"], softbank: ["A401SH"], simfree: ["SH-M28"] },
    osPolicy: "最大3回・5年", securityUntil: "2029-06",
  },
  "AQUOS wish4": {
    released: "2024-07",
    codes: { docomo: ["SH-52E"], au: ["SHG13"], softbank: ["A403SH"], ymobile: ["A402SH"], simfree: ["SH-M27"] },
    osPolicy: "最大2回・3年", securityUntil: "2027-06",
  },
  "AQUOS sense8": {
    released: "2023-11",
    codes: { docomo: ["SH-54D"], au: ["SHG11"], simfree: ["SH-M26"] },
    osPolicy: "最大3回・5年", securityUntil: "2028-10",
  },
  "AQUOS R8 pro": {
    released: "2023",
    codes: { docomo: ["SH-51D"], softbank: ["A301SH"], simfree: ["SH-R80P"] },
    osPolicy: "最大3回・3年", securityUntil: "2028-07",
  },
  "AQUOS R8": {
    released: "2023-08",
    codes: { docomo: ["SH-52D"], simfree: ["SH-R80"] },
    osPolicy: null, securityUntil: "2028-07",
  },
  "AQUOS wish3": {
    released: "2023-08",
    codes: { docomo: ["SH-53D"], softbank: ["A303SH"], ymobile: ["A302SH"], simfree: ["SH-M25"] },
    osPolicy: "最大2回・3年", securityUntil: "2026-08",
  },
  "AQUOS sense7": {
    released: "2022-11",
    codes: { docomo: ["SH-53C"], au: ["SHG10"], simfree: ["SH-M24"] },
    osPolicy: null, securityUntil: "2025-10",
  },
  "AQUOS sense7 plus": {
    released: null,
    codes: { softbank: ["A208SH"] },
    osPolicy: null, securityUntil: null,
  },
  "AQUOS R7": {
    released: "2022-07",
    codes: { docomo: ["SH-52C"], softbank: ["A202SH"] },
    osPolicy: null, securityUntil: "2025-06",
  },
  "AQUOS wish2": {
    released: "2022-06",
    codes: { docomo: ["SH-51C"], au: ["SHG08"], ymobile: ["A204SH"] },
    osPolicy: null, securityUntil: null,
  },
  "AQUOS sense6": {
    released: "2021-11",
    codes: { docomo: ["SH-54B"], au: ["SHG05"], simfree: ["SH-M19"] },
    osPolicy: null, securityUntil: "2024-10",
  },
  "AQUOS sense6s": {
    released: "2022-04", releasedNote: "au",
    codes: { au: ["SHG07"], simfree: ["SH-RM19s"] },
    osPolicy: null, securityUntil: null,
  },
  "AQUOS R6": {
    released: "2021-06",
    codes: { docomo: ["SH-51B"], softbank: ["A101SH"], simfree: ["SH-M22"] },
    osPolicy: null, securityUntil: "2024-05",
  },
  "AQUOS wish": {
    released: "2022-01", releasedNote: "au",
    codes: { au: ["SHG06"], softbank: ["A103SH"], ymobile: ["A104SH"], simfree: ["SH-M20"] },
    osPolicy: null, securityUntil: null,
  },
};

/** 機種別ページ・一覧に出すシリーズごとの並び（新しい順） */
export const AQUOS_CATALOG = [
  { series: "AQUOS R", models: ["AQUOS R11", "AQUOS R10", "AQUOS R9 pro", "AQUOS R9", "AQUOS R8 pro", "AQUOS R8", "AQUOS R7", "AQUOS R6"] },
  { series: "AQUOS sense", models: ["AQUOS sense10", "AQUOS sense9", "AQUOS sense8", "AQUOS sense7 plus", "AQUOS sense7", "AQUOS sense6s", "AQUOS sense6"] },
  { series: "AQUOS wish", models: ["AQUOS wish6", "AQUOS wish5", "AQUOS wish4", "AQUOS wish3", "AQUOS wish2", "AQUOS wish"] },
];

/** AQUOS の機種別ページを持つ全モデル（シリーズごとに新しい順） */
export const AQUOS_MODELS = AQUOS_CATALOG.flatMap((s) => s.models);

export const isAquos = (model: string) => /^AQUOS/.test(model);

const CODE_INDEX = buildCodeIndex(AQUOS_INFO);

/**
 * 商品名中の AQUOS の名前。R6〜R11（R9 pro・R8 pro）・sense6〜10（sense6s・sense7 plus）・wish（wish2〜6）。
 * 末尾は英数字が続かないこと（"sense4" が "sense" 系の別名として拾われたり、"R5G" が R5 になったりしない）
 */
export const AQUOS_NAME_RE =
  /AQUOS\s?(?:R\s?(\d{1,2})(?:\s?(pro))?|sense\s?(\d{1,2})(s|\s?plus)?|wish\s?(\d?))(?![A-Za-z0-9])/i;

/**
 * 商品名から AQUOS の機種名を返す。範囲外（sense5 以前・lite/basic・plus の旧機種）や読み取れないものは null。
 * 型番を先に見て、型番がないときだけ名前で決める
 */
export function canonicalAquosModel(raw: string): string | null {
  const text = raw.normalize("NFKC");
  const byCode = modelByCode(text, CODE_INDEX);
  if (byCode) return byCode;
  const m = text.match(AQUOS_NAME_RE);
  if (!m) return null;
  const name = m[1] !== undefined
    ? `AQUOS R${Number(m[1])}${m[2] ? " pro" : ""}`
    : m[3] !== undefined
      ? `AQUOS sense${Number(m[3])}${m[4] ? (m[4].toLowerCase() === "s" ? "s" : " plus") : ""}`
      : `AQUOS wish${m[5] ?? ""}`;
  return name in AQUOS_INFO ? name : null;
}
