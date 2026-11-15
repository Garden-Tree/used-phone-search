/**
 * MacBook のカタログ（機種別ページ /mac/[slug]・検索の機種照合・商品名の読み取りで共有する予定）。2026-10-15〜
 * まだページは無い。この段階では「機種名の決め方」と「商品名からメモリ・SSD を読む関数」だけを置く。
 *
 * 載せるのは macOS 27 Golden Gate に対応する機種（Apple シリコンの MacBook Air・MacBook Pro 2020 以降と MacBook Neo）。
 * 2026-10-15 に Apple 公式で確認した:
 *   - MacBook Air の識別 https://support.apple.com/ja-jp/102869
 *   - MacBook Pro の識別 https://support.apple.com/ja-jp/108052（部品番号・モデル識別子・発売年）
 *   - macOS 27 の対応機種 https://www.apple.com/jp/os/macos/
 *   - MacBook Neo の仕様 https://www.apple.com/jp/macbook-neo/specs/（A18 Pro・8GB・256GB/512GB SSD・13.0インチ）
 * Intel 搭載機・無印 MacBook（12インチ）は載せない（macOS 27 の対象外）。
 *
 * 機種名（ページ単位）はチップまで分ける。Apple は Pro/Max を1つの識別名にまとめているが、価格帯が大きく違うため。
 * 注意:
 *   - 2023・2021 の 14／16 インチ Pro は公式ページの本文にチップの記載がなく、一般に M2 Pro/Max・M1 Pro/Max。
 *     Apple の技術仕様ページで要確認。
 *   - 公式の部品番号表にない後発の構成がある（例 MC7U4・MC7W4 = 2024 年の M2 Air 16GB 構成、MEQJ4 = M5 14インチの
 *     Nano-texture）。表にない型番は商品名の Air/Pro/Neo・画面サイズ・チップから決める（canonicalMacModel の (2)）。
 *   - MacBook Neo の部品番号は公式で未確認（商品名には MHFG4J/A・MHFC4J/A が出ている）→ 部品番号表には入れず「MacBook Neo」の文字で判定。
 */

import { toStorage } from "./rakutenCommon";

type MacInfo = {
  family: "Air" | "Pro" | "Neo";
  /** 画面サイズ（13／14／15／16 の呼び名） */
  inch: number;
  /** チップ（"M1"・"M3 Pro"・"A18 Pro"） */
  chip: string;
  /** 発売年（公式の識別ページの表記） */
  year: number;
  /** Apple の識別名。Pro/Max は1つにまとまっている */
  appleName: string;
  /** モデル識別子（Mac16,1 など）。Pro/Max が同じ識別名のときはグループ全体を持つ */
  machineIds: string[];
  /** 日本の部品番号の先頭5文字（MLXW3 など）。Pro/Max が同じ識別名のときは同じ表を共有する */
  partPrefixes: string[];
};

export const MAC_CATALOG = [
  { series: "MacBook Neo", models: ["MacBook Neo"] },
  {
    series: "M5",
    models: [
      "MacBook Pro 16インチ M5 Max",
      "MacBook Pro 16インチ M5 Pro",
      "MacBook Pro 14インチ M5 Max",
      "MacBook Pro 14インチ M5 Pro",
      "MacBook Pro 14インチ M5",
      "MacBook Air 15インチ M5",
      "MacBook Air 13インチ M5",
    ],
  },
  {
    series: "M4",
    models: [
      "MacBook Pro 16インチ M4 Max",
      "MacBook Pro 16インチ M4 Pro",
      "MacBook Pro 14インチ M4 Max",
      "MacBook Pro 14インチ M4 Pro",
      "MacBook Pro 14インチ M4",
      "MacBook Air 15インチ M4",
      "MacBook Air 13インチ M4",
    ],
  },
  {
    series: "M3",
    models: [
      "MacBook Pro 16インチ M3 Max",
      "MacBook Pro 16インチ M3 Pro",
      "MacBook Pro 14インチ M3 Max",
      "MacBook Pro 14インチ M3 Pro",
      "MacBook Pro 14インチ M3",
      "MacBook Air 15インチ M3",
      "MacBook Air 13インチ M3",
    ],
  },
  {
    series: "M2",
    models: [
      "MacBook Pro 16インチ M2 Max",
      "MacBook Pro 16インチ M2 Pro",
      "MacBook Pro 14インチ M2 Max",
      "MacBook Pro 14インチ M2 Pro",
      "MacBook Pro 13インチ M2",
      "MacBook Air 15インチ M2",
      "MacBook Air 13インチ M2",
    ],
  },
  {
    series: "M1",
    models: [
      "MacBook Pro 16インチ M1 Max",
      "MacBook Pro 16インチ M1 Pro",
      "MacBook Pro 14インチ M1 Max",
      "MacBook Pro 14インチ M1 Pro",
      "MacBook Pro 13インチ M1",
      "MacBook Air M1",
    ],
  },
];

