import { SIM_PLANS, SIM_PRICES_CHECKED, repTier, type SimPlan } from "@/lib/simPlans";

// 回線のタイル「回線も見直す [PR]」（10/26〜 機種ページから切り出し。スマホの文脈だけに出す。iPad・Mac・Watch には出さない）。
// 各社の色のボタン（lib/simPlans.ts の style。ロゴは描かない）。出すのは href のある社だけ（lib/simPlans.ts の SIM_PLANS）。
// ポイント・値引きは書かない・「最安」と書かない（アフィリエイトの決まり。ideas/2026-10-26.md）
// 機種ページ（median あり・10/26〜）: ボタンの中を「2年 約○万円」に（最大3社）。2年の目安＝中古の相場＋代表の段（20GB 前後・repTier）の月額×24
// それ以外のページ: 今までどおりボタンの中に「月○円〜」
// GA4: data-shop-click の shop_name は「<name>（回線）」。model は data-model（機種が決まらないページでは付けない）

const MAX_ROWS = 3;

function md(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

function SimButton({ p, model, className, children }: { p: SimPlan; model?: string; className: string; children: React.ReactNode }) {
  return (
    <a
      href={p.href}
      target="_blank"
      rel="sponsored nofollow noopener"
      data-shop-click=""
      data-shop={`${p.name}（回線）`}
      data-model={model}
      data-link-type={p.linkType}
      style={p.style}
      className={`rounded-lg flex flex-col items-center justify-center gap-0.5 text-center leading-none hover:opacity-90 ${className}`}
    >
      {children}
    </a>
  );
}

const PR = <span className="text-[10px] font-normal text-ink-mute border border-line rounded px-1 py-px leading-none">PR</span>;

export default function SimTile({ model, median, medianLabel = "相場", className = "" }: {
  model?: string;
  /** 相場の見出し（例「相場（128GB）」。lib/format.ts の medianLabel） */
  medianLabel?: string;
  /** この機種の中古の相場（円）。あれば2年の目安の行にする（機種ページ） */
  median?: number | null;
  className?: string;
}) {
  const box = `bg-white border border-line rounded-xl p-3 flex flex-col gap-2 ${className}`.trim();
  if (median && median > 0 && SIM_PLANS.length > 0) {
    const rows = SIM_PLANS.slice(0, MAX_ROWS).map((p) => {
      const t = repTier(p);
      return { p, total: median + t.monthly * 24 };
    });
    // 文字は少なく（ユーザー 10/26「文字多い」）: 形は「月○円〜」のボタンと同じで、中の数字を2年の目安にする
    return (
      <div className={box}>
        <span className="flex items-center gap-1.5 text-[10px] text-ink-mute">回線も見直す {PR}</span>
        <div className="grid grid-cols-2 gap-2">
          {rows.map(({ p, total }) => (
            <SimButton key={p.name} p={p} model={model} className="h-14">
              <span className="text-[15px] font-bold">{p.name}</span>
              <span className="text-[11px] tabular-nums">2年 約{(Math.round(total / 1000) / 10).toLocaleString("ja-JP")}万円</span>
            </SimButton>
          ))}
        </div>
        <span className="text-[10px] text-ink-mute leading-snug">中古の{medianLabel}＋20GB前後の月額×24（税込・{md(SIM_PRICES_CHECKED)} 各社公式）</span>
      </div>
    );
  }
  return (
    <div className={box}>
      <span className="flex items-center gap-1.5 text-[10px] text-ink-mute">回線も見直す {PR}</span>
      <div className="grid grid-cols-2 gap-2">
        {SIM_PLANS.map((p) => (
          <SimButton key={p.name} p={p} model={model} className="h-14">
            <span className="text-[15px] font-bold">{p.name}</span>
            <span className="text-[11px]">月{p.monthlyFrom.toLocaleString("ja-JP")}円〜</span>
          </SimButton>
        ))}
      </div>
      <span className="text-[10px] text-ink-mute leading-snug">月額は税込・割引なし（{md(SIM_PRICES_CHECKED)} 各社の公式ページ）</span>
    </div>
  );
}
