import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DeviceCard, { DeviceList } from "@/app/components/DeviceCard";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import SimTile from "@/app/components/SimTile";
import { badgesOf, modelPagePath } from "@/lib/catalog";
import { COMPARE_PAIRS, comparePath, compareSlug, comparesFor, slugToPair } from "@/lib/compare";
import { getModelStats, type ModelStats, type PriceRow } from "@/lib/modelStats";
import { SITE_NAME, SITE_URL, OG_BASE } from "@/lib/site";
import { medianLabel, yen, storageLabel } from "@/lib/format";
import { activeShopsFor } from "@/lib/activeShops";
import { SPEC_ROWS, specOf, specSourceName, specUrl } from "@/lib/iphoneSpecs";
import { PIXEL_INFO, jaMonth, updateUntil, updateYearsLeft } from "@/lib/pixelCatalog";
import { GALAXY_RELEASED } from "@/lib/galaxyCatalog";
import { getGoodRankMin } from "@/lib/modelBest";
import { isCompareIndexable } from "@/lib/compareStock";
import { buildCompareFaq, choiceSentence, priceReadingSentence, specDiffBrief, specDiffSentence, specDiffs } from "@/lib/compareText";

// モデル別ページと同じくビルドのたびに作る
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）
export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARE_PAIRS.map(([a, b]) => ({ slug: compareSlug(a, b) }));
}

type Props = { params: Promise<{ slug: string }> };

const RANK_ORDER = ["S", "A", "B", "C", "D", "J"];

/** 2モデルの最安値の差から、ひと言まとめを作る */
function verdict(a: string, b: string, sa: ModelStats, sb: ModelStats, withChoice = true): string {
  if (sa.minPrice === null && sb.minPrice === null) return `現在、${a}・${b}ともに在庫がありません。`;
  if (sa.minPrice === null) return `現在 ${a} の在庫はなく、${b} は ${yen(sb.minPrice!)} から購入できます。`;
  if (sb.minPrice === null) return `現在 ${b} の在庫はなく、${a} は ${yen(sa.minPrice)} から購入できます。`;

  const diff = sb.minPrice! - sa.minPrice;
  if (diff === 0) return `${a} と ${b} の中古最安値はどちらも ${yen(sa.minPrice)} で同じです。`;
  const [cheap, pricey] = diff > 0 ? [a, b] : [b, a];
  const rate = Math.round((Math.abs(diff) / Math.max(sa.minPrice, sb.minPrice!)) * 100);
  // 2機種それぞれの最安値を文中に書く（AI・検索が1文で引用できるように。10/21〜）。
  // 選び方は発売の新旧（公式の発売年月）で分ける。高いほうが新しいとは限らない（lib/compareText.ts の choiceSentence）
  return `中古の最安値は ${a} が ${yen(sa.minPrice)}、${b} が ${yen(sb.minPrice!)}で、${cheap} のほうが ${yen(Math.abs(diff))}（約${rate}%）安くなっています。${withChoice ? choiceSentence(cheap, pricey) : ""}`;
}

/** Pixel どうしなら、アップデート保証の残りの差をひと言足す（値段の差と合わせて選べるように） */
function pixelNote(a: string, b: string): string {
  const now = new Date().toISOString().slice(0, 7);
  const la = updateYearsLeft(a, now);
  const lb = updateYearsLeft(b, now);
  if (la === undefined || lb === undefined) return "";
  const d = Math.round((lb - la) * 10) / 10;
  if (d === 0) return ` アップデート保証の残りはどちらも約${Math.max(la, 0)}年です。`;
  const [longer, shorter] = d > 0 ? [b, a] : [a, b];
  return ` Google のアップデート保証は ${longer} のほうが約${Math.abs(d)}年長く残ります（${shorter} は${jaMonth(updateUntil(shorter)!)}まで）。`;
}

/** 年月（"2024-04"）どうしの差（か月） */
const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
};

