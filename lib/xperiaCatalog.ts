/**
 * Sony Xperia のカタログ（機種別ページ /xperia/[slug]・検索の機種照合・楽天4店の読み取りで共有する）。2026-10-15〜
 *
 * 載せるのは 2021年以降の機種（Xperia 1・5・10 の III〜VIII と Ace II・III）。それ以前（Xperia 10 II・Ace 無印など）・Xperia PRO-I は範囲外（読み取りは null）。
 * 機種名は Sony の表記（"Xperia 1 VII"）。
 *
 * 出典（2026-10-15）:
 *   - 型番（ドコモ・au・SoftBank・SIM フリー）… https://www.sony.jp/xperia/product/index.html と各社の発表
 *   - OS アップデート・セキュリティ更新の方針 … Sony 各機種の製品ページ、Sony プレス（Xperia 1 VII: 25-0513、Xperia 10 VII: 25-1002）、
 *     セキュリティ更新の終了時期は Sony の法人向け資料 https://www.sony.jp/xperia/product/aer/ （AER）
 * 公式で確かめられていない値は null（OS の回数・年数など）。推測で埋めない。型番のうち公式未確認のものは unconfirmed に入れ（辞書には使う）、機種ページには出さない。
 * 発売は日本（ドコモ）の発売日。Xperia 1 VIII（2026-06）は報道の日付。
 */
import { buildCodeIndex, modelByCode, type AndroidInfo } from "@/lib/androidCommon";

export const XPERIA_INFO: Record<string, AndroidInfo> = {
  "Xperia 10 VIII": {
    released: "2026-10",
    codes: { docomo: ["SO-52G"] }, unconfirmed: ["SOG18", "A602SO", "XQ-GH44"],
    osPolicy: "最大4回・最長6年", securityUntil: null,
  },
  "Xperia 1 VIII": {
    released: "2026-06", releasedNote: "報道",
    codes: { docomo: ["SO-51G"], au: ["SOG17"], softbank: ["A601SO"], simfree: ["XQ-GE44"] },
    osPolicy: "4回・6年", securityUntil: null,
  },
  "Xperia 10 VII": {
    released: "2025-10",
    codes: { docomo: ["SO-52F"], au: ["SOG16"], softbank: ["A502SO"], simfree: ["XQ-FE44"] },
    osPolicy: "最大4回・最低6年", securityUntil: null,
  },
  "Xperia 1 VII": {
    released: "2025-06",
    codes: { docomo: ["SO-51F"], au: ["SOG15"], softbank: ["A501SO"], simfree: ["XQ-FS44"] },
    osPolicy: "最大4回・最低6年", securityUntil: null,
  },
  "Xperia 10 VI": {
    released: "2024-07",
    codes: { docomo: ["SO-52E"], au: ["SOG14"], softbank: ["A402SO"], simfree: ["XQ-ES44"] },
    osPolicy: null, securityUntil: "2028-06",
  },
  "Xperia 1 VI": {
    released: "2024-06",
    codes: { docomo: ["SO-51E"], au: ["SOG13"], softbank: ["A401SO"], simfree: ["XQ-EC44"] },
    osPolicy: "最大3回・4年", securityUntil: null,
  },
  "Xperia 5 V": {
    released: "2023-10",
    codes: { docomo: ["SO-53D"], au: ["SOG12"], simfree: ["XQ-DE44"] },
    osPolicy: null, securityUntil: null,
  },
  "Xperia 10 V": {
    released: "2023-07",
    codes: { docomo: ["SO-52D"], au: ["SOG11"], softbank: ["A302SO"], simfree: ["XQ-DC44"] },
    osPolicy: null, securityUntil: "2026-06",
  },
  "Xperia 1 V": {
    released: "2023-06",
    codes: { docomo: ["SO-51D"], au: ["SOG10"], softbank: ["A301SO"], simfree: ["XQ-DQ44"] },
    osPolicy: null, securityUntil: null,
  },
  "Xperia 5 IV": {
    released: "2022-10",
    codes: { docomo: ["SO-54C"], au: ["SOG09"], softbank: ["A204SO"], simfree: ["XQ-CQ44"] },
    osPolicy: null, securityUntil: null,
  },
  "Xperia 10 IV": {
    released: "2022-07",
    codes: { docomo: ["SO-52C"], au: ["SOG07"], softbank: ["A202SO"], simfree: ["XQ-CC44"] },
    osPolicy: null, securityUntil: "2025-06",
  },
  "Xperia 1 IV": {
    released: "2022-06",
    codes: { docomo: ["SO-51C"], au: ["SOG06"], softbank: ["A201SO"], simfree: ["XQ-CT44"] },
    osPolicy: null, securityUntil: null,
  },
  "Xperia Ace III": {
    released: "2022-06",
    codes: { docomo: ["SO-53C"], au: ["SOG08"], softbank: ["A203SO"] },
    osPolicy: null, securityUntil: "2025-05",
  },
  "Xperia 5 III": {
    released: "2021-11",
    codes: { docomo: ["SO-53B"], au: ["SOG05"], softbank: ["A103SO"], simfree: ["XQ-BQ42"] },
    osPolicy: null, securityUntil: null,
  },
  "Xperia 1 III": {
    released: "2021-07",
    codes: { docomo: ["SO-51B"], au: ["SOG03"], softbank: ["A101SO"], simfree: ["XQ-BC42"] },
    osPolicy: null, securityUntil: null,
  },
  "Xperia 10 III": {
    released: "2021-06",
    codes: { docomo: ["SO-52B"], au: ["SOG04"], softbank: ["A102SO"], simfree: ["XQ-BT44"] },
    osPolicy: null, securityUntil: null,
  },
  "Xperia Ace II": {
    released: "2021-05",
    codes: { docomo: ["SO-41B"] },
    osPolicy: null, securityUntil: null,
  },
};

