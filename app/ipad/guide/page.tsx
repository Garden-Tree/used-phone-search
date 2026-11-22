import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import prisma from "@/lib/prisma";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { getModelMarket } from "@/lib/marketStats";
import { activeShops } from "@/lib/activeShops";
import { IPAD_SHOPS } from "@/lib/shops";
import { modelPagePath } from "@/lib/catalog";
import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { IPAD_SPECS, IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { pencilsFor, IPAD_PENCIL_SOURCE } from "@/lib/ipadPencil";
import { budgetPath, IPAD_BUDGETS } from "@/lib/budgets";
import { yen } from "@/lib/format";
import { SITE_NAME, SITE_URL, OG_BASE } from "@/lib/site";

// 機種ページと同じくビルドのたびに作る（1日4回）
export const dynamic = "force-static";

/**
 * 中古iPadの選び方 完全ガイド（2026-11-22〜）: /iphone/guide の iPad 版。ChatGPT からの着地は iPhone より iPad が多い（ideas/2026-11-22-growth-analysis.md）。
 * 数字はビルドのたびに DB から（count・aggregate・中央値の1行だけ。findMany で全件は読まない）。ジャンクは除く。20件未満の相場は出さない。
 * 事実は公式で確かめた値だけ: iPadOS 27・チップ・画面（lib/ipadSpecs.ts）・Apple Pencil（lib/ipadPencil.ts）・店（lib/shops.ts）。
 * 「届いたら見る5つ」は Apple のサポート（108794 アクティベーションロック・108037 IMEI・108937 Pencil）で 11/22 に確かめた表記。
 * iPad の電池の見方は機種の対応が確かめられないので手順は書かず、Apple のユーザガイドへのリンクだけ。部品と修理の履歴は iPhone だけのページなので入れない。
 */
const PATH = "/ipad/guide";
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

const short = (m: string) => m.replace(/^iPad /, "").replace(/^\(/, "無印 (");
const pencilText = (m: string) => {
  const p = pencilsFor(m);
  return p.length ? p.map((x) => x).join("・") : "—";
};

// 1 iPadOS 27 の線（シリーズごとに、対応するいちばん古い機種と、対応しないいちばん新しい機種）
const GEN_PAIRS: [string, string][] = [
  ["iPad (第9世代)", "iPad (第8世代)"],
  ["iPad mini (第6世代)", "iPad mini (第5世代)"],
  ["iPad Air (第4世代)", "iPad Air (第3世代)"],
  ["iPad Pro 11インチ (第2世代)", "iPad Pro 11インチ (第1世代)"],
];
// 2 シリーズの違い（いま中古で多い代表の1機種ずつ）
const SERIES: [string, string][] = [
  ["無印", "iPad (A16)"],
  ["mini", "iPad mini (A17 Pro)"],
  ["Air", "iPad Air 11インチ (M2)"],
  ["Pro", "iPad Pro 11インチ (M4)"],
];
const WIFI: W = { carrier: "Wi-Fiモデル" };
const CELL: W = { carrier: { in: ["docomo", "au", "SoftBank", "国内版SIMフリー", "海外版SIMフリー"] } };
const BANDS: [string, W][] = [
  ["90%以上", { batteryHealth: { gte: 90, lte: 99 } }],
  ["85〜89%", { batteryHealth: { gte: 85, lte: 89 } }],
  ["80〜84%", { batteryHealth: { gte: 80, lte: 84 } }],
  ["80%未満", { batteryHealth: { lt: 80 } }],
];
// 予算別（iPadOS 27 対応・在庫100件以上・予算から1万円以内で相場がいちばん高い）
const BUDGETS = [50000, 70000, 80000, 100000, 150000];

async function getData() {
  const shops = await activeShops(IPAD_SHOPS);
  const ipadW: W = { isSoldOut: false, modelName: { startsWith: "iPad" }, ...NOT_JUNK };
  const updated = (await prisma.deviceInventory.aggregate({ where: { isSoldOut: false, modelName: { startsWith: "iPad" } }, _max: { updatedAt: true } }))._max.updatedAt;
  const total = await prisma.deviceInventory.count({ where: ipadW });
  const withBattery = await prisma.deviceInventory.count({ where: { ...ipadW, batteryHealth: { not: null } } });

  const market = await getModelMarket(IPAD_MODELS);
  const mk = (m: string) => market.get(m) ?? null;

  const gen = GEN_PAIRS.map(([a, b]) => ({ a, b, ra: mk(a), rb: mk(b) }));
  const series = SERIES.map(([label, m]) => ({ label, m, r: mk(m), spec: IPAD_SPECS[m] }));

  const cell = [];
  for (const [m, gb] of [["iPad (第9世代)", 64], ["iPad mini (第6世代)", 64], ["iPad mini (A17 Pro)", 128], ["iPad Air (第5世代)", 64]] as [string, number][]) {
    const w = await stat(m, gb, WIFI), c = await stat(m, gb, CELL);
    if (ok(w) && ok(c)) cell.push({ m, gb, w, c });
  }

  const battery = [];
  for (const [label, w] of BANDS) battery.push({ label, s: await stat("iPad (第9世代)", 64, w) });

  const rank = [];
  for (const [m, gb] of [["iPad (第9世代)", 64], ["iPad (第10世代)", 64], ["iPad (A16)", 128], ["iPad mini (第6世代)", 64]] as [string, number][]) {
    const a = await stat(m, gb, { conditionRank: { in: ["A", "a"] } }), c = await stat(m, gb, { conditionRank: { in: ["C", "c"] } });
    if (ok(a) && ok(c)) rank.push({ m, gb, a, c });
  }

  const storage = [];
  for (const [m, a, b] of [["iPad (第9世代)", 64, 256], ["iPad (第10世代)", 64, 256], ["iPad (A16)", 128, 256], ["iPad Air 11インチ (M2)", 128, 256]] as [string, number, number][]) {
    const x = await stat(m, a), y = await stat(m, b);
    if (ok(x) && ok(y)) storage.push({ m, a, b, x, y });
  }

  const budget = BUDGETS.map((b) => {
    const pick = IPAD_MODELS.filter((m) => IPADOS27_MODELS.has(m)).map((m) => ({ m, r: mk(m) }))
      .filter((x) => x.r && x.r.count >= 100 && x.r.medianPrice <= b && x.r.medianPrice > b - 10000)
      .sort((x, y) => y.r!.medianPrice - x.r!.medianPrice)[0];
    return { b, pick: pick ? { m: pick.m, price: pick.r!.medianPrice, gb: pick.r!.medianStorage, count: pick.r!.count } : null };
  });

  return { shops, updated, total, withBattery, gen, series, cell, battery, rank, storage, budget };
}

const monthText = (d: Date) => d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long" });

export async function generateMetadata(): Promise<Metadata> {
  const title = `中古iPadの選び方 完全ガイド｜世代・シリーズ・Pencil・Wi-Fiとセルラー・届いたら見る5つ【${monthText(new Date())}】`;
  const description = "中古iPadをどれにするか、どこで買うかを、在庫の相場で決めるガイド。iPadOS 27 の線引き、無印・mini・Air・Pro の違いと使える Apple Pencil、Wi-Fi とセルラーの差、状態ランク、容量、店の保証、予算別のおすすめ、届いたら見る5つ（毎日更新）。";
  return { title, description, alternates: { canonical: PATH }, openGraph: { ...OG_BASE, title: `${title} | ${SITE_NAME}`, description, url: PATH, images: ["/ipad/opengraph-image"] } };
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

export default async function IpadGuidePage() {
  const d = await getData();
  const dateText = (d.updated ?? new Date()).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const shopNum = d.shops.length;
  const redRom = d.shops.filter((s) => s.redRom && !/なし|記載なし/.test(s.redRom)).length;
  const year = d.shops.filter((s) => s.yearWarranty).length;
  const batteryPct = d.total ? Math.round((d.withBattery / d.total) * 100) : 0;

  const g9 = d.gen[0];
  const b9hi = ok(d.battery[0].s) ? d.battery[0].s.median : null, b9mid = ok(d.battery[1].s) ? d.battery[1].s.median : null;
  const c9 = d.cell.find((x) => x.m === "iPad (第9世代)");

  const lead = `${dateText}時点の大手中古ショップ${shopNum}店の在庫から、中古iPadは「iPadOS 27 に対応する世代」「使いたい Apple Pencil が使えるシリーズ」「Wi-Fi かセルラーか」の3つで決めるのがおすすめです。${g9.ra ? `いちばん在庫が多いのは iPad（第9世代）で、相場は${yen(g9.ra.medianPrice)}（${g9.ra.medianStorage}GB）。` : ""}`;

  const faqs = [
    { q: "中古iPadは何世代前まで買っていい？", a: "iPadOS 27 に対応する機種が目安です（Apple 公式）。iPad（第9世代）・iPad mini（第6世代）・iPad Air（第4世代）・iPad Pro 11インチ（第2世代）・12.9インチ（第4世代）以降が対応しています。" },
    { q: "中古iPadはWi-Fiモデルとセルラーモデルのどっちがいい？", a: `家と Wi-Fi のある場所で使うなら Wi-Fi モデルで十分です。${c9 && c9.w.median && c9.c.median ? `iPad（第9世代）64GB はセルラーモデルの相場が${yen(c9.c.median)}、Wi-Fi モデルが${yen(c9.w.median)}です。` : ""}外で地図や通信を使うならセルラーモデル（届いたら IMEI でネットワーク利用制限を確かめる）。` },
    { q: "中古iPadが届いたら何を確かめる？", a: "アクティベーションロック（前の持ち主の Apple Account を求められないか）、消去されているか（パスコード画面が出ないか）、セルラーモデルは IMEI でネットワーク利用制限（設定 > 一般 > 情報）、Apple Pencil がつながるか、画面・カメラ・スピーカー・充電の5つです。" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "中古iPadの相場一覧", item: `${SITE_URL}/ipad` },
        { "@type": "ListItem", position: 3, name: "中古iPadの選び方", item: `${SITE_URL}${PATH}` },
      ],
    },
    { "@context": "https://schema.org", "@type": "WebPage", name: "中古iPadの選び方 完全ガイド", url: `${SITE_URL}${PATH}`, description: lead, ...(d.updated ? { dateModified: d.updated.toISOString() } : {}) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="中古iPadの選び方" />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-2">
            <Link href="/" className="hover:text-brand-800">トップ</Link>
            <span className="mx-2">›</span>
            <Link href="/ipad" className="hover:text-brand-800">中古iPadの相場一覧</Link>
            <span className="mx-2">›</span>
            <span className="text-ink-sub">選び方</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">中古iPadの選び方 完全ガイド</h1>
          <p className="text-[13px] md:text-sm text-ink-sub leading-relaxed">
            {lead}
            <Link href="/about#data" className={`${LINK} ml-1 whitespace-nowrap`}>集計の方法</Link>
          </p>
        </div>

        {/* 早見表 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg md:text-xl font-bold">早見表</h2>
          <Rows caption="中古iPadの選び方の早見表" rows={[
            { k: "世代", v: "iPadOS 27 対応", sub: "無印 第9世代・mini 第6世代・Air 第4世代以降" },
            { k: "シリーズ", v: "使う Pencil で決める", sub: "Pencil Pro は M2 以降の Air・M4 以降の Pro・mini (A17 Pro)" },
            { k: "通信", v: "家で使うなら Wi-Fi", sub: "外で使うならセルラー" },
            { k: "容量", v: "64GBなら256GBも比べる", sub: "差が1万円台のことが多い" },
            { k: "店", v: "赤ロム保証と保証の長さ", sub: `赤ロム保証の記載 ${redRom}店／${shopNum}店` },
            { k: "届いたら", v: "その日に5つを確かめる", sub: "店の保証の期間内に" },
          ]} />
        </section>

        {/* 1 世代 */}
        <section className="flex flex-col gap-2">
          <H2 n={1}>何世代まで買っていい？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">線は iPadOS 27 に対応しているか。シリーズごとに、対応するいちばん古い機種と、対応しないいちばん新しい機種を並べました。</p>
          <Rows caption="iPadOS 27 の線の前後の相場" rows={d.gen.flatMap((g) => [
            { k: <>{mlink(g.a)} <span className="text-[11px] text-ink-mute">対応</span></>, v: mkt(g.ra), sub: mktSub(g.ra) },
            { k: <>{mlink(g.b)} <span className="text-[11px] text-ink-mute">非対応</span></>, v: mkt(g.rb), sub: mktSub(g.rb) },
          ])} />
          <p className="text-[11px] text-ink-mute">相場は在庫がいちばん多い容量の中央値（容量は機種で違います）。全機種は <Link href="/ipad/how-long" className={LINK}>いつまで使える？</Link> に。</p>
        </section>

        {/* 2 シリーズ */}
        <section className="flex flex-col gap-2">
          <H2 n={2}>無印・mini・Air・Pro、どれにする？</H2>
          <p className="text-sm text-ink-sub leading-relaxed">いちばん大きな違いは、使える Apple Pencil と画面の大きさです。絵や手書きのノートに使うなら、先に Pencil を決めてからシリーズを選ぶと迷いません。</p>
          <Rows caption="シリーズごとの代表の機種" rows={d.series.map((s) => ({
            k: mlink(s.m),
            v: mkt(s.r),
            sub: `${s.spec ? `${s.spec.chip}・${s.spec.display}インチ・` : ""}Pencil ${pencilText(s.m)}${s.r ? `・${s.r.medianStorage}GB` : ""}`,
          }))} />
          <p className="text-[11px] text-ink-mute">チップと画面は Apple の技術仕様、Pencil は Apple「Apple Pencil の互換性」から。</p>
        </section>

        {/* 3 通信 */}
        {d.cell.length > 0 && (
          <section className="flex flex-col gap-2">
            <H2 n={3}>Wi-Fi モデルとセルラーモデル</H2>
            <p className="text-sm text-ink-sub leading-relaxed">家やWi-Fi のある場所で使うなら Wi-Fi モデルで十分。外で通信するならセルラーモデルにして、SIM が使えるか（SIM フリーか・ネットワーク利用制限）を確かめます。</p>
            <Rows caption="Wi-Fi モデルとセルラーモデルの相場" rows={d.cell.map((x) => ({
              k: <>{mlink(x.m)} <span className="text-[11px] text-ink-mute">{x.gb}GB</span></>,
              v: `セルラー +${yen(x.c.median! - x.w.median!)}`,
              sub: `Wi-Fi ${yen(x.w.median!)}（${x.w.n}件）・セルラー ${yen(x.c.median!)}（${x.c.n}件）`,
            }))} />
            <p className="text-[11px] text-ink-mute">セルラーは店の表記が docomo・au・SoftBank・SIM フリーの在庫。</p>
          </section>
        )}

        {/* 4 電池とランク */}
        <section className="flex flex-col gap-2">
          <H2 n={4}>電池と状態ランク</H2>
          <p className="text-sm text-ink-sub leading-relaxed">{`iPad は電池の%を書いていない在庫が多く、%が分かるのは${batteryPct}%だけです。${b9hi && b9mid && b9hi < b9mid ? `iPad（第9世代）は90%以上（${yen(b9hi)}）の方が85〜89%（${yen(b9mid)}）より安く、%が高いほど高いとは限りません。` : ""}電池を重く見るなら、%を書いている店か、保証の長い店を選びます。`}</p>
          <h3 className="text-sm font-bold">{mlink("iPad (第9世代)")}（64GB）の電池の%ごとの相場</h3>
          <Rows caption="iPad 第9世代 64GB の電池の%ごとの相場" rows={d.battery.map((x) => ({
            k: x.label,
            v: ok(x.s) ? yen(x.s.median!) : "—",
            sub: x.s.n >= MIN_N ? `${x.s.n.toLocaleString()}件` : `${x.s.n}件（少ないので相場は出さない）`,
          }))} />
          {d.rank.length > 0 && <>
            <p className="text-sm text-ink-sub leading-relaxed mt-2">ランクの差はほとんどが外装の傷の差です。ケースやカバーを付けるなら、ランクC も候補になります。</p>
            <Rows caption="状態ランクAとCの相場" rows={d.rank.map((r) => ({
              k: <>{mlink(r.m)} <span className="text-[11px] text-ink-mute">{r.gb}GB</span></>,
              v: `A と C の差 ${yen(r.a.median! - r.c.median!)}`,
              sub: `A ${yen(r.a.median!)}・C ${yen(r.c.median!)}`,
            }))} />
          </>}
          <p className="text-[11px] text-ink-mute">ランクの基準は店ごとに違います。iPad の電池の状態の見方は <a href="https://support.apple.com/ja-jp/guide/ipad/ipadcda46da7/ipados" target="_blank" rel="noopener" className={LINK}>Apple「iPadのバッテリーの使用状況と状態を理解する」</a>。</p>
        </section>

        {/* 5 容量 */}
        {d.storage.length > 0 && (
          <section className="flex flex-col gap-2">
            <H2 n={5}>容量は64GBで足りる？</H2>
            <p className="text-sm text-ink-sub leading-relaxed">動画を見る・調べものが中心なら64GB でも使えます。アプリやイラストのデータを入れるなら、差が1万円台の256GB も比べてみてください。</p>
            <Rows caption="容量を上げたときの相場の差" rows={d.storage.map((s) => ({
              k: mlink(s.m),
              v: `+${yen(s.y.median! - s.x.median!)}`,
              sub: `${s.a}GB ${yen(s.x.median!)} → ${s.b}GB ${yen(s.y.median!)}`,
            }))} />
          </section>
        )}

        {/* 6 店 */}
        <section className="flex flex-col gap-2">
          <H2 n={6}>どこで買う？店ごとの違い</H2>
          <p className="text-sm text-ink-sub leading-relaxed">見るのは赤ロム保証（セルラーモデル）・電池の書き方・故障の保証。いちばん安い店は機種ごとに入れ替わるので、機種を決めてから店をまたいで比べるのが安く買う近道です。</p>
          <Rows caption="店ごとの違い" rows={[
            { k: "iPad の在庫がある店", v: `${shopNum}店` },
            { k: "赤ロム保証を案内に書いている", v: `${redRom}店` },
            { k: "故障の保証が1年", v: `${year}店` },
          ]} />
        </section>

        {/* 7 予算 */}
        <section className="flex flex-col gap-2">
          <H2 n={7}>予算別：いま買うなら</H2>
          <p className="text-sm text-ink-sub leading-relaxed">iPadOS 27 対応・在庫100件以上で、予算から1万円下までに相場が入る機種のうち、相場がいちばん高い機種です（好みでは選んでいません）。</p>
          <Rows caption="予算別のおすすめ" rows={d.budget.map((x) => ({
            k: IPAD_BUDGETS.includes(x.b) ? <Link href={budgetPath(x.b, "ipad")} className={LINK}>{x.b / 10000}万円</Link> : `${x.b / 10000}万円`,
            v: x.pick ? mlink(x.pick.m) : "該当なし",
            sub: x.pick ? `${yen(x.pick.price)}（${x.pick.gb}GB）・Pencil ${pencilText(x.pick.m)}` : undefined,
          }))} />
        </section>

        {/* 8 届いたら */}
        <section className="flex flex-col gap-2">
          <H2 n={8}>届いたらまず見る5つ</H2>
          <ol className={`${CARD} divide-y divide-line-soft text-sm`}>
            {[
              { t: "アクティベーションロック", d: "初期設定で前の持ち主の Apple Account を求められたら、まだ前の持ち主のアカウントに紐付いています。すぐ店に連絡を。" },
              { t: "消去されているか", d: "電源を入れてパスコードの画面やホーム画面が出たら、消去されていません。「こんにちは」の画面から始まるのが正しい状態です。" },
              { t: "ネットワーク利用制限（セルラーモデル）", d: "設定 > 一般 > 情報 で IMEI を見て、携帯会社のサイトで調べる。Wi-Fi モデルにはありません。" },
              { t: "Apple Pencil がつながるか", d: "使う予定の Pencil が、その iPad に対応しているか（Apple の互換性の表）と、実際にペアリングできるか。" },
              { t: "画面・カメラ・スピーカー・充電", d: "画面を全体に触って反応しない所がないか、写真を撮り、音を鳴らし、ケーブルで充電する。" },
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
            iPadOS 27: <a href="https://support.apple.com/ja-jp/guide/ipad/ipad213a25b2/ipados" target="_blank" rel="noopener" className={LINK}>Apple「iPadOS 27 に対応している iPad のモデル」</a>・
            チップと画面: <a href="https://support.apple.com/ja-jp/108043" target="_blank" rel="noopener" className={LINK}>Apple「iPad のモデルを識別する」</a>と各機種の技術仕様・
            Pencil: <a href={IPAD_PENCIL_SOURCE} target="_blank" rel="noopener" className={LINK}>Apple「Apple Pencil の互換性」</a>・
            届いたら見る5つ: Apple サポート（<a href="https://support.apple.com/ja-jp/108794" target="_blank" rel="noopener" className={LINK}>アクティベーションロック</a>・<a href="https://support.apple.com/ja-jp/108037" target="_blank" rel="noopener" className={LINK}>IMEI</a>）。
            中古: 大手中古ショップの販売中の在庫（ジャンク除く・{dateText}時点・1日4回取得）・相場は中央値。<Link href="/about#data" className={LINK}>集計の方法</Link>
          </p>
          <p className="mt-2"><Link href="/ipad" className="font-bold text-brand-600 hover:underline underline-offset-4 text-sm">中古iPadの相場一覧 &rarr;</Link></p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