/** Galaxy どうしなら、日本での発売の差をひと言足す（Samsung・キャリアの発表で確かめた年月。lib/galaxyCatalog.ts） */
function galaxyNote(a: string, b: string): string {
  const ra = GALAXY_RELEASED[a];
  const rb = GALAXY_RELEASED[b];
  if (!ra || !rb) return "";
  const d = monthsBetween(ra, rb);
  if (d === 0) return ` どちらも日本では${jaMonth(ra)}に発売されました。`;
  const [newer, older] = d > 0 ? [b, a] : [a, b];
  return ` 日本での発売は ${newer} が ${older} の約${Math.abs(d)}か月後です（${older} は${jaMonth(GALAXY_RELEASED[older])}、${newer} は${jaMonth(GALAXY_RELEASED[newer])}）。`;
}

/** 2モデルの行（容量・ランク）を突き合わせた比較表の行 */
function mergeRows(ra: PriceRow[], rb: PriceRow[], order: (k: string) => number) {
  const keys = Array.from(new Set([...ra, ...rb].map((r) => r.key))).sort((x, y) => order(x) - order(y));
  return keys.map((key) => ({
    key,
    a: ra.find((r) => r.key === key),
    b: rb.find((r) => r.key === key),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pair = slugToPair(slug);
  if (!pair) return {};
  const [a, b] = pair;
  const [sa, sb] = await Promise.all([getModelStats(a), getModelStats(b)]);

  // 「違い」で探す人に合わせて、タイトルの頭に「違い」（11/2〜。GSC で「15 15plus 違い」などが2週続けて20位より下。ideas/2026-11-02-ai.md）
  const title = `${a} と ${b} の違い｜中古はどっちがお得？最安値で比較`;
  const prices = [
    sa.minPrice !== null ? `${a}は${yen(sa.minPrice)}` : null,
    sb.minPrice !== null ? `${b}は${yen(sb.minPrice)}` : null,
  ].filter(Boolean).join("、");
  const description = `${specDiffBrief(a, b)}${a}と${b}の中古相場を大手中古ショップ${(await activeShopsFor(a)).length}社の在庫から比較。${prices ? `最安値は${prices}から。` : ""}容量別・状態ランク別の最安値と差額をまとめています。`;
  const path = comparePath(a, b);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OG_BASE, title: `${title} | ${SITE_NAME}`, description, url: path },
    // どちらかの在庫が少ない（10件未満）と比較として中身が薄いのでインデックスさせない（サイトマップからも外す。lib/compareStock.ts）
    robots: (await isCompareIndexable(a, b)) ? undefined : { index: false, follow: true },
  };
}

function Cell({ row }: { row?: PriceRow }) {
  return row ? (
    <>
      <span className="font-bold text-price whitespace-nowrap">{yen(row.minPrice)}</span>
      <span className="block text-xs text-ink-mute">{row.count.toLocaleString()}件</span>
    </>
  ) : (
    <span className="text-gray-300">在庫なし</span>
  );
}

function CompareTable({ title, rows, labelOf, a, b }: {
  title: string;
  rows: ReturnType<typeof mergeRows>;
  labelOf: (k: string) => string;
  a: string;
  b: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="bg-white rounded-xl border border-line overflow-hidden mb-6">
      <h2 className="px-5 py-4 text-base font-bold text-ink bg-ground border-b border-line-soft">{title}</h2>
      {/* スマホは1行を2段に（表だと差額が画面の外にはみ出した。11/2）: 上に差額、下に2機種の最安値。md から表 */}
      <ul className="md:hidden divide-y divide-line-soft">
        {rows.map((r) => {
          const diff = r.a && r.b ? r.b.minPrice - r.a.minPrice : null;
          const price = (row?: PriceRow) => row
            ? <><span className="font-bold text-price">{yen(row.minPrice)}</span>（{row.count.toLocaleString()}件）</>
            : <span className="text-gray-300">在庫なし</span>;
          return (
            <li key={r.key} className="px-4 py-2.5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-bold text-ink-sub">{labelOf(r.key)}</span>
                <span className="shrink-0 whitespace-nowrap tabular-nums">
                  <span className="text-[10px] text-ink-mute mr-1">差額</span>
                  <span className="font-bold text-ink-sub">{diff === null ? "-" : `${diff > 0 ? "+" : diff < 0 ? "-" : "±"}${Math.abs(diff).toLocaleString()}円`}</span>
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-mute tabular-nums">
                <span className="whitespace-nowrap">{a} {price(r.a)}</span>　<span className="whitespace-nowrap">{b} {price(r.b)}</span>
              </p>
            </li>
          );
        })}
      </ul>
      <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-ink-mute">
            <th className="text-left font-semibold pl-4 pr-2 sm:px-5 py-2"></th>
            <th className="text-right font-semibold px-2 sm:px-5 py-2">{a}</th>
            <th className="text-right font-semibold px-2 sm:px-5 py-2">{b}</th>
            <th className="text-right font-semibold pl-2 pr-4 sm:px-5 py-2">差額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const diff = r.a && r.b ? r.b.minPrice - r.a.minPrice : null;
            return (
              <tr key={r.key} className="border-t border-line-soft">
                <td className="pl-4 pr-2 sm:px-5 py-3 font-bold text-ink-sub whitespace-nowrap">{labelOf(r.key)}</td>
                <td className="px-2 sm:px-5 py-3 text-right"><Cell row={r.a} /></td>
                <td className="px-2 sm:px-5 py-3 text-right"><Cell row={r.b} /></td>
                <td className="pl-2 pr-4 sm:px-5 py-3 text-right text-ink-sub whitespace-nowrap">
                  {diff === null ? "-" : `${diff > 0 ? "+" : diff < 0 ? "-" : "±"}${Math.abs(diff).toLocaleString()}円`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </section>
  );
}

/** 2機種のスペックの違い（両方のスペックを確かめてある機種どうしのときだけ。違う項目は太字） */
function SpecTable({ a, b }: { a: string; b: string }) {
  const sa = specOf(a);
  const sb = specOf(b);
  if (!sa || !sb) return null;
  return (
    <section id="spec" className="bg-white rounded-xl border border-line overflow-hidden mb-10 scroll-mt-16">
      <h2 className="px-5 py-4 text-base font-bold text-ink bg-ground border-b border-line-soft">スペックの違い</h2>
      <p className="px-5 py-4 text-sm text-ink-sub leading-relaxed border-b border-line-soft">{specDiffSentence(a, b)}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-mute">
              <th className="text-left font-semibold pl-4 pr-2 sm:px-5 py-2"></th>
              <th className="text-left font-semibold px-2 sm:px-5 py-2">{a}</th>
              <th className="text-left font-semibold pl-2 pr-4 sm:px-5 py-2">{b}</th>
            </tr>
          </thead>
          <tbody>
            {SPEC_ROWS.map((r) => {
              const va = r.value(sa);
              const vb = r.value(sb);
              const diff = va !== vb ? "font-bold text-ink" : "text-ink-mute";
              return (
                <tr key={r.label} className="border-t border-line-soft">
                  <td className="pl-4 pr-2 sm:px-5 py-2.5 font-bold text-ink-mute whitespace-nowrap">{r.label}</td>
                  <td className={`px-2 sm:px-5 py-2.5 ${diff}`}>{va}</td>
                  <td className={`pl-2 pr-4 sm:px-5 py-2.5 ${diff}`}>{vb}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 border-t border-line-soft text-xs text-ink-mute">
        {sa.source && specUrl(sa) === specUrl(sb) ? (
          <>出典: <a href={specUrl(sa)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-800">{specSourceName(sa, a)}</a></>
        ) : sa.source || sb.source ? (
          // 機種ごとに出典のページが違う（Galaxy はドコモの機種ごとの仕様ページ）
          <>
            出典: <a href={specUrl(sa)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-800">{specSourceName(sa, a)}</a>・<a href={specUrl(sb)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-800">{specSourceName(sb, b)}</a>
            {sa.extraSource && <>・<a href={sa.extraSource.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-800">{sa.extraSource.name}</a></>}
          </>
        ) : (
          <>
            出典: Apple の技術仕様（
            <a href={specUrl(sa)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-800">{a}</a>・
            <a href={specUrl(sb)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-800">{b}</a>）
          </>
        )}
      </p>
    </section>
  );
}

/**
 * 見出しのすぐ下の「違い」の小さな表（11/2〜・B 案）。違う項目だけと中古の相場。同じ項目は1行にまとめる。
 * 文字を増やさず、検索・AI の「何が違う？」に表で答える。全部の項目は下の「スペックの違い」（#spec）
 */
function DiffBox({ a, b, sa, sb }: { a: string; b: string; sa: ModelStats; sb: ModelStats }) {
  const diffs = specDiffs(a, b);
  const spa = specOf(a);
  const spb = specOf(b);
  if (!diffs || !spa || !spb) return null;
  const same = SPEC_ROWS.filter((r) => r.value(spa) === r.value(spb)).map((r) => r.value(spa));
  // 長い機種名は表の列で折り返すので、同じ語の頭（iPhone・Galaxy など）を2つ目から省く
  // 「iPhone 15 Plus」→「15 Plus」。残りが「(第10世代)」や数字だけになるときは縮めない（iPad の右列が「(第10世代)」だけになった。11/2）
  const short = (m: string) => {
    const head = a.split(" ")[0];
    const rest = m.slice(head.length + 1);
    return m !== a && m.startsWith(head + " ") && /^[^(（]/.test(rest) && /[A-Za-z]/.test(rest) ? rest : m;
  };
  return (
    <section className="bg-white rounded-xl border border-line overflow-hidden mb-3">
      <h2 className="px-3.5 py-2 text-[13px] font-bold bg-ground border-b border-line-soft">
        {diffs.length === 0 ? "スペックの違いはなし" : diffs.length <= 2 ? `違いは${diffs.length}つ（${diffs.map((d) => d.label).join("・")}）` : `違いは${diffs.length}つ`}
      </h2>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] text-ink-mute">
            <th className="text-left font-semibold pl-3.5 pr-2 py-1.5"></th>
            <th className="text-left font-semibold px-2 py-1.5">{a}</th>
            <th className="text-left font-semibold pl-2 pr-3.5 py-1.5">{short(b)}</th>
          </tr>
        </thead>
        <tbody>
          {diffs.map((d) => (
            <tr key={d.label} className="border-t border-line-soft">
              <td className="pl-3.5 pr-2 py-2 text-[12px] font-bold text-ink-mute whitespace-nowrap">{d.label}</td>
              <td className="px-2 py-2 font-bold">{d.va}</td>
              <td className="pl-2 pr-3.5 py-2 font-bold">{d.vb}</td>
            </tr>
          ))}
          {sa.medianPrice !== null && sb.medianPrice !== null && (
            <tr className="border-t border-line-soft">
              <td className="pl-3.5 pr-2 py-2 text-[12px] font-bold text-ink-mute whitespace-nowrap">中古の相場</td>
              <td className="px-2 py-2 font-bold text-price tabular-nums">{yen(sa.medianPrice)}{sa.medianStorage ? <span className="ml-1 text-[11px] font-normal text-ink-mute">{storageLabel(sa.medianStorage, a)}</span> : null}</td>
              <td className="pl-2 pr-3.5 py-2 font-bold text-price tabular-nums">{yen(sb.medianPrice)}{sb.medianStorage ? <span className="ml-1 text-[11px] font-normal text-ink-mute">{storageLabel(sb.medianStorage, b)}</span> : null}</td>
            </tr>
          )}
        </tbody>
      </table>
      {same.length > 0 && (
        <p className="px-3.5 py-2 border-t border-line-soft text-[11px] text-ink-mute">
          同じ: {same.join("・")}　<a href="#spec" className="text-brand-600 font-bold">すべて見る ›</a>
        </p>
      )}
    </section>
  );
}

/** Pixel どうしの比較: 販売開始とアップデート保証（Google 公式の年数と販売開始の年月から。lib/pixelCatalog.ts） */
function PixelUpdateTable({ a, b }: { a: string; b: string }) {
  const ia = PIXEL_INFO[a];
  const ib = PIXEL_INFO[b];
  if (!ia || !ib) return null;
  const now = new Date().toISOString().slice(0, 7);
  const left = (m: string) => { const y = updateYearsLeft(m, now) ?? 0; return y > 0 ? `約${y}年` : "終了"; };
  const rows = [
    { label: "販売開始", va: jaMonth(ia.available), vb: jaMonth(ib.available) },
    { label: "保証の年数", va: `${ia.updateYears}年`, vb: `${ib.updateYears}年` },
    { label: "保証の終わり", va: jaMonth(updateUntil(a)!), vb: jaMonth(updateUntil(b)!) },
    { label: "保証の残り", va: left(a), vb: left(b) },
  ];
  return (
    <section className="bg-white rounded-xl border border-line overflow-hidden mb-10">
      <h2 className="px-5 py-4 text-base font-bold text-ink bg-ground border-b border-line-soft">アップデート保証の違い</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-mute">
              <th className="text-left font-semibold pl-4 pr-2 sm:px-5 py-2"></th>
              <th className="text-left font-semibold px-2 sm:px-5 py-2">{a}</th>
              <th className="text-left font-semibold pl-2 pr-4 sm:px-5 py-2">{b}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const diff = r.va !== r.vb ? "font-bold text-ink" : "text-ink-mute";
              return (
                <tr key={r.label} className="border-t border-line-soft">
                  <td className="pl-4 pr-2 sm:px-5 py-2.5 font-bold text-ink-mute whitespace-nowrap">{r.label}</td>
                  <td className={`px-2 sm:px-5 py-2.5 ${diff}`}>{r.va}</td>
                  <td className={`pl-2 pr-4 sm:px-5 py-2.5 ${diff}`}>{r.vb}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 border-t border-line-soft text-xs text-ink-mute leading-relaxed">
        販売開始は米国 Google ストアの年月、保証の終わりはそれに保証の年数を足したものです。出典: Google「
        <a href="https://support.google.com/pixelphone/answer/4457705" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-800">Pixel のアップデート保証期間</a>」「
        <a href="https://support.google.com/pixelphone/answer/15738422" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-800">デバイスが利用可能になった時期</a>」
      </p>
    </section>
  );
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  const pair = slugToPair(slug);
  if (!pair) notFound();
  const [a, b] = pair;
  const [sa, sb, goodA, goodB] = await Promise.all([getModelStats(a), getModelStats(b), getGoodRankMin(a), getGoodRankMin(b)]);
  const path = comparePath(a, b);
  const sideA = { ...sa, goodMin: goodA };
  const sideB = { ...sb, goodMin: goodB };
  const faqs = buildCompareFaq(a, b, sideA, sideB);

  const storageRows = mergeRows(sa.byStorage, sb.byStorage, Number);
  const rankRows = mergeRows(sa.byRank, sb.byRank, (k) => (RANK_ORDER.indexOf(k) + 99) % 99);

  // 関連する比較（どちらかのモデルを含む別の組）
  const related = Array.from(
    new Map([...comparesFor(a), ...comparesFor(b)].map((p) => [compareSlug(...p), p])).values(),
  ).filter(([x, y]) => compareSlug(x, y) !== slug).slice(0, 8);

  // 冒頭の1文に付ける日付（2機種の在庫のうち新しいほうの更新時刻。機種ページの要約文と同じ書き方）
  const updated = [sa.lastUpdated, sb.lastUpdated].filter((d): d is Date => d !== null).sort((x, y) => y.getTime() - x.getTime())[0] ?? null;
  const updatedDate = updated?.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
  const hasDiffBox = specDiffs(a, b) !== null;
  // ページの更新日と要約（機種ページと同じ WebPage。AI の検索が日付と数字をそのまま取れるように。11/12〜）
  const webPageDesc = `${updated ? `${updatedDate}時点、` : ""}${verdict(a, b, sa, sb, !hasDiffBox)}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: `${a} と ${b} の比較`, item: `${SITE_URL}${path}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${a} と ${b} の比較（中古の相場）`,
      url: `${SITE_URL}${path}`,
      description: webPageDesc,
      ...(updated ? { dateModified: updated.toISOString() } : {}),
    },
  ];


  // 回線のタイル（PR）は2機種ともスマホのときだけ（iPad・MacBook・Apple Watch の比較には出さない）
  const bothPhones = [a, b].every((m) => !/^\s*(ipad|macbook|apple\s*watch)/i.test(m));

  const models = [
    { name: a, stats: sa },
    { name: b, stats: sb },
  ];

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="中古価格の比較" />

      <main className="max-w-[1360px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">{a} と {b} の比較</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-ink mb-3">
          {a} と {b} の違い<br className="md:hidden" /> 中古はどっちがお得？
        </h1>
        <DiffBox a={a} b={b} sa={sa} sb={sb} />
        {/* 表があるときは、選び方のひと言（違いで判断…）は表と重なるので省き、値段の1文だけにする（ファーストビューを文字で埋めない） */}
        <p className="text-ink-sub mb-3 leading-relaxed">
          {updated && <><time dateTime={updated.toISOString()}>{updatedDate}</time>時点、</>}
          {verdict(a, b, sa, sb, !hasDiffBox)}{pixelNote(a, b)}{hasDiffBox ? "" : galaxyNote(a, b)}
        </p>
        {!hasDiffBox && priceReadingSentence(a, b, sideA, sideB) && (
          <p className="text-ink-sub mb-4 leading-relaxed">{priceReadingSentence(a, b, sideA, sideB)}</p>
        )}
        <AdDisclosure compact />

        {/* 2モデルのサマリーを横に並べる */}
        <section className="grid grid-cols-2 gap-3 md:gap-6 my-6">
          {models.map(({ name, stats }) => (
            <div key={name} className="bg-white rounded-xl border border-line p-4 md:p-6">
              <h2 className="text-base md:text-2xl font-bold mb-3">
                <Link href={modelPagePath(name)} className="hover:text-brand-800">{name}</Link>
              </h2>
              <p className="text-xs font-bold text-ink-mute">中古の最安値</p>
              <p className="text-2xl md:text-3xl font-bold text-price tracking-tight whitespace-nowrap mb-3">
                {stats.minPrice !== null ? yen(stats.minPrice) : "在庫なし"}
              </p>
              <dl className="text-xs md:text-sm text-ink-sub space-y-1">
                <div className="flex justify-between gap-2"><dt className="min-w-0">{medianLabel(stats.medianStorage, name)}</dt><dd className="font-bold whitespace-nowrap">{stats.medianPrice !== null ? yen(stats.medianPrice) : "-"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="min-w-0">在庫数</dt><dd className="font-bold whitespace-nowrap">{stats.count.toLocaleString()}件</dd></div>
                <div className="flex justify-between gap-2"><dt className="min-w-0">取扱ショップ</dt><dd className="font-bold whitespace-nowrap">{stats.shopCount}店</dd></div>
              </dl>
              {badgesOf(name).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {badgesOf(name).map((badge) => (
                    <span key={badge} className="px-2 py-1 rounded-md text-[10px] md:text-xs font-semibold bg-ground text-ink-sub border border-line">{badge}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* 相場・在庫・ランクB以上の文は、表があるときはカードの下に（ファーストビューから外す・中身は残す） */}
        {hasDiffBox && priceReadingSentence(a, b, sideA, sideB) && (
          <p className="text-sm text-ink-sub mb-6 leading-relaxed">{priceReadingSentence(a, b, sideA, sideB)}</p>
        )}
        {bothPhones && <SimTile className="mb-6 md:max-w-2xl" />}

        <CompareTable title="容量別の最安値" rows={storageRows} labelOf={storageLabel} a={a} b={b} />
        <CompareTable title="状態ランク別の最安値" rows={rankRows} labelOf={(k) => `ランク ${k}`} a={a} b={b} />
        <p className="text-xs text-ink-mute mb-10">差額は「{b} − {a}」の最安値の差です。</p>

        <SpecTable a={a} b={b} />
        <PixelUpdateTable a={a} b={b} />

        {/* それぞれの最安の在庫 */}
        {models.map(({ name, stats }) => stats.cheapest.length > 0 && (
          <section key={name} className="mb-10">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-xl font-bold">いま一番安い{name}</h2>
              <Link href={modelPagePath(name)} className="text-sm font-bold text-brand-600 hover:underline underline-offset-4">
                {name}の価格まとめ &rarr;
              </Link>
            </div>
            <DeviceList>
              {stats.cheapest.slice(0, 3).map((d) => <DeviceCard key={d.id} device={d} showModel={false} />)}
            </DeviceList>
          </section>
        ))}

        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">{a} と {b} の比較でよくある質問</h2>
          <div className="bg-white rounded-xl border border-line divide-y divide-line-soft">
            {faqs.map((f) => (
              <div key={f.q} className="px-5 py-4">
                <h3 className="text-sm font-bold text-ink mb-1.5">{f.q}</h3>
                <p className="text-sm text-ink-sub leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <section className="mb-4">
            <h2 className="text-lg font-bold mb-3">ほかの比較</h2>
            <div className="flex flex-wrap gap-2">
              {related.map(([x, y]) => (
                <Link key={compareSlug(x, y)} href={comparePath(x, y)}
                  className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                  {x} vs {y}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
