// ステマ規制（景品表示法・2023年10月施行）対応の広告表記
export default function AdDisclosure({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-slate-400">
        <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">PR</span>
        本ページはアフィリエイト広告を利用しています。
      </p>
    );
  }

  return (
    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
      ※ 当サイトはアフィリエイト広告（A8.net 等）を利用しており、リンク経由で商品が購入された場合に報酬を受け取ることがあります。
      <br className="hidden md:block" />
      価格・在庫状況は取得時点のものです。最新情報は各ショップのページでご確認ください。
      <br />
      {/* 楽天ウェブサービス利用規約に基づくクレジット表記 */}
      <a href="https://webservice.rakuten.co.jp/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-blue-600">
        Supported by Rakuten Developers
      </a>
    </p>
  );
}
