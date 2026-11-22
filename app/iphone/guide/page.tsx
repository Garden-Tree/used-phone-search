import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { ALL_CATALOG_MODELS, modelPagePath } from "@/lib/catalog";
import { appleRepair, APPLE_REPAIR_SOURCE } from "@/lib/appleRepairPrices";
import { applePrice } from "@/lib/applePrices";
import { budgetPath } from "@/lib/budgets";
import { yen } from "@/lib/format";
import { SITE_NAME, SITE_URL, OG_BASE } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古iPhoneの選び方 完全ガイド（2026-11-22〜）: 保存版の横動画（longform/2026-12-05-iphone-guide）の章を、数字つきの1ページに。
 * 「中古iphone 選び方」のような広い問いに答えるページ（ChatGPT など AI の引用先になるように、章ごとに結論の1文＋表）。
 * 数字はビルドのたびに DB から（count・aggregate・中央値の1行だけ。findMany で全件は読まない）。ジャンクは除く。
 * 事実は公式で確かめた値だけ: iOS 27（lib/catalog.ts）・電池交換（lib/appleRepairPrices.ts）・新品（lib/applePrices.ts）・店（lib/shops.ts）。
 * 「届いたら見る5つ」は Apple のサポート（101575・108037・108794・102658）で 11/22 に確かめた表記。SIM ロックの表記は確かめられず入れていない。
 */
const PATH = "/iphone/guide";
const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";

type W = Prisma.DeviceInventoryWhereInput;
const NOT_JUNK: W = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
type Stat = { n: number; min: number | null; median: number | null };

async function stat(model: string, gb: number, extra: W = {}): Promise<Stat> {
  const where: W = { AND: [await modelWhere(model), { storage: gb }, NOT_JUNK, extra] };
  const a = await prisma.deviceInventory.aggregate({ where, _count: { _all: true }, _min: { price: true } });
  const n = a._count._all;
  return { n, min: a._min.price, median: n ? await medianPrice(where, n) : null };
}

const short = (m: string) => m.replace("iPhone ", "");
const signed = (v: number) => `${v > 0 ? "+" : "−"}${yen(Math.abs(v))}`;

