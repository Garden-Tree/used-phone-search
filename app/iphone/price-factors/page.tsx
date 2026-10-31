import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import VideoEmbed from "@/app/components/VideoEmbed";
import { VIDEOS } from "@/lib/videos";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import { activeShops } from "@/lib/activeShops";
import { APPLE_REPAIR_CHECKED, APPLE_REPAIR_SOURCE } from "@/lib/appleRepairPrices";
import { factorTiles, getPriceFactors } from "@/lib/priceFactors";
import { LAUNCH_PRICES, LAUNCH_PRICES_CHECKED } from "@/lib/launchPrices";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古iPhoneの値段は何で決まる？（2026-10-23〜）: 同じ機種・同じ容量で電池・状態ランク・容量・世代を1つだけ変えたときの相場の差。
 * 「中古iPhone バッテリー 何%」「状態ランク 違い」などの検索と、AI の概要の関連する問いに答える常設ページ。数字は lib/priceFactors.ts
 */
const TITLE = "中古iPhoneの値段は何で決まる？電池・状態ランク・容量・世代の差【毎日更新】";
const PATH = "/iphone/price-factors";

export async function generateMetadata(): Promise<Metadata> {
  const description = `中古iPhoneの相場が、電池90%台と80%台・状態ランクAとC・容量・1世代前でいくら違うかを、大手中古ショップ${(await activeShops()).length}社の在庫で毎日集計。お金をかけるところと妥協していいところが分かります。`;
  return { title: TITLE, description, alternates: { canonical: PATH }, openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: PATH } };
}

const CARD = "bg-white rounded-xl border border-line overflow-x-auto";
const TH = "font-semibold px-2 py-2 text-right";
const TD = "px-2 py-2.5 text-right whitespace-nowrap";
const short = (m: string) => m.replace(/^iPhone\s+/, "");
const man = (n: number) => `約${(Math.round(n / 1000) / 10).toFixed(1)}万円`;
const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

function ModelLink({ model }: { model: string }) {
  return <Link href={modelPagePath(model)} className="font-bold text-ink hover:text-brand-800 whitespace-nowrap">{model}</Link>;
}

