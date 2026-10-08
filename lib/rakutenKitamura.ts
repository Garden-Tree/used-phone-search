import type { Prisma } from "@prisma/client";
import { toStorage, type RakutenItem } from "@/lib/rakutenCommon";
import { isKnownIphoneModel, normalizeModelPart } from "@/lib/iphoneModelName";
import { canonicalIpadModel } from "@/lib/ipadCatalog";
import { canonicalPixelModel } from "@/lib/pixelCatalog";
import { canonicalGalaxyModel } from "@/lib/galaxyCatalog";
import { WIFI_MODEL } from "@/lib/rakutenIpad";

/**
 * カメラのキタムラ（楽天市場店 emedama。2026-10-08〜）の商品1件を DeviceInventory の行にする。
 *
 * 商品名の例:
 *   【中古：AA(新品同様)】Apple iPhone 14 128GB ミッドナイト SIMフリー アイフォン 中古 SIMフリー スマートフォン 本体 …
 *   【中古：AB(良品)】 Apple iPhone SE（第3世代） 128GB (PRODUCT)RED SIMフリー【ガラスフィルム付属】 …
 *   【中古：A(美品)】Apple iPad （第8世代） Wi-Fi 32GB シルバー【2WAYスタイラスペン付属】 …
 *   【中古：AA(新品同様)】Google Pixel 8a 128GB Bay（ブルー系） SIMフリー 《納期約1－2週間》
 *   【中古：A(美品)】Samsung Galaxy S24 Ultra　SC-52E 512GB チタニウム ブラック SIMフリー
 *
 * - ケース・フィルムなどの付属品も同じ検索に出るので、「【中古：…】」で始まる本体だけを読む
 * - 状態ランク（商品説明「■状態の基準」）: AA(新品同様)・A(美品) → A、AB(良品) → B、B(並品) → C、C → D
 * - バッテリー: 「バッテリー状態は全品純正バッテリー80％以上」（商品説明）→ 80（lib/shops.ts の battery は over80）
 */

export const RAKUTEN_KITAMURA_SHOP = "カメラのキタムラ（楽天市場店）";

type Row = Prisma.DeviceInventoryCreateManyInput;

const RANKS: Record<string, string> = { AA: "A", A: "A", AB: "B", B: "C", C: "D" };

const HEAD_RE = /【中古[：:]\s*(AA|AB|A|B|C)\b[^】]*】\s*/;

/** Galaxy の型番から元のキャリア（SC-52E は docomo、SCG26 は au、SM-xxxxQ は国内版） */
function galaxyCarrier(name: string): string {
  if (/\bSC-\d/.test(name)) return "docomo";
  if (/\bSCG\d/.test(name)) return "au";
  if (/\b(?:A\d{3}SC|SG\d{2})\b/.test(name)) return "SoftBank";
  return "国内版";
}

export function normalizeKitamuraItem(item: RakutenItem): Row | null {
  if (!item.url || !(item.price > 0)) return null;
  const head = item.name.match(HEAD_RE);
  if (!head) return null;
  const conditionRank = RANKS[head[1]] ?? "不明";
  // 「【ガラスフィルム付属】」などの後ろは検索用の語なので読まない
  const b = item.name.slice((head.index ?? 0) + head[0].length).split("【")[0].replace(/[\s　]+/g, " ").trim();
  const storages = [...b.matchAll(/(\d+)\s*(GB|TB)/g)];
  if (storages.length !== 1) return null;
  const storage = toStorage(storages[0][1], storages[0][2]);
  const after = b.slice((storages[0].index ?? 0) + storages[0][0].length).trim();
  // 色: 容量の後ろから「SIMフリー」・「アイフォン」などの説明語・「《納期…》」の手前まで。「Bay（ブルー系）」の（…系）は落とす
  const color = after
    .split(/\sSIMフリー|\sアイフォン|\sアイパッド|\sスマホ|\sスマートフォン|\sタブレット|\sグーグル|\s正規|\s中古|\s《|《/)[0]
    .replace(/（[^）]*系）/g, "")
    .trim() || "-";
  const simFree = /SIMフリー/.test(item.name);
  const common = { price: item.price, url: item.url, isSoldOut: false, shopName: RAKUTEN_KITAMURA_SHOP, networkStatus: null, conditionRank, batteryHealth: 80, storage, color };

  const iphone = b.match(/^Apple iPhone\s?(.+?)\s*\d+\s*(?:GB|TB)/);
  if (iphone) {
    const modelName = `iPhone ${normalizeModelPart(iphone[1])}`;
    if (!isKnownIphoneModel(modelName)) return null;
    return { ...common, manufacturer: "Apple", modelName, simUnlocked: simFree, carrier: null }; // 元のキャリアは書かれていない（「SIMフリー」とだけ出す）
  }

  const ipad = b.match(/^Apple ((?:\d+(?:\.\d)?インチ )?iPad.*?)\s*(Wi-Fi(?:\+Cellular)?)?\s*\d+\s*(?:GB|TB)/);
  if (ipad) {
    const modelName = canonicalIpadModel(ipad[1]);
    if (!modelName) return null;
    const cellular = /Cellular/i.test(ipad[2] ?? "");
    return {
      ...common, manufacturer: "Apple", modelName,
      simUnlocked: !cellular || simFree, carrier: cellular ? null : WIFI_MODEL,
    };
  }

  const pixel = b.match(/^Google (Pixel.*?)\s*\d+\s*(?:GB|TB)/);
  if (pixel) {
    const modelName = canonicalPixelModel(pixel[1]);
    if (!modelName) return null;
    return { ...common, manufacturer: "Google", modelName, simUnlocked: true, carrier: "Google" };
  }

  const galaxy = b.match(/^Samsung (Galaxy.*?)\s*(?:SC-?G?\S*\s*)?\d+\s*(?:GB|TB)/i);
  if (galaxy) {
    const modelName = canonicalGalaxyModel(galaxy[1]);
    if (!modelName) return null;
    return { ...common, manufacturer: "Samsung", modelName, simUnlocked: true, carrier: galaxyCarrier(b) };
  }
  return null;
}
