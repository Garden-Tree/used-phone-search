import { NextRequest, NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { timingSafeEqual } from "node:crypto";
import prisma from "@/lib/prisma";
import {
  LEGACY_GEO_SHOP,
  RAKUTEN_GEO_SHOP,
  normalizeRakutenGeoItem,
  type RakutenGeoItem,
} from "@/lib/rakutenGeo";

/**
 * シンレンタルサーバーの rakuten-sync/fetch.php から、楽天API で取得した
 * ゲオモバイル楽天市場店の在庫を受け取り、DeviceInventory を洗い替えする。
 */

// 取得件数が既存の何割未満なら洗い替えを中止するか（scraper/db_guard.py と同じ考え方）
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

  let items: RakutenGeoItem[];
  try {
    const raw = Buffer.from(await request.arrayBuffer());
    const json = request.headers.get("content-type")?.includes("gzip") ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
    items = JSON.parse(json).items;
    if (!Array.isArray(items)) throw new Error("items is not an array");
  } catch (error) {
    return NextResponse.json({ error: "invalid body", detail: String(error) }, { status: 400 });
  }

  const rows = items.map(normalizeRakutenGeoItem).filter((r) => r !== null);
  const skipped = items.filter((item) => normalizeRakutenGeoItem(item) === null);

  const existing = await prisma.deviceInventory.count({ where: { shopName: RAKUTEN_GEO_SHOP } });
  const force = request.nextUrl.searchParams.get("force") === "1";
  if (!force && existing >= MIN_EXISTING_TO_CHECK && rows.length < existing * MIN_REPLACE_RATIO) {
    return NextResponse.json(
      { error: "replace aborted", reason: `取得件数 ${rows.length} 件が既存 ${existing} 件の ${MIN_REPLACE_RATIO * 100}% 未満` },
      { status: 409 },
    );
  }

  await prisma.$transaction(
    async (tx) => {
      // 旧スクレイパーで取り込んだ古いゲオの在庫も、楽天経由の在庫に置き換える
      await tx.deviceInventory.deleteMany({ where: { shopName: { in: [RAKUTEN_GEO_SHOP, LEGACY_GEO_SHOP] } } });
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        await tx.deviceInventory.createMany({ data: rows.slice(i, i + INSERT_CHUNK) });
      }
    },
    { timeout: 60_000 },
  );

  return NextResponse.json({
    received: items.length,
    inserted: rows.length,
    skipped: skipped.length,
    skippedSamples: skipped.slice(0, 10).map((s) => s.name),
  });
}
