"use client";

import Link from "next/link";
import { BatteryFull } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { perYear, pickTarget, type BatteryFilter, type TargetStorage } from "@/lib/batteryCalc";

export type CalcModel = {
  model: string;
  slug: string;
  apple: number | null;
  aisapo: number | null;
  buyback: { storage: number; price: number; shop: string }[];
  next1: string | null;
  next2: string | null;
};

const gb = (n: number) => (n >= 1024 ? `${n / 1024}TB` : `${n}GB`);
const short = (m: string) => m.replace(/^iPhone /, "");
const noSubscribe = () => () => {};
const PILL ="h-8 px-3 rounded-full border text-xs";
const pill = (on: boolean) => `${PILL} ${on ? "bg-brand-800 border-brand-800 text-white font-bold" : "bg-white border-[#D1D5DB] text-ink"}`;

/**
 * /iphone/battery の計算機。機種・容量・最大容量・あと何年・AppleCare+ を選ぶと、
 * Apple で交換（その下に非正規＝アイサポならいくら）と、中古に買い替え（1つ上・2つ上の世代の相場 − いまの iPhone の買取価格）を
 * 「1年あたり」で並べる。結論は言い切らず、前提（料金・相場・買取）を見せる。?model=<slug> で機種を選んだ状態で開く
 */
