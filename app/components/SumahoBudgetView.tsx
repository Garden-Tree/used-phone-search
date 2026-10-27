import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import SimTile from "@/app/components/SimTile";
import { modelPagePath } from "@/lib/catalog";
import { BUDGET_NAMES, SUMAHO_BUDGETS, budgetLabel, budgetPath, budgetsOf, sumahoBudgetPath, type BudgetDevice } from "@/lib/budgets";
import { SUMAHO_MIN_MODELS, getSumahoBudgetModels, type SumahoRow } from "@/lib/budgetStats";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { yen } from "@/lib/format";

/**
 * スマホ全体の予算別ページ（/sumaho/budget/[slug]）。「中古スマホ 2万円以下」のように機種の種類を決めずに探す人向け。
 * iPhone・Pixel・Galaxy・Xperia・AQUOS を発売の新しい順に並べる（集計は lib/budgetStats.ts の getSumahoBudgetModels）
 */

// 同じ予算の種類別ページ（iPad は含めない）
const BRAND_DEVICES: BudgetDevice[] = ["iphone", "pixel", "galaxy"];

export async function sumahoBudgetMetadata(max: number): Promise<Metadata> {
  const rows = await getSumahoBudgetModels(max);
  const label = budgetLabel(max);
  const title = `中古スマホ ${label}以下のおすすめ【iPhone・Android 全機種比較・毎日更新】`;
  const main = rows.filter((r) => r.supported);
  const cheapest = [...(main.length > 0 ? main : rows)].sort((a, b) => a.minPrice - b.minPrice).slice(0, 3);
  // 説明文に出す最安・noindex の判定は、最新 OS・更新が続く機種だけで数える（機種が少ないページは薄いので noindex。ページ自体は残す）
  const description = rows.length > 0
    ? `${label}以下で買える中古スマホは${rows.length}機種・${rows.reduce((n, r) => n + r.count, 0).toLocaleString()}件。${cheapest.map((r) => `${r.model}（${yen(r.minPrice)}〜）`).join("・")}など。iPhone・Pixel・Galaxy・Xperia・AQUOS の最安値を比較。`
    : `${label}以下で買える中古スマホ（iPhone・Pixel・Galaxy・Xperia・AQUOS）を大手中古ショップの在庫から探せます。`;
  const path = sumahoBudgetPath(max);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, images: ["/opengraph-image"] },
    robots: main.length < SUMAHO_MIN_MODELS ? { index: false, follow: true } : undefined,
  };
}

export async function SumahoBudgetView({ max }: { max: number }) {
  const label = budgetLabel(max);
  const rows = await getSumahoBudgetModels(max);
  const main = rows.filter((r) => r.supported);
  const sub = rows.filter((r) => !r.supported).sort((a, b) => a.minPrice - b.minPrice);
  const totalCount = rows.reduce((n, r) => n + r.count, 0);
  const path = sumahoBudgetPath(max);
  // 冒頭の1文（10/27〜 機種ページ・予算別ページと同じ形: 日付・機種数・件数・いちばん新しい機種と最安）。画面と JSON-LD に同じ文
  const today = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const newest = main[0];
  const lead = rows.length > 0
    ? `${today}時点、${label}以下で買える中古スマホは iPhone・Pixel・Galaxy・Xperia・AQUOS から${rows.length}機種・${totalCount.toLocaleString()}件（ジャンク品を除く）。${newest ? `いちばん新しいのは${newest.model}（${yen(newest.minPrice)}〜）。` : ""}`
    : `${today}時点、${label}以下の中古スマホの在庫はありません。`;
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${label}以下で買える中古スマホ`,
    url: `${SITE_URL}${path}`,
    description: lead,
    dateModified: new Date().toISOString(),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: `${label}以下の中古スマホ`, item: `${SITE_URL}${path}` },
    ],
  };

  return (
    <div className="min-h-screen text-ink">
      <SiteHeader label="予算から探す" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />

      <main className="max-w-[1360px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">{label}以下の中古スマホ</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">{label}以下で買える中古スマホ</h1>
        {/* 冒頭の1文（機種ページと同じ形） */}
        <p className="text-ink-sub mb-4 leading-relaxed">
          {lead}
          <Link href="/about#data" className="text-brand-600 hover:text-brand-800 ml-1 whitespace-nowrap">集計の方法</Link>
        </p>
        <AdDisclosure compact />

        {/* 予算の切り替え */}
        <div className="flex flex-wrap gap-2 my-6">
          {SUMAHO_BUDGETS.map((b) => (
            <Link
              key={b}
              href={sumahoBudgetPath(b)}
              className={`px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold border ${
                b === max
                  ? "bg-brand-800 text-white border-brand-800"
                  : "bg-white border-line text-ink-sub hover:border-brand-200 hover:text-brand-800"
              }`}
            >
              {budgetLabel(b)}以下
            </Link>
          ))}
        </div>

        {main.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-1">最新 OS・アップデート保証がある機種（新しい順）</h2>
            <p className="text-xs text-ink-mute mb-4">iOS 27 対応の iPhone・保証が残る Pixel・発売から4年以内の Android。機種名から容量別・状態別の価格まとめへ</p>
            <ModelTable rows={main} />
          </section>
        )}

        {/* 回線のタイル（PR） */}
        {(main.length > 0 || sub.length > 0) && <SimTile className="mb-10 md:max-w-md" />}

        {sub.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-1">サブ機・お試し向け</h2>
            <p className="text-xs text-ink-mute mb-3">最新 OS 非対応・保証終了・発売から4年超の機種（安い順）</p>
            <ModelTable rows={sub} />
          </section>
        )}

        {/* 種類別の同じ予算のページ */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-3">種類を決めて見る</h2>
          <div className="flex flex-wrap gap-2">
            {BRAND_DEVICES.filter((d) => budgetsOf(d).includes(max)).map((d) => (
              <Link key={d} href={budgetPath(max, d)}
                className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                {label}以下の{BUDGET_NAMES[d]}
              </Link>
            ))}
          </div>
        </section>

        <div className="text-center mb-4">
          <Link
            href={`/search?${new URLSearchParams({ maxPrice: String(max) }).toString()}`}
            rel="nofollow"
            className="inline-flex items-center px-8 h-12 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-800"
          >
            {label}以下の在庫をすべて見る &rarr;
          </Link>
          <p className="text-xs text-ink-mute mt-3">容量・状態ランク・バッテリー残量で絞り込めます</p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function ModelTable({ rows }: { rows: SumahoRow[] }) {
  return (
    <div className="bg-white rounded-xl border border-line overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-3 bg-ground text-xs font-bold text-ink-mute">
        <span>機種</span>
        <span className="text-right">最安値</span>
        <span className="text-right w-16">在庫</span>
      </div>
      {rows.map((r) => (
        <Link
          key={r.model}
          href={modelPagePath(r.model)}
          className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-3 border-t border-line-soft hover:bg-ground items-center"
        >
          <span className="min-w-0">
            <span className="block font-bold text-ink">
              <span className="inline-block mr-2 px-1.5 rounded bg-ground border border-line text-[11px] font-normal text-ink-sub align-middle">{r.brand}</span>
              {r.model} <span className="text-gray-300">›</span>
            </span>
            {r.sub && <span className="block text-[11px] text-ink-mute">{r.sub}</span>}
          </span>
          <span className="text-right font-bold text-price">{yen(r.minPrice)}</span>
          <span className="text-right w-16 text-sm text-ink-mute">{r.count.toLocaleString()}件</span>
        </Link>
      ))}
    </div>
  );
}
