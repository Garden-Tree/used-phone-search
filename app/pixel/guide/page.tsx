import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { PIXEL_SHOPS, findShop } from "@/lib/shops";
import { modelPagePath } from "@/lib/catalog";
import { COMPARE_PAIRS, comparePath } from "@/lib/compare";
import { PIXEL_INFO, PIXEL_MODELS, jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { PIXEL_SPECS } from "@/lib/pixelSpecs";
import { budgetPath, PIXEL_BUDGETS } from "@/lib/budgets";
import { yen } from "@/lib/format";
import { SITE_NAME, SITE_URL, OG_BASE } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古Google Pixelの選び方 完全ガイド（2026-11-22〜）: /iphone/guide・/ipad/guide・/galaxy/guide の Pixel 版。
 * 数字はビルドのたびに DB から（count・aggregate・groupBy・中央値の1行だけ。findMany で全件は読まない）。ジャンクは除く。20件未満の相場は出さない。
 * 事実は公式で確かめた値だけ: アップデート保証の期限・販売開始の年月（lib/pixelCatalog.ts。Google ヘルプ）・チップ・画面（lib/pixelSpecs.ts。Google の技術仕様）・店（lib/shops.ts）。
 * キャリア版の対応バンドは機種・会社ごとに違い、リポジトリに公式の値がないので具体的には書かない（「確かめる」とだけ）。
 * 比べる2つの中央値がまったく同じ行は出さない（取り込みや値付けの都合で同じ商品を数えている見込みが高い）。
 * 「届いたら見る」は機種によらない一般的なことだけ（メニューの場所など機種で違うものは書かない）。
 */
const PATH = "/pixel/guide";
const CARD = "bg-white rounded-xl border border-line";
const LINK = "text-brand-600 underline underline-offset-2 hover:text-brand-800";
const MIN_N = 20;
const UPDATE_URL = "https://support.google.com/pixelphone/answer/4457705";
const AVAILABLE_URL = "https://support.google.com/pixelphone/answer/15738422";

type W = Prisma.DeviceInventoryWhereInput;
const NOT_JUNK: W = { conditionRank: { notIn: ["J", "j", "ジャンク"] } };
type Stat = { n: number; median: number | null };

async function stat(model: string, gb: number, extra: W = {}): Promise<Stat> {
  const where: W = { AND: [await modelWhere(model), { storage: gb }, NOT_JUNK, extra] };
  const n = await prisma.deviceInventory.count({ where });
  return { n, median: n ? await medianPrice(where, n) : null };
}
const ok = (s: Stat) => s.median !== null && s.n >= MIN_N;
// 比べる2つがどちらも20件以上で、中央値がまったく同じではない
const pairOk = (a: Stat, b: Stat) => ok(a) && ok(b) && a.median !== b.median;

const short = (m: string) => m.replace(/^Pixel /, "");
const released = (m: string) => {
  const r = PIXEL_INFO[m];
  return r ? `${jaMonth(r.available)}発売` : "";
};
const displayText = (m: string) => {
  const s = PIXEL_SPECS[m];
  if (!s) return "";
  return s.displayInner ? `外${s.display}・内${s.displayInner}インチ` : `${s.display}インチ`;
};
const chipText = (m: string) => PIXEL_SPECS[m]?.chip.replace("Google ", "") ?? "";
/** いまの年月（日本時間）"2026-11" */
const nowYm = () => {
  const p = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}`;
};

// 1 アップデート保証（無印と a を新しい順に）
const UPDATES = ["Pixel 10", "Pixel 10a", "Pixel 9", "Pixel 9a", "Pixel 8", "Pixel 8a", "Pixel 7", "Pixel 7a", "Pixel 6a", "Pixel 6"];
// 2 モデルの違い（1つの世代の全モデル）
const SERIES: [string, string][] = [
  ["無印", "Pixel 10"],
  ["a", "Pixel 10a"],
  ["Pro", "Pixel 10 Pro"],
  ["Pro XL", "Pixel 10 Pro XL"],
  ["Pro Fold", "Pixel 10 Pro Fold"],
];
// 3 キャリア版と SIM フリー（店の表記が「Google」の在庫を SIM フリーとして比べる）
const CARRIER: W = { carrier: { in: ["docomo", "au", "SoftBank", "楽天モバイル"] } };
const SIMFREE: W = { carrier: "Google" };
const CARRIER_PAIRS: [string, number][] = [["Pixel 10", 128], ["Pixel 10a", 128], ["Pixel 9", 128], ["Pixel 9a", 128], ["Pixel 8", 128], ["Pixel 8a", 128], ["Pixel 7a", 128]];
const RANK_PAIRS: [string, number][] = [["Pixel 9", 128], ["Pixel 9a", 128], ["Pixel 8", 128], ["Pixel 8a", 128], ["Pixel 7a", 128], ["Pixel 7", 128]];
const STORAGE_PAIRS: [string, number, number][] = [["Pixel 10", 128, 256], ["Pixel 9a", 128, 256], ["Pixel 9", 128, 256], ["Pixel 8", 128, 256], ["Pixel 9 Pro", 128, 256], ["Pixel 8 Pro", 128, 256], ["Pixel 10 Pro", 256, 512], ["Pixel 11", 256, 512]];

async function getData() {
  const now = nowYm();
  const shops = await activeShops(PIXEL_SHOPS);
  const pixelW: W = { isSoldOut: false, modelName: { startsWith: "Pixel" }, ...NOT_JUNK };
  const updated = (await prisma.deviceInventory.aggregate({ where: { isSoldOut: false, modelName: { startsWith: "Pixel" } }, _max: { updatedAt: true } }))._max.updatedAt;
  const total = await prisma.deviceInventory.count({ where: pixelW });
  const withBattery = await prisma.deviceInventory.count({ where: { ...pixelW, batteryHealth: { not: null } } });

  // 電池の%を書いている在庫が多い店（店ごとに件数を数えるだけ。楽天市場店などの別の売り場は親の店にまとめる）
  const byShop = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: pixelW, _count: { _all: true } });
  const byShopBat = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: { ...pixelW, batteryHealth: { not: null } }, _count: { _all: true } });
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

  const market = await getModelMarket(PIXEL_MODELS);
  const mk = (m: string) => market.get(m) ?? null;
  const left = (m: string) => updateYearsLeft(m, now) ?? 0;

  const topModel = PIXEL_MODELS.map((m) => ({ m, r: mk(m) })).filter((x) => x.r && x.r.count >= MIN_N).sort((a, b) => b.r!.count - a.r!.count)[0] ?? null;
  const updates = UPDATES.map((m) => ({ m, r: mk(m), until: updateUntil(m), left: left(m) }));
  // 在庫が20件以上ある機種のうち、保証の期限が過ぎた機種
  const stocked = PIXEL_MODELS.filter((m) => (mk(m)?.count ?? 0) >= MIN_N);
  const expired = stocked.filter((m) => left(m) <= 0);
  const series = SERIES.map(([label, m]) => ({ label, m, r: mk(m), spec: PIXEL_SPECS[m] }));

  const carrier = [];
  for (const [m, gb] of CARRIER_PAIRS) {
    const c = await stat(m, gb, CARRIER), f = await stat(m, gb, SIMFREE);
    if (pairOk(c, f)) carrier.push({ m, gb, c, f });
  }

  const rank = [];
  for (const [m, gb] of RANK_PAIRS) {
    const a = await stat(m, gb, { conditionRank: { in: ["A", "a"] } }), c = await stat(m, gb, { conditionRank: { in: ["C", "c"] } });
    if (pairOk(a, c)) rank.push({ m, gb, a, c });
  }

  const storage = [];
  for (const [m, a, b] of STORAGE_PAIRS) {
    const x = await stat(m, a), y = await stat(m, b);
    if (pairOk(x, y)) storage.push({ m, a, b, x, y });
  }

  // 予算別（アップデート保証が残っている・在庫50件以上・ひとつ下の予算より上〜予算以下で、相場がいちばん高い機種）
  const budget = PIXEL_BUDGETS.map((b, i) => {
    const lo = i ? PIXEL_BUDGETS[i - 1] : 0;
    const pick = PIXEL_MODELS.map((m) => ({ m, r: mk(m) }))
      .filter((x) => x.r && left(x.m) > 0 && x.r.count >= 50 && x.r.medianPrice <= b && x.r.medianPrice > lo)
      .sort((x, y) => y.r!.medianPrice - x.r!.medianPrice)[0];
    return { b, pick: pick ? { m: pick.m, price: pick.r!.medianPrice, gb: pick.r!.medianStorage, count: pick.r!.count } : null };
  });

  const sz = stocked.map(mk);
  const szTotal = sz.length, sz128 = sz.filter((r) => r!.medianStorage === 128).length;

  return { topModel, shops, updated, total, withBattery, batteryShops, updates, stockedN: stocked.length, expired, szTotal, sz128, series, carrier, rank, storage, budget };
}

const monthText = (d: Date) => d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long" });

export async function generateMetadata(): Promise<Metadata> {
  const title = `中古Google Pixelの選び方 完全ガイド｜アップデート保証の期限・a・Pro・Foldの違い・キャリア版とSIMフリー【${monthText(new Date())}】`;
  const description = "中古Google Pixelをどれにするか、どこで買うかを、在庫の相場で決めるガイド。アップデート保証の期限、無印・a・Pro・Pro XL・Fold の違い、キャリア版と SIM フリーの差、状態ランク、容量、店の保証、予算別のおすすめ、届いたら見る5つ（毎日更新）。";
  return { title, description, alternates: { canonical: PATH }, openGraph: { ...OG_BASE, title: `${title} | ${SITE_NAME}`, description, url: PATH, images: ["/pixel/opengraph-image"] } };
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
type Mkt = { medianPrice: number; medianStorage: number | null; count: number } | null;
const mlink = (m: string) => <Link href={modelPagePath(m)} className={LINK}>{short(m)}</Link>;
// 20件未満の相場は出さない
const mkt = (r: Mkt) => (!r ? "在庫なし" : r.count < MIN_N ? "在庫が少ない" : yen(r.medianPrice));
const mktSub = (r: Mkt) => (r ? (r.count < MIN_N ? `${r.count}件` : `${r.medianStorage ?? "—"}GB・${r.count.toLocaleString()}件`) : "");
const signed = (n: number) => (n >= 0 ? `+${yen(n)}` : `−${yen(-n)}`);

export default async function PixelGuidePage() {
  const d = await getData();
  const dateText = (d.updated ?? new Date()).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const shopNum = d.shops.length;
  const redRom = d.shops.filter((s) => s.redRom && !/なし|記載なし/.test(s.redRom)).length;
  const year = d.shops.filter((s) => s.yearWarranty).length;
  const batteryPct = d.total ? Math.round((d.withBattery / d.total) * 100) : 0;

  const top = d.topModel;
  const cheaperFree = d.carrier.filter((x) => x.f.median! < x.c.median!).length;
  const seriesModels = d.series.map((s) => s.m);
  const seriesCompares = COMPARE_PAIRS.filter(([a, b]) => seriesModels.includes(a) && seriesModels.includes(b));
  const base = d.series.find((s) => s.label === "無印");
  const aModel = d.series.find((s) => s.label === "a");
  const chipDiff = base?.spec && aModel?.spec && base.spec.chip !== aModel.spec.chip;
  const okR = (r: Mkt) => r !== null && r.count >= MIN_N;
  const aCheaper = base && aModel && okR(base.r) && okR(aModel.r) && aModel.r!.medianStorage === base.r!.medianStorage && aModel.r!.medianPrice < base.r!.medianPrice ? base.r!.medianPrice - aModel.r!.medianPrice : null;

  const lead = `${dateText}時点の大手中古ショップ${shopNum}店の在庫から、中古Pixelは「Google のアップデート保証があと何年残っているか」「モデル（無印・a・Pro・Pro XL・Fold）」「キャリア版か SIM フリーか」の3つで決めるのがおすすめです。${top ? `いちばん在庫が多い機種は ${top.m} で、相場は${yen(top.r!.medianPrice)}（${top.r!.medianStorage}GB）。` : ""}`;

  const c0 = d.carrier[0];
  const u0 = d.updates.find((u) => u.m === "Pixel 8");
  const faqs = [
    { q: "中古Pixelは何年前の機種まで買っていい？", a: `Google のアップデート保証の期限を目安にしてください。Pixel 8 以降は販売開始から7年、Pixel 6〜7 シリーズ・Pixel Fold は5年です${u0?.until ? `（たとえば Pixel 8 は${jaMonth(u0.until)}まで）` : ""}。機種ごとの期限と相場は、このページの1にまとめています。` },
    { q: "中古Pixelはキャリア版とSIMフリーのどっちがいい？", a: `${c0 ? `${c0.m} ${c0.gb}GB はキャリア版の相場が${yen(c0.c.median!)}、SIM フリー（店の表記が Google）が${yen(c0.f.median!)}です。` : ""}価格だけでなく、使う回線で使えるか（対応する電波の帯域・SIM ロックの有無）を商品ページと携帯会社の案内で確かめてから選びます。キャリア版は届いたら IMEI でネットワーク利用制限も確かめます。` },
    { q: "中古Pixelが届いたら何を確かめる？", a: "前の持ち主の Google アカウントを求められないか（初期化されているか）、IMEI でネットワーク利用制限、画面の焼けや色むら（Fold は折り目とヒンジも）、カメラ・スピーカー・充電、使う SIM で通話とデータ通信ができるかの5つです。" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古Google Pixelの相場一覧", item: `${SITE_URL}/pixel` },
        { "@type": "ListItem", position: 3, name: "中古Google Pixelの選び方", item: `${SITE_URL}${PATH}` },
      ],
    },
    { "@context": "https://schema.org", "@type": "WebPage", name: "中古Google Pixelの選び方 完全ガイド", url: `${SITE_URL}${PATH}`, description: lead, ...(d.updated ? { dateModified: d.updated.toISOString() } : {}) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="中古Pixelの選び方" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/pixel" className="hover:text-brand-800">中古Google Pixel</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">選び方</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">中古Google Pixelの選び方 完全ガイド</h1>
          <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">
            {lead}
            <Link href="/about#data" className={`${LINK} ml-1 whitespace-nowrap`}>集計の方法</Link>
          </p>
        </div>

        {/* 早見表 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">早見表</h2>
          <Rows caption="中古Pixelの選び方の早見表" rows={[
            { k: "保証", v: "アップデート保証の残りで線を引く", sub: "Pixel 8 以降は販売開始から7年・6〜7 シリーズと Fold は5年" },
            { k: "モデル", v: "無印・a・Pro・Pro XL・Fold", sub: "画面の大きさとチップは2に" },
            { k: "通信", v: "キャリア版か SIM フリーか", sub: "使う回線で使えるかを確かめる" },
            { k: "電池", v: "%が分かる在庫は一部", sub: `%の記載があるのは在庫の${batteryPct}%` },
            { k: "店", v: "赤ロム保証と保証の長さ", sub: `赤ロム保証の記載 ${redRom}店／${shopNum}店` },
            { k: "届いたら", v: "その日に5つを確かめる", sub: "店の保証の期間内に" },
          ]} />
        </section>

        {/* 1 アップデート保証 */}
        <section className="flex flex-col gap-2">
          <H2 n={1}>アップデート保証の期限で線を引く</H2>
          <p className="text-sm text-ink-sub leading-relaxed">
            {`Pixel は機種ごとに Google のアップデート保証の期限が決まっています（Pixel 8 以降は販売開始から7年、Pixel 6〜7 シリーズ・Pixel Fold は5年）。中古で買うときは、値段と一緒に「あと何年残っているか」を見てください。${d.expired.length ? `在庫が${MIN_N}件以上ある${d.stockedN}機種のうち、${d.expired.join("・")} は期限を過ぎています。` : ""}`}
          </p>
          <Rows caption="無印と a の保証の期限と相場" rows={d.updates.map((u) => ({
            k: <>{mlink(u.m)} <span className="text-[11px] text-ink-mute">{u.until ? (u.left > 0 ? `${jaMonth(u.until)}まで・残り${u.left}年` : `${jaMonth(u.until)}で終了`) : ""}</span></>,
            v: mkt(u.r),
            sub: mktSub(u.r),
          }))} />
          <p className="text-[11px] text-ink-mute">期限は米国 Google ストアで販売が始まった年月に保証の年数を足したもの。相場は在庫がいちばん多い容量の中央値（容量は機種で違います）。<Link href="/pixel/how-long" className={LINK}>全機種の期限</Link></p>
        </section>

        {/* 2 モデル */}
        <section className="flex flex-col gap-2">
          <H2 n={2}>無印・a・Pro・Pro XL・Fold、どれにする？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">
            {`Pixel 10 シリーズの5モデルを並べました。${aCheaper !== null ? `a は無印より相場（同じ容量）が${yen(aCheaper)}安く、` : ""}${chipDiff ? `チップは無印が ${chipText(base!.m)}、a が ${chipText(aModel!.m)} で違います。` : ""}Pro XL は折りたたまないモデルの中で画面がいちばん大きく、Pro Fold は開くと大きな画面になる折りたたみです。`}
          </p>
          <Rows caption="Pixel 10 シリーズのモデルごとの相場" rows={d.series.map((s) => ({
            k: mlink(s.m),
            v: mkt(s.r),
            sub: `${s.spec ? `${chipText(s.m)}・${displayText(s.m)}` : ""}${s.r && s.r.count >= MIN_N ? `・${s.r.medianStorage}GB・${s.r.count.toLocaleString()}件` : ""}`,
          }))} />
          {seriesCompares.length > 0 && (
            <p className="text-[13px] text-ink-sub">
              違いを詳しく: {seriesCompares.map(([a, b], i) => <span key={comparePath(a, b)}>{i ? "・" : ""}<Link href={comparePath(a, b)} className={LINK}>{short(a)} と {short(b)}</Link></span>)}
            </p>
          )}
          <p className="text-[11px] text-ink-mute">チップと画面は Google の技術仕様から。Pro Fold は外側と内側の画面。</p>
        </section>

        {/* 3 キャリア版と SIM フリー */}
        {d.carrier.length > 0 && (
          <section className="flex flex-col gap-2">
            <H2 n={3}>キャリア版と SIM フリー</H2>
            <p className="text-sm text-ink-sub leading-relaxed">
              {`中古の Pixel には docomo・au・SoftBank などのキャリア版と、SIM フリー版があります。${d.carrier.length >= 2 ? (cheaperFree === 0 ? `下の${d.carrier.length}機種はどれも、同じ容量ならキャリア版の方が相場が安くなっています。` : cheaperFree === d.carrier.length ? `下の${d.carrier.length}機種はどれも、SIM フリーの方が相場が安くなっています。` : `下の${d.carrier.length}機種のうち、SIM フリーの方が安いのは${cheaperFree}機種です。`) : ""}別の会社の回線で使うなら、価格より先に、その回線で使えるか（対応する電波の帯域・SIM ロックの有無）を商品ページと携帯会社の案内で確かめます。`}
            </p>
            <Rows caption="キャリア版と SIM フリーの相場" rows={d.carrier.map((x) => ({
              k: <>{mlink(x.m)} <span className="text-[11px] text-ink-mute">{x.gb}GB</span></>,
              v: `SIM フリー ${signed(x.f.median! - x.c.median!)}`,
              sub: `キャリア版 ${yen(x.c.median!)}（${x.c.n}件）・SIM フリー ${yen(x.f.median!)}（${x.f.n}件）`,
            }))} />
            <p className="text-[11px] text-ink-mute">キャリア版は店の表記が docomo・au・SoftBank・楽天モバイルの在庫、SIM フリーは「Google」の在庫。キャリアの表記がない在庫は数えていません。</p>
          </section>
        )}

        {/* 4 電池とランク */}
        <section className="flex flex-col gap-2">
          <H2 n={4}>電池と状態ランク</H2>
          <p className="text-sm text-ink-sub leading-relaxed">
            {`電池の状態（%など）の記載があるのは、Pixel の在庫の${batteryPct}%です。${d.batteryShops.length ? `記載が多いのは ${d.batteryShops.map((s) => s.label).join("・")}。` : ""}電池を重く見るなら、記載のある店か、保証の長い店を選びます。`}
          </p>
          {d.batteryShops.length > 0 && (
            <Rows caption="電池の記載が多い店" rows={d.batteryShops.map((s) => ({
              k: s.label,
              v: `記載 ${s.pct}%`,
              sub: `Pixel の在庫 ${s.n.toLocaleString()}件${s.over80 ? "・「80%以上」かどうかの表記" : ""}`,
            }))} />
          )}
          {d.rank.length > 0 && <>
            <p className="text-sm text-ink-sub leading-relaxed mt-2">ランクの差はほとんどが外装の傷の差です。ケースを付けるなら、ランクC も候補になります。</p>
            <Rows caption="状態ランクAとCの相場" rows={d.rank.map((r) => ({
              k: <>{mlink(r.m)} <span className="text-[11px] text-ink-mute">{r.gb}GB</span></>,
              v: `A と C の差 ${signed(r.a.median! - r.c.median!)}`,
              sub: `A ${yen(r.a.median!)}（${r.a.n}件）・C ${yen(r.c.median!)}（${r.c.n}件）`,
            }))} />
          </>}
          <p className="text-[11px] text-ink-mute">ランクの基準は店ごとに違います。電池の記載は「80%以上」のように幅で書く店もあります。</p>
        </section>

        {/* 5 容量 */}
        {d.storage.length > 0 && (
          <section className="flex flex-col gap-2">
            <H2 n={5}>容量はどれにする？</H2>
            <p className="text-sm text-ink-sub leading-relaxed">{`${d.szTotal ? `在庫が${MIN_N}件以上ある${d.szTotal}機種のうち${d.sz128}機種は、128GB の在庫がいちばん多い容量です。` : ""}写真や動画をたくさん入れるなら、ひとつ上の容量との差も比べてみてください。`}</p>
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
            { k: "Pixel の在庫がある店", v: `${shopNum}店` },
            { k: "赤ロム保証を案内に書いている", v: `${redRom}店`, sub: `在庫のある${shopNum}店のうち` },
            { k: "故障の保証が1年", v: `${year}店` },
          ]} />
        </section>

        {/* 7 予算 */}
        <section className="flex flex-col gap-2">
          <H2 n={7}>予算別：いま買うなら</H2>
          <p className="text-sm text-ink-sub leading-relaxed">アップデート保証の期限が残っていて在庫50件以上の機種のうち、ひとつ下の予算より上・予算以下に相場が入る機種で、相場がいちばん高い機種です（好みでは選んでいません）。</p>
          <Rows caption="予算別のおすすめ" rows={d.budget.map((x) => ({
            k: <Link href={budgetPath(x.b, "pixel")} className={LINK}>{x.b / 10000}万円</Link>,
            v: x.pick ? mlink(x.pick.m) : "該当なし",
            sub: x.pick ? `${yen(x.pick.price)}（${x.pick.gb}GB）・${released(x.pick.m)}・保証 ${jaMonth(updateUntil(x.pick.m)!)}まで` : undefined,
          }))} />
        </section>

        {/* 8 届いたら */}
        <section className="flex flex-col gap-2">
          <H2 n={8}>届いたらまず見る5つ</H2>
          <ol className={`${CARD} divide-y divide-line-soft text-sm`}>
            {[
              { t: "初期化されているか", d: "初期設定で前の持ち主の Google アカウントを求められたら、まだ前の持ち主のアカウントが残っています。すぐ店に連絡を。" },
              { t: "ネットワーク利用制限", d: "IMEI を、端末を売った携帯会社のサイトで調べる。制限がかかっていたら、店の赤ロム保証の対象か確かめます。" },
              { t: "画面の焼け・色むら", d: "白や灰色の画面を全体に出して、前の表示の跡が残っていないか、反応しない所がないか。Fold は折り目とヒンジの動きも。" },
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
            アップデート保証の期限: Google「<a href={UPDATE_URL} target="_blank" rel="noopener" className={LINK}>Pixel のアップデート保証期間</a>」・
            販売開始の年月: Google「<a href={AVAILABLE_URL} target="_blank" rel="noopener" className={LINK}>デバイスが利用可能になった時期</a>」・
            チップと画面: <a href={PIXEL_SPECS["Pixel 10"].url} target="_blank" rel="noopener" className={LINK}>{PIXEL_SPECS["Pixel 10"].source}</a>・
            店の保証: 各店の公式ページ（{d.shops.map((s, i) => <span key={s.name}>{i ? "・" : ""}<a href={s.guaranteeUrl} target="_blank" rel="noopener" className={LINK}>{s.label}</a></span>)}）。
            中古: 大手中古ショップの販売中の在庫（ジャンク除く・{dateText}時点・1日4回取得）・相場は中央値。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2"><Link href="/pixel" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古Google Pixelの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
