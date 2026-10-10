import Link from "next/link";
import { Search } from "lucide-react";

/** label は旧デザインの右上の補足。今は使わない（呼び出し側の互換のため受け取るだけ） */
export default function SiteHeader({ label }: { label?: string }) {
  void label;
  return (
    <header className="bg-brand-900 sticky top-0 z-20">
      <div className="max-w-[1120px] mx-auto h-[52px] pl-4 pr-1 flex items-center justify-between">
        <Link href="/" className="flex flex-col text-white">
          <span className="text-base font-bold tracking-wide leading-tight">中古スマホ一括検索</span>
          <span className="text-[10px] text-brand-200 tracking-[0.08em] leading-tight">by ガデログ</span>
        </Link>
        <Link href="/search" aria-label="在庫を検索" className="w-11 h-11 flex items-center justify-center text-white hover:text-brand-200">
          <Search className="w-[22px] h-[22px]" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
