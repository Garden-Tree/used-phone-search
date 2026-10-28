import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import VideoEmbed from "@/app/components/VideoEmbed";
import { ALL_CATALOG_MODELS, IPHONE_CATALOG, LEGACY_SERIES, modelPagePath } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import { activeShops } from "@/lib/activeShops";
import { getModelStats } from "@/lib/modelStats";
import { specOf } from "@/lib/iphoneSpecs";
import { appleRepair, APPLE_REPAIR_SOURCE } from "@/lib/appleRepairPrices";
import { APPLE_VINTAGE_CHECKED, APPLE_VINTAGE_SOURCE, REPAIR_STATUS_LABEL, repairStatus, type RepairStatus } from "@/lib/appleVintage";
import { VIDEOS } from "@/lib/videos";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古iPhoneはいつまで使える？（2026-10-28〜）: 機種ごとに iOS 27 の対応・Apple の修理を受けられる期間・バッテリー交換の料金・中古の相場を1つの表に。
 * 「iphone13 いつまで使える」「iphone バッテリー交換 料金」の検索向けの常設ページ（機種ごとのページは作らず、ここに集める）。
 * 事実は Apple 公式で確かめた値だけ: iOS 27（lib/catalog.ts の IPHONE_CATALOG）・修理の期間（lib/appleVintage.ts）・料金（lib/appleRepairPrices.ts）
 */
const PATH = "/iphone/how-long";
const H1 = "中古iPhoneはいつまで使える？機種別の一覧";
const TITLE = "中古iPhoneはいつまで使える？iOS 27対応・Apple修理の期間・バッテリー交換の料金を機種別に一覧【毎日更新】";
const IOS27_SOURCE = "https://www.apple.com/jp/ios/";

const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";
const slash = (iso: string) => iso.replace(/-0?/g, "/");

const MODELS = [...IPHONE_CATALOG.flatMap((s) => s.models), ...LEGACY_SERIES.flatMap((s) => s.models)];

type Row = {
  model: string;
  released: string | null;
  ios27: boolean;
  repair: RepairStatus;
  repairNote?: string;
  battery: number | null;
  median: number | null;
  medianStorage: number | null;
  count: number;
};

const STATUS_TONE: Record<RepairStatus, string> = { service: "", vintage: "text-warn font-bold", obsolete: "text-price font-bold" };

async function getRows(): Promise<{ rows: Row[]; updated: Date | null }> {
  const stats = await Promise.all(MODELS.map((m) => getModelStats(m)));
  const rows = MODELS.map((model, i) => {
    const s = stats[i];
    const r = repairStatus(model);
    return {
      model,
      released: specOf(model)?.released ?? null,
      ios27: ALL_CATALOG_MODELS.includes(model),
      repair: r.status,
      repairNote: r.note,
      battery: appleRepair(model)?.battery ?? null,
      median: s.medianPrice,
      medianStorage: s.medianStorage,
      count: s.count,
    };
  });
  const updated = stats.map((s) => s.lastUpdated).filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return { rows, updated };
}

/** 冒頭の1文（AI・検索結果が引用しやすいよう、日付・線引き・いちばん安い iOS 27 対応機種の相場を1文に） */
function buildLead(rows: Row[], dateText: string): string | null {
  const ok = rows.filter((r) => r.ios27 && r.repair === "service" && r.median !== null && r.count >= 5).sort((a, b) => (a.median ?? 0) - (b.median ?? 0))[0];
  if (!ok || ok.median === null) return null;
  const obsolete = rows.filter((r) => r.repair === "obsolete").map((r) => r.model);
  return `${dateText}時点、iOS 27 に対応するのは iPhone 11 以降と iPhone SE（第2世代）以降。${obsolete.length > 0 ? `${obsolete.join("・")}は Apple の修理も受けられません。` : ""}iOS 27 に対応し Apple の修理も受けられる中古でいちばん安いのは${ok.model}で、相場は${yen(ok.median)}（${ok.medianStorage ? storageLabel(ok.medianStorage, ok.model) : ""}）です（Apple 公式の情報と大手中古ショップの在庫から）。`;
}

export async function generateMetadata(): Promise<Metadata> {
  const description = "中古iPhoneが「いつまで使えるか」を機種ごとに一覧。iOS 27 への対応、Apple の修理を受けられる期間（ビンテージ・オブソリート）、バッテリー交換の料金（Apple 公式）と、中古の相場（毎日更新）を1つの表で比べられます。";
  return { title: TITLE, description, alternates: { canonical: PATH }, openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: PATH, images: ["/iphone/opengraph-image"] } };
}

