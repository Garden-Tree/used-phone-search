'use client';

import { useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/**
 * 機種名の検索欄（11/23〜）。文字を入れると、機種ページのある機種から候補を最大8件出す。
 * 候補を選ぶと機種ページへ、選ばずに「検索」で /search?model=… へ（今までどおり）。
 * 候補はサーバー側で作って渡す（[機種名, ページのパス, 在庫数]。カタログ一式をブラウザに送らない）
 */
export type SuggestItem = [name: string, path: string, count: number];

// ひらがな・カタカナの呼び方 → 英字の名前（「あいふぉん15」でも出るように）
const KANA: [RegExp, string][] = [
  [/(あいふぉん|アイフォン|アイフォーン)/g, 'iphone'],
  [/(あいぱっど|アイパッド)/g, 'ipad'],
  [/(ぴくせる|ピクセル)/g, 'pixel'],
  [/(ぎゃらくしー|ギャラクシー)/g, 'galaxy'],
  [/(まっくぶっく|マックブック)/g, 'macbook'],
  [/(まっく|マック)/g, 'mac'],
  [/(えくすぺりあ|エクスペリア)/g, 'xperia'],
  [/(あくおす|アクオス)/g, 'aquos'],
  [/(おっぽ|オッポ)/g, 'oppo'],
  [/(しゃおみ|シャオミ)/g, 'xiaomi'],
  [/(うぉっち|ウォッチ)/g, 'watch'],
  [/(ぷろ|プロ)/g, 'pro'],
  [/(まっくす|マックス)/g, 'max'],
  [/(みに|ミニ)/g, 'mini'],
  [/(えあー|えあ|エアー|エア)/g, 'air'],
  [/(ぷらす|プラス)/g, 'plus'],
  [/(うるとら|ウルトラ)/g, 'ultra'],
];

/** 比べるための形: 全角→半角・小文字・空白とかっこを除く */
export function normalize(s: string): string {
  let t = s.normalize('NFKC').toLowerCase();
  for (const [re, en] of KANA) t = t.replace(re, en);
  return t.replace(/[\s()（）]/g, '');
}

export default function SearchSuggest({ items, inputId = 'q', placeholder = '機種名（例: iPhone 15 Pro）' }: { items: SuggestItem[]; inputId?: string; placeholder?: string }) {
  const router = useRouter();
  const listId = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const keyed = useMemo(() => items.map(([name, path, count]) => ({ name, path, count, key: normalize(name) })), [items]);
  const hits = useMemo(() => {
    const q = normalize(text);
    if (!q) return [];
    // 先頭が合う → 単語の頭が合う → どこかに含む、の順。同じ順位なら在庫のある機種・短い名前（「iPhone 15」を「iPhone 15 Pro Max」より先に）・在庫の多い順
    const scored = keyed
      .map((it) => {
        const at = it.key.indexOf(q);
        if (at < 0) return null;
        const rank = at === 0 ? 0 : normalize(it.name.replace(/^\S+\s/, '')).startsWith(q) ? 1 : 2;
        return { it, rank };
      })
      .filter((x): x is { it: (typeof keyed)[number]; rank: number } => x !== null)
      .sort((a, b) => a.rank - b.rank || Number(b.it.count > 0) - Number(a.it.count > 0) || a.it.name.length - b.it.name.length || b.it.count - a.it.count);
    return scored.slice(0, 8).map((x) => x.it);
  }, [text, keyed]);

  const show = open && hits.length > 0;
  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!show) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      go(hits[active].path);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <form action="/search" method="GET" className="flex gap-2 w-full" role="search">
      <div className="relative flex-1 min-w-0">
        <label htmlFor={inputId} className="sr-only">機種名</label>
        <input
          id={inputId}
          type="search"
          name="model"
          autoComplete="off"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full h-12 border-[1.5px] border-[#C7CBD4] rounded-xl px-3.5 text-base bg-white text-ink outline-none focus:border-brand-600"
        />
        {show && (
          <ul id={listId} role="listbox" className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-line rounded-xl shadow-lg py-1 max-h-80 overflow-auto text-left">
            {hits.map((h, i) => (
              <li
                key={h.path}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h.path)}
                className={`px-3.5 py-2.5 text-[15px] cursor-pointer flex items-center justify-between gap-2 ${i === active ? 'bg-brand-50 text-brand-900' : 'text-ink'}`}
              >
                <span className="truncate">{h.name}</span>
                <span className="shrink-0 text-xs text-ink-mute">{h.count > 0 ? `在庫 ${h.count.toLocaleString()}件 ›` : "相場を見る ›"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="submit" className="h-12 px-[18px] rounded-xl bg-brand-600 hover:bg-brand-800 text-white text-[15px] font-bold inline-flex items-center gap-1.5">
        <Search className="w-4 h-4" aria-hidden="true" />
        検索
      </button>
    </form>
  );
}
