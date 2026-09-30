/**
 * Samsung Galaxy のカタログ（機種別ページ /galaxy/[slug]・検索の機種照合・楽天3店の読み取りで共有する）。2026-09-30〜
 *
 * 載せるのは 2022年以降の機種のうち、中古在庫が出ているもの（9/30 にイオシス・にこスマ・ダイワンの一覧で確認）。
 * 機種名は Samsung の表記（"Galaxy S24 Ultra" "Galaxy Z Fold7" "Galaxy A55 5G"）。
 * スクレイパー（scraper/common.py の GALAXY_MODELS）と同じ一覧にする（npm run test:normalize で確かめる）。
 * Pixel と違い、Samsung は日本向けにアップデートの保証期間を機種ごとに出していないので、保証の期限は載せない
 */
export const GALAXY_CATALOG = [
  { series: "Galaxy S26", models: ["Galaxy S26 Ultra", "Galaxy S26+", "Galaxy S26"] },
  { series: "Galaxy S25", models: ["Galaxy S25 Ultra", "Galaxy S25"] },
  { series: "Galaxy S24", models: ["Galaxy S24 Ultra", "Galaxy S24", "Galaxy S24 FE"] },
  { series: "Galaxy S23・S22", models: ["Galaxy S23 Ultra", "Galaxy S23", "Galaxy S22 Ultra", "Galaxy S22"] },
  {
    series: "Galaxy Z Fold",
    models: ["Galaxy Z Fold8 Ultra", "Galaxy Z Fold8", "Galaxy Z Fold7", "Galaxy Z Fold6", "Galaxy Z Fold5", "Galaxy Z Fold4"],
  },
  { series: "Galaxy Z Flip", models: ["Galaxy Z Flip8", "Galaxy Z Flip7", "Galaxy Z Flip6", "Galaxy Z Flip5", "Galaxy Z Flip4"] },
  {
    series: "Galaxy A",
    models: ["Galaxy A57 5G", "Galaxy A55 5G", "Galaxy A54 5G", "Galaxy A53 5G", "Galaxy A25 5G", "Galaxy A23 5G"],
  },
];

/** Galaxy の機種別ページを持つ全モデル（シリーズごとに新しい順） */
export const GALAXY_MODELS = GALAXY_CATALOG.flatMap((s) => s.models);

export const isGalaxy = (model: string) => /^Galaxy/.test(model);

const KNOWN = new Set(GALAXY_MODELS);

const GALAXY_RE =
  /Galaxy\s?(?:(S)\s?(\d{2})\s?(Ultra|FE|\+|Plus)?|Z\s?(Fold|Flip)\s?(\d)\s?(Ultra)?|(A)\s?(\d{2})\s?(?:5G)?)(?![0-9A-Za-z])/i;

/**
 * 商品名から Galaxy の機種名を返す。カタログにない機種（2021年以前など）・アクセサリなど読み取れないものは null。
 * スクレイパーの canonical_galaxy_model（scraper/common.py）と同じ規則
 */
export function canonicalGalaxyModel(raw: string): string | null {
  const m = raw.match(GALAXY_RE);
  if (!m) return null;
  let name: string;
  if (m[1]) {
    const variant = ({ "": "", ultra: " Ultra", fe: " FE", "+": "+", plus: "+" } as Record<string, string>)[(m[3] ?? "").toLowerCase()];
    name = `Galaxy S${m[2]}${variant}`;
  } else if (m[4]) {
    name = `Galaxy Z ${m[4][0].toUpperCase()}${m[4].slice(1).toLowerCase()}${m[5]}${m[6] ? " Ultra" : ""}`;
  } else {
    name = `Galaxy A${m[8]} 5G`;
  }
  return KNOWN.has(name) ? name : null;
}
