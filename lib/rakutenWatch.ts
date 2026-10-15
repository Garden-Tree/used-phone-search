import type { Prisma } from "@prisma/client";
import { batteryOf, rankOf, type RakutenItem } from "@/lib/rakutenCommon";
import { parseWatch } from "@/lib/watchCatalog";
import { RAKUTEN_GEO_SHOP } from "@/lib/rakutenGeo";
import { RAKUTEN_JANPARA_SHOP } from "@/lib/rakutenJanpara";
import { RAKUTEN_SOFMAP_SHOP } from "@/lib/rakutenSofmap";
import { RAKUTEN_IOSYS_SHOP } from "@/lib/rakutenIosys";
import { RAKUTEN_NEWSEDTECH_SHOP, batteryFrom, rankFrom } from "@/lib/rakutenNewsedtech";

/**
 * 楽天市場店の Apple Watch（2026-10-15〜）。ゲオ・じゃんぱら・ソフマップ・イオシス・ニューズドテックの商品1件を DeviceInventory の行にする。
 * rakutenShops.ts の byDevice（ニューズドテックは normalizeNewsedtechItem の前）が、商品名に Apple Watch を含むものをここへ回す。
 * キタムラ・エムティーエムは Apple Watch を取らない。
 *
 * 世代・ケースのサイズ（mm）・通信方式がそろったものだけ行にする（lib/watchCatalog.ts の parseWatch）。
 * バンド単体・充電器・ケース・保護フィルム・Series 5 以前・世代が決められない SE は null（行にしない）。
 * modelName＝世代、storage＝ケースのサイズ（mm）、carrier＝"GPS" か "GPS+Cellular"、color＝色と素材。memoryGB は null。
 * Apple Watch は SIM ロック・利用制限の表示をしないので simUnlocked=false・networkStatus=null。バンドの有無は保存しない。
 * 状態ランク・バッテリーの読み方は各店の iPhone などの読み取りと同じ（ゲオはバッテリーなし）。
 *
 * 商品名の例（scripts/test-watch.ts に実物のサンプルがある）:
 *   ゲオ         【中古】【安心保証】 バンド無 Series9[41mm/GPS]アルミ シルバー Apple Watch
 *   じゃんぱら   【中古】Apple Apple Watch Series7 41mm GPS スターライトアルミ/スポーツバンド スターライト【OSU301】保証期間1ヶ月【ランクC】
 *   ソフマップ   【中古】Apple(アップル) Apple Watch Series 11 GPS 46mm スペースグレイアルミニウムケース バンド無し 【269-ud】
 *   イオシス     Apple Apple Watch SE3 40mm GPSモデル MEH54J/A A3324【スターライトアルミニウムケース/スターライトスポーツバンド(M/L)】 [中古] 【当社3ヶ月間保証】 イオシス
 *   ニューズドテック 【中古】Apple Watch SE 3 GPS 40mm 64GB スターライト アルミニウム A3325【送料無料】awse3mtm14
 */

type Row = Prisma.DeviceInventoryCreateManyInput;

function build(shopName: string, item: RakutenItem, conditionRank: string, batteryHealth: number | null): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const w = parseWatch(item.name);
  if (!w) return null;
  return {
    manufacturer: "Apple",
    modelName: w.modelName,
    storage: w.size,
    color: w.color,
    conditionRank,
    batteryHealth,
    networkStatus: null,
    simUnlocked: false,
    carrier: w.carrier,
    shopName,
    price: item.price,
    url: item.url,
    isSoldOut: false,
  };
}

/** ゲオ: 【中古】【安心保証】で始まる。ランクは fetch.php が送る item.rank。バッテリーの記載はない */
export function normalizeGeoWatch(item: RakutenItem): Row | null {
  if (!/^【(?:中古|未使用)/.test(item.name)) return null;
  return build(RAKUTEN_GEO_SHOP, item, rankOf(item.rank, /^【未使用/.test(item.name)), null);
}

/** じゃんぱら: 【中古】/【未使用】で始まる。ランクは名前の【ランクA】 */
export function normalizeJanparaWatch(item: RakutenItem): Row | null {
  const name = item.name;
  if (!/^【(?:中古|未使用)】/.test(name)) return null;
  return build(RAKUTEN_JANPARA_SHOP, item, rankOf(name.match(/【ランク([A-Z])】/)?.[1], /^【未使用/.test(name)), batteryOf(item));
}

/** ソフマップ: 【中古】で始まる。ランクは fetch.php が送る item.rank */
export function normalizeSofmapWatch(item: RakutenItem): Row | null {
  if (!/^【(?:中古|未使用)/.test(item.name)) return null;
  return build(RAKUTEN_SOFMAP_SHOP, item, rankOf(item.rank, /^【未使用/.test(item.name)), batteryOf(item));
}

/**
 * イオシス: ランクは fetch.php が送る item.rank。未使用品の見分けは iPhone などと同じ。
 * バッテリーは iPhone と違って「80%以上」を仮定せず、商品名に「80%未満」とあるときだけ 79、「バッテリー100%」「新品」なら 100、書いてなければ item.batt（なければ null）
 */
export function normalizeIosysWatch(item: RakutenItem): Row | null {
  const name = item.name;
  const unused = /^【未使用】|\s未使用\s+(?:【[^】]*】\s*)?イオシス/.test(name);
  const rank = rankOf(item.rank, unused);
  const battery = rank === "S" ? 100 : /80%未満|バッテリー劣化/.test(name) ? 79 : batteryOf(item);
  return build(RAKUTEN_IOSYS_SHOP, item, rank, battery);
}

/** ニューズドテック（1号店・2号店）: 【中古】【未使用】【未開封】のどれかを含む。ランク・バッテリーは iPhone などと同じ（名前の「Aランク」→ item.rank） */
export function normalizeNewsedtechWatch(item: RakutenItem): Row | null {
  const m = item.name.match(/【(中古|未使用|未開封)】/);
  if (!m) return null;
  const unused = m[1] !== "中古";
  const body = item.name.slice(m.index! + m[0].length);
  return build(RAKUTEN_NEWSEDTECH_SHOP, item, rankFrom(body, item, unused), batteryFrom(item.name, item));
}
