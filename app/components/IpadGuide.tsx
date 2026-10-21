import { ipadPencilCheckedJa, IPAD_PENCIL_SOURCE, pencilNeedsAdapter, pencilsFor } from "@/lib/ipadPencil";
import { storageLabel, yen } from "@/lib/format";

const CARD = "bg-white border border-line rounded-xl";
const SRC = "text-brand-600 underline underline-offset-2";

type StorageRow = { key: string; minPrice: number; count: number };

/**
 * iPad の機種ページの「選ぶときの目安」。Apple Pencil の対応（Apple 公式で確かめた機種だけ）・在庫のある容量・Wi-Fi／Cellular の見分け方。
 * 容量は上の集計（stats.byStorage）をそのまま使う（DB への問い合わせは増やさない）。
 */
export default function IpadGuide({ model, byStorage }: { model: string; byStorage: StorageRow[] }) {
  const pencils = pencilsFor(model);
  const storages = byStorage.filter((r) => r.count > 0);
  const hasSmall = storages.some((r) => Number(r.key) <= 64);
  return (
    <section className={`${CARD} p-3.5 flex flex-col gap-2.5 min-[1360px]:col-span-2`}>
      <h2 className="text-[15px] font-bold">選ぶときの目安</h2>

      {pencils.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-[13px] font-bold">使える Apple Pencil</h3>
          <div className="flex flex-wrap gap-1.5">
            {pencils.map((p) => (
              <span key={p} className="h-7 px-2.5 rounded-full text-[12px] bg-brand-50 border border-brand-200 text-brand-800 flex items-center">
                Apple Pencil{p === "Pro" ? " Pro" : `（${p}）`}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-ink-mute leading-relaxed">
            {pencilNeedsAdapter(model) ? "第1世代はペアリングと充電に USB-C - Apple Pencil アダプタが必要です。" : ""}
            上に無い Apple Pencil は使えません。出典:{" "}
            <a href={IPAD_PENCIL_SOURCE} target="_blank" rel="noopener" className={SRC}>Apple「Apple Pencil の互換性」</a>（{ipadPencilCheckedJa()}確認）
          </p>
        </div>
      )}

      {storages.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-[13px] font-bold">在庫のある容量</h3>
          <ul className="flex flex-col divide-y divide-line-soft">
            {storages.map((r) => (
              <li key={r.key} className="py-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-bold">{storageLabel(r.key, model)} <span className="text-[11px] font-normal text-ink-mute">{r.count.toLocaleString()}件</span></span>
                <span className="text-ink-sub">最安 <span className="font-bold text-price tabular-nums">{yen(r.minPrice)}</span></span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-ink-mute leading-relaxed">
            容量は買ってから増やせません。{hasSmall ? "64GB 以下はアプリや写真・動画ですぐ埋まりがちなので、使い方に合わせて選んでください。" : "使うアプリや保存する写真・動画の量に合わせて選んでください。"}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h3 className="text-[13px] font-bold">Wi-Fi モデルと Cellular モデル</h3>
        <p className="text-[11px] text-ink-mute leading-relaxed">
          Cellular モデルは SIM を入れて外でも通信できます（回線の契約は別）。中古の Cellular モデルを買うなら、SIMフリーかどうかとネットワーク利用制限が「○」かを商品ページで確認してください。家の Wi-Fi やテザリングだけで使うなら Wi-Fi モデルで足ります。
        </p>
      </div>
    </section>
  );
}
