import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import { SHOPS, shopLabels } from "@/lib/shops";
import { SITE_NAME } from "@/lib/site";

// 運営者の一次情報を含むので、文面を変えるときは運営者の確認を取る
export const metadata: Metadata = {
  title: "このサイトについて（運営者・データの取り方・プライバシーポリシー）",
  description: `${SITE_NAME}の運営者、在庫データの取り方と更新時刻、店ごとの表記の違い、広告とプライバシーポリシーについて。`,
  alternates: { canonical: "/about" },
};

const BLOG_URL = "https://gadelog.com/";
const CONTACT_URL = "https://gadelog.com/%e3%81%8a%e5%95%8f%e3%81%84%e5%90%88%e3%82%8f%e3%81%9b/";
const X_URL = "https://x.com/Garden__Tree";

const BATTERY_TEXT: Record<(typeof SHOPS)[number]["battery"], string> = {
  exact: "最大容量の数値（85% など）",
  over80: "「80%以上」「80%未満」の区分のみ",
  none: "記載を取り込めていないため「-」（未使用品は 100%）",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className="text-xl font-bold mb-3 pb-2 border-b border-line-soft">{title}</h2>
      <div className="text-sm md:text-base text-ink-sub leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

const ext = "text-brand-600 font-bold hover:underline underline-offset-4";

export default function AboutPage() {
  return (
    <div className="min-h-screen text-ink">
      <SiteHeader label="このサイトについて" />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <nav aria-label="パンくずリスト" className="text-xs text-ink-mute mb-4">
          <Link href="/" className="hover:text-brand-800">トップ</Link>
          <span className="mx-2">›</span>
          <span className="text-ink-sub">このサイトについて</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold mb-6">このサイトについて</h1>

        <Section id="operator" title="運営者">
          <p>
            {SITE_NAME}は、ブログ「<a href={BLOG_URL} target="_blank" rel="noopener" className={ext}>ガデログ</a>」の管理人 GardenTree が運営しています。
            運営者は中古スマホ店で検品を担当しており、日々たくさんの中古 iPhone を見ています。
          </p>
          <p>
            「同じ機種なら、どの店のどの個体がいちばんお得か」を、店を1つずつ回らずに確かめられるように作りました。
            検品の経験から、状態ランクよりもバッテリー最大容量を重視して比べられるようにしています。
          </p>
          <p>
            X: <a href={X_URL} target="_blank" rel="noopener" className={ext}>@Garden__Tree</a>
          </p>
        </Section>

        <Section id="data" title="在庫データの取り方と更新">
          <p>{shopLabels()}の{SHOPS.length}店の在庫を、各店の公開ページと楽天市場の商品検索 API から自動で集めています。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>イオシス・にこスマ・エムモバ・ダイワンテレコム: 6時間ごと（日本時間 3時・9時・15時・21時ごろ）</li>
            <li>ゲオモバイル・じゃんぱら・ソフマップ（いずれも楽天市場店）: 6時間ごと（上の約20分前）</li>
          </ul>
          <p>
            価格や在庫は取得した時点のものです。売り切れや値下げが反映されるまで最大6時間ほどかかることがあるので、
            購入前に必ず各ショップのページで最新の情報を確認してください。
          </p>
          <p>機種ごとの最安値は毎日記録しており、機種ページの「最安値の推移」で見られます。</p>
        </Section>

        <Section id="notation" title="ショップごとの表記の違い">
          <p>状態ランク（S・A・B・C など）の基準は店ごとに異なります。ランクは各店の表記をそのまま載せています。</p>
          <p>バッテリー最大容量は、店によって載せ方が違います。</p>
          <div className="overflow-x-auto bg-white border border-line rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-ground text-ink-mute text-xs">
                <tr>
                  <th className="text-left font-semibold px-3 py-2">ショップ</th>
                  <th className="text-left font-semibold px-3 py-2">バッテリー最大容量</th>
                  <th className="text-left font-semibold px-3 py-2">iPad</th>
                  <th className="text-left font-semibold px-3 py-2">Pixel</th>
                  <th className="text-left font-semibold px-3 py-2">Galaxy</th>
                </tr>
              </thead>
              <tbody>
                {SHOPS.map((s) => (
                  <tr key={s.name} className="border-t border-line-soft">
                    <td className="px-3 py-2 font-bold whitespace-nowrap">{s.label}{s.note && <span className="block text-[10px] text-ink-mute">{s.note}</span>}</td>
                    <td className="px-3 py-2">{BATTERY_TEXT[s.battery]}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{s.ipad ? "あり" : "なし"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{s.pixel ? "あり" : "なし"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{s.galaxy ? "あり" : "なし"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>バッテリーで絞り込むと、数値の載っていない店の在庫は（未使用品を除いて）対象外になります。</p>
          <p className="pt-2">保証（故障・初期不良）と、ネットワーク利用制限（赤ロム）になった場合の扱いも店ごとに違います。各店の公式ページで確認した内容です（2026年9月28日時点）。</p>
          <div className="overflow-x-auto bg-white border border-line rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-ground text-ink-mute text-xs">
                <tr>
                  <th className="text-left font-semibold px-3 py-2">ショップ</th>
                  <th className="text-left font-semibold px-3 py-2">保証</th>
                  <th className="text-left font-semibold px-3 py-2">赤ロム</th>
                </tr>
              </thead>
              <tbody>
                {SHOPS.map((s) => (
                  <tr key={s.name} className="border-t border-line-soft">
                    <td className="px-3 py-2 font-bold whitespace-nowrap">
                      <a href={s.guaranteeUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-800">{s.label}</a>
                      {s.note && <span className="block text-[10px] text-ink-mute">{s.note}</span>}
                    </td>
                    <td className="px-3 py-2">{s.warranty}</td>
                    <td className="px-3 py-2">{s.redRom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>保証の条件（対象外になる場合など）は店ごとに細かく決まっています。購入前に各店のページ（店名のリンク）で確認してください。</p>
        </Section>

        <Section id="ads" title="広告について">
          <p>
            当サイトは A8.net・楽天アフィリエイトなどのアフィリエイトプログラムに参加しており、
            当サイトのリンクから商品が購入されると、運営者が報酬を受け取ることがあります。
          </p>
          <p>
            並び順は価格・バッテリーなどの条件だけで決めており、報酬の有無や金額で順番を変えることはありません。
            提携していないショップの在庫も同じように掲載しています。
          </p>
          <p>
            楽天市場の商品情報は{" "}
            <a href="https://webservice.rakuten.co.jp/" target="_blank" rel="noopener noreferrer" className={ext}>楽天ウェブサービス</a>
            {" "}を利用して取得しています。
          </p>
        </Section>

        <Section id="privacy" title="プライバシーポリシー">
          <p>当サイトには会員登録や入力フォームがなく、氏名やメールアドレスなどの個人情報を直接お預かりすることはありません。</p>
          <h3 className="font-bold text-ink pt-2">アクセス解析</h3>
          <p>
            当サイトは Google が提供するアクセス解析ツール「Google アナリティクス」を利用しています。
            Google アナリティクスはトラフィックデータの収集のために Cookie を使用します。このデータは匿名で収集されており、個人を特定するものではありません。
            Cookie はブラウザの設定で無効にでき、{" "}
            <a href="https://tools.google.com/dlpage/gaoptout?hl=ja" target="_blank" rel="noopener noreferrer" className={ext}>Google アナリティクス オプトアウト アドオン</a>
            {" "}でも収集を止められます。詳しくは{" "}
            <a href="https://marketingplatform.google.com/about/analytics/terms/jp/" target="_blank" rel="noopener noreferrer" className={ext}>Google アナリティクス利用規約</a>
            {" "}と{" "}
            <a href="https://policies.google.com/technologies/partner-sites?hl=ja" target="_blank" rel="noopener noreferrer" className={ext}>Google のポリシー</a>
            をご覧ください。
          </p>
          <h3 className="font-bold text-ink pt-2">アフィリエイト</h3>
          <p>
            ショップへのリンクから移動した際、成果の計測のために A8.net・楽天などの事業者が Cookie を使用することがあります。
            取得された情報は各事業者のプライバシーポリシーに従って取り扱われます。
          </p>
          <h3 className="font-bold text-ink pt-2">免責事項</h3>
          <p>
            掲載している価格・在庫・商品の状態は各ショップの情報をもとにしていますが、正確さや最新であることを保証するものではありません。
            商品の購入は各ショップとの取引となり、当サイトはその内容について責任を負いかねます。
          </p>
          <p>この方針は必要に応じて見直し、このページで更新します。</p>
        </Section>

        <Section id="contact" title="お問い合わせ">
          <p>
            掲載内容の誤り、掲載してほしいショップ・機種などは、ブログの{" "}
            <a href={CONTACT_URL} target="_blank" rel="noopener" className={ext}>お問い合わせフォーム</a>
            {" "}または X（<a href={X_URL} target="_blank" rel="noopener" className={ext}>@Garden__Tree</a>）からご連絡ください。
          </p>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
