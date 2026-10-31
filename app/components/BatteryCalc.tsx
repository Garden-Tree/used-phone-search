"use client";

import Link from "next/link";
import { BatteryFull } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
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

const yen = (n: number) => `${n.toLocaleString()}円`;
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
export default function BatteryCalc({ models, targets, paths, aisapoHref, defaultSlug }: {
  models: CalcModel[];
  targets: Record<string, TargetStorage[]>;
  paths: Record<string, string>;
  aisapoHref: string;
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
  const rows = [
    appleCost !== null ? { key: "apple", label: "Apple で交換", year: perYear(appleCost, years) } : null,
    buyCost !== null && target ? { key: "buy", label: `中古の${short(target)}に買い替え`, year: perYear(Math.max(buyCost, 0), years) } : null,
  ].filter((r): r is { key: string; label: string; year: number } => r !== null);
  const max = Math.max(1, ...rows.map((r) => r.year), m.aisapo !== null ? perYear(m.aisapo, years) : 0);
  // Apple と買い替えの両方があるときだけ、安い方に「安い」の札
  const best = rows.length === 2 ? (rows[0].year <= rows[1].year ? rows[0].key : rows[1].key) : null;

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

      <div className="border-t border-line-soft pt-3 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-mute">
          <span className="px-2 py-0.5 rounded-full bg-ground text-ink font-bold">{short(m.model)}・{gb(st)}</span>
          <span className="px-2 py-0.5 rounded-full bg-ground text-ink font-bold">あと{years}年</span>
          <span className="ml-auto">1年あたり</span>
        </div>

        {appleCost !== null && (
          <div className="flex flex-col gap-1.5">
            <Bar label="Apple で交換" value={perYear(appleCost, years)} max={max} tone="brand" best={best === "apple"} />
            <Formula parts={care && health < 80 ? [{ t: "AppleCare+", v: "0円", hi: true }] : [{ t: "Apple", v: yen(appleCost) }, { op: "÷" }, { v: `${years}年` }]} />
            {m.aisapo !== null && (
              <div className="ml-3 pl-3 border-l-2 border-dashed border-line flex flex-col gap-1.5">
                <Bar label="非正規（アイサポ）" value={perYear(m.aisapo, years)} max={max} tone="gray" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <Formula parts={[{ t: "アイサポ", v: yen(m.aisapo) }, { op: "÷" }, { v: `${years}年` }]} />
                  {appleCost > m.aisapo && <span className="px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#166534] text-[11px] font-bold tabular-nums">−{yen(appleCost - m.aisapo)}</span>}
                  <span className="text-[10px] text-ink-mute">非純正の電池のことも</span>
                  <a href={aisapoHref} target="_blank" rel="sponsored nofollow noopener" data-shop-click="" data-shop="アイサポ（修理）" data-model={m.model} data-link-type="a8" data-placement="battery-calc"
                    className="ml-auto text-xs font-bold text-brand-600 hover:text-brand-800">アイサポ <span className="font-normal text-ink-mute">PR ›</span></a>
                </div>
              </div>
            )}
          </div>
        )}

        {target && picked?.cell ? (
          <div className="flex flex-col gap-1.5">
            <Bar label={`中古の${short(target)}に買い替え`} value={perYear(Math.max(buyCost!, 0), years)} max={max} tone="amber" best={best === "buy"} />
            <div className="flex flex-wrap items-center gap-1.5">
              <Formula parts={[
                { t: `${short(target)}・${gb(picked.storage)}`, v: yen(picked.cell.median) },
                ...(sell ? [{ op: "−" }, { t: "売る", v: yen(sell.price) }] : []),
                { op: "÷" }, { v: `${years}年` },
              ]} />
              {paths[target] && <Link href={paths[target]} className="ml-auto text-xs font-bold text-brand-600 hover:text-brand-800">店ごとに見る ›</Link>}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-ink-mute">{target ? `中古の${short(target)}は電池${filter === "b80" ? 80 : 85}%以上の在庫が5件未満` : "これより新しい世代の中古はまだありません"}</p>
        )}
      </div>
    </div>
  );
}

type Part = { t?: string; v?: string; op?: string; hi?: boolean };
/** 計算の式を小さな札で並べる（文章の代わり） */
function Formula({ parts }: { parts: Part[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px] tabular-nums">
      {parts.map((p, i) => p.op ? (
        <span key={i} className="text-ink-mute font-bold">{p.op}</span>
      ) : (
        <span key={i} className={`px-1.5 py-0.5 rounded ${p.hi ? "bg-[#DCFCE7] text-[#166534]" : "bg-ground text-ink"}`}>
          {p.t && <span className="text-ink-mute mr-1">{p.t}</span>}<b>{p.v}</b>
        </span>
      ))}
    </div>
  );
}

function Bar({ label, value, max, tone, best }: { label: string; value: number; max: number; tone: "brand" | "amber" | "gray"; best?: boolean }) {
  const fill = { brand: "bg-brand-600", amber: "bg-[#F59E0B]", gray: "bg-[#9CA3AF]" }[tone];
  const strong = tone !== "gray";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`flex items-center gap-1.5 ${strong ? "font-bold" : "text-ink-sub"}`}>
          {label}
          {best && <span className="px-1.5 py-px rounded-full bg-[#16A34A] text-white text-[10px] font-bold">安い</span>}
        </span>
        <span className={`tabular-nums ${strong ? "font-bold text-price text-base" : "text-ink"}`}>{yen(value)}<span className="text-[10px] text-ink-mute font-normal">/年</span></span>
      </div>
      <div className="h-3 rounded-full bg-line-soft overflow-hidden">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}
