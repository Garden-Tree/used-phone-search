import { modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import type { ScreenPeers as Peers } from "@/lib/peerMarkets";
import { DiffCell, NameCell, PeerBox, PRICE, TD, TH, rowClass } from "@/app/components/PeerTable";

/**
 * Galaxy の機種ページの「同じ ○〜○インチの相場」（2026-11-12〜。見本 .claude/watch-links-mock/C-galaxy-crossbrand。「同じ予算」の位置を置き換え）。
 * 同じ画面サイズ（±0.1インチ）の iPhone・Pixel・Galaxy と同じシリーズの前後の世代を、同じ容量の相場で（lib/peerMarkets.ts の screenPeers）。
 * 画面サイズは公式の値（lib/galaxySpecs.ts・iphoneSpecs.ts・pixelSpecs.ts）。折りたたみは内側の画面で、折りたたみどうし
 */

const inch1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export default function ScreenPeers({ peers, day }: { peers: Peers; day: string }) {
  const lo = inch1(peers.minInch);
  const hi = inch1(peers.maxInch);
  const range = lo === hi ? lo : `${lo}〜${hi}`;
  return (
    <PeerBox
      title={`同じ ${range}インチの相場`}
      sub={`${storageLabel(peers.storage)}・${day}${peers.fold ? "・内側の画面で比較" : ""}`}
    >
      <thead>
        <tr>
          <th scope="col" className={TH}>機種</th>
          <th scope="col" className={TH}>画面</th>
          <th scope="col" className={TH}>相場</th>
          <th scope="col" className={TH}>差</th>
        </tr>
      </thead>
      <tbody>
        {peers.rows.map((r) => (
          <tr key={r.model} className={rowClass(r.current)}>
            <NameCell name={r.model} href={modelPagePath(r.model)} current={r.current} />
            <td className={TD}>{r.inch}</td>
            <td className={`${TD} ${PRICE}`}>{r.median.toLocaleString()}</td>
            <DiffCell diff={r.current ? null : r.diff} current={r.current} />
          </tr>
        ))}
      </tbody>
    </PeerBox>
  );
}