export default async function PriceFactorsPage() {
  const shopNum = (await activeShops()).length;
  const f = await getPriceFactors();
  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });

  // 冒頭の4つの数字（OG 画像と共通。lib/priceFactors.ts の factorTiles）
  const tiles = factorTiles(f);
  // 要約の1文（構造化データの説明。画面ではタイルで同じ数字を出す）
  const parts = [
    f.gen.length ? `1世代前にすると平均${man(avg(f.gen.map((r) => r.diff)))}安く` : null,
    f.rank.length ? `状態ランクをAからCにすると平均${man(avg(f.rank.map((r) => r.diff)))}安く` : null,
    f.storage.length ? `容量を1つ上げると平均${man(avg(f.storage.map((r) => r.diff)))}高く` : null,
    f.battery.length ? `電池を80%台から90%台にすると平均${man(avg(f.battery.map((r) => r.diff)))}高く` : null,
  ].filter(Boolean);
  const summary = parts.length ? `${today}時点、同じ機種・同じ容量で比べると、中古iPhoneの相場は${parts.join("、")}なります（大手中古ショップ${shopNum}社の在庫の中央値）。` : null;
  const batteryCheaper = f.battery.filter((r) => r.repair !== null && r.diff < r.repair!);

  // 128GBで足りる？: 容量の内訳（64・128・256・512・1TB以上・それ以外）と 128→256GB の差
  const shareOf = (pred: (gb: number) => boolean) => f.share.filter((r) => pred(r.storage)).reduce((a, r) => a + r.count, 0);
  const pct = (n: number) => (f.shareTotal ? Math.round((n / f.shareTotal) * 100) : 0);
  const shareRows = [
    { label: "64GB", count: shareOf((g) => g === 64) },
    { label: "128GB", count: shareOf((g) => g === 128) },
    { label: "256GB", count: shareOf((g) => g === 256) },
    { label: "512GB", count: shareOf((g) => g === 512) },
    { label: "1TB以上", count: shareOf((g) => g >= 1024) },
    { label: "その他", count: shareOf((g) => ![64, 128, 256, 512].includes(g) && g < 1024) },
  ].filter((r) => r.count > 0);
  const gapUnder = f.gap128.filter((r) => r.diff < 10000);
  // 新品が256GBからの機種（Apple Newsroom の発表時の値段。lib/launchPrices.ts）: 2025年秋以降の発表
  const from256 = Object.entries(LAUNCH_PRICES).filter(([, l]) => l.date >= "2025-09-01" && l.storage === 256).map(([m]) => short(m));
  const storageAnswer = f.gap128.length
    ? `中古iPhoneの128GBと256GBの相場の差は、${f.gap128.length}機種中${gapUnder.length}機種で1万円未満です（${today}時点）。迷ったら256GB、写真をクラウドに置く人やアプリが少ない人は128GBでも足ります。`
    : null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
        { "@type": "ListItem", position: 3, name: "値段は何で決まる？", item: `${SITE_URL}${PATH}` },
      ],
    },
    ...(summary ? [{ "@context": "https://schema.org", "@type": "WebPage", name: TITLE, url: `${SITE_URL}${PATH}`, description: `${summary}${storageAnswer ?? ""}`, dateModified: new Date().toISOString() }] : []),
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="値段は何で決まる？" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-8">
        <div>
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/iphone" className="hover:text-brand-800">中古iPhoneの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">値段は何で決まる？</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">中古iPhoneの値段は何で決まる？</h1>
          <p className="text-sm text-ink-sub">
            同じ機種・同じ容量で、1つだけ変えたときの相場の差（平均・{today}時点）。
          </p>
          {tiles.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {tiles.map((t) => (
                <div key={t.label} className="bg-white rounded-xl border border-line p-3 flex flex-col gap-0.5">
                  <span className="text-[12px] text-ink-mute">{t.label}</span>
                  <span className={`text-xl font-bold ${t.tone === "save" ? "text-safe" : "text-ink"}`}>{t.value}</span>
                  <span className="text-[11px] text-ink-mute">{t.note}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm mt-3">節約は<strong>世代とランク</strong>で。<strong>容量と電池</strong>は差が小さいのでケチらない。</p>
        </div>

        {f.gen.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>1世代前にすると、いくら安い？</h2>
            <p className="text-sm text-ink-sub"><strong className="text-price mr-1">A.</strong>差がいちばん大きい。予算が足りないときは<strong className="text-ink">まず1世代下げる</strong>。</p>
            <div className={CARD}>
              <table className="w-full text-sm">
                <thead className="bg-ground text-xs text-ink-mute"><tr><th className="text-left font-semibold pl-4 pr-2 py-2">比べた組</th><th className={TH}>容量</th><th className={TH}>新しい方</th><th className={TH}>1世代前</th><th className={`${TH} pr-4`}>差</th></tr></thead>
                <tbody>
                  {[...f.gen].sort((a, b) => b.diff - a.diff).map((r) => (
                    <tr key={r.newer} className="border-t border-line-soft">
                      <td className="pl-4 pr-2 py-2.5"><ModelLink model={r.newer} /> → <Link href={modelPagePath(r.older)} className="text-brand-600 hover:text-brand-800">{short(r.older)}</Link></td>
                      <td className={`${TD} text-ink-mute`}>{storageLabel(r.storage, r.newer)}</td>
                      <td className={TD}>{yen(r.newerMedian)}</td>
                      <td className={TD}>{yen(r.olderMedian)}</td>
                      <td className={`${TD} pr-4 font-bold ${r.diff > 0 ? "text-safe" : "text-ink-mute"}`}>{r.diff > 0 ? `−${r.diff.toLocaleString()}円` : `+${(-r.diff).toLocaleString()}円`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {f.rank.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>状態ランクAとCで、いくら違う？</h2>
            <p className="text-sm text-ink-sub"><strong className="text-price mr-1">A.</strong>差は主に<strong className="text-ink">外装の傷</strong>。ケースを使うならCでも十分です（基準は店ごとに違います）。</p>
            <div className={CARD}>
              <table className="w-full text-sm">
                <thead className="bg-ground text-xs text-ink-mute"><tr><th className="text-left font-semibold pl-4 pr-2 py-2">機種</th><th className={TH}>容量</th><th className={TH}>ランクA</th><th className={TH}>B</th><th className={TH}>C</th><th className={`${TH} pr-4`}>A→C</th></tr></thead>
                <tbody>
                  {f.rank.map((r) => (
                    <tr key={r.model} className="border-t border-line-soft">
                      <td className="pl-4 pr-2 py-2.5"><ModelLink model={r.model} /></td>
                      <td className={`${TD} text-ink-mute`}>{storageLabel(r.storage, r.model)}</td>
                      <td className={TD}>{yen(r.a)}</td>
                      <td className={TD}>{yen(r.b)}</td>
                      <td className={TD}>{yen(r.c)}</td>
                      <td className={`${TD} pr-4 font-bold ${r.diff > 0 ? "text-safe" : "text-ink-mute"}`}>{r.diff > 0 ? `−${r.diff.toLocaleString()}円` : "差なし"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {f.storage.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>容量を1つ上げると、いくら高い？</h2>
            <p className="text-sm text-ink-sub"><strong className="text-price mr-1">A.</strong>容量は<strong className="text-ink">あとから増やせません</strong>。写真やゲームが多いなら上げておくと安心です。</p>
            <div className={CARD}>
              <table className="w-full text-sm">
                <thead className="bg-ground text-xs text-ink-mute"><tr><th className="text-left font-semibold pl-4 pr-2 py-2">機種</th><th className={TH}>小さい容量</th><th className={TH}>1つ上</th><th className={`${TH} pr-4`}>差</th></tr></thead>
                <tbody>
                  {[...f.storage].sort((a, b) => a.diff - b.diff).map((r) => (
                    <tr key={r.model} className="border-t border-line-soft">
                      <td className="pl-4 pr-2 py-2.5"><ModelLink model={r.model} /></td>
                      <td className={TD}>{storageLabel(r.from, r.model)} {yen(r.fromMedian)}</td>
                      <td className={TD}>{storageLabel(r.to, r.model)} {yen(r.toMedian)}</td>
                      <td className={`${TD} pr-4 font-bold`}>{r.diff >= 0 ? "+" : "−"}{Math.abs(r.diff).toLocaleString()}円</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(f.gap128.length > 0 || f.shareTotal > 0) && (
          <section id="128gb" className="flex flex-col gap-2 scroll-mt-16">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>128GBで足りる？</h2>
            <p className="text-sm text-ink-sub">
              <strong className="text-price mr-1">A.</strong>
              {f.gap128.length > 0
                ? <>128GBと256GBの相場の差は、{f.gap128.length}機種中<strong className="text-ink">{gapUnder.length}機種で1万円未満</strong>。<strong className="text-ink">迷ったら256GB</strong>。写真をクラウドに置く人・アプリが少ない人は128GBでも足ります。</>
                : <>容量はあとから増やせません。迷ったら1つ上の容量を。</>}
            </p>
            {f.shareTotal > 0 && (
              <div className={CARD}>
                <table className="w-full text-sm">
                  <caption className="text-left text-xs text-ink-mute px-4 pt-3 pb-1">販売中の中古iPhone {f.shareTotal.toLocaleString()}件の容量の内訳</caption>
                  <thead className="bg-ground text-xs text-ink-mute"><tr><th className="text-left font-semibold pl-4 pr-2 py-2">容量</th><th className={TH}>在庫</th><th className={`${TH} pr-4`}>割合</th></tr></thead>
                  <tbody>
                    {shareRows.map((r) => (
                      <tr key={r.label} className="border-t border-line-soft">
                        <td className="pl-4 pr-2 py-2.5 font-bold">{r.label}</td>
                        <td className={TD}>{r.count.toLocaleString()}件</td>
                        <td className={`${TD} pr-4 ${r.label === "128GB" ? "font-bold" : ""}`}>{pct(r.count)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {f.gap128.length > 0 && (
              <div className={CARD}>
                <table className="w-full text-sm">
                  <caption className="text-left text-xs text-ink-mute px-4 pt-3 pb-1">128GB→256GB の相場（中央値）の差</caption>
                  <thead className="bg-ground text-xs text-ink-mute"><tr><th className="text-left font-semibold pl-4 pr-2 py-2">機種</th><th className={TH}>128GB</th><th className={TH}>256GB</th><th className={`${TH} pr-4`}>差</th></tr></thead>
                  <tbody>
                    {[...f.gap128].sort((a, b) => a.diff - b.diff).map((r) => (
                      <tr key={r.model} className="border-t border-line-soft">
                        <td className="pl-4 pr-2 py-2.5"><ModelLink model={r.model} /></td>
                        <td className={TD}>{yen(r.fromMedian)}</td>
                        <td className={TD}>{yen(r.toMedian)}</td>
                        <td className={`${TD} pr-4 font-bold ${r.diff < 10000 ? "text-safe" : ""}`}>{r.diff >= 0 ? "+" : "−"}{Math.abs(r.diff).toLocaleString()}円</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-ink-mute leading-relaxed">
              容量の内訳はジャンク品も含む販売中の在庫。差は両方の容量の在庫が5件以上の機種だけ。
              {from256.length > 0 && <>{from256.join("・")}は新品が256GBからで、128GBがありません（<a href="https://www.apple.com/jp/newsroom/" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline underline-offset-2">Apple Newsroom</a> の発表時の値段・{LAUNCH_PRICES_CHECKED.replace(/-/g, "/")}確認）。</>}
            </p>
          </section>
        )}

        {/* 容量の横動画（10/31 公開）。「128GBで足りる？」の後に */}
        <VideoEmbed video={VIDEOS.storage128} />

        {f.battery.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>電池90%台と80%台で、いくら違う？</h2>
            <p className="text-sm text-ink-sub">
              <strong className="text-price mr-1">A.</strong>
              {batteryCheaper.length > 0
                ? <>{batteryCheaper.length}機種で、差が電池交換より小さい。<strong className="text-ink">最初から90%台を選ぶほうが安く済みます</strong>。</>
                : "電池の差と、Apple の電池交換の料金を比べて選ぶのがおすすめです。"}
            </p>
            <div className={CARD}>
              <table className="w-full text-sm">
                <thead className="bg-ground text-xs text-ink-mute"><tr><th className="text-left font-semibold pl-4 pr-2 py-2">機種</th><th className={TH}>容量</th><th className={TH}>80%台</th><th className={TH}>90%台</th><th className={TH}>差</th><th className={`${TH} pr-4`}>電池交換</th></tr></thead>
                <tbody>
                  {f.battery.map((r) => (
                    <tr key={r.model} className="border-t border-line-soft">
                      <td className="pl-4 pr-2 py-2.5"><ModelLink model={r.model} /></td>
                      <td className={`${TD} text-ink-mute`}>{storageLabel(r.storage, r.model)}</td>
                      <td className={TD}>{yen(r.lo)}<span className="block text-[10px] text-ink-mute">{r.loCount}件</span></td>
                      <td className={TD}>{yen(r.hi)}<span className="block text-[10px] text-ink-mute">{r.hiCount}件</span></td>
                      <td className={`${TD} font-bold`}>{r.diff >= 0 ? "+" : "−"}{Math.abs(r.diff).toLocaleString()}円</td>
                      <td className={`${TD} pr-4 text-ink-mute`}>{r.repair !== null ? yen(r.repair) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-mute">
              電池は、%を数字で出している店の在庫だけで比べています（90%台＝90〜99%、80%台＝81〜89%。「80%以上」とだけ書く店と100%は除く）。
              電池交換は <a href={APPLE_REPAIR_SOURCE.battery} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline underline-offset-2">Apple 公式</a>の保証対象外の料金（税込・{APPLE_REPAIR_CHECKED.replace(/-/g, "/")}確認）。
            </p>
          </section>
        )}

        {/* 同じテーマの横動画（10/23 公開） */}
        <VideoEmbed video={VIDEOS.priceFactors} />

        <section className="flex flex-col gap-2 text-sm text-ink-sub">
          <h2 className="text-lg font-bold text-ink">データの出典</h2>
          <p className="leading-relaxed text-[13px]">
            大手中古ショップ{shopNum}社の販売中の在庫（1日4回取得）の中央値。比べるそれぞれの在庫が5件以上の機種だけ。ランクは各店の表記のまま（未使用品のS・D・ジャンクは除く）。
            <Link href="/about#data" className="text-brand-600 underline underline-offset-2">詳しく</Link>
          </p>
          <p><Link href="/iphone" className="font-bold text-brand-600 hover:underline underline-offset-4">中古iPhoneの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
