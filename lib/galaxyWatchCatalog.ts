import { ACCESSORY_RE } from "@/lib/watchCatalog";

/**
 * Samsung Galaxy Watch のカタログ（機種別ページ /galaxy-watch/[slug]・検索の機種照合・商品名の読み取りで共有する）。2026-11-13〜
 *
 * 機種名は頭に "Samsung " を付ける（"Samsung Galaxy Watch7"。Samsung 公式の製品ページの題も「Samsung Galaxy Watch9 40mm」）。
 * スマホの Galaxy は機種名の頭の "Galaxy" で見分けている（DB の startsWith・lib/shops.ts・lib/searchData.ts など）ので、
 * 時計が "Galaxy" で始まると /galaxy の一覧・店の数・検索に混ざる。Xiaomi の Redmi・POCO を "Xiaomi " 始まりにしたのと同じ考え方。
 *
 * 載せるのは Galaxy Watch4 以降で、楽天の店（じゃんぱら・イオシス）に中古在庫が出ているもの（2026-11-13 に店内検索で確認）。
 * Watch3 以前・Watch FE・Active・Fit は載せない。
 *
 * 出典（2026-11-13 に確認。どれも Samsung 日本の公式）:
 *   - 製品の一覧 https://www.samsung.com/jp/watches/all-watches/（Watch9・Watch8・Watch8 Classic・Watch Ultra2・Watch Ultra (2025)）
 *   - 型番ごとのサポートページ https://www.samsung.com/jp/support/model/<型番>/ の題
 *     （例 SM-L300NZEJXJP →「Galaxy Watch7 (Bluetooth, 40 mm)」、SM-L705FZB5SJP →「Galaxy Watch Ultra (2025) (LTE, 47 mm)」）。
 *     型番の一覧は https://www.samsung.com/jp/support/sitemap.xml。ケースのサイズ（mm）・通信方式（Bluetooth／LTE）・型番の頭（SM-L300 など）はこの題のとおり
 * 入れていない項目（公式で確かめられなかった）: 発売年月（Samsung Newsroom 日本は機械からの読み取りを断るので開けていない）・OS の更新の期限・
 *   Galaxy Watch4 Classic の 42mm（SM-R880 の題は「Galaxy Watch4 Classic」だけでサイズがない。46mm は SM-R890 の題で確認）。
 * 日本で売られていない組み合わせ（Watch6 Classic・Watch5 Pro の LTE など）は carriers に入れず、商品名がそうなら行にしない。
 *
 * 1機種＝1ページ。DB では modelName＝機種、storage＝ケースのサイズ（mm）、carrier＝通信方式（"Bluetooth" か "LTE"）。Apple Watch（lib/watchCatalog.ts）と同じ持ち方
 */

export type GalaxyWatchCarrier = "Bluetooth" | "LTE";

type Code = { size?: number; carrier: GalaxyWatchCarrier };

type GalaxyWatchInfo = {
  /** ケースのサイズ（mm。型番ごとのサポートページの題） */
  sizes: number[];
  /** 日本で売られている通信方式（同上） */
  carriers: GalaxyWatchCarrier[];
  /** 型番の頭（"L300"＝SM-L300N…）→ サイズ・通信方式。読み取りの補助（画面には出さない） */
  codes: Record<string, Code>;
};

const BT: GalaxyWatchCarrier = "Bluetooth";
const LTE: GalaxyWatchCarrier = "LTE";

/** 系統ごと・新しい順 */
export const GALAXY_WATCH_CATALOG = [
  {
    series: "Galaxy Watch",
    models: [
      "Samsung Galaxy Watch9",
      "Samsung Galaxy Watch8",
      "Samsung Galaxy Watch7",
      "Samsung Galaxy Watch6",
      "Samsung Galaxy Watch5",
      "Samsung Galaxy Watch4",
    ],
  },
  {
    series: "Galaxy Watch Ultra",
    models: ["Samsung Galaxy Watch Ultra2", "Samsung Galaxy Watch Ultra (2025)", "Samsung Galaxy Watch Ultra"],
  },
  {
    series: "Galaxy Watch Classic・Pro",
    models: ["Samsung Galaxy Watch8 Classic", "Samsung Galaxy Watch6 Classic", "Samsung Galaxy Watch5 Pro", "Samsung Galaxy Watch4 Classic"],
  },
];

