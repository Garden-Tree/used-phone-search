import Link from "next/link";
import { Smartphone, BatteryCharging, Camera, Sparkles, Zap, Fingerprint, ShieldCheck } from "lucide-react";

// Catalog data with badges
const IPHONE_CATALOG = [
  {
    series: "iPhone 17 Series",
    description: "Apple Intelligence搭載の次世代モデル",
    models: ["iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max", "iPhone 17e", "iPhone Air"],
    gradient: "from-fuchsia-500 to-pink-500",
    badges: ["Apple Intelligence", "Type-C", "次世代"]
  },
  {
    series: "iPhone 16 Series",
    description: "進化したAIとカメラコントロール",
    models: ["iPhone 16", "iPhone 16e", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max"],
    gradient: "from-purple-500 to-indigo-500",
    badges: ["Apple Intelligence", "Type-C", "カメラコントロール"]
  },
  {
    series: "iPhone 15 Series",
    description: "全モデルにDynamic IslandとUSB-Cを搭載",
    models: ["iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max"],
    gradient: "from-blue-500 to-cyan-500",
    badges: ["Type-C", "Dynamic Island"]
  },
  {
    series: "iPhone 14 Series",
    description: "パワフルな性能と優れたコストパフォーマンス",
    models: ["iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max"],
    gradient: "from-emerald-500 to-teal-500",
    badges: ["マスクFace ID", "安定感抜群"]
  },
  {
    series: "iPhone 13 Series",
    description: "驚異的なバッテリー駆動時間とシネマティックモード",
    models: ["iPhone 13", "iPhone 13 mini", "iPhone 13 Pro", "iPhone 13 Pro Max"],
    gradient: "from-rose-500 to-pink-500",
    badges: ["マスクFace ID", "シネマティックモード"]
  },
  {
    series: "iPhone 12 Series",
    description: "5G対応とMagSafeの導入",
    models: ["iPhone 12", "iPhone 12 mini", "iPhone 12 Pro", "iPhone 12 Pro Max"],
    gradient: "from-amber-500 to-orange-500",
    badges: ["5G対応", "コスパ◎", "MagSafe"]
  },
  {
    series: "iPhone 11 Series",
    description: "超広角カメラ搭載でお手頃な価格",
    models: ["iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max"],
    gradient: "from-slate-500 to-gray-500",
    badges: ["最新iOS 18対応", "超広角カメラ"]
  },
  {
    series: "iPhone SE Series",
    description: "クラシックなデザインに最新のチップを搭載",
    models: ["iPhone SE (第3世代)", "iPhone SE (第2世代)"],
    gradient: "from-red-500 to-rose-600",
    badges: ["指紋認証", "ホームボタン"]
  },
  {
    series: "iPhone X Series",
    description: "ベゼルレスデザインへの大きな進化",
    models: ["iPhone X", "iPhone XR", "iPhone XS", "iPhone XS Max"],
    gradient: "from-zinc-500 to-slate-600",
    badges: ["Face ID", "有機EL"]
  },
  {
    series: "iPhone 8 Series",
    description: "ワイヤレス充電に対応した完成形",
    models: ["iPhone 8", "iPhone 8 Plus"],
    gradient: "from-stone-400 to-gray-500",
    badges: ["指紋認証", "ワイヤレス充電"]
  },
  {
    series: "iPhone 7 Series",
    description: "初めての耐水性能とApple Pay対応",
    models: ["iPhone 7", "iPhone 7 Plus"],
    gradient: "from-neutral-400 to-zinc-500",
    badges: ["指紋認証", "耐水性能"]
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 font-sans selection:bg-blue-200 dark:selection:bg-blue-900 pb-20">
      
      {/* 1. Hero Section */}
      <section className="relative pt-20 pb-12 md:pt-32 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 text-sm font-medium mb-6 ring-1 ring-inset ring-blue-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            リアルタイム在庫横断検索
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            あなたにぴったりの <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              中古iPhoneを見つけよう
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            日本全国の大手中古スマホショップの価格、状態ランク、容量を一括比較。<br className="hidden md:block" />
            欲しいモデルの最安値を一瞬で見つけ出します。
          </p>
        </div>
      </section>

      {/* 2. Shortcuts Section */}
      <section className="max-w-6xl mx-auto px-4 mb-16 relative z-10">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            目的・予算から探す
          </h2>
          
          {/* Scrollable on mobile, grid on desktop */}
          <div className="flex overflow-x-auto pb-6 -mx-4 px-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:mx-0 md:px-0 gap-4 md:gap-6 snap-x hide-scrollbar">
            
            {/* Shortcut 1 */}
            <Link href="/search?model=iPhone%2013,iPhone%2014" className="snap-start min-w-[280px] md:min-w-0 group flex-1 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
                <BatteryCharging className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="bg-white/20 inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 backdrop-blur-sm border border-white/10">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-tight">迷ったらこれ！<br/>長く使えるコスパ最強</h3>
                <p className="text-blue-100 text-xs md:text-sm mb-6 font-medium">対象: iPhone 13, 14</p>
                <div className="inline-flex items-center text-sm font-bold bg-white text-blue-600 px-4 py-2 rounded-full group-hover:bg-blue-50 transition-colors shadow-sm">
                  探す <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            </Link>

            {/* Shortcut 2 */}
            <Link href="/search?model=iPhone%2011,iPhone%2012,iPhone%20SE%20(第2世代),iPhone%20SE%20(第3世代)" className="snap-start min-w-[280px] md:min-w-0 group flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
                <Zap className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="bg-white/20 inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 backdrop-blur-sm border border-white/10">
                  <Fingerprint className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-tight">予算重視！<br/>とにかく安く使える</h3>
                <p className="text-emerald-100 text-xs md:text-sm mb-6 font-medium">対象: iPhone 11, 12, SE (第2/第3世代)</p>
                <div className="inline-flex items-center text-sm font-bold bg-white text-emerald-600 px-4 py-2 rounded-full group-hover:bg-emerald-50 transition-colors shadow-sm">
                  探す <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            </Link>

            {/* Shortcut 3 */}
            <Link href="/search?model=iPhone%207,iPhone%208,iPhone%20X" className="snap-start min-w-[280px] md:min-w-0 group flex-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-[2rem] p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
                <Camera className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="bg-white/20 inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 backdrop-blur-sm border border-white/10">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-tight">オールドコンデジ代わりに📸<br/>エモい写真</h3>
                <p className="text-amber-100 text-xs md:text-sm mb-6 font-medium">対象: iPhone 7, 8, X</p>
                <div className="inline-flex items-center text-sm font-bold bg-white text-amber-600 px-4 py-2 rounded-full group-hover:bg-amber-50 transition-colors shadow-sm">
                  探す <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
                </div>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* 3. Catalog Grid Section */}
      <main className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-slate-500" />
            シリーズから探す
          </h2>
        </div>
        
        {/* Changed to a denser grid: 1-2 cols on mobile, 3-4 cols on PC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {IPHONE_CATALOG.map((seriesGroup) => (
            <div 
              key={seriesGroup.series} 
              className="group bg-white dark:bg-zinc-900 rounded-2xl md:rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200/80 dark:border-zinc-800 flex flex-col h-full"
            >
              {/* Card Header */}
              <div className="p-5 md:p-6 relative overflow-hidden bg-slate-50/50 dark:bg-zinc-950/50 border-b border-slate-100 dark:border-zinc-800">
                <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${seriesGroup.gradient}`}></div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-zinc-100 relative z-10 mb-2">
                  {seriesGroup.series}
                </h3>
                <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400 relative z-10 line-clamp-2 min-h-[2.5rem]">
                  {seriesGroup.description}
                </p>
                
                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mt-4 relative z-10">
                  {seriesGroup.badges.map((badge) => (
                    <span key={badge} className="inline-flex items-center px-2 py-1 rounded-md text-[10px] md:text-xs font-semibold bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 shadow-sm">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Models List */}
              <div className="p-4 flex-grow bg-white dark:bg-zinc-900">
                <div className="flex flex-col gap-2">
                  {seriesGroup.models.map((model) => (
                    <Link 
                      key={model} 
                      href={`/search?model=${encodeURIComponent(model)}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group/link border border-transparent hover:border-slate-100 dark:hover:border-zinc-800"
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 transition-colors">
                        {model}
                      </span>
                      <span className="text-slate-300 group-hover/link:text-blue-500 transition-colors group-hover/link:translate-x-1 transform duration-200">
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
      
      {/* Hide scrollbar styles for the horizontal scroll section */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
