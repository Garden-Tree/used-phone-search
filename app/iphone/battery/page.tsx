import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import BatteryCalc from "@/app/components/BatteryCalc";
import VideoEmbed from "@/app/components/VideoEmbed";
import { APPLE_REPAIR_SOURCE, appleRepairCheckedJa } from "@/lib/appleRepairPrices";
import { AISAPO_CHECKED, AISAPO_SOURCE } from "@/lib/aisapoPrices";
import { getBatteryData } from "@/lib/batteryDecision";
import { perYear, pickTarget } from "@/lib/batteryCalc";
import { REPAIR_PROGRAMS } from "@/lib/buyback";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import { VIDEOS } from "@/lib/videos";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（相場は1日4回・買取価格は週1回）
export const dynamic = "force-static";

/**
 * iPhone のバッテリー、交換と買い替えどっちが得？（2026-10-31〜）。「iPhone バッテリー交換 費用」の検索向け。
 * 計算機（app/components/BatteryCalc.tsx）と、全機種の料金・相場・買取の表。数字は lib/batteryDecision.ts
 */
const PATH = "/iphone/battery";
const H1 = "iPhoneのバッテリー、交換と買い替えどっちが得？";
const TITLE = "iPhoneのバッテリー交換の費用は？交換と中古への買い替えを1年あたりで比較【全機種】";
const DEFAULT_MODEL = "iPhone 13";

const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";
const aisapoCheckedJa = (() => { const [y, m, d] = AISAPO_CHECKED.split("-").map(Number); return `${y}年${m}月${d}日`; })();

export async function generateMetadata(): Promise<Metadata> {
  const description = "iPhoneのバッテリー交換（Apple 公式・非正規）と、中古の1つ上・2つ上の世代への買い替えを「1年あたりの費用」で比べる計算機。中古の相場は電池80%以上・85%以上で絞った値、いまの iPhone の買取価格も差し引けます。全機種の料金表つき。";
  return { title: TITLE, description, alternates: { canonical: PATH }, openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: PATH, images: ["/iphone/opengraph-image"] } };
}