/** Galaxy Watch の機種別ページを持つ全モデル */
export const GALAXY_WATCH_MODELS = GALAXY_WATCH_CATALOG.flatMap((s) => s.models);

const ULTRA = "Samsung Galaxy Watch Ultra";
const ULTRA_2025 = "Samsung Galaxy Watch Ultra (2025)";

export const GALAXY_WATCH_INFO: Record<string, GalaxyWatchInfo> = {
  "Samsung Galaxy Watch9": { sizes: [40, 44], carriers: [BT, LTE], codes: { L340: { size: 40, carrier: BT }, L350: { size: 44, carrier: BT }, L345: { size: 40, carrier: LTE }, L355: { size: 44, carrier: LTE } } },
  "Samsung Galaxy Watch8": { sizes: [40, 44], carriers: [BT, LTE], codes: { L320: { size: 40, carrier: BT }, L330: { size: 44, carrier: BT }, L325: { size: 40, carrier: LTE }, L335: { size: 44, carrier: LTE } } },
  "Samsung Galaxy Watch7": { sizes: [40, 44], carriers: [BT, LTE], codes: { L300: { size: 40, carrier: BT }, L310: { size: 44, carrier: BT }, L305: { size: 40, carrier: LTE }, L315: { size: 44, carrier: LTE } } },
  // SM-R935F・R945F は au の型番の題が「(LTE, 40 mm) (キャリア販売モデル)」。docomo の型番（…ADCM）の題は「(Bluetooth, 40 mm)」だが、同じ SM-R935F なので LTE として読む
  "Samsung Galaxy Watch6": { sizes: [40, 44], carriers: [BT, LTE], codes: { R930: { size: 40, carrier: BT }, R940: { size: 44, carrier: BT }, R935: { size: 40, carrier: LTE }, R945: { size: 44, carrier: LTE } } },
  "Samsung Galaxy Watch5": { sizes: [40, 44], carriers: [BT, LTE], codes: { R900: { size: 40, carrier: BT }, R910: { size: 44, carrier: BT }, R905: { size: 40, carrier: LTE }, R915: { size: 44, carrier: LTE } } },
  // SM-R870 の題は「Galaxy Watch4」だけ（サイズは商品名から読む。44mm は SM-R875F「Galaxy Watch4 LTE 44mm」で確認）
  "Samsung Galaxy Watch4": { sizes: [40, 44], carriers: [BT, LTE], codes: { R860: { size: 40, carrier: BT }, R870: { carrier: BT }, R865: { size: 40, carrier: LTE }, R875: { size: 44, carrier: LTE } } },
  "Samsung Galaxy Watch Ultra2": { sizes: [47], carriers: [LTE], codes: { L715: { size: 47, carrier: LTE } } },
  // Ultra と Ultra (2025) は型番の頭が同じ SM-L705F。色の後ろの1文字で分かれる（…ZB5SJP＝2025、…DAJSJP＝2024。ultraYearOf）
  [ULTRA_2025]: { sizes: [47], carriers: [LTE], codes: {} },
  [ULTRA]: { sizes: [47], carriers: [LTE], codes: {} },
  "Samsung Galaxy Watch8 Classic": { sizes: [46], carriers: [BT, LTE], codes: { L500: { size: 46, carrier: BT }, L505: { size: 46, carrier: LTE } } },
  "Samsung Galaxy Watch6 Classic": { sizes: [43, 47], carriers: [BT], codes: { R950: { size: 43, carrier: BT }, R960: { size: 47, carrier: BT } } },
  "Samsung Galaxy Watch5 Pro": { sizes: [45], carriers: [BT], codes: { R920: { size: 45, carrier: BT } } },
  // 42mm（SM-R880）は公式の題にサイズがないので sizes に入れない（42mm の商品は行にしない）
  "Samsung Galaxy Watch4 Classic": { sizes: [46], carriers: [BT], codes: { R890: { size: 46, carrier: BT }, R880: { carrier: BT } } },
};

