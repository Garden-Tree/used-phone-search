import { modelPagePath } from "@/lib/catalog";
import { watchShort, type WatchPeerRow, type WatchPeers } from "@/lib/peerMarkets";
import { DiffCell, MarkCell, NameCell, PeerBox, PRICE, TD, TD_C, TH, rowClass } from "@/app/components/PeerTable";

/**
 * Apple Watch の機種ページの2つの表（2026-11-12〜。見本 .claude/watch-links-mock/A-generations・B-watchos27-line）。
 * 相場はビルド時の DB（lib/peerMarkets.ts）、チップ・電池・輝度・心電図・常時表示は lib/watchSpecs.ts、watchOS 27 は lib/watchCatalog.ts（Apple 公式）
 */

/** 「SE（第2世代）」→「SE 第2世代」（表の中は短く） */
const cellName = (model: string) => watchShort(model).replace(/（(第\d世代)）/, " $1");
const price = (r: WatchPeerRow) => (r.median === null ? "—" : r.median.toLocaleString());

/** 案A: 同じシリーズの全世代の相場・差・電池・輝度・watchOS 27（相場の表の下・在庫の前） */
export function WatchGenerations({ model, peers, day }: { model: string; peers: WatchPeers; day: string }) {
  if (peers.generations.length < 2) return null;
  const ultra = peers.family === "Ultra";
  return (
    <PeerBox
      title={`${peers.family} の世代ごとの相場`}
      sub={`${peers.bandLabel}・${day}`}
      foot={`差は ${watchShort(model)} の相場との差（円）。電池は通常使用の最大・輝度はニト（Apple 公式）`}
    >
      <thead>
        <tr>
          <th scope="col" className={TH}>機種</th>
          <th scope="col" className={TH}>相場</th>
          <th scope="col" className={TH}>差</th>
          <th scope="col" className={TH}>電池</th>
          <th scope="col" className={TH}>輝度</th>
          <th scope="col" className={`${TH} ${TD_C}`}>wOS27</th>
        </tr>
      </thead>
      <tbody>
        {peers.generations.map((r) => (
          <tr key={r.model} className={rowClass(r.current)}>
            <NameCell name={cellName(r.model)} href={modelPagePath(r.model)} current={r.current}
              small={[r.chip, ultra ? null : `${r.size}mm`, `${r.count.toLocaleString()}件`].filter(Boolean).join("・")} />
            <td className={`${TD} ${r.median === null ? "text-ink-mute" : PRICE}`}>{price(r)}</td>
            <DiffCell diff={r.diff} current={r.current} />
            <td className={TD}>{r.batteryHours === null ? "—" : `${r.batteryHours}h`}</td>
            <td className={TD}>{r.maxNits === null ? "—" : r.maxNits}</td>
            <MarkCell value={r.watchOS27} />
          </tr>
        ))}
      </tbody>
    </PeerBox>
  );
}

/** 案B: 同じサイズ帯を相場の順に並べ、watchOS 27 の境目に線（基本情報のすぐ上。Ultra のページは出さない） */
export function WatchOs27Line({ model, peers, day, flat }: { model: string; peers: WatchPeers; day: string; flat?: boolean }) {
  const t = peers.os27;
  if (!t || t.above.length + t.below.length < 2) return null;
  const row = (r: WatchPeerRow) => (
    <tr key={r.model} className={rowClass(r.current)}>
      <NameCell name={cellName(r.model)} href={modelPagePath(r.model)} current={r.current} small={`${r.size}mm`} />
      <td className={`${TD} ${PRICE}`}>{price(r)}</td>
      <DiffCell diff={r.diff} current={r.current} />
      <MarkCell value={r.ecg} />
      <MarkCell value={r.alwaysOn} />
    </tr>
  );
  const omitted = t.omitted.map((r) => `${cellName(r.model)}（${r.size}mm ${price(r)}円）`).join("・");
  return (
    <PeerBox
      title="watchOS 27 に対応するいちばん安い機種"
      flat={flat}
      sub={`${peers.bandLabel} の相場・${day}`}
      foot={`差は ${watchShort(model)} ${peers.size}mm の相場との差（円）。心電図・常時表示は Apple 公式${omitted ? `。${omitted}は省略` : ""}`}
    >
      <thead>
        <tr>
          <th scope="col" className={TH}>機種</th>
          <th scope="col" className={TH}>相場</th>
          <th scope="col" className={TH}>差</th>
          <th scope="col" className={`${TH} ${TD_C}`}>心電図</th>
          <th scope="col" className={`${TH} ${TD_C}`}>常時表示</th>
        </tr>
      </thead>
      <tbody>
        {t.above.map(row)}
        {t.below.length > 0 && (
          <tr>
            <td colSpan={5} className="px-3 py-[3px] text-[10px] font-bold text-safe text-left border-t-2 border-safe bg-white">ここより上が watchOS 27 対応</td>
          </tr>
        )}
        {t.below.map(row)}
      </tbody>
    </PeerBox>
  );
}
