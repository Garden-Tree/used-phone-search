import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import { appleCheckedJa } from "@/lib/applePrices";
import {
  REPORT_MOVE_MIN_COUNT,
  getMonthlyReport,
  monthJa,
  reportMonths,
  reportPublished,
  reportSummary,
  signedPct,
  type MoveRow,
} from "@/lib/monthlyReport";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）。終わった月の数字は変わらない
export const dynamic = "force-static";

// 一覧（/iphone/report）と、終わった月のレポート（/iphone/report/2026-10）だけ。月の途中の月・ほかの URL は404
export const dynamicParams = false;

/**
 * 中古iPhone相場レポート（毎月1日に前の月の分・2026-11-01〜）: 1か月の値下がり・値上がり、新品（Apple 公式）との差、Pro と無印の差。
 * AI・メディアが引用しやすいよう、冒頭に数字入りの要約と、集計方法・出典を置く。数字は lib/monthlyReport.ts。
 *
 * 月の途中の月は出さない（generateStaticParams は終わった月だけ）。静的書き出しでは、動的なルートが1つもページを返さないと
 * ビルドが止まるので、[[...month]] にして一覧（/iphone/report）を必ず出す。レポートが1本もない間（〜10/31）の一覧は noindex で、どこからもリンクしない
 */
const PATH = "/iphone/report";

export function generateStaticParams() {
  return [{ month: [] }, ...reportMonths().map((ym) => ({ month: [ym] }))];
}

type Props = { params: Promise<{ month?: string[] }> };

/** URL の月（一覧なら null）。公開していない月・形の違う URL は404 */
async function monthOf(params: Props["params"]): Promise<string | null> {
  const { month } = await params;
  if (!month || month.length === 0) return null;
  if (month.length !== 1 || !reportMonths().includes(month[0])) notFound();
  return month[0];
}

const titleOf = (ym: string) => `中古iPhone相場レポート ${monthJa(ym)}：1か月の値下がり・新品との差・Proと無印`;
const INDEX_TITLE = "中古iPhone相場レポート（毎月更新）";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ym = await monthOf(params);
  if (!ym) {
    const latest = reportMonths()[0];
    const description = "中古iPhoneの相場を毎月まとめたレポートの一覧。1か月の値下がり・値上がり、新品（Apple 公式）との差、Pro と無印の差を、大手中古ショップの在庫の集計で毎月1日に公開します。";
    return {
      title: INDEX_TITLE,
      description,
      alternates: { canonical: PATH },
      // レポートが1本もない間は検索に出さない
      ...(latest ? {} : { robots: { index: false, follow: true } }),
      openGraph: { title: `${INDEX_TITLE} | ${SITE_NAME}`, description, url: PATH, images: ["/iphone/opengraph-image"] },
    };
  }
  const r = await getMonthlyReport(ym);
  const title = titleOf(ym);
  const description = reportSummary(r).slice(0, 2).join("") || `${monthJa(ym)}の中古iPhoneの相場の変化・新品との差・Pro と無印の差。`;
  const path = `${PATH}/${ym}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    // openGraph を上書きすると親の OGP 画像が引き継がれないので、/iphone の画像を明示する
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, images: ["/iphone/opengraph-image"], type: "article" },
  };
}

const CARD = "bg-white rounded-xl border border-line overflow-x-auto";
const TH = "font-semibold px-2 py-2 text-right";
const TD = "px-2 py-2.5 text-right whitespace-nowrap";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";
const jaDay = (iso: string) => `${Number(iso.slice(5, 7))}月${Number(iso.slice(8, 10))}日`;
const signedYen = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toLocaleString()}円`;

function ModelLink({ model }: { model: string }) {
  return <Link href={modelPagePath(model)} className="font-bold text-ink hover:text-brand-800 whitespace-nowrap">{model}</Link>;
}

function Breadcrumb({ ym }: { ym: string | null }) {
  return (
    <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
      <Link href="/" className="hover:text-brand-800">トップ</Link>
      <span className="mx-2">›</span>
      <Link href="/iphone" className="hover:text-brand-800">中古iPhoneの相場一覧</Link>
      <span className="mx-2">›</span>
      {ym ? (
        <>
          <Link href={PATH} className="hover:text-brand-800">相場レポート</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">{monthJa(ym)}</span>
        </>
      ) : (
        <span className="text-ink-sub">相場レポート</span>
      )}
    </nav>
  );
}