export const isGalaxyWatch = (model: string) => /^Samsung Galaxy Watch/.test(model);

/** 絞り込みに並べるケースのサイズ（mm）・通信方式（DB の carrier の値と同じ） */
export const GALAXY_WATCH_SIZE_OPTIONS = [40, 43, 44, 45, 46, 47];
export const GALAXY_WATCH_CARRIERS: GalaxyWatchCarrier[] = [BT, LTE];

/** 出典（機種ページ・一覧の注記） */
export const GALAXY_WATCH_SOURCE = { name: "Samsung 公式（製品の一覧・型番ごとのサポートページ）", url: "https://www.samsung.com/jp/watches/all-watches/" };

/** 型番の頭 → 機種・サイズ・通信方式（Ultra の SM-L705 は年で分かれるので別に扱う） */
const BY_CODE = new Map<string, { model: string } & Code>();
for (const [model, i] of Object.entries(GALAXY_WATCH_INFO)) {
  for (const [base, c] of Object.entries(i.codes)) BY_CODE.set(base, { model, ...c });
}

// 日本向けの型番の末尾（SIM フリー・au・docomo・SoftBank・UQ）。これ以外（…BRI・…XSG など）は海外版
const JP_REGIONS = new Set(["XJP", "SJP", "KDI", "DCM", "SBM", "UQM"]);

// 型番: SM- ＋ 頭（L300）＋ N（Bluetooth）か F（LTE）＋ 色2文字 ＋ 1文字 ＋ 販路3文字。店によっては頭だけ（SM-L325F）
const CODE_RE = /SM-([RL]\d{3})[NF]?(?:[A-Z]{2}([A-Z0-9])([A-Z]{3}))?(?![A-Za-z0-9])/g;

// 付属品・欠品のある個体（「専用充電ケーブル欠品」「充電ホルダー欠品」）・対応品。Apple Watch と同じ語（ACCESSORY_RE）に、英語の表記を足す
const NOT_WATCH_RE = /欠品|対応|CASE|Charger|Dock|Watch\s*Band/i;

/** 色（カタカナの語）。じゃんぱらは [チタニウム シルバー]、イオシスは型番の前後に書く。読めなければ "-" */
function colorOf(t: string): string {
  const bracket = t.match(/\[([^\]]*[ァ-ヶ][^\]]*)\]/);
  const seg = (bracket ? bracket[1] : t.replace(/【[^】]*】/g, " ")).replace(/モデル|バンド無し?|アルミニウム|アルミ|イオシス/g, " ");
  const words = seg.split(/[\s/]+/).filter((w) => /^[ァ-ヶー]+$/.test(w));
  if (words.length === 0) return "-";
  // 「チタニウム シルバー」は1語に（イオシスの「チタニウムシルバー」と同じ表記にそろえる）
  return words[0] === "チタニウム" && words.length > 1 ? words.slice(0, 2).join("") : words[0];
}

export type ParsedGalaxyWatch = { modelName: string; size: number; carrier: GalaxyWatchCarrier; color: string };

/**
 * 商品名から Galaxy Watch の機種・ケースのサイズ（mm）・通信方式・色を決める。そろわないものは null（行にしない）:
 * カタログ外（初代・Watch3・FE・Active）・海外版・付属品・欠品のある個体・サイズが2つ書かれたもの・通信方式が名前にも型番にもないもの・
 * 名前と型番が食い違うもの・日本で売られていない組み合わせ（Watch6 Classic の LTE など）・年が分からない Galaxy Watch Ultra。
 * 機種は名前で決め、型番（SM-L300 など。公式のサポートページにあるもの）があれば突き合わせる。サイズ・通信方式が名前にないときは型番で補う
 */
