/**
 * Apple Watch のカタログ（機種別ページ /watch/[slug]・検索の機種照合・商品名の読み取りで共有する）。2026-10-15〜
 *
 * 載せるのは Series 6 以降・Ultra 全世代・SE 全世代（Series 5 以前は載せない）。出典（2026-10-15 に確認）:
 *   - Apple Watch の識別（モデル番号・ケースのサイズ）https://support.apple.com/ja-jp/108056（発売年・部品番号は載っていない）
 *   - watchOS 27 の対応機種と必要な iPhone https://www.apple.com/jp/watchos/
 * 発売年は公式のページにないので持たない（出さない）。モデル番号（A から始まる4桁）は公式の表の北米の列で、日本向けと同じかは未確認。
 * 商品名の読み取りにだけ使い（表にある番号なら機種が決まる）、画面には出さない。表にない番号は無視して名前で決める。
 *
 * 1機種＝1ページ。DB では modelName＝世代、storage＝ケースのサイズ（mm）、carrier＝通信方式（"GPS" か "GPS+Cellular"）。
 */

export type WatchCarrier = "GPS" | "GPS+Cellular";

type WatchInfo = {
  family: "Series" | "Ultra" | "SE";
  /** ケースのサイズ（mm。公式の表） */
  sizes: number[];
  /** Ultra は Cellular モデルだけ（公式の表に GPS の列がない） */
  cellularOnly: boolean;
  /** watchOS 27 に対応するか（apple.com/jp/watchos/） */
  watchOS27: boolean;
  /** 公式の表のモデル番号（A + 4桁）。GPS／GPS + Cellular（読み取りの補助。画面には出さない） */
  gps: string[];
  cell: string[];
};

const info = (family: WatchInfo["family"], sizes: number[], watchOS27: boolean, gps: string[], cell: string[]): WatchInfo => ({
  family, sizes, watchOS27, gps, cell, cellularOnly: family === "Ultra",
});

/** 新しい順（Series・Ultra・SE の3つの系統に分けて並べる） */
export const WATCH_CATALOG = [
  {
    series: "Apple Watch Series",
    models: [
      "Apple Watch Series 12",
      "Apple Watch Series 11",
      "Apple Watch Series 10",
      "Apple Watch Series 9",
      "Apple Watch Series 8",
      "Apple Watch Series 7",
      "Apple Watch Series 6",
    ],
  },
  {
    series: "Apple Watch Ultra",
    models: ["Apple Watch Ultra 4", "Apple Watch Ultra 3", "Apple Watch Ultra 2", "Apple Watch Ultra"],
  },
  {
    series: "Apple Watch SE",
    models: ["Apple Watch SE 3", "Apple Watch SE（第2世代）", "Apple Watch SE（第1世代）"],
  },
];

/** Apple Watch の機種別ページを持つ全モデル */
export const WATCH_MODELS = WATCH_CATALOG.flatMap((s) => s.models);

export const WATCH_INFO: Record<string, WatchInfo> = {
  "Apple Watch Series 12": info("Series", [42, 46], true, ["A3581", "A3584"], ["A3582", "A3587"]),
  "Apple Watch Series 11": info("Series", [42, 46], true, ["A3331", "A3333"], ["A3335", "A3337"]),
  "Apple Watch Series 10": info("Series", [42, 46], true, ["A2997", "A2999"], ["A3001", "A3003"]),
  "Apple Watch Series 9": info("Series", [41, 45], true, ["A2978", "A2980"], ["A2982", "A2984"]),
  "Apple Watch Series 8": info("Series", [41, 45], false, ["A2770", "A2771"], ["A2772", "A2774"]),
  "Apple Watch Series 7": info("Series", [41, 45], false, ["A2473", "A2474"], ["A2475", "A2477"]),
  "Apple Watch Series 6": info("Series", [40, 44], false, ["A2291", "A2292"], ["A2293", "A2294"]),
  "Apple Watch Ultra 4": info("Ultra", [49], true, [], ["A3579"]),
  "Apple Watch Ultra 3": info("Ultra", [49], true, [], ["A3281"]),
  "Apple Watch Ultra 2": info("Ultra", [49], true, [], ["A2986"]),
  "Apple Watch Ultra": info("Ultra", [49], false, [], ["A2622"]),
  "Apple Watch SE 3": info("SE", [40, 44], true, ["A3324", "A3325"], ["A3326", "A3328"]),
  "Apple Watch SE（第2世代）": info("SE", [40, 44], false, ["A2722", "A2723"], ["A2726", "A2727"]),
  "Apple Watch SE（第1世代）": info("SE", [40, 44], false, ["A2351", "A2352"], ["A2353", "A2354"]),
};

