/**
 * Galaxy の基本スペック（機種ページの「基本スペック」・紹介文、比較ページの「スペックの違い」）。形は iPhone と共通（`lib/iphoneSpecs.ts`）。
 * 2026-10-01 に公式で裏どりした（日本で売られたモデルの値）:
 *   - チップ・画面サイズ・画面の種類・端子 … ドコモの製品仕様（www.docomo.ne.jp/product/<型番>/spec.html、販売終了は /support/product/…）。
 *     S24 FE はドコモの扱いがないので Samsung Newsroom 日本の発表（仕様表）と au の取扱説明書。
 *     Samsung 日本のスペックデータ（searchapi.samsung.com、現行機種のみ）とも突き合わせ、画面サイズは全機種一致
 *   - 指紋センサーの位置・顔認証 … Samsung 日本「Galaxy の画面ロックの種類」
 *     https://www.samsung.com/jp/support/mobile-devices/types-of-lock-screens-for-galaxy-devices/ （全29機種の表）
 * チップの名前は Samsung 日本の表記（「Snapdragon 8 Gen 3 for Galaxy」。ドコモは「… Mobile Platform for Galaxy」）。
 * 画面は Dynamic AMOLED・Super AMOLED を「有機EL」、TFT を「液晶」。Fold・Flip の display は外側（カバー）、displayInner は内側（メイン）。
 * 発売は日本での発売年月（`lib/galaxyCatalog.ts` の GALAXY_RELEASED）。機種を足すときは、上のページで確かめてから足す
 */
import type { IphoneSpec } from "@/lib/iphoneSpecs";
import { GALAXY_RELEASED } from "@/lib/galaxyCatalog";
import { jaMonth } from "@/lib/pixelCatalog";

const LOCK = {
  name: "Samsung「Galaxy の画面ロックの種類」（生体認証）",
  url: "https://www.samsung.com/jp/support/mobile-devices/types-of-lock-screens-for-galaxy-devices/",
};

const SCREEN = "指紋（画面内）・顔認証";
const SIDE = "指紋（側面ボタン）・顔認証";

/** ドコモの仕様ページ。cur = 販売中（/product/）、old = 販売終了（/support/product/）、top = 製品ページに仕様が載っている機種 */
const docomo = (code: string, kind: "cur" | "old" | "top") =>
  kind === "cur" ? `https://www.docomo.ne.jp/product/${code}/spec.html`
  : kind === "old" ? `https://www.docomo.ne.jp/support/product/${code}/spec.html`
  : `https://www.docomo.ne.jp/product/${code}/`;

type Src = { name: string; url: string };
const dc = (code: string, kind: "cur" | "old" | "top"): Src => ({ name: `ドコモ ${code.toUpperCase().replace(/^SC/, "SC-")} の製品仕様`, url: docomo(code, kind) });

const g = (
  model: string, chip: string, display: number, panel: IphoneSpec["panel"], auth: string, src: Src, inner?: number,
): [string, IphoneSpec] => [
  model,
  {
    released: jaMonth(GALAXY_RELEASED[model]),
    chip, display, ...(inner ? { displayInner: inner } : {}),
    panel, port: "USB-C", auth, specId: "", url: src.url, source: src.name, extraSource: LOCK,
  },
];

const OLED = "有機EL" as const;
const LCD = "液晶" as const;

