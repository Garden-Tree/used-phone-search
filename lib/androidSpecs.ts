/**
 * AQUOS・Xperia の基本スペック（比較ページの「スペックの違い」用）。形は iPhone と共通（`lib/iphoneSpecs.ts`）。
 * 2026-11-12 にメーカー公式で裏どりした:
 *   - AQUOS … シャープの各機種スペックページ。現行は https://jp.sharp/k-tai/products/<機種>/specs/ 、
 *     旧機種は https://jp.sharp/products/<機種>/d/ （ドコモ版の仕様）。シャープ「機種比較」のデータ
 *     （https://jp.sharp/k-tai/lineup/compare/js/compare.json）とも値が一致
 *   - Xperia … ソニーの各機種「仕様（スペック）」ページ（https://www.sony.jp/xperia/…/spec.html）。
 *     ページの表はソニーのデータ（https://www.sony.jp/xperia/assets_v2_spec/data.json）から描かれている
 * 指紋センサーの位置はどちらの仕様にも書かれていないので書かない（sense8 だけ特長ページにあるが、ほかの機種と見かけの違いになるので揃えた）。
 * 画面は IGZO OLED・Pro IGZO OLED・有機EL を「有機EL」、液晶ディスプレイを「液晶」。チップ名は ®・Mobile Platform を外した。
 * 発売は catalog（`lib/aquosCatalog.ts`・`lib/xperiaCatalog.ts`）の released。キーは catalog の機種名
 */
import { specOf, type IphoneSpec } from "@/lib/iphoneSpecs";
import { AQUOS_INFO } from "@/lib/aquosCatalog";
import { XPERIA_INFO } from "@/lib/xperiaCatalog";
import { OPPO_SPECS } from "@/lib/oppoCatalog";
import { XIAOMI_SPECS } from "@/lib/xiaomiCatalog";

/** "2024-11" → "2024年11月"、"2023" → "2023年"（月が分からない機種） */
const jaReleased = (s: string | null | undefined): string => {
  if (!s) return "";
  const [y, m] = s.split("-");
  return m ? `${y}年${Number(m)}月` : `${y}年`;
};

const OLED = "有機EL" as const;
const LCD = "液晶" as const;

// ---- AQUOS ----

const sharpNew = (slug: string) => `https://jp.sharp/k-tai/products/${slug}/specs/`;
const sharpOld = (slug: string) => `https://jp.sharp/products/${slug}/d/`;

const a = (
  model: string, chip: string, display: number, panel: IphoneSpec["panel"], auth: string, url: string,
  extra?: IphoneSpec["extraSource"],
): [string, IphoneSpec] => [
  model,
  {
    released: jaReleased(AQUOS_INFO[model]?.released),
    chip, display, panel, port: "USB-C", auth, specId: "",
    url, source: `シャープ「${model} スペック」`,
    ...(extra ? { extraSource: extra } : {}),
  },
];

const FACE_FP = "指紋・顔認証";

export const AQUOS_SPECS: Record<string, IphoneSpec> = Object.fromEntries([
  a("AQUOS sense10", "Snapdragon 7s Gen 3", 6.1, OLED, FACE_FP, sharpNew("aquos-sense10")),
  a("AQUOS sense9", "Snapdragon 7s Gen 2", 6.1, OLED, FACE_FP, sharpNew("aquos-sense9")),
  a("AQUOS sense8", "Snapdragon 6 Gen 1", 6.1, OLED, FACE_FP, sharpOld("aquos-sense8")),
  a("AQUOS sense7", "Snapdragon 695 5G", 6.1, OLED, FACE_FP, sharpOld("aquos-sense7")),
  a("AQUOS wish5", "MediaTek Dimensity 6300", 6.6, LCD, FACE_FP, sharpNew("aquos-wish5")),
  a("AQUOS wish4", "MediaTek Dimensity 700", 6.6, LCD, FACE_FP, sharpNew("aquos-wish4")),
  // ドコモ版は指紋＋顔、SIMフリー版（https://jp.sharp/products/aquos-wish3/simfree/）は顔認証のみ
  a("AQUOS wish3", "MediaTek Dimensity 700", 5.7, LCD, "顔認証（指紋はドコモ版のみ）", sharpOld("aquos-wish3")),
  a("AQUOS R9", "Snapdragon 7+ Gen 3", 6.5, OLED, FACE_FP, sharpNew("aquos-r9")),
  a("AQUOS R8 pro", "Snapdragon 8 Gen 2", 6.6, OLED, FACE_FP, sharpOld("aquos-r8-pro")),
  a("AQUOS R8", "Snapdragon 8 Gen 2", 6.39, OLED, FACE_FP, sharpOld("aquos-r8")),
]);

// ---- Xperia ----

const sonySpec = (path: string) => `https://www.sony.jp/xperia/${path}/spec.html`;

const x = (model: string, chip: string, display: number, path: string): [string, IphoneSpec] => [
  model,
  {
    released: jaReleased(XPERIA_INFO[model]?.released),
    chip, display, panel: OLED, port: "USB-C", auth: "指紋", specId: "",
    url: sonySpec(path), source: `ソニー「${model} 仕様（スペック）」`,
  },
];

export const XPERIA_SPECS: Record<string, IphoneSpec> = Object.fromEntries([
  x("Xperia 1 VII", "Snapdragon 8 Elite", 6.5, "products/xperia1m7"),
  x("Xperia 1 VI", "Snapdragon 8 Gen 3", 6.5, "xperia/xperia1m6"),
  x("Xperia 1 V", "Snapdragon 8 Gen 2", 6.5, "xperia/xperia1m5"),
  x("Xperia 5 V", "Snapdragon 8 Gen 2", 6.1, "xperia/xperia5m5"),
  x("Xperia 10 VII", "Snapdragon 6 Gen 3", 6.1, "products/xperia10m7"),
  x("Xperia 10 VI", "Snapdragon 6 Gen 1", 6.1, "xperia/xperia10m6"),
  x("Xperia 10 V", "Snapdragon 695 5G", 6.1, "xperia/xperia10m5"),
]);

/**
 * 比較ページ用のスペック（iPhone・iPad・Pixel・Galaxy に AQUOS・Xperia を足したもの）。
 * `specOf` には入れない: 入れると AQUOS・Xperia の機種ページにもスペックの節が出る（機種ページは Google で伸びているので変えない・11/12）
 * OPPO・Xiaomi（2026-11-12〜。lib/oppoCatalog.ts・xiaomiCatalog.ts の公式の値）も引ける（比較の組はまだ足していない）
 */
export const compareSpecOf = (model: string): IphoneSpec | undefined =>
  specOf(model) ?? AQUOS_SPECS[model] ?? XPERIA_SPECS[model] ?? OPPO_SPECS[model] ?? XIAOMI_SPECS[model];
