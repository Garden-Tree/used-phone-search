import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { modelPagePath } from "@/lib/catalog";
import { PIXEL_INFO, PIXEL_MODELS, jaMonth, updateUntil } from "@/lib/pixelCatalog";
import { storageLabel, yen } from "@/lib/format";
import { PIXEL_SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import { getModelStats } from "@/lib/modelStats";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古Pixelはいつまで使える？（2026-10-29〜）: 機種ごとに Google のアップデート保証の終わり・販売開始・中古の相場を1つの表に。
 * /iphone/how-long の Pixel 版。事実は Google 公式で確かめた値だけ（lib/pixelCatalog.ts の PIXEL_INFO・updateUntil）。
 * Galaxy は公式の値をまだ持っていないので載せない
 */
const PATH = "/pixel/how-long";
const H1 = "中古Pixelはいつまで使える？機種別の一覧";
const TITLE = "中古Pixelはいつまで使える？Googleのアップデート保証の期限と中古の相場を機種別に一覧【毎日更新】";
const UPDATE_SOURCE = "https://support.google.com/pixelphone/answer/4457705";
const AVAILABLE_SOURCE = "https://support.google.com/pixelphone/answer/15738422";

const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";

type Status = "ok" | "thisMonth" | "ended";
const STATUS_TONE: Record<Status, string> = { ok: "", thisMonth: "text-warn font-bold", ended: "text-price font-bold" };

type Row = {
  model: string;
  available: string;
  until: string;
  years: number;
  status: Status;
  median: number | null;
  medianStorage: number | null;
  count: number;
};

/** いまの年月（日本時間・"2026-10"） */
function nowYm(): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}`;
}

async function getRows(now: string): Promise<{ rows: Row[]; updated: Date | null }> {
  const stats = await Promise.all(PIXEL_MODELS.map((m) => getModelStats(m)));
  const rows = PIXEL_MODELS.map((model, i) => {
    const s = stats[i];
    const until = updateUntil(model)!;
    // "YYYY-MM" は文字列のまま大小を比べられる
    const status: Status = until < now ? "ended" : until === now ? "thisMonth" : "ok";
    return {
      model,
      available: PIXEL_INFO[model].available,
      until,
      years: PIXEL_INFO[model].updateYears,
      status,
      median: s.medianPrice,
      medianStorage: s.medianStorage,
      count: s.count,
    };
  });
  const updated = stats.map((s) => s.lastUpdated).filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return { rows, updated };
}

/** 冒頭の1文（AI・検索結果が引用しやすいよう、日付・保証の年数・保証が残るいちばん安い機種の相場を1文に） */
function buildLead(rows: Row[], dateText: string): string | null {
  const ok = rows.filter((r) => r.status === "ok" && r.median !== null && r.count >= 5).sort((a, b) => (a.median ?? 0) - (b.median ?? 0))[0];
  if (!ok || ok.median === null) return null;
  const names = (s: Status) => rows.filter((r) => r.status === s).map((r) => r.model).join("・");
  const endingText = (names("ended") ? `${names("ended")}は保証が終わっています。` : "") + (names("thisMonth") ? `${names("thisMonth")}は保証が今月で終わります。` : "");
  return `${dateText}時点、Google のアップデート保証は Pixel 8 以降が販売開始から7年、Pixel 6・7 シリーズと Pixel Fold が5年。${endingText}保証が残っている中古でいちばん安いのは${ok.model}（保証 ${jaMonth(ok.until)}まで）で、相場は${yen(ok.median)}（${ok.medianStorage ? storageLabel(ok.medianStorage, ok.model) : ""}）です（Google 公式の情報と大手中古ショップの在庫から）。`;
}

export async function generateMetadata(): Promise<Metadata> {
  const description = "中古のGoogle Pixelが「いつまで使えるか」を機種ごとに一覧。Google のアップデート保証の期限（Google 公式）、販売開始の年月と、中古の相場（毎日更新）を1つの表で比べられます。";
  return { title: TITLE, description, alternates: { canonical: PATH }, openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: PATH, images: ["/pixel/opengraph-image"] } };
}

export default async function PixelHowLongPage() {
  const now = nowYm();
  const shopNum = (await activeShops(PIXEL_SHOPS)).length;
  const { rows, updated } = await getRows(now);
  const dateText = (updated ?? new Date()).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const lead = buildLead(rows, dateText);
  const ending = rows.filter((r) => r.status !== "ok");
  const longest = [...rows].sort((a, b) => (a.until < b.until ? 1 : -1))[0];

  const faqs = [
    {
      q: "Pixel のアップデート保証は何年？",
      a: "Google のアップデート保証は、Pixel 8 以降が販売開始から7年、Pixel 6・7 シリーズと Pixel Fold が5年です（Google 公式）。販売開始は米国の Google ストアで売り出された月です。",
    },
    {
      q: "アップデート保証が終わる・終わった Pixel は？",
      a: ending.length > 0
        ? `${ending.map((r) => `${r.model}（${jaMonth(r.until)}まで）`).join("・")}です。保証が終わると、Google からの OS とセキュリティのアップデートは保証されません。`
        : "いま中古で掲載している Pixel 6 以降に、保証が終わった機種はありません。",
    },
    {
      q: "いちばん長く使える Pixel は？",
      a: `保証がいちばん長く残るのは${rows.filter((r) => r.until === longest.until).map((r) => r.model).join("・")}で、${jaMonth(longest.until)}までです（Google 公式）。`,
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古Google Pixelの相場一覧", item: `${SITE_URL}/pixel` },
        { "@type": "ListItem", position: 3, name: "中古Pixelはいつまで使える？", item: `${SITE_URL}${PATH}` },
      ],
    },
    ...(lead ? [{ "@context": "https://schema.org", "@type": "WebPage", name: H1, url: `${SITE_URL}${PATH}`, description: lead, ...(updated ? { dateModified: updated.toISOString() } : {}) }] : []),
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="中古Pixelはいつまで使える？" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/pixel" className="hover:text-brand-800">中古Google Pixelの相場一覧</Link>
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
            { k: "Pixel 8 以降", v: "販売開始から7年", sub: "Google のアップデート保証" },
            { k: "Pixel 6・7・Fold", v: "販売開始から5年", sub: "Google のアップデート保証" },
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
              <caption className="sr-only">中古Pixelの機種ごとの Google のアップデート保証の期限・販売開始・中古の相場</caption>
              <thead className="bg-ground text-[11px] text-ink-mute">
                <tr>
                  <th scope="col" className="text-left font-normal pl-3.5 pr-2 py-2">機種</th>
                  <th scope="col" className="text-left font-normal px-2 py-2">アップデート保証</th>
                  <th scope="col" className="text-right font-normal pl-2 pr-3.5 py-2">中古の相場</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.model} id={r.model.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()} className="border-t border-line-soft">
                    <th scope="row" className="text-left font-normal pl-3.5 pr-2 py-2 whitespace-nowrap">
                      <Link href={modelPagePath(r.model)} className="font-bold text-brand-600 hover:text-brand-800">{r.model}</Link>
                      <span className="block text-[10px] text-ink-mute">{jaMonth(r.available)}販売開始</span>
                    </th>
                    <td className={`px-2 py-2 whitespace-nowrap ${STATUS_TONE[r.status]}`}>
                      {jaMonth(r.until)}まで
                      <span className="block text-[10px] font-normal text-ink-mute">
                        {r.status === "ended" ? "保証は終了" : r.status === "thisMonth" ? "今月で終了" : `${r.years}年`}
                      </span>
                    </td>
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
            アップデート保証の期限は、米国の Google ストアでの販売開始の月に保証の年数を足した月（Google 公式）。中古の相場は在庫がいちばん多い容量の中央値。
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
            アップデート保証: <a href={UPDATE_SOURCE} target="_blank" rel="noopener" className={LINK}>Google「Pixel のアップデート保証期間」</a>・
            販売開始: <a href={AVAILABLE_SOURCE} target="_blank" rel="noopener" className={LINK}>Google「デバイスが利用可能になった時期」</a>。
            中古: 大手中古ショップの販売中の在庫（{dateText}時点・1日4回取得）。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2"><Link href="/pixel" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古Google Pixelの相場一覧 &rarr;</Link></p>
          <p><Link href="/iphone/how-long" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古iPhoneはいつまで使える？ &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
