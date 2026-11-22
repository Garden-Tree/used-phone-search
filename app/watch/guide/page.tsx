import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import ChargerNote from "@/app/components/ChargerNote";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeWatchShops } from "@/lib/activeShops";
import { findShop } from "@/lib/shops";
import { modelPagePath } from "@/lib/catalog";
import { WATCH_INFO, WATCH_MODELS, WATCHOS27_IPHONE, isWatchOS27 } from "@/lib/watchCatalog";
import { WATCH_SOURCES, WATCH_SPECS } from "@/lib/watchSpecs";
import { yen } from "@/lib/format";
import { SITE_NAME, SITE_URL, OG_BASE } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古Apple Watchの選び方 完全ガイド（2026-11-22〜）: /ipad/guide の Apple Watch 版。
 * DB では modelName＝世代、storage＝ケースのサイズ（mm）、carrier＝"GPS" か "GPS+Cellular"（lib/watchCatalog.ts）。
 * 数字はビルドのたびに DB から（count・aggregate・groupBy・中央値の1行だけ。findMany で全件は読まない）。ジャンクは除く。20件未満の相場は出さない。
 * 事実は公式で確かめた値だけ: watchOS 27・ケースのサイズ（lib/watchCatalog.ts）・チップ・電池の時間・心電図・耐水（lib/watchSpecs.ts）・店（lib/shops.ts）。
 * 「届いたら見る」は Apple Watch 向けの Apple サポートの URL がリポジトリにないので、リンクなしの一般的な確認だけ。
 * 充電器なしの札（networkStatus "充電ケーブルなし"・"充電ホルダーなし"）は数えて、あるときだけ ChargerNote を出す（11/22 時点の Apple Watch は0件）。
 */
const PATH = "/watch/guide";
const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";
const MIN_N = 20;

type W = Prisma.DeviceInventoryWhereInput;
const NOT_JUNK: W = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
type Stat = { n: number; median: number | null };

async function stat(model: string, mm: number, extra: W = {}): Promise<Stat> {
  const where: W = { AND: [await modelWhere(model), { storage: mm }, NOT_JUNK, extra] };
  const n = await prisma.deviceInventory.count({ where });
  return { n, median: n ? await medianPrice(where, n) : null };
}
const ok = (s: Stat) => s.median !== null && s.n >= MIN_N;

const short = (m: string) => m.replace(/^Apple Watch /, "");
/** 差の表示（0 は「差なし」、マイナスはそのまま） */
const diff = (x: number) => (x === 0 ? "差なし" : x > 0 ? `+${yen(x)}` : `−${yen(-x)}`);

// 1 watchOS 27 の線（系統ごとに、対応するいちばん古い機種と、対応しないいちばん新しい機種）
const GEN_PAIRS: [string, string][] = [
  ["Apple Watch Series 9", "Apple Watch Series 8"],
  ["Apple Watch Ultra 2", "Apple Watch Ultra"],
  ["Apple Watch SE 3", "Apple Watch SE（第2世代）"],
];
// 2 系統の違い（いま中古で多い代表）
const SERIES: [string, string][] = [
  ["SE", "Apple Watch SE 3"],
  ["Series", "Apple Watch Series 10"],
  ["Series", "Apple Watch Series 11"],
  ["Ultra", "Apple Watch Ultra 2"],
];
const GPS: W = { carrier: "GPS" };
const CELL: W = { carrier: "GPS+Cellular" };
const BANDS: [string, W][] = [
  ["90%以上", { batteryHealth: { gte: 90 } }],
  ["85〜89%", { batteryHealth: { gte: 85, lte: 89 } }],
  ["80〜84%", { batteryHealth: { gte: 80, lte: 84 } }],
  ["80%未満", { batteryHealth: { lt: 80 } }],
];
const BATTERY_MODEL: [string, number] = ["Apple Watch Series 10", 46];
// 予算別（在庫50件以上・予算から1万円以内で相場がいちばん高い）
const BUDGETS = [20000, 30000, 40000, 50000, 70000, 90000];
const MIN_BUDGET_N = 50;

