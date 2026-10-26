import Link from "next/link";
import { SIM_PLANS, SIM_PRICES_CHECKED } from "@/lib/simPlans";

// 回線のタイル「回線も見直す [PR]」（10/26〜 機種ページから切り出し。スマホの文脈だけに出す。iPad・Mac・Watch には出さない）。
// 各社の色のボタン（lib/simPlans.ts の style。ロゴは描かない）。ボタンの中に各社とも「月○円〜」（公平に同じ形で）。ポイント・値引きは書かない（アフィリエイトの決まり）
// GA4: data-shop-click の shop_name は「<name>（回線）」。model は data-model（機種が決まらないページでは付けない）
export default function SimTile({ model, className = "" }: { model?: string; className?: string }) {
  return (
    <div className={`bg-white border border-line rounded-xl p-3 flex flex-col gap-2 ${className}`.trim()}>
      <span className="flex items-center gap-1.5 text-[10px] text-ink-mute">
        回線も見直す <span className="text-[10px] font-normal text-ink-mute border border-line rounded px-1 py-px leading-none">PR</span>
      </span>
      <div className="grid grid-cols-2 gap-2">
        {SIM_PLANS.map((p) => (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="sponsored nofollow noopener"
            data-shop-click=""
            data-shop={`${p.name}（回線）`}
            data-model={model}
            data-link-type={p.linkType}
            style={p.style}
            className="h-14 rounded-lg flex flex-col items-center justify-center gap-0.5 text-center leading-none hover:opacity-90"
          >
            <span className="text-[15px] font-bold">{p.name}</span>
            <span className="text-[11px]">月{p.monthlyFrom.toLocaleString("ja-JP")}円〜</span>
          </a>
        ))}
      </div>
      <Link href="/sim" className="self-start text-[12px] text-brand-600 underline underline-offset-2 hover:text-brand-800">2年でいくら？</Link>
      <span className="text-[10px] text-ink-mute leading-snug">月額は税込・割引なし（{Number(SIM_PRICES_CHECKED.slice(5, 7))}/{Number(SIM_PRICES_CHECKED.slice(8, 10))} 各社の公式ページ）</span>
    </div>
  );
}
