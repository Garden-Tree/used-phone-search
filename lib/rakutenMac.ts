import type { Prisma } from "@prisma/client";
import { batteryOf, rankOf, type RakutenItem } from "@/lib/rakutenCommon";
import { canonicalMacModel, parseMacSpec } from "@/lib/macCatalog";
import { RAKUTEN_JANPARA_SHOP } from "@/lib/rakutenJanpara";
import { RAKUTEN_SOFMAP_SHOP } from "@/lib/rakutenSofmap";
import { RAKUTEN_IOSYS_SHOP } from "@/lib/rakutenIosys";

/**
 * 楽天市場店の MacBook（2026-10-15〜）。じゃんぱら・ソフマップ・イオシスの商品1件を DeviceInventory の行にする。
 * rakutenShops.ts の byDevice が、商品名に MacBook を含むものをここへ回す。
 *
 * ゲオは商品名にメモリ・SSD がない（部品番号と年だけ）ので取り込まない（関数を作らない）。
 * ニューズドテック・キタムラ・エムティーエムは MacBook を取らない。
 *
 * 機種名は lib/macCatalog.ts の canonicalMacModel（「MacBook Air 13インチ M2」）。機種・メモリ・SSD のどれかが読めない、
 * 価格が0以下、ケース・フィルムなどのアクセサリは null（行にしない）。
 * 状態ランク・バッテリー（商品説明から fetch.php が rank / batt として送る）の読み方は iPhone の読み取りと同じ。
 * Mac は simUnlocked=false・carrier=null・networkStatus=null（キャリアも利用制限もない）。
 *
 * 商品名の例（scripts/test-mac-normalize.ts に実物のサンプルがある）:
 *   じゃんぱら   【中古】Apple MacBook Air 13インチ M2(CPU:8C/GPU:8C) 16GB/256GB スペースグレイ MC7U4J/A (M2,2022)【ECセンター】保証期間１ヶ月【ランクA】
 *   ソフマップ   【中古】Apple(アップル) MacBook Air 13.6-inch Mid-2022 MLY23J／A Apple M2 8コアCPU_10コアGPU 8GB SSD512GB スターライト 〔26.3 Tahoe〕 【276-ud】
 *   イオシス     中古パソコン MacBook Air 13インチ MGN93J/A Late 2020 シルバー【Apple M1/16GB/512GB SSD】 Apple 当社3ヶ月間保証 イオシス
 */

type Row = Prisma.DeviceInventoryCreateManyInput;

/** 色。カタカナだけの語（スペースグレイ・ミッドナイト）のときだけ採る。取れなければ "-" */
const KATAKANA = /^[ァ-ヶー]+$/;
const colorOf = (candidate: string | undefined): string => (candidate && KATAKANA.test(candidate) ? candidate : "-");

const ACCESSORY = /ケース|フィルム|カバー|スキン|バッグ|スタンド|ハブ|キーボードカバー/;

function build(shopName: string, item: RakutenItem, conditionRank: string, color: string): Row | null {
  if (!item.url || !(item.price > 0) || ACCESSORY.test(item.name)) return null;
  const modelName = canonicalMacModel(item.name);
  const { memoryGB, ssdGB } = parseMacSpec(item.name);
  if (modelName === null || memoryGB === null || ssdGB === null) return null;
  return {
    manufacturer: "Apple",
    modelName,
    storage: ssdGB,
    memoryGB,
    color,
    conditionRank,
    batteryHealth: batteryOf(item),
    networkStatus: null,
    simUnlocked: false,
    carrier: null,
    shopName,
    price: item.price,
    url: item.url,
    isSoldOut: false,
  };
}

/** じゃんぱら: 【中古】/【未使用】で始まる。ランクは名前の【ランクA】、色は「16GB/256GB」の次の語（CTO は「(M2,2022) スターライト M2(」） */
export function normalizeJanparaMac(item: RakutenItem): Row | null {
  const name = item.name;
  if (!/^【(?:中古|未使用)/.test(name)) return null;
  const rank = rankOf(name.match(/【ランク([A-Z])】/)?.[1], /^【未使用/.test(name));
  const color =
    name.match(/\d+(?:GB|G)\/\d+(?:GB|TB|G|T)\s+(\S+)/)?.[1] ??
    name.match(/\)\s+([ァ-ヶー]+)\s+(?:Apple\s+)?[MA]\d/)?.[1];
  return build(RAKUTEN_JANPARA_SHOP, item, rank, colorOf(color));
}

/** ソフマップ: 【中古】で始まる。ランクは fetch.php が送る item.rank、色は「SSD512GB」の次の語 */
export function normalizeSofmapMac(item: RakutenItem): Row | null {
  const name = item.name;
  if (!/^【(?:中古|未使用)/.test(name)) return null;
  const color = name.match(/SSD\d+(?:GB|TB)\s+(\S+)/)?.[1];
  return build(RAKUTEN_SOFMAP_SHOP, item, rankOf(item.rank, /^【未使用/.test(name)), colorOf(color));
}

/** イオシス: ランクは fetch.php が送る item.rank。未使用品の見分けは iPhone などと同じ。色は「Late 2020」の次の語（【Apple … の手前） */
export function normalizeIosysMac(item: RakutenItem): Row | null {
  const name = item.name;
  const unused = /^【未使用】|\s未使用\s+(?:【[^】]*】\s*)?イオシス/.test(name);
  const color = name.match(/(?:Early|Mid|Late)[\s-]?\d{4}\s+([ァ-ヶー]+)【/)?.[1];
  return build(RAKUTEN_IOSYS_SHOP, item, rankOf(item.rank, unused), colorOf(color));
}