/** MacBook の機種別ページを持つ全モデル（チップの世代ごとに新しい順） */
export const MAC_MODELS = MAC_CATALOG.flatMap((s) => s.models);

/**
 * Apple の識別名ごとのまとまり。chips が2つ以上あるものは Pro/Max が同じ部品番号表を共有する（商品名のチップ表記で分ける）。
 * prefixes は公式表の部品番号（先頭5文字）をそのまま写したもの。
 */
type Group = {
  family: "Air" | "Pro";
  inch: number;
  chips: string[];
  year: number;
  appleName: string;
  machineIds: string[];
  prefixes: string;
};

const GROUPS: Group[] = [
  // --- MacBook Air ---
  { family: "Air", inch: 15, chips: ["M5"], year: 2026, appleName: "MacBook Air（15-inch, M5）", machineIds: ["Mac17,4"], prefixes: "MDV94 MDVA4 MDVC4 MDVD4 MDVE4 MDVF4 MDVH4 MDVK4 MDVN4 MDVQ4 MDVT4 MDVU4" },
  { family: "Air", inch: 13, chips: ["M5"], year: 2026, appleName: "MacBook Air（13-inch, M5）", machineIds: ["Mac17,3"], prefixes: "MDH74 MDH84 MDHA4 MDHC4 MDHD4 MDHE4 MDHF4 MDHG4 MDHH4 MDHJ4 MDHK4" },
  { family: "Air", inch: 15, chips: ["M4"], year: 2025, appleName: "MacBook Air（15-inch, M4, 2025）", machineIds: ["Mac16,13"], prefixes: "MC6J4 MC6K4 MC6L4 MC7A4 MC7C4 MC7D4 MDG34 MDG84 MDG94 MW1G3 MW1H3 MW1J3 MW1K3 MW1L3 MW1M3" },
  { family: "Air", inch: 13, chips: ["M4"], year: 2025, appleName: "MacBook Air（13-inch, M4, 2025）", machineIds: ["Mac16,12"], prefixes: "MC654 MC6A4 MC6C4 MC6T4 MC6U4 MC6V4 MDG24 MDG54 MDG64 MW0W3 MW0X3 MW0Y3 MW103 MW123 MW133" },
  { family: "Air", inch: 15, chips: ["M3"], year: 2024, appleName: "MacBook Air（15-inch, M3, 2024）", machineIds: ["Mac15,13"], prefixes: "MRYM3 MRYP3 MRYR3 MRYU3 MRYN3 MRYQ3 MRYT3 MRYV3 MXD13 MXD23 MXD33 MXD43" },
  { family: "Air", inch: 13, chips: ["M3"], year: 2024, appleName: "MacBook Air（13-inch, M3, 2024）", machineIds: ["Mac15,12"], prefixes: "MRXN3 MRXQ3 MRXT3 MRXV3 MRXP3 MRXR3 MRXU3 MRXW3 MXCR3 MXCT3 MXCU3 MXCV3" },
  { family: "Air", inch: 15, chips: ["M2"], year: 2023, appleName: "MacBook Air（15-inch, M2, 2023）", machineIds: ["Mac14,15"], prefixes: "MQKP3 MQKQ3 MQKR3 MQKT3 MQKU3 MQKV3 MQKW3 MQKX3" },
  { family: "Air", inch: 13, chips: ["M2"], year: 2022, appleName: "MacBook Air（M2, 2022）", machineIds: ["Mac14,2"], prefixes: "MLXW3 MLXX3 MLXY3 MLY03 MLY13 MLY23 MLY33 MLY43" },
  { family: "Air", inch: 13, chips: ["M1"], year: 2020, appleName: "MacBook Air（M1, 2020）", machineIds: ["MacBookAir10,1"], prefixes: "MGN63 MGN93 MGND3 MGN73 MGNA3 MGNE3" },
  // --- MacBook Pro ---
  { family: "Pro", inch: 14, chips: ["M5 Pro", "M5 Max"], year: 2026, appleName: "MacBook Pro（14-inch, M5 Pro／M5 Max）", machineIds: ["Mac17,7", "Mac17,9"], prefixes: "MGDN4 MGDP4 MGDQ4 MGDR4 MGDT4 MGDU4" },
  { family: "Pro", inch: 16, chips: ["M5 Pro", "M5 Max"], year: 2026, appleName: "MacBook Pro（16-inch, M5 Pro／M5 Max）", machineIds: ["Mac17,6", "Mac17,8"], prefixes: "MGE44 MGE64 MGE74 MGE94 MGEA4 MGEC4 MGED4 MGEE4" },
  { family: "Pro", inch: 14, chips: ["M5"], year: 2025, appleName: "MacBook Pro（14-inch, M5）", machineIds: ["Mac17,2"], prefixes: "MDE04 MDE14 MDE34 MDE44 MDE54 MDE64" },
  { family: "Pro", inch: 14, chips: ["M4"], year: 2024, appleName: "MacBook Pro（14-inch, 2024）M4", machineIds: ["Mac16,1"], prefixes: "MCX04 MCX14 MW2U3 MW2V3 MW2W3 MW2X3 MXCM3 MXCN3" },
  { family: "Pro", inch: 14, chips: ["M4 Pro", "M4 Max"], year: 2024, appleName: "MacBook Pro（14-inch, 2024）M4 Pro／M4 Max", machineIds: ["Mac16,6", "Mac16,8"], prefixes: "MXE63 MX2E3 MX2F3 MX2G3 MX2H3 MX2J3 MX2K3" },
  { family: "Pro", inch: 16, chips: ["M4 Pro", "M4 Max"], year: 2024, appleName: "MacBook Pro（16-inch, 2024）M4 Pro／M4 Max", machineIds: ["Mac16,7", "Mac16,5"], prefixes: "MX2T3 MX2U3 MX2V3 MX2W3 MX2X3 MX2Y3 MX303 MX313" },
  { family: "Pro", inch: 14, chips: ["M3"], year: 2023, appleName: "MacBook Pro（14-inch, Nov 2023）M3", machineIds: ["Mac15,3"], prefixes: "MR7J3 MR7K3 MRX23 MTL73 MTL83 MTLC3 MXE03 MXE13" },
  { family: "Pro", inch: 14, chips: ["M3 Pro", "M3 Max"], year: 2023, appleName: "MacBook Pro（14-inch, Nov 2023）M3 Pro／M3 Max", machineIds: ["Mac15,6", "Mac15,8", "Mac15,10"], prefixes: "FRX33 FRX43 FRX54 FRX63 FRX73 FRX83 MRX33 MRX43 MRX53 MRX63 MRX73 MRX83" },
  { family: "Pro", inch: 16, chips: ["M3 Pro", "M3 Max"], year: 2023, appleName: "MacBook Pro（16-inch, Nov 2023）M3 Pro／M3 Max", machineIds: ["Mac15,7", "Mac15,9", "Mac15,11"], prefixes: "FRW13 FRW23 FRW33 FRW43 FRW63 FRW73 FUW63 FUW73 MRW13 MRW23 MRW33 MRW43 MRW63 MRW73" },
  // 2023・2021 の 14／16 インチは公式本文にチップの記載がない。一般に M2 Pro/Max・M1 Pro/Max（Apple の技術仕様ページで要確認）
  { family: "Pro", inch: 14, chips: ["M2 Pro", "M2 Max"], year: 2023, appleName: "MacBook Pro（14-inch, 2023）", machineIds: ["Mac14,5", "Mac14,9"], prefixes: "MPHE3 MPHF3 MPHG3 MPHH3 MPHJ3 MPHK3" },
  { family: "Pro", inch: 16, chips: ["M2 Pro", "M2 Max"], year: 2023, appleName: "MacBook Pro（16-inch, 2023）", machineIds: ["Mac14,6", "Mac14,10"], prefixes: "MNWG3 MNW93 MNWK3 MNWD3 MNWF3 MNW83 MNWJ3 MNWC3" },
  { family: "Pro", inch: 13, chips: ["M2"], year: 2022, appleName: "MacBook Pro（13-inch, M2, 2022）", machineIds: ["Mac14,7"], prefixes: "MNEH3 MNEJ3 MNEP3 MNEQ3" },
  { family: "Pro", inch: 14, chips: ["M1 Pro", "M1 Max"], year: 2021, appleName: "MacBook Pro（14-inch, 2021）", machineIds: ["MacBookPro18,3", "MacBookPro18,4"], prefixes: "MKGP3 MKGQ3 MKGR3 MKGT3" },
  { family: "Pro", inch: 16, chips: ["M1 Pro", "M1 Max"], year: 2021, appleName: "MacBook Pro（16-inch, 2021）", machineIds: ["MacBookPro18,1", "MacBookPro18,2"], prefixes: "MK183 MK193 MK1A3 MK1E3 MK1F3 MK1H3" },
  { family: "Pro", inch: 13, chips: ["M1"], year: 2020, appleName: "MacBook Pro（13-inch, M1, 2020）", machineIds: ["MacBookPro17,1"], prefixes: "MYD83 MYD92 MYDA2 MYDC2" },
];

