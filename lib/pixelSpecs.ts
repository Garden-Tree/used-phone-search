/**
 * Pixel の基本スペック（機種ページの「基本スペック」・紹介文、比較ページの「スペックの違い」）。形は iPhone と共通（`lib/iphoneSpecs.ts`）。
 * 2026-10-01 に Google 公式で裏どりした:
 *   - チップ・画面サイズ・端子・生体認証 … 「Google Pixel スマートフォンのハードウェア技術仕様」https://support.google.com/pixelphone/answer/7158570?hl=ja（英語版と値が一致）
 *   - 指紋センサーの位置 … 技術仕様（8 シリーズ・Pixel Fold）と「指紋認証のトラブルシューティング」https://support.google.com/pixelphone/answer/13537318
 *     （「Pixel 6 以降（Pixel Fold を除く）は画面内」）。9〜11 の Pro Fold は位置の記載がないので書かない
 *   - 顔認証 … 技術仕様と「顔認証」https://support.google.com/pixelphone/answer/9517039（Pixel 7 以降・Pixel Fold を含む）。6 シリーズは記載なし
 * 発売は販売開始の年月（`lib/pixelCatalog.ts` の PIXEL_INFO）。画面はすべて有機EL。Fold は外側・内側の両方。
 * 機種を足すときは、上のページで確かめてから足す。キーは `lib/pixelCatalog.ts` の機種名
 */
import type { IphoneSpec } from "@/lib/iphoneSpecs";
import { PIXEL_INFO, jaMonth } from "@/lib/pixelCatalog";

const URL = "https://support.google.com/pixelphone/answer/7158570?hl=ja";
const SOURCE = "Google「Pixel スマートフォンのハードウェア技術仕様」";

const IN = "指紋（画面内）・顔認証";
const FOLD_NEW = "指紋・顔認証";

/** display は Fold なら外側、inner は内側 */
const p = (model: string, chip: string, display: number, auth: string, inner?: number): [string, IphoneSpec] => [
  model,
  {
    released: jaMonth(PIXEL_INFO[model].available),
    chip, display, ...(inner ? { displayInner: inner } : {}),
    panel: "有機EL", port: "USB-C", auth, specId: "", url: URL, source: SOURCE,
  },
];

export const PIXEL_SPECS: Record<string, IphoneSpec> = Object.fromEntries([
  p("Pixel 11 Pro Fold", "Google Tensor G6", 6.5, FOLD_NEW, 8),
  p("Pixel 11 Pro XL", "Google Tensor G6", 6.8, IN),
  p("Pixel 11 Pro", "Google Tensor G6", 6.3, IN),
  p("Pixel 11", "Google Tensor G6", 6.3, IN),
  p("Pixel 10a", "Google Tensor G4", 6.3, IN),
  p("Pixel 10 Pro Fold", "Google Tensor G5", 6.4, FOLD_NEW, 8),
  p("Pixel 10 Pro XL", "Google Tensor G5", 6.8, IN),
  p("Pixel 10 Pro", "Google Tensor G5", 6.3, IN),
  p("Pixel 10", "Google Tensor G5", 6.3, IN),
  p("Pixel 9a", "Google Tensor G4", 6.3, IN),
  p("Pixel 9 Pro Fold", "Google Tensor G4", 6.3, FOLD_NEW, 8),
  p("Pixel 9 Pro XL", "Google Tensor G4", 6.8, IN),
  p("Pixel 9 Pro", "Google Tensor G4", 6.3, IN),
  p("Pixel 9", "Google Tensor G4", 6.3, IN),
  p("Pixel 8a", "Google Tensor G3", 6.1, IN),
  p("Pixel 8 Pro", "Google Tensor G3", 6.7, IN),
  p("Pixel 8", "Google Tensor G3", 6.2, IN),
  p("Pixel Fold", "Google Tensor G2", 5.8, "指紋（電源ボタン）・顔認証", 7.6),
  p("Pixel 7a", "Google Tensor G2", 6.1, IN),
  p("Pixel 7 Pro", "Google Tensor G2", 6.7, IN),
  p("Pixel 7", "Google Tensor G2", 6.3, IN),
  // 6 シリーズのチップは公式の表記が「Google Tensor」（世代の数字なし）
  p("Pixel 6a", "Google Tensor", 6.134, "指紋（画面内）"), // 公式の表記が 6.134 インチ
  p("Pixel 6 Pro", "Google Tensor", 6.7, "指紋（画面内）"),
  p("Pixel 6", "Google Tensor", 6.4, "指紋（画面内）"),
]);
