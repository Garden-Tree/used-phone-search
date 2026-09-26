import SiteHeader from "@/app/components/SiteHeader";

// 検索結果は毎回 DB から取得するため表示まで数秒かかる。クリック直後にこの画面を出して、反応していることを伝える
export default function Loading() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <SiteHeader label="検索中" />
      <main className="max-w-6xl mx-auto px-4 py-6" aria-busy="true">
        <div className="h-9 w-72 max-w-full bg-slate-100 rounded-lg mb-3 animate-pulse" />
        <div className="h-4 w-56 bg-slate-100 rounded mb-8 animate-pulse" />
        <div className="h-16 bg-slate-50 border border-slate-100 rounded-3xl mb-8 animate-pulse" />
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500 mb-6">
          <div className="w-5 h-5 border-[3px] border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          在庫を検索しています...
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-72 rounded-[2rem] border border-slate-100 bg-slate-50 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}