const modelName = (family: "Air" | "Pro", inch: number, chip: string) =>
  family === "Air" && chip === "M1" ? "MacBook Air M1" : `MacBook ${family} ${inch}インチ ${chip}`;

export const MAC_INFO: Record<string, MacInfo> = {
  "MacBook Neo": {
    family: "Neo",
    inch: 13,
    chip: "A18 Pro",
    year: 2026,
    appleName: "MacBook Neo",
    machineIds: [],
    partPrefixes: [],
  },
};
// 識別名ごとの表 → 機種ごとの情報（Pro/Max は同じ表を共有する）
const GROUP_BY_PREFIX = new Map<string, Group>();
for (const g of GROUPS) {
  const prefixes = g.prefixes.split(" ");
  for (const chip of g.chips) {
    MAC_INFO[modelName(g.family, g.inch, chip)] = {
      family: g.family,
      inch: g.inch,
      chip,
      year: g.year,
      appleName: g.appleName,
      machineIds: g.machineIds,
      partPrefixes: prefixes,
    };
  }
  for (const p of prefixes) GROUP_BY_PREFIX.set(p, g);
}

/** Mac の機種か（MacBook と、2026-11-15〜の Mac デスクトップ。種類 /mac を決める） */
export const isMac = (model: string) => /^(?:MacBook|Mac mini|iMac|Mac Studio)/.test(model);

