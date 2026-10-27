import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import VideoEmbed from "@/app/components/VideoEmbed";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import { monthDay } from "@/lib/ipadMiniNewVsUsed";
import { MEDIAN_MIN_COUNT, buildMbpLead, chipOf, getMbpM6NewVsUsed, sameConfigRow, type MbpUsedModel } from "@/lib/mbpM6NewVsUsed";
import {
  MBP_M4_SPEC_SOURCE, MBP_M5_PRO_SPEC, MBP_M5_SPEC_SOURCE, MBP_M6_CHECKED, MBP_M6_COMPARE, MBP_M6_NAME, MBP_M6_PRICE,
  MBP_M6_PRICE_SOURCE, MBP_M6_RELEASE, MBP_M6_SPEC_SOURCE,
} from "@/lib/macbookProM6";
import { VIDEOS } from "@/lib/videos";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 新型 MacBook Pro 14インチ（M6）と中古の旧型（2026-10-28〜。発表の翌日の「MacBook Pro M6」「M5 中古」の検索向け）。
 * 新型の価格・仕様は lib/macbookProM6.ts（Apple 公式で確かめた値だけ）、中古は lib/mbpM6NewVsUsed.ts（メモリ×SSD ごとの中央値・ジャンクを除く）。
 * 形は /ipad/ipad-mini-new-vs-used と同じ
 */
const PATH = "/mac/macbook-pro-m6-new-vs-used";
const H1 = "新型MacBook Pro M6と中古のM5・M4、いくら違う？";
const TITLE = "新型MacBook Pro M6と中古のM5・M4を価格で比較｜同じ16GB・1TBの相場【毎日更新】";

const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";
const NUM = "text-right tabular-nums whitespace-nowrap";

const slash = (iso: string) => iso.replace(/-0?/g, "/");
const today = () => new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
const config = (memoryGB: number, storage: number) => `${memoryGB}GB・${storageLabel(storage)}`;

export async function generateMetadata(): Promise<Metadata> {
  const models = await getMbpM6NewVsUsed();
  const m5 = sameConfigRow(models[0]);
  const description = m5
    ? `新型${MBP_M6_NAME}は16GB・1TB ${yen(MBP_M6_PRICE)}（Apple 公式・${monthDay(MBP_M6_RELEASE)}発売）。中古のM5（同じ16GB・1TB）は相場${yen(m5.median)}で${yen(m5.diff)}安い。M4・M5 Pro・M1 Pro の相場と仕様の違いも表で比較（毎日更新）。`
    : `新型${MBP_M6_NAME}（Apple 公式・${monthDay(MBP_M6_RELEASE)}発売）と、中古の MacBook Pro 14インチ（M5・M4・M5 Pro・M1 Pro）の相場・仕様の違いを表で比較（毎日更新）。`;
  return {
    title: TITLE,
    description,
    alternates: { canonical: PATH },
    // openGraph を上書きすると親の OGP 画像が引き継がれないので、/mac の画像を明示する
    openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: PATH, images: ["/mac/opengraph-image"] },
  };
}

