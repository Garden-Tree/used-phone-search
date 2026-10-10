import Link from "next/link";
import type { Metadata } from "next";
import DeviceCard, { DeviceList } from "@/app/components/DeviceCard";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import AdDisclosure from "@/app/components/AdDisclosure";
import { modelPagePath } from "@/lib/catalog";
import { BUDGET_NAMES, budgetLabel, budgetPath, budgetsOf, type BudgetDevice } from "@/lib/budgets";
import { cheapestUnder, getBudgetModels } from "@/lib/budgetStats";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { yen } from "@/lib/format";
import { GALAXY_SHOPS, IPAD_SHOPS, PIXEL_SHOPS, SHOPS } from "@/lib/shops";
import { jaMonth, updateUntil } from "@/lib/pixelCatalog";
import { GALAXY_RELEASED } from "@/lib/galaxyCatalog";

/**
 * 予算別ページの中身（iPhone: app/budget/[slug]、iPad・Pixel・Galaxy: app/<種類>/budget/[slug]）。
 * 文言の違いは TEXT だけにまとめる。「対応」は iPhone・iPad は最新 OS の対応、Pixel は Google のアップデート保証が残っているか
 */
type DeviceText = {
  name: string;
  shops: number;
  /** 機種一覧のページ（パンくず・下のボタン）。iPhone は検索ページへ */
  hub?: { path: string; name: string; cta: string; ctaNote: string };
  /** 導入文の「〜でいちばん新しいのは」 */
  supportedLead: string;
  supportedNote: string;
  legacyTitle: string;
  legacyNote: string;
  /** 表の機種名の下に添える一言 */
  subOf?: (model: string) => string | undefined;
  /**
   * 発売の新しさで並べられるか。Galaxy は発売年月を公式で確かめていないので false
   * （「新しい順」「いちばん新しいのは」と書かず、シリーズ順に並べる）
   */
  byRelease?: false;
};

const TEXT: Record<BudgetDevice, DeviceText> = {
  iphone: {
    name: BUDGET_NAMES.iphone, shops: SHOPS.length,
    supportedLead: "最新の iOS 27 に対応した機種で",
    supportedNote: "iOS 27 対応。機種名から容量別・状態別の価格まとめへ",
    legacyTitle: "iOS 27 非対応の旧機種",
    legacyNote: "最新の iOS や一部のアプリが使えないため、メイン機には向きません（サブ機・撮影用など）",
  },
  ipad: {
    name: BUDGET_NAMES.ipad, shops: IPAD_SHOPS.length,
    hub: { path: "/ipad", name: "中古iPad", cta: "中古iPadの相場を機種別に見る", ctaNote: "機種ごとに相場（中央値）・最安値・在庫数を比較できます" },
    supportedLead: "最新の iPadOS 27 に対応した機種で",
    supportedNote: "iPadOS 27 対応。機種名から容量別・状態別の価格まとめへ",
    legacyTitle: "iPadOS 27 非対応の旧機種",
    legacyNote: "最新の iPadOS や一部のアプリが使えないため、長く使うには向きません",
  },
  pixel: {
    name: BUDGET_NAMES.pixel, shops: PIXEL_SHOPS.length,
    hub: { path: "/pixel", name: "中古Google Pixel", cta: "中古Pixelの相場を機種別に見る", ctaNote: "機種ごとに相場（中央値）・最安値・アップデート保証の期限を比較できます" },
    supportedLead: "Google のアップデート保証が残っている機種で",
    supportedNote: "アップデート保証が残っている機種。機種名から容量別・状態別の価格まとめへ",
    legacyTitle: "アップデート保証が終わった機種",
    legacyNote: "OS・セキュリティの更新が届かないため、長く使うには向きません",
    subOf: (model) => { const u = updateUntil(model); return u ? `保証 ${jaMonth(u)}まで` : undefined; },
  },
  galaxy: {
    name: BUDGET_NAMES.galaxy, shops: GALAXY_SHOPS.length,
    hub: { path: "/galaxy", name: "中古Galaxy", cta: "中古Galaxyの相場を機種別に見る", ctaNote: "機種ごとに相場（中央値）・最安値・在庫数を比較できます" },
    // 2022年以降の機種だけ載せている（Samsung は機種ごとの保証期間を出していないので、対応・非対応は分けない）
    supportedLead: "",
    supportedNote: "2022年以降の機種（日本での発売が新しい順）。機種名から容量別・状態別の価格まとめへ",
    legacyTitle: "",
    legacyNote: "",
    subOf: (model) => (GALAXY_RELEASED[model] ? `${jaMonth(GALAXY_RELEASED[model])}発売` : undefined),
  },
};