/** 掲載機種はすべて macOS 27 Golden Gate に対応（Intel は載せない） */
export const isMacOS27 = (model: string) => model in MAC_INFO;

const KNOWN = new Set(MAC_MODELS);

/** 商品名の部品番号（MLY33J/A・MGN63J／A・MK1A3JA/A・MYD82B/A・CTOMQKT3J/A）の先頭5文字。CTO 接頭辞は外す */
const PART_RE = /(?<![A-Za-z0-9])(?:CTO)?([A-Z][A-Z0-9]{4})(?:JA|J|B)?[／/]A(?![A-Za-z])/;

function partPrefixOf(title: string): string | null {
  const m = title.match(PART_RE);
  return m ? m[1] : null;
}

/** 画面サイズ（13.3・13.6 → 13 など）。商品名の最初の「○○インチ／○○-inch」 */
function inchOf(title: string): number | null {
  const m = title.match(/(\d{2}(?:\.\d)?)\s*(?:インチ|-?inch)/i);
  if (!m) return null;
  const n = Math.floor(Number(m[1]));
  return [13, 14, 15, 16].includes(n) ? n : null;
}

/** チップ（M1〜M5＋Pro/Max）。"M1 Pro" の Pro/Max は直後にあるときだけ */
function chipOf(title: string): string | null {
  const m = title.match(/(?<![A-Za-z0-9])M([1-5])(?:\s*(Pro|Max))?(?![A-Za-z0-9])/);
  return m ? `M${m[1]}${m[2] ? ` ${m[2]}` : ""}` : null;
}