export default function BatteryCalc({ models, targets, paths, aisapoHref, appleHref, defaultSlug }: {
  models: CalcModel[];
  targets: Record<string, TargetStorage[]>;
  paths: Record<string, string>;
  aisapoHref: string;
  appleHref: string;
  defaultSlug: string;
}) {
  // 機種ページの「直す？買い替える？」から ?model=<slug> で来たとき（静的書き出しなので、書き出し時は null・ブラウザで読む）
  const fromQuery = useSyncExternalStore(noSubscribe, () => new URLSearchParams(window.location.search).get("model"), () => null);
  const [chosen, setSlug] = useState<string | null>(null);
  const slug = chosen ?? (fromQuery && models.some((m) => m.slug === fromQuery) ? fromQuery : defaultSlug);
  const [storage, setStorage] = useState<number | null>(null);
  const [health, setHealth] = useState(79);
  const [years, setYears] = useState(2);
  const [care, setCare] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [filter, setFilter] = useState<BatteryFilter>("b80");

  const m = models.find((x) => x.slug === slug) ?? models[0];
  const target = step === 2 && m.next2 ? m.next2 : m.next1;
  const storages = m.buyback.length > 0 ? m.buyback.map((b) => b.storage) : (targets[target ?? ""] ?? []).map((t) => t.storage);
  const st = storage !== null && storages.includes(storage) ? storage : (storages.includes(128) ? 128 : storages[0] ?? 128);
  const sell = m.buyback.find((b) => b.storage === st) ?? null;
  const picked = target ? pickTarget(targets[target], st, filter) : null;

  const appleCost = m.apple === null ? null : care && health < 80 ? 0 : m.apple;
  const buyCost = picked?.cell ? picked.cell.median - (sell?.price ?? 0) : null;
  // 安い順の一覧（B 案・10/31 ユーザーが選んだ）。同じ額なら Apple・非正規・買い替えの順
  const options: Option[] = [];
  if (appleCost !== null) {
    options.push({
      key: "apple", label: "Apple で交換", year: perYear(appleCost, years),
      formula: care && health < 80 ? <>AppleCare+ で <b className="text-ink">0円</b></> : <><b className="text-ink">{appleCost.toLocaleString()}</b> ÷ {years}年</>,
      link: { href: appleHref, text: "見積り", external: true },
    });
  }
  if (m.aisapo !== null) {
    options.push({
      key: "aisapo", label: "非正規で交換", note: "アイサポ", year: perYear(m.aisapo, years),
      formula: <><b className="text-ink">{m.aisapo.toLocaleString()}</b> ÷ {years}年</>,
      link: { href: aisapoHref, text: "PR", a8: true },
    });
  }
  if (target && picked?.cell && buyCost !== null) {
    options.push({
      key: "buy", label: `中古の${short(target)}に買い替え`, note: gb(picked.storage), year: perYear(Math.max(buyCost, 0), years),
      formula: <><b className="text-ink">{picked.cell.median.toLocaleString()}</b>{sell && <> − 売る <b className="text-ink">{sell.price.toLocaleString()}</b></>} ÷ {years}年</>,
      link: paths[target] ? { href: paths[target], text: `${short(target)}を見る` } : null,
    });
  }
  const ranked = options.map((o, i) => ({ o, i })).sort((x, y) => x.o.year - y.o.year || x.i - y.i).map((x) => x.o);
  const max = Math.max(1, ...ranked.map((o) => o.year));

  return (
    <div className="bg-white border border-line rounded-xl p-3.5 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[11px] text-ink-mute">
          いまの iPhone
          <select value={m.slug} onChange={(e) => { setSlug(e.target.value); setStorage(null); }} className="h-9 rounded-lg border border-line px-2 text-sm text-ink bg-white">
            {models.map((x) => <option key={x.slug} value={x.slug}>{x.model}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-ink-mute">
          容量
          <select value={st} onChange={(e) => setStorage(Number(e.target.value))} className="h-9 rounded-lg border border-line px-2 text-sm text-ink bg-white">
            {storages.map((s) => <option key={s} value={s}>{gb(s)}</option>)}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-[11px] text-ink-mute">
        <span className="flex items-baseline gap-1.5">最大容量 <b className="text-base text-ink tabular-nums">{health}%</b><span className="text-[10px]">設定 › バッテリー</span></span>
        <input type="range" min={60} max={100} step={1} value={health} onChange={(e) => setHealth(Number(e.target.value))} aria-label="いまの最大容量" className="w-full h-7 accent-brand-600" />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-ink-mute">あと何年使う</span>
        <div className="flex gap-1.5" role="group" aria-label="あと何年使う">
          {[1, 2, 3, 4].map((y) => <button key={y} type="button" aria-pressed={years === y} onClick={() => setYears(y)} className={`flex-1 ${pill(years === y)}`}>{y}年</button>)}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-2 items-center">
        <label className="flex items-center gap-1.5 text-xs h-8 px-3 rounded-full border border-[#D1D5DB]">
          <input type="checkbox" checked={care} onChange={(e) => setCare(e.target.checked)} className="w-4 h-4 accent-brand-600" />
          AppleCare+
        </label>
        <div className="flex items-center gap-1.5" role="group" aria-label="買い替え先">
          <span className="text-[11px] text-ink-mute">買い替え先</span>
          <button type="button" aria-pressed={step === 1} onClick={() => setStep(1)} disabled={!m.next1} className={`${pill(step === 1)} disabled:opacity-40`}>1つ上</button>
          <button type="button" aria-pressed={step === 2} onClick={() => setStep(2)} disabled={!m.next2} className={`${pill(step === 2)} disabled:opacity-40`}>2つ上</button>
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="買い替え先の電池">
          <BatteryFull aria-hidden className="w-4 h-4 text-ink-mute" />
          <button type="button" aria-pressed={filter === "b80"} onClick={() => setFilter("b80")} className={pill(filter === "b80")}>80%以上</button>
          <button type="button" aria-pressed={filter === "b85"} onClick={() => setFilter("b85")} className={pill(filter === "b85")}>85%以上</button>
        </div>
      </div>

      <div className="border-t border-line-soft pt-3 flex flex-col">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-mute mb-1">
          <span className="px-2 py-0.5 rounded-full bg-ground text-ink font-bold">{short(m.model)}・{gb(st)}</span>
          <span className="px-2 py-0.5 rounded-full bg-ground text-ink font-bold">あと{years}年</span>
          <span className="ml-auto">1年あたり</span>
        </div>
        <ol className="flex flex-col divide-y divide-line-soft">
          {ranked.map((o, i) => (
            <li key={o.key} className="grid grid-cols-[22px_1fr_auto] gap-x-2.5 gap-y-1 items-center py-2.5">
              <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold ${i === 0 ? "bg-brand-800 text-white" : "bg-ground text-ink-sub"}`}>{i + 1}</span>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[13px] font-bold leading-tight truncate">{o.label}{o.note && <span className="ml-1.5 text-[10px] font-normal text-ink-mute">{o.note}</span>}</span>
                <div className="h-2 rounded-full bg-line-soft overflow-hidden">
                  <div className={`h-full rounded-full ${i === 0 ? "bg-brand-600" : "bg-[#9CA3AF]"}`} style={{ width: `${Math.max(2, (o.year / max) * 100)}%` }} />
                </div>
              </div>
              <span className="text-right text-price font-bold text-lg leading-none tabular-nums">{o.year.toLocaleString()}<span className="block text-[10px] text-ink-mute font-normal mt-0.5">円/年</span></span>
              <div className="col-start-2 col-span-2 flex items-center gap-2 text-[11px] text-ink-mute tabular-nums">
                <span>{o.formula}</span>
                {o.link && (o.link.a8 ? (
                  <a href={o.link.href} target="_blank" rel="sponsored nofollow noopener" data-shop-click="" data-shop="アイサポ（修理）" data-model={m.model} data-link-type="a8" data-placement="battery-calc"
                    className="ml-auto font-bold text-brand-600 hover:text-brand-800">アイサポ <span className="font-normal text-ink-mute">PR ›</span></a>
                ) : o.link.external ? (
                  <a href={o.link.href} target="_blank" rel="noopener" className="ml-auto font-bold text-brand-600 hover:text-brand-800">{o.link.text} ›</a>
                ) : (
                  <Link href={o.link.href} className="ml-auto font-bold text-brand-600 hover:text-brand-800">{o.link.text} ›</Link>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {!(target && picked?.cell) && (
          <p className="text-[11px] text-ink-mute pt-1">{target ? `中古の${short(target)}は電池${filter === "b80" ? 80 : 85}%以上の在庫が5件未満` : "これより新しい世代の中古はまだありません"}</p>
        )}
      </div>
    </div>
  );
}

type Option = {
  key: string;
  label: string;
  note?: string;
  year: number;
  formula: ReactNode;
  link: { href: string; text: string; external?: boolean; a8?: boolean } | null;
};
