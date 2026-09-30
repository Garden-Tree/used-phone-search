/**
 * Google Pixel のカタログ（機種別ページ /pixel/[slug]・検索の機種照合・取り込み後の名前チェックで共有する）。2026-09-30〜
 *
 * 載せるのは、Google のアップデート保証の対象になっている Pixel 6 以降。2026-09-30 に Google 公式で確認した:
 *   - 保証の年数 … 「Pixel のアップデート保証期間」https://support.google.com/pixelphone/answer/4457705
 *       Pixel 8 以降は販売開始から7年、Pixel 6〜7 シリーズ・Pixel Fold は5年
 *   - 販売開始の年月 … 「デバイスが利用可能になった時期」https://support.google.com/pixelphone/answer/15738422（米国 Google ストア）
 * 機種名は Google の表記。スクレイパー（scraper/common.py の PIXEL_MODELS）と同じ一覧にする（npm run test:normalize で確かめる）
 */

type PixelInfo = {
  /** 米国 Google ストアで販売が始まった年月（"2023-10"） */
  available: string;
  /** アップデート保証の年数 */
  updateYears: 5 | 7;
};

export const PIXEL_CATALOG = [
  { series: "Pixel 11", models: ["Pixel 11 Pro Fold", "Pixel 11 Pro XL", "Pixel 11 Pro", "Pixel 11"] },
  { series: "Pixel 10", models: ["Pixel 10 Pro Fold", "Pixel 10 Pro XL", "Pixel 10 Pro", "Pixel 10", "Pixel 10a"] },
  { series: "Pixel 9", models: ["Pixel 9 Pro Fold", "Pixel 9 Pro XL", "Pixel 9 Pro", "Pixel 9", "Pixel 9a"] },
  { series: "Pixel 8", models: ["Pixel 8 Pro", "Pixel 8", "Pixel 8a"] },
  { series: "Pixel 7・Fold", models: ["Pixel Fold", "Pixel 7 Pro", "Pixel 7", "Pixel 7a"] },
  { series: "Pixel 6", models: ["Pixel 6 Pro", "Pixel 6", "Pixel 6a"] },
];

/** Pixel の機種別ページを持つ全モデル（シリーズごとに新しい順） */
export const PIXEL_MODELS = PIXEL_CATALOG.flatMap((s) => s.models);

export const PIXEL_INFO: Record<string, PixelInfo> = {
  "Pixel 11 Pro Fold": { available: "2026-08", updateYears: 7 },
  "Pixel 11 Pro XL": { available: "2026-08", updateYears: 7 },
  "Pixel 11 Pro": { available: "2026-08", updateYears: 7 },
  "Pixel 11": { available: "2026-08", updateYears: 7 },
  "Pixel 10a": { available: "2026-03", updateYears: 7 },
  "Pixel 10 Pro Fold": { available: "2025-10", updateYears: 7 },
  "Pixel 10 Pro XL": { available: "2025-08", updateYears: 7 },
  "Pixel 10 Pro": { available: "2025-08", updateYears: 7 },
  "Pixel 10": { available: "2025-08", updateYears: 7 },
  "Pixel 9a": { available: "2025-04", updateYears: 7 },
  "Pixel 9 Pro XL": { available: "2024-08", updateYears: 7 },
  "Pixel 9 Pro": { available: "2024-09", updateYears: 7 },
  "Pixel 9": { available: "2024-08", updateYears: 7 },
  "Pixel 9 Pro Fold": { available: "2024-09", updateYears: 7 },
  "Pixel 8a": { available: "2024-05", updateYears: 7 },
  "Pixel 8 Pro": { available: "2023-10", updateYears: 7 },
  "Pixel 8": { available: "2023-10", updateYears: 7 },
  "Pixel Fold": { available: "2023-06", updateYears: 5 },
  "Pixel 7a": { available: "2023-05", updateYears: 5 },
  "Pixel 7 Pro": { available: "2022-10", updateYears: 5 },
  "Pixel 7": { available: "2022-10", updateYears: 5 },
  "Pixel 6a": { available: "2022-07", updateYears: 5 },
  "Pixel 6 Pro": { available: "2021-10", updateYears: 5 },
  "Pixel 6": { available: "2021-10", updateYears: 5 },
};

export const isPixel = (model: string) => /^Pixel/.test(model);

const KNOWN = new Set(PIXEL_MODELS);

/**
 * 商品名から Pixel の機種名（Google の表記）を返す。Pixel 5a 以前・アクセサリなど読み取れないものは null。
 * スクレイパーの canonical_pixel_model（scraper/common.py）と同じ規則。楽天3店の読み取り（lib/rakutenPixel.ts）で使う
 */
export function canonicalPixelModel(raw: string): string | null {
  const m = raw.match(/Pixel\s?(\d{1,2})\s?(a|Pro\s?Fold|Pro\s?XL|Pro)?(?![0-9A-Za-z])/i);
  let name: string;
  if (m) {
    const variant = (m[2] ?? "").toLowerCase().replace(/\s/g, "");
    const suffix = ({ "": "", a: "a", pro: " Pro", proxl: " Pro XL", profold: " Pro Fold" } as Record<string, string>)[variant];
    name = `Pixel ${Number(m[1])}${suffix}`;
  } else if (/Pixel\s?Fold/i.test(raw)) {
    name = "Pixel Fold";
  } else {
    return null;
  }
  return KNOWN.has(name) ? name : null;
}

const ym = (s: string) => { const [y, m] = s.split("-").map(Number); return { y, m }; };

/** "2023-10" → "2023年10月" */
export const jaMonth = (s: string) => { const { y, m } = ym(s); return `${y}年${m}月`; };

/** アップデート保証の終わり（販売開始の年月 + 年数）。"2030-10" */
export function updateUntil(model: string): string | undefined {
  const info = PIXEL_INFO[model];
  if (!info) return undefined;
  const { y, m } = ym(info.available);
  return `${y + info.updateYears}-${String(m).padStart(2, "0")}`;
}

/** アップデート保証の残り（年、小数1桁）。0 以下なら終了。now は "2026-09" の形 */
export function updateYearsLeft(model: string, now: string): number | undefined {
  const until = updateUntil(model);
  if (!until) return undefined;
  const a = ym(until);
  const b = ym(now);
  return Math.round(((a.y - b.y) * 12 + (a.m - b.m)) / 1.2) / 10;
}
