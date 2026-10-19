import { findShop, type Shop } from "@/lib/shops";
import { medianLabel, storageLabel, yen } from "@/lib/format";
import type { PriceRow } from "@/lib/modelStats";
import { appleCheckedJa, type NewVsUsedRow } from "@/lib/applePrices";

/** 別の売り場（イオシス楽天市場店など）を本店にまとめた、店ごとの最安値・件数（最安の売り場の保証を使う） */
export type ShopAgg = { label: string; minPrice: number; count: number; shop?: Shop };

export function foldShops(byShop: PriceRow[]): ShopAgg[] {
  const map = new Map<string, ShopAgg>();
  for (const r of byShop) {
    const s = findShop(r.key);
    const label = (s?.alias ? findShop(s.alias)?.label : undefined) ?? s?.label ?? r.key;
    const cur = map.get(label);
    if (!cur) map.set(label, { label, minPrice: r.minPrice, count: r.count, shop: s });
    else {
      cur.count += r.count;
      if (r.minPrice < cur.minPrice) { cur.minPrice = r.minPrice; cur.shop = s; }
    }
  }
  return [...map.values()];
}

/** 在庫が多い店の上位 n 件の表示名 */
export const topStockLabels = (byShop: PriceRow[], n = 3): string[] =>
  foldShops(byShop).sort((a, b) => b.count - a.count).slice(0, n).map((s) => s.label);

/** 検索結果に出る説明文（約110字以内。重要な数字を先頭に） */
export function modelDescription(model: string, stats: { minPrice: number | null; medianPrice: number | null; medianStorage?: number | null; count: number; shopCount: number; byShop: PriceRow[]; byStorage?: PriceRow[] }): string {
  // MacBook（2026-10-15〜）は容量の代わりにメモリ・SSD で比べる
  const mac = /^MacBook/.test(model);
  // Apple Watch（2026-10-15〜）は容量の代わりにケースのサイズ（mm）・通信方式（GPS／GPS+Cellular）で比べる
  const watch = /^Apple Watch/.test(model);
  if (stats.minPrice === null && watch) return `${model}の中古在庫を大手中古ショップから一括比較。ケースのサイズ・通信方式・状態ランク別の最安値をまとめています。`;
  if (stats.minPrice === null) return mac ? `${model}の中古在庫を大手中古ショップから一括比較。メモリ・SSD・状態ランク別の最安値をまとめています。` : `${model}の中古在庫を大手中古ショップから一括比較。容量・状態ランク別の最安値をまとめています。`;
  const top = topStockLabels(stats.byShop).join("・");
  // 相場は在庫がいちばん多い容量の中央値なので容量を添える（容量をまぜた値が高く出るのを防ぐ。10/16〜）
  const med = `${medianLabel(stats.medianStorage, model)}${yen(stats.medianPrice ?? stats.minPrice)}`;
  // 先頭は容量（Watch はサイズ）ごとの最安値（小さい順に3つまで）。「最安」1つだけより自分の容量の値段が分かる（10/18〜。検索のクリック率の改善）
  const caps = (stats.byStorage ?? []).filter((r) => r.count > 0).sort((a, b) => Number(a.key) - Number(b.key)).slice(0, 3);
  const head = caps.length >= 2 ? caps.map((r) => `${storageLabel(r.key, model)} ${yen(r.minPrice)}〜`).join("・") : `最安${yen(stats.minPrice)}`;
  if (watch) return `${model}の中古は${head}・${med}。${top}など${stats.shopCount}店の${stats.count.toLocaleString()}件をケースのサイズ・通信方式・状態ランクで比較（毎日更新）。`;
  if (mac) return `${model}の中古は最安${yen(stats.minPrice)}・${med}。${top}など${stats.shopCount}店の${stats.count.toLocaleString()}件をメモリ・SSD・状態ランクで比較（毎日更新）。`;
  return `${model}の中古は${head}・${med}。${top}など${stats.shopCount}店の${stats.count.toLocaleString()}件を容量・状態ランク・バッテリーで比較（毎日更新）。`;
}

export type Faq = { q: string; a: string };