export default async function HowLongPage() {
  const shopNum = (await activeShops()).length;
  const { rows, updated } = await getRows();
  const dateText = (updated ?? new Date()).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const lead = buildLead(rows, dateText);
  const vintage = rows.filter((r) => r.repair === "vintage").map((r) => r.model);
  const noIos = rows.filter((r) => !r.ios27).map((r) => r.model);
  const batteries = rows.map((r) => r.battery).filter((b): b is number => b !== null);
  const batteryMin = Math.min(...batteries), batteryMax = Math.max(...batteries);

  const faqs = [
    {
      q: "iOS 27 に対応していない iPhone は？",
      a: `${noIos.join("・")}は iOS 27 に対応していません（Apple 公式）。iOS 27 に対応するのは iPhone 11 以降と iPhone SE（第2世代）以降です。`,
    },
    {
      q: "Apple のビンテージ製品・オブソリート製品とは？",
      a: `Apple が販売店への供給をやめてから5年以上7年未満の製品がビンテージ製品で、修理は部品の在庫があるときだけ受けられます。7年以上たった製品はオブソリート製品で、Apple のハードウェア修理は受けられません（Apple 公式・ページの公開日 2026年10月19日）。いまビンテージ製品の iPhone は${vintage.join("・")}です。`,
    },
    {
      q: "iPhone のバッテリー交換はいくら？",
      a: `Apple の保証対象外のバッテリー交換は、機種によって${yen(batteryMin)}〜${yen(batteryMax)}です（Apple 公式）。機種ごとの料金は上の表にまとめています。`,
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
        { "@type": "ListItem", position: 3, name: "中古iPhoneはいつまで使える？", item: `${SITE_URL}${PATH}` },
      ],
    },
    ...(lead ? [{ "@context": "https://schema.org", "@type": "WebPage", name: H1, url: `${SITE_URL}${PATH}`, description: lead, ...(updated ? { dateModified: updated.toISOString() } : {}) }] : []),
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="中古iPhoneはいつまで使える？" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/iphone" className="hover:text-brand-800">中古iPhoneの相場一覧</Link>
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

        {/* 線引きの3つ（数字だけ） */}
        <section className={`${CARD} divide-y divide-line-soft`}>
          {[
            { k: "iOS 27", v: "iPhone 11・SE（第2世代）以降", sub: "Apple 公式" },
            { k: "Apple の修理", v: "ビンテージは部品があれば・オブソリートは不可", sub: `販売店への供給をやめて5年／7年` },
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

        {/* 機種ごとの表（新しい順） */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">機種ごとの一覧</h2>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full text-[13px] tabular-nums">
              <caption className="sr-only">中古iPhoneの機種ごとの iOS 27 対応・Apple の修理・バッテリー交換の料金・中古の相場</caption>
              <thead className="bg-ground text-[11px] text-ink-mute">
                <tr>
                  <th scope="col" className="text-left font-normal pl-3.5 pr-2 py-2">機種</th>
                  <th scope="col" className="text-center font-normal px-2 py-2">iOS 27</th>
                  <th scope="col" className="text-left font-normal px-2 py-2">Apple の修理</th>
                  <th scope="col" className="text-right font-normal px-2 py-2">バッテリー交換</th>
                  <th scope="col" className="text-right font-normal pl-2 pr-3.5 py-2">中古の相場</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.model} id={r.model.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()} className="border-t border-line-soft">
                    <th scope="row" className="text-left font-normal pl-3.5 pr-2 py-2 whitespace-nowrap">
                      <Link href={modelPagePath(r.model)} className="font-bold text-brand-600 hover:text-brand-800">{r.model.replace("iPhone ", "")}</Link>
                      {r.released && <span className="block text-[10px] text-ink-mute">{r.released}発売</span>}
                    </th>
                    <td className={`text-center px-2 py-2 ${r.ios27 ? "" : "text-price font-bold"}`}>{r.ios27 ? "○" : "×"}</td>
                    <td className={`px-2 py-2 whitespace-nowrap ${STATUS_TONE[r.repair]}`}>
                      {REPAIR_STATUS_LABEL[r.repair]}
                      {r.repairNote && <span className="block text-[10px] font-normal text-ink-mute">{r.repairNote}</span>}
                    </td>
                    <td className="text-right px-2 py-2 whitespace-nowrap">{r.battery !== null ? yen(r.battery) : <span className="text-ink-mute">—</span>}</td>
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
            バッテリー交換は Apple の保証対象外の料金（税込）。「—」は Apple の料金表に載っていない機種。修理の「部品があれば」は Apple のビンテージ製品、「受けられない」はオブソリート製品（{slash(APPLE_VINTAGE_CHECKED)}確認）。
          </p>
        </section>

        <VideoEmbed video={VIDEOS.howOld} heading={VIDEOS.howOld.heading} />

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
            iOS 27: <a href={IOS27_SOURCE} target="_blank" rel="noopener" className={LINK}>Apple「iOS」</a>・
            修理の期間: <a href={APPLE_VINTAGE_SOURCE} target="_blank" rel="noopener" className={LINK}>Apple「ビンテージ製品とオブソリート製品」</a>・
            バッテリー交換: <a href={APPLE_REPAIR_SOURCE.battery} target="_blank" rel="noopener" className={LINK}>Apple「iPhone のバッテリー交換」</a>・
            発売年: Apple の技術仕様。中古: 大手中古ショップの販売中の在庫（{dateText}時点・1日4回取得）。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2"><Link href="/iphone" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古iPhoneの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
