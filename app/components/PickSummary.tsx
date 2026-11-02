import type { Device } from "@/app/components/DeviceCard";
import { findShop } from "@/lib/shops";
import { storageLabel } from "@/lib/format";

type Row = { label: string; device: Device; href?: string };

/**
 * 機種ページの「安い在庫」の上に置く、条件ごとの最安の3行（2026-11-01〜・ユーザーが C 案を選んだ）。
 * どれでも → ランクB以上・電池85%以上 → ＋保証1年の店 と条件を上げると、いちばん安い1台からいくら足すかを並べる。
 * 行を押すと、その在庫の行（下の一覧の #pick-good・#pick-year）へ動く。在庫の行が一覧の5件にあるときはリンクなし
 */
export default function PickSummary({ rows }: { rows: Row[] }) {
  const base = rows[0].device.price;
  // 3行とも同じ容量なら見出しに1回だけ書く（スマホの幅に収める）
  const first = rows[0].device;
  const sameStorage = rows.every((r) => r.device.storage === first.storage);
  return (
    <div className="bg-white border border-line rounded-xl px-3.5 pt-2.5 pb-1">
      <p className="text-[11px] text-ink-mute">条件ごとの最安{sameStorage ? `（${storageLabel(first.storage, first.modelName)}）` : ""}</p>
      {rows.map((r, i) => {
        const d = r.device;
        const shop = findShop(d.shopName);
        const meta = [shop?.label ?? d.shopName, sameStorage ? null : storageLabel(d.storage, d.modelName), `ランク${d.conditionRank.toUpperCase()}`, d.batteryHealth ? `電池${d.batteryHealth}%` : null]
          .filter(Boolean) as string[];
        const body = (
          <>
            <span className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold leading-tight">{r.label}</span>
              <span className="text-[11px] text-ink-mute leading-snug">{meta.map((m, j) => <span key={j} className="whitespace-nowrap">{j > 0 && "・"}{m}</span>)}</span>
            </span>
            <b className="text-price text-base tabular-nums">{d.price.toLocaleString()}</b>
            <span className="text-[11px] text-ink-mute tabular-nums min-w-[56px] text-right">{i === 0 ? "最安" : `+${(d.price - base).toLocaleString()}`}{r.href && <span className="text-brand-600 font-bold"> ›</span>}</span>
          </>
        );
        const cls = `grid grid-cols-[1fr_auto_auto] gap-2 items-center py-2 ${i > 0 ? "border-t border-line-soft" : ""}`;
        return r.href ? (
          <a key={r.label} href={r.href} className={`${cls} hover:bg-ground`}>{body}</a>
        ) : (
          <div key={r.label} className={cls}>{body}</div>
        );
      })}
    </div>
  );
}
