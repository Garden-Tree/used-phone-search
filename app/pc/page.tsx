import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { affiliateLinkType, affiliateUrl } from "@/lib/affiliate";
import { yen } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { bestWithin, cpuMemoryMatrix, getPcItems, pcBudgetPath, PC_BUDGETS, PC_MIN_INDEX_ITEMS, pcShopLabels, type PcItem } from "@/lib/pcInventory";
import PcItemRow, { type PcRowItem } from "@/app/components/PcItemRow";
import PcItemList from "@/app/components/PcItemList";
import PcPriceMatrix from "@/app/components/PcPriceMatrix";
import { getMacMatrix } from "@/lib/pcMac";

// 中古パソコン（Windows のノート・デスクトップ）の最安値・相場（2026-10-27〜）。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static";

const TITLE = "中古パソコン（Windows・MacBook）の最安値・相場を条件別に比較【毎日更新】";
const DESCRIPTION =
  "中古のWindowsノートパソコン・デスクトップとMacBookを、CPU（機種）・メモリ・SSD・状態ランクで比較。予算3万・5万・8万円で選べる条件と、条件別の相場（中央値）を毎日更新。";

export async function generateMetadata(): Promise<Metadata> {
  const items = await getPcItems();
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: "/pc" },
    openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: "/pc" },
    ...(items.length < PC_MIN_INDEX_ITEMS ? { robots: { index: false, follow: true } } : {}),
  };
}

const RANK_NOTE: Record<string, string> = { S: "未使用に近い", A: "美品", B: "良品", C: "並品", J: "訳あり" };

// リンク先（A8）はここで作って、一覧（クライアント）には出来上がった URL だけ渡す
const withLink = (p: PcItem): PcRowItem => {
  const href = affiliateUrl(p.shopName, p.url);
  return { ...p, href, linkType: affiliateLinkType(href) };
};

export default async function PcIndexPage() {
  const items = await getPcItems();
  const notes = items.filter((p) => p.formFactor === "note");
  const desktops = items.filter((p) => p.formFactor === "desktop");
  const noteMatrix = cpuMemoryMatrix(items, "note");
  const deskMatrix = cpuMemoryMatrix(items, "desktop");
  const macMatrix = await getMacMatrix();
  const macCount = macMatrix.rows.reduce((n, r) => n + r.count, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "中古パソコンの最安値・相場", item: `${SITE_URL}/pc` },
    ],
  };

  return (
    <div className="min-h-screen text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader label="パソコン" />

      <main className="max-w-[1360px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">中古パソコン</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">中古パソコン（Windows・MacBook）の最安値・相場</h1>
        {items.length === 0 ? (
          <p className="text-ink-sub mb-4">在庫の取り込みを準備しています。</p>
        ) : (
          <p className="text-ink-sub mb-4 leading-relaxed">
            中古ショップ（{pcShopLabels(items).join("・")}）のWindowsパソコン <strong>{items.length.toLocaleString()}件</strong>
            （ノート {notes.length.toLocaleString()}件・デスクトップ {desktops.length.toLocaleString()}件）を、CPU・メモリ・SSD・状態で比べています。
            {macCount > 0 && <>MacBook <strong>{macCount.toLocaleString()}件</strong> の相場も下にまとめています。</>}
          </p>
        )}
        <p className="text-sm text-ink-mute mb-4 leading-relaxed">
          Windows 10 のサポートは終わっています。いま買うなら、Windows 11 に対応する CPU（Intel 第8世代以降・Core Ultra・AMD Ryzen 2000 以降）を選びましょう
          （Microsoft「<a href="https://learn.microsoft.com/ja-jp/windows-hardware/design/minimum/supported/windows-11-supported-intel-processors" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-800">Windows 11 でサポートされている Intel プロセッサ</a>」）。
          メモリは8GBあれば事務・ネットは足ります。複数のアプリを開くなら16GBが安心です。
        </p>
        <AdDisclosure compact />

        {notes.length > 0 && (
          <section className="my-8">
            <h2 className="text-xl font-bold mb-1">予算別：いちばん条件のいいノートパソコン</h2>
            <p className="text-xs text-ink-mute mb-3">Windows 11 対応・訳あり品を除いて、CPU の新しさ→メモリ→SSD の順に並べた上位3件です。</p>
            <div className="grid md:grid-cols-3 gap-4">
              {PC_BUDGETS.map((budget) => {
                const best = bestWithin(items, "note", budget, 3);
                return (
                  <div key={budget} className="bg-white rounded-xl border border-line overflow-hidden">
                    <h3 className="bg-ground text-sm">
                      <Link href={pcBudgetPath(budget)} className="flex justify-between px-4 py-2 font-bold hover:text-brand-800">
                        <span>{yen(budget)}以内</span>
                        <span className="text-xs font-normal text-brand-600">もっと見る ›</span>
                      </Link>
                    </h3>
                    {best.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-ink-mute">いまは在庫がありません</p>
                    ) : (
                      best.map((p, i) => <PcItemRow key={p.url} p={withLink(p)} first={i === 0} />)
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {[
          { title: "条件別の相場（ノート）", m: noteMatrix },
          { title: "条件別の相場（デスクトップ）", m: deskMatrix },
        ].map(({ title, m }) =>
          m.rows.length === 0 ? null : (
            <section key={title} className="my-8">
              <h2 className="text-xl font-bold mb-1">{title}</h2>
              <p className="text-xs text-ink-mute mb-3">縦が CPU、横がメモリ。マスの大きい数字は相場（中央値）です。在庫が3件以上ある CPU だけ・訳あり品は除いています。</p>
              <PcPriceMatrix m={m} />
            </section>
          ),
        )}

        {macMatrix.rows.length > 0 && (
          <section className="my-8">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="text-xl font-bold">MacBook の相場（機種 × メモリ）</h2>
              <Link href="/mac" className="text-xs text-brand-600 hover:text-brand-800">MacBook の一覧 ›</Link>
            </div>
            <p className="text-xs text-ink-mute mb-3">中古MacBook（Apple シリコン）の在庫から。機種名から、店ごとの在庫と最安値へ進めます。</p>
            <PcPriceMatrix m={macMatrix} head="機種 ＼ メモリ" />
          </section>
        )}

        {[
          { title: "ノートパソコンの在庫（安い順）", list: notes },
          { title: "デスクトップパソコンの在庫（安い順）", list: desktops },
        ].map(({ title, list }) =>
          list.length === 0 ? null : (
            <section key={title} className="my-8">
              <h2 className="text-xl font-bold mb-3">{title}</h2>
              <PcItemList items={list.map(withLink)} />
            </section>
          ),
        )}

        <div className="text-xs text-ink-mute leading-relaxed space-y-1">
          <p>
            状態ランクは店ごとの基準です（{Object.entries(RANK_NOTE).map(([k, v]) => `${k}＝${v}`).join("・")}の目安にそろえ、店の表記を添えています）。
            訳あり品は動作に不具合がある場合があり、保証がつかないことがあります。
          </p>
          <p>価格は税込・取得時点のものです。在庫・保証・付属品は各店のページでご確認ください。</p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