export function parseGalaxyWatch(title: string): ParsedGalaxyWatch | null {
  const t = title.normalize("NFKC");
  if (!/Galaxy\s?Watch/i.test(t) || ACCESSORY_RE.test(t) || NOT_WATCH_RE.test(t) || /海外/.test(t)) return null;

  // 型番（複数あって頭が食い違うものは決めない。日本向けでない末尾は海外版）
  const codes = [...t.matchAll(CODE_RE)];
  if (codes.some((c) => c[3] && !JP_REGIONS.has(c[3]))) return null;
  const bases = [...new Set(codes.map((c) => c[1]))];
  if (bases.length > 1) return null;
  const base = bases[0];
  const code = base ? BY_CODE.get(base) : undefined;

  // 名前: 「Galaxy Watch7」「Galaxy Watch6 Classic」「Galaxy Watch5 Pro」「Galaxy Watch Ultra2」「Galaxy Watch Ultra (2025)」。
  // 数字の後ろが数字・mm のもの（初代の「Galaxy Watch 46mm」）は世代として読まない
  const m = t.match(/Galaxy\s?Watch\s?(?:(Ultra)\s?(2(?![\d)]))?|(\d)(?![\d]|\s?mm)\s?(Classic|Pro)?)/i);
  if (!m) return null;
  let modelName: string;
  if (m[1]) {
    if (m[2]) modelName = "Samsung Galaxy Watch Ultra2";
    else {
      // 年は名前の (2024)／(2025) か、型番の色の後ろの1文字（5＝2025、J＝2024）。どちらもなければ決めない
      const named = t.match(/Ultra\s*\(?\s*(2024|2025)\s*\)?/i)?.[1];
      const marks = base === "L705" ? [...new Set(codes.map((c) => c[2]).filter(Boolean))] : [];
      if (marks.length > 1) return null;
      const coded = marks[0] === "5" ? "2025" : marks[0] === "J" ? "2024" : undefined;
      if (named && coded && named !== coded) return null;
      const year = named ?? coded;
      if (!year) return null;
      modelName = year === "2025" ? ULTRA_2025 : ULTRA;
    }
  } else {
    const variant = m[4] ? ` ${m[4][0].toUpperCase()}${m[4].slice(1).toLowerCase()}` : "";
    modelName = `Samsung Galaxy Watch${m[3]}${variant}`;
  }
  const info = GALAXY_WATCH_INFO[modelName];
  if (!info) return null;
  // 型番が別の機種のもの（Ultra の2つは頭が同じ SM-L705。ほかの機種の名前に SM-L705 が付いていれば食い違い）
  if (code && code.model !== modelName) return null;
  if (base === "L705" && modelName !== ULTRA && modelName !== ULTRA_2025) return null;

  // サイズ（mm）: 名前にちょうど1種類。なければ型番、それもなければ1サイズだけの機種はそのサイズ
  const named = [...new Set([...t.matchAll(/(?<!\d)(\d{2})\s*mm/gi)].map((x) => Number(x[1])))];
  if (named.length > 1) return null;
  if (named.length === 1 && code?.size && named[0] !== code.size) return null;
  const size = named[0] ?? code?.size ?? (info.sizes.length === 1 ? info.sizes[0] : undefined);
  if (!size || !info.sizes.includes(size)) return null;

  // 通信方式: 「LTE/Bluetoothモデル」「LTEモデル」は LTE、「Wi-Fi/Bluetoothモデル」「Bluetoothモデル」は Bluetooth。名前になければ型番
  const namedCarrier: GalaxyWatchCarrier | null = /LTE/i.test(t) ? LTE : /Bluetooth|Wi-?Fi/i.test(t) ? BT : null;
  if (namedCarrier && code && namedCarrier !== code.carrier) return null;
  // Ultra の3機種は LTE だけ（名前に書かれていなくても LTE。Apple Watch Ultra と同じ扱い）。ほかは名前か型番に通信方式があるものだけ
  const carrier = namedCarrier ?? code?.carrier ?? (m[1] ? LTE : null);
  if (!carrier || !info.carriers.includes(carrier)) return null;

  return { modelName, size, carrier, color: colorOf(t.replace(CODE_RE, " ")) };
}
