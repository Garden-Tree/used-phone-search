import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import VideoEmbed from "@/app/components/VideoEmbed";
import SimTile from "@/app/components/SimTile";
import { VIDEOS } from "@/lib/videos";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import { getWhereToBuy } from "@/lib/whereToBuy";
import type { Shop } from "@/lib/shops";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古iPhoneはどこで買う？（2026-10-24〜）: 店ごとの在庫数・最安になっている機種の数・電池の書き方・保証を数字の表で比べる。
 * 「中古iPhone どこで買う／おすすめ 店」の検索向け。特定の店は推さない（並びは在庫数の多い順）。数字は lib/whereToBuy.ts、店の情報は lib/shops.ts
 */
const PATH = "/iphone/where-to-buy";

const titleOf = (n: number) => `中古iPhoneはどこで買う？大手${n}店を在庫・保証・電池表記で比較【毎日更新】`;

export async function generateMetadata(): Promise<Metadata> {
  const w = await getWhereToBuy();
  const title = titleOf(w.shops.length);
  const description = `中古iPhoneを扱う大手中古ショップ${w.shops.length}店の在庫${w.total.toLocaleString()}件を毎日集計。店ごとの在庫数・最安値になっている機種の数・バッテリーの書き方・保証と赤ロム保証を表で比べます。`;
  return {
    title,
    description,
    alternates: { canonical: PATH },
    // openGraph を上書きすると親の OGP 画像が引き継がれないので、/iphone の画像を明示する
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: PATH, images: ["/iphone/opengraph-image"] },
  };
}

const CARD = "bg-white rounded-xl border border-line overflow-x-auto";
const TH = "font-semibold px-2 py-2 text-right";
const TD = "px-2 py-2.5 text-right whitespace-nowrap";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";

/** 電池の書き方（lib/shops.ts の battery）。none は「取り込めていない」なので「書いていない」とは言わない */
const BATTERY: Record<Shop["battery"], { label: string; tone: string }> = {
  exact: { label: "%で表示", tone: "text-safe font-bold" },
  over80: { label: "80%以上など", tone: "text-ink" },
  none: { label: "商品ページで確認", tone: "text-ink-mute" },
};

const shopSearch = (shop: Shop, extra: Record<string, string> = {}) =>
  `/search?${new URLSearchParams({ device: "iphone", shop: shop.name, ...extra }).toString()}`;

/** 保証・赤ロムの短い表記。lib/shops.ts に記載がなければ公式へのリンク */
function GuaranteeCell({ text, shop }: { text: string; shop: Shop }) {
  if (/記載なし/.test(text)) {
    return <a href={shop.guaranteeUrl} target="_blank" rel="noopener noreferrer" className={LINK}>各店の公式で確認</a>;
  }
  return <>{text}</>;
}

const joinLabels = (shops: Shop[]) => shops.map((s) => s.label).join("・");

