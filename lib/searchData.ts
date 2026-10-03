import prisma from "@/lib/prisma";
import { ALL_DEVICE_PAGE_MODELS, deviceOf, modelToSlug, type Device } from "@/lib/catalog";
import { matchesModel } from "@/lib/modelMatch";

/**
 * 検索ページ用の在庫データ（静的書き出し版）。ビルドのたびに機種ごとの JSON を書き出し（app/data/inventory/[file]/route.ts）、
 * 検索ページはブラウザで読み込んで絞り込む。実行時に DB へ触らないので Neon が起きない。
 *
 * ファイルは「機種ページの機種ごと」（例: iphone-13.json）と、どの機種にも当たらない表記の「種類ごと」（other-iphone.json など）。
 * 機種への振り分けは検索と同じ matchesModel（機種ページの機種名を検索語として、DB の機種名に当てる）
 */

/** ブラウザに渡す1件（配列で持ってファイルを小さくする）。並びは INVENTORY_FIELDS */
export type InventoryRow = [
  modelName: string,
  storage: number,
  color: string,
  conditionRank: string,
  batteryHealth: number | null,
  networkStatus: string | null,
  simUnlocked: 0 | 1,
  carrier: string | null,
  shop: number, // InventoryFile.shops の添字
  price: number,
  url: string,
];

export type InventoryFile = {
  /** このファイルの機種（other-* は null） */
  model: string | null;
  shops: string[];
  rows: InventoryRow[];
};

export type InventoryIndex = {
  generatedAt: string;
  /** ファイル名（拡張子なし） → 機種名・種類・件数 */
  files: Record<string, { model: string | null; device: Device; count: number }>;
};

const OTHER_PREFIX = "other-";

// 機種名の先頭で種類を見分ける（DB 版の検索の startsWith と同じく大文字小文字を区別）。どれでもない名前は検索に出さない
const deviceOfName = (name: string): Device | null =>
  name.startsWith("iPhone") ? "iphone" : name.startsWith("iPad") ? "ipad" : name.startsWith("Pixel") ? "pixel" : name.startsWith("Galaxy") ? "galaxy" : null;

/** ファイル名（拡張子なし）の一覧。在庫の有無にかかわらず全機種＋種類ごとの other を書き出す（ブラウザ側で 404 を出さないため） */
export function inventoryFileKeys(): string[] {
  return [
    ...ALL_DEVICE_PAGE_MODELS.map(modelToSlug),
    ...(["iphone", "ipad", "pixel", "galaxy"] as const).map((d) => `${OTHER_PREFIX}${d}`),
  ];
}

// DB の機種名 → ファイル名。ビルドの各ワーカーで1回だけ作る
let bucketsPromise: Promise<Map<string, string[]>> | null = null;

function buckets(): Promise<Map<string, string[]>> {
  bucketsPromise ??= (async () => {
    const rows = await prisma.deviceInventory.groupBy({ by: ["modelName"], where: { isSoldOut: false } });
    const map = new Map<string, string[]>();
    for (const { modelName } of rows) {
      const page = ALL_DEVICE_PAGE_MODELS.find((m) => matchesModel(m, modelName));
      const device = deviceOfName(modelName);
      if (!page && !device) continue;
      const key = page ? modelToSlug(page) : `${OTHER_PREFIX}${device}`;
      map.set(key, [...(map.get(key) ?? []), modelName]);
    }
    return map;
  })();
  return bucketsPromise;
}

export async function inventoryFile(key: string): Promise<InventoryFile> {
  const names = (await buckets()).get(key) ?? [];
  const model = key.startsWith(OTHER_PREFIX) ? null : ALL_DEVICE_PAGE_MODELS.find((m) => modelToSlug(m) === key) ?? null;
  if (names.length === 0) return { model, shops: [], rows: [] };

  const items = await prisma.deviceInventory.findMany({
    where: { modelName: { in: names }, isSoldOut: false },
    select: {
      modelName: true, storage: true, color: true, conditionRank: true, batteryHealth: true,
      networkStatus: true, simUnlocked: true, carrier: true, shopName: true, price: true, url: true,
    },
    orderBy: [{ price: "asc" }, { id: "asc" }],
  });
  const shops = [...new Set(items.map((i) => i.shopName))];
  return {
    model,
    shops,
    rows: items.map((i) => [
      i.modelName, i.storage, i.color, i.conditionRank, i.batteryHealth, i.networkStatus,
      i.simUnlocked ? 1 : 0, i.carrier, shops.indexOf(i.shopName), i.price, i.url,
    ]),
  };
}

export async function inventoryIndex(): Promise<InventoryIndex> {
  const map = await buckets();
  const counts = await prisma.deviceInventory.groupBy({ by: ["modelName"], where: { isSoldOut: false }, _count: { _all: true } });
  const countOf = new Map(counts.map((c) => [c.modelName, c._count._all]));
  const files: InventoryIndex["files"] = {};
  for (const key of inventoryFileKeys()) {
    const other = key.startsWith(OTHER_PREFIX);
    const model = other ? null : ALL_DEVICE_PAGE_MODELS.find((m) => modelToSlug(m) === key)!;
    files[key] = {
      model,
      device: other ? (key.slice(OTHER_PREFIX.length) as Device) : deviceOf(model!),
      count: (map.get(key) ?? []).reduce((n, name) => n + (countOf.get(name) ?? 0), 0),
    };
  }
  return { generatedAt: new Date().toISOString(), files };
}