export function buildFaq(p: {
  model: string;
  isIphone: boolean;
  /** MacBook（2026-10-15〜）。ランクB以上の最安値（バッテリーの条件なし）・保証の言い回し・買うときの注意を Mac 用にする */
  isMac?: boolean;
  /** Apple Watch（2026-10-15〜）。ランクB以上の最安値（バッテリーの条件なし）・保証の言い回し・買うときの注意を Watch 用にする */
  isWatch?: boolean;
  minPrice: number;
  medianPrice: number | null;
  medianStorage?: number | null;
  /** 最安の個体の説明（「ランクC・バッテリー80%未満」など） */
  cheapestNote: string | null;
  goodMin: number | null;
  count: number;
  shopCount: number;
  updatedText: string | null;
  byShop: PriceRow[];
  /** 新品（公式）と中古の最安の差（容量ごと。公式価格のある機種だけ） */
  newVsUsed?: NewVsUsedRow[];
  /** 新品価格の出典名（Apple 公式・Google ストア・Samsung 公式）と確認日 */
  newSourceName?: string;
  newCheckedJa?: string;
  /** 「いつまで使えるか」の根拠がある機種だけ。なければ質問ごと出さない */
  supportAnswer: string | null;
  /** バッテリー85%以上の最安値と件数（iPhone のみ。なければ質問ごと出さない） */
  battery85?: { minPrice: number; count: number } | null;
  /** ランクごとの最安値（iPhone のみ。A/B/C のうち2つ以上あるときだけ質問を出す） */
  byRank?: PriceRow[];
  /** iOS 27 への対応（iPhone のみ。true=対応 / false=非対応 / 未指定=質問を出さない） */
  ios27?: boolean;
}): Faq[] {
  const { model } = p;
  const a1 = [
    `${model}の中古の最安値は${yen(p.minPrice)}${p.cheapestNote ? `（${p.cheapestNote}）` : ""}です。`,
    p.medianPrice !== null ? `相場（在庫がいちばん多い${p.medianStorage ? storageLabel(p.medianStorage, model) : "容量"}の中央値）は${yen(p.medianPrice)}です。` : "",
    p.goodMin !== null ? `${p.isMac || p.isWatch ? "ランクB以上" : "ランクB以上・バッテリー85%以上"}に絞ると${yen(p.goodMin)}〜です。` : "",
    `現在${p.shopCount}店に${p.count.toLocaleString()}件の在庫があります${p.updatedText ? `（${p.updatedText}時点）` : ""}。`,
  ].join("");

  const cheap3 = foldShops(p.byShop).sort((a, b) => a.minPrice - b.minPrice).slice(0, 3);
  const a2 = `${model}の最安値が低い店は、${cheap3
    .map((s) => `${s.label}（${yen(s.minPrice)}${s.shop ? (p.isMac || p.isWatch ? `・${s.shop.warrantyShort}` : `・${s.shop.warrantyShort}・${s.shop.redRomShort}`) : ""}）`)
    .join("、")}の順です。価格と在庫は毎日変わるので、買う前に各店の最新の価格をご確認ください。`;

  const battery = "多くの店でバッテリー最大容量は値段に反映されていないので、同じ値段なら最大容量が高い個体を選ぶと得をします。";
  const rank = "状態ランクは外装の傷の話で、ランクAでもバッテリーが弱い個体、ランクBでも元気な個体があります。";
  const red = "ネットワーク利用制限「△」は基本気にしなくてよく、大手の中古店はたいてい赤ロム保証を付けています（フリマにはこの保証がありません）。";
  // MacBook: メモリ・SSD は購入後に増やせない。保証は店・商品ごとに違う
  const macNote = "メモリと SSD は購入後に増やせないので、使い方に合う組み合わせを先に決めてから値段を比べるのがおすすめです。状態ランクは外装の傷の目安で、基準は店ごとに違います。保証は店・商品ごとに違うので、買う前に商品ページで確認してください。";
  // Apple Watch: 通信方式（GPS／GPS+Cellular）とケースのサイズは買ってから変えられない。対応 iPhone は機種ごとに違う
  const watchNote = "通信方式（GPS／GPS+Cellular）とケースのサイズは買ってから変えられないので、先に決めてから値段を比べるのがおすすめです。GPS+Cellular が単体で通信するには、携帯会社の回線契約が別に必要です。状態ランクは外装の傷の目安で、基準は店ごとに違います。保証は店・商品ごとに違うので、買う前に商品ページで確認してください。";
  const a4 = p.isWatch ? watchNote : p.isMac ? macNote : p.isIphone ? `${battery}${rank}${red}` : `${battery}${rank}`;

  const faqs: Faq[] = [
    { q: `${model}の中古はいくらで買えますか？`, a: a1 },
    { q: `${model}の中古はどこで買うのが安いですか？`, a: a2 },
  ];
  // 検索されやすい聞き方の質問（2026-10-19〜。答えは上と同じ集計の数字）
  const medianPart = p.medianPrice !== null ? `、相場（在庫がいちばん多い${p.medianStorage ? storageLabel(p.medianStorage, model) : "容量"}の中央値）は${yen(p.medianPrice)}` : "";
  faqs.push({ q: `${model}の中古はいくらで買える？`, a: `${model}の中古は最安${yen(p.minPrice)}${medianPart}です。${p.shopCount}店の${p.count.toLocaleString()}件の在庫から集計しています。` });
  if (p.battery85 && p.battery85.count > 0) {
    faqs.push({ q: `バッテリー85%以上の中古${model}は何件ある？いくらから？`, a: `バッテリー最大容量が85%以上と分かる${model}の中古は${p.battery85.count.toLocaleString()}件あり、最安は${yen(p.battery85.minPrice)}です。` });
  }
  if (p.ios27 !== undefined) {
    faqs.push({ q: `${model}はiOS 27に対応している？`, a: p.ios27 ? `はい、${model}は iOS 27 に対応しています。` : `いいえ、${model}は iOS 27 には対応していません。サブ機・撮影用向けです。` });
  }
  const rk = (p.byRank ?? []).filter((r) => ["A", "B", "C"].includes(r.key) && r.count > 0);
  if (rk.length >= 2) {
    faqs.push({ q: "状態ランクで値段はどれくらい違う？", a: `${model}の最安値はランク別に${rk.map((r) => `${r.key}が${yen(r.minPrice)}`).join("、")}です。ランクは外装の傷の目安で、バッテリーの状態とは別です。` });
  }
  // 新品との差: 在庫がいちばん多い容量（公式価格がなければ、両方ある最小の容量）
  const nv = p.newVsUsed ?? [];
  const main = nv.find((r) => r.storage === p.medianStorage) ?? nv[0];
  if (main) {
    const cap = storageLabel(main.storage, model);
    const tail = main.diff > 0
      ? `中古の最安は${yen(main.usedMin)}で、新品より${yen(main.diff)}（${main.pct}%）安いです。`
      : `中古の最安は${yen(main.usedMin)}で、新品と同じか新品より高い在庫のみです。`;
    faqs.push({ q: "新品と中古でいくら違いますか？", a: `${model}（${cap}）の新品は${p.newSourceName ?? "公式"}で${yen(main.newPrice)}（税込・${p.newCheckedJa ?? appleCheckedJa()}時点）。${tail}` });
  }
  if (p.supportAnswer) faqs.push({ q: `${model}の中古はいつまで使えますか？`, a: p.supportAnswer });
  faqs.push({ q: "中古を買うときに気をつけることは？", a: a4 });
  return faqs;
}

