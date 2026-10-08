// 楽天市場店（ゲオ・じゃんぱら・ソフマップ）の商品名を読み取る処理で共通の部品。
// 各店の読み取りは rakutenGeo.ts / rakutenJanpara.ts / rakutenSofmap.ts / rakutenIpad.ts

/** rakuten-sync/fetch.php が送ってくる1商品（rank・nw・batt・car は商品説明から読めたときだけ） */
export type RakutenItem = {
  code: string;
  name: string;
  price: number;
  url: string;
  rank: string | null;
  nw: string | null;
  batt?: number | null;
  car?: string | null;
  /** 販売元（Amazon の出品者名。scripts/fetch-amazon.ts だけが入れる） */
  seller?: string | null;
};

const RANKS = new Set(["S", "A", "B", "C", "D", "J"]);

/** 状態ランク。未使用品は S、読めなければ「不明」 */
export function rankOf(rank: string | null | undefined, unused = false): string {
  if (unused) return "S";
  return rank && RANKS.has(rank) ? rank : "不明";
}

/** "512" + "GB" → 512、"1" + "TB" → 1024 */
export function toStorage(size: string, unit: string): number {
  return unit === "TB" ? Number(size) * 1024 : Number(size);
}

/** バッテリー最大容量（%）。範囲外は null */
export function batteryOf(item: RakutenItem): number | null {
  return typeof item.batt === "number" && item.batt > 0 && item.batt <= 100 ? item.batt : null;
}

/** 色の後ろに付く型番（MGDP3J/A・MQ0F3J／A）以降を落とす */
export function stripPartNumber(s: string): string {
  return s.replace(/\s*[A-Z0-9]{4,6}(?:J|ZA|LL|CH)?[／/]A.*$/, "").trim();
}

/**
 * キャリアの表記（「docomo」「auロック解除SIMフリー」「UQmobile」「国内版」「SIMフリー」など）を
 * 他ショップと揃えた carrier にする。読めなければ null（J:COM など）
 */
export function carrierOf(raw: string): string | null {
  if (/docomo|ドコモ/i.test(raw)) return "docomo";
  if (/SoftBank|ソフトバンク|Y!mobile/i.test(raw)) return "SoftBank";
  if (/(?:^|[^A-Za-z])au(?![A-Za-z])|UQ/i.test(raw)) return "au";
  if (/楽天/.test(raw)) return "楽天モバイル";
  if (/海外/.test(raw)) return "海外版SIMフリー";
  if (/国内版|SIMフリー/.test(raw)) return "国内版SIMフリー";
  return null;
}

// 商品説明の利用制限の表記（fetch.php の nw）→ 画面の表記
const NETWORK_STATUS: Record<string, string> = { "○": "〇", "〇": "〇", "△": "△", "×": "×", "✕": "×", "－": "-", "-": "-" };

/** ネットワーク利用制限（読めないときは null。カードにバッジを出さない） */
export function networkStatusOf(item: RakutenItem): string | null {
  return item.nw ? NETWORK_STATUS[item.nw] ?? null : null;
}
