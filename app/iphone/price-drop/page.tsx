import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import { activeShops } from "@/lib/activeShops";
import { DROP_MIN_COUNT, getPriceDrop, type DropGroup } from "@/lib/priceDrop";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古iPhoneは1か月でいくら下がる？（2026-10-28〜）: 直近30日の相場の変化を、発売からの年数ごとに。
 * 「中古iPhone 値下がり 何%」「いつ買う」などの検索と、AI の概要の関連する問いに答える常設ページ。数字は lib/priceDrop.ts
 */
const TITLE = "中古iPhoneは1か月でいくら下がる？発売からの年数別の値下がり率【毎日更新】";
const PATH = "/iphone/price-drop";

export async function generateMetadata(): Promise<Metadata> {
  const description = `中古iPhoneの相場が直近30日で何%下がったかを、発売からの年数別に集計。大手中古ショップ${(await activeShops()).length}社の在庫の中央値から、新しい機種と古い機種のどちらが値下がりしやすいかが分かります。`;
  return { title: TITLE, description, alternates: { canonical: PATH }, openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: PATH } };
}

const CARD = "bg-white rounded-xl border border-line overflow-x-auto";
const TH = "font-semibold px-2 py-2 text-right";
const TD = "px-2 py-2.5 text-right whitespace-nowrap";
const pctText = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(1)}%`;
const yenDiff = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toLocaleString()}円`;
const tone = (n: number) => (n < 0 ? "text-safe" : n > 0 ? "text-price" : "text-ink-mute");
const slash = (d: string) => d.replace(/-/g, "/");

