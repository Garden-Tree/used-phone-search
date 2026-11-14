import { rakutenSearchAffiliateUrl } from '@/lib/affiliate';

/**
 * 充電器が付かない時計（札「充電ケーブルなし」「充電ホルダーなし」。lib/watchCatalog.ts の missingCharger）が在庫にあるときに添える1行（2026-11-13〜）。
 * 「充電器は別に必要です」と、楽天市場の検索結果へのリンク（楽天アフィリエイト。楽天API で取った商品のまわりなので楽天市場だけ）。
 * クリックは shop_click（placement=charger・shop_name=楽天市場（充電器））。
 * model: 機種名（"Samsung Galaxy Watch7"）か、機種が決まらないときは種類（"Galaxy Watch"・"Pixel Watch"）
 */
export function chargerKeyword(model: string): string {
  // 検索語は店での呼び名（頭のメーカー名と年のかっこを外す）＋「充電器」。世代ごとに形が違うので機種名まで入れる
  return `${model.replace(/^(?:Samsung|Google)\s+/, '').replace(/\s*[(（]\d{4}[)）]/, '')} 充電器`;
}

export default function ChargerNote({ model, count, className = '' }: { model: string; count?: number; className?: string }) {
  const keyword = chargerKeyword(model);
  return (
    <p data-placement="charger" className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 px-3.5 py-2.5 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl text-xs text-ink ${className}`}>
      <span>
        札に<b className="text-[#9A3412]">「充電ケーブルなし」「充電ホルダーなし」</b>とある品{count ? `（${count.toLocaleString()}件）` : ''}は、充電器が付きません。別に必要です。
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[10px] text-ink-mute border border-line rounded px-1 py-px leading-none bg-white">PR</span>
        <a href={rakutenSearchAffiliateUrl(keyword)} target="_blank" rel="sponsored noopener noreferrer"
          data-shop-click="" data-shop="楽天市場（充電器）" data-model={model} data-link-type="rakuten"
          className="font-bold text-brand-600 hover:text-brand-800 underline underline-offset-2">
          楽天で「{keyword}」を探す ›
        </a>
      </span>
    </p>
  );
}
