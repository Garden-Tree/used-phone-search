import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import { activeShops } from "@/lib/activeShops";
import { getResaleValue, RESALE_MIN_COUNT, type ResaleRow } from "@/lib/resaleValue";
import { LAUNCH_PRICES_CHECKED } from "@/lib/launchPrices";
import { applePrice } from "@/lib/applePrices";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古iPhoneは発売から何年でいくら下がる？（2026-10-28〜）: 発売時の Apple 公式の値段と、いまの中古の相場（同じ容量）を比べ、
 * 発売からの年数ごとの「残っている割合」と、機種ごとの「1か月あたり実質いくら（目安）」を出す。
 * 「iphone 値下がり率」「iphone リセール」「実質いくら」の検索向け。数字は lib/resaleValue.ts。短期の値動きは /iphone/price-drop
 */
const PATH = "/iphone/resale-value";
const H1 = "中古iPhoneは発売から何年でいくら下がる？";
const TITLE = "iPhoneは発売から何年でいくら下がる？発売時の値段と中古相場の比較・実質いくらで使えたか【毎日更新】";

const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";
const slash = (iso: string) => iso.replace(/-0?/g, "/");
const ym = (iso: string) => { const [y, m] = iso.split("-").map(Number); return `${y}年${m}月`; };

export async function generateMetadata(): Promise<Metadata> {
  const description = "iPhone の発売時の値段（Apple 公式）と、いまの中古の相場（同じ容量）を比べて、発売から1年・2年・3年で何%残るかを一覧に。高い機種を買って数年後に手放すと、1か月あたり実質いくらだったかの目安も（毎日更新）。";
  return { title: TITLE, description, alternates: { canonical: PATH }, openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: PATH, images: ["/iphone/opengraph-image"] } };
}

