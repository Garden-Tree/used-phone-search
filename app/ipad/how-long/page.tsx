import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { modelPagePath } from "@/lib/catalog";
import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { IPAD_SPECS, IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { storageLabel, yen } from "@/lib/format";
import { IPAD_SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import { getModelStats } from "@/lib/modelStats";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古iPadはいつまで使える？（2026-10-29〜）: 機種ごとに iPadOS 27 の対応・発売年・中古の相場を1つの表に。
 * /iphone/how-long の iPad 版。GSC の AI の引用で iPad の機種ページが上位に入っているため（「いつまで使える」の問い）。
 * 事実は Apple 公式で確かめた値だけ: iPadOS 27・発売年（lib/ipadSpecs.ts）。
 * Apple の修理の期間（ビンテージ・オブソリート）は iPad をまだ確かめていないので載せない
 */
const PATH = "/ipad/how-long";
const H1 = "中古iPadはいつまで使える？機種別の一覧";
const TITLE = "中古iPadはいつまで使える？iPadOS 27対応と中古の相場を機種別に一覧【毎日更新】";
const IPADOS27_SOURCE = "https://support.apple.com/ja-jp/guide/ipad/ipad213a25b2/ipados";
const SPEC_SOURCE = "https://support.apple.com/ja-jp/108043";
/** IPADOS27_MODELS から読める線引き（各シリーズで対応するいちばん古い機種） */
const IPADOS27_LINE = "iPad（第9世代）・iPad mini（第6世代）・iPad Air（第4世代）・iPad Pro 11インチ（第2世代）・12.9インチ（第4世代）以降";

const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";

type Row = {
  model: string;
  released: string | null;
  ipados27: boolean;
  median: number | null;
  medianStorage: number | null;
  count: number;
};

async function getRows(): Promise<{ rows: Row[]; updated: Date | null }> {
  const stats = await Promise.all(IPAD_MODELS.map((m) => getModelStats(m)));
  const rows = IPAD_MODELS.map((model, i) => {
    const s = stats[i];
    return {
      model,
      released: IPAD_SPECS[model]?.released ?? null,
      ipados27: IPADOS27_MODELS.has(model),
      median: s.medianPrice,
      medianStorage: s.medianStorage,
      count: s.count,
    };
  });
  const updated = stats.map((s) => s.lastUpdated).filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return { rows, updated };
}

/** 冒頭の1文（AI・検索結果が引用しやすいよう、日付・線引き・いちばん安い iPadOS 27 対応機種の相場を1文に） */
function buildLead(rows: Row[], dateText: string): string | null {
  const ok = rows.filter((r) => r.ipados27 && r.median !== null && r.count >= 5).sort((a, b) => (a.median ?? 0) - (b.median ?? 0))[0];
  if (!ok || ok.median === null) return null;
  return `${dateText}時点、iPadOS 27 に対応するのは${IPADOS27_LINE}の${IPADOS27_MODELS.size}機種。iPadOS 27 に対応する中古でいちばん安いのは${ok.model}で、相場は${yen(ok.median)}（${ok.medianStorage ? storageLabel(ok.medianStorage, ok.model) : ""}）です（Apple 公式の情報と大手中古ショップの在庫から）。`;
}

export async function generateMetadata(): Promise<Metadata> {
  const description = "中古iPadが「いつまで使えるか」を機種ごとに一覧。iPadOS 27 への対応（Apple 公式）、発売年と、中古の相場（毎日更新）を1つの表で比べられます。iPad・iPad mini・iPad Air・iPad Pro。";
  return { title: TITLE, description, alternates: { canonical: PATH }, openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: PATH, images: ["/ipad/opengraph-image"] } };
}

export default async function IpadHowLongPage() {
  const shopNum = (await activeShops(IPAD_SHOPS)).length;
  const { rows, updated } = await getRows();
  const dateText = (updated ?? new Date()).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const lead = buildLead(rows, dateText);
  const noOs = rows.filter((r) => !r.ipados27);
  const noOsSold = noOs.filter((r) => r.median !== null);

  const faqs = [
    {
      q: "iPadOS 27 に対応していない iPad は？",
      a: `${noOs.map((r) => r.model).join("・")}は iPadOS 27 に対応していません（Apple 公式）。iPadOS 27 に対応するのは${IPADOS27_LINE}です。`,
    },
    {
      q: "中古で買うなら、どの iPad までなら安心？",
      a: `最新の iPadOS 27 に対応している機種を選ぶと、アプリや機能の対応で困りにくくなります。対応していない機種${noOsSold.length > 0 ? `（${noOsSold.map((r) => r.model).join("・")}など）も中古で売られています` : "も中古で売られることがあります"}が、価格だけで選ばず上の表で iPadOS 27 の列を確かめてください。`,
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPadの相場一覧", item: `${SITE_URL}/ipad` },
        { "@type": "ListItem", position: 3, name: "中古iPadはいつまで使える？", item: `${SITE_URL}${PATH}` },
      ],
    },
    ...(lead ? [{ "@context": "https://schema.org", "@type": "WebPage", name: H1, url: `${SITE_URL}${PATH}`, description: lead, ...(updated ? { dateModified: updated.toISOString() } : {}) }] : []),
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="中古iPadはいつまで使える？" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/ipad" className="hover:text-brand-800">中古iPadの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">いつまで使える？</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">{H1}</h1>
          {lead && (
            <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">
              {lead}
              <Link href="/about#data" className={`${LINK} ml-1 whitespace-nowrap`}>集計の方法</Link>
            </p>
          )}
        </div>

        {/* 線引き（数字だけ） */}
        <section className={`${CARD} divide-y divide-line-soft`}>
          {[
            { k: "iPadOS 27", v: `${IPADOS27_MODELS.size}機種が対応`, sub: "Apple 公式" },
            { k: "中古の相場", v: `大手中古ショップ${shopNum}店の在庫`, sub: "在庫がいちばん多い容量の中央値・毎日更新" },
          ].map((x) => (
            <div key={x.k} className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
              <span className="text-[11px] text-ink-mute whitespace-nowrap">{x.k}</span>
              <span className="text-right">
                <span className="block text-sm font-bold">{x.v}</span>
                <span className="block text-[10px] text-ink-mute">{x.sub}</span>
              </span>
            </div>
          ))}
        </section>

        {/* 機種ごとの表（シリーズごとに新しい順） */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">機種ごとの一覧</h2>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full text-[13px] tabular-nums">
              <caption className="sr-only">中古iPadの機種ごとの iPadOS 27 対応・発売年・中古の相場</caption>
              <thead className="bg-ground text-[11px] text-ink-mute">
                <tr>
                  <th scope="col" className="text-left font-normal pl-3.5 pr-2 py-2">機種</th>
                  <th scope="col" className="text-center font-normal px-2 py-2">iPadOS 27</th>
                  <th scope="col" className="text-right font-normal pl-2 pr-3.5 py-2">中古の相場</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.model} id={r.model.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()} className="border-t border-line-soft">
                    <th scope="row" className="text-left font-normal pl-3.5 pr-2 py-2 whitespace-nowrap">
                      <Link href={modelPagePath(r.model)} className="font-bold text-brand-600 hover:text-brand-800">{r.model}</Link>
                      {r.released && <span className="block text-[10px] text-ink-mute">{r.released}発売</span>}
                    </th>
                    <td className={`text-center px-2 py-2 ${r.ipados27 ? "" : "text-price font-bold"}`}>{r.ipados27 ? "○" : "×"}</td>
                    <td className="text-right pl-2 pr-3.5 py-2 whitespace-nowrap">
                      {r.median !== null ? <span className="font-bold">{yen(r.median)}</span> : <span className="text-ink-mute">在庫なし</span>}
                      {r.median !== null && r.medianStorage && <span className="block text-[10px] text-ink-mute">{storageLabel(r.medianStorage, r.model)}・{r.count.toLocaleString()}件</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-ink-mute leading-relaxed">
            iPadOS 27 の「○」は Apple「iPadOS 27 に対応している iPad のモデル」に載っている機種。発売年は Apple の技術仕様。中古の相場は在庫がいちばん多い容量の中央値。
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
            iPadOS 27: <a href={IPADOS27_SOURCE} target="_blank" rel="noopener" className={LINK}>Apple「iPadOS 27 に対応している iPad のモデル」</a>・
            発売年: <a href={SPEC_SOURCE} target="_blank" rel="noopener" className={LINK}>Apple「iPad のモデルを識別する」</a>。
            中古: 大手中古ショップの販売中の在庫（{dateText}時点・1日4回取得）。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2"><Link href="/ipad" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古iPadの相場一覧 &rarr;</Link></p>
          <p><Link href="/iphone/how-long" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古iPhoneはいつまで使える？ &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
