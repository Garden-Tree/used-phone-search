import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function SiteHeader({ label }: { label?: string }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="group flex items-center mr-1 text-slate-400 hover:text-blue-600 transition-all hover:-translate-x-1" aria-label="トップページへ戻る">
            <ChevronLeft className="w-8 h-8 -ml-2" />
          </Link>
          <div className="flex flex-col">
            <Link href="/" className="text-xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">
              中古スマホ一括検索
            </Link>
            <a href="https://gadelog.com" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors tracking-tighter uppercase leading-none">
              powered by gadelog.com
            </a>
          </div>
        </div>
        {label && <div className="text-sm font-medium text-slate-500">{label}</div>}
      </div>
    </header>
  );
}
