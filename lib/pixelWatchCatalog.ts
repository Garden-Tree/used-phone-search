import { ACCESSORY_RE } from "@/lib/watchCatalog";

/**
 * Google Pixel Watch のカタログ（機種別ページ /pixel-watch/[slug]・検索の機種照合・商品名の読み取りで共有する）。2026-11-13〜
 *
 * 機種名は Google の表記（"Google Pixel Watch 3"。初代は "Google Pixel Watch"）。
 * スマホの Pixel は機種名の頭の "Pixel" で見分けている（DB の startsWith など）ので、頭が "Google " の時計は /pixel の一覧・店の数・検索に混ざらない。
 *
 * 出典（2026-11-13 に確認。Google 公式）:
 *   - 「Google Pixel Watch の技術仕様とデバイスの仕様」https://support.google.com/googlepixelwatch/answer/12651869?hl=ja
 *     ケースの直径（初代・2 は 41 mm、3・4・5 は 41 mm と 45 mm）・通信方式（4G LTE のモデルと Bluetooth／Wi-Fi のモデル）・対応するスマートフォン（Android のバージョン）
 *   - Google ストア（日本）の技術仕様 https://store.google.com/jp/product/pixel_watch_5_specs?hl=ja ・ https://store.google.com/jp/product/pixel_watch_4_specs?hl=ja
 * 入れていない項目（公式で確かめられなかった）: 発売年月・ソフトウェア アップデートの保証の期限（Pixel Watch 用の公式ページが見つからなかった）。
 *
 * 1機種＝1ページ。DB では modelName＝世代、storage＝ケースのサイズ（mm）、carrier＝通信方式（"Wi-Fi" か "LTE"）。Apple Watch（lib/watchCatalog.ts）と同じ持ち方
 */

export type PixelWatchCarrier = "Wi-Fi" | "LTE";

type PixelWatchInfo = {
  /** ケースの直径（mm。公式の技術仕様） */
  sizes: number[];
  /** 対応するスマートフォン（公式の技術仕様の「Android ○ 以降」） */
  android: string;
};

export const PIXEL_WATCH_CATALOG = [
  {
    series: "Google Pixel Watch",
    models: ["Google Pixel Watch 5", "Google Pixel Watch 4", "Google Pixel Watch 3", "Google Pixel Watch 2", "Google Pixel Watch"],
  },
];

/** Pixel Watch の機種別ページを持つ全モデル（新しい順） */
export const PIXEL_WATCH_MODELS = PIXEL_WATCH_CATALOG.flatMap((s) => s.models);

export const PIXEL_WATCH_INFO: Record<string, PixelWatchInfo> = {
  "Google Pixel Watch 5": { sizes: [41, 45], android: "Android 12.0 以降" },
  "Google Pixel Watch 4": { sizes: [41, 45], android: "Android 11.0 以降" },
  "Google Pixel Watch 3": { sizes: [41, 45], android: "Android 10.0 以降" },
  "Google Pixel Watch 2": { sizes: [41], android: "Android 9.0 以降" },
  "Google Pixel Watch": { sizes: [41], android: "Android 8.0 以降" },
};

export const isPixelWatch = (model: string) => /^Google Pixel Watch/.test(model);

/** 絞り込みに並べるケースのサイズ（mm）・通信方式（DB の carrier の値と同じ） */
export const PIXEL_WATCH_SIZE_OPTIONS = [41, 45];
export const PIXEL_WATCH_CARRIERS: PixelWatchCarrier[] = ["Wi-Fi", "LTE"];

/** 出典（機種ページ・一覧の注記） */
export const PIXEL_WATCH_SOURCE = { name: "Google「Google Pixel Watch の技術仕様とデバイスの仕様」", url: "https://support.google.com/googlepixelwatch/answer/12651869?hl=ja" };

// 付属品（Google Pixel Watch Band・ループバンド）・欠品のある個体（「専用充電ケーブル欠品」「充電ホルダー欠品」）。Apple Watch と同じ語（ACCESSORY_RE）に足す
const NOT_WATCH_RE = /欠品|対応|ループ\s*バンド|Watch\s*Band|Charger|Dock/i;

/** ケースの色（「Matte Black アルミケース/Obsidian アクティブ バンド」の Matte Black。バンドの色は読まない）。読めなければ "-" */
function colorOf(t: string): string {
  const m = t.match(/((?:[A-Z][a-z]+\s?){1,3})(?:アルミ|ステンレス)?\s*ケース/);
  if (!m) return "-";
  // 「MatteBlack」「ChampagneGold」は語の間を空ける
  return m[1].trim().replace(/([a-z])([A-Z])/g, "$1 $2");
}

export type ParsedPixelWatch = { modelName: string; size: number; carrier: PixelWatchCarrier; color: string };

/**
 * 商品名から Pixel Watch の世代・ケースのサイズ（mm）・通信方式・色を決める。そろわないものは null（行にしない）:
 * バンド・充電器などの付属品・欠品のある個体・海外版と書かれたもの・通信方式（Wi-Fi／LTE）が書かれていないもの・サイズが2つ書かれたもの・カタログにない世代。
 * 初代と 2 は 41mm だけなので、商品名にサイズがなくても 41mm（公式の技術仕様）。3 以降はサイズが書かれていないものは決めない
 */
export function parsePixelWatch(title: string): ParsedPixelWatch | null {
  const t = title.normalize("NFKC");
  // 数字の後ろが数字のもの（「Pixel Watch 45mm パフォーマンスループバンド」）は世代として読まない
  const m = t.match(/Pixel\s?Watch(?:\s?(\d)(?!\d))?/i);
  if (!m || ACCESSORY_RE.test(t) || NOT_WATCH_RE.test(t) || /海外/.test(t)) return null;
  const modelName = m[1] ? `Google Pixel Watch ${m[1]}` : "Google Pixel Watch";
  const info = PIXEL_WATCH_INFO[modelName];
  if (!info) return null;

  const named = [...new Set([...t.matchAll(/(?<!\d)(\d{2})\s*mm/gi)].map((x) => Number(x[1])))];
  if (named.length > 1) return null;
  const size = named[0] ?? (info.sizes.length === 1 ? info.sizes[0] : undefined);
  if (!size || !info.sizes.includes(size)) return null;

  // 「Bluetooth/LTEモデル」「LTEモデル」は LTE、「Bluetooth/Wi-Fiモデル」「Wi-Fiモデル」は Wi-Fi
  const carrier: PixelWatchCarrier | null = /LTE/i.test(t) ? "LTE" : /Wi-?Fi/i.test(t) ? "Wi-Fi" : null;
  if (!carrier) return null;

  return { modelName, size, carrier, color: colorOf(t) };
}
