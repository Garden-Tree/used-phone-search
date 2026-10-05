import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { PIXEL_MODELS } from "@/lib/pixelCatalog";
import { GALAXY_MODELS } from "@/lib/galaxyCatalog";

/**
 * 機種名の照合（DB に依存しない部分）。サーバー（lib/deviceSearch.ts）と、
 * ブラウザ内で絞り込む検索ページ（静的書き出し版の app/search）の両方で使う
 */

// モデル名の「バリエーション」を表す語（この集合が一致するものだけをヒットさせる）
const VARIANT_WORDS = ["pro", "max", "plus", "mini"] as const;

type ParsedModel = {
  core: string; // 例: "7", "13", "16e", "x", "se", "air"
  variants: Set<string>; // 例: {"pro","max"}
  generation: string | null; // 例: "第3世代"（SE用）
};

/**
 * モデル名をトークンに分解する。
 * ショップごとの表記ゆれ（"iphone13" / "iPhoneSE 第2世代" / "iPhone SE (第3世代)" / "SE3"）を吸収する。
 */
function tokenize(name: string): string[] {
  let s = name.toLowerCase();
  const idx = s.indexOf("iphone");
  if (idx >= 0) s = s.slice(idx + "iphone".length);
  s = s
    .replace(/[()（）\[\]【】]/g, " ")
    .replace(/第\s*(\d)\s*世代/g, "第$1世代") // "第 3 世代" → "第3世代"
    .trim()
    .replace(/\bse\s?([23])(?![0-9])/g, "se 第$1世代")
    .replace(/^(\d+e?|se|air|x[sr]?)/, "$1 ") // "13pro" → "13 pro"
    .replace(/(第\d世代)/g, " $1 ");
  return s.split(/\s+/).filter(Boolean);
}

function parseModel(name: string): ParsedModel {
  const tokens = tokenize(name);
  return {
    core: tokens[0] ?? "",
    variants: new Set(tokens.filter((t) => (VARIANT_WORDS as readonly string[]).includes(t))),
    generation: tokens.find((t) => /^第\d世代$/.test(t)) ?? null,
  };
}

/** 検索クエリ（1モデル）と在庫のモデル名が同一モデルかを厳密に判定する */
export function matchesModel(query: string, modelName: string): boolean {
  // iPad は取り込み時に lib/ipadCatalog.ts の正式名にそろえている。
  // 正式名そのもので検索されたら完全一致（トークン判定だと「iPad (第6世代)」が「iPad mini (第6世代)」にも当たる）、
  // 「iPad Air」のような大まかな検索なら、語がすべて含まれる機種に当てる
  const ipadQuery = /^\s*ipad/i.test(query);
  if (ipadQuery || /^ipad/i.test(modelName)) {
    if (!ipadQuery) return false;
    const q = query.trim().toLowerCase();
    const name = modelName.trim().toLowerCase();
    if (IPAD_MODELS.some((m) => m.toLowerCase() === q)) return q === name;
    return /^ipad/.test(name) && q.split(/\s+/).every((word) => name.includes(word));
  }
  // Pixel・Galaxy も取り込み時にメーカーの表記（lib/pixelCatalog.ts・lib/galaxyCatalog.ts）にそろえている。考え方は iPad と同じ
  // （トークン判定だと「Pixel 9」が「Pixel 9a」「Pixel 9 Pro」に、「Galaxy S24」が「Galaxy S24 Ultra」にも当たる）
  for (const [prefix, models] of [["pixel", PIXEL_MODELS], ["galaxy", GALAXY_MODELS]] as const) {
    const isQuery = query.trim().toLowerCase().startsWith(prefix);
    if (!isQuery && !modelName.trim().toLowerCase().startsWith(prefix)) continue;
    if (!isQuery) return false;
    const q = query.trim().toLowerCase();
    const name = modelName.trim().toLowerCase();
    if (models.some((m) => m.toLowerCase() === q)) return q === name;
    return name.startsWith(prefix) && q.split(/\s+/).every((word) => name.includes(word));
  }
  const q = parseModel(query);
  if (!q.core) return true;

  const d = parseModel(modelName);
  // 先頭トークンの完全一致で判定するため "7" が "17" に、"16" が "16e" にヒットしない
  if (d.core !== q.core) return false;
  if (q.generation && d.generation !== q.generation) return false;
  if (q.variants.size !== d.variants.size) return false;
  for (const v of q.variants) if (!d.variants.has(v)) return false;
  return true;
}

/** "iPhone 13,iPhone 14" のようなカンマ区切りクエリを配列に分解する */
export function splitModelQuery(modelQuery: string | null | undefined): string[] {
  if (!modelQuery) return [];
  return modelQuery.split(",").map((m) => m.trim()).filter(Boolean);
}

/** 検索ページの種類の切り替え（?device=）→ 機種名の先頭 */
export const SEARCH_DEVICES = [
  { key: "iphone", label: "iPhone", prefix: "iPhone" },
  { key: "ipad", label: "iPad", prefix: "iPad" },
  { key: "pixel", label: "Pixel", prefix: "Pixel" },
  { key: "galaxy", label: "Galaxy", prefix: "Galaxy" },
] as const;

export const findSearchDevice = (key: string | null | undefined) => SEARCH_DEVICES.find((d) => d.key === key);
