// iOS 26 対応モデルのカタログ（トップページ・sitemap で共有）
export const IPHONE_CATALOG = [
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
    badges: ["iOS 26対応", "超広角カメラ", "12MPフロントカメラ"]
  },
  {
    series: "iPhone SE Series",
    models: ["iPhone SE (第3世代)", "iPhone SE (第2世代)"],
    gradient: "from-red-500 to-rose-600",
    badges: ["Touch ID（指紋認証）", "ホームボタン"]
  }
];

export const ALL_CATALOG_MODELS = IPHONE_CATALOG.flatMap((s) => s.models);