export const isWatch = (model: string) => /^Apple Watch/.test(model);

/** watchOS 27 に対応する機種か（Apple 公式 apple.com/jp/watchos/） */
export const isWatchOS27 = (model: string) => WATCH_INFO[model]?.watchOS27 === true;

/** watchOS 27 に対応する機種を使うのに必要な iPhone（Apple 公式） */
export const WATCHOS27_IPHONE = "iOS 27 の iPhone 11 以降、または iPhone SE（第2世代以降）";

/** 絞り込みに並べるケースのサイズ（mm） */
export const WATCH_SIZE_OPTIONS = [40, 41, 42, 44, 45, 46, 49];

/** 通信方式の表示（DB の carrier の値と同じ） */
export const WATCH_CARRIERS: WatchCarrier[] = ["GPS", "GPS+Cellular"];

// 通信方式の表記ゆれ: GPS / GPSモデル / Cellular / セルラー / GPS + Cellular / GPS+Cellularモデル / LTE
const CELLULAR_RE = /Cellular|セルラー|LTE/i;

// アクセサリ（バンド単体・充電器・ケース・保護フィルムなど）。世代・サイズ・通信方式がそろわないものは、これに当たらなくても落ちる
const ACCESSORY_RE = /フィルム|保護|ガラス|充電器|充電ケーブル|充電スタンド|チャージャー|ドック|交換用|互換|カバー|ベルト|ストラップ|バンド単体|バンドのみ|ケース単体|スタンド/;

const MATERIALS: [RegExp, string][] = [
  [/アルミニウム|アルミ/, "アルミニウム"],
  [/チタニウム|チタン/, "チタニウム"],
  [/ステンレススチール|ステンレス/, "ステンレススチール"],
  [/セラミック/, "セラミック"],
];

/** 商品名のモデル番号（A + 4桁）→ 機種・通信方式。公式の表にあるものだけ */
const BY_A_NUMBER = new Map<string, { model: string; carrier: WatchCarrier }>();
for (const [model, i] of Object.entries(WATCH_INFO)) {
  for (const a of i.gps) BY_A_NUMBER.set(a, { model, carrier: "GPS" });
  for (const a of i.cell) BY_A_NUMBER.set(a, { model, carrier: "GPS+Cellular" });
}

/** 商品名の世代の読み取り（Series 6〜12・Ultra・SE の3つ）。範囲外（Series 5 以前）・決められないものは null */
function modelFromName(t: string): string | null {
  const series = t.match(/Series\s*(\d{1,2})(?!\d)/i);
  if (series) {
    const name = `Apple Watch Series ${series[1]}`;
    return name in WATCH_INFO ? name : null;
  }
  const ultra = t.match(/(?<![A-Za-z])Ultra(?:\s*([2-4])(?![\dヶ個年]))?/i);
  if (ultra) return ultra[1] ? `Apple Watch Ultra ${ultra[1]}` : "Apple Watch Ultra";
  const se = t.match(/(?<![A-Za-z])SE(?![A-Za-z])(?:\s*\(?\s*第\s*([123])\s*世代\)?|\s*([123])(?![\dヶ個年か]))?/);
  if (se) {
    const gen = se[1] ?? se[2];
    if (gen === "3") return "Apple Watch SE 3";
    if (gen === "2") return "Apple Watch SE（第2世代）";
    if (gen === "1") return "Apple Watch SE（第1世代）";
    return null; // 世代が書かれていない SE（モデル番号で決められなければ決めない）
  }
  return null;
}