export default async function ResaleValuePage() {
  const shopNum = (await activeShops()).length;
  const { rows, groups } = await getResaleValue();
  const dateText = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const lead = groups.length >= 2
    ? `${dateText}時点、中古の相場は発売時の値段の${groups.map((g) => `${g.label}で約${Math.round(g.avgRetention)}%`).join("・")}（同じ容量・Apple 公式の発売時の値段と大手中古ショップ${shopNum}店の在庫の中央値を比べた機種の平均。発売後に新品が値上がりした機種は100%を超える）。`
    : null;
  // 発売から2年以上の機種で、値段が残っている（値下がりがゆるやかな）順・1か月あたりが小さい順
  const older = rows.filter((r) => r.years >= 2);
  const keeps = [...older].sort((a, b) => b.retention - a.retention).slice(0, 3);
  const cheapest = [...older].filter((r) => r.perMonth !== null && r.perMonth > 0).sort((a, b) => (a.perMonth ?? 0) - (b.perMonth ?? 0)).slice(0, 3);
  // 発売時より中古の相場が高い機種（発売後に新品の値段が上がったため。新品の今の値段は lib/applePrices.ts）
  const above = rows.filter((r) => r.median > r.launchPrice);
  const hikes = rows
    .map((r) => ({ r, now: applePrice(r.model, r.storage) }))
    .filter((x): x is { r: ResaleRow; now: number } => x.now !== null && x.now > x.r.launchPrice);

  const faqs = [
    ...(lead ? [{ q: "iPhone は発売から何年でいくら下がる？", a: lead }] : []),
    ...(keeps.length > 0
      ? [{
          q: "値下がりがゆるやかな iPhone は？",
          a: `発売から2年以上たった機種では、${keeps.map((r) => `${r.model}（発売時の${Math.round(r.retention)}%）`).join("・")}の値段がよく残っています。${cheapest.length > 0 ? `発売時の値段といまの相場の差を発売からの月数で割ると、1か月あたりが小さいのは${cheapest.map((r) => `${r.model}（約${yen(r.perMonth ?? 0)}）`).join("・")}です。` : ""}売るときは店の買取価格（販売価格より低い）になるので、実際の負担はこれより大きくなります。`,
        }]
      : []),
    ...(above.length > 0
      ? [{
          q: "発売時の値段より中古のほうが高い iPhone はある？",
          a: `あります。${above.map((r) => r.model).join("・")}は、いまの中古の相場（同じ容量）が発表時の値段を上回っています。発売後に Apple の新品の値段が上がった機種もあります${hikes.length > 0 ? `（例: ${hikes.slice(0, 2).map((x) => `${x.r.model}（${storageLabel(x.r.storage, x.r.model)}）は発表時${yen(x.r.launchPrice)}・いま${yen(x.now)}`).join("、")}。Apple 公式）` : ""}。`,
        }]
      : []),
    {
      q: "この「残っている割合」は買取価格ですか？",
      a: "いいえ。中古ショップで売られている値段（販売価格）の中央値です。手放すときの買取価格は、これより低くなります。値段の下がり方の目安として見てください。",
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
        { "@type": "ListItem", position: 3, name: "発売から何年でいくら下がる？", item: `${SITE_URL}${PATH}` },
      ],
    },
    ...(lead ? [{ "@context": "https://schema.org", "@type": "WebPage", name: H1, url: `${SITE_URL}${PATH}`, description: lead }] : []),
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="発売から何年でいくら下がる？" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/iphone" className="hover:text-brand-800">中古iPhoneの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">発売から何年でいくら下がる？</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">{H1}</h1>
          {lead && (
            <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">
              {lead}
              <Link href="/about#data" className={`${LINK} ml-1 whitespace-nowrap`}>集計の方法</Link>
            </p>
          )}
        </div>

        {/* 年数ごとの残っている割合（大きな数字） */}
        {groups.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold">発売からの年数と、残っている割合</h2>
            <div className="grid grid-cols-3 gap-2">
              {groups.map((g) => (
                <div key={g.label} className={`${CARD} px-3 py-2.5 flex flex-col items-center`}>
                  <span className="text-[11px] text-ink-mute">発売から{g.label}</span>
                  <span className="text-2xl font-bold tabular-nums">{Math.round(g.avgRetention)}<span className="text-sm">%</span></span>
                  <span className="text-[10px] text-ink-mute">{g.rows.length}機種の平均</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-ink-mute leading-relaxed">発売時の値段（Apple 公式・いちばん安い容量）に対する、いまの中古の相場（同じ容量の中央値）の割合。同じ機種の推移ではなく、発売からの年数が違う機種を並べた比較です。</p>
          </section>
        )}

        {/* 機種ごとの表 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">機種ごとの一覧</h2>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full text-[13px] tabular-nums">
              <caption className="sr-only">iPhone の発売時の値段と、いまの中古の相場（同じ容量）・残っている割合・1か月あたり実質いくら</caption>
              <thead className="bg-ground text-[11px] text-ink-mute">
                <tr>
                  <th scope="col" className="text-left font-normal pl-3.5 pr-2 py-2">機種</th>
                  <th scope="col" className="text-right font-normal px-2 py-2">発売時</th>
                  <th scope="col" className="text-right font-normal px-2 py-2">いまの相場</th>
                  <th scope="col" className="text-right font-normal px-2 py-2">残り</th>
                  <th scope="col" className="text-right font-normal pl-2 pr-3.5 py-2">1か月あたり</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => <Row key={r.model} r={r} />)}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-ink-mute leading-relaxed">
            「1か月あたり」は（発売時の値段 − いまの相場）÷ 発売からの月数で、発売から1年以上の機種だけ。発売後に新品が値上がりした機種は、中古の相場が発売時の値段を上回ることがあります（「発売時より高い」）。売るときは店の買取価格（販売価格より低い）になるので、実際の負担はこれより大きくなります。中古の在庫が{RESALE_MIN_COUNT}件未満の機種は出していません。
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg md:text-xl font-bold">よくある質問</h2>
          {faqs.map((f) => (
            <div key={f.q} className="text-sm">
              <h3 className="font-bold"><span className="text-brand-600 mr-1">Q.</span>{f.q}</h3>
              <p className="text-ink-sub leading-relaxed mt-1">{f.a}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-1 text-[11px] text-ink-mute leading-relaxed">
          <h2 className="text-sm font-bold text-ink-sub">出典</h2>
          <p>
            発売時の値段: Apple Newsroom（日本）の各機種の発表（{slash(LAUNCH_PRICES_CHECKED)}確認・税込）。
            中古: 大手中古ショップ{shopNum}店の販売中の在庫（{dateText}時点・1日4回取得）。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/iphone/price-drop" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">直近1か月の値下がり &rarr;</Link>
            <Link href="/iphone" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古iPhoneの相場一覧 &rarr;</Link>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Row({ r }: { r: ResaleRow }) {
  return (
    <tr className="border-t border-line-soft">
      <th scope="row" className="text-left font-normal pl-3.5 pr-2 py-2 whitespace-nowrap">
        <Link href={modelPagePath(r.model)} className="font-bold text-brand-600 hover:text-brand-800">{r.model.replace("iPhone ", "")}</Link>
        <span className="block text-[10px] text-ink-mute">{ym(r.launchDate)}発表・{storageLabel(r.storage, r.model)}</span>
      </th>
      <td className="text-right px-2 py-2 whitespace-nowrap">{yen(r.launchPrice)}</td>
      <td className="text-right px-2 py-2 whitespace-nowrap font-bold">{yen(r.median)}<span className="block text-[10px] font-normal text-ink-mute">{r.count.toLocaleString()}件</span></td>
      <td className="text-right px-2 py-2 whitespace-nowrap font-bold">{Math.round(r.retention)}%</td>
      <td className="text-right pl-2 pr-3.5 py-2 whitespace-nowrap">
        {r.median > r.launchPrice ? <span className="text-[11px] text-ink-mute">発売時より高い</span> : r.perMonth !== null ? `約${yen(r.perMonth)}` : <span className="text-ink-mute">—</span>}
      </td>
    </tr>
  );
}
