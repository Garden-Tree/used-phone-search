import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeMacShops } from "@/lib/activeShops";
import { findShop, MAC_ONLY_SHOPS } from "@/lib/shops";
import { modelPagePath } from "@/lib/catalog";
import { MAC_INFO, MAC_MODELS } from "@/lib/macCatalog";
import { MBA_M2_VS_MBP_M1PRO } from "@/lib/macbookAirM5";
import { PC_BUDGETS, pcBudgetPath } from "@/lib/pcInventory";
import { yen } from "@/lib/format";
import { SITE_NAME, SITE_URL, OG_BASE } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古MacBookの選び方 完全ガイド（2026-11-22〜）: /ipad/guide の MacBook 版。
 * 数字はビルドのたびに DB から（count・aggregate・groupBy・中央値の1行だけ。findMany で全件は読まない）。ジャンクは除く。20件未満の相場は出さない。
 * 事実は公式で確かめた値だけ: macOS 27 の対象（Apple シリコンの MacBook Air・Pro 2020 以降と Neo。lib/macCatalog.ts）・画面サイズ・チップ・発売年（lib/macCatalog.ts）・
 * Air（M2）と Pro 14インチ（2021）の重さ・画面・端子（lib/macbookAirM5.ts の MBA_M2_VS_MBP_M1PRO）・店の保証（lib/shops.ts）。
 * Mac のアクティベーションロック・電池の見方は Apple の出典がリポジトリにないので、「届いたら」は手で確かめる項目だけにする。
 */
const PATH = "/mac/guide";
const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";
const MIN_N = 20;

type W = Prisma.DeviceInventoryWhereInput;
const NOT_JUNK: W = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
type Stat = { n: number; median: number | null };

/** 1機種・SSD 1つ（メモリなどは extra で）の件数と中央値 */
async function stat(model: string, ssd: number, extra: W = {}): Promise<Stat> {
  const where: W = { AND: [await modelWhere(model), { storage: ssd }, NOT_JUNK, extra] };
  const n = await prisma.deviceInventory.count({ where });
  return { n, median: n ? await medianPrice(where, n) : null };
}
const ok = (s: Stat) => s.median !== null && s.n >= MIN_N;

const short = (m: string) => m.replace(/^MacBook /, "");
const gb = (n: number) => (n >= 1024 ? `${n / 1024}TB` : `${n}GB`);

// 1 チップの世代（いちばん在庫が多い Air 13インチで並べる。Neo は別の線）
const GENERATIONS = ["MacBook Air 13インチ M5", "MacBook Air 13インチ M4", "MacBook Air 13インチ M3", "MacBook Air 13インチ M2", "MacBook Air M1", "MacBook Neo"];
// 2 Air と Pro（同じチップどうし）
const AIR_PRO: [string, string][] = [
  ["MacBook Air M1", "MacBook Pro 13インチ M1"],
  ["MacBook Air 13インチ M4", "MacBook Pro 14インチ M4"],
  ["MacBook Air 13インチ M5", "MacBook Pro 14インチ M5"],
];
const SPEC_AIR = "MacBook Air 13インチ M2";
const SPEC_PRO = "MacBook Pro 14インチ M1 Pro";
// 3 メモリ（同じ機種・同じ SSD でメモリだけ変える）
const MEMORY: [string, number, number, number][] = [
  ["MacBook Air M1", 256, 8, 16],
  ["MacBook Air 13インチ M2", 256, 8, 16],
  ["MacBook Air 13インチ M3", 256, 8, 16],
  ["MacBook Pro 14インチ M1 Pro", 512, 16, 32],
];
// 4 SSD（同じ機種・同じメモリで SSD だけ変える）
const STORAGE: [string, number, number, number][] = [
  ["MacBook Air M1", 8, 256, 512],
  ["MacBook Air 13インチ M2", 8, 256, 512],
  ["MacBook Air 13インチ M4", 16, 256, 512],
  ["MacBook Pro 14インチ M1 Pro", 16, 512, 1024],
];
// 5 電池とランク
const BATTERY_MODEL: [string, number, number] = ["MacBook Air M1", 8, 256];
const BANDS: [string, W][] = [
  ["90%以上", { batteryHealth: { gte: 90, lte: 99 } }],
  ["85〜89%", { batteryHealth: { gte: 85, lte: 89 } }],
  ["80〜84%", { batteryHealth: { gte: 80, lte: 84 } }],
  ["80%未満", { batteryHealth: { lt: 80 } }],
];
const RANK: [string, number, number][] = [
  ["MacBook Air M1", 8, 256],
  ["MacBook Air 13インチ M2", 8, 256],
  ["MacBook Air 13インチ M4", 16, 256],
  ["MacBook Pro 14インチ M1 Pro", 16, 512],
];
// 7 予算別（在庫50件以上・予算から2万円下までで相場がいちばん高い）
const BUDGETS = [100000, 120000, 150000, 200000, 220000, 300000];

