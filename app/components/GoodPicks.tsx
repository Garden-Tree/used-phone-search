import DeviceCard, { DeviceList } from "@/app/components/DeviceCard";
import { getGoodDevice, getGoodDeviceUnder } from "@/lib/modelBest";

/**
 * 「ランクB以上・バッテリー85%以上で選ぶなら」の機種ごとの1台（2026-10-31〜・Pixel・Galaxy の一覧と予算別ページ）。
 * 機種ページの「安い在庫」に添える1台（getGoodDevice）と同じ条件。Pixel・Galaxy は電池の%を書く店が少なく、
 * この条件だと にこスマ（保証1年）が1台になりやすい（ideas/2026-10-30.md）。
 * models は出したい順（先頭から見て、在庫がある機種を limit 台まで）。max があれば予算以下だけ。
 * placement は shop_click の placement（GA で枠ごとのクリックを分ける）
 */
export default async function GoodPicks({ models, max, limit = 6, placement, title = "ランクB以上・バッテリー85%以上で選ぶなら" }: {
  models: string[];
  max?: number;
  limit?: number;
  placement: string;
  title?: string;
}) {
  const found = (await Promise.all(models.map((m) => (max ? getGoodDeviceUnder(m, max) : getGoodDevice(m, true)))))
    .filter((d) => d !== null)
    .slice(0, limit);
  if (found.length === 0) return null;
  return (
    <section className="my-8" data-placement={placement}>
      <h2 className="text-xl md:text-2xl font-bold mb-1">{title}</h2>
      <p className="text-xs text-ink-mute mb-4">
        機種ごとに、状態ランクB以上・バッテリー最大容量85%以上{max ? "で予算以下" : ""}のいちばん安い在庫。バッテリーの%を書いていない在庫は入りません。
      </p>
      <DeviceList>
        {found.map((d) => <DeviceCard key={d.id} device={d} />)}
      </DeviceList>
    </section>
  );
}