/** 色と素材（「スターライト アルミニウム」「エルメス シルバー ステンレススチール」）。読めなければ "-" */
function colorOf(t: string, mmEnd: number): string {
  // イオシス: 【スターライトアルミニウムケース/スターライトスポーツバンド(M/L)】のケース側
  const iosys = t.match(/【([^】]*ケース[^】]*)】/);
  // ゲオ: [40mm/GPS]アルミ レッド Apple Watch
  const geo = t.match(/\[[^\]]*\d{2}mm[^\]]*\]([^[]*)/);
  let seg = iosys ? iosys[1] : geo ? geo[1] : t.slice(mmEnd);
  // バンドの色は読まない（ケースの後ろ・「/」の後ろ）
  seg = seg.split(/ケース|\/|【|\(|バンド|Apple Watch/)[0];
  let material = "";
  for (const [re, name] of MATERIALS) {
    if (!material && re.test(seg)) material = name;
    seg = seg.replace(new RegExp(re.source, "g"), " ");
  }
  seg = seg.replace(/セルラー|モデル|アップル|ウォッチ/g, " ");
  // 色はカタカナだけの語（スペースグレイ・ミッドナイト）。型番・容量・通信方式の英数字は読まない
  const color = seg.split(/\s+/).filter((w) => /^[ァ-ヶー]+$/.test(w)).join(" ");
  const brand = /Hermes|Hermès|エルメス/i.test(t) ? "エルメス" : /Nike/i.test(t) ? "Nike" : /Edition|エディション/i.test(t) ? "エディション" : "";
  return [brand, color, material].filter(Boolean).join(" ") || "-";
}

export type ParsedWatch = { modelName: string; size: number; carrier: WatchCarrier; color: string };

/**
 * 商品名から Apple Watch の世代・ケースのサイズ（mm）・通信方式・色を決める。
 * 世代・サイズ（mm）・通信方式がそろわないもの（アクセサリ・Series 5 以前・サイズが複数のまとめ売り・世代が分からない SE）は null。
 * 機種は名前で決め、商品名にモデル番号（公式の表にある A 番号）があれば突き合わせる（食い違うものは null。名前に世代がない SE は番号で決める）。
 * Ultra は Cellular モデルだけなので、通信方式が書かれていなくても GPS+Cellular
 */
export function parseWatch(title: string): ParsedWatch | null {
  const t = title.normalize("NFKC");
  if (!/Apple\s?Watch/i.test(t) || ACCESSORY_RE.test(t)) return null;

  // サイズ（mm）はちょうど1種類
  const sizes = [...new Set([...t.matchAll(/(?<!\d)(\d{2})\s*mm/gi)].map((m) => Number(m[1])))];
  if (sizes.length !== 1) return null;
  const mmMatch = t.match(/(?<!\d)\d{2}\s*mm/i)!;
  const size = sizes[0];

  const aNumbers = [...t.matchAll(/(?<![A-Za-z0-9])(A\d{4})(?!\d)/g)].map((m) => BY_A_NUMBER.get(m[1])).filter((x) => x !== undefined);
  const byName = modelFromName(t);
  const byNumber = aNumbers[0];
  if (byNumber && aNumbers.some((a) => a.model !== byNumber.model)) return null;
  // 名前から世代を決められない SE の見分けにはモデル番号を使う。Series 5 以前（名前で範囲外）は番号があっても決めない（表にない）
  if (byName && byNumber && byName !== byNumber.model) return null;
  const seWithoutGeneration = byName === null && /(?<![A-Za-z])SE(?![A-Za-z])/.test(t) && !/Series\s*\d|Ultra/i.test(t);
  const modelName = byName ?? (seWithoutGeneration && byNumber && WATCH_INFO[byNumber.model].family === "SE" ? byNumber.model : null);
  if (!modelName) return null;
  const i = WATCH_INFO[modelName];
  if (!i.sizes.includes(size)) return null;

  const named: WatchCarrier | null = CELLULAR_RE.test(t) ? "GPS+Cellular" : /GPS/i.test(t) ? "GPS" : null;
  if (named && byNumber && named !== byNumber.carrier) return null;
  const carrier = named ?? byNumber?.carrier ?? (i.cellularOnly ? "GPS+Cellular" : null);
  if (!carrier || (i.cellularOnly && carrier === "GPS")) return null;

  return { modelName, size, carrier, color: colorOf(t, (mmMatch.index ?? 0) + mmMatch[0].length) };
}

/** 商品名から機種名だけ決める（決められなければ null） */
export const canonicalWatchModel = (title: string): string | null => parseWatch(title)?.modelName ?? null;