/** 値下がり・値上がり・全機種の表（月初と月末の相場） */
function MoveTable({ rows, start, end }: { rows: MoveRow[]; start: string; end: string }) {
  return (
    <div className={CARD}>
      <table className="w-full text-sm">
        <thead className="bg-ground text-xs text-ink-mute">
          <tr>
            <th className="text-left font-semibold pl-4 pr-2 py-2">機種</th>
            <th className={TH}>容量</th>
            <th className={TH}>{jaDay(start)}</th>
            <th className={TH}>{jaDay(end)}</th>
            <th className={`${TH} pr-4`}>変化</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.model} className="border-t border-line-soft">
              <td className="pl-4 pr-2 py-2.5"><ModelLink model={r.model} /></td>
              <td className={`${TD} text-ink-mute`}>{storageLabel(r.storage, r.model)}</td>
              <td className={TD}>{yen(r.start)}</td>
              <td className={TD}>{yen(r.end)}</td>
              <td className={`${TD} pr-4 font-bold ${r.diff < 0 ? "text-safe" : r.diff > 0 ? "text-price" : "text-ink-mute"}`}>
                {signedPct(r.pct)}
                <span className="block text-[10px] font-normal text-ink-mute">{signedYen(r.diff)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReportPage({ params }: Props) {
  const ym = await monthOf(params);
  return ym ? <MonthReport ym={ym} /> : <ReportIndex />;
}

/** 一覧: 新しい順。いちばん新しい月は要約も出す */
async function ReportIndex() {
  const months = reportMonths();
  const latest = months[0] ? await getMonthlyReport(months[0]) : null;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
        { "@type": "ListItem", position: 3, name: "相場レポート", item: `${SITE_URL}${PATH}` },
      ],
    },
  ];
  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="相場レポート" />
      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-8">
        <div>
          <Breadcrumb ym={null} />
          <h1 className="text-2xl md:text-3xl font-bold mb-3">中古iPhone相場レポート</h1>
          <p className="text-sm text-ink-sub">
            中古iPhoneの相場を、毎月1日に前の月の分をまとめて公開します。1か月の値下がり・値上がり、新品（Apple 公式）との差、Pro と無印の差。
          </p>
        </div>
        {latest && months[0] ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold">最新: {monthJa(months[0])}</h2>
            <ul className="text-sm text-ink-sub flex flex-col gap-1.5 leading-relaxed list-disc pl-5">
              {reportSummary(latest).map((l) => <li key={l}>{l}</li>)}
            </ul>
            <p><Link href={`${PATH}/${months[0]}`} className="font-bold text-brand-600 hover:underline underline-offset-4">{monthJa(months[0])}のレポートを見る &rarr;</Link></p>
          </section>
        ) : (
          <p className="text-sm text-ink-sub">最初のレポート（2026年10月分）は2026年11月1日に公開します。</p>
        )}
        {months.length > 1 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">過去のレポート</h2>
            <ul className="text-sm flex flex-col gap-1">
              {months.slice(1).map((m) => (
                <li key={m}><Link href={`${PATH}/${m}`} className={LINK}>{titleOf(m)}</Link></li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-sm"><Link href="/iphone" className="font-bold text-brand-600 hover:underline underline-offset-4">中古iPhoneの相場一覧（毎日更新） &rarr;</Link></p>
      </main>
      <SiteFooter />
    </div>
  );
}

async function MonthReport({ ym }: { ym: string }) {
  const r = await getMonthlyReport(ym);
  const summary = reportSummary(r);
  const title = titleOf(ym);
  const path = `${PATH}/${ym}`;
  const published = reportPublished(ym);
  const months = reportMonths();
  const others = months.filter((m) => m !== ym);
  const byPct = [...r.newVsUsed].sort((a, b) => b.pct - a.pct);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
        { "@type": "ListItem", position: 3, name: "相場レポート", item: `${SITE_URL}${PATH}` },
        { "@type": "ListItem", position: 4, name: monthJa(ym), item: `${SITE_URL}${path}` },
      ],
    },
    // 終わった月の数字は変わらないので、公開日・更新日はビルドの時刻ではなく翌月1日
    ...(summary.length
      ? [{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          url: `${SITE_URL}${path}`,
          description: summary.join(""),
          datePublished: published,
          dateModified: published,
          inLanguage: "ja",
          author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        }]
      : []),
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="相場レポート" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-8">
        <div>
          <Breadcrumb ym={ym} />
          <h1 className="text-2xl md:text-3xl font-bold mb-3">中古iPhone相場レポート {monthJa(ym)}</h1>
          {r.startDate && r.endDate ? (
            <p className="text-sm text-ink-sub">
              {jaDay(r.startDate)}と{jaDay(r.endDate)}の相場を比べました（大手中古ショップの中古iPhone {r.endStock.toLocaleString()}件・{jaDay(r.endDate)}時点）。
              {r.partial ? <strong className="text-price ml-1">月の途中（開発時の確認用）</strong> : <span className="ml-1">公開 {published.replace(/-/g, "/")}</span>}
            </p>
          ) : (
            <p className="text-sm text-ink-sub">この月の価格の記録がありません。</p>
          )}
          {summary.length > 0 && (
            <div className="mt-3 rounded-xl bg-white border border-line p-4">
              <p className="text-[12px] font-bold text-ink-mute mb-1.5">{monthJa(ym)}のまとめ</p>
              <ul className="text-sm flex flex-col gap-1.5 leading-relaxed list-disc pl-5">
                {summary.map((l) => <li key={l}>{l}</li>)}
              </ul>
            </div>
          )}
        </div>

        {r.startDate && r.endDate && r.moves.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>1か月で値下がりした機種は？</h2>
            {r.down.length > 0
              ? <MoveTable rows={r.down} start={r.startDate} end={r.endDate} />
              : <p className="text-sm text-ink-sub">値下がりした機種はありませんでした。</p>}
            <h3 className="font-bold mt-3">値上がりした機種</h3>
            {r.up.length > 0
              ? <MoveTable rows={r.up} start={r.startDate} end={r.endDate} />
              : <p className="text-sm text-ink-sub">値上がりした機種はありませんでした。</p>}
            <p className="text-xs text-ink-mute">
              変化の大きい順に5機種まで。{jaDay(r.startDate)}と{jaDay(r.endDate)}の両方で、その容量の在庫が{REPORT_MOVE_MIN_COUNT}件以上ある iOS 27 対応の{r.moves.length}機種から（在庫が少ない機種は数件の出入りで相場が大きく動くため）。
            </p>
          </section>
        )}

        {r.newVsUsed.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>新品と比べて、中古はいくら安い？</h2>
            <p className="text-sm text-ink-sub">
              <strong className="text-price mr-1">A.</strong>
              {byPct[0].diff > 0
                ? <>差がいちばん大きいのは<strong className="text-ink">{byPct[0].model}</strong>（新品より{byPct[0].pct.toFixed(1)}%・{byPct[0].diff.toLocaleString()}円安い）。</>
                : "中古の相場が新品と同じか高い状態です。"}
            </p>
            <div className={CARD}>
              <table className="w-full text-sm">
                <thead className="bg-ground text-xs text-ink-mute">
                  <tr><th className="text-left font-semibold pl-4 pr-2 py-2">機種</th><th className={TH}>容量</th><th className={TH}>新品（Apple）</th><th className={TH}>中古の相場</th><th className={`${TH} pr-4`}>新品との差</th></tr>
                </thead>
                <tbody>
                  {byPct.map((x) => (
                    <tr key={x.model} className="border-t border-line-soft">
                      <td className="pl-4 pr-2 py-2.5"><ModelLink model={x.model} /></td>
                      <td className={`${TD} text-ink-mute`}>{storageLabel(x.storage, x.model)}</td>
                      <td className={TD}><a href={x.source} target="_blank" rel="noopener noreferrer" className={LINK}>{yen(x.newPrice)}</a></td>
                      <td className={TD}>{yen(x.used)}<span className="block text-[10px] text-ink-mute">{x.count.toLocaleString()}件</span></td>
                      <td className={`${TD} pr-4 font-bold ${x.diff > 0 ? "text-safe" : "text-ink-mute"}`}>
                        {x.diff > 0 ? `−${x.pct.toFixed(1)}%` : `+${Math.abs(x.pct).toFixed(1)}%`}
                        <span className="block text-[10px] font-normal text-ink-mute">{x.diff > 0 ? `${x.diff.toLocaleString()}円安い` : `${Math.abs(x.diff).toLocaleString()}円高い`}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-mute">
              Apple がいま新品を売っている機種だけ（税込・SIMフリー・{appleCheckedJa()}確認。価格のリンクは Apple 公式）。容量は、新品の価格がある容量のうち{r.endDate ? jaDay(r.endDate) : "月末"}の中古の在庫がいちばん多い容量（在庫5件以上）。
            </p>
          </section>
        )}

        {r.proVsBase.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>Pro と無印で、いくら違う？</h2>
            <p className="text-sm text-ink-sub"><strong className="text-price mr-1">A.</strong>同じ世代・同じ容量で比べると、Pro は無印より平均<strong className="text-ink">{Math.round(r.proVsBase.reduce((a, x) => a + x.diff, 0) / r.proVsBase.length).toLocaleString()}円</strong>高い（{r.proVsBase.length}世代）。</p>
            <div className={CARD}>
              <table className="w-full text-sm">
                <thead className="bg-ground text-xs text-ink-mute">
                  <tr><th className="text-left font-semibold pl-4 pr-2 py-2">世代</th><th className={TH}>容量</th><th className={TH}>無印</th><th className={TH}>Pro</th><th className={`${TH} pr-4`}>差</th></tr>
                </thead>
                <tbody>
                  {r.proVsBase.map((x) => (
                    <tr key={x.base} className="border-t border-line-soft">
                      <td className="pl-4 pr-2 py-2.5"><ModelLink model={x.base} /> と <Link href={modelPagePath(x.pro)} className="text-brand-600 hover:text-brand-800 whitespace-nowrap">Pro</Link></td>
                      <td className={`${TD} text-ink-mute`}>{storageLabel(x.storage, x.base)}</td>
                      <td className={TD}>{yen(x.baseMedian)}</td>
                      <td className={TD}>{yen(x.proMedian)}</td>
                      <td className={`${TD} pr-4 font-bold`}>{signedYen(x.diff)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-mute">{r.endDate ? jaDay(r.endDate) : "月末"}の相場。容量は、無印と Pro の両方に在庫が5件以上あるいちばん小さい容量。</p>
          </section>
        )}

        {r.startDate && r.endDate && r.moves.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold">全機種の相場の変化（{r.moves.length}機種）</h2>
            <MoveTable rows={r.moves} start={r.startDate} end={r.endDate} />
          </section>
        )}

        <section className="flex flex-col gap-2 text-sm text-ink-sub">
          <h2 className="text-lg font-bold text-ink">集計方法とデータの出典</h2>
          <ul className="text-[13px] leading-relaxed list-disc pl-5 flex flex-col gap-1">
            <li>
              <strong className="text-ink">相場</strong>は、機種ごとに在庫がいちばん多い容量の、販売中の在庫の中央値（安い順に並べたちょうど真ん中の値）。状態ランクはすべて含みます。サイトの各機種ページの相場と同じ出し方です。
            </li>
            <li>大手中古ショップの販売中の在庫を1日4回取得し、日ごとに機種・容量ごとの中央値を記録した値を使っています（Amazon 整備済み品は含みません）。</li>
            {r.startDate && r.endDate && <li>「1か月の変化」は{jaDay(r.startDate)}と{jaDay(r.endDate)}の記録の比較（記録{r.days}日分）。同じ容量どうしで比べています。</li>}
            <li>新品の価格は Apple 公式サイトで確認した値（{appleCheckedJa()}確認）。</li>
          </ul>
          <p className="text-[13px]">
            店ごとの在庫数は<Link href="/iphone/where-to-buy" className={LINK}>「中古iPhoneはどこで買う？」</Link>、電池・状態ランクによる差は<Link href="/iphone/price-factors" className={LINK}>「値段は何で決まる？」</Link>、取得の方法は<Link href="/about#data" className={LINK}>このサイトについて</Link>。
          </p>
          <p className="text-[13px]">引用・転載の際は、出典として「{SITE_NAME}（{SITE_URL.replace(/^https?:\/\//, "")}）」とこのページの URL を記載してください。</p>
          {others.length > 0 && (
            <p className="text-[13px]">ほかの月: {others.map((m, i) => <span key={m}>{i > 0 && "・"}<Link href={`${PATH}/${m}`} className={LINK}>{monthJa(m)}</Link></span>)}</p>
          )}
          <p><Link href="/iphone" className="font-bold text-brand-600 hover:underline underline-offset-4">中古iPhoneの相場一覧（毎日更新） &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
