import { ChevronDown } from "lucide-react";
import DeviceCard, { simLabel, type Device } from "@/app/components/DeviceCard";
import { isSmartwatch } from "@/lib/watchCatalog";

export type DeviceGroup = { first: Device; rest: Device[] };

/**
 * 安い順の行を、同じ店・同じ容量・同じランクでまとめる（11/6〜・案2B）。MacBook はメモリも同じ行だけ。
 * 電池の%が書いてある行は1台ごとに違うのでまとめない。並びは最初に出た行の順のまま
 */
export function groupSameShop(devices: Device[]): DeviceGroup[] {
  const groups: DeviceGroup[] = [];
  const byKey = new Map<string, DeviceGroup>();
  for (const d of devices) {
    const key = d.batteryHealth === null ? `${d.shopName}|${d.storage}|${d.conditionRank}|${d.memoryGB ?? ""}` : null;
    const group = key ? byKey.get(key) : undefined;
    if (group) {
      group.rest.push(d);
      continue;
    }
    const added = { first: d, rest: [] };
    groups.push(added);
    if (key) byKey.set(key, added);
  }
  return groups;
}

/** 「他3件 30,400円〜（色・SIM違い）」 */
export function restLabel({ first, rest }: DeviceGroup): string {
  const diffs = [
    rest.some((d) => d.color !== first.color) ? "色" : null,
    rest.some((d) => simLabel(d) !== simLabel(first)) ? (isSmartwatch(first.modelName) ? "通信方式" : "SIM") : null,
  ].filter(Boolean);
  const min = Math.min(...rest.map((d) => d.price));
  return `他${rest.length}件 ${min.toLocaleString()}円〜${diffs.length > 0 ? `（${diffs.join("・")}違い）` : ""}`;
}

/** 機種ページの在庫の行。まとめた分は押すと開く（JS なしの details） */
export default function CheapestRows({ devices }: { devices: Device[] }) {
  return groupSameShop(devices).map((group) => (
    <div key={group.first.id} className="border-b border-line-soft">
      <DeviceCard device={group.first} showModel={false} />
      {group.rest.length > 0 && (
        <details className="group border-t border-line-soft">
          <summary className="min-h-10 flex items-center justify-between gap-2 px-3.5 text-xs font-bold text-brand-600 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-ground">
            {restLabel(group)}
            <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          {group.rest.map((d) => <DeviceCard key={d.id} device={d} showModel={false} />)}
        </details>
      )}
    </div>
  ));
}
