// iPad のカタログ（機種別ページ /ipad/[slug] と、取り込み時のモデル名の正規化で共有する）。
// ショップごとに「iPad Air（第5世代/2022）」「iPad Air 13インチ(M4)」「11インチ iPad Air（M4/2026)」
// 「iPad 10.2インチ 第8世代」のように表記が違うので、Apple の正式名に寄せた1つの名前にそろえる
export const IPAD_CATALOG = [
  {
    series: "iPad Pro",
    models: [
      "iPad Pro 13インチ (M5)", "iPad Pro 11インチ (M5)",
      "iPad Pro 13インチ (M4)", "iPad Pro 11インチ (M4)",
      "iPad Pro 12.9インチ (第6世代)", "iPad Pro 11インチ (第4世代)",
      "iPad Pro 12.9インチ (第5世代)", "iPad Pro 11インチ (第3世代)",
      "iPad Pro 12.9インチ (第4世代)", "iPad Pro 11インチ (第2世代)",
      "iPad Pro 12.9インチ (第3世代)", "iPad Pro 11インチ (第1世代)",
      "iPad Pro 10.5インチ", "iPad Pro 9.7インチ",
    ],
  },
  {
    series: "iPad Air",
    models: [
      "iPad Air 13インチ (M4)", "iPad Air 11インチ (M4)",
      "iPad Air 13インチ (M3)", "iPad Air 11インチ (M3)",
      "iPad Air 13インチ (M2)", "iPad Air 11インチ (M2)",
      "iPad Air (第5世代)", "iPad Air (第4世代)", "iPad Air (第3世代)",
    ],
  },
  {
    series: "iPad mini",
    models: ["iPad mini (A17 Pro)", "iPad mini (第6世代)", "iPad mini (第5世代)"],
  },
  {
    series: "iPad",
    models: ["iPad (A16)", "iPad (第10世代)", "iPad (第9世代)", "iPad (第8世代)", "iPad (第7世代)", "iPad (第6世代)"],
  },
];

/** iPad の機種別ページを持つ全モデル（シリーズごとに新しい順） */
export const IPAD_MODELS = IPAD_CATALOG.flatMap((s) => s.models);

const KNOWN = new Set(IPAD_MODELS);

// チップ → 世代の対応（チップだけ書かれている商品名のため）
const BASE_CHIP_GEN: Record<string, number> = { A12: 8, A13: 9, A14: 10 };
const MINI_CHIP_GEN: Record<string, number> = { A12: 5, A15: 6 };
const AIR_CHIP_GEN: Record<string, number> = { A12: 3, A14: 4, M1: 5 };
const AIR_GEN_CHIP: Record<number, string> = { 6: "M2", 7: "M3", 8: "M4" };
const PRO11_CHIP_GEN: Record<string, number> = { M1: 3, M2: 4 };
const PRO129_CHIP_GEN: Record<string, number> = { M1: 5, M2: 6 };

/**
 * 商品名のうち iPad の機種を表す部分（容量より前）から、カタログの正式名を返す。
 * 読み取れない・カタログにない機種は null
 */
export function canonicalIpadModel(raw: string): string | null {
  const s = raw
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\/\s*20\d\d/g, "") // 「第5世代/2022」の年
    .replace(/\s+/g, " ");
  if (!/iPad/i.test(s)) return null;

  const line = s.match(/iPad\s*(Pro|Air|mini)/i)?.[1]?.toLowerCase() ?? "";
  const size = s.match(/(\d{1,2}(?:\.\d)?)\s*インチ/)?.[1] ?? null;
  const gen = Number(s.match(/第\s*(\d+)\s*世代/)?.[1] ?? NaN);
  const chipRaw = s.match(/\b(A17\s*Pro|A1\d|M[1-5])\b/)?.[1] ?? null;
  const chip = chipRaw ? chipRaw.replace(/\s+/, " ") : null;

  let name: string | null = null;
  if (line === "") {
    if (chip === "A16" || gen === 11) name = "iPad (A16)";
    else if (Number.isFinite(gen)) name = `iPad (第${gen}世代)`;
    else if (chip && BASE_CHIP_GEN[chip]) name = `iPad (第${BASE_CHIP_GEN[chip]}世代)`;
  } else if (line === "mini") {
    if (chip === "A17 Pro" || gen === 7) name = "iPad mini (A17 Pro)";
    else if (Number.isFinite(gen)) name = `iPad mini (第${gen}世代)`;
    else if (chip && MINI_CHIP_GEN[chip]) name = `iPad mini (第${MINI_CHIP_GEN[chip]}世代)`;
  } else if (line === "air") {
    const mChip = chip && /^M[2-4]$/.test(chip) ? chip : Number.isFinite(gen) ? AIR_GEN_CHIP[gen] : undefined;
    if (mChip) name = size ? `iPad Air ${size}インチ (${mChip})` : null;
    else if (Number.isFinite(gen)) name = `iPad Air (第${gen}世代)`;
    else if (chip && AIR_CHIP_GEN[chip]) name = `iPad Air (第${AIR_CHIP_GEN[chip]}世代)`;
  } else if (line === "pro") {
    if (size === "10.5" || size === "9.7") name = `iPad Pro ${size}インチ`;
    else if (chip === "M4" || chip === "M5") name = size ? `iPad Pro ${size}インチ (${chip})` : null;
    else if (size === "11") {
      const g = Number.isFinite(gen) ? gen : chip ? PRO11_CHIP_GEN[chip] : undefined;
      if (g) name = `iPad Pro 11インチ (第${g}世代)`;
    } else if (size === "12.9") {
      const g = Number.isFinite(gen) ? gen : chip ? PRO129_CHIP_GEN[chip] : undefined;
      if (g) name = `iPad Pro 12.9インチ (第${g}世代)`;
    }
  }
  return name && KNOWN.has(name) ? name : null;
}
