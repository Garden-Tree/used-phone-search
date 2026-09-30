import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jstToday } from "@/lib/priceHistory";
import { SHOPS } from "@/lib/shops";

/**
 * データ更新の監視用。ショップごとの最終更新と価格推移の最終記録日を返す。
 * 取り込みは6時間ごとなので、24時間以上更新がなければ停止とみなし 503 を返す。
 * 店ごとに iPhone・iPad・Pixel・Galaxy をまとめて洗い替えるので、ある種類の一覧だけ取れなかった回はその種類が0件になる
 * （店の合計件数の安全装置には当たらない）。lib/shops.ts で扱うことになっている種類が0件でも 503 を返す
 * シンレンタルサーバーの cron（rakuten-sync/healthcheck.php）から毎日呼ばれる
 */

export const dynamic = "force-dynamic";

const STALE_HOURS = 24;

// 更新が止まっていても問題にしないショップ（WAF で取得できず、楽天経由に置き換えた旧ゲオなど）
const IGNORED_SHOPS = new Set(["ゲオモバイル"]);

// 種類ごとの件数を見る（機種名の先頭で見分ける。lib/shops.ts の ipad・pixel・galaxy が true の店は1件以上あるはず）
const DEVICES = [
  { key: "ipad", label: "iPad", prefix: "iPad" },
  { key: "pixel", label: "Pixel", prefix: "Pixel" },
  { key: "galaxy", label: "Galaxy", prefix: "Galaxy" },
] as const;

export async function GET() {
  try {
    const now = Date.now();
    const shops = await prisma.deviceInventory.groupBy({
      by: ["shopName"],
      _count: { _all: true },
      _max: { updatedAt: true },
    });
    const lastSnapshot = await prisma.priceSnapshot.aggregate({ _max: { date: true } });
    // 店×種類の件数（DB 側で集計。1種類あたり店の数だけの行）
    const deviceCounts = new Map<string, number>();
    for (const d of DEVICES) {
      const rows = await prisma.deviceInventory.groupBy({
        by: ["shopName"],
        where: { modelName: { startsWith: d.prefix } },
        _count: { _all: true },
      });
      for (const r of rows) deviceCounts.set(`${r.shopName}:${d.key}`, r._count._all);
    }

    const shopStatus = shops
      .filter((s) => !IGNORED_SHOPS.has(s.shopName))
      .map((s) => {
        const updated = s._max.updatedAt;
        const ageHours = updated ? Math.round(((now - updated.getTime()) / 3_600_000) * 10) / 10 : null;
        return {
          shop: s.shopName,
          count: s._count._all,
          lastUpdated: updated?.toISOString() ?? null,
          ageHours,
          stale: ageHours === null || ageHours > STALE_HOURS,
          devices: Object.fromEntries(DEVICES.map((d) => [d.key, deviceCounts.get(`${s.shopName}:${d.key}`) ?? 0])),
        };
      })
      .sort((a, b) => a.shop.localeCompare(b.shop, "ja"));

    // 価格推移は1日1回以上記録されるので、昨日の分が最後なら許容、それより古ければ停止
    const yesterday = jstToday();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const snapshotDate = lastSnapshot._max.date;
    const snapshotStale = !snapshotDate || snapshotDate < yesterday;

    // 扱うはずの種類が0件の店（その種類の一覧だけ取れなかった・読み取りが壊れたなど）
    const missing = SHOPS.flatMap((shop) =>
      DEVICES.filter((d) => shop[d.key] && !deviceCounts.get(`${shop.name}:${d.key}`)).map((d) => `${shop.label}: ${d.label} が0件`),
    );

    const problems = [
      ...shopStatus.filter((s) => s.stale).map((s) => `${s.shop}: ${s.ageHours ?? "?"}時間更新なし`),
      ...missing,
      ...(snapshotStale ? [`価格推移: 最終記録 ${snapshotDate?.toISOString().slice(0, 10) ?? "なし"}`] : []),
    ];

    return NextResponse.json(
      {
        ok: problems.length === 0,
        checkedAt: new Date(now).toISOString(),
        problems,
        shops: shopStatus,
        lastPriceSnapshot: snapshotDate?.toISOString().slice(0, 10) ?? null,
      },
      { status: problems.length === 0 ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, problems: [`DB に接続できません: ${String(error)}`] },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