/** 機種別ページ・一覧に出すシリーズごとの並び（新しい順） */
export const XPERIA_CATALOG = [
  { series: "Xperia 1", models: ["Xperia 1 VIII", "Xperia 1 VII", "Xperia 1 VI", "Xperia 1 V", "Xperia 1 IV", "Xperia 1 III"] },
  { series: "Xperia 5", models: ["Xperia 5 V", "Xperia 5 IV", "Xperia 5 III"] },
  { series: "Xperia 10", models: ["Xperia 10 VIII", "Xperia 10 VII", "Xperia 10 VI", "Xperia 10 V", "Xperia 10 IV", "Xperia 10 III"] },
  { series: "Xperia Ace", models: ["Xperia Ace III", "Xperia Ace II"] },
];

/** Xperia の機種別ページを持つ全モデル（シリーズごとに新しい順） */
export const XPERIA_MODELS = XPERIA_CATALOG.flatMap((s) => s.models);

export const isXperia = (model: string) => /^Xperia/.test(model);

const CODE_INDEX = buildCodeIndex(XPERIA_INFO);

/** 商品名中の Xperia の名前。世代はローマ数字（1 VII・10 VI・Ace III）。"Xperia1 VII" のように空白がなくてもよい */
export const XPERIA_NAME_RE = /Xperia\s?(1|5|10|Ace)\s?([IVX]+)(?![A-Za-z0-9])/i;

/**
 * 商品名から Xperia の機種名を返す。範囲外（2020年以前・PRO-I・アクセサリ）や読み取れないものは null。
 * 型番を先に見る（IV・V・VI の取り違えを避ける）。型番がないとき（ソフマップの SOSAZ3 のような独自表記など）だけ名前で決める。
 * 全角ローマ数字（Ⅵ）は NFKC で半角にする
 */
export function canonicalXperiaModel(raw: string): string | null {
  const text = raw.normalize("NFKC");
  const byCode = modelByCode(text, CODE_INDEX);
  if (byCode) return byCode;
  const m = text.match(XPERIA_NAME_RE);
  if (!m) return null;
  const name = `Xperia ${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2].toUpperCase()}`;
  return name in XPERIA_INFO ? name : null;
}