/**
 * 商品名から機種名を決める。決められなければ null（Intel・無印 MacBook・アクセサリ・モニタ・Pro/Max が分からないもの）。
 *   (1) 部品番号（先頭5文字。F で始まる整備品は M に読み替える）で公式表を引く。表のグループに Pro/Max が混在するときは
 *       商品名のチップ表記で分ける。分けられなければ null。部品番号とタイトルのチップが食い違うときは部品番号を優先する。
 *   (2) 部品番号がない／表にないときは、商品名の Air/Pro/Neo・画面サイズ・チップから決める。
 */
export function canonicalMacModel(title: string): string | null {
  if (!/MacBook/i.test(title)) return null;
  // Intel（Core i5・Core m3）。公式表にない旧型番もここで落とす
  if (/Core[\s_]?(?:i\d|m\d)|Intel/i.test(title)) return null;

  // (1) 部品番号
  const part = partPrefixOf(title);
  if (part) {
    const g = GROUP_BY_PREFIX.get(part) ?? (part[0] === "F" ? GROUP_BY_PREFIX.get("M" + part.slice(1)) : undefined);
    if (g) {
      if (g.chips.length === 1) return modelName(g.family, g.inch, g.chips[0]);
      const c = chipOf(title);
      return c && g.chips.includes(c) ? modelName(g.family, g.inch, c) : null;
    }
  }

  // (2) 商品名の文字
  if (/MacBook\s*Neo/i.test(title)) return "MacBook Neo";
  const fam = title.match(/MacBook\s*(Air|Pro)/i);
  if (!fam) return null;
  const family = fam[1].toLowerCase() === "air" ? "Air" : "Pro";
  const chip = chipOf(title);
  if (!chip) return null;
  const inch = inchOf(title);
  let name: string;
  if (family === "Air" && chip === "M1") name = "MacBook Air M1";
  else if (inch === null) return null;
  else name = modelName(family, inch, chip);
  return KNOWN.has(name) ? name : null;
}

/**
 * メモリと SSD（GB）。単位は rakutenCommon の toStorage に合わせる（1TB = 1024GB）。
 * 商品名の「数字＋GB/G/TB/T」を出てくる順に読み、1つ目をメモリ・2つ目を SSD とする（イオシス・じゃんぱら・ソフマップ共通）。
 * 2つ読めないとき（ゲオは部品番号と年のみ）や値が常識外のときは null。GHz は拾わない。
 */
export function parseMacSpec(title: string, maxMemoryGB = 192): { memoryGB: number | null; ssdGB: number | null } {
  const toks = [...title.matchAll(/(?<![\d.])(\d{1,4})\s*(GB|TB|G|T)(?![A-Za-z0-9])/g)];
  if (toks.length < 2) return { memoryGB: null, ssdGB: null };
  const mem = toStorage(toks[0][1], toks[0][2].startsWith("T") ? "TB" : "GB");
  const ssd = toStorage(toks[1][1], toks[1][2].startsWith("T") ? "TB" : "GB");
  return {
    memoryGB: mem >= 8 && mem <= maxMemoryGB ? mem : null,
    ssdGB: ssd >= 128 ? ssd : null,
  };
}

// ---------------------------------------------------------------------------
// Mac デスクトップ（Mac mini・iMac・Mac Studio。2026-11-15〜・ブランチ add-mac-desktop）
// ---------------------------------------------------------------------------
/*
 * 載せるのは macOS 27 Golden Gate に対応する機種だけ（Apple 公式「macOS」https://www.apple.com/jp/os/macos/ の対応機種:
 * 「Appleシリコン搭載iMac（2021以降）」「Appleシリコン搭載Mac mini（2020以降）」「Mac Studio（2022以降）」。2026-11-15 確認）。
 * Intel 搭載の Mac mini・iMac・iMac Pro は載せない。Mac Pro は在庫がほぼないので載せない。
 * 部品番号・発売年は Apple 公式の識別ページの値をそのまま写した（2026-11-15 確認）:
 *   - Mac mini の識別 https://support.apple.com/ja-jp/102852
 *   - iMac の識別 https://support.apple.com/ja-jp/108054
 *   - Mac Studio の識別 https://support.apple.com/ja-jp/102231
 * チップは識別ページの名前（「Mac mini（M6）」「iMac（24インチ, M3, 2023）」など）と技術仕様のページで確かめた:
 *   - Mac mini (2024) は M4／M4 Pro https://support.apple.com/ja-jp/121555 （部品番号表は2つを分けていない → 商品名のチップで分ける）
 *   - iMac (24インチ, 2024) は M4 https://support.apple.com/ja-jp/121556 ・iMac (24インチ, M6) https://support.apple.com/ja-jp/148298
 *   - Mac mini（M6またはM5 Pro） https://support.apple.com/ja-jp/128108 ・Mac Studio（M5 MaxまたはM5 Ultra） https://support.apple.com/ja-jp/128107
 * 注意:
 *   - iMac (24インチ, 2024, Two ports) の表の「MWUPxx/A」は公式の表記のまま（3 が抜けている）。表に入れず、商品名の文字で決める
 *   - Mac Studio (2022, M1 Max) の部品番号は公式の表記どおり MJMV2（M1 Ultra は MJMW3）
 */

