"""
スクレイパー共通の処理

- DB 接続情報の読み込み（環境変数 DATABASE_URL → なければプロジェクト直下の .env）
- ショップ単位の洗い替え（安全チェック → DELETE → 一括 INSERT を1トランザクションで）
- 各スクレイパーの main（引数の取得数 → 取得 → 洗い替え → 失敗時は exit 1）

新しいスクレイパーは、商品の dict のリストを返す関数を書き、`run_scraper(ショップ名, 関数, 既定の取得数)` を呼ぶだけでよい。
商品の dict のキーは INSERT_COLUMNS を参照（isSoldOut は省略可）。
"""
import os
import re
import sys
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import execute_values

# 既存件数に対する新規件数の下限比率。環境変数 MIN_REPLACE_RATIO で上書き可能
DEFAULT_MIN_RATIO = 0.5
# 既存件数がこれ未満なら比較しない（初回実行・小規模ショップ向け）
MIN_EXISTING_TO_CHECK = 20

INSERT_COLUMNS = [
    "manufacturer", "modelName", "storage", "color", "conditionRank", "batteryHealth",
    "networkStatus", "simUnlocked", "carrier", "shopName", "price", "url", "isSoldOut",
]

# iPad の Wi-Fi モデルの carrier の値（lib/rakutenIpad.ts の WIFI_MODEL と同じ）
WIFI_MODEL = "Wi-Fiモデル"


class ReplaceGuardError(Exception):
    pass


def clean_database_url(url: str) -> str:
    """Prisma 用の DATABASE_URL から psycopg2 が解釈できないクエリパラメータを除く"""
    if not url:
        return url
    url = url.strip('"').strip("'")
    parsed = urlparse(url)
    port = f":{parsed.port}" if parsed.port else ""
    return f"{parsed.scheme}://{parsed.username}:{parsed.password}@{parsed.hostname}{port}{parsed.path}"


