import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { modelPagePath, modelToSlug, slugToModel } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import { BUYBACK_PROGRAMS } from "@/lib/buyback";
import { BUYBACK_SHOPS, type BuybackCell } from "@/lib/buybackPrices";
import { KAITORI_MIN_SHOPS, getModelBuyback, kaitoriModels, kaitoriPath, mainStorage, rebuyMedian, swapRows } from "@/lib/kaitoriModel";
import { SITE_NAME, SITE_URL, OG_BASE } from "@/lib/site";

/**
 * 機種ごとの買取価格（/iphone/<slug>/kaitori・2026-11-03〜・ユーザーが案A＋Bを選んだ。ideas/2026-11-03.md）。
 * A: 3店の買取価格（きれいな状態）を高い順に・容量ごとの表。B: いちばん高い店で売って、次の世代の中古に買い替えたときの差額。
 * 数字は lib/kaitoriModel.ts（買取は週1回・相場はビルドのたび）。一覧は /iphone/kaitori
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await kaitoriModels()).map(({ model }) => ({ slug: modelToSlug(model) }));
}

type Props = { params: Promise<{ slug: string }> };

const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";
const todayJa = () => new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });

async function pageData(model: string) {
  const rows = await getModelBuyback(model);
  const main = mainStorage(rows);
  const sorted = main ? [...main.cells].sort((a, b) => b.price - a.price) : [];
  const best = sorted[0] ?? null;
  const low = sorted[sorted.length - 1] ?? null;
  const [swaps, rebuy] = best && main ? await Promise.all([swapRows(model, best.price), rebuyMedian(model, main.storage)]) : [[], null];
  return { rows, main, sorted, best, low, swaps, rebuy };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const model = slugToModel(slug);
  if (!model) return {};
  const { rows, main, best } = await pageData(model);
  const path = kaitoriPath(model);
  // 検索結果で答えが見えるよう、いちばん高い店と金額をタイトルに（予算別・機種ページと同じ考え方）
  const title = best && main
    ? `${model}の買取価格は${best.shop}が${yen(best.price)}（${storageLabel(main.storage, model)}）｜${main.cells.length}店比較【毎週更新】`
    : `${model}の買取価格を店ごとに比較【毎週更新】`;
  const description = best && main
    ? `${model}（${storageLabel(main.storage, model)}・きれいな状態）の買取価格を${main.cells.map((c) => c.shop).join("・")}で比較。いちばん高いのは${best.shop}の${yen(best.price)}。売って新しいiPhoneに買い替えたときの差額も中古の相場で計算しています。`
    : `${model}の買取価格を店ごとに比較。`;
  const shops = Math.max(0, ...rows.map((r) => r.cells.length));
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OG_BASE, title: `${title} | ${SITE_NAME}`, description, url: path, images: [`${modelPagePath(model)}/opengraph-image`] },
    robots: shops < KAITORI_MIN_SHOPS ? { index: false, follow: true } : undefined,
  };
}

/** 買取の店へのリンク（一覧・機種ページと同じ rel・計測の属性） */
function SellLink({ cell, model, className = "", children }: { cell: BuybackCell; model: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={cell.href} target="_blank" rel={cell.linkType === "a8" ? "sponsored nofollow noopener" : "nofollow noopener"}
      data-shop-click="" data-shop={`${cell.shop}（買取）`} data-model={model} data-link-type={cell.linkType} data-placement="kaitori_model"
      className={className}>
      {children}
    </a>
  );
}

