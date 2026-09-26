import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jstToday } from "@/lib/priceHistory";

/**
 * データ更新の監視用。ショップごとの最終更新と価格推移の最終記録日を返す。
 * 取り込みは6時間ごとなので、24時間以上更新がなければ停止とみなし 503 を返す。
 * シンレンタルサーバーの cron（rakuten-sync/healthcheck.php）から毎日呼ばれる
 */

export const dynamic = "force-dynamic";

const STALE_HOURS = 24;

// 更新が止まっていても問題にしないショップ（WAF で取得できず、楽天経由に置き換えた旧ゲオなど）
const IGNORED_SHOPS = new Set(["ゲオモバイル"]);

export async function GET() {
  try {
    const now = Date.now();
    const shops = await prisma.deviceInventory.groupBy({
      by: ["shopName"],
      _count: { _all: true },
      _max: { updatedAt: true },
    });
    const lastSnapshot = await prisma.priceSnapshot.aggregate({ _max: { date: true } });

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
        };
      })
      .sort((a, b) => a.shop.localeCompare(b.shop, "ja"));

    // 価格推移は1日1回以上記録されるので、昨日の分が最後なら許容、それより古ければ停止
    const yesterday = jstToday();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const snapshotDate = lastSnapshot._max.date;
    const snapshotStale = !snapshotDate || snapshotDate < yesterday;

    const problems = [
      ...shopStatus.filter((s) => s.stale).map((s) => `${s.shop}: ${s.ageHours ?? "?"}時間更新なし`),
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