export async function budgetMetadata(max: number, device: BudgetDevice): Promise<Metadata> {
  const t = TEXT[device];
  const rows = await getBudgetModels(max, device);
  const newest = rows.find((r) => r.supported) ?? rows[0];
  const label = budgetLabel(max);
  const byRelease = t.byRelease !== false;
  const title = `${label}以下で買える${t.name}｜${byRelease ? "予算内でいちばん新しい機種" : "機種ごとの最安値"}【毎日更新】`;
  const description = newest
    ? `${label}以下で買える${t.name}は${rows.length}機種・${rows.reduce((n, r) => n + r.count, 0).toLocaleString()}件。${byRelease ? `いちばん新しいのは${newest.model}（${yen(newest.minPrice)}〜）。` : ""}大手中古ショップ${t.shops}社の在庫から機種ごとの最安値を比較。`
    : `${label}以下で買える${t.name}を大手中古ショップ${t.shops}社の在庫から探せます。`;
  const path = budgetPath(max, device);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, images: ["/opengraph-image"] },
    robots: rows.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export async function BudgetView({ max, device }: { max: number; device: BudgetDevice }) {
  const t = TEXT[device];
  const label = budgetLabel(max);
  const rows = await getBudgetModels(max, device);
  const supported = rows.filter((r) => r.supported);
  const legacy = rows.filter((r) => !r.supported);
  const totalCount = rows.reduce((n, r) => n + r.count, 0);

  // 予算内で買える新しい機種（最新 OS 対応・Pixel は保証が残っているもの）それぞれの最安の在庫
  const picks = (await Promise.all(supported.slice(0, 6).map((r) => cheapestUnder(r.model, max)))).filter(
    (d) => d !== null,
  );

  const path = budgetPath(max, device);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
      ...(t.hub ? [{ "@type": "ListItem", position: 2, name: t.hub.name, item: `${SITE_URL}${t.hub.path}` }] : []),
      { "@type": "ListItem", position: t.hub ? 3 : 2, name: `${label}以下の${t.name}`, item: `${SITE_URL}${path}` },
    ],
  };

  return (
    <div className="min-h-screen text-ink">
      <SiteHeader label="予算から探す" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <main className="max-w-[1120px] mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          {t.hub && (
            <>
              <Link href={t.hub.path} className="hover:text-brand-800">{t.hub.name}</Link>
              <span className="mx-2">›</span>
            </>
          )}
          <span className="text-ink-sub">{label}以下の{t.name}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">{label}以下で買える{t.name}</h1>
        <p className="text-ink-sub mb-4 leading-relaxed">
          {rows.length > 0 ? (
            <>
              {label}以下で買える{t.name}は <strong>{rows.length}機種・{totalCount.toLocaleString()}件</strong>
              （ジャンク品を除く）。
              {supported[0] && t.byRelease !== false && (
                <>
                  {t.supportedLead}いちばん新しいのは <strong>{supported[0].model}</strong>（{yen(supported[0].minPrice)}〜）です。
                </>
              )}
            </>
          ) : (
            <>いまは{label}以下の在庫がありません。</>
          )}
        </p>
        <AdDisclosure compact />

        {/* 予算の切り替え */}
        <div className="flex flex-wrap gap-2 my-6">
          {budgetsOf(device).map((b) => (
            <Link
              key={b}
              href={budgetPath(b, device)}
              className={`px-3.5 min-h-10 inline-flex items-center rounded-full text-sm font-bold border ${
                b === max
                  ? "bg-brand-800 text-white border-brand-800"
                  : "bg-white border-line text-ink-sub hover:border-brand-200 hover:text-brand-800"
              }`}
            >
              {budgetLabel(b)}以下
            </Link>
          ))}
        </div>

        {supported.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-1">{label}以下で買える機種（{t.byRelease === false ? "シリーズ順" : "新しい順"}）</h2>
            <p className="text-xs text-ink-mute mb-4">{t.supportedNote}</p>
            <div className="bg-white rounded-xl border border-line overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-3 bg-ground text-xs font-bold text-ink-mute">
                <span>機種</span>
                <span className="text-right">最安値</span>
                <span className="text-right w-16">在庫</span>
              </div>
              {supported.map((r) => (
                <Link
                  key={r.model}
                  href={modelPagePath(r.model)}
                  className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 py-3 border-t border-line-soft hover:bg-ground items-center"
                >
                  <span className="min-w-0">
                    <span className="block font-bold text-ink">{r.model} <span className="text-gray-300">›</span></span>
                    {t.subOf?.(r.model) && <span className="block text-[11px] text-ink-mute">{t.subOf(r.model)}</span>}
                  </span>
                  <span className="text-right font-bold text-price">{yen(r.minPrice)}</span>
                  <span className="text-right w-16 text-sm text-ink-mute">{r.count.toLocaleString()}件</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {picks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-1">{t.byRelease === false ? "機種ごとの最安在庫" : "新しい機種の最安在庫"}</h2>
            <p className="text-xs text-ink-mute mb-4">上の表の{t.byRelease === false ? "上から6機種の" : "新しい機種から、"}それぞれいちばん安い在庫</p>
            <DeviceList>
              {picks.map((d) => <DeviceCard key={d.id} device={d} />)}
            </DeviceList>
          </section>
        )}

        {legacy.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-1">{t.legacyTitle}</h2>
            <p className="text-xs text-ink-mute mb-3">{t.legacyNote}</p>
            <div className="flex flex-wrap gap-2">
              {legacy.map((r) => (
                <Link key={r.model} href={modelPagePath(r.model)}
                  className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                  {r.model} <span className="font-bold text-price">{yen(r.minPrice)}〜</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 同じ予算のほかの種類（「中古スマホ 2万円以下」のように種類を決めずに探す人向け）。その種類に同じ予算がなければ、すぐ上の予算 */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-3">同じ予算でほかの種類も見る</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BUDGET_NAMES) as BudgetDevice[]).filter((d) => d !== device).map((d) => {
              const b = budgetsOf(d).find((x) => x >= max) ?? budgetsOf(d)[budgetsOf(d).length - 1];
              return (
                <Link key={d} href={budgetPath(b, d)}
                  className="px-3.5 min-h-10 inline-flex items-center rounded-full text-sm bg-white border border-line text-ink-sub hover:border-brand-200 hover:text-brand-800">
                  {budgetLabel(b)}以下の{BUDGET_NAMES[d]}
                </Link>
              );
            })}
          </div>
        </section>

        <div className="text-center mb-4">
          {/* 検索ページは機種の指定がないと iPhone だけの一覧になるので、iPad・Pixel は機種一覧へ */}
          <Link
            href={t.hub ? t.hub.path : `/search?${new URLSearchParams({ maxPrice: String(max) }).toString()}`}
            className="inline-flex items-center px-8 h-12 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-800"
          >
            {t.hub ? t.hub.cta : `${label}以下の在庫をすべて見る`} &rarr;
          </Link>
          <p className="text-xs text-ink-mute mt-3">
            {t.hub ? t.hub.ctaNote : "容量・状態ランク・バッテリー残量で絞り込めます"}
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