def load_database_url() -> str:
    """環境変数 DATABASE_URL、なければプロジェクト直下の .env から読む"""
    url = os.environ.get("DATABASE_URL")
    if not url:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("DATABASE_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except OSError as e:
            raise RuntimeError(f".env を読めませんでした: {e}") from e
    if not url:
        raise RuntimeError("DATABASE_URL が環境変数にも .env にもありません")
    return clean_database_url(url)


# Google Pixel（2026-09-30〜）。機種名は Google の表記（"Pixel 8a" "Pixel 9 Pro Fold"）にそろえる。
# 掲載するのはアップデート保証の対象の Pixel 6 以降（Google「Pixel のアップデート保証期間」）。一覧は lib/pixelCatalog.ts と同じ
PIXEL_MODELS = {
    "Pixel 6", "Pixel 6 Pro", "Pixel 6a", "Pixel 7", "Pixel 7 Pro", "Pixel 7a", "Pixel Fold",
    "Pixel 8", "Pixel 8 Pro", "Pixel 8a", "Pixel 9", "Pixel 9 Pro", "Pixel 9 Pro XL", "Pixel 9 Pro Fold", "Pixel 9a",
    "Pixel 10", "Pixel 10 Pro", "Pixel 10 Pro XL", "Pixel 10 Pro Fold", "Pixel 10a",
    "Pixel 11", "Pixel 11 Pro", "Pixel 11 Pro XL", "Pixel 11 Pro Fold",
}
# 容量が1種類しかなく、商品名に容量が書かれないことがある機種（Google の技術仕様: 6a・7a は 128GB のみ）
PIXEL_ONLY_STORAGE = {"Pixel 6a": 128, "Pixel 7a": 128}

_PIXEL_RE = re.compile(r"Pixel\s?(\d{1,2})\s?(a|Pro\s?Fold|Pro\s?XL|Pro)?(?![0-9A-Za-z])", re.IGNORECASE)


def canonical_pixel_model(raw_name: str):
    """商品名から Pixel の機種名を返す。Pixel 5a 以前・読み取れないものは None"""
    m = _PIXEL_RE.search(raw_name)
    if m:
        variant = (m.group(2) or "").lower().replace(" ", "")
        suffix = {"": "", "a": "a", "pro": " Pro", "proxl": " Pro XL", "profold": " Pro Fold"}[variant]
        name = f"Pixel {int(m.group(1))}{suffix}"
    elif re.search(r"Pixel\s?Fold", raw_name, re.IGNORECASE):
        name = "Pixel Fold"
    else:
        return None
    return name if name in PIXEL_MODELS else None


def is_iphone_13_or_later(model_name: str) -> bool:
    """iPhone 13 以降（SE 第3世代含む）か。2021年10月以降の発売モデルは原則 SIM ロックなしで売られている"""
    if re.search(r"iPhone\s?(1[3-9])", model_name, re.IGNORECASE):
        return True
    return "SE" in model_name and "第3世代" in model_name


def ensure_safe_to_replace(cur, shop_name: str, new_count: int) -> None:
    """新規取得件数が既存件数より大幅に少ない場合は ReplaceGuardError を送出する。
    スクレイピングが途中で打ち切られた（WAF・タイムアウト等）ときに、少数の結果で在庫を丸ごと消さないため。
    FORCE_REPLACE=1 でチェックを無効化できる。"""
    if os.environ.get("FORCE_REPLACE") == "1":
        return

    cur.execute('SELECT COUNT(*) FROM "DeviceInventory" WHERE "shopName" = %s', (shop_name,))
    existing_count = cur.fetchone()[0]
    if existing_count < MIN_EXISTING_TO_CHECK:
        return

    min_ratio = float(os.environ.get("MIN_REPLACE_RATIO", DEFAULT_MIN_RATIO))
    if new_count < existing_count * min_ratio:
        raise ReplaceGuardError(
            f"[{shop_name}] 取得件数 {new_count} 件が既存 {existing_count} 件の "
            f"{int(min_ratio * 100)}% 未満のため、洗い替えを中止しました（既存データは保持）。"
            f"強制的に置き換える場合は FORCE_REPLACE=1 を指定してください。"
        )


def replace_shop_inventory(shop_name: str, items: list[dict]) -> None:
    """ショップの在庫を洗い替える（1トランザクション。失敗時はロールバックして例外を投げる）"""
    conn = psycopg2.connect(load_database_url())
    try:
        with conn:  # 正常終了で commit、例外で rollback
            with conn.cursor() as cur:
                ensure_safe_to_replace(cur, shop_name, len(items))
                print(f"Deleting old '{shop_name}' data...")
                cur.execute('DELETE FROM "DeviceInventory" WHERE "shopName" = %s', (shop_name,))

                print(f"Inserting {len(items)} new items...")
                columns = ", ".join(f'"{c}"' for c in INSERT_COLUMNS)
                values = [
                    tuple(item.get("isSoldOut", False) if c == "isSoldOut" else item.get(c) for c in INSERT_COLUMNS)
                    for item in items
                ]
                placeholders = ", ".join(["%s"] * len(INSERT_COLUMNS))
                execute_values(
                    cur,
                    f'INSERT INTO "DeviceInventory" ("id", {columns}, "createdAt", "updatedAt") VALUES %s',
                    values,
                    template=f"(gen_random_uuid(), {placeholders}, NOW(), NOW())",
                )
        print("Database update complete! 洗い替え完了。")
    finally:
        conn.close()


def run_scraper(shop_name: str, scrape, default_limit: int) -> None:
    """スクレイパーの main。第1引数を取得数（ページ数など）として scrape(limit) を呼び、結果で洗い替える。
    0件・取得失敗・DB エラーはいずれも exit 1（run_all_scrapers.py 経由で GitHub Actions を失敗にする）"""
    print(f"--- {shop_name} スクレイピング開始 ---")
    limit = default_limit
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
        except ValueError:
            pass

    try:
        items = scrape(limit)
    except Exception as e:
        print(f"Scraping failed: {e}")
        sys.exit(1)

    if not items:
        print("No items found. Exiting.")
        sys.exit(1)

    try:
        replace_shop_inventory(shop_name, items)
    except Exception as e:
        print(f"Database error occurred. Rollback executed: {e}")
        sys.exit(1)

    print("--- スクレイピング処理完了 ---")