type DesktopFamily = "mini" | "iMac" | "Studio";

export type MacDesktopInfo = {
  family: DesktopFamily;
  /** チップ（"M4"・"M4 Pro"・"M2 Ultra"） */
  chip: string;
  /** 発売年（公式の識別ページの表記） */
  year: number;
  /** Apple の識別名 */
  appleName: string;
  /** 公式の識別ページ（出典） */
  source: string;
};

const DESKTOP_SOURCE: Record<DesktopFamily, string> = {
  mini: "https://support.apple.com/ja-jp/102852",
  iMac: "https://support.apple.com/ja-jp/108054",
  Studio: "https://support.apple.com/ja-jp/102231",
};

const desktopName = (family: DesktopFamily, chip: string) =>
  family === "mini" ? `Mac mini ${chip}` : family === "iMac" ? `iMac ${chip}` : `Mac Studio ${chip}`;

type DesktopGroup = { family: DesktopFamily; chips: string[]; year: number; appleName: string; prefixes: string };

// 並びは新しい順（同じ年は上位のチップが先）。M4／M4 Pro のように1つの表に2つのチップがあるときは chips の逆順で並べる
const DESKTOP_GROUPS: DesktopGroup[] = [
  // --- Mac mini ---
  { family: "mini", chips: ["M6"], year: 2026, appleName: "Mac mini（M6）", prefixes: "MHQK4 MHQL4 MHQM4 MHQV4" },
  { family: "mini", chips: ["M5 Pro"], year: 2026, appleName: "Mac mini（M5 Pro）", prefixes: "MHQN4 MHQU4" },
  { family: "mini", chips: ["M4", "M4 Pro"], year: 2024, appleName: "Mac mini (2024)", prefixes: "MCX44 MCYT4 MDAP4 MDAQ4 MDAY4 MU9D3 MU9E3" },
  { family: "mini", chips: ["M2 Pro"], year: 2023, appleName: "Mac mini (2023) M2 Pro", prefixes: "MNH73" },
  { family: "mini", chips: ["M2"], year: 2023, appleName: "Mac mini (2023) M2", prefixes: "MMFJ3 MMFK3" },
  { family: "mini", chips: ["M1"], year: 2020, appleName: "Mac mini (M1, 2020)", prefixes: "MGNR3 MGNT3" },
  // --- iMac（すべて 24インチ） ---
  { family: "iMac", chips: ["M6"], year: 2026, appleName: "iMac（24-inch, M6）", prefixes: "MH114 MH154 MH164 MH174 MH184 MH194 MH1D4 MH1F4 MH1G4 MH1H4 MH1J4 MH1N4 MH1P4 MH1Q4 MH1R4 MH1W4 MH1X4 MH204 MH214 MH224 MH234 MH244 MH254 MH264 MH274 MH284 MH294 MH2A4 MH2C4 MH2D4 MH2E4 MH2F4 MH2G4 MH2H4 MH2J4 MH2K4 MH2L4 MH2M4 MH2N4 MH2P4 MH2Q4 MH2T4 MH2U4 MH2V4 MH2W4 MH2X4 MH2Y4 MH064 MH074 MH084 MH094 MH0A4 MH0D4 MH0F4 MH0G4 MH0J4 MH0M4 MH0Q4 MH0U4 MH0V4 MH0W4 MH0X4 MH104" },
  { family: "iMac", chips: ["M4"], year: 2024, appleName: "iMac（24-inch, 2024）", prefixes: "MCR24 MD2P4 MD2Q4 MD2T4 MD2U4 MD2V4 MD2W4 MD2X4 MD2Y4 MD3A4 MD3D4 MD3E4 MD3F4 MD3G4 MD3H4 MWUU3 MWUV3 MWUW3 MWUX3 MWUY3 MWV03 MWV13 MWV33 MWV43 MWV53 MWV63 MWV73 MWV83 MWV93 MWVA3 MWVC3 MWVD3 MWVE3 MWVF3 MWVG3 MWVH3 MWVJ3 MWVK3 MWVL3 MWVN3 MWVP3 MWVQ3 MWVR3 MWUD3 MWUE3 MWUF3 MWUG3 MWUH3 MWUJ3 MWUK3 MWUL3 MWUN3 MWUQ3 MWUR3 MWUT3" },
  { family: "iMac", chips: ["M3"], year: 2023, appleName: "iMac（24-inch, M3, 2023）", prefixes: "MQRJ3 MQRK3 MQRL3 MQRM3 MQRN3 MQRP3 MQRQ3 MQRR3 MQRT3 MQRU3 MQRV3 MQRW3 MQRX3 MQRY3 MQR93 MQRA3 MQRC3 MQRD3" },
  { family: "iMac", chips: ["M1"], year: 2021, appleName: "iMac（24-inch, M1, 2021）", prefixes: "MGPC3 MGPD3 MGPF3 MGPG3 MGPH3 MGPJ3 MGPK3 MGPL3 MGPM3 MGPN3 MGPP3 MGPQ3 MGPR3 MGPT3 MGTF3 MJV83 MJV93 MJVA3" },
  // --- Mac Studio ---
  { family: "Studio", chips: ["M5 Ultra"], year: 2026, appleName: "Mac Studio（M5 Ultra）", prefixes: "MHL74" },
  { family: "Studio", chips: ["M5 Max"], year: 2026, appleName: "Mac Studio（M5 Max）", prefixes: "MHL64" },
  { family: "Studio", chips: ["M3 Ultra"], year: 2025, appleName: "Mac Studio (2025) M3 Ultra", prefixes: "MU973" },
  { family: "Studio", chips: ["M4 Max"], year: 2025, appleName: "Mac Studio (2025) M4 Max", prefixes: "MU963" },
  { family: "Studio", chips: ["M2 Ultra"], year: 2023, appleName: "Mac Studio (2023) M2 Ultra", prefixes: "MQH63" },
  { family: "Studio", chips: ["M2 Max"], year: 2023, appleName: "Mac Studio (2023) M2 Max", prefixes: "MQH73" },
  { family: "Studio", chips: ["M1 Ultra"], year: 2022, appleName: "Mac Studio (2022) M1 Ultra", prefixes: "MJMW3" },
  { family: "Studio", chips: ["M1 Max"], year: 2022, appleName: "Mac Studio (2022) M1 Max", prefixes: "MJMV2" },
];

