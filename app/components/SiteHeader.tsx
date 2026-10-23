import Link from "next/link";
import { Search } from "lucide-react";

/**
 * ロゴ（案1・10/23〜。決まりは docs/design.md）。紺の帯なので反転版:
 * 白の角丸（一辺の 21.5%）に紺の「中」（一辺の 78%・上に 4.3% ずらす）＋白「中古スマホ」＋#A5B4FC「一括検索」
 */
const MARK = 30;

/** label は旧デザインの右上の補足。今は使わない（呼び出し側の互換のため受け取るだけ） */
export default function SiteHeader({ label }: { label?: string }) {
  void label;
  return (
    <header className="bg-brand-900 sticky top-0 z-20">
      <div className="max-w-[1360px] mx-auto h-[52px] pl-4 pr-1 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white min-w-0">
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center justify-center bg-white text-brand-900 font-bold"
            style={{ width: MARK, height: MARK, borderRadius: MARK * 0.215 }}
          >
            <span className="relative leading-none" style={{ top: -MARK * 0.043, fontSize: MARK * 0.78 }}>中</span>
          </span>
          <span className="flex flex-col min-w-0">
            <span className="text-base font-bold leading-tight tracking-tight whitespace-nowrap">
              中古スマホ<span className="text-[#A5B4FC]">一括検索</span>
            </span>
            <span className="text-[10px] text-brand-200 tracking-[0.08em] leading-tight">by ガデログ</span>
          </span>
        </Link>
        <Link href="/search" aria-label="在庫を検索" className="w-11 h-11 flex items-center justify-center text-white hover:text-brand-200">
          <Search className="w-[22px] h-[22px]" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