/** 機種ページの冒頭の1文（AI や検索結果が引用しやすいよう、日付・最安・相場・店数・新品との差を1文にまとめる） */
export function buildSummary(p: {
  model: string;
  dateText: string;
  minPrice: number;
  minStorage: string | null;
  medianPrice: number | null;
  medianStorage?: number | null;
  shopCount: number;
  count: number;
  newVsUsed?: NewVsUsedRow[];
  newSourceName?: string;
}): string {
  const { model } = p;
  const nv = p.newVsUsed ?? [];
  const main = nv.find((r) => r.storage === p.medianStorage) ?? nv[0];
  const minPart = `最安${yen(p.minPrice)}${p.minStorage ? `（${p.minStorage}）` : ""}`;
  const med = p.medianPrice !== null ? `、相場（在庫がいちばん多い${p.medianStorage ? storageLabel(p.medianStorage, model) : "容量"}の中央値）は${yen(p.medianPrice)}` : "";
  const shops = `。大手中古ショップ${p.shopCount}店の${p.count.toLocaleString()}件を集計`;
  const tail = main
    ? (main.diff > 0
      ? `。新品（${p.newSourceName ?? "公式"}）${yen(main.newPrice)}より${yen(main.diff)}安い（${storageLabel(main.storage, model)}の最安で比較）`
      : "。中古の最安は新品以上")
    : "";
  return `${p.dateText}時点、${model}の中古は${minPart}${med}${shops}${tail}。`;
}
