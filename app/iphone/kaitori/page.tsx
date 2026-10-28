import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import BuybackPrices from "@/app/components/BuybackPrices";
import { IPHONE_CATALOG, LEGACY_SERIES, modelPagePath, modelToSlug } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import { BUYBACK_PROGRAMS } from "@/lib/buyback";
import { BUYBACK_SHOPS, getBuybackList } from "@/lib/buybackPrices";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（買取価格の取得は週1回）
export const dynamic = "force-static";

/**
 * iPhone の買取価格を店ごとに比べる一覧（2026-10-28〜）。機種ごとに1行・セルをタップで店へ（ネットオフは A8）。
 * 「iphone 買取価格 比較」「iphone13 買取価格」の検索向け。数字は lib/buybackPrices.ts（表 BuybackPrice）
 */
const PATH = "/iphone/kaitori";
const H1 = "iPhoneの買取価格を3店で比較";
const TITLE = "iPhoneの買取価格を3店で比較｜機種ごとの一覧（ネットオフ・にこスマ・モバステ）【毎週更新】";
const MODELS = [...IPHONE_CATALOG.flatMap((s) => s.models), ...LEGACY_SERIES.flatMap((s) => s.models)];

const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";

export async function generateMetadata(): Promise<Metadata> {
  const description = "iPhone の買取価格を、ネットオフ・にこスマ・モバステの3店で機種ごとに比べた一覧。きれいな状態の値段を並べ、いちばん高い店に色を付けています。タップで店の買取ページへ（毎週更新）。";
  return { title: TITLE, description, alternates: { canonical: PATH }, openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: PATH, images: ["/iphone/opengraph-image"] } };
}

export default async function KaitoriPage() {
  const { rows, updated } = await getBuybackList(MODELS);
  const dateText = (updated ?? new Date()).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  // 店ごとに「いちばん高い」になった機種の数（同じ値の店が2つ以上の行は数えない）
  const wins = BUYBACK_SHOPS.map((s) => ({
    shop: s.name,
    n: rows.filter((r) => r.best?.shop === s.name && r.cells.filter((c) => c.price === r.best?.price).length === 1).length,
  }));
  const lead = rows.length > 0
    ? `${dateText}時点、iPhone ${rows.length}機種の買取価格（きれいな状態）を3店で比べると、いちばん高い店は${wins.filter((w) => w.n > 0).sort((a, b) => b.n - a.n).map((w) => `${w.shop}が${w.n}機種`).join("・")}でした。同じ機種・容量でも店で1万円以上違うことがあります。`
    : null;
  const sample = rows.find((r) => r.model === "iPhone 15") ?? rows[0];

  const faqs = [
    ...(sample && sample.best
      ? [{
          q: `${sample.model}の買取価格はいくら？`,
          a: `${storageLabel(sample.storage, sample.model)}のきれいな状態で、${sample.cells.map((c) => `${c.shop} ${yen(c.price)}`).join("・")}です（${dateText}時点・店の表示）。いちばん高いのは${sample.best.shop}です。`,
        }]
      : []),
    {
      q: "表の値段で必ず売れる？",
      a: "いいえ。店が表示している上限の目安です。実際の査定は、傷・バッテリーの状態・付属品・ネットワーク利用制限などで下がります。ネットオフの値段は特典を含み、バッテリー最大容量85%以上が条件です。",
    },
    {
      q: "「きれいな状態」とは？",
      a: "店ごとの区分のうち、ネットオフは「美品」、にこスマは「良品」、モバステは「中古の買取価格の上限」を比べています。区分の基準は店ごとに違います。",
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
        { "@type": "ListItem", position: 3, name: "iPhoneの買取価格", item: `${SITE_URL}${PATH}` },
      ],
    },
    ...(lead ? [{ "@context": "https://schema.org", "@type": "WebPage", name: H1, url: `${SITE_URL}${PATH}`, description: lead, ...(updated ? { dateModified: updated.toISOString() } : {}) }] : []),
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="iPhoneの買取価格" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/iphone" className="hover:text-brand-800">中古iPhoneの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">買取価格</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">{H1}</h1>
          {lead && <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">{lead}</p>}
          <p className="text-[11px] md:text-xs text-ink-mute">
            <span className="inline-block mr-1 px-1 py-px rounded border border-line font-bold">PR</span>
            広告を含みます（ネットオフ・モバステのリンクは A8.net 経由）
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">機種ごとの買取価格（きれいな状態）</h2>
          <BuybackPrices
            rowLabel="機種・容量"
            model={() => "kaitori"}
            rows={rows.map((r) => ({
              key: r.model,
              label: <Link href={`${modelPagePath(r.model)}#kaitori`} id={modelToSlug(r.model)} className="font-bold text-brand-600 hover:text-brand-800 scroll-mt-16">{r.model.replace("iPhone ", "")}</Link>,
              sub: `${storageLabel(r.storage, r.model)}${r.storages > 1 ? `・ほか${r.storages - 1}容量` : ""}`,
              cells: r.cells,
              best: r.best,
            }))}
          />
          <p className="text-[11px] text-ink-mute leading-relaxed">
            店が表示している買取価格の上限（{dateText}時点・週1回取得）。赤い値がその機種でいちばん高い店。ほかの容量は機種名から機種ページへ。ネットオフは特典込み・バッテリー85%以上が条件。実際の査定は状態で下がります。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">ほかの買取店</h2>
          <div className={`${CARD} divide-y divide-line-soft`}>
            {BUYBACK_PROGRAMS.filter((p) => !BUYBACK_SHOPS.some((s) => s.name === p.name)).map((p) => (
              <a key={p.name} href={p.href} target="_blank" rel="sponsored nofollow noopener" data-shop-click="" data-shop={`${p.name}（買取）`} data-model="kaitori" data-link-type="a8"
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-ground">
                <span className="text-sm font-bold">{p.name}</span>
                <span className="text-[11px] text-ink-mute">PR ›</span>
              </a>
            ))}
          </div>
          {BUYBACK_PROGRAMS.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${p.name}-imp`} src={p.imgSrc} width={1} height={1} alt="" className="absolute" />
          ))}
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
            <a href="https://www.netoff.co.jp/mobilebuy/smartphone/iphone/" target="_blank" rel="nofollow noopener" className={LINK}>ネットオフ</a>・
            <a href="https://www.nicosuma.com/sell" target="_blank" rel="nofollow noopener" className={LINK}>にこスマ買取</a>・
            <a href="https://pastec.net/iphone" target="_blank" rel="nofollow noopener" className={LINK}>モバステ（パステック）</a>の買取価格の表示（{dateText}時点）。
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/iphone/resale-value" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">発売から何年でいくら下がる？実質いくら &rarr;</Link>
            <Link href="/iphone" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古iPhoneの相場一覧 &rarr;</Link>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
