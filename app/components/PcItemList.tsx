"use client";

import { useState } from "react";
import PcItemRow, { type PcRowItem } from "./PcItemRow";

const STEP = 20;

// 中古パソコンの在庫の一覧（/pc）。最初は安い順に20件だけ出し、ボタンで20件ずつ足す（ユーザーの指示: 全件を一気に出さない）
export default function PcItemList({ items }: { items: PcRowItem[] }) {
  const [shown, setShown] = useState(STEP);
  const rest = items.length - shown;
  return (
    <>
      <div className="bg-white rounded-xl border border-line overflow-hidden">
        {items.slice(0, shown).map((p, i) => <PcItemRow key={p.url} p={p} first={i === 0} />)}
      </div>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + STEP)}
          className="mt-3 w-full rounded-xl border border-line bg-white py-2.5 text-sm font-bold text-brand-600 hover:bg-ground"
        >
          さらに{Math.min(STEP, rest)}件を見る（残り{rest.toLocaleString()}件）
        </button>
      )}
    </>
  );
}