export default async function MbpM6NewVsUsedPage() {
  const models = await getMbpM6NewVsUsed();
  const [m5, m4, m5pro, m1pro] = models;
  const updated = models.map((m) => m.lastUpdated).filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0];
  const dateText = updated ? updated.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" }) : today();
  const lead = buildMbpLead(models, dateText);
  const m5Same = sameConfigRow(m5);
  const m4Same = sameConfigRow(m4);
  // M5 Pro は 16GB の構成がないので、在庫がいちばん多い構成
  const m5proTop = [...m5pro.rows].sort((a, b) => b.count - a.count)[0] ?? null;
  // M1 Pro はいちばん安い相場の構成
  const m1proLow = [...m1pro.rows].sort((a, b) => a.median - b.median)[0] ?? null;

  // 誰にどれ（数字だけ。文は短く）
  const picks = [
    { want: "Wi-Fi 7・新しいチップ", label: "新型 M6", href: null as string | null, tag: "新品", price: MBP_M6_PRICE, cfg: "16GB・1TB", priceLabel: "〜" },
    ...(m5Same ? [{ want: "同じ構成で安く", label: "M5", href: modelPagePath(m5.model), tag: "中古", price: m5Same.median, cfg: config(m5Same.memoryGB, m5Same.storage), priceLabel: "相場" }] : []),
    ...(m4Same ? [{ want: "もう少し安く", label: "M4", href: modelPagePath(m4.model), tag: "中古", price: m4Same.median, cfg: config(m4Same.memoryGB, m4Same.storage), priceLabel: "相場" }] : []),
    ...(m1proLow ? [{ want: "半額以下", label: "M1 Pro", href: modelPagePath(m1pro.model), tag: "中古", price: m1proLow.median, cfg: config(m1proLow.memoryGB, m1proLow.storage), priceLabel: "相場" }] : []),
  ];

  const faqs = [
    ...(m5Same
      ? [{
          q: "新型MacBook Pro M6と中古のM5、どっちがいい？",
          a: `Wi-Fi 7・Bluetooth 6・12コアの CPU と GPU が欲しいなら新型（16GB・1TB ${yen(MBP_M6_PRICE)}）。安さなら中古のM5（同じ16GB・1TBの相場${yen(m5Same.median)}・新型より${yen(m5Same.diff)}安い）。電池（動画で最大24時間）と重さ（1.55kg）は同じです（Apple 公式）。${m5.unused > 0 ? `中古のM5は${m5.count}件のうち${m5.unused}件が未使用品（ランクS）です。` : ""}`,
        }]
      : []),
    {
      q: "新型MacBook Pro M6はいくら？いつ発売？",
      a: `${monthDay(MBP_M6_RELEASE)}発売。いちばん安い構成（メモリ16GB・SSD 1TB）が${yen(MBP_M6_PRICE)}です（Apple 公式・税込・${slash(MBP_M6_CHECKED)}確認）。SSD は1TBからで、メモリは16GB・24GB・32GBから選べます。`,
    },
    ...(m5proTop
      ? [{
          q: "チップもProにするなら？",
          a: `M5 Pro は CPU ${MBP_M5_PRO_SPEC.cpu}・GPU ${MBP_M5_PRO_SPEC.gpu}・${MBP_M5_PRO_SPEC.thunderbolt}（Apple 公式）。中古の${config(m5proTop.memoryGB, m5proTop.storage)}は相場${yen(m5proTop.median)}で、新型 M6 より${yen(Math.abs(m5proTop.diff))}${m5proTop.diff < 0 ? "高い" : "安い"}です。電池（動画）は${MBP_M5_PRO_SPEC.battery}、重さは${MBP_M5_PRO_SPEC.weight}です。`,
        }]
      : []),
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古MacBookの相場一覧", item: `${SITE_URL}/mac` },
        { "@type": "ListItem", position: 3, name: "新型MacBook Pro M6と中古", item: `${SITE_URL}${PATH}` },
      ],
    },
    ...(lead ? [{ "@context": "https://schema.org", "@type": "WebPage", name: H1, url: `${SITE_URL}${PATH}`, description: lead, ...(updated ? { dateModified: updated.toISOString() } : {}) }] : []),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="新型MacBook Pro M6と中古" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/mac" className="hover:text-brand-800">中古MacBookの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">新型MacBook Pro M6と中古</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">{H1}</h1>
          {/* 冒頭の1文（AI・検索結果が引用しやすいよう、日付・新型の価格・中古の相場・差額を1文に） */}
          {lead && (
            <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">
              {lead}
              <Link href="/about#data" className={`${LINK} ml-1 whitespace-nowrap`}>集計の方法</Link>
            </p>
          )}
          <p className="text-[11px] md:text-xs text-ink-mute">
            <span className="inline-block mr-1 px-1 py-px rounded border border-line font-bold">PR</span>
            広告を含みます
          </p>
        </div>

        {/* 価格の表: 新型（公式）と中古の旧型（メモリ×SSD ごとの相場・最安） */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">価格</h2>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full text-[13px] tabular-nums">
              <caption className="sr-only">新型MacBook Pro 14インチ（M6）の新品価格と、中古の MacBook Pro 14インチのメモリ・SSD ごとの相場・最安値・新型との差</caption>
              <thead className="bg-ground text-[11px] text-ink-mute">
                <tr>
                  <th scope="col" className="text-left font-normal pl-3.5 pr-2 py-2">メモリ・SSD</th>
                  <th scope="col" className="text-right font-normal px-2 py-2">新品／相場</th>
                  <th scope="col" className="text-right font-normal px-2 py-2">最安</th>
                  <th scope="col" className="text-right font-normal pl-2 pr-3.5 py-2">新型との差</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <th scope="rowgroup" colSpan={4} className="text-left pl-3.5 pr-3.5 pt-3 pb-1">
                    <span className="font-bold">{MBP_M6_NAME}</span>
                    <span className="ml-1.5 text-[11px] font-normal text-ink-mute">新品・{monthDay(MBP_M6_RELEASE)}発売・Apple 公式</span>
                  </th>
                </tr>
                <tr className="border-t border-line-soft">
                  <th scope="row" className="text-left font-bold pl-3.5 pr-2 py-2">16GB・1TB</th>
                  <td className={`${NUM} px-2 py-2 font-bold text-price`}>{yen(MBP_M6_PRICE)}</td>
                  <td className={`${NUM} px-2 py-2 text-ink-mute`}>—</td>
                  <td className={`${NUM} pl-2 pr-3.5 py-2 text-ink-mute`}>—</td>
                </tr>
                {models.map((m) => (
                  <ModelRows key={m.model} m={m} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-ink-mute leading-relaxed">
            新型は税込・いちばん安い構成。中古はジャンクを除く販売中の在庫で、{MEDIAN_MIN_COUNT}件以上ある構成だけ。差はすべて新型の16GB・1TB（{yen(MBP_M6_PRICE)}）と比べた額で、構成が違う行は＊。
          </p>
        </section>

        {/* 仕様の違い（Apple 公式の仕様のページの値だけ）。違う行だけ色を付ける */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">新型とM5・M4の違い</h2>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full text-[13px]">
              <caption className="sr-only">新型MacBook Pro 14インチ（M6）と M5・M4 の仕様の違い（Apple 公式）</caption>
              <thead className="bg-ground text-[11px] text-ink-mute">
                <tr>
                  <th scope="col" className="text-left font-normal pl-3.5 pr-2 py-2"></th>
                  <th scope="col" className="text-left font-normal px-2 py-2">新型 M6</th>
                  <th scope="col" className="text-left font-normal pl-2 pr-3.5 py-2">M5・M4（中古）</th>
                </tr>
              </thead>
              <tbody>
                {MBP_M6_COMPARE.map((c) => {
                  const diff = c.m6 !== c.m4;
                  return (
                    <tr key={c.label} className="border-t border-line-soft">
                      <th scope="row" className="text-left font-normal text-ink-sub pl-3.5 pr-2 py-2 whitespace-nowrap">{c.label}</th>
                      <td className={`px-2 py-2 whitespace-nowrap ${diff ? "font-bold text-warn" : ""}`}>{c.m6}</td>
                      <td className={`pl-2 pr-3.5 py-2 whitespace-nowrap ${diff ? "" : "text-ink-sub"}`}>{c.m4}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-line-soft">
                  <th scope="row" className="text-left font-normal text-ink-sub pl-3.5 pr-2 py-2 whitespace-nowrap">SSD</th>
                  <td className="px-2 py-2 whitespace-nowrap font-bold text-warn">1TBから</td>
                  <td className="pl-2 pr-3.5 py-2 whitespace-nowrap">512GBか1TBから</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 誰にどれ */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">どれを買う？</h2>
          <div className={`${CARD} divide-y divide-line-soft`}>
            {picks.map((p) => (
              <div key={p.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[11px] text-ink-mute">{p.want}</span>
                  {p.href
                    ? <Link href={p.href} className="font-bold text-brand-600 hover:text-brand-800">{p.label} ›</Link>
                    : <span className="font-bold">{p.label}</span>}
                  <span className="ml-1.5 text-[11px] text-ink-mute">{p.tag}</span>
                </span>
                <span className="text-right whitespace-nowrap">
                  <span className="block text-[10px] text-ink-mute">{p.priceLabel === "相場" ? `相場（${p.cfg}）` : p.cfg}</span>
                  <span className="font-bold text-price tabular-nums">{yen(p.price)}{p.priceLabel === "〜" ? "〜" : ""}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-mute leading-relaxed">中古の Mac は、電池の充放電回数（「システム情報」→「電源」）と保証の期間を確かめてから。</p>
        </section>

        <VideoEmbed video={VIDEOS.mbpM6} heading={VIDEOS.mbpM6.heading} />

        {/* 中古の在庫へ */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">中古の在庫を見る</h2>
          <div className="flex flex-wrap gap-2">
            {models.map((m) => (
              <Link key={m.model} href={modelPagePath(m.model)}
                className="px-3.5 min-h-10 inline-flex items-center gap-1.5 rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                {chipOf(m.model)}
                {m.minPrice !== null && <span className="text-price tabular-nums">{yen(m.minPrice)}〜</span>}
                <span className="text-[11px] font-normal text-ink-mute tabular-nums">{m.count.toLocaleString()}件</span>
              </Link>
            ))}
          </div>
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
            新型の価格: <a href={MBP_M6_PRICE_SOURCE} target="_blank" rel="noopener" className={LINK}>Apple Newsroom</a>・
            仕様: <a href={MBP_M6_SPEC_SOURCE} target="_blank" rel="noopener" className={LINK}>Apple「MacBook Pro 技術仕様」</a>・
            <a href={MBP_M5_SPEC_SOURCE} target="_blank" rel="noopener" className={LINK}>M5 の技術仕様</a>・
            <a href={MBP_M4_SPEC_SOURCE} target="_blank" rel="noopener" className={LINK}>M4 の技術仕様</a>
            （{slash(MBP_M6_CHECKED)}確認）。
            中古: 大手中古ショップの販売中の在庫（{dateText}時点・1日4回取得）。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2"><Link href="/mac" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古MacBookの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/** 中古の1機種分の行（機種名の行＋メモリ×SSD ごとの行） */
function ModelRows({ m }: { m: MbpUsedModel }) {
  return (
    <>
      <tr className="border-t border-line">
        <th scope="rowgroup" colSpan={4} className="text-left pl-3.5 pr-3.5 pt-3 pb-1">
          <Link href={modelPagePath(m.model)} className="font-bold text-brand-600 hover:text-brand-800">{m.model} ›</Link>
          <span className="ml-1.5 text-[11px] font-normal text-ink-mute">
            中古・{m.year ? `${m.year}年・` : ""}{m.count.toLocaleString()}件{m.unused > 0 ? `（未使用品 ${m.unused}件）` : ""}
          </span>
        </th>
      </tr>
      {m.rows.length === 0 && (
        <tr className="border-t border-line-soft"><td colSpan={4} className="pl-3.5 py-2 text-ink-mute">在庫なし</td></tr>
      )}
      {m.rows.map((r) => (
        <tr key={`${r.memoryGB}-${r.storage}`} className="border-t border-line-soft">
          <th scope="row" className="text-left font-bold pl-3.5 pr-2 py-2 whitespace-nowrap">{config(r.memoryGB, r.storage)}</th>
          <td className={`${NUM} px-2 py-2 font-bold`}>{yen(r.median)}</td>
          <td className={`${NUM} px-2 py-2 text-price`}>{yen(r.minPrice)}</td>
          <td className={`${NUM} pl-2 pr-3.5 py-2 ${r.diff > 0 ? "text-safe font-bold" : "text-ink-mute"}`}>
            {`${r.diff > 0 ? "−" : "+"}${yen(Math.abs(r.diff))}`}
            {!r.sameConfig && <span className="text-ink-mute font-normal">＊</span>}
          </td>
        </tr>
      ))}
    </>
  );
}