const DESKTOP_SERIES: { family: DesktopFamily; series: string }[] = [
  { family: "mini", series: "Mac mini" },
  { family: "iMac", series: "iMac" },
  { family: "Studio", series: "Mac Studio" },
];

/** Mac デスクトップの機種（シリーズ＝Mac mini・iMac・Mac Studio。それぞれ新しいチップの順） */
export const MAC_DESKTOP_CATALOG = DESKTOP_SERIES.map(({ family, series }) => ({
  series,
  models: DESKTOP_GROUPS.filter((g) => g.family === family).flatMap((g) => [...g.chips].reverse().map((c) => desktopName(family, c))),
}));

/** Mac デスクトップの機種別ページを持つ全モデル */
export const MAC_DESKTOP_MODELS = MAC_DESKTOP_CATALOG.flatMap((s) => s.models);

export const MAC_DESKTOP_INFO: Record<string, MacDesktopInfo> = {};
const DESKTOP_BY_PREFIX = new Map<string, DesktopGroup>();
for (const g of DESKTOP_GROUPS) {
  for (const chip of g.chips) {
    MAC_DESKTOP_INFO[desktopName(g.family, chip)] = { family: g.family, chip, year: g.year, appleName: g.appleName, source: DESKTOP_SOURCE[g.family] };
  }
  for (const p of g.prefixes.split(" ")) DESKTOP_BY_PREFIX.set(p, g);
}

