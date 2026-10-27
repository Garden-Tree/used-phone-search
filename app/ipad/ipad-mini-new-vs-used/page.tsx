import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { modelPagePath } from "@/lib/catalog";
import { storageLabel, yen } from "@/lib/format";
import { buildMiniLead, getIpadMiniNewVsUsed, monthDay, zen, type MiniUsedModel } from "@/lib/ipadMiniNewVsUsed";
import {
  IPAD_MINI_A17_SPEC_SOURCE, IPAD_MINI_A20_CHECKED, IPAD_MINI_A20_NAME, IPAD_MINI_A20_PRICE_SOURCE, IPAD_MINI_A20_PRICES,
  IPAD_MINI_A20_RELEASE, IPAD_MINI_A20_SPEC_SOURCE, IPAD_MINI_COMPARE,
} from "@/lib/ipadMiniA20";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 新型 iPad mini（A20 Pro）と中古の旧型 iPad mini（2026-10-27〜。発表の日の「iPad mini 新型」「iPad mini 中古」の検索向け）。
 * 新型の価格・仕様は lib/ipadMiniA20.ts（Apple 公式で確かめた値だけ）、中古は機種ページと同じ集計（lib/ipadMiniNewVsUsed.ts）
 */
const PATH = "/ipad/ipad-mini-new-vs-used";
const H1 = "新型iPad miniと中古の旧型、いくら違う？";
const TITLE = "新型iPad mini（A20 Pro）と中古の旧型を価格で比較｜A17 Pro・第6世代の相場【毎日更新】";
const IPADOS27_SOURCE = "https://support.apple.com/ja-jp/guide/ipad/ipad213a25b2/ipados";

const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";
const NUM = "text-right tabular-nums whitespace-nowrap";

const NEW_MIN = IPAD_MINI_A20_PRICES[128];
const short = (model: string) => model.replace("iPad mini ", "").replace(/[()]/g, "");
const slash = (iso: string) => iso.replace(/-0?/g, "/");
const today = () => new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });

/** 中古の相場（在庫がいちばん多い容量）。cheapest なら相場のある容量のうちいちばん安いもの（第6世代は 256GB の在庫が多く、64GB より高く出るため） */
const marketOf = (m: MiniUsedModel, cheapest = false) => {
  if (cheapest) {
    const r = m.rows.filter((x) => x.median !== null).sort((a, b) => (a.median ?? 0) - (b.median ?? 0))[0];
    return r && r.median !== null ? { price: r.median, storage: r.storage } : null;
  }
  return m.medianPrice !== null && m.medianStorage ? { price: m.medianPrice, storage: m.medianStorage } : null;
};

export async function generateMetadata(): Promise<Metadata> {
  const models = await getIpadMiniNewVsUsed();
  const a17 = models[0].rows.find((r) => r.storage === 128 && r.median !== null);
  const description = a17 && a17.median !== null
    ? `新型${IPAD_MINI_A20_NAME}は128GB ${yen(NEW_MIN)}（Apple 公式・${monthDay(IPAD_MINI_A20_RELEASE)}発売）。中古のA17 Pro 128GBは相場${yen(a17.median)}で${yen(a17.diff ?? 0)}安い。第6世代・第5世代の相場と仕様の違いも表で比較（毎日更新）。`
    : `新型${IPAD_MINI_A20_NAME}（Apple 公式・${monthDay(IPAD_MINI_A20_RELEASE)}発売）と、中古の旧型 iPad mini（A17 Pro・第6世代・第5世代）の相場・仕様の違いを表で比較（毎日更新）。`;
  return {
    title: TITLE,
    description,
    alternates: { canonical: PATH },
    // openGraph を上書きすると親の OGP 画像が引き継がれないので、/ipad の画像を明示する
    openGraph: { title: `${TITLE} | ${SITE_NAME}`, description, url: PATH, images: ["/ipad/opengraph-image"] },
  };
}