async function getData() {
  const shops = await activeMacShops();
  const macW: W = { isSoldOut: false, modelName: { startsWith: "MacBook" }, ...NOT_JUNK };
  const updated = (await prisma.deviceInventory.aggregate({ where: { isSoldOut: false, modelName: { startsWith: "MacBook" } }, _max: { updatedAt: true } }))._max.updatedAt;
  const total = await prisma.deviceInventory.count({ where: macW });
  const withBattery = await prisma.deviceInventory.count({ where: { ...macW, batteryHealth: { not: null } } });

  // 店ごとの件数と電池の%が分かる件数（別の売り場は本店にまとめる）
  const byShop = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: macW, _count: { _all: true } });
  const byShopBattery = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: { ...macW, batteryHealth: { not: null } }, _count: { _all: true } });
  const parentOf = (name: string) => { const s = findShop(name); return (s?.alias ? findShop(s.alias) : s)?.name ?? name; };
  const shopCount = new Map<string, { n: number; battery: number }>();
  for (const r of byShop) { const k = parentOf(r.shopName); const c = shopCount.get(k) ?? { n: 0, battery: 0 }; c.n += r._count._all; shopCount.set(k, c); }
  for (const r of byShopBattery) { const k = parentOf(r.shopName); const c = shopCount.get(k) ?? { n: 0, battery: 0 }; c.battery += r._count._all; shopCount.set(k, c); }

  const market = await getModelMarket([...MAC_MODELS]);
  const mk = (m: string) => market.get(m) ?? null;
  const top = MAC_MODELS.map((m) => ({ m, r: mk(m) })).filter((x) => x.r).sort((a, b) => b.r!.count - a.r!.count)[0] ?? null;

  const gen = GENERATIONS.map((m) => ({ m, r: mk(m), info: MAC_INFO[m] }));
  const airPro = AIR_PRO.map(([a, p]) => ({ a, p, ra: mk(a), rp: mk(p) }));
  const spec = { ra: mk(SPEC_AIR), rp: mk(SPEC_PRO) };

  const memory = [];
  for (const [m, ssd, lo, hi] of MEMORY) {
    const x = await stat(m, ssd, { memoryGB: lo }), y = await stat(m, ssd, { memoryGB: hi });
    if (ok(x) && ok(y)) memory.push({ m, ssd, lo, hi, x, y });
  }

  const storage = [];
  for (const [m, mem, a, b] of STORAGE) {
    const x = await stat(m, a, { memoryGB: mem }), y = await stat(m, b, { memoryGB: mem });
    if (ok(x) && ok(y)) storage.push({ m, mem, a, b, x, y });
  }

  const battery = [];
  for (const [label, w] of BANDS) battery.push({ label, s: await stat(BATTERY_MODEL[0], BATTERY_MODEL[2], { AND: [{ memoryGB: BATTERY_MODEL[1] }, w] }) });

  const rank = [];
  for (const [m, mem, ssd] of RANK) {
    const a = await stat(m, ssd, { AND: [{ memoryGB: mem }, { conditionRank: { in: ["A", "a"] } }] });
    const c = await stat(m, ssd, { AND: [{ memoryGB: mem }, { conditionRank: { in: ["C", "c"] } }] });
    if (ok(a) && ok(c)) rank.push({ m, mem, ssd, a, c });
  }

  const budget = BUDGETS.map((b) => {
    const pick = MAC_MODELS.map((m) => ({ m, r: mk(m) }))
      .filter((x) => x.r && x.r.count >= 50 && x.r.medianPrice <= b && x.r.medianPrice > b - 20000)
      .sort((x, y) => y.r!.medianPrice - x.r!.medianPrice)[0];
    return { b, pick: pick ? { m: pick.m, price: pick.r!.medianPrice, ssd: pick.r!.medianStorage, count: pick.r!.count } : null };
  });

  return { shops, updated, total, withBattery, shopCount, top, gen, airPro, spec, memory, storage, battery, rank, budget };
}

