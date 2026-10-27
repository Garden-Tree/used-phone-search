import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { affiliateLinkType, affiliateUrl } from "@/lib/affiliate";
import { yen } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { bestWithin, getPcItems, groupStats, memoryStorage, PC_MIN_INDEX_ITEMS, PC_SHOPS, type PcItem } from "@/lib/pcInventory";

// 中古パソコン（Windows のノート・デスクトップ）の最安値・相場（2026-10-27〜）。在庫はビルド（1日4回）のたびに更新
export const dynamic = "force-static";

const TITLE = "中古パソコン（Windows）の最安値・相場を条件別に比較【毎日更新】";
const DESCRIPTION =
  "中古のWindowsノートパソコン・デスクトップを、CPU・メモリ・SSD・状態ランクで比較。予算3万・5万・8万円で選べる条件と、条件別の相場（中央値）を専門店の在庫から毎日更新。";

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

const BUDGETS = [30000, 50000, 80000];
const RANK_NOTE: Record<string, string> = { S: "未使用に近い", A: "美品", B: "良品", C: "並品", J: "訳あり" };

function ShopLink({ p, children, className }: { p: PcItem; children: React.ReactNode; className?: string }) {
  const href = affiliateUrl(p.shopName, p.url);
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener"
      className={className}
      data-shop-click=""
      data-shop={p.shopName}
      data-model={p.productName}
      data-storage={p.storageGB}
      data-rank={p.conditionRank}
      data-price={p.price}
      data-link-type={affiliateLinkType(href)}
    >
      {children}
    </a>
  );
}

function ItemRow({ p, first }: { p: PcItem; first: boolean }) {
  return (
    <ShopLink p={p} className={`grid grid-cols-[1fr_auto] gap-x-4 px-4 py-3 hover:bg-ground items-center ${first ? "" : "border-t border-line-soft"}`}>
      <span className="min-w-0">
        <span className="block font-bold text-ink text-sm">{p.productName}</span>
        <span className="block text-xs text-ink-sub">
          {p.cpu}・{memoryStorage(p)}
          {p.screenInch ? `・${p.screenInch}インチ` : ""}
          {p.gpu ? `・${p.gpu}` : ""}
        </span>
        <span className="block text-[11px] text-ink-mute">
          {p.shopName}・ランク {p.rankLabel}
          {!p.win11 && <span className="ml-1 text-inspect-700">Windows 11 非対応のCPU</span>}
        </span>
      </span>
      <span className="text-right">
        <span className="block font-bold text-price">{yen(p.price)}</span>
        <span className="block text-[10px] text-ink-mute">税込・店で見る ›</span>
      </span>
    </ShopLink>
  );
}

export default async function PcIndexPage() {
  const items = await getPcItems();
  const notes = items.filter((p) => p.formFactor === "note");
  const desktops = items.filter((p) => p.formFactor === "desktop");
  const noteStats = groupStats(items, "note");

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

        <h1 className="text-2xl md:text-3xl font-bold mb-3">中古パソコン（Windows）の最安値・相場</h1>
        {items.length === 0 ? (
          <p className="text-ink-sub mb-4">在庫の取り込みを準備しています。</p>
        ) : (
          <p className="text-ink-sub mb-4 leading-relaxed">
            中古パソコン専門店（{PC_SHOPS.join("・")}）のWindowsパソコン <strong>{items.length.toLocaleString()}件</strong>
            （ノート {notes.length.toLocaleString()}件・デスクトップ {desktops.length.toLocaleString()}件）を、CPU・メモリ・SSD・状態で比べています。
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
              {BUDGETS.map((budget) => {
                const best = bestWithin(items, "note", budget, 3);
                return (
                  <div key={budget} className="bg-white rounded-xl border border-line overflow-hidden">
                    <h3 className="px-4 py-2 font-bold bg-ground text-sm">{yen(budget)}以内</h3>
                    {best.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-ink-mute">いまは在庫がありません</p>
                    ) : (
                      best.map((p, i) => <ItemRow key={p.url} p={p} first={i === 0} />)
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {noteStats.length > 0 && (
          <section className="my-8">
            <h2 className="text-xl font-bold mb-1">条件別の相場（ノート）</h2>
            <p className="text-xs text-ink-mute mb-3">同じ CPU・メモリの在庫が3件以上ある条件だけ。訳あり品は除いています。</p>
            <div className="bg-white rounded-xl border border-line overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ground text-xs text-ink-mute">
                  <tr>
                    <th className="text-left px-4 py-2 font-normal">CPU・メモリ</th>
                    <th className="text-right px-4 py-2 font-normal">相場（中央値）</th>
                    <th className="text-right px-4 py-2 font-normal">最安値</th>
                    <th className="text-right px-4 py-2 font-normal">件数</th>
                  </tr>
                </thead>
                <tbody>
                  {noteStats.map((s) => (
                    <tr key={s.label} className="border-t border-line-soft">
                      <td className="px-4 py-2">{s.label}</td>
                      <td className="px-4 py-2 text-right font-bold tabular-nums">{yen(s.medianPrice)}</td>
                      <td className="px-4 py-2 text-right font-bold text-price tabular-nums">{yen(s.minPrice)}</td>
                      <td className="px-4 py-2 text-right text-ink-mute tabular-nums">{s.count}件</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {[
          { title: "ノートパソコンの在庫（安い順）", list: notes },
          { title: "デスクトップパソコンの在庫（安い順）", list: desktops },
        ].map(({ title, list }) =>
          list.length === 0 ? null : (
            <section key={title} className="my-8">
              <h2 className="text-xl font-bold mb-3">{title}</h2>
              <div className="bg-white rounded-xl border border-line overflow-hidden">
                {list.map((p, i) => <ItemRow key={p.url} p={p} first={i === 0} />)}
              </div>
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