export const GALAXY_SPECS: Record<string, IphoneSpec> = Object.fromEntries([
  g("Galaxy S26 Ultra", "Snapdragon 8 Elite Gen 5 for Galaxy", 6.9, OLED, SCREEN, dc("sc53g", "cur")),
  g("Galaxy S26+", "Snapdragon 8 Elite Gen 5 for Galaxy", 6.7, OLED, SCREEN, dc("sc52g", "cur")),
  g("Galaxy S26", "Snapdragon 8 Elite Gen 5 for Galaxy", 6.3, OLED, SCREEN, dc("sc51g", "cur")),
  g("Galaxy S25 Ultra", "Snapdragon 8 Elite for Galaxy", 6.9, OLED, SCREEN, dc("sc52f", "old")),
  g("Galaxy S25", "Snapdragon 8 Elite for Galaxy", 6.2, OLED, SCREEN, dc("sc51f", "cur")),
  g("Galaxy S24 Ultra", "Snapdragon 8 Gen 3 for Galaxy", 6.8, OLED, SCREEN, dc("sc52e", "old")),
  g("Galaxy S24", "Snapdragon 8 Gen 3 for Galaxy", 6.2, OLED, SCREEN, dc("sc51e", "old")),
  g("Galaxy S24 FE", "Exynos 2400e", 6.7, OLED, SCREEN, { name: "Samsung Newsroom 日本「Galaxy S24 FE」発表（仕様表）", url: "https://news.samsung.com/jp/galaxy_%EF%BD%9324fe1212" }),
  g("Galaxy S23 Ultra", "Snapdragon 8 Gen 2 for Galaxy", 6.8, OLED, SCREEN, dc("sc52d", "old")),
  g("Galaxy S23", "Snapdragon 8 Gen 2 for Galaxy", 6.1, OLED, SCREEN, dc("sc51d", "old")),
  g("Galaxy S22 Ultra", "Snapdragon 8 Gen 1", 6.8, OLED, SCREEN, dc("sc52c", "old")),
  g("Galaxy S22", "Snapdragon 8 Gen 1", 6.1, OLED, SCREEN, dc("sc51c", "old")),

  g("Galaxy Z Fold8 Ultra", "Snapdragon 8 Elite Gen 5 for Galaxy", 6.5, OLED, SIDE, dc("sc56g", "top"), 8.0),
  g("Galaxy Z Fold8", "Snapdragon 8 Elite Gen 5 for Galaxy", 5.5, OLED, SIDE, dc("sc57g", "top"), 7.6),
  g("Galaxy Z Fold7", "Snapdragon 8 Elite for Galaxy", 6.5, OLED, SIDE, dc("sc56f", "cur"), 8.0),
  g("Galaxy Z Fold6", "Snapdragon 8 Gen 3 for Galaxy", 6.3, OLED, SIDE, dc("sc55e", "old"), 7.6),
  g("Galaxy Z Fold5", "Snapdragon 8 Gen 2 for Galaxy", 6.2, OLED, SIDE, dc("sc55d", "old"), 7.6),
  g("Galaxy Z Fold4", "Snapdragon 8+ Gen 1", 6.2, OLED, SIDE, dc("sc55c", "old"), 7.6),

  g("Galaxy Z Flip8", "Snapdragon 8 Elite Gen 5 for Galaxy", 4.1, OLED, SIDE, dc("sc55g", "top"), 6.9),
  g("Galaxy Z Flip7", "Exynos 2500", 4.1, OLED, SIDE, dc("sc55f", "cur"), 6.9),
  g("Galaxy Z Flip6", "Snapdragon 8 Gen 3 for Galaxy", 3.4, OLED, SIDE, dc("sc54e", "old"), 6.7),
  g("Galaxy Z Flip5", "Snapdragon 8 Gen 2 for Galaxy", 3.4, OLED, SIDE, dc("sc54d", "old"), 6.7),
  g("Galaxy Z Flip4", "Snapdragon 8+ Gen 1", 1.9, OLED, SIDE, dc("sc54c", "old"), 6.7),

  g("Galaxy A57 5G", "Exynos 1680", 6.7, OLED, SCREEN, dc("sc54g", "cur")),
  g("Galaxy A55 5G", "Exynos 1480", 6.6, OLED, SCREEN, dc("sc53e", "old")),
  g("Galaxy A54 5G", "Exynos 1380", 6.4, OLED, SCREEN, dc("sc53d", "old")),
  g("Galaxy A53 5G", "Exynos 1280", 6.5, OLED, SCREEN, dc("sc53c", "old")),
  g("Galaxy A25 5G", "Dimensity 6100+", 6.7, LCD, SIDE, dc("sc53f", "cur")),
  g("Galaxy A23 5G", "Dimensity 700", 5.8, LCD, SIDE, dc("sc56c", "old")),
]);
