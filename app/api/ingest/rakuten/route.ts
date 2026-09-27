import { NextRequest, NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { timingSafeEqual } from "node:crypto";
import prisma from "@/lib/prisma";
import { RAKUTEN_SHOPS, type RakutenItem } from "@/lib/rakutenShops";

/**
 * シンレンタルサーバーの rakuten-sync/fetch.php から、楽天API で取得した
 * 楽天市場店の在庫を受け取り、そのショップの DeviceInventory を洗い替えする。
 * ショップは ?shop=<楽天の shopCode>（省略時はゲオモバイル）で指定する。
 */

// 取得件数が既存の何割未満なら洗い替えを中止するか（scraper/common.py の ensure_safe_to_replace と同じ考え方）
const MIN_REPLACE_RATIO = 0.5;
const MIN_EXISTING_TO_CHECK = 20;
const INSERT_CHUNK = 1000;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.RAKUTEN_INGEST_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const shopCode = request.nextUrl.searchParams.get("shop") ?? "geo-mobile";
  const shop = RAKUTEN_SHOPS[shopCode];
  if (!shop) {
    return NextResponse.json({ error: "unknown shop", shop: shopCode }, { status: 400 });
  }

  let items: RakutenItem[];
  try {
    const raw = Buffer.from(await request.arrayBuffer());
    const json = request.headers.get("content-type")?.includes("gzip") ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
    items = JSON.parse(json).items;
    if (!Array.isArray(items)) throw new Error("items is not an array");
  } catch (error) {
    return NextResponse.json({ error: "invalid body", detail: String(error) }, { status: 400 });
  }

  const rows = items.map(shop.normalize).filter((r) => r !== null);
  const skipped = items.filter((item) => shop.normalize(item) === null);

  const existing = await prisma.deviceInventory.count({ where: { shopName: shop.shopName } });
  const force = request.nextUrl.searchParams.get("force") === "1";
  if (!force && existing >= MIN_EXISTING_TO_CHECK && rows.length < existing * MIN_REPLACE_RATIO) {
    return NextResponse.json(
      { error: "replace aborted", reason: `取得件数 ${rows.length} 件が既存 ${existing} 件の ${MIN_REPLACE_RATIO * 100}% 未満` },
      { status: 409 },
    );
  }

  await prisma.$transaction(
    async (tx) => {
      // 旧スクレイパーで取り込んだ古い在庫（旧ゲオなど）も、楽天経由の在庫に置き換える
      await tx.deviceInventory.deleteMany({ where: { shopName: { in: [shop.shopName, ...shop.alsoReplace] } } });
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        await tx.deviceInventory.createMany({ data: rows.slice(i, i + INSERT_CHUNK) });
      }
    },
    { timeout: 60_000 },
  );

  return NextResponse.json({
    shop: shop.shopName,
    received: items.length,
    inserted: rows.length,
    skipped: skipped.length,
    skippedSamples: skipped.slice(0, 10).map((s) => s.name),
  });
}
