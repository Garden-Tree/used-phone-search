/** "SE（第3世代）" → "SE (第3世代)"、"14 Pro" はそのまま（「iPhone」の後ろの部分を整える） */
export function normalizeModelPart(part: string): string {
  return part
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\s*\(/g, " (")
    .replace(/\s+/g, " ")
    .trim();
}

// 取り込む iPhone 本体のモデル名（商品名の読み違いでおかしなモデル名を入れないための確認）
const MODEL_RE = /^iPhone (?:\d{1,2}(?: mini| Plus| Pro(?: Max)?|e)?|SE \(第[23]世代\)|Air|X|XS(?: Max)?|XR)$/;

export function isKnownIphoneModel(modelName: string): boolean {
  return MODEL_RE.test(modelName);
}