export default async function BatteryPage() {
  const { models, targets } = await getBatteryData();
  const paths = Object.fromEntries([...new Set(models.flatMap((m) => [m.model, m.next1, m.next2]).filter((x): x is string => !!x))].map((m) => [m, modelPagePath(m)]));
  const aisapo = REPAIR_PROGRAMS.find((p) => p.name === "アイサポ")!;

  // 表: 機種ごとに、買取のデータがある容量（128GB があればそれ）で1行
  const table = models.map((m) => {
    const sell = m.buyback.find((b) => b.storage === 128) ?? m.buyback[0] ?? null;
    const storage = sell?.storage ?? 128;
    const next = m.next1 ? pickTarget(targets[m.next1], storage, "b80") : null;
    return { m, sell, storage, next };
  });

  const sample = table.find((r) => r.m.model === DEFAULT_MODEL);
  const lead = sample && sample.m.apple !== null && sample.next?.cell && sample.sell
    ? `${DEFAULT_MODEL}をあと2年なら、Apple で交換 1年${yen(perYear(sample.m.apple, 2))}・中古の${(sample.m.next1 ?? "").replace("iPhone ", "")}に買い替え 1年${yen(perYear(sample.next.cell.median - sample.sell.price, 2))}（売った額を引いて）。`
    : null;

  const faqs = [
    ...(sample && sample.m.apple !== null
      ? [{ q: `${DEFAULT_MODEL}のバッテリー交換の費用は？`, a: `Apple 公式で${yen(sample.m.apple)}（税込・${appleRepairCheckedJa()}確認）です。${sample.m.aisapo !== null ? `非正規のアイサポは${yen(sample.m.aisapo)}（新宿本店の料金）です。` : ""}AppleCare+ に入っていて最大容量が80%未満なら、Apple では追加料金なしで交換できます。` }]
      : []),
    { q: "最大容量が何%になったら交換？", a: "Apple は、iPhone 14 以前は充電サイクル500回、iPhone 15 は1,000回で本来の容量の80%を保つように設計していると案内しています（理想的な条件下）。AppleCare+ の無料交換も80%未満が条件です。" },
    { q: "中古に買い替えるときの電池は？", a: "このページの中古の相場は、最大容量80%以上・85%以上の在庫だけで出した中央値です。中古の電池の%は店によって表記のしかたが違うので、買う前に商品ページで確かめてください。" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
        { "@type": "ListItem", position: 3, name: "バッテリー交換と買い替え", item: `${SITE_URL}${PATH}` },
      ],
    },
    ...(lead ? [{ "@context": "https://schema.org", "@type": "WebPage", name: H1, url: `${SITE_URL}${PATH}`, description: lead }] : []),
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="バッテリー交換と買い替え" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/iphone" className="hover:text-brand-800">中古iPhoneの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">バッテリー交換と買い替え</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">{H1}</h1>
          {lead && <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">{lead}</p>}
          <p className="text-[11px] md:text-xs text-ink-mute">
            <span className="inline-block mr-1 px-1 py-px rounded border border-line font-bold">PR</span>
            広告を含みます（アイサポのリンクは A8.net 経由）
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">1年あたりの費用を計算する</h2>
          <BatteryCalc models={models} targets={targets} paths={paths} aisapoHref={aisapo.href} appleHref={APPLE_REPAIR_SOURCE.battery} defaultSlug={models.find((m) => m.model === DEFAULT_MODEL)?.slug ?? models[0].slug} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aisapo.imgSrc} width={1} height={1} alt="" className="absolute" />
          <p className="text-[11px] text-ink-mute leading-relaxed">中古＝同じ容量の中央値（1日4回更新）・売る＝3店の買取の上限・使い終わった後に売る額は入れていません</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">機種ごとの交換費用と、1つ上の中古</h2>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full text-[11px] md:text-[12px] tabular-nums whitespace-nowrap">
              <thead>
                <tr className="text-[11px] text-ink-mute border-b border-line">
                  <th className="text-left font-normal px-2 py-2">機種（円）</th>
                  <th className="text-right font-normal px-2 py-2">Apple</th>
                  <th className="text-right font-normal px-1.5 py-2">アイサポ</th>
                  <th className="text-right font-normal px-2 py-2">売ると</th>
                  <th className="text-right font-normal px-2 py-2">1つ上の中古</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {table.map(({ m, sell, storage, next }) => (
                  <tr key={m.model}>
                    <td className="px-2 py-1.5">
                      <Link href={`${PATH}?model=${m.slug}`} className="font-bold text-brand-600 hover:text-brand-800">{m.model.replace("iPhone ", "")}</Link>
                      <span className="block text-[10px] text-ink-mute">{storageLabel(storage)}</span>
                    </td>
                    <td className="text-right px-2 py-1.5">{m.apple !== null ? m.apple.toLocaleString() : "—"}</td>
                    <td className="text-right px-2 py-1.5 text-ink-sub">{m.aisapo !== null ? m.aisapo.toLocaleString() : "—"}</td>
                    <td className="text-right px-2 py-1.5 text-ink-sub">{sell ? sell.price.toLocaleString() : "—"}</td>
                    <td className="text-right px-2 py-1.5">
                      {m.next1 && next?.cell ? (
                        <Link href={paths[m.next1]} className="text-price font-bold hover:underline">{next.cell.median.toLocaleString()}<span className="block text-[10px] font-normal text-ink-mute">{m.next1.replace("iPhone ", "")}</span></Link>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-ink-mute leading-relaxed">
            Apple 公式（{appleRepairCheckedJa()}）・アイサポ 新宿本店（{aisapoCheckedJa}）・税込。1つ上の中古は電池80%以上の中央値。機種名で計算機へ
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">交換する・買い替える・売る</h2>
          <div className={`${CARD} divide-y divide-line-soft`}>
            <a href={APPLE_REPAIR_SOURCE.battery} target="_blank" rel="noopener" className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-ground">
              <span className="text-sm font-bold">Apple でバッテリー交換の見積りをとる</span>
              <span className="text-[11px] text-ink-mute">Apple 公式 ›</span>
            </a>
            <a href={aisapo.href} target="_blank" rel="sponsored nofollow noopener" data-shop-click="" data-shop="アイサポ（修理）" data-model="battery" data-link-type="a8" data-placement="battery-exit"
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-ground">
              <span className="text-sm font-bold">非正規で安く交換する（アイサポ）</span>
              <span className="text-[11px] text-ink-mute">PR ›</span>
            </a>
            <Link href="/iphone/kaitori" className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-ground">
              <span className="text-sm font-bold">いまの iPhone の買取価格を3店で比べる</span>
              <span className="text-[11px] text-ink-mute">›</span>
            </Link>
            <Link href="/iphone" className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-ground">
              <span className="text-sm font-bold">中古iPhoneの相場を機種ごとに見る</span>
              <span className="text-[11px] text-ink-mute">›</span>
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-2 text-sm text-ink-sub leading-relaxed">
          <h2 className="text-lg md:text-xl font-bold text-ink">非正規で交換するときは</h2>
          <ul className="flex flex-col gap-1 text-[13px]">
            <li>・電池が Apple 純正でないことがある（<a href="https://support.apple.com/ja-jp/103269" target="_blank" rel="noopener" className={LINK}>Apple の案内</a>）</li>
            <li>・店が総務省の<a href="https://www.tele.soumu.go.jp/nintei/SearchServlet?pageID=ss01" target="_blank" rel="noopener" className={LINK}>登録修理業者</a>か確かめられる</li>
          </ul>
        </section>

        <VideoEmbed video={VIDEOS.battery} heading={VIDEOS.battery.heading} />

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
            <a href={APPLE_REPAIR_SOURCE.battery} target="_blank" rel="noopener" className={LINK}>Apple のバッテリー交換の料金</a>・
            <a href="https://support.apple.com/ja-jp/101575" target="_blank" rel="noopener" className={LINK}>iPhoneのバッテリーとパフォーマンス</a>・
            <a href="https://www.apple.com/jp/applecare/" target="_blank" rel="noopener" className={LINK}>AppleCare+</a>（Apple 公式）・
            <a href={AISAPO_SOURCE} target="_blank" rel="nofollow noopener" className={LINK}>アイサポのバッテリー交換の料金</a>・
            中古の相場は大手中古ショップの販売中の在庫、買取価格はネットオフ・にこスマ・モバステの表示。
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/iphone/how-long" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古iPhoneはいつまで使える？ &rarr;</Link>
            <Link href="/iphone/price-factors" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">どこにお金をかけるべき？（電池・容量・世代） &rarr;</Link>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
