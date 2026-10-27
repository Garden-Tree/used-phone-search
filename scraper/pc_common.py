"""
中古パソコン（PcInventory）の取り込みの共通処理（2026-10-27〜）

スマホの DeviceInventory とは別の表。洗い替えの安全チェックは common.py と同じ考え方（取得件数が既存の半分未満なら止める）。
取得は1日2回まで: 前回の取り込みから PC_MIN_HOURS 経っていなければ何もしない（スクレイパー全体は6時間ごとに動くため）
"""
import os
import sys

import psycopg2
from psycopg2.extras import execute_values

from common import DEFAULT_MIN_RATIO, MIN_EXISTING_TO_CHECK, ReplaceGuardError, load_database_url

PC_MIN_HOURS = 11

PC_COLUMNS = [
    "shopName", "formFactor", "maker", "productName", "cpu", "cpuFamily", "cpuGen", "win11",
    "memoryGB", "storageGB", "storageType", "gpu", "screenInch", "conditionRank", "rankLabel",
    "stock", "price", "url",
]


def recently_updated(shop_name: str) -> bool:
    """前回の取り込みから PC_MIN_HOURS 経っていないか（FORCE_PC=1 で無視）"""
    if os.environ.get("FORCE_PC") == "1":
        return False
    conn = psycopg2.connect(load_database_url())
    try:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT MAX("updatedAt") > (NOW() AT TIME ZONE \'UTC\') - make_interval(hours => %s) '
                'FROM "PcInventory" WHERE "shopName" = %s',
                (PC_MIN_HOURS, shop_name),
            )
            return bool(cur.fetchone()[0])
    finally:
        conn.close()


def replace_pc_inventory(shop_name: str, items: list[dict]) -> None:
    """店の中古パソコンを洗い替える（1トランザクション）"""
    conn = psycopg2.connect(load_database_url())
    try:
        with conn:
            with conn.cursor() as cur:
                if os.environ.get("FORCE_REPLACE") != "1":
                    cur.execute('SELECT COUNT(*) FROM "PcInventory" WHERE "shopName" = %s', (shop_name,))
                    existing = cur.fetchone()[0]
                    if existing >= MIN_EXISTING_TO_CHECK and len(items) < existing * DEFAULT_MIN_RATIO:
                        raise ReplaceGuardError(f"[{shop_name}] 取得 {len(items)} 件が既存 {existing} 件の半分未満のため中止")
                cur.execute('DELETE FROM "PcInventory" WHERE "shopName" = %s', (shop_name,))
                columns = ", ".join(f'"{c}"' for c in PC_COLUMNS)
                execute_values(
                    cur,
                    f'INSERT INTO "PcInventory" ("id", {columns}, "createdAt", "updatedAt") VALUES %s',
                    [tuple(item.get(c) for c in PC_COLUMNS) for item in items],
                    template=f"(gen_random_uuid(), {', '.join(['%s'] * len(PC_COLUMNS))}, NOW(), NOW())",
                )
        print(f"[{shop_name}] {len(items)} 件を取り込みました")
    finally:
        conn.close()


def run_pc_scraper(shop_name: str, scrape) -> None:
    """main。--dry なら取り込まずに件数と先頭の数件を出す"""
    dry = "--dry" in sys.argv
    if not dry and recently_updated(shop_name):
        print(f"[{shop_name}] 前回の取り込みから {PC_MIN_HOURS} 時間たっていないので飛ばします")
        return
    try:
        items = scrape()
    except Exception as e:
        print(f"Scraping failed: {e}")
        sys.exit(1)
    if not items:
        print("No items found. Exiting.")
        sys.exit(1)
    if dry:
        for it in items[:15]:
            print(it)
        print(f"[{shop_name}] {len(items)} 件（--dry: 取り込みなし）")
        return
    try:
        replace_pc_inventory(shop_name, items)
    except Exception as e:
        print(f"Database error occurred. Rollback executed: {e}")
        sys.exit(1)
