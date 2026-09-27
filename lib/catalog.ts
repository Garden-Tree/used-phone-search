import { IPAD_CATALOG, IPAD_MODELS } from "@/lib/ipadCatalog";

// iOS 27（2026年9月配信）対応モデルのカタログ（トップページ・sitemap で共有）。
// iOS 27 は iOS 26 と同じく iPhone 11 以降・SE 第2/第3世代が対象。
// iPhone 18 / 18e（2027年春予定）と折りたたみの iPhone Duo（2026/10/23 発売）は中古在庫が出てから追加する
export const IPHONE_CATALOG = [
  {
    series: "iPhone 18 Series",
    models: ["iPhone 18 Pro", "iPhone 18 Pro Max"],
    gradient: "from-orange-500 to-red-500",
    badges: ["A20 Pro（2nm）", "可変絞りカメラ", "Apple Intelligence"]
  },
  {
    series: "iPhone 17 Series",
    models: ["iPhone 17", "iPhone 17e", "iPhone Air", "iPhone 17 Pro", "iPhone 17 Pro Max"],
    gradient: "from-fuchsia-500 to-pink-500",
    badges: ["ProMotion（120Hz）", "eSIMのみ", "センターフレームフロントカメラ"]
  },
  {
    series: "iPhone 16 Series",
    models: ["iPhone 16", "iPhone 16e", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max"],
    gradient: "from-purple-500 to-indigo-500",
    badges: ["Apple Intelligence", "アクションボタン", "カメラコントロール"]
  },
  {
    series: "iPhone 15 Series",
    models: ["iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max"],
    gradient: "from-blue-500 to-cyan-500",
    badges: ["Type-C", "Dynamic Island"]
  },
  {
    series: "iPhone 14 Series",
    models: ["iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max"],
    gradient: "from-emerald-500 to-teal-500",
    badges: ["衝突事故検知", "衛星通信", "アクションモード"]
  },
  {
    series: "iPhone 13 Series",
    models: ["iPhone 13", "iPhone 13 mini", "iPhone 13 Pro", "iPhone 13 Pro Max"],
    gradient: "from-rose-500 to-pink-500",
    badges: ["ノッチ小型化", "センサーシフト光学式手ぶれ補正", "シネマティックモード"]
  },
  {
    series: "iPhone 12 Series",
    models: ["iPhone 12", "iPhone 12 mini", "iPhone 12 Pro", "iPhone 12 Pro Max"],
    gradient: "from-amber-500 to-orange-500",
    badges: ["フラットデザイン", "5G対応", "MagSafe"]
  },
  {
    series: "iPhone 11 Series",
    models: ["iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max"],
    gradient: "from-slate-500 to-gray-500",
    badges: ["iOS 27対応", "超広角カメラ", "12MPフロントカメラ"]
  },
  {
    series: "iPhone SE Series",
    models: ["iPhone SE (第3世代)", "iPhone SE (第2世代)"],
    gradient: "from-red-500 to-rose-600",
    badges: ["Touch ID（指紋認証）", "ホームボタン"]
  }
];

// iOS 26 / 27 非対応だが中古在庫が多い旧モデル（モデル別ページのみ用意）
export const LEGACY_SERIES = [
  { series: "iPhone X / XS / XR", models: ["iPhone XS", "iPhone XS Max", "iPhone XR", "iPhone X"] },
  { series: "iPhone 8 / 7", models: ["iPhone 8", "iPhone 8 Plus", "iPhone 7", "iPhone 7 Plus"] },
];

export const ALL_CATALOG_MODELS = IPHONE_CATALOG.flatMap((s) => s.models);

/** モデル別ページを持つ全 iPhone（新しい順） */
export const ALL_PAGE_MODELS = [...ALL_CATALOG_MODELS, ...LEGACY_SERIES.flatMap((s) => s.models)];

/** モデル別ページを持つ全機種（iPhone ＋ iPad）。価格推移の記録・sitemap・slug の解決に使う */
export const ALL_DEVICE_PAGE_MODELS = [...ALL_PAGE_MODELS, ...IPAD_MODELS];

const ORDINAL: Record<string, string> = { "1": "1st", "2": "2nd", "3": "3rd" };

/** "iPhone 15 Pro Max" → "iphone-15-pro-max"、"iPhone SE (第3世代)" → "iphone-se-3rd-gen" */
export function modelToSlug(model: string): string {
  return model
    .toLowerCase()
    .replace(/\(第(\d)世代\)/, (_, n: string) => `${ORDINAL[n] ?? `${n}th`}-gen`)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function slugToModel(slug: string): string | undefined {
  return ALL_DEVICE_PAGE_MODELS.find((m) => modelToSlug(m) === slug);
}

export const isIpad = (model: string) => /^iPad/.test(model);

export function modelPagePath(model: string): string {
  return `/${isIpad(model) ? "ipad" : "iphone"}/${modelToSlug(model)}`;
}

/** 同じシリーズの他モデル */
export function siblingModels(model: string): string[] {
  const group = [...IPHONE_CATALOG, ...LEGACY_SERIES, ...IPAD_CATALOG].find((s) => s.models.includes(model));
  return group ? group.models.filter((m) => m !== model) : [];
}

export function seriesOf(model: string) {
  return IPHONE_CATALOG.find((s) => s.models.includes(model));
}