async function getData() {
  const shops = await activeWatchShops();
  const watchBase: W = { isSoldOut: false, modelName: { startsWith: "Apple Watch" } };
  const watchW: W = { ...watchBase, ...NOT_JUNK };
  const updated = (await prisma.deviceInventory.aggregate({ where: watchBase, _max: { updatedAt: true } }))._max.updatedAt;
  const total = await prisma.deviceInventory.count({ where: watchW });
  const withBattery = await prisma.deviceInventory.count({ where: { ...watchW, batteryHealth: { not: null } } });
  const noCharger = await prisma.deviceInventory.count({ where: { ...watchW, networkStatus: { in: ["充電ケーブルなし", "充電ホルダーなし"] } } });

  // 店ごとの件数と、電池の%が書かれた件数（別の売り場は親の店に合算）
  const parentName = (name: string) => { const s = findShop(name); return s?.alias ?? s?.name ?? name; };
  const byShop = new Map<string, { n: number; battery: number }>();
  for (const r of await prisma.deviceInventory.groupBy({ by: ["shopName"], where: watchW, _count: { _all: true } })) {
    const k = parentName(r.shopName); const v = byShop.get(k) ?? { n: 0, battery: 0 }; v.n += r._count._all; byShop.set(k, v);
  }
  for (const r of await prisma.deviceInventory.groupBy({ by: ["shopName"], where: { ...watchW, batteryHealth: { not: null } }, _count: { _all: true } })) {
    const k = parentName(r.shopName); const v = byShop.get(k) ?? { n: 0, battery: 0 }; v.battery += r._count._all; byShop.set(k, v);
  }

  const market = await getModelMarket(WATCH_MODELS);
  const mk = (m: string) => market.get(m) ?? null;
  const top = WATCH_MODELS.map((m) => ({ m, r: mk(m) })).filter((x) => x.r).sort((a, b) => b.r!.count - a.r!.count)[0] ?? null;

  const gen = GEN_PAIRS.map(([a, b]) => ({ a, b, ra: mk(a), rb: mk(b) }));
  const series = SERIES.map(([label, m]) => ({ label, m, r: mk(m), info: WATCH_INFO[m], spec: WATCH_SPECS[m] }));

  // ケースのサイズの差（GPS モデルどうし。小さい方と大きい方）
  const size = [];
  for (const m of ["Apple Watch SE（第2世代）", "Apple Watch SE 3", "Apple Watch Series 9", "Apple Watch Series 10", "Apple Watch Series 11"]) {
    const [a, b] = WATCH_INFO[m].sizes;
    const x = await stat(m, a, GPS), y = await stat(m, b, GPS);
    if (ok(x) && ok(y)) size.push({ m, a, b, x, y });
  }

  // GPS と GPS+Cellular（同じケースのサイズどうし）
  const cell = [];
  for (const [m, mm] of [["Apple Watch SE（第2世代）", 40], ["Apple Watch SE 3", 44], ["Apple Watch Series 9", 45], ["Apple Watch Series 10", 46], ["Apple Watch Series 11", 46]] as [string, number][]) {
    const g = await stat(m, mm, GPS), c = await stat(m, mm, CELL);
    // 中央値がぴったり同じ機種は、店が通信方式で値段を分けていない（ゲオなど）か読み取りのずれの見込みが大きいので出さない（11/22）
    if (ok(g) && ok(c) && c.median! > g.median!) cell.push({ m, mm, g, c });
  }

  const battery = [];
  for (const [label, w] of BANDS) battery.push({ label, s: await stat(BATTERY_MODEL[0], BATTERY_MODEL[1], w) });

  const rank = [];
  for (const [m, mm] of [["Apple Watch SE（第2世代）", 40], ["Apple Watch SE 3", 40], ["Apple Watch Series 9", 45], ["Apple Watch Series 10", 46], ["Apple Watch Ultra 2", 49]] as [string, number][]) {
    const a = await stat(m, mm, { conditionRank: { in: ["A", "a"] } }), c = await stat(m, mm, { conditionRank: { in: ["C", "c"] } });
    if (ok(a) && ok(c)) rank.push({ m, mm, a, c });
  }

  const budget = BUDGETS.map((b) => {
    const pick = WATCH_MODELS.map((m) => ({ m, r: mk(m) }))
      .filter((x) => x.r && x.r.count >= MIN_BUDGET_N && x.r.medianPrice <= b && x.r.medianPrice > b - 10000)
      .sort((x, y) => y.r!.medianPrice - x.r!.medianPrice)[0];
    return { b, pick: pick ? { m: pick.m, price: pick.r!.medianPrice, mm: pick.r!.medianStorage, count: pick.r!.count } : null };
  });

  return { shops, byShop, updated, total, withBattery, noCharger, top, gen, series, size, cell, battery, rank, budget };
}