// 予算別（BEST5・保存版と同じ決め方: iOS 27 対応の 12 シリーズ以降と SE 第3世代・在庫300件以上・予算から1万円以内で相場がいちばん高い）
const BUDGET_MODELS = ["iPhone SE (第3世代)", "iPhone 12 mini", "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max", "iPhone 13 mini", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max", "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max", "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max", "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max", "iPhone 16e", "iPhone 17", "iPhone 17e", "iPhone Air", "iPhone 17 Pro"];
const BUDGETS = [40000, 50000, 70000, 100000, 150000];

const BANDS: [string, W][] = [
  ["90%以上", { batteryHealth: { gte: 90, lte: 99 } }],
  ["85〜89%", { batteryHealth: { gte: 85, lte: 89 } }],
  ["80〜84%", { batteryHealth: { gte: 80, lte: 84 } }],
  ["80%未満", { batteryHealth: { lt: 80 } }],
];

async function getData() {
  const shops = await activeShops();
  const updated = (await prisma.deviceInventory.aggregate({ where: { isSoldOut: false, modelName: { startsWith: "iPhone" } }, _max: { updatedAt: true } }))._max.updatedAt;

  // 1 世代（64GB の中央値）
  const gen = [];
  for (const m of ["iPhone XR", "iPhone SE (第2世代)", "iPhone 11", "iPhone 12"]) gen.push({ m, ios27: ALL_CATALOG_MODELS.includes(m), s: await stat(m, 64) });

  // 2 電池（128GB）
  const battery = [];
  for (const m of ["iPhone 13", "iPhone 14", "iPhone 15"]) {
    const bands = [];
    for (const [label, w] of BANDS) bands.push({ label, s: await stat(m, 128, w) });
    battery.push({ m, bands, swap: appleRepair(m)?.battery ?? null, all: await stat(m, 128), ok: await stat(m, 128, { batteryHealth: { gte: 85 } }) });
  }

  // 3 新品と中古（同じ容量）
  const newUsed = [];
  for (const [m, gb] of [["iPhone 17e", 256], ["iPhone 17", 256], ["iPhone Air", 256], ["iPhone 16", 128]] as [string, number][]) {
    const p = applePrice(m, gb);
    const s = await stat(m, gb);
    if (p && s.median && s.n >= 5) newUsed.push({ m, gb, p, used: s.median });
  }

  // 4 状態ランク（128GB）
  const rank = [];
  for (const m of ["iPhone 13", "iPhone 14", "iPhone 15"]) rank.push({ m, a: await stat(m, 128, { conditionRank: { in: ["A", "a"] } }), c: await stat(m, 128, { conditionRank: { in: ["C", "c"] } }) });

  // 5 容量
  const storage = [];
  for (const [m, a, b] of [["iPhone 12", 64, 128], ["iPhone 13", 128, 256], ["iPhone 15", 128, 256], ["iPhone 16", 128, 256]] as [string, number, number][]) storage.push({ m, a, b, x: await stat(m, a), y: await stat(m, b) });

  // 7 予算別
  const market = await getModelMarket(BUDGET_MODELS);
  const budget = BUDGETS.map((b) => {
    const pick = BUDGET_MODELS.map((m) => ({ m, r: market.get(m) }))
      .filter((x) => x.r && x.r.count >= 300 && x.r.medianPrice <= b && x.r.medianPrice > b - 10000)
      .sort((x, y) => y.r!.medianPrice - x.r!.medianPrice)[0];
    return { b, pick: pick ? { m: pick.m, price: pick.r!.medianPrice, gb: pick.r!.medianStorage, count: pick.r!.count } : null };
  });

  return { shops, updated, gen, battery, newUsed, rank, storage, budget };
}

const monthText = (d: Date) => d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long" });

export async function generateMetadata(): Promise<Metadata> {
  const title = `中古iPhoneの選び方 完全ガイド｜世代・電池・容量・店・届いたら見る5つ【${monthText(new Date())}】`;
  const description = "中古iPhoneをどれにするか、どこで買うかを、在庫の相場で決めるガイド。iOS 27 の線引き、電池の%ごとの相場、状態ランク、容量、新品との差、店の保証、予算別のおすすめ、届いたら見る5つ（毎日更新）。";
  return { title, description, alternates: { canonical: PATH }, openGraph: { ...OG_BASE, title: `${title} | ${SITE_NAME}`, description, url: PATH, images: ["/iphone/opengraph-image"] } };
}

function H2({ n, children }: { n: number; children: React.ReactNode }) {
  return <h2 className="text-lg md:text-xl font-bold"><span className="text-brand-600 mr-1.5 tabular-nums">{n}.</span>{children}</h2>;
}
function Rows({ rows, caption }: { rows: { k: React.ReactNode; v: React.ReactNode; sub?: React.ReactNode }[]; caption: string }) {
  return (
    <table className={`w-full ${CARD} text-[13px] tabular-nums overflow-hidden`}>
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i ? "border-t border-line-soft" : ""}>
            <th scope="row" className="text-left font-normal px-3.5 py-2.5 min-w-[6em]">{r.k}</th>
            <td className="text-right px-3.5 py-2.5">
              <span className="font-bold whitespace-nowrap">{r.v}</span>
              {r.sub && <span className="block text-[10px] text-ink-mute">{r.sub}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function GuidePage() {
  const d = await getData();
  const dateText = (d.updated ?? new Date()).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const shopNum = d.shops.length;
  const redRom = d.shops.filter((s) => s.redRom && !/なし|記載なし/.test(s.redRom)).length;
  const exact = d.shops.filter((s) => s.battery === "exact").length;
  const year = d.shops.filter((s) => s.yearWarranty).length;

  const b14 = d.battery.find((x) => x.m === "iPhone 14");
  const b14hi = b14?.bands[0].s.median, b14lo = b14?.bands[2].s.median;
  const b13 = d.battery.find((x) => x.m === "iPhone 13");
  const b13low = b13?.bands[3].s.median;

  const lead = `${dateText}時点の大手中古ショップ${shopNum}店の在庫から、中古iPhoneは「iOS 27 に対応する世代（iPhone 11・SE 第2世代以降）」「電池85%以上」「赤ロム保証と保証の長さで選んだ店」の3つで決めるのがおすすめです。${b14hi && b14lo ? `iPhone 14（128GB）は電池90%以上の相場が${yen(b14hi)}、80〜84%が${yen(b14lo)}で、電池の%が高くても高いとは限りません。` : ""}`;

  const faqs = [
    { q: "中古iPhoneは何世代前まで買っていい？", a: "iOS 27 に対応する iPhone 11 以降と iPhone SE（第2世代）以降が目安です（Apple 公式）。iPhone XR などは iOS 27 に対応していません。" },
    { q: "中古iPhoneの電池は何%なら買っていい？", a: `目安は85%以上です。${b13 && b13low && b13.swap && b13.ok.median ? `iPhone 13（128GB）は80%未満の相場が${yen(b13low)}ですが、Apple の電池交換${yen(b13.swap)}を足すと${yen(b13low + b13.swap)}になり、85%以上の相場${yen(b13.ok.median)}より高くなります。` : ""}` },
    { q: "中古iPhoneが届いたら何を確かめる？", a: "アクティベーションロック（前の持ち主の Apple Account を求められないか）、電池の最大容量（設定 > バッテリー > バッテリーの状態）、IMEI でネットワーク利用制限（設定 > 一般 > 情報）、部品と修理の履歴（設定 > 一般 > 情報）、カメラ・Face ID・スピーカー・充電の5つです。" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPhoneの相場一覧", item: `${SITE_URL}/iphone` },
        { "@type": "ListItem", position: 3, name: "中古iPhoneの選び方", item: `${SITE_URL}${PATH}` },
      ],
    },
    { "@context": "https://schema.org", "@type": "WebPage", name: "中古iPhoneの選び方 完全ガイド", url: `${SITE_URL}${PATH}`, description: lead, ...(d.updated ? { dateModified: d.updated.toISOString() } : {}) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="中古iPhoneの選び方" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/iphone" className="hover:text-brand-800">中古iPhoneの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">選び方</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">中古iPhoneの選び方 完全ガイド</h1>
          <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">
            {lead}
            <Link href="/about#data" className={`${LINK} ml-1 whitespace-nowrap`}>集計の方法</Link>
          </p>
        </div>

        {/* 早見表 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">早見表</h2>
          <Rows caption="中古iPhoneの選び方の早見表" rows={[
            { k: "世代", v: "iOS 27 対応", sub: "iPhone 11・SE（第2世代）以降" },
            { k: "電池", v: "85%以上", sub: "80%未満は電池交換を足すと割高" },
            { k: "容量", v: "128GB以上", sub: "迷ったら256GB" },
            { k: "店", v: "赤ロム保証と保証の長さ", sub: `赤ロム保証の記載 ${redRom}店／${shopNum}店` },
            { k: "届いたら", v: "その日に5つを確かめる", sub: "店の保証の期間内に" },
          ]} />
        </section>

        {/* 1 世代 */}
        <section className="flex flex-col gap-2">
          <H2 n={1}>何世代まで買っていい？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">線は iOS 27 に対応しているか。対応するのは iPhone 11 以降と SE（第2世代）以降で、対応していない機種とも値段の差は小さめです。</p>
          <Rows caption="iOS 27 の対応と64GBの相場" rows={d.gen.map((g) => ({
            k: <Link href={modelPagePath(g.m)} className={LINK}>{short(g.m)}</Link>,
            v: g.s.median ? yen(g.s.median) : "在庫なし",
            sub: `iOS 27 ${g.ios27 ? "対応" : "非対応"}・64GB・${g.s.n.toLocaleString()}件`,
          }))} />
          <p className="text-[11px] text-ink-mute">修理を受けられる期間とバッテリー交換の料金は <Link href="/iphone/how-long" className={LINK}>いつまで使える？</Link> に機種別でまとめています。</p>
        </section>

        {/* 2 電池 */}
        <section className="flex flex-col gap-2">
          <H2 n={2}>電池は何%なら買っていい？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">目安は85%以上。電池の%が高いほど高いとは限らず、機種によっては90%以上でも80%台と同じくらいの値段です。</p>
          {d.battery.map((b) => (
            <div key={b.m} className="flex flex-col gap-1">
              <h3 className="text-sm font-bold"><Link href={modelPagePath(b.m)} className={LINK}>{b.m}</Link>（128GB）</h3>
              <Rows caption={`${b.m} 128GB の電池の%ごとの相場`} rows={b.bands.map((x) => ({
                k: x.label,
                // 20件未満は店1〜2つの値付けで動くので出さない
                v: x.s.median && x.s.n >= 20 ? yen(x.s.median) : "—",
                sub: x.s.n >= 20 ? `${x.s.n.toLocaleString()}件` : `${x.s.n}件（少ないので相場は出さない）`,
              }))} />
            </div>
          ))}
          {b13 && b13low && b13.swap && b13.ok.median && (
            <p className="text-sm text-ink-sub leading-relaxed">
              {`iPhone 13 の80%未満（${yen(b13low)}）に Apple の電池交換${yen(b13.swap)}を足すと${yen(b13low + b13.swap)}。85%以上の相場${yen(b13.ok.median)}より${yen(b13low + b13.swap - b13.ok.median)}高くなります。`}
            </p>
          )}
          <p className="text-[11px] text-ink-mute">電池の書き方は店ごとに違います（%で書く店・「80%以上」とだけ書く店・書かない店）。<Link href="/iphone/battery" className={LINK}>電池の%の見方</Link></p>
        </section>

        {/* 3 値段 */}
        <section className="flex flex-col gap-2">
          <H2 n={3}>いちばん安い1台と、新品との差</H2>
          {b13 && b13.all.min && b13.ok.min && (
            <p className="text-sm text-ink-sub leading-relaxed">{`iPhone 13（128GB）のいちばん安い在庫は${yen(b13.all.min)}、電池85%以上でいちばん安いのは${yen(b13.ok.min)}。最安の1台には、たいてい理由があります。`}</p>
          )}
          <p className="text-sm text-ink-sub leading-relaxed">新しい機種は、中古の相場が Apple の新品に近いか、上回ることもあります。差が小さいなら新品（電池100%・Apple の1年限定保証）も候補です。</p>
          <Rows caption="Apple の新品と中古の相場の差" rows={d.newUsed.map((x) => ({
            k: <><Link href={modelPagePath(x.m)} className={LINK}>{short(x.m)}</Link> <span className="text-ink-mute text-[11px]">{x.gb}GB</span></>,
            v: `中古 ${signed(x.used - x.p)}`,
            sub: `新品 ${yen(x.p)}・中古 ${yen(x.used)}`,
          }))} />
        </section>

        {/* 4 ランク */}
        <section className="flex flex-col gap-2">
          <H2 n={4}>状態ランクは気にしなくていい？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">ランクの差はほとんどが外装の傷の差です。ケースを付けるなら、ランクより電池を優先した方が使いやすさに効きます。</p>
          <Rows caption="状態ランクAとCの相場（128GB）" rows={d.rank.map((r) => ({
            k: <Link href={modelPagePath(r.m)} className={LINK}>{short(r.m)}</Link>,
            v: r.a.median && r.c.median ? `A と C の差 ${yen(r.a.median - r.c.median)}` : "—",
            sub: `A ${r.a.median ? yen(r.a.median) : "—"}・C ${r.c.median ? yen(r.c.median) : "—"}（128GB）`,
          }))} />
          <p className="text-[11px] text-ink-mute">ランクの基準は店ごとに違います。</p>
        </section>

        {/* 5 容量 */}
        <section className="flex flex-col gap-2">
          <H2 n={5}>容量は128GBで足りる？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">64GB は差が小さいので128GB に。写真をクラウドに置かないなら256GB が安心です。</p>
          <Rows caption="容量を1つ上げたときの相場の差" rows={d.storage.map((s) => ({
            k: <Link href={modelPagePath(s.m)} className={LINK}>{short(s.m)}</Link>,
            v: s.x.median && s.y.median ? `+${yen(s.y.median - s.x.median)}` : "—",
            sub: `${s.a}GB ${s.x.median ? yen(s.x.median) : "—"} → ${s.b}GB ${s.y.median ? yen(s.y.median) : "—"}`,
          }))} />
        </section>

        {/* 6 店 */}
        <section className="flex flex-col gap-2">
          <H2 n={6}>どこで買う？店ごとの違い</H2>
          <p className="text-sm text-ink-sub leading-relaxed">見るのは赤ロム保証・電池の書き方・故障の保証の3つ。いちばん安い店は機種ごとに入れ替わるので、機種を決めてから店をまたいで比べるのが安く買う近道です。</p>
          <Rows caption="店ごとの違い" rows={[
            { k: "赤ロム保証を案内に書いている", v: `${redRom}店`, sub: `在庫のある${shopNum}店のうち` },
            { k: "電池を%で書いている", v: `${exact}店` },
            { k: "故障の保証が1年", v: `${year}店` },
          ]} />
          <p className="text-[11px] text-ink-mute">店ごとの保証・赤ロム・電池の表記は <Link href="/iphone/where-to-buy" className={LINK}>どこで買う？</Link> の表で。</p>
        </section>

        {/* 7 予算 */}
        <section className="flex flex-col gap-2">
          <H2 n={7}>予算別：いま買うなら</H2>
          <p className="text-sm text-ink-sub leading-relaxed">iOS 27 対応・在庫300件以上で、予算から1万円下までに相場が入る機種のうち、相場がいちばん高い機種です（好みでは選んでいません）。</p>
          <Rows caption="予算別のおすすめ" rows={d.budget.map((x) => ({
            k: <Link href={budgetPath(x.b)} className={LINK}>{x.b / 10000}万円</Link>,
            v: x.pick ? <Link href={modelPagePath(x.pick.m)} className={LINK}>{short(x.pick.m)}</Link> : "該当なし",
            sub: x.pick ? `${yen(x.pick.price)}（${x.pick.gb}GB）・${x.pick.count.toLocaleString()}件` : undefined,
          }))} />
        </section>

        {/* 8 届いたら */}
        <section className="flex flex-col gap-2">
          <H2 n={8}>届いたらまず見る5つ</H2>
          <ol className={`${CARD} divide-y divide-line-soft text-sm`}>
            {[
              { t: "アクティベーションロック", d: "初期設定で前の持ち主の Apple Account を求められたら、まだ前の持ち主のアカウントに紐付いています。すぐ店に連絡を。" },
              { t: "電池の最大容量", d: "設定 > バッテリー > バッテリーの状態。店の表記と合っているか。" },
              { t: "ネットワーク利用制限", d: "設定 > 一般 > 情報 で IMEI を見て、携帯会社のサイトで調べる。" },
              { t: "部品と修理の履歴", d: "設定 > 一般 > 情報。「不明」と出る部品は、純正でない部品に替えられているなどのことがあります。" },
              { t: "カメラ・Face ID・スピーカー・充電", d: "写真と動画を1本ずつ撮り、Face ID を登録し、音を鳴らし、ケーブルで充電する。10分ほどで終わります。" },
            ].map((x, i) => (
              <li key={x.t} className="flex gap-3 px-3.5 py-2.5">
                <span className="shrink-0 font-bold text-brand-600 tabular-nums">{i + 1}</span>
                <span><span className="font-bold">{x.t}</span><span className="block text-[13px] text-ink-sub leading-relaxed">{x.d}</span></span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-ink-mute">店の保証は「初期不良14日」から「返品・交換1年」まで店で違います。気づくのが遅れると期間が過ぎるので、届いた日に。</p>
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
            iOS 27: <a href="https://www.apple.com/jp/ios/" target="_blank" rel="noopener" className={LINK}>Apple「iOS」</a>・
            電池交換: <a href={APPLE_REPAIR_SOURCE.battery} target="_blank" rel="noopener" className={LINK}>Apple「iPhone のバッテリー交換」</a>・
            新品の価格: Apple Store・
            届いたら見る5つ: Apple サポート（<a href="https://support.apple.com/ja-jp/101575" target="_blank" rel="noopener" className={LINK}>バッテリー</a>・<a href="https://support.apple.com/ja-jp/108037" target="_blank" rel="noopener" className={LINK}>IMEI</a>・<a href="https://support.apple.com/ja-jp/108794" target="_blank" rel="noopener" className={LINK}>アクティベーションロック</a>・<a href="https://support.apple.com/ja-jp/102658" target="_blank" rel="noopener" className={LINK}>部品と修理の履歴</a>）。
            中古: 大手中古ショップの販売中の在庫（ジャンク除く・{dateText}時点・1日4回取得）・相場は中央値。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2"><Link href="/iphone" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古iPhoneの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