/** 機種名が Mac デスクトップか */
export const isMacDesktop = (model: string) => /^(?:Mac mini|iMac|Mac Studio)/.test(model);
/** DB の機種名の頭（Mac デスクトップ）。集計は DB 側で startsWith の OR にする */
export const MAC_DESKTOP_PREFIXES = ["Mac mini", "iMac", "Mac Studio"] as const;
/** 機種名が Mac（MacBook・Mac mini・iMac・Mac Studio）か。カード・検索・店の一覧で Mac の扱い（メモリ／SSD）にする */
export const MAC_NAME_RE = /^(?:MacBook|Mac mini|iMac|Mac Studio)/;
/** 検索語が Mac か（大文字小文字・空白のゆれを許す） */
export const MAC_QUERY_RE = /^\s*(?:macbook|mac\s*mini|imac|mac\s*studio)/i;

/** 商品名に Mac デスクトップの語があるか（「MINI for Mac Minimalist」などのキーボードは外す）。rakutenShops.ts の振り分けでも使う */
export const MAC_DESKTOP_TITLE_RE = /(?<![A-Za-z])(?:Mac\s*mini|iMac|Mac\s*Studio)(?![A-Za-z])/i;

/** チップ（M1〜M6＋Pro/Max/Ultra）。商品名に複数あるとき（じゃんぱらの「CTO (M4,2024) M4 Pro(…)」）は Pro/Max/Ultra つきを優先 */
function desktopChipOf(title: string): string | null {
  const all = [...title.matchAll(/(?<![A-Za-z0-9])M([1-6])(?:\s*(Pro|Max|Ultra))?(?![A-Za-z0-9])/g)];
  if (all.length === 0) return null;
  const m = all.find((x) => x[2]) ?? all[0];
  return `M${m[1]}${m[2] ? ` ${m[2]}` : ""}`;
}

function desktopFamilyOf(title: string): DesktopFamily | null {
  const m = title.match(MAC_DESKTOP_TITLE_RE);
  if (!m) return null;
  const w = m[0].toLowerCase().replace(/\s+/g, "");
  return w === "macmini" ? "mini" : w === "imac" ? "iMac" : "Studio";
}

const KNOWN_DESKTOP = new Set(MAC_DESKTOP_MODELS);

/**
 * 商品名から Mac デスクトップの機種名を決める。決められなければ null（Intel・iMac Pro・アクセサリ・チップが分からないもの）。
 *   (1) 部品番号（先頭5文字。F で始まる整備品は M に読み替える）で公式表を引く。M4／M4 Pro のように表が2つのチップを持つときは
 *       商品名のチップで分ける（分けられなければ null）。部品番号の種類（Mac mini／iMac／Mac Studio）が商品名と食い違うときも null。
 *   (2) 部品番号がない／表にないとき（じゃんぱらの CTO・ソフマップの Z13100057 など）は、商品名の種類とチップから決める。
 */
export function canonicalMacDesktopModel(title: string): string | null {
  if (/MacBook/i.test(title)) return null;
  const family = desktopFamilyOf(title);
  if (!family) return null;
  // Intel（Core i5・Xeon・Fusion Drive）と iMac Pro（Intel だけ）。周辺機器（「Mac mini M4用 ドッキングステーション」）
  if (/Core[\s_]?(?:i\d|m\d)|Intel|Xeon|Fusion|iMac\s*Pro/i.test(title)) return null;
  if (/M\d\s*(?:Pro|Max|Ultra)?\s*用|ドッキング|ステーション|ケース|カバー|ハブ/.test(title)) return null;

  const chip = desktopChipOf(title);
  const part = partPrefixOf(title);
  if (part) {
    const g = DESKTOP_BY_PREFIX.get(part) ?? (part[0] === "F" ? DESKTOP_BY_PREFIX.get("M" + part.slice(1)) : undefined);
    if (g) {
      if (g.family !== family) return null;
      if (g.chips.length === 1) return desktopName(g.family, g.chips[0]);
      return chip && g.chips.includes(chip) ? desktopName(g.family, chip) : null;
    }
  }
  if (!chip) return null;
  const name = desktopName(family, chip);
  return KNOWN_DESKTOP.has(name) ? name : null;
}

/** メモリと SSD（GB）。読み方は parseMacSpec と同じ。Mac Studio はメモリが最大 512GB なので上限だけ広げる */
export function parseMacDesktopSpec(title: string): { memoryGB: number | null; ssdGB: number | null } {
  return parseMacSpec(title, 512);
}