export default async function IpadMiniNewVsUsedPage() {
  const models = await getIpadMiniNewVsUsed();
  const [a17, gen6] = models;
  const updated = models.map((m) => m.lastUpdated).filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0];
  const dateText = updated ? updated.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" }) : today();
  const lead = buildMiniLead(models, dateText);
  const a17Market = marketOf(a17);
  const gen6Market = marketOf(gen6, true);
  const gen5Market = marketOf(models[2], true);
  const a17_128 = a17.rows.find((r) => r.storage === 128 && r.median !== null && r.diff !== null);

  // 誰にどれ（数字だけ。文は短く）
  const picks = [
    { want: "有機EL・防水・軽さ", model: IPAD_MINI_A20_NAME, href: null as string | null, tag: "新品", price: NEW_MIN, storage: 128, priceLabel: "〜" },
    ...(a17Market ? [{ want: "性能そこそこで安く", model: a17.model, href: modelPagePath(a17.model), tag: "中古", price: a17Market.price, storage: a17Market.storage, priceLabel: "相場" }] : []),
    ...(gen6Market ? [{ want: "とにかく安く", model: gen6.model, href: modelPagePath(gen6.model), tag: "中古", price: gen6Market.price, storage: gen6Market.storage, priceLabel: "相場" }] : []),
  ];

  const faqs = [
    ...(a17_128 && a17_128.median !== null && a17_128.diff !== null
      ? [{
          q: "新型iPad miniと中古のA17 Pro、どっちがいい？",
          a: `有機EL・IP67の防水防塵・軽さ（255g）が欲しいなら新型（128GB ${yen(NEW_MIN)}）。安さなら中古の${zen(a17.model)}（128GBの相場${yen(a17_128.median)}・新型より${yen(a17_128.diff)}安い）。Apple Pencil（Pro・USB-C）と電池（Wi-Fi・動画で最大10時間）はどちらも同じです（Apple 公式）。`,
        }]
      : []),
    {
      q: "新型iPad mini（A20 Pro）はいくら？いつ発売？",
      a: `${monthDay(IPAD_MINI_A20_RELEASE)}発売。Wi-Fi モデルは${Object.entries(IPAD_MINI_A20_PRICES).map(([gb, p]) => `${gb}GB ${yen(p)}`).join("・")}です（Apple 公式・税込・${slash(IPAD_MINI_A20_CHECKED)}確認）。Cellular モデルは25,000円高くなります。`,
    },
    ...(gen6Market
      ? [{
          q: "中古のiPad miniでいちばん安いのは？",
          a: `iPadOS 27 に対応する中で安いのは${zen(gen6.model)}で、相場は${yen(gen6Market.price)}（${storageLabel(gen6Market.storage)}）です。${gen5Market && !models[2].ipados27 ? `${zen(models[2].model)}は相場${yen(gen5Market.price)}（${storageLabel(gen5Market.storage)}）とさらに安いですが、iPadOS 27 には対応していません。` : ""}`,
        }]
      : []),
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPadの相場一覧", item: `${SITE_URL}/ipad` },
        { "@type": "ListItem", position: 3, name: "新型iPad miniと中古", item: `${SITE_URL}${PATH}` },
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
      <SiteHeader label="新型iPad miniと中古" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/ipad" className="hover:text-brand-800">中古iPadの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">新型iPad miniと中古</span>
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

        {/* 価格の表: 新型（公式・Wi-Fi）と中古の旧型（容量ごとの相場・最安） */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">価格</h2>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full text-[13px] tabular-nums">
              <caption className="sr-only">新型iPad mini（A20 Pro）の新品価格と、中古の旧型 iPad mini の容量ごとの相場・最安値・新型との差</caption>
              <thead className="bg-ground text-[11px] text-ink-mute">
                <tr>
                  <th scope="col" className="text-left font-normal pl-3.5 pr-2 py-2">容量</th>
                  <th scope="col" className="text-right font-normal px-2 py-2">新品／相場</th>
                  <th scope="col" className="text-right font-normal px-2 py-2">最安</th>
                  <th scope="col" className="text-right font-normal pl-2 pr-3.5 py-2">新型との差</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <th scope="rowgroup" colSpan={4} className="text-left pl-3.5 pr-3.5 pt-3 pb-1">
                    <span className="font-bold">{IPAD_MINI_A20_NAME}</span>
                    <span className="ml-1.5 text-[11px] font-normal text-ink-mute">新品・{monthDay(IPAD_MINI_A20_RELEASE)}発売・Apple 公式</span>
                  </th>
                </tr>
                {Object.entries(IPAD_MINI_A20_PRICES).map(([gb, p]) => (
                  <tr key={gb} className="border-t border-line-soft">
                    <th scope="row" className="text-left font-bold pl-3.5 pr-2 py-2">{storageLabel(gb)}</th>
                    <td className={`${NUM} px-2 py-2 font-bold text-price`}>{yen(p)}</td>
                    <td className={`${NUM} px-2 py-2 text-ink-mute`}>—</td>
                    <td className={`${NUM} pl-2 pr-3.5 py-2 text-ink-mute`}>—</td>
                  </tr>
                ))}
                {models.map((m) => (
                  <ModelRows key={m.model} m={m} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-ink-mute leading-relaxed">
            新型は Wi-Fi・税込。中古は Wi-Fi・Cellular の両方。64GB は新型にないので128GB（{yen(NEW_MIN)}）と比べた差（＊）。
          </p>
        </section>

        {/* 仕様の違い（Apple 公式の仕様のページの値だけ）。違う行だけ色を付ける */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">新型とA17 Proの違い</h2>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full text-[13px]">
              <caption className="sr-only">新型iPad mini（A20 Pro）と iPad mini（A17 Pro）の仕様の違い（Apple 公式）</caption>
              <thead className="bg-ground text-[11px] text-ink-mute">
                <tr>
                  <th scope="col" className="text-left font-normal pl-3.5 pr-2 py-2"></th>
                  <th scope="col" className="text-left font-normal px-2 py-2">新型 A20 Pro</th>
                  <th scope="col" className="text-left font-normal pl-2 pr-3.5 py-2">A17 Pro（中古）</th>
                </tr>
              </thead>
              <tbody>
                {IPAD_MINI_COMPARE.map((c) => {
                  const diff = c.a20 !== c.a17;
                  return (
                    <tr key={c.label} className="border-t border-line-soft">
                      <th scope="row" className="text-left font-normal text-ink-sub pl-3.5 pr-2 py-2 whitespace-nowrap">{c.label}</th>
                      <td className={`px-2 py-2 whitespace-nowrap ${diff ? "font-bold text-warn" : ""}`}>{c.a20}</td>
                      <td className={`pl-2 pr-3.5 py-2 whitespace-nowrap ${diff ? "" : "text-ink-sub"}`}>{c.a17}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 誰にどれ */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">どれを買う？</h2>
          <div className={`${CARD} divide-y divide-line-soft`}>
            {picks.map((p) => (
              <div key={p.model} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[11px] text-ink-mute">{p.want}</span>
                  {p.href
                    ? <Link href={p.href} className="font-bold text-brand-600 hover:text-brand-800">{short(p.model)} ›</Link>
                    : <span className="font-bold">新型 {short(p.model)}</span>}
                  <span className="ml-1.5 text-[11px] text-ink-mute">{p.tag}</span>
                </span>
                <span className="text-right whitespace-nowrap">
                  <span className="block text-[10px] text-ink-mute">{p.priceLabel === "相場" ? `相場（${storageLabel(p.storage)}）` : `${storageLabel(p.storage)}`}</span>
                  <span className="font-bold text-price tabular-nums">{yen(p.price)}{p.priceLabel === "〜" ? "〜" : ""}</span>
                </span>
              </div>
            ))}
          </div>
          {!models[2].ipados27 && (
            <p className="text-[11px] text-ink-mute">{models[2].model}は iPadOS 27 非対応。</p>
          )}
        </section>

        {/* 中古の在庫へ */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">中古の在庫を見る</h2>
          <div className="flex flex-wrap gap-2">
            {models.map((m) => (
              <Link key={m.model} href={modelPagePath(m.model)}
                className="px-3.5 min-h-10 inline-flex items-center gap-1.5 rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                {short(m.model)}
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
            新型の価格: <a href={IPAD_MINI_A20_PRICE_SOURCE} target="_blank" rel="noopener" className={LINK}>Apple「iPad mini を購入」</a>・
            仕様: <a href={IPAD_MINI_A20_SPEC_SOURCE} target="_blank" rel="noopener" className={LINK}>Apple「iPad mini 技術仕様」</a>・
            <a href={IPAD_MINI_A17_SPEC_SOURCE} target="_blank" rel="noopener" className={LINK}>A17 Pro の技術仕様</a>
            （{slash(IPAD_MINI_A20_CHECKED)}確認）。
            iPadOS 27: <a href={IPADOS27_SOURCE} target="_blank" rel="noopener" className={LINK}>Apple「iPadOS 27 に対応している iPad」</a>。
            中古: 大手中古ショップの販売中の在庫（{dateText}時点・1日4回取得）。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2"><Link href="/ipad" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古iPadの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/** 中古の1機種分の行（機種名の行＋容量ごとの行） */
function ModelRows({ m }: { m: MiniUsedModel }) {
  return (
    <>
      <tr className="border-t border-line">
        <th scope="rowgroup" colSpan={4} className="text-left pl-3.5 pr-3.5 pt-3 pb-1">
          <Link href={modelPagePath(m.model)} className="font-bold text-brand-600 hover:text-brand-800">{m.model} ›</Link>
          <span className="ml-1.5 text-[11px] font-normal text-ink-mute">
            中古・{m.count.toLocaleString()}件・iPadOS 27 {m.ipados27 ? "○" : <span className="text-warn font-bold">×</span>}
          </span>
        </th>
      </tr>
      {m.rows.length === 0 && (
        <tr className="border-t border-line-soft"><td colSpan={4} className="pl-3.5 py-2 text-ink-mute">在庫なし</td></tr>
      )}
      {m.rows.map((r) => (
        <tr key={r.storage} className="border-t border-line-soft">
          <th scope="row" className="text-left font-bold pl-3.5 pr-2 py-2">
            <Link href={`/search?${new URLSearchParams({ model: m.model, storage: String(r.storage) }).toString()}`} className="hover:text-brand-800">{storageLabel(r.storage)}</Link>
          </th>
          <td className={`${NUM} px-2 py-2 font-bold`}>{r.median !== null ? yen(r.median) : "—"}</td>
          <td className={`${NUM} px-2 py-2 text-price`}>{yen(r.minPrice)}</td>
          <td className={`${NUM} pl-2 pr-3.5 py-2 ${r.diff !== null && r.diff > 0 ? "text-safe font-bold" : "text-ink-mute"}`}>
            {r.diff !== null ? `${r.diff > 0 ? "−" : "+"}${yen(Math.abs(r.diff))}` : "—"}
            {r.newStorage !== r.storage && <span className="text-ink-mute font-normal">＊</span>}
          </td>
        </tr>
      ))}
    </>
  );
}