const monthText = (d: Date) => d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long" });

export async function generateMetadata(): Promise<Metadata> {
  const title = `中古MacBookの選び方 完全ガイド｜チップ・AirとPro・メモリ・SSD・届いたら見る5つ【${monthText(new Date())}】`;
  const description = "中古MacBookをどれにするか、どこで買うかを、在庫の相場で決めるガイド。M1 以降の Apple シリコンという線引き、Air と Pro の違い、メモリ 8GB と 16GB の差、SSD の容量、電池と状態ランク、店の保証、予算別のおすすめ、届いたら見る5つ（毎日更新）。";
  return { title, description, alternates: { canonical: PATH }, openGraph: { ...OG_BASE, title: `${title} | ${SITE_NAME}`, description, url: PATH, images: ["/mac/opengraph-image"] } };
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
type Mk = { medianPrice: number; medianStorage: number | null; count: number } | null;
const mkt = (r: Mk) => (r ? yen(r.medianPrice) : "在庫なし");
const mktSub = (r: Mk) => (r ? `SSD ${r.medianStorage ? gb(r.medianStorage) : "—"}・${r.count.toLocaleString()}件` : "");
const infoText = (m: string) => { const i = MAC_INFO[m]; return i ? `${i.inch}インチ・${i.chip}・${i.year}年` : ""; };

export default async function MacGuidePage() {
  const d = await getData();
  const dateText = (d.updated ?? new Date()).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const shopNum = d.shops.length;
  const batteryPct = d.total ? Math.round((d.withBattery / d.total) * 100) : 0;
  const batteryShops = d.shops.filter((s) => (d.shopCount.get(s.name)?.battery ?? 0) > 0);
  const pcShops = d.shops.filter((s) => MAC_ONLY_SHOPS.includes(s));

  const m0 = d.memory[0];
  const s0 = d.storage[0];
  const b0 = d.budget.find((x) => x.pick) ?? null;

  const lead = `${dateText}時点の中古ショップ${shopNum}店の在庫から、中古MacBookは「M1 以降の Apple シリコン」「Air か Pro か」「メモリと SSD の組み合わせ」の3つで決めるのがおすすめです。${d.top ? `いちばん在庫が多いのは ${d.top.m} で、相場は${yen(d.top.r!.medianPrice)}（SSD ${d.top.r!.medianStorage ? gb(d.top.r!.medianStorage) : "—"}）。` : ""}`;

  const faqs = [
    { q: "中古MacBookは何年前のモデルまで買っていい？", a: "macOS 27 Golden Gate に対応する機種が目安です（Apple 公式）。Apple シリコン搭載の MacBook Air・MacBook Pro（2020 以降の M1 から）と MacBook Neo が対応していて、Intel 搭載の MacBook は対象外です。" },
    { q: "中古MacBookのメモリは8GBと16GBのどっちがいい？", a: `メモリと SSD は買ったあとに増やせないので、使い方に合わせて先に決めます。${m0 ? `${m0.m}（SSD ${gb(m0.ssd)}）は ${m0.lo}GB の相場が${yen(m0.x.median!)}、${m0.hi}GB が${yen(m0.y.median!)}です。` : ""}` },
    { q: "中古MacBookが届いたら何を確かめる？", a: "前の持ち主のアカウントやパスワードを求められないか、全部のキーとトラックパッドが反応するか、画面にドット抜けやムラがないか、付属の充電器で充電できるか、端子・カメラ・スピーカー・マイクが使えるかの5つです。" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古Macの相場一覧", item: `${SITE_URL}/mac` },
        { "@type": "ListItem", position: 3, name: "中古MacBookの選び方", item: `${SITE_URL}${PATH}` },
      ],
    },
    { "@context": "https://schema.org", "@type": "WebPage", name: "中古MacBookの選び方 完全ガイド", url: `${SITE_URL}${PATH}`, description: lead, ...(d.updated ? { dateModified: d.updated.toISOString() } : {}) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="中古MacBookの選び方" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/mac" className="hover:text-brand-800">中古Macの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">MacBookの選び方</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">中古MacBookの選び方 完全ガイド</h1>
          <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">
            {lead}
            <Link href="/about#data" className={`${LINK} ml-1 whitespace-nowrap`}>集計の方法</Link>
          </p>
        </div>

        {/* 早見表 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">早見表</h2>
          <Rows caption="中古MacBookの選び方の早見表" rows={[
            { k: "チップ", v: "M1 以降（Apple シリコン）", sub: "macOS 27 の対象。Intel は対象外" },
            { k: "Air か Pro", v: "重さ・画面・端子で比べる", sub: `Air（M2）${MBA_M2_VS_MBP_M1PRO.air.weight}・Pro 14インチ（2021）${MBA_M2_VS_MBP_M1PRO.pro.weight}` },
            { k: "メモリ", v: "買ったあと増やせない", sub: m0 ? `${short(m0.m)} は ${m0.hi}GB で +${yen(m0.y.median! - m0.x.median!)}` : "先に使い方で決める" },
            { k: "SSD", v: "256GBなら512GBも比べる", sub: s0 ? `${short(s0.m)} は +${yen(s0.y.median! - s0.x.median!)}` : undefined },
            { k: "店", v: "保証の長さで選ぶ", sub: pcShops.length ? `${pcShops.map((s) => `${s.label} ${s.warrantyShort.replace(/^保証/, "")}`).join("・")}` : `${shopNum}店` },
            { k: "届いたら", v: "その日に5つを確かめる", sub: "店の保証の期間内に" },
          ]} />
        </section>

        {/* 1 チップ */}
        <section className="flex flex-col gap-2">
          <H2 n={1}>どのチップ（世代）まで買っていい？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">線は macOS 27 Golden Gate に対応しているか。Apple 公式の対応機種は Apple シリコンの MacBook Air・MacBook Pro（2020 以降の M1 から）と MacBook Neo で、Intel 搭載の MacBook は対象外です。いちばん在庫が多い Air 13インチでチップごとに並べました（MacBook Neo は A18 Pro の別の線）。</p>
          <Rows caption="チップの世代ごとの相場" rows={d.gen.map((g) => ({
            k: <>{mlink(g.m)} {g.info && <span className="text-[11px] text-ink-mute">{g.info.year}年</span>}</>,
            v: mkt(g.r),
            sub: `${g.info ? `${g.info.chip}・` : ""}${mktSub(g.r)}`,
          }))} />
          <p className="text-[11px] text-ink-mute">相場は在庫がいちばん多い SSD 容量の中央値（メモリはまぜた値。容量は機種で違います）。</p>
        </section>

        {/* 2 Air と Pro */}
        <section className="flex flex-col gap-2">
          <H2 n={2}>Air と Pro、どっちにする？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">同じチップの Air と Pro で相場を並べました。違いは重さ・画面・端子なので、持ち歩くか、画面や端子を使うかで決めます。</p>
          <Rows caption="同じチップの Air と Pro の相場" rows={d.airPro.flatMap((x) => [
            { k: mlink(x.a), v: mkt(x.ra), sub: `${infoText(x.a)}・${mktSub(x.ra)}` },
            { k: mlink(x.p), v: mkt(x.rp), sub: `${infoText(x.p)}・${mktSub(x.rp)}` },
          ])} />
          <h3 className="text-sm font-bold mt-2">{mlink(SPEC_AIR)} と {mlink(SPEC_PRO)} の違い</h3>
          <Rows caption="Air M2 と Pro 14インチ（2021）の違い" rows={[
            { k: "重さ", v: `${MBA_M2_VS_MBP_M1PRO.air.weight} ／ ${MBA_M2_VS_MBP_M1PRO.pro.weight}`, sub: "Air ／ Pro" },
            { k: "画面", v: `${MBA_M2_VS_MBP_M1PRO.air.display} ／ ${MBA_M2_VS_MBP_M1PRO.pro.display}` },
            { k: "端子", v: <span className="whitespace-normal">{MBA_M2_VS_MBP_M1PRO.air.ports} ／ {MBA_M2_VS_MBP_M1PRO.pro.ports}</span> },
            { k: "相場", v: `${mkt(d.spec.ra)} ／ ${mkt(d.spec.rp)}`, sub: `${mktSub(d.spec.ra)} ／ ${mktSub(d.spec.rp)}` },
          ]} />
          <p className="text-[11px] text-ink-mute">画面サイズ・チップ・発売年は Apple の識別ページ、重さ・画面・端子は Apple の技術仕様から。</p>
        </section>

        {/* 3 メモリ */}
        {d.memory.length > 0 && (
          <section className="flex flex-col gap-2">
            <H2 n={3}>メモリは8GBで足りる？</H2>
            <p className="text-sm text-ink-sub leading-relaxed">メモリは買ったあとに増やせません。同じ機種・同じ SSD で、メモリだけ違う在庫の相場を比べました。差が小さい機種なら、多い方を選んでおくと長く使えます。</p>
            <Rows caption="メモリを上げたときの相場の差" rows={d.memory.map((x) => ({
              k: <>{mlink(x.m)} <span className="text-[11px] text-ink-mute">SSD {gb(x.ssd)}</span></>,
              v: `${x.hi}GB は +${yen(x.y.median! - x.x.median!)}`,
              sub: `${x.lo}GB ${yen(x.x.median!)}（${x.x.n}件）→ ${x.hi}GB ${yen(x.y.median!)}（${x.y.n}件）`,
            }))} />
          </section>
        )}

        {/* 4 SSD */}
        {d.storage.length > 0 && (
          <section className="flex flex-col gap-2">
            <H2 n={4}>SSD はどれくらいにする？</H2>
            <p className="text-sm text-ink-sub leading-relaxed">SSD も買ったあとに増やせません。同じ機種・同じメモリで、SSD を1段上げたときの相場の差です。</p>
            <Rows caption="SSD を上げたときの相場の差" rows={d.storage.map((x) => ({
              k: <>{mlink(x.m)} <span className="text-[11px] text-ink-mute">メモリ {x.mem}GB</span></>,
              v: `+${yen(x.y.median! - x.x.median!)}`,
              sub: `${gb(x.a)} ${yen(x.x.median!)} → ${gb(x.b)} ${yen(x.y.median!)}`,
            }))} />
          </section>
        )}

        {/* 5 電池とランク */}
        <section className="flex flex-col gap-2">
          <H2 n={5}>電池と状態ランク</H2>
          <p className="text-sm text-ink-sub leading-relaxed">{`MacBook は電池の%を書いていない在庫が多く、%が分かるのは${batteryPct}%だけです${batteryShops.length ? `（書いているのは${batteryShops.map((s) => s.label).join("・")}）` : ""}。電池を重く見るなら、%を書いている店か、保証の長い店を選びます。`}</p>
          <h3 className="text-sm font-bold">{mlink(BATTERY_MODEL[0])}（メモリ {BATTERY_MODEL[1]}GB・SSD {gb(BATTERY_MODEL[2])}）の電池の%ごとの相場</h3>
          <Rows caption="MacBook Air M1 の電池の%ごとの相場" rows={d.battery.map((x) => ({
            k: x.label,
            v: ok(x.s) ? yen(x.s.median!) : "—",
            sub: x.s.n >= MIN_N ? `${x.s.n.toLocaleString()}件` : `${x.s.n}件（少ないので相場は出さない）`,
          }))} />
          {d.rank.length > 0 && <>
            <p className="text-sm text-ink-sub leading-relaxed mt-2">ランクの差はほとんどが外装の傷の差です。ケースを付けるなら、ランクC も候補になります。</p>
            <Rows caption="状態ランクAとCの相場" rows={d.rank.map((r) => ({
              k: <>{mlink(r.m)} <span className="text-[11px] text-ink-mute">{r.mem}GB・{gb(r.ssd)}</span></>,
              v: `A と C の差 ${yen(r.a.median! - r.c.median!)}`,
              sub: `A ${yen(r.a.median!)}（${r.a.n}件）・C ${yen(r.c.median!)}（${r.c.n}件）`,
            }))} />
          </>}
          <p className="text-[11px] text-ink-mute">ランクの基準は店ごとに違います。</p>
        </section>

        {/* 6 店 */}
        <section className="flex flex-col gap-2">
          <H2 n={6}>どこで買う？店ごとの違い</H2>
          <p className="text-sm text-ink-sub leading-relaxed">見るのは故障の保証の長さと、電池の%を書いているか。いちばん安い店は機種ごとに入れ替わるので、機種とメモリ・SSD を決めてから店をまたいで比べるのが安く買う近道です。</p>
          <Rows caption="店ごとの在庫と保証" rows={d.shops.map((s) => {
            const c = d.shopCount.get(s.name) ?? { n: 0, battery: 0 };
            return {
              k: <a href={s.guaranteeUrl} target="_blank" rel="noopener" className={LINK}>{s.label}</a>,
              v: s.warrantyShort,
              sub: `${s.warranty.replace(/（iPhone[^）]*）/, "")}・${c.n.toLocaleString()}件${c.battery ? `・電池の%あり ${Math.round((c.battery / c.n) * 100)}%` : ""}`,
            };
          })} />
          <p className="text-[11px] text-ink-mute">保証は各店の案内のページから。商品ごとに違うことがあるので、買う前に商品ページで確かめてください。</p>
        </section>

        {/* 7 予算 */}
        <section className="flex flex-col gap-2">
          <H2 n={7}>予算別：いま買うなら</H2>
          <p className="text-sm text-ink-sub leading-relaxed">在庫50件以上で、予算から2万円下までに相場が入る機種のうち、相場がいちばん高い機種です（好みでは選んでいません）。</p>
          <Rows caption="予算別のおすすめ" rows={d.budget.map((x) => ({
            k: PC_BUDGETS.includes(x.b) ? <Link href={pcBudgetPath(x.b)} className={LINK}>{x.b / 10000}万円</Link> : `${x.b / 10000}万円`,
            v: x.pick ? mlink(x.pick.m) : "該当なし",
            sub: x.pick ? `${yen(x.pick.price)}（SSD ${x.pick.ssd ? gb(x.pick.ssd) : "—"}）・${infoText(x.pick.m)}` : undefined,
          }))} />
          {b0 && <p className="text-[11px] text-ink-mute">相場は在庫がいちばん多い SSD 容量の中央値。メモリの違う在庫もまざっています。</p>}
        </section>

        {/* 8 届いたら */}
        <section className="flex flex-col gap-2">
          <H2 n={8}>届いたらまず見る5つ</H2>
          <ol className={`${CARD} divide-y divide-line-soft text-sm`}>
            {[
              { t: "アカウントとパスワード", d: "電源を入れて、前の持ち主のアカウントやパスワードを求められたら、すぐ店に連絡を。" },
              { t: "キーボードとトラックパッド", d: "全部のキーを1つずつ押して反応するか、トラックパッドのクリックと操作が効くか。" },
              { t: "画面", d: "白や黒の画面を全体に出して、ドット抜け・ムラ・線がないか。" },
              { t: "充電", d: "付属の充電器（付属しないときは手持ちの充電器）で充電できるか。" },
              { t: "端子・カメラ・スピーカー・マイク", d: "端子に機器をつなぎ、カメラを写し、音を鳴らし、録音してみる。" },
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
            macOS 27: <a href="https://www.apple.com/jp/os/macos/" target="_blank" rel="noopener" className={LINK}>Apple「macOS」</a>・
            画面サイズ・チップ・発売年: <a href="https://support.apple.com/ja-jp/102869" target="_blank" rel="noopener" className={LINK}>Apple「MacBook Air のモデルを識別する」</a>・<a href="https://support.apple.com/ja-jp/108052" target="_blank" rel="noopener" className={LINK}>Apple「MacBook Pro のモデルを識別する」</a>・<a href="https://www.apple.com/jp/macbook-neo/specs/" target="_blank" rel="noopener" className={LINK}>MacBook Neo の仕様</a>・
            重さ・画面・端子: Apple の技術仕様（<a href="https://support.apple.com/ja-jp/111867" target="_blank" rel="noopener" className={LINK}>MacBook Air（M2, 2022）</a>・<a href="https://support.apple.com/ja-jp/111902" target="_blank" rel="noopener" className={LINK}>MacBook Pro（14インチ, 2021）</a>）・
            保証: 各店の案内のページ。
            中古: 中古ショップの販売中の在庫（ジャンク除く・{dateText}時点・1日4回取得）・相場は中央値。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2"><Link href="/mac" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古Macの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