export default async function PriceDropPage() {
  const shopNum = (await activeShops()).length;
  const d = await getPriceDrop();
  const period = d.startDate && d.endDate ? `${slash(d.startDate)}〜${slash(d.endDate)}` : null;

  // いちばん下がった年数の組と、いちばん下がらなかった組（2組以上あるときだけ言う）
  const sorted = [...d.groups].sort((a, b) => a.avgPct - b.avgPct);
  const most: DropGroup | undefined = sorted.length >= 2 ? sorted[0] : undefined;
  const least: DropGroup | undefined = sorted.length >= 2 ? sorted[sorted.length - 1] : undefined;
  const summary = period && d.rows.length
    ? `${period}の${d.days}日間で、中古iPhoneの相場は平均${pctText(d.avgPct)}（${yenDiff(d.avgDiff)}）動きました${most && least ? `。いちばん下がったのは${most.label}の機種（平均${pctText(most.avgPct)}）、いちばん動かなかったのは${least.label}の機種（平均${pctText(least.avgPct)}）です` : ""}（大手中古ショップ${shopNum}社の在庫の中央値・${d.rows.length}機種）。`
    : null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
        { "@type": "ListItem", position: 3, name: "1か月でいくら下がる？", item: `${SITE_URL}${PATH}` },
      ],
    },
    ...(summary ? [{ "@context": "https://schema.org", "@type": "WebPage", name: TITLE, url: `${SITE_URL}${PATH}`, description: summary, dateModified: new Date().toISOString() }] : []),
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="1か月でいくら下がる？" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-8">
        <div>
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/iphone" className="hover:text-brand-800">中古iPhoneの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">1か月でいくら下がる？</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">中古iPhoneは1か月でいくら下がる？</h1>
          {summary ? <p className="text-sm leading-relaxed">{summary}</p> : <p className="text-sm text-ink-sub">価格の記録がまだ足りません。</p>}
          {d.groups.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
              {d.groups.map((g) => (
                <div key={g.label} className="bg-white rounded-xl border border-line p-3 flex flex-col gap-0.5">
                  <span className="text-[12px] text-ink-mute">{g.label}</span>
                  <span className={`text-xl font-bold ${tone(g.avgPct)}`}>{pctText(g.avgPct)}</span>
                  <span className="text-[11px] text-ink-mute">平均{yenDiff(g.avgDiff)}・{g.rows.length}機種</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {d.groups.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>発売から何年の機種が、いちばん下がる？</h2>
            {most && least && (
              <p className="text-sm text-ink-sub">
                <strong className="text-price mr-1">A.</strong>
                直近{d.days}日では<strong className="text-ink">{most.label}</strong>の機種がいちばん下がりました（平均{pctText(most.avgPct)}）。
                {least.label}の機種は平均{pctText(least.avgPct)}で、{Math.abs(least.avgPct) < 1 ? "ほぼ横ばいです。古い機種は、待っても大きくは下がっていません" : "下がり方は小さめです"}。
              </p>
            )}
            <div className={CARD}>
              <table className="w-full text-sm">
                <thead className="bg-ground text-xs text-ink-mute"><tr><th className="text-left font-semibold pl-4 pr-2 py-2">発売</th><th className={TH}>機種数</th><th className={TH}>平均の変化</th><th className={`${TH} pr-4`}>平均の差額</th></tr></thead>
                <tbody>
                  {d.groups.map((g) => (
                    <tr key={g.label} className="border-t border-line-soft">
                      <td className="pl-4 pr-2 py-2.5 font-bold whitespace-nowrap">{g.label}</td>
                      <td className={`${TD} text-ink-mute`}>{g.rows.length}</td>
                      <td className={`${TD} font-bold ${tone(g.avgPct)}`}>{pctText(g.avgPct)}</td>
                      <td className={`${TD} pr-4`}>{yenDiff(g.avgDiff)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {d.groups.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>機種ごとに、30日でいくら動いた？</h2>
            <p className="text-sm text-ink-sub">在庫がいちばん多い容量の中央値を、{d.days}日前の同じ容量と比べています。</p>
            <div className={CARD}>
              <table className="w-full text-sm">
                <thead className="bg-ground text-xs text-ink-mute"><tr><th className="text-left font-semibold pl-4 pr-2 py-2">機種</th><th className={TH}>容量</th><th className={TH}>{d.startDate ? slash(d.startDate).slice(5) : "前"}</th><th className={TH}>{d.endDate ? slash(d.endDate).slice(5) : "後"}</th><th className={`${TH} pr-4`}>変化</th></tr></thead>
                <tbody>
                  {d.groups.flatMap((g) => [
                    <tr key={g.label} className="border-t border-line bg-ground/60"><td colSpan={5} className="pl-4 py-1.5 text-xs font-bold text-ink-sub">{g.label}</td></tr>,
                    ...[...g.rows].sort((a, b) => a.pct - b.pct).map((r) => (
                      <tr key={r.model} className="border-t border-line-soft">
                        <td className="pl-4 pr-2 py-2.5"><Link href={modelPagePath(r.model)} className="font-bold text-ink hover:text-brand-800 whitespace-nowrap">{r.model}</Link></td>
                        <td className={`${TD} text-ink-mute`}>{storageLabel(r.storage, r.model)}</td>
                        <td className={TD}>{yen(r.start)}</td>
                        <td className={TD}>{yen(r.end)}</td>
                        <td className={`${TD} pr-4 font-bold ${tone(r.diff)}`}>{pctText(r.pct)}<span className="block text-[10px] font-normal text-ink-mute">{yenDiff(r.diff)}</span></td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2 text-sm text-ink-sub">
          <h2 className="text-lg font-bold text-ink">データの出典</h2>
          <p className="leading-relaxed text-[13px]">
            大手中古ショップ{shopNum}社の販売中の在庫（1日4回取得）を毎日集計した相場（在庫がいちばん多い容量の中央値）。
            {period ? `${period}の2日を比べ、` : ""}両方の日に在庫が{DROP_MIN_COUNT}件以上ある機種だけ。平均は機種ごとの変化率の単純平均です。
            発売年は Apple の「iPhone のモデルを識別する」の年。1か月の動きは、新型の発売（9月）やセールで変わるので、毎日の最新の30日で出し直しています。
            <Link href="/about#data" className="text-brand-600 underline underline-offset-2">詳しく</Link>
          </p>
          <p><Link href="/iphone/price-factors" className="font-bold text-brand-600 hover:underline underline-offset-4">電池・状態ランク・容量・世代で、値段はいくら違う？ &rarr;</Link></p>
          <p><Link href="/iphone" className="font-bold text-brand-600 hover:underline underline-offset-4">中古iPhoneの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