export default async function KaitoriModelPage({ params }: Props) {
  const { slug } = await params;
  const model = slugToModel(slug)!;
  const { rows, main, sorted, best, low, swaps, rebuy } = await pageData(model);
  const path = kaitoriPath(model);
  const date = todayJa();
  const st = main ? storageLabel(main.storage, model) : "";
  const shopsInTable = BUYBACK_SHOPS.filter((s) => rows.some((r) => r.cells.some((c) => c.shop === s.name)));

  // 冒頭の1文（機種ページ・予算別と同じ形: 日付・答え・数字。AI の引用向けに h1 の直後の最初の段落に1文だけ）
  const lead = best && main
    ? `${date}時点、${model}（${st}・きれいな状態）の買取価格は${best.shop}の${yen(best.price)}がいちばん高く${low && low !== best && low.price < best.price ? `、いちばん安い${low.shop}より${yen(best.price - low.price)}高い` : ""}。${rebuy !== null ? `同じ容量の中古の販売相場は${yen(rebuy)}。` : ""}`
    : `${model}の買取価格のデータはまだありません。`;
  const swapFirst = swaps[0];

  const faqs = [
    ...(best && main ? [{ q: `${model}はいくらで売れる？`, a: `${st}のきれいな状態で、${sorted.map((c) => `${c.shop} ${yen(c.price)}`).join("・")}です（${date}時点・店が表示している上限）。いちばん高いのは${best.shop}です。` }] : []),
    ...(best && swapFirst ? [{ q: `${model}を売って${swapFirst.model}に買い替えると、いくら足す？`, a: `${model}（${st}）を${best.shop}で${yen(best.price)}で売り、${swapFirst.model}を中古の相場（${swapFirst.storage !== null ? `${storageLabel(swapFirst.storage, swapFirst.model)}・` : ""}${yen(swapFirst.median)}）で買うと、差額は${yen(swapFirst.diff)}です（${date}時点）。` }] : []),
    { q: "表の値段で必ず売れる？", a: "いいえ。店が表示している上限の目安です。実際の査定は、傷・バッテリーの状態・付属品・ネットワーク利用制限などで下がります。ネットオフの値段は特典を含み、バッテリー最大容量85%以上が条件です。" },
    { q: "売る前にすることは？", a: "バックアップを取り、Apple Watch のペアリングを外し、「探す」をオフにしてサインアウトしてから、すべてのコンテンツと設定を消去します。「探す」がオンのまま（アクティベーションロック）だと買取できません。" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "iPhoneの買取価格", item: `${SITE_URL}/iphone/kaitori` },
        { "@type": "ListItem", position: 3, name: `${model}の買取価格`, item: `${SITE_URL}${path}` },
      ],
    },
    { "@context": "https://schema.org", "@type": "WebPage", name: `${model}の買取価格`, url: `${SITE_URL}${path}`, description: lead, dateModified: new Date().toISOString() },
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
            <Link href="/iphone/kaitori" className="hover:text-brand-800">iPhoneの買取価格</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">{model}</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">{model}の買取価格を{main ? `${main.cells.length}店で` : ""}比較</h1>
          <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">{lead}</p>
          <p className="text-[11px] md:text-xs text-ink-mute">
            <span className="inline-block mr-1 px-1 py-px rounded border border-line font-bold">PR</span>
            広告を含みます（ネットオフ・モバステのリンクは A8.net 経由）
          </p>
        </div>

        {/* A: 比べる容量の3店を高い順に（いちばん高い店は赤） */}
        {main && sorted.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold">{st}を売るなら（きれいな状態）</h2>
            <div className={`${CARD} px-3.5 divide-y divide-line-soft`}>
              {sorted.map((c, i) => (
                <SellLink key={c.shop} cell={c} model={model} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center py-3 hover:bg-ground">
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-bold">{c.shop}</span>
                    <span className="text-[11px] text-ink-mute">{c.label}</span>
                  </span>
                  <span className={`text-lg font-bold tabular-nums ${i === 0 && sorted.length > 1 ? "text-price" : "text-ink"}`}>{yen(c.price)}</span>
                  <span className="text-xs font-bold text-white bg-brand-600 rounded-lg px-2.5 py-1.5">売る ›</span>
                </SellLink>
              ))}
            </div>
          </section>
        )}

        {/* B: 売って買い替えると（次の世代から3つ先まで。中古の相場 − いちばん高い売値） */}
        {best && swaps.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold">{model}（{st}）を売って買い替えると</h2>
            <p className="text-[13px] text-ink-sub leading-relaxed">いちばん高い{best.shop}で売ると <b className="text-price">{yen(best.price)}</b>。中古の相場で買い替えたときに足す金額は：</p>
            <div className={`${CARD} px-3.5 divide-y divide-line-soft`}>
              {swaps.map((w) => (
                <Link key={w.model} href={modelPagePath(w.model)} className="grid grid-cols-[1fr_auto] gap-x-3 py-2.5 hover:bg-ground">
                  <span className="text-sm font-bold text-brand-600">{w.model}{w.storage !== null && <span className="ml-1 text-[11px] font-normal text-ink-mute">{storageLabel(w.storage, w.model)}</span>} ›</span>
                  <span className="text-lg font-bold tabular-nums text-right">{w.diff >= 0 ? `+${yen(w.diff)}` : `−${yen(-w.diff)}`}</span>
                  <span className="col-span-2 text-[11px] text-ink-mute tabular-nums">相場 {yen(w.median)} − 売値 {yen(best.price)}</span>
                </Link>
              ))}
            </div>
            {rebuy !== null && (
              <div className="bg-[#FFFBEB] border border-[#F5E1A4] rounded-xl px-3.5 py-3 text-[13px] leading-relaxed">
                <p className="font-bold text-[#92400E] text-xs mb-0.5">検品担当のひと言</p>
                同じ{model}（{st}）を中古で買い直すと相場 {yen(rebuy)}。売値との差 {yen(rebuy - best.price)} が、店の取り分（検品・保証・送料など）の目安です。
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <SellLink cell={best} model={model} className="sm:flex-1 h-12 shrink-0 rounded-xl bg-brand-600 hover:bg-brand-800 text-white flex items-center justify-center text-sm font-bold">
                {best.shop}で{model}を売る ›
              </SellLink>
              {swapFirst && (
                <Link href={modelPagePath(swapFirst.model)} className="sm:flex-1 h-12 shrink-0 rounded-xl border border-brand-600 text-brand-600 hover:bg-brand-50 flex items-center justify-center text-sm font-bold">
                  {swapFirst.model}の中古在庫を見る ›
                </Link>
              )}
            </div>
            <p className="text-[11px] text-ink-mute leading-relaxed">相場＝在庫がいちばん多い容量の中央値（毎日更新・在庫5件以上）。買取＝店が表示している上限（週1回）。</p>
          </section>
        )}

        {/* 容量ごとの表（スマホでもはみ出さないよう、値段は「円」を外して3店まで） */}
        {rows.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold">容量ごとの買取価格</h2>
            <div className={`${CARD} px-3.5 py-1 overflow-x-auto`}>
              <table className="w-full text-[13px] tabular-nums">
                <thead>
                  <tr className="text-[11px] text-ink-mute">
                    <th className="text-left font-normal py-2">容量</th>
                    {shopsInTable.map((s) => <th key={s.name} className="text-right font-normal py-2">{s.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.storage} className="border-t border-line-soft">
                      <td className="py-2 font-bold">{storageLabel(r.storage, model)}</td>
                      {shopsInTable.map((s) => {
                        const c = r.cells.find((x) => x.shop === s.name);
                        const top = c && r.best && c.price === r.best.price && r.cells.length > 1;
                        return (
                          <td key={s.name} className="py-2 text-right">
                            {c ? <SellLink cell={c} model={model} className={`${top ? "text-price font-bold" : "text-ink"} hover:underline`}>{c.price.toLocaleString()}</SellLink> : <span className="text-ink-mute">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-ink-mute leading-relaxed">単位は円。店が表示している上限（{date}時点・週1回取得）。赤い値がその容量でいちばん高い店。区分はネットオフ「美品」・にこスマ「良品」・モバステ「中古の上限」。実際の査定は状態で下がります。</p>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">ほかの買取店</h2>
          <div className={`${CARD} divide-y divide-line-soft`}>
            {BUYBACK_PROGRAMS.filter((p) => !BUYBACK_SHOPS.some((s) => s.name === p.name)).map((p) => (
              <a key={p.name} href={p.href} target="_blank" rel="sponsored nofollow noopener" data-shop-click="" data-shop={`${p.name}（買取）`} data-model={model} data-link-type="a8" data-placement="kaitori_model"
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
            <a href="https://pastec.net/iphone" target="_blank" rel="nofollow noopener" className={LINK}>モバステ（パステック）</a>の買取価格の表示（{date}時点）。中古の相場は大手中古ショップの在庫の中央値。
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Link href={modelPagePath(model)} className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">{model}の中古の相場・最安値 &rarr;</Link>
            <Link href="/iphone/kaitori" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">ほかの iPhone の買取価格 &rarr;</Link>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
