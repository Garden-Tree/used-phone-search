"use client";

import Link from "next/link";
import { useState } from "react";
import { budgetLabel, budgetPath, type BudgetDevice } from "@/lib/budgets";

export type BudgetOption = { device: BudgetDevice; label: string; budgets: number[] };

/**
 * トップの「予算から探す」。種類を選び、スライダーで予算（その種類の段階に吸着）を選ぶと、
 * 予算別ページ（lib/budgets.ts の budgetPath）へのリンクが変わるだけ。計算・通信はしない。
 * JS が無いときは、親が noscript の予算リンクを出す
 */
export default function BudgetPicker({ options }: { options: BudgetOption[] }) {
  const [device, setDevice] = useState<BudgetDevice>(options[0].device);
  const [idx, setIdx] = useState<Record<string, number>>(() =>
    Object.fromEntries(options.map((o) => [o.device, Math.min(3, o.budgets.length - 1)])),
  );
  const opt = options.find((o) => o.device === device) ?? options[0];
  const i = Math.min(idx[opt.device] ?? 0, opt.budgets.length - 1);
  const max = opt.budgets[i];

  return (
    <div className="bg-white border border-line rounded-xl p-3 flex flex-col gap-2.5">
      <div className="flex gap-1.5" role="group" aria-label="機種の種類">
        {options.map((o) => {
          const on = o.device === device;
          return (
            <button
              key={o.device}
              type="button"
              aria-pressed={on}
              onClick={() => setDevice(o.device)}
              className={`flex-1 h-9 rounded-full border text-xs ${
                on ? "bg-brand-800 border-brand-800 text-white font-bold" : "bg-white border-[#D1D5DB] text-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          type="range"
          min={0}
          max={opt.budgets.length - 1}
          step={1}
          value={i}
          aria-label="予算"
          aria-valuetext={`${budgetLabel(max)}以下`}
          onChange={(e) => setIdx((prev) => ({ ...prev, [opt.device]: Number(e.target.value) }))}
          className="w-full h-7 accent-brand-600"
        />
        <div className="flex justify-between text-[10px] text-ink-mute">
          {opt.budgets.map((b) => (
            <span key={b}>{b % 10000 === 0 ? `${b / 10000}万` : b.toLocaleString()}</span>
          ))}
        </div>
      </div>
      <Link
        href={budgetPath(max, opt.device)}
        className="h-11 flex items-center justify-center bg-brand-50 rounded-xl text-sm font-bold text-brand-800 hover:text-brand-600"
      >
        {budgetLabel(max)}以下の中古 {opt.label} を見る ›
      </Link>
    </div>
  );
}
