import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { modelPagePath } from "@/lib/catalog";
import { SIM_PLANS, SIM_PRICES_CHECKED, repTier } from "@/lib/simPlans";
import { SIM_HEADLINE_MODEL, SIM_TOTAL_MONTHS, SIM_TOTAL_STORAGE, getSimTotalRows, manYen } from "@/lib/simTotals";
import { shortDate } from "@/lib/marketStats";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古スマホ＋格安SIM、2年でいくら？（2026-10-27〜）: 人気の中古スマホ（128GB の中央値）＋各社の代表の段の月額×24 を表で。
 * 回線は lib/simPlans.ts の SIM_PLANS（href がある社だけ。提携したら列が増える）。代表の段は repTier()。
 * 楽天モバイルの決まり（ideas/2026-10-26.md）: ポイント・キャンペーン・値引きは書かない、「最安」「実質0円」「お得」は使わない、PR を表示。文字は少なく
 */
const PATH = "/sim";
const TITLE = "中古スマホ＋格安SIM、2年でいくら？中古iPhone・Pixelと回線の総額【毎日更新】";
const DESCRIPTION = `中古iPhone・Pixel の相場（${SIM_TOTAL_STORAGE}GB・ジャンクを除く中央値）に、${SIM_PLANS.map((p) => p.name).join("・")}の月額（税込・割引なし）×${SIM_TOTAL_MONTHS}か月を足した2年の総額を表で比べます。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: PATH, images: ["/iphone/opengraph-image"] },
};

const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";

export default async function SimPage() {
  const rows = await getSimTotalRows();
  const plans = SIM_PLANS.map((p) => ({ plan: p, tier: repTier(p) }));
  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" });
  const total = (median: number, monthly: number) => median + monthly * SIM_TOTAL_MONTHS;

  // 冒頭の1行: 動画と同じ機種で、2年の総額が低い方の回線
  const head = rows.find((r) => r.model === SIM_HEADLINE_MODEL) ?? rows[0];
  const headPlan = head && plans.length ? [...plans].sort((a, b) => a.tier.monthly - b.tier.monthly)[0] : null;
  const headText = head && headPlan ? `中古の${head.model}＋${headPlan.plan.name}${headPlan.tier.label}で2年` : null;
  const headAmount = head && headPlan ? manYen(total(head.median, headPlan.tier.monthly)) : null;
  const headline = headText && headAmount ? `${headText} ${headAmount}` : null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "2年でいくら？", item: `${SITE_URL}${PATH}` },
      ],
    },
    { "@context": "https://schema.org", "@type": "WebPage", name: TITLE, url: `${SITE_URL}${PATH}`, description: headline ?? DESCRIPTION, dateModified: new Date().toISOString() },
  ];

  // 3社になってもスマホで横にはみ出さないよう、列が多いときは文字を小さく
  const many = plans.length >= 3;

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="2年でいくら？" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">2年でいくら？</span>
        </nav>
        <h1 className="text-2xl md:text-3xl font-bold">中古スマホ＋格安SIM、2年でいくら？</h1>
        {headText && <p className="text-base font-bold leading-snug">{headText} <span className="whitespace-nowrap">{headAmount}</span></p>}

        {rows.length > 0 && plans.length > 0 && (
          <div className="bg-white rounded-xl border border-line p-2 md:p-3 flex flex-col gap-2">
            <span className="self-end text-[10px] text-ink-mute border border-line rounded px-1 py-px leading-none">PR</span>
            <table className={`w-full table-fixed tabular-nums ${many ? "text-[12px]" : "text-[14px]"} md:text-[15px]`}>
              <thead>
                <tr>
                  <th scope="col" className={`${many ? "w-[30%]" : "w-[34%]"} text-left align-bottom text-[11px] font-normal text-ink-mute px-1 pb-2`}>2年の総額{many && <span className="block text-[10px]">（約）</span>}</th>
                  {plans.map(({ plan: p, tier }) => (
                    <th key={p.name} scope="col" className="px-1 pb-2 align-bottom font-normal">
                      <a
                        href={p.href}
                        target="_blank"
                        rel="sponsored nofollow noopener"
                        data-shop-click=""
                        data-shop={`${p.name}（回線）`}
                        data-link-type={p.linkType}
                        style={p.style}
                        className={`h-10 rounded-lg flex items-center justify-center text-center leading-none font-bold hover:opacity-90 ${many ? "text-[11px]" : "text-[13px]"} md:text-[14px]`}
                      >
                        {p.name}
                      </a>
                      <span className={`block mt-1 text-ink-mute leading-tight ${many ? "text-[10px]" : "text-[11px]"}`}>
                        {tier.label} 月{tier.monthly.toLocaleString("ja-JP")}円
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.model} className="border-t border-line-soft">
                    <th scope="row" className="text-left font-normal px-1 py-2.5 align-middle">
                      <Link href={modelPagePath(r.model)} className={`${LINK} font-bold leading-tight`}>{r.model.replace("iPhone ", "iPhone ")}</Link>
                      <span className="block text-[11px] text-ink-mute mt-0.5">中古 {manYen(r.median)}</span>
                    </th>
                    {plans.map(({ plan: p, tier }) => (
                      <td key={p.name} className="px-0.5 py-2.5 text-center font-bold text-price whitespace-nowrap">
                        {/* 4社以上はスマホの幅で数字がつながるので「約」を外し、万円を小さく（10/28） */}
                        {many
                          ? <>{(Math.round(total(r.median, tier.monthly) / 1000) / 10).toFixed(1)}<span className="text-[10px] font-normal">万円</span></>
                          : manYen(total(r.median, tier.monthly))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-ink-mute leading-relaxed">
          中古{SIM_TOTAL_STORAGE}GBの相場（{today}）＋月額×{SIM_TOTAL_MONTHS}。税込・手数料別（
          {SIM_PLANS.map((p, i) => (
            <span key={p.name}>
              {i > 0 && "・"}
              <a href={p.priceSource} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{p.name}</a>
            </span>
          ))}
          公式 {shortDate(SIM_PRICES_CHECKED)}）
        </p>

        {/* A8 のインプレッション計測用の 1x1 画像 */}
        <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
          {SIM_PLANS.flatMap((p) =>
            // eslint-disable-next-line @next/next/no-img-element
            p.imgSrc ? [<img key={p.name} src={p.imgSrc} width={1} height={1} alt="" />] : [],
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
