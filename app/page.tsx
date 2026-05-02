import Link from "next/link";

const IPHONE_CATALOG = [
  {
    series: "iPhone 17 Series",
    description: "Apple Intelligence搭載の次世代モデル。",
    models: ["iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max", "iPhone 17e", "iPhone Air"],
    gradient: "from-fuchsia-500 to-pink-500",
  },
  {
    series: "iPhone 16 Series",
    description: "進化したAIとカメラコントロール。",
    models: ["iPhone 16", "iPhone 16e", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max"],
    gradient: "from-purple-500 to-indigo-500",
  },
  {
    series: "iPhone 15 Series",
    description: "全モデルにDynamic IslandとUSB-Cを搭載。",
    models: ["iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max"],
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    series: "iPhone 14 Series",
    description: "パワフルな性能と優れたコストパフォーマンス。",
    models: ["iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max"],
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    series: "iPhone 13 Series",
    description: "驚異的なバッテリー駆動時間とシネマティックモード。",
    models: ["iPhone 13", "iPhone 13 mini", "iPhone 13 Pro", "iPhone 13 Pro Max"],
    gradient: "from-rose-500 to-pink-500",
  },
  {
    series: "iPhone 12 Series",
    description: "5G対応とMagSafeの導入。",
    models: ["iPhone 12", "iPhone 12 mini", "iPhone 12 Pro", "iPhone 12 Pro Max"],
    gradient: "from-amber-500 to-orange-500",
  },
  {
    series: "iPhone 11 Series",
    description: "超広角カメラ搭載でお手頃な価格。",
    models: ["iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max"],
    gradient: "from-slate-500 to-gray-500",
  },
  {
    series: "iPhone SE Series",
    description: "クラシックなデザインに最新のチップを搭載。",
    models: ["iPhone SE (第3世代)", "iPhone SE (第2世代)"],
    gradient: "from-red-500 to-rose-600",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 font-sans selection:bg-blue-200 dark:selection:bg-blue-900">
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 text-sm font-medium mb-6 ring-1 ring-inset ring-blue-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            リアルタイム在庫横断検索
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            あなたにぴったりの <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              中古iPhoneを見つけよう
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            日本全国の大手中古スマホショップの価格、状態ランク、容量を一括比較。欲しいモデルの最安値を一瞬で見つけ出します。
          </p>
        </div>
      </section>

      {/* Shop Selection Section */}
      <section className="max-w-6xl mx-auto px-4 mb-16 relative z-10">
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100 dark:border-zinc-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">ショップから探す</h2>
              <p className="text-slate-500 dark:text-zinc-400">お気に入りのショップから在庫をチェック</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { name: "イオシス", id: "イオシス", color: "from-orange-500 to-red-500" },
                { name: "ゲオモバイル", id: "ゲオモバイル", color: "from-blue-600 to-indigo-600" },
                { name: "にこスマ", id: "にこスマ", color: "from-emerald-500 to-teal-500" },
              ].map((shop) => (
                <Link
                  key={shop.id}
                  href={`/search?shop=${encodeURIComponent(shop.id)}`}
                  className="group relative px-8 py-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 transition-all duration-300 border border-slate-200 dark:border-zinc-800 hover:border-transparent hover:shadow-2xl overflow-hidden"
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${shop.color}`}></div>
                  <span className="relative z-10 font-bold text-lg text-slate-700 dark:text-zinc-300 group-hover:text-white transition-colors">
                    {shop.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Grid */}
      <main className="max-w-6xl mx-auto px-4 pb-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {IPHONE_CATALOG.map((seriesGroup) => (
            <div 
              key={seriesGroup.series} 
              className="group bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-zinc-800 flex flex-col"
            >
              {/* Card Header with Gradient */}
              <div className={`h-24 bg-gradient-to-r ${seriesGroup.gradient} p-6 flex flex-col justify-end relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                  <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 18C16 19.1046 15.1046 20 14 20H10C8.89543 20 8 19.1046 8 18V6C8 4.89543 8.89543 4 10 4H14C15.1046 4 16 4.89543 16 6V18Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white relative z-10 drop-shadow-md">
                  {seriesGroup.series}
                </h2>
              </div>
              
              {/* Card Body */}
              <div className="p-6 flex flex-col flex-grow">
                <p className="text-slate-500 dark:text-zinc-400 text-sm mb-6 flex-grow">
                  {seriesGroup.description}
                </p>
                <div className="space-y-3">
                  {seriesGroup.models.map((model) => (
                    <Link 
                      key={model} 
                      href={`/search?model=${encodeURIComponent(model)}`}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 dark:bg-zinc-950/50 dark:hover:bg-blue-900/20 transition-colors group/link border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                    >
                      <span className="font-semibold text-slate-700 dark:text-zinc-300 group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 transition-colors">
                        {model}
                      </span>
                      <span className="text-slate-400 group-hover/link:text-blue-500 transition-colors group-hover/link:translate-x-1 transform duration-200">
                        &rarr;
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      
    </div>
  );
}
