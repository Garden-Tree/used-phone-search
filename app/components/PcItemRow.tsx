import { yen } from "@/lib/format";
import type { PcItem } from "@/lib/pcInventory"; // 型だけ（クライアントの束に prisma を入れない）

// 中古パソコンの1件（/pc）。リンク先（A8）はサーバーで作って渡す（ShopClickTracker が data-* を読んで GA4 に送る）
/** 「メモリ16GB・SSD 256GB」 */
function memoryStorage(p: Pick<PcItem, "memoryGB" | "storageGB" | "storageType">): string {
  const sto = p.storageGB >= 1000 ? `${p.storageGB / 1000}TB` : `${p.storageGB}GB`;
  return `メモリ${p.memoryGB}GB・${p.storageType} ${sto}`;
}

export type PcRowItem = PcItem & { href: string; linkType: string };

export default function PcItemRow({ p, first }: { p: PcRowItem; first: boolean }) {
  return (
    <a
      href={p.href}
      target="_blank"
      rel="sponsored noopener"
      className={`grid grid-cols-[1fr_auto] gap-x-4 px-4 py-3 hover:bg-ground items-center ${first ? "" : "border-t border-line-soft"}`}
      data-shop-click=""
      data-shop={p.shopName}
      data-model={p.productName}
      data-storage={p.storageGB}
      data-rank={p.conditionRank}
      data-price={p.price}
      data-link-type={p.linkType}
    >
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
    </a>
  );
}
