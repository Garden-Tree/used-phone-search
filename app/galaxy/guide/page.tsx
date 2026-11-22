import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { GALAXY_SHOPS, findShop } from "@/lib/shops";
import { modelPagePath } from "@/lib/catalog";
import { GALAXY_MODELS, GALAXY_RELEASED } from "@/lib/galaxyCatalog";
import { GALAXY_SPECS } from "@/lib/galaxySpecs";
import { budgetPath, GALAXY_BUDGETS } from "@/lib/budgets";
import { yen } from "@/lib/format";
import { SITE_NAME, SITE_URL, OG_BASE } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古Galaxyの選び方 完全ガイド（2026-11-22〜）: /iphone/guide・/ipad/guide の Galaxy 版。
 * 数字はビルドのたびに DB から（count・aggregate・groupBy・中央値の1行だけ。findMany で全件は読まない）。ジャンクは除く。20件未満の相場は出さない。
 * 事実は公式で確かめた値だけ: 発売年月（lib/galaxyCatalog.ts）・チップ・画面（lib/galaxySpecs.ts。ドコモの製品仕様・Samsung 日本）・店（lib/shops.ts）。
 * Samsung は日本向けに機種ごとのアップデート期限を出していない（lib/galaxyCatalog.ts）ので、期限は書かず発売年月だけ。
 * キャリア版の対応バンドは機種・会社ごとに違い、リポジトリに公式の値がないので具体的には書かない（「確かめる」とだけ）。
 * 「届いたら見る」は機種によらない一般的なことだけ（メニューの場所など機種で違うものは書かない）。
 */
const PATH = "/galaxy/guide";
const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";
const MIN_N = 20;

type W = Prisma.DeviceInventoryWhereInput;
const NOT_JUNK: W = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
type Stat = { n: number; median: number | null };

async function stat(model: string, gb: number, extra: W = {}): Promise<Stat> {
  const where: W = { AND: [await modelWhere(model), { storage: gb }, NOT_JUNK, extra] };
  const n = await prisma.deviceInventory.count({ where });
  return { n, median: n ? await medianPrice(where, n) : null };
}
const ok = (s: Stat) => s.median !== null && s.n >= MIN_N;

const short = (m: string) => m.replace(/^Galaxy /, "");
const released = (m: string) => {
  const r = GALAXY_RELEASED[m];
  return r ? `${r.slice(0, 4)}年${Number(r.slice(5, 7))}月発売` : "";
};
const displayText = (m: string) => {
  const s = GALAXY_SPECS[m];
  if (!s) return "";
  return s.displayInner ? `外${s.display}・内${s.displayInner}インチ` : `${s.display}インチ${s.panel === "液晶" ? "（液晶）" : ""}`;
};

// 1 世代（S シリーズの無印を新しい順に）
const GENS = ["Galaxy S26", "Galaxy S25", "Galaxy S24", "Galaxy S23", "Galaxy S22"];
// 2 シリーズの違い（いま中古で多い代表の機種）
const SERIES: [string, string][] = [
  ["S", "Galaxy S25"],
  ["S Ultra", "Galaxy S25 Ultra"],
  ["A", "Galaxy A25 5G"],
  ["Z Fold", "Galaxy Z Fold6"],
  ["Z Flip", "Galaxy Z Flip6"],
];
// 3 キャリア版と SIM フリー（店の表記が「国内版」の在庫を SIM フリーとして比べる）
const CARRIER: W = { carrier: { in: ["docomo", "au", "SoftBank", "楽天モバイル"] } };
const SIMFREE: W = { carrier: "国内版" };
const CARRIER_PAIRS: [string, number][] = [["Galaxy S25", 256], ["Galaxy S24", 256], ["Galaxy Z Flip6", 256], ["Galaxy Z Fold6", 256], ["Galaxy S26", 256]];
const RANK_PAIRS: [string, number][] = [["Galaxy Z Flip6", 256], ["Galaxy Z Fold6", 256], ["Galaxy Z Fold7", 256], ["Galaxy Z Flip7", 256], ["Galaxy S24", 256]];
const STORAGE_PAIRS: [string, number, number][] = [["Galaxy S25", 256, 512], ["Galaxy S24 Ultra", 256, 512], ["Galaxy Z Fold6", 256, 512], ["Galaxy Z Flip7", 256, 512], ["Galaxy Z Fold7", 256, 512]];

