import React from 'react';
import { affiliateLinkType, affiliateUrl, isAffiliateUrl, rakutenAffiliateUrl, yahooAffiliateUrl } from '@/lib/affiliate';
import { findShop } from '@/lib/shops';
import { YAHOO_MCOM } from '@/lib/yahooMcom';
import { BUILD_TIME } from '@/lib/buildTime';

// Define the type for the device object
export type Device = {
  id: string;
  manufacturer: string;
  modelName: string;
  storage: number;
  color: string;
  conditionRank: string;
  batteryHealth: number | null;
  networkStatus: string | null;
  simUnlocked: boolean;
  carrier: string | null;
  shopName: string;
  price: number;
  url: string;
  isSoldOut: boolean;
  /** 同じ商品をモール店（楽天・Yahoo!ショッピング）でも売っているときの価格・商品URL（イオシス・エムモバ。scripts/link-duplicate-shops.ts） */
  altPrice?: number | null;
  altUrl?: string | null;
};

/** 在庫の行を縦に積む白い角丸の入れ物（区切り線つき）。docs/design.md「在庫の行」 */
export function DeviceList({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-line rounded-xl overflow-hidden">{children}</div>;
}

// ランクの四角。必ず文字付き（色だけに頼らない）
const RANK_STYLES: Record<string, string> = {
  S: 'bg-[#FEF3C7] text-[#92400E]',
  A: 'bg-[#DCFCE7] text-[#166534]',
  B: 'bg-[#DBEAFE] text-[#1E40AF]',
  C: 'bg-[#FFEDD5] text-[#9A3412]',
};
const rankStyle = (rank: string) => RANK_STYLES[rank.toUpperCase()] ?? 'bg-gray-100 text-gray-600';

/** キャリア・SIMロック状態の文言（行の2行目に出す） */
function simLabel(device: Device): string {
  const carrier = device.carrier;
  // iPad の Wi-Fi モデル（SIM を使わない）
  if (carrier === 'Wi-Fiモデル') return 'Wi-Fiモデル';
  // Apple直販 / 国内版SIMフリー
  if (carrier === '国内版SIMフリー' || carrier === 'Apple') return 'SIMフリー（Apple版）';
  const hasCarrier = carrier && carrier !== '不明';
  // 「版」が既に含まれているかチェック
  const carrierName = hasCarrier ? (carrier.endsWith('版') ? carrier : `${carrier}版`) : '';
  return device.simUnlocked
    ? hasCarrier ? `SIMフリー（${carrierName}）` : 'SIMフリー'
    : hasCarrier ? `SIMロック（${carrierName}）` : 'SIMロックあり';
}

/** 電池の文言と、80%未満かどうか（赤系の文字にする） */
function batteryLabel(device: Device): { text: string; low: boolean } | null {
  const h = device.batteryHealth;
  if (h === null) return null;
  if (h === 100) return { text: '100%', low: false };
  if (findShop(device.shopName)?.battery === 'over80') {
    return h >= 80 ? { text: '80%以上', low: false } : { text: '80%未満', low: true };
  }
  return { text: `${h}%`, low: h < 80 };
}

/**
 * 在庫の1行（約90px）。左にランクの四角、右に3行（容量・色／価格、電池・SIM・利用制限、店名／保証の短いタグ）。
 * 同じ商品をモール店でも売っているときは、行の下に「楽天市場でも販売」の帯を付ける。
 * showModel: 機種名を1行目の頭に出す（機種が混ざる一覧用。1機種だけの一覧では false）
 */
export default function DeviceCard({ device, showModel = true }: { device: Device; showModel?: boolean }) {
  const href = affiliateUrl(device.shopName, device.url);
  const rel = isAffiliateUrl(href) ? 'sponsored noopener noreferrer' : 'noopener noreferrer';
  const shop = findShop(device.shopName);
  const bat = batteryLabel(device);
  const modelName = device.modelName.replace(/iPhone(\d+)/i, 'iPhone $1');
  const spec = `${showModel ? `${modelName} ` : ''}${device.storage}GB・${device.color}`;
  const showNetwork = !!device.networkStatus && device.networkStatus !== '不明' && device.networkStatus !== '-';
  const tag = shop ? `${shop.warrantyShort}・${shop.redRomShort}` : '';
  const sold = device.isSoldOut;

  // 同じ商品のモール店のリンク。売り場は URL のホストで見分ける（楽天: イオシス、Yahoo!ショッピング: エムモバ）。知らないホストは出さない
  const alt = device.altPrice && device.altUrl && !sold ? altChannel(device.shopName, device.altUrl) : null;

  // リンクの入れ子はできないので、本体のリンクと「でも販売」の帯は兄弟として並べる
  return (
    <div className={`border-b border-line-soft last:border-b-0 ${sold ? 'opacity-60' : ''}`}>
      <a
        href={sold ? '#' : href}
        target={sold ? '_self' : '_blank'}
        rel={rel}
        // ShopClickTracker が読んで GA4 の shop_click イベントに載せる（どの店・機種・価格の行が押されたか）
        data-shop-click={sold ? undefined : ''}
        data-shop={device.shopName}
        data-model={device.modelName}
        data-storage={device.storage}
        data-rank={device.conditionRank}
        data-price={device.price}
        data-link-type={affiliateLinkType(href)}
        className={`flex gap-2.5 px-3.5 py-3 text-ink hover:bg-ground focus-visible:bg-ground ${sold ? 'cursor-not-allowed' : ''}`}
      >
        <span
          className={`shrink-0 w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[13px] font-bold ${rankStyle(device.conditionRank)}`}
          aria-label={`ランク${device.conditionRank}`}
        >
          {device.conditionRank}
        </span>
        <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span className="flex justify-between items-baseline gap-2">
            <span className="text-sm font-bold min-w-0">{spec}</span>
            <span className="text-[17px] font-bold text-price whitespace-nowrap">
              {sold ? <span className="text-xs text-ink-mute font-bold">売り切れ</span> : `${device.price.toLocaleString()}円`}
            </span>
          </span>
          <span className="text-xs text-gray-700">
            {bat ? (
              <span className={`font-bold ${bat.low ? 'text-warn' : 'text-safe'}`}>電池 {bat.text}</span>
            ) : (
              <span className="text-ink-mute">電池 -</span>
            )}
            {' ・ '}
            {simLabel(device)}
            {showNetwork && ` ・ 利用制限 ${device.networkStatus}`}
          </span>
          <span className="flex justify-between gap-2 text-[11px] text-ink-mute">
            <span className="min-w-0 break-words">{shopLabel(device.shopName)}</span>
            <span className="text-right shrink-0 max-w-[55%]">{tag}</span>
          </span>
          {/* Amazon の価格は取得時点を添える（Creators API の規約。時刻はサイトを書き出した時刻） */}
          {shop?.marketplace === 'amazon' && <span className="text-[11px] text-ink-mute">価格は {BUILD_TIME} 時点</span>}
        </span>
      </a>
      {alt && (
        <a
          href={alt.href}
          target="_blank"
          rel="sponsored noopener noreferrer"
          data-shop-click=""
          data-shop={alt.shop}
          data-model={device.modelName}
          data-storage={device.storage}
          data-rank={device.conditionRank}
          data-price={device.altPrice ?? undefined}
          data-link-type={affiliateLinkType(alt.href)}
          className="flex justify-between gap-2 -mt-1 mb-2.5 ml-[54px] mr-3.5 px-2.5 py-1.5 bg-ground rounded-lg text-xs text-gray-700 hover:text-brand-800"
        >
          <span>{alt.label}</span>
          <span className="whitespace-nowrap">{device.altPrice!.toLocaleString()}円 ›</span>
        </a>
      )}
    </div>
  );
}

/** 公式の行に添える、同じ商品のモール店のリンク。楽天（イオシス）・Yahoo!ショッピング（エムモバ→エムコム）。知らないホストは null */
/** 行に出す店名。モール店は「モバステ（Yahoo!）」のように短くする（スマホで2行に折り返さないように） */
function shopLabel(shopName: string): string {
  const s = findShop(shopName);
  if (!s || !s.note || s.marketplace === 'amazon') return s?.label ?? shopName;
  const note = s.marketplace === 'rakuten' ? '楽天' : s.marketplace === 'yahoo' ? 'Yahoo!' : s.note;
  return `${s.label}（${note}）`;
}

function altChannel(shopName: string, altUrl: string): { href: string; label: string; shop: string } | null {
  let host: string;
  try {
    host = new URL(altUrl).hostname;
  } catch {
    return null;
  }
  if (host === 'item.rakuten.co.jp') {
    return { href: rakutenAffiliateUrl(altUrl), label: '楽天市場でも販売（ポイント付き）', shop: `${shopName}（楽天市場店）` };
  }
  if (host === 'store.shopping.yahoo.co.jp') {
    return { href: yahooAffiliateUrl(altUrl), label: 'Yahoo!ショッピングでも販売（ポイント付き）', shop: YAHOO_MCOM };
  }
  return null;
}

// アフィリエイトリンクの生成ヘルパー
