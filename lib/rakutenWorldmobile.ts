import type { Prisma } from "@prisma/client";
import { batteryOf, networkStatusOf, type RakutenItem } from "@/lib/rakutenCommon";
import { CARRIER_WORD_RE, buildDeviceRow, storageOf } from "@/lib/yahooCommon";

/**
 * WORLDMOBILE（楽天市場店 worldmobile・株式会社ワールドモバイル。2026-11-22〜）の商品1件を DeviceInventory の行にする。
 * 商品名は 2026-11-22 に楽天の店内検索（sid 395897）で集めた（.claude/tmp/new-shops-samples-1122.md）。
 *
 * 取り込むのは1台ずつのページだけ（「｜」区切りの新しい形。型番つき）:
 *   中古｜良い｜256GB｜SIMフリー｜iPhone17e｜MHRP4J/A｜本体
 *   中古｜ほぼ新品｜256GB｜SIMフリー｜iPhone 18 Pro｜MJR64J/A｜本体
 * 取り込まないもの:
 *   - ランク・電池・容量・キャリアを買う人が選ぶ古い形（「【中古】iPhone 13 128GB 256GB 512GB ミッドナイト …」）。価格が1台に決まらず、
 *     題の「SIMフリー」も選べる中身と違う例があった（Pixel 8 は au／SoftBank だけ）
 *   - 減額品（「中古｜減額品｜…」「《減額品》…」。ネットワーク利用制限が △ の個体）と、未開封・未使用（新品扱い）
 *
 * - ランク（2つ目の欄）: ほぼ新品・非常に良い → A、良い → B、可 → C
 * - 電池: 商品説明の備考「バッテリー100％」を fetch.php が batt で送る（LOOSE_BATTERY_SHOPS）。書いていない商品は null
 * - 色は商品名にないので "-"
 * - 保証は通常30日（購入後30日以内のレビューで1年）、赤ロム永久保証（lib/shops.ts）
 */

export const RAKUTEN_WORLDMOBILE_SHOP = "WORLDMOBILE（楽天市場店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

const RANKS: Record<string, string> = { ほぼ新品: "A", 非常に良い: "A", 良い: "B", 可: "C" };
const PART_RE = /^(?:[A-Z0-9]{5}J\/A|SC-\d{2}[A-Z]|SC[GV]\d{2}|SM-[A-Z0-9]+|G[A-Z0-9]{4})$/;

export function normalizeWorldmobileItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const name = item.name.replace(/&nbsp;/g, " ").replace(/[\s　]+/g, " ").trim();
  if (/減額品|未開封|ジャンク/.test(name)) return null;
  const cells = name.split(/\s*[｜|]\s*/);
  if (cells.length < 6 || cells[0] !== "中古") return null; // 古い形（選ぶページ）
  const rank = RANKS[cells[1]];
  if (!rank || !cells.some((c) => PART_RE.test(c))) return null;
  const body = cells.slice(2).filter((c) => c !== "本体" && !PART_RE.test(c)).join(" ");
  const storage = storageOf(body);
  if (!storage) return null;
  return buildDeviceRow({
    shopName: RAKUTEN_WORLDMOBILE_SHOP, body, price: item.price, url: item.url, networkStatus: networkStatusOf(item),
    conditionRank: rank, batteryHealth: batteryOf(item), storage,
    simFree: /SIMフリー|SIMロック解除/.test(body), carrierWord: body.match(CARRIER_WORD_RE)?.[0] ?? null,
    color: "-",
  });
}