export default async function WhereToBuyPage() {
  const w = await getWhereToBuy();
  const n = w.shops.length;
  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const title = titleOf(n);

  // 冒頭の答え（その日の集計から）
  const maxCheap = Math.max(0, ...w.shops.map((r) => r.cheapestModels));
  const cheapLeaders = w.shops.filter((r) => maxCheap > 0 && r.cheapestModels === maxCheap).map((r) => r.shop);
  const exactShops = w.shops.filter((r) => r.shop.battery === "exact").map((r) => r.shop);
  const longWarranty = w.shops.filter((r) => /1年/.test(r.shop.warrantyShort)).map((r) => r.shop);
  const redRomShops = w.shops.filter((r) => !/記載なし/.test(r.shop.redRom)).map((r) => r.shop);
  // 表2: 1位と表に出した最後の店の最安値の差（機種ごと）の幅
  const spreads = w.popular.filter((p) => p.shops.length >= 2).map((p) => p.shops[p.shops.length - 1].minPrice - p.shops[0].minPrice);

  const summary = n > 0
    ? `${today}時点、中古iPhoneを扱う大手中古ショップ${n}店の在庫${w.total.toLocaleString()}件を集計。` +
      (cheapLeaders.length ? `最安値になっている機種がいちばん多いのは${joinLabels(cheapLeaders)}（${w.modelsCompared}機種中${maxCheap}機種）、` : "") +
      `バッテリーを%で表示しているのは${exactShops.length}店、赤ロム保証を書いているのは${redRomShops.length}店です。`
    : null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
        { "@type": "ListItem", position: 3, name: "どこで買う？", item: `${SITE_URL}${PATH}` },
      ],
    },
    ...(summary ? [{ "@context": "https://schema.org", "@type": "WebPage", name: title, url: `${SITE_URL}${PATH}`, description: summary, dateModified: new Date().toISOString() }] : []),
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="どこで買う？" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-8">
        <div>
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/iphone" className="hover:text-brand-800">中古iPhoneの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">どこで買う？</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">中古iPhoneはどこで買う？</h1>
          <p className="text-sm text-ink-sub">
            大手中古ショップ{n}店の iPhone の在庫（{w.total.toLocaleString()}件・{today}時点）を、店ごとに数字で比べました。特定の店はおすすめしません。目的に合う店を選んでください。
          </p>
          <p className="text-[11px] md:text-xs text-ink-mute leading-relaxed mt-2">
            <span className="inline-block mr-1 px-1 py-px rounded border border-line font-bold">PR</span>
            本ページはアフィリエイト広告を利用しています
          </p>
          {n > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-white rounded-xl border border-line p-3 flex flex-col gap-0.5">
                <span className="text-[12px] text-ink-mute">比べた店</span>
                <span className="text-xl font-bold">{n}店</span>
                <span className="text-[11px] text-ink-mute">iPhone の在庫がある店</span>
              </div>
              <div className="bg-white rounded-xl border border-line p-3 flex flex-col gap-0.5">
                <span className="text-[12px] text-ink-mute">電池を%で表示</span>
                <span className="text-xl font-bold text-safe">{exactShops.length}店</span>
                <span className="text-[11px] text-ink-mute">状態で選ぶなら</span>
              </div>
              <div className="bg-white rounded-xl border border-line p-3 flex flex-col gap-0.5">
                <span className="text-[12px] text-ink-mute">赤ロム保証を記載</span>
                <span className="text-xl font-bold">{redRomShops.length}店</span>
                <span className="text-[11px] text-ink-mute">{n}店のうち</span>
              </div>
            </div>
          )}
        </div>

        {n > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>結局、どの店で買えばいい？</h2>
            <ul className="text-sm text-ink-sub flex flex-col gap-2 leading-relaxed">
              {cheapLeaders.length > 0 && (
                <li>
                  <strong className="text-price mr-1">A.</strong><strong className="text-ink">安さ</strong>で選ぶなら、最安値になっている機種が多い店（{today}は<strong className="text-ink">{joinLabels(cheapLeaders)}</strong>が{w.modelsCompared}機種中{maxCheap}機種）。ただし機種ごとに入れ替わるので、買う機種のページで店ごとの最安値を確かめてください。
                </li>
              )}
              {exactShops.length > 0 && (
                <li>
                  <strong className="text-price mr-1">A.</strong><strong className="text-ink">電池の状態</strong>で選ぶなら、バッテリー最大容量を%で表示している店（{joinLabels(exactShops)}）。同じ値段でも%の高い個体を選べます。
                </li>
              )}
              <li>
                <strong className="text-price mr-1">A.</strong><strong className="text-ink">保証</strong>で選ぶなら、期間と中身（返品・返金・交換）が店ごとに大きく違うので下の表で確認を。
                {longWarranty.length > 0 && <>1年の返品・返金を付けている店もあります（{joinLabels(longWarranty)}）。</>}
              </li>
            </ul>
          </section>
        )}

        {n > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold">店ごとの比較</h2>
            <p className="text-sm text-ink-sub">並びは <strong className="text-ink">iPhone の在庫数の多い順</strong>（おすすめ順ではありません）。店名の下は売り場。店名から、その店の iPhone の在庫を検索できます。</p>
            <div className={CARD}>
              <table className="w-full text-sm">
                <thead className="bg-ground text-xs text-ink-mute">
                  <tr>
                    <th className="text-left font-semibold pl-4 pr-2 py-2">店</th>
                    <th className={TH}>在庫</th>
                    <th className={TH}>最安の機種</th>
                    <th className="text-left font-semibold px-2 py-2">電池</th>
                    <th className="text-left font-semibold px-2 py-2">保証</th>
                    <th className="text-left font-semibold px-2 py-2 pr-4">赤ロム</th>
                  </tr>
                </thead>
                <tbody>
                  {w.shops.map((r) => (
                    <tr key={r.shop.name} className="border-t border-line-soft">
                      <td className="pl-4 pr-2 py-2.5">
                        <Link href={shopSearch(r.shop)} className="font-bold text-ink hover:text-brand-800 whitespace-nowrap">{r.shop.label}</Link>
                        <span className="block text-[10px] text-ink-mute whitespace-nowrap">{r.channels.join("・")}</span>
                      </td>
                      <td className={TD}>{r.count.toLocaleString()}件</td>
                      <td className={`${TD} ${r.cheapestModels > 0 ? "font-bold" : "text-ink-mute"}`}>{r.cheapestModels}機種</td>
                      <td className={`px-2 py-2.5 whitespace-nowrap ${BATTERY[r.shop.battery].tone}`}>{BATTERY[r.shop.battery].label}</td>
                      <td className="px-2 py-2.5 whitespace-nowrap"><GuaranteeCell text={r.shop.warrantyShort} shop={r.shop} /></td>
                      <td className="px-2 py-2.5 pr-4 whitespace-nowrap"><GuaranteeCell text={r.shop.redRomShort} shop={r.shop} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-mute leading-relaxed">
              在庫はジャンク品を除く販売中の iPhone。最安の機種＝在庫5件以上の{w.modelsCompared}機種それぞれで、在庫がいちばん多い容量の最安値を出している店（同じ値段なら両方）。
              電池の「80%以上など」は「80%以上」「80%未満」とだけ書く店、「商品ページで確認」はこのサイトで%を取り込めていない店です。
            </p>
            <details className="rounded-xl bg-ground p-4 text-sm text-ink-sub">
              <summary className="font-bold text-ink-sub cursor-pointer">保証・赤ロム保証の詳しい内容</summary>
              <ul className="mt-2 flex flex-col gap-2 text-[13px] leading-relaxed">
                {w.shops.map((r) => (
                  <li key={r.shop.name}>
                    <a href={r.shop.guaranteeUrl} target="_blank" rel="noopener noreferrer" className={`font-bold ${LINK}`}>{r.shop.label}</a>
                    {r.shop.note && <span className="text-[11px] text-ink-mute ml-1">{r.shop.note}</span>}
                    <span className="block">保証: {r.shop.warranty}／赤ロム: {r.shop.redRom}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-ink-mute">各店の公式ページ（店名のリンク）で確認した内容です。条件は変わることがあるので、買う前に各店でも確認してください。</p>
            </details>
          </section>
        )}

        {w.popular.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1">Q.</span>よく見る機種で、どの店が安い？</h2>
            <p className="text-sm text-ink-sub"><strong className="text-price mr-1">A.</strong>{spreads.length > 0
                ? <>同じ機種・同じ容量でも、表の1位と最後の店で最安値は<strong className="text-ink">{Math.min(...spreads).toLocaleString()}〜{Math.max(...spreads).toLocaleString()}円</strong>違います。</>
                : "同じ機種・同じ容量でも、店によって最安値は違います。"}
              安い店は機種ごとに入れ替わります（在庫がいちばん多い容量の、店ごとの最安値・安い順に5店まで）。</p>
            <div className="grid md:grid-cols-2 gap-3">
              {w.popular.map((p) => (
                <div key={p.model} className={CARD}>
                  <div className="flex items-baseline justify-between gap-2 px-4 pt-3 pb-2">
                    <Link href={modelPagePath(p.model)} className="font-bold text-ink hover:text-brand-800">{p.model}<span className="text-ink-mute font-normal text-xs ml-1">{storageLabel(p.storage, p.model)}</span></Link>
                    <span className="text-[11px] text-ink-mute whitespace-nowrap">{p.total.toLocaleString()}件・{p.shopCount}店</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {p.shops.map((s, i) => (
                        <tr key={s.shop.name} className="border-t border-line-soft">
                          <td className="pl-4 pr-2 py-2 text-ink-mute w-6">{i + 1}</td>
                          <td className="px-2 py-2">
                            <Link href={shopSearch(s.shop, { model: p.model, storage: String(p.storage) })} className="text-brand-600 hover:text-brand-800 whitespace-nowrap">{s.shop.label}</Link>
                          </td>
                          <td className={`${TD} py-2 text-[11px] text-ink-mute`}>{s.count.toLocaleString()}件</td>
                          <td className={`${TD} py-2 pr-4 font-bold ${i === 0 ? "text-price" : ""}`}>{yen(s.minPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-lg md:text-xl font-bold">店を選ぶときに見るところ</h2>
          <div className="flex flex-col gap-3 text-sm text-ink-sub leading-relaxed">
            <div>
              <h3 className="font-bold text-ink">電池は「%で書く店」と「書き方がざっくりの店」がある</h3>
              <p>
                バッテリー最大容量は、多くの店で値段にあまり反映されていません。%で表示している店なら、同じ値段で%の高い個体を選べます。
                「80%以上」とだけ書く店は、85%も99%も同じ表記です。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-ink">状態ランクは店ごとに基準が違う</h3>
              <p>
                ランクは主に<strong className="text-ink">外装の傷</strong>の話で、A・B・C の基準は店ごとに違います。違う店のランクAどうしが同じ状態とは限りません。傷はケースで隠れるので、ランクは値段を下げる理由と考えるのがおすすめです。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-ink">保証と赤ロム保証</h3>
              <p>
                保証は期間も中身（初期不良だけ・返品・返金・交換）も店ごとに違います。{longWarranty.length > 0 && "1年の返品・返金を付けている店もあります。"}赤ロム（ネットワーク利用制限が「×」になる）の保証は大手の多くが付けていて、フリマにはありません。
              </p>
            </div>
            <p><Link href="/iphone/price-factors" className="font-bold text-brand-600 hover:underline underline-offset-4">電池・状態ランク・容量・世代で、値段はいくら違う？ &rarr;</Link></p>
          </div>
        </section>

        {/* 同じテーマの横動画（10/24 公開） */}
        <VideoEmbed video={VIDEOS.whereToBuy} />

        {/* 回線のタイル（PR）。本文の終わり・出典の前 */}
        {n > 0 && <SimTile className="md:max-w-md" />}

        <section className="flex flex-col gap-2 text-sm text-ink-sub">
          <h2 className="text-lg font-bold text-ink">データの出典</h2>
          <p className="leading-relaxed text-[13px]">
            大手中古ショップ{n}店の販売中の iPhone の在庫（1日4回取得・ジャンク品を除く）。同じ会社の別の売り場（イオシスの楽天市場店など）は本店にまとめています。
            電池の書き方・保証は各店の公式ページで確認した内容です。
            <Link href="/about#data" className="text-brand-600 underline underline-offset-2">詳しく</Link>
          </p>
          <p><Link href="/iphone" className="font-bold text-brand-600 hover:underline underline-offset-4">中古iPhoneの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
