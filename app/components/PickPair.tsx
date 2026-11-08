import { batteryLabel, rankStyle, shopLabel, shopLinkProps, type Device } from '@/app/components/DeviceCard';
import { findShop } from '@/lib/shops';
import { affiliateUrl, isAffiliateUrl } from '@/lib/affiliate';
import { BUILD_TIME } from '@/lib/buildTime';
import { storageLabel } from '@/lib/format';

/**
 * 条件つきの1台を2行で1つのカードに（11/8〜）。「電池85%以上で最安」（good）と「保証1年で最安」（year）。
 * それまでは別々の枠で、下に置いた保証1年の枠は機種ページで1週0クリック・/search で103中2クリックだった。
 * 同じ商品なら1行にして見出しを2つ並べる（placement は good の方）。
 * placement はそれぞれ今までと同じ値（機種ページ good_pick／warranty_pick、/search good_pick_search／warranty_pick_search）。
 * 置き場所の白い入れ物（DeviceList）は呼ぶ側で用意する。
 */
type Pick = { device: Device; label: string; placement: string };

export default function PickPair({ good, year, showModel = false, baseline = null }: {
  good: Pick | null;
  year: Pick | null;
  showModel?: boolean;
  /** 差額の基準（いちばん安い在庫の価格）。あれば「最安 +N円」を添える */
  baseline?: number | null;
}) {
  const rows: { device: Device; labels: string[]; placement: string }[] = [];
  if (good) rows.push({ device: good.device, labels: [good.label], placement: good.placement });
  if (year) {
    if (good && good.device.id === year.device.id) rows[0].labels.push(year.label);
    else rows.push({ device: year.device, labels: [year.label], placement: year.placement });
  }
  return (
    <>
      {rows.map((r) => {
        const d = r.device;
        const shop = findShop(d.shopName);
        const bat = batteryLabel(d);
        const mac = /^MacBook/.test(d.modelName);
        const watch = /^Apple Watch/.test(d.modelName);
        const modelName = d.modelName.replace(/iPhone(\d+)/i, 'iPhone $1');
        const spec = `${showModel ? `${modelName} ` : ''}${mac || watch ? storageLabel(d.storage, d.modelName) : `${d.storage}GB`}・${d.color}`;
        const pr = isAffiliateUrl(affiliateUrl(d.shopName, d.url));
        return (
          <a key={r.placement} {...shopLinkProps(d)} data-placement={r.placement}
            className="flex gap-2.5 px-3.5 py-3 text-ink border-b border-line-soft hover:bg-ground focus-visible:bg-ground">
            <span className={`shrink-0 w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[13px] font-bold ${rankStyle(d.conditionRank)}`}
              aria-label={`ランク${d.conditionRank}`}>
              {d.conditionRank}
            </span>
            <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
              <span className="flex justify-between items-baseline gap-2">
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] font-bold text-safe min-w-0">
                  {r.labels.map((l, i) => <span key={l} className="whitespace-nowrap">{i > 0 ? '・' : ''}{l}</span>)}
                  {pr && <span className="text-[10px] font-normal text-ink-mute border border-line rounded px-1 py-px leading-none">PR</span>}
                </span>
                <span className="text-[17px] font-bold text-price whitespace-nowrap tabular-nums">{d.price.toLocaleString()}円</span>
              </span>
              <span className="flex justify-between items-baseline gap-2 text-xs text-gray-700">
                <span className="min-w-0">
                  {spec}
                  {bat && <> ・ <span className={`font-bold ${bat.low ? 'text-warn' : 'text-safe'}`}>電池 {bat.text}</span></>}
                </span>
                {baseline !== null && d.price > baseline && (
                  <span className="text-[11px] text-ink-mute whitespace-nowrap tabular-nums">最安 +{(d.price - baseline).toLocaleString()}円</span>
                )}
              </span>
              <span className="flex justify-between items-baseline gap-2 text-[11px] text-ink-mute">
                <span className="min-w-0">
                  {shopLabel(d.shopName)}
                  {shop && <> ・ <span className={shop.yearWarranty ? 'font-bold text-safe' : ''}>{shop.warrantyShort}</span></>}
                </span>
                <span className="text-xs font-bold text-brand-600 whitespace-nowrap">店へ ›</span>
              </span>
              {/* Amazon の価格は取得時点を添える（Creators API の規約。DeviceCard と同じ） */}
              {shop?.marketplace === 'amazon' && <span className="text-[11px] text-ink-mute">価格は {BUILD_TIME} 時点</span>}
            </span>
          </a>
        );
      })}
    </>
  );
}