async function getData() {
  const shops = await activeShops(GALAXY_SHOPS);
  const galaxyW: W = { isSoldOut: false, modelName: { startsWith: "Galaxy" }, ...NOT_JUNK };
  const updated = (await prisma.deviceInventory.aggregate({ where: { isSoldOut: false, modelName: { startsWith: "Galaxy" } }, _max: { updatedAt: true } }))._max.updatedAt;
  const total = await prisma.deviceInventory.count({ where: galaxyW });
  const withBattery = await prisma.deviceInventory.count({ where: { ...galaxyW, batteryHealth: { not: null } } });

  // 電池の%を書いている在庫が多い店（店ごとに件数を数えるだけ。楽天市場店などの別の売り場は親の店にまとめる）
  const byShop = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: galaxyW, _count: { _all: true } });
  const byShopBat = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: { ...galaxyW, batteryHealth: { not: null } }, _count: { _all: true } });
  const shopAgg = new Map<string, { n: number; b: number }>();
  const parentShop = (name: string) => {
    const s = findShop(name);
    return s?.alias ? findShop(s.alias) : s;
  };
  const parentLabel = (name: string) => parentShop(name)?.label ?? null;
  const kindOf = new Map<string, string>();
  for (const r of byShop) { const p = parentShop(r.shopName); if (p) kindOf.set(p.label, p.battery); }
  for (const r of byShop) {
    const l = parentLabel(r.shopName);
    if (!l) continue;
    const x = shopAgg.get(l) ?? { n: 0, b: 0 };
    x.n += r._count._all;
    shopAgg.set(l, x);
  }
  for (const r of byShopBat) {
    const l = parentLabel(r.shopName);
    const x = l ? shopAgg.get(l) : undefined;
    if (x) x.b += r._count._all;
  }
  const batteryShops = [...shopAgg].map(([label, x]) => ({ label, n: x.n, pct: Math.round((x.b / x.n) * 100), over80: kindOf.get(label) === "over80" }))
    .filter((x) => x.n >= MIN_N && x.pct >= 50).sort((a, b) => b.n - a.n);

  const market = await getModelMarket(GALAXY_MODELS);
  const mk = (m: string) => market.get(m) ?? null;

  const topModel = GALAXY_MODELS.map((m) => ({ m, r: mk(m) })).filter((x) => x.r).sort((a, b) => b.r!.count - a.r!.count)[0] ?? null;
  const gens = GENS.map((m) => ({ m, r: mk(m) }));
  const series = SERIES.map(([label, m]) => ({ label, m, r: mk(m), spec: GALAXY_SPECS[m] }));

  const carrier = [];
  for (const [m, gb] of CARRIER_PAIRS) {
    const c = await stat(m, gb, CARRIER), f = await stat(m, gb, SIMFREE);
    if (ok(c) && ok(f)) carrier.push({ m, gb, c, f });
  }

  const rank = [];
  for (const [m, gb] of RANK_PAIRS) {
    const a = await stat(m, gb, { conditionRank: { in: ["A", "a"] } }), c = await stat(m, gb, { conditionRank: { in: ["C", "c"] } });
    if (ok(a) && ok(c)) rank.push({ m, gb, a, c });
  }

  const storage = [];
  for (const [m, a, b] of STORAGE_PAIRS) {
    const x = await stat(m, a), y = await stat(m, b);
    if (ok(x) && ok(y)) storage.push({ m, a, b, x, y });
  }

  // 予算別（在庫50件以上・ひとつ下の予算より上〜予算以下で、相場がいちばん高い機種）
  const budget = GALAXY_BUDGETS.map((b, i) => {
    const lo = i ? GALAXY_BUDGETS[i - 1] : 0;
    const pick = GALAXY_MODELS.map((m) => ({ m, r: mk(m) }))
      .filter((x) => x.r && x.r.count >= 50 && x.r.medianPrice <= b && x.r.medianPrice > lo)
      .sort((x, y) => y.r!.medianPrice - x.r!.medianPrice)[0];
    return { b, pick: pick ? { m: pick.m, price: pick.r!.medianPrice, gb: pick.r!.medianStorage, count: pick.r!.count } : null };
  });

  const sz = GALAXY_MODELS.filter((m) => !/ A\d/.test(m)).map(mk).filter((r) => r && r.count >= MIN_N);
  const szTotal = sz.length, sz256 = sz.filter((r) => r!.medianStorage === 256).length;

  return { topModel, shops, updated, total, withBattery, batteryShops, szTotal, sz256, gens, series, carrier, rank, storage, budget };
}