const monthText = (d: Date) => d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long" });

export async function generateMetadata(): Promise<Metadata> {
  const title = `中古Apple Watchの選び方 完全ガイド｜世代・SE／Series／Ultra・サイズ・GPSとセルラー・届いたら見る【${monthText(new Date())}】`;
  const description = "中古Apple Watchをどれにするか、どこで買うかを、在庫の相場で決めるガイド。watchOS 27 の線引き、SE・Series・Ultra の違い、ケースのサイズと GPS／GPS+Cellular の差、電池と状態ランク、店の違い、予算別のおすすめ、届いたら見ること（毎日更新）。";
  return { title, description, alternates: { canonical: PATH }, openGraph: { ...OG_BASE, title: `${title} | ${SITE_NAME}`, description, url: PATH, images: ["/watch/opengraph-image"] } };
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
const mlink = (m: string) => <Link href={modelPagePath(m)} className={LINK}>{short(m)}</Link>;
const mkt = (r: { medianPrice: number; medianStorage: number | null; count: number } | null) =>
  r ? `${yen(r.medianPrice)}` : "在庫なし";
const mktSub = (r: { medianStorage: number | null; count: number } | null) =>
  r ? `${r.medianStorage ?? "—"}mm・${r.count.toLocaleString()}件` : "";

export default async function WatchGuidePage() {
  const d = await getData();
  const dateText = (d.updated ?? new Date()).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const shopNum = d.shops.length;
  const batteryPct = d.total ? Math.round((d.withBattery / d.total) * 100) : 0;
  const batteryShops = d.shops.filter((s) => (d.byShop.get(s.name)?.battery ?? 0) > 0);

  const s9 = d.gen[0];
  const c10 = d.cell.find((x) => x.m === "Apple Watch Series 10");
  const cellMin = d.cell.length ? d.cell.reduce((a, b) => (b.c.median! - b.g.median! < a.c.median! - a.g.median! ? b : a)) : null;
  const cellMax = d.cell.length ? d.cell.reduce((a, b) => (b.c.median! - b.g.median! > a.c.median! - a.g.median! ? b : a)) : null;
  const sizeMin = d.size.length ? Math.min(...d.size.map((s) => s.y.median! - s.x.median!)) : null;
  const sizeMax = d.size.length ? Math.max(...d.size.map((s) => s.y.median! - s.x.median!)) : null;

  const lead = `${dateText}時点の大手中古ショップ${shopNum}店の在庫${d.total.toLocaleString()}件から、中古Apple Watchは「watchOS 27 に対応する世代」「SE・Series・Ultra のどれか」「ケースのサイズと GPS／GPS+Cellular」の3つで決めるのがおすすめです。${d.top ? `いちばん在庫が多いのは ${short(d.top.m)} で、相場は${yen(d.top.r!.medianPrice)}（${d.top.r!.medianStorage}mm）。` : ""}`;

  const faqs = [
    { q: "中古Apple Watchは何世代前まで買っていい？", a: `watchOS 27 に対応する機種が目安です（Apple 公式）。Series 9 以降・Ultra 2 以降・SE 3 が対応しています。使うには ${WATCHOS27_IPHONE} が必要です。${s9.ra ? `Series 9 の相場は${yen(s9.ra.medianPrice)}（${s9.ra.medianStorage}mm）です。` : ""}` },
    { q: "中古Apple WatchはGPSモデルとGPS+Cellularモデルのどっちがいい？", a: `iPhone を持ち歩くなら GPS モデルで足ります。iPhone を置いて Apple Watch だけで通話・通信したいときに GPS+Cellular を選びます。${c10 ? `Series 10 の46mm は GPS+Cellular の相場が${yen(c10.c.median!)}、GPS が${yen(c10.g.median!)}です。` : ""}Ultra は GPS+Cellular だけです。` },
    { q: "中古Apple Watchが届いたら何を確かめる？", a: "前の持ち主の Apple Account を求められないか（アクティベーションロック）、自分の iPhone とペアリングできるか、充電できるか（充電器が付いているか）、画面・ボタン・センサーが動くかの4つです。" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古Apple Watchの相場一覧", item: `${SITE_URL}/watch` },
        { "@type": "ListItem", position: 3, name: "中古Apple Watchの選び方", item: `${SITE_URL}${PATH}` },
      ],
    },
    { "@context": "https://schema.org", "@type": "WebPage", name: "中古Apple Watchの選び方 完全ガイド", url: `${SITE_URL}${PATH}`, description: lead, ...(d.updated ? { dateModified: d.updated.toISOString() } : {}) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="中古Apple Watchの選び方" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/watch" className="hover:text-brand-800">中古Apple Watchの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">選び方</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">中古Apple Watchの選び方 完全ガイド</h1>
          <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">
            {lead}
            <Link href="/about#data" className={`${LINK} ml-1 whitespace-nowrap`}>集計の方法</Link>
          </p>
        </div>

        {/* 早見表 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">早見表</h2>
          <Rows caption="中古Apple Watchの選び方の早見表" rows={[
            { k: "世代", v: "watchOS 27 対応", sub: "Series 9 以降・Ultra 2 以降・SE 3" },
            { k: "系統", v: "SE・Series・Ultra", sub: "Ultra は49mm・GPS+Cellular だけ" },
            { k: "サイズ", v: "大きい方も比べる", sub: sizeMin !== null && sizeMax !== null ? `GPS どうしの差 ${diff(sizeMin)}〜${diff(sizeMax)}` : "機種ごとに2サイズ" },
            { k: "通信", v: "iPhone を持ち歩くなら GPS", sub: cellMin && cellMax ? `GPS+Cellular の差 ${diff(cellMin.c.median! - cellMin.g.median!)}〜${diff(cellMax.c.median! - cellMax.g.median!)}` : "Watch だけで通信するなら GPS+Cellular" },
            { k: "店", v: "保証の長さと電池の書き方", sub: `電池の%を書いている在庫 ${batteryPct}%` },
            { k: "届いたら", v: "その日に4つを確かめる", sub: "店の保証の期間内に" },
          ]} />
        </section>

        {/* 1 世代 */}
        <section className="flex flex-col gap-2">
          <H2 n={1}>何世代まで買っていい？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">線は watchOS 27 に対応しているか。系統ごとに、対応するいちばん古い機種と、対応しないいちばん新しい機種を並べました。使うには {WATCHOS27_IPHONE} が必要です。</p>
          <Rows caption="watchOS 27 の線の前後の相場" rows={d.gen.flatMap((g) => [
            { k: <>{mlink(g.a)} <span className="text-[11px] text-ink-mute">{isWatchOS27(g.a) ? "対応" : "非対応"}</span></>, v: mkt(g.ra), sub: mktSub(g.ra) },
            { k: <>{mlink(g.b)} <span className="text-[11px] text-ink-mute">{isWatchOS27(g.b) ? "対応" : "非対応"}</span></>, v: mkt(g.rb), sub: mktSub(g.rb) },
          ])} />
          <p className="text-[11px] text-ink-mute">相場は在庫がいちばん多いケースのサイズの中央値（サイズは機種で違います）。全機種は <Link href="/watch" className={LINK}>中古Apple Watchの相場一覧</Link> に。</p>
        </section>

        {/* 2 系統 */}
        <section className="flex flex-col gap-2">
          <H2 n={2}>SE・Series・Ultra、どれにする？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">違いはケースのサイズ、電池の持ち、健康の機能（心電図など）です。Ultra はケースが49mm の1サイズで、GPS+Cellular モデルだけです。</p>
          <Rows caption="系統ごとの代表の機種" rows={d.series.map((s) => ({
            k: <>{mlink(s.m)} <span className="text-[11px] text-ink-mute">{s.label}</span></>,
            v: mkt(s.r),
            sub: [
              s.info ? s.info.sizes.map((x) => `${x}mm`).join("・") : null,
              s.spec ? `${s.spec.chip}・最大${s.spec.batteryHours}時間・心電図${s.spec.ecg ? "あり" : "なし"}・耐水${s.spec.waterResistance}` : null,
              s.r ? `相場は${s.r.medianStorage}mm` : null,
            ].filter(Boolean).join("・"),
          }))} />
          <p className="text-[11px] text-ink-mute">ケースのサイズは Apple「Apple Watch を識別する」、チップ・電池の時間（通常使用の最大）・心電図・耐水は Apple「Apple Watch を比較する」から。</p>
        </section>

        {/* 3 サイズ */}
        {d.size.length > 0 && (
          <section className="flex flex-col gap-2">
            <H2 n={3}>ケースのサイズはどっち？</H2>
            <p className="text-sm text-ink-sub leading-relaxed">同じ世代でもケースは2サイズあります。手首の大きさと、画面の見やすさで選びます。GPS モデルどうしで、大きい方にするといくら上がるかを並べました。</p>
            <Rows caption="ケースのサイズを上げたときの相場の差" rows={d.size.map((s) => ({
              k: mlink(s.m),
              v: diff(s.y.median! - s.x.median!),
              sub: `${s.a}mm ${yen(s.x.median!)}（${s.x.n}件） → ${s.b}mm ${yen(s.y.median!)}（${s.y.n}件）`,
            }))} />
          </section>
        )}

        {/* 4 通信 */}
        {d.cell.length > 0 && (
          <section className="flex flex-col gap-2">
            <H2 n={4}>GPS モデルと GPS+Cellular モデル</H2>
            <p className="text-sm text-ink-sub leading-relaxed">iPhone を持ち歩くなら GPS モデルで足ります。iPhone を置いて Apple Watch だけで通話・通信したいなら GPS+Cellular。同じケースのサイズどうしで比べました。</p>
            <Rows caption="GPS モデルと GPS+Cellular モデルの相場" rows={d.cell.map((x) => ({
              k: <>{mlink(x.m)} <span className="text-[11px] text-ink-mute">{x.mm}mm</span></>,
              v: `GPS+Cellular ${diff(x.c.median! - x.g.median!)}`,
              sub: `GPS ${yen(x.g.median!)}（${x.g.n}件）・GPS+Cellular ${yen(x.c.median!)}（${x.c.n}件）`,
            }))} />
            <p className="text-[11px] text-ink-mute">差が小さい機種は、GPS+Cellular を選んでも高くなりにくいということです。Ultra は GPS+Cellular モデルだけ（Apple「Apple Watch を識別する」）。</p>
          </section>
        )}

        {/* 5 電池とランク */}
        <section className="flex flex-col gap-2">
          <H2 n={5}>電池と状態ランク</H2>
          <p className="text-sm text-ink-sub leading-relaxed">{`Apple Watch は電池の%を書いていない在庫が多く、%が分かるのは${batteryPct}%（${d.withBattery.toLocaleString()}件）だけです。${batteryShops.length ? `%を書いている在庫があるのは${batteryShops.map((s) => s.label).join("・")}です。` : ""}電池を重く見るなら、%を書いている店か、保証の長い店を選びます。`}</p>
          {/* 相場を出せる帯が2つ以上あるときだけ（比べられないため。11/22 時点は 90%以上の1つだけ） */}
          {d.battery.filter((x) => ok(x.s)).length >= 2 && <>
            <h3 className="text-sm font-bold">{mlink(BATTERY_MODEL[0])}（{BATTERY_MODEL[1]}mm）の電池の%ごとの相場</h3>
            <Rows caption={`${short(BATTERY_MODEL[0])} ${BATTERY_MODEL[1]}mm の電池の%ごとの相場`} rows={d.battery.map((x) => ({
              k: x.label,
              v: ok(x.s) ? yen(x.s.median!) : "—",
              sub: x.s.n >= MIN_N ? `${x.s.n.toLocaleString()}件` : `${x.s.n}件（少ないので相場は出さない）`,
            }))} />
          </>}
          {d.rank.length > 0 && <>
            <p className="text-sm text-ink-sub leading-relaxed mt-2">ランクの差はほとんどが外装の傷の差です。ケースや保護フィルムを付けるなら、ランクC も候補になります。</p>
            <Rows caption="状態ランクAとCの相場" rows={d.rank.map((r) => ({
              k: <>{mlink(r.m)} <span className="text-[11px] text-ink-mute">{r.mm}mm</span></>,
              v: `A と C の差 ${diff(r.a.median! - r.c.median!).replace(/^\+/, "")}`,
              sub: `A ${yen(r.a.median!)}（${r.a.n}件）・C ${yen(r.c.median!)}（${r.c.n}件）`,
            }))} />
          </>}
          <p className="text-[11px] text-ink-mute">ランクの基準は店ごとに違います。GPS と GPS+Cellular をまぜた相場です。</p>
        </section>

        {/* 6 店 */}
        <section className="flex flex-col gap-2">
          <H2 n={6}>どこで買う？店ごとの違い</H2>
          <p className="text-sm text-ink-sub leading-relaxed">見るのは故障の保証の長さと電池の書き方。いちばん安い店は機種ごとに入れ替わるので、機種を決めてから店をまたいで比べるのが安く買う近道です。</p>
          <Rows caption="店ごとの違い" rows={d.shops.map((s) => {
            const v = d.byShop.get(s.name) ?? { n: 0, battery: 0 };
            return {
              k: s.label,
              v: `${v.n.toLocaleString()}件`,
              sub: `${s.warrantyShort}・電池の%の記載 ${v.battery.toLocaleString()}件`,
            };
          })} />
          {d.noCharger > 0 && <ChargerNote model="Apple Watch" count={d.noCharger} />}
        </section>

        {/* 7 予算 */}
        <section className="flex flex-col gap-2">
          <H2 n={7}>予算別：いま買うなら</H2>
          <p className="text-sm text-ink-sub leading-relaxed">在庫{MIN_BUDGET_N}件以上で、予算から1万円下までに相場が入る機種のうち、相場がいちばん高い機種です（好みでは選んでいません）。watchOS 27 に対応しない機種には「非対応」と付けています。</p>
          <Rows caption="予算別のおすすめ" rows={d.budget.map((x) => ({
            k: `${x.b / 10000}万円`,
            v: x.pick ? <>{mlink(x.pick.m)}{!isWatchOS27(x.pick.m) && <span className="text-[11px] text-ink-mute font-normal ml-1">非対応</span>}</> : "該当なし",
            sub: x.pick ? `${yen(x.pick.price)}（${x.pick.mm}mm）・${x.pick.count.toLocaleString()}件` : undefined,
          }))} />
        </section>

        {/* 8 届いたら */}
        <section className="flex flex-col gap-2">
          <H2 n={8}>届いたらまず見る4つ</H2>
          <ol className={`${CARD} divide-y divide-line-soft text-sm`}>
            {[
              { t: "アクティベーションロック", d: "ペアリングのときに前の持ち主の Apple Account を求められたら、まだ前の持ち主のアカウントに紐付いています。すぐ店に連絡を。" },
              { t: "自分の iPhone とペアリングできるか", d: `watchOS 27 に対応する機種は、${WATCHOS27_IPHONE} が必要です。手元の iPhone でペアリングまで進むか確かめます。` },
              { t: "充電できるか", d: "充電器が付いているか、付属の充電器で充電が始まるか。充電器が付かない品は、別に用意します。" },
              { t: "画面・ボタン・センサー", d: "画面を全体に触って反応しない所がないか、ボタンとリューズが効くか、手首に着けて心拍数が測れるか。" },
            ].map((x, i) => (
              <li key={x.t} className="flex gap-3 px-3.5 py-2.5">
                <span className="shrink-0 font-bold text-brand-600 tabular-nums">{i + 1}</span>
                <span><span className="font-bold">{x.t}</span><span className="block text-[13px] text-ink-sub leading-relaxed">{x.d}</span></span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-ink-mute">店の保証の期間は店で違います。気づくのが遅れると期間が過ぎるので、届いた日に。</p>
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
            watchOS 27 と必要な iPhone: <a href="https://www.apple.com/jp/watchos/" target="_blank" rel="noopener" className={LINK}>Apple「watchOS」</a>・
            ケースのサイズと通信方式: <a href="https://support.apple.com/ja-jp/108056" target="_blank" rel="noopener" className={LINK}>Apple「Apple Watch を識別する」</a>・
            チップ・電池の時間・心電図・耐水: <a href={WATCH_SOURCES.compare} target="_blank" rel="noopener" className={LINK}>Apple「Apple Watch を比較する」</a>。
            中古: 大手中古ショップの販売中の在庫（ジャンク除く・{dateText}時点・1日4回取得）・相場は中央値。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2"><Link href="/watch" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古Apple Watchの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