const monthText = (d: Date) => d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long" });

export async function generateMetadata(): Promise<Metadata> {
  const title = `中古Galaxyの選び方 完全ガイド｜S・A・Z Fold・Z Flipの違い・キャリア版とSIMフリー・届いたら見る5つ【${monthText(new Date())}】`;
  const description = "中古Galaxyをどれにするか、どこで買うかを、在庫の相場で決めるガイド。S・A・Z Fold・Z Flip の違い、世代ごとの相場、キャリア版と SIM フリーの差、状態ランク、容量、店の保証、予算別のおすすめ、届いたら見る5つ（毎日更新）。";
  return { title, description, alternates: { canonical: PATH }, openGraph: { ...OG_BASE, title: `${title} | ${SITE_NAME}`, description, url: PATH, images: ["/galaxy/opengraph-image"] } };
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
  r ? `${r.medianStorage ?? "—"}GB・${r.count.toLocaleString()}件` : "";
const signed = (n: number) => (n >= 0 ? `+${yen(n)}` : `−${yen(-n)}`);

export default async function GalaxyGuidePage() {
  const d = await getData();
  const dateText = (d.updated ?? new Date()).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const shopNum = d.shops.length;
  const redRom = d.shops.filter((s) => s.redRom && !/なし|記載なし/.test(s.redRom)).length;
  const year = d.shops.filter((s) => s.yearWarranty).length;
  const batteryPct = d.total ? Math.round((d.withBattery / d.total) * 100) : 0;

  const top = d.topModel;
  const cheaperFree = d.carrier.filter((x) => x.f.median! < x.c.median!).length;
  const flip = d.series.find((s) => s.m === "Galaxy Z Flip6")?.r ?? null;
  const fold = d.series.find((s) => s.m === "Galaxy Z Fold6")?.r ?? null;

  const lead = `${dateText}時点の大手中古ショップ${shopNum}店の在庫から、中古Galaxyは「形（ふつうの S・A か、折りたたみの Z Fold・Z Flip か）」「発売の新しさ」「キャリア版か SIM フリーか」の3つで決めるのがおすすめです。${top ? `いちばん在庫が多い機種は ${short(top.m)} で、相場は${yen(top.r!.medianPrice)}（${top.r!.medianStorage}GB）。` : ""}`;

  const c0 = d.carrier[0];
  const faqs = [
    { q: "中古Galaxyは何年前の機種まで買っていい？", a: "発売の新しさを目安にしてください。S シリーズの世代ごとの発売年月と相場は、このページの1にまとめています。" },
    { q: "中古Galaxyはキャリア版とSIMフリーのどっちがいい？", a: `${c0 ? `${short(c0.m)} ${c0.gb}GB はキャリア版の相場が${yen(c0.c.median!)}、SIM フリー（国内版）が${yen(c0.f.median!)}です。` : ""}価格だけでなく、使う回線で使えるか（対応する電波の帯域・SIM ロックの有無）を商品ページと携帯会社の案内で確かめてから選びます。キャリア版は届いたら IMEI でネットワーク利用制限も確かめます。` },
    { q: "中古Galaxyが届いたら何を確かめる？", a: "前の持ち主の Google アカウントを求められないか（初期化されているか）、IMEI でネットワーク利用制限、画面の焼けや色むら（折りたたみは折り目とヒンジも）、カメラ・スピーカー・充電、使う SIM で通話とデータ通信ができるかの5つです。" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古Galaxyの相場一覧", item: `${SITE_URL}/galaxy` },
        { "@type": "ListItem", position: 3, name: "中古Galaxyの選び方", item: `${SITE_URL}${PATH}` },
      ],
    },
    { "@context": "https://schema.org", "@type": "WebPage", name: "中古Galaxyの選び方 完全ガイド", url: `${SITE_URL}${PATH}`, description: lead, ...(d.updated ? { dateModified: d.updated.toISOString() } : {}) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="中古Galaxyの選び方" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/galaxy" className="hover:text-brand-800">中古Galaxyの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">選び方</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">中古Galaxyの選び方 完全ガイド</h1>
          <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">
            {lead}
            <Link href="/about#data" className={`${LINK} ml-1 whitespace-nowrap`}>集計の方法</Link>
          </p>
        </div>

        {/* 早見表 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">早見表</h2>
          <Rows caption="中古Galaxyの選び方の早見表" rows={[
            { k: "形", v: "まず S・A か折りたたみか", sub: "Z Fold は開くと大画面・Z Flip は縦に折れて小さくなる" },
            { k: "世代", v: "発売の新しさを目安に", sub: "S シリーズの世代ごとの相場は1に" },
            { k: "通信", v: "キャリア版か SIM フリーか", sub: "使う回線で使えるかを確かめる" },
            { k: "電池", v: "%が分かる在庫は少ない", sub: `%の記載があるのは在庫の${batteryPct}%` },
            { k: "店", v: "赤ロム保証と保証の長さ", sub: `赤ロム保証の記載 ${redRom}店／${shopNum}店` },
            { k: "届いたら", v: "その日に5つを確かめる", sub: "店の保証の期間内に" },
          ]} />
        </section>

        {/* 1 世代 */}
        <section className="flex flex-col gap-2">
          <H2 n={1}>何年前の機種まで買っていい？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">目安は発売の新しさです。S シリーズ（無印）の世代ごとの相場を並べました。</p>
          <Rows caption="Galaxy S シリーズの世代ごとの相場" rows={d.gens.map((g) => ({
            k: <>{mlink(g.m)} <span className="text-[11px] text-ink-mute">{released(g.m)}</span></>,
            v: mkt(g.r),
            sub: mktSub(g.r),
          }))} />
          <p className="text-[11px] text-ink-mute">相場は在庫がいちばん多い容量の中央値（容量は機種で違います）。発売は日本での発売年月。</p>
        </section>

        {/* 2 シリーズ */}
        <section className="flex flex-col gap-2">
          <H2 n={2}>S・A・Z Fold・Z Flip、どれにする？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">
            {`S は上位のシリーズで、Ultra はその中で画面がいちばん大きいモデル。A は価格を抑えたシリーズです。Z Fold は開くとタブレットに近い大画面、Z Flip は縦に折りたたんで小さく持ち歩けます。${fold && flip ? `折りたたみは同じ年の機種でも Z Fold（${yen(fold.medianPrice)}）と Z Flip（${yen(flip.medianPrice)}）で相場が大きく違います。` : ""}`}
          </p>
          <Rows caption="シリーズごとの代表の機種" rows={d.series.map((s) => ({
            k: mlink(s.m),
            v: mkt(s.r),
            sub: `${s.spec ? `${s.spec.chip}・${displayText(s.m)}` : ""}${s.r ? `・${s.r.medianStorage}GB・${s.r.count.toLocaleString()}件` : ""}`,
          }))} />
          <p className="text-[11px] text-ink-mute">チップと画面はドコモの製品仕様（日本で売られたモデルの値）から。Z Fold・Z Flip は外側（カバー）と内側（メイン）の画面。</p>
        </section>

        {/* 3 キャリア版と SIM フリー */}
        {d.carrier.length > 0 && (
          <section className="flex flex-col gap-2">
            <H2 n={3}>キャリア版と SIM フリー</H2>
            <p className="text-sm text-ink-sub leading-relaxed">
              {`中古の Galaxy は docomo・au などのキャリア版が多く、SIM フリー（国内版）もあります。${d.carrier.length >= 2 ? (cheaperFree === 0 ? `下の${d.carrier.length}機種はどれも、同じ容量ならキャリア版の方が相場が安くなっています。` : cheaperFree === d.carrier.length ? `下の${d.carrier.length}機種はどれも、SIM フリーの方が相場が安くなっています。` : `下の${d.carrier.length}機種のうち、SIM フリーの方が安いのは${cheaperFree}機種です。`) : ""}別の会社の回線で使うなら、価格より先に、その回線で使えるか（対応する電波の帯域・SIM ロックの有無）を商品ページと携帯会社の案内で確かめます。`}
            </p>
            <Rows caption="キャリア版と SIM フリーの相場" rows={d.carrier.map((x) => ({
              k: <>{mlink(x.m)} <span className="text-[11px] text-ink-mute">{x.gb}GB</span></>,
              v: `SIM フリー ${signed(x.f.median! - x.c.median!)}`,
              sub: `キャリア版 ${yen(x.c.median!)}（${x.c.n}件）・SIM フリー ${yen(x.f.median!)}（${x.f.n}件）`,
            }))} />
            <p className="text-[11px] text-ink-mute">キャリア版は店の表記が docomo・au・SoftBank・楽天モバイルの在庫、SIM フリーは「国内版」の在庫。</p>
          </section>
        )}

        {/* 4 電池とランク */}
        <section className="flex flex-col gap-2">
          <H2 n={4}>電池と状態ランク</H2>
          <p className="text-sm text-ink-sub leading-relaxed">
            {`Galaxy は電池の状態を書いていない在庫が多く、%などの記載があるのは在庫の${batteryPct}%だけです。${d.batteryShops.length ? `記載が多いのは ${d.batteryShops.map((s) => s.label).join("・")}。` : ""}電池を重く見るなら、記載のある店か、保証の長い店を選びます。`}
          </p>
          {d.batteryShops.length > 0 && (
            <Rows caption="電池の記載が多い店" rows={d.batteryShops.map((s) => ({
              k: s.label,
              v: `記載 ${s.pct}%`,
              sub: `Galaxy の在庫 ${s.n.toLocaleString()}件${s.over80 ? "・「80%以上」かどうかの表記" : ""}`,
            }))} />
          )}
          {d.rank.length > 0 && <>
            <p className="text-sm text-ink-sub leading-relaxed mt-2">ランクの差はほとんどが外装の傷の差です。ケースを付けるなら、ランクC も候補になります。折りたたみは、画面の折り目やヒンジの状態も商品ページで確かめます。</p>
            <Rows caption="状態ランクAとCの相場" rows={d.rank.map((r) => ({
              k: <>{mlink(r.m)} <span className="text-[11px] text-ink-mute">{r.gb}GB</span></>,
              v: `A と C の差 ${signed(r.a.median! - r.c.median!)}`,
              sub: `A ${yen(r.a.median!)}・C ${yen(r.c.median!)}`,
            }))} />
          </>}
          <p className="text-[11px] text-ink-mute">ランクの基準は店ごとに違います。電池の記載は「80%以上」のように幅で書く店もあります。</p>
        </section>

        {/* 5 容量 */}
        {d.storage.length > 0 && (
          <section className="flex flex-col gap-2">
            <H2 n={5}>容量は256GBで足りる？</H2>
            <p className="text-sm text-ink-sub leading-relaxed">{`${d.szTotal ? `S・Z シリーズ${d.szTotal}機種のうち${d.sz256}機種は、256GB の在庫がいちばん多い容量です。` : ""}写真や動画をたくさん入れるなら、512GB との差も比べてみてください。`}</p>
            <Rows caption="容量を上げたときの相場の差" rows={d.storage.map((s) => ({
              k: mlink(s.m),
              v: signed(s.y.median! - s.x.median!),
              sub: `${s.a}GB ${yen(s.x.median!)} → ${s.b}GB ${yen(s.y.median!)}`,
            }))} />
          </section>
        )}

        {/* 6 店 */}
        <section className="flex flex-col gap-2">
          <H2 n={6}>どこで買う？店ごとの違い</H2>
          <p className="text-sm text-ink-sub leading-relaxed">見るのは赤ロム保証・電池の書き方・故障の保証。いちばん安い店は機種ごとに入れ替わるので、機種を決めてから店をまたいで比べるのが安く買う近道です。</p>
          <Rows caption="店ごとの違い" rows={[
            { k: "Galaxy の在庫がある店", v: `${shopNum}店` },
            { k: "赤ロム保証を案内に書いている", v: `${redRom}店`, sub: `在庫のある${shopNum}店のうち` },
            { k: "故障の保証が1年", v: `${year}店` },
          ]} />
        </section>

        {/* 7 予算 */}
        <section className="flex flex-col gap-2">
          <H2 n={7}>予算別：いま買うなら</H2>
          <p className="text-sm text-ink-sub leading-relaxed">在庫50件以上で、ひとつ下の予算より上・予算以下に相場が入る機種のうち、相場がいちばん高い機種です（好みでは選んでいません）。</p>
          <Rows caption="予算別のおすすめ" rows={d.budget.map((x) => ({
            k: <Link href={budgetPath(x.b, "galaxy")} className={LINK}>{x.b / 10000}万円</Link>,
            v: x.pick ? mlink(x.pick.m) : "該当なし",
            sub: x.pick ? `${yen(x.pick.price)}（${x.pick.gb}GB）・${released(x.pick.m)}・${displayText(x.pick.m)}` : undefined,
          }))} />
        </section>

        {/* 8 届いたら */}
        <section className="flex flex-col gap-2">
          <H2 n={8}>届いたらまず見る5つ</H2>
          <ol className={`${CARD} divide-y divide-line-soft text-sm`}>
            {[
              { t: "初期化されているか", d: "初期設定で前の持ち主の Google アカウントを求められたら、まだ前の持ち主のアカウントが残っています。すぐ店に連絡を。" },
              { t: "ネットワーク利用制限", d: "IMEI を、端末を売った携帯会社のサイトで調べる。制限がかかっていたら、店の赤ロム保証の対象か確かめます。" },
              { t: "画面の焼け・色むら", d: "白や灰色の画面を全体に出して、前の表示の跡が残っていないか、反応しない所がないか。折りたたみは折り目とヒンジの動きも。" },
              { t: "カメラ・スピーカー・充電", d: "写真を撮り、音を鳴らし、ケーブルで充電する。" },
              { t: "使う SIM で通話とデータ通信", d: "使う SIM を入れて、電話をかけ、データ通信ができるか。キャリア版を別の会社の回線で使うときは特に。" },
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
            チップと画面: {[...new Set([...d.series.map((s) => s.m), ...d.budget.flatMap((x) => (x.pick ? [x.pick.m] : []))])].filter((m) => GALAXY_SPECS[m]).map((m, i) => (
              <span key={m}>{i ? "・" : ""}<a href={GALAXY_SPECS[m].url} target="_blank" rel="noopener" className={LINK}>{GALAXY_SPECS[m].source}</a></span>
            ))}・
            発売年月: Samsung Newsroom 日本と各携帯会社の報道発表・
            店の保証: 各店の公式ページ（{d.shops.map((s, i) => <span key={s.name}>{i ? "・" : ""}<a href={s.guaranteeUrl} target="_blank" rel="noopener" className={LINK}>{s.label}</a></span>)}）。
            中古: 大手中古ショップの販売中の在庫（ジャンク除く・{dateText}時点・1日4回取得）・相場は中央値。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2"><Link href="/galaxy" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古Galaxyの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
