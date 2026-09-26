"""
にこスマ (nicosuma.com) スクレイパー
- Next.js の __NEXT_DATA__ JSON から商品データを抽出
- ページネーションは ?cb_page=N パラメータ
- metafield に model, storage, color, grade, battery, mno が構造化されている
"""
import os
import sys
import time
import re
import json
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import psycopg2
from db_guard import ensure_safe_to_replace
from psycopg2.extras import execute_values


def clean_database_url(url: str) -> str:
    if not url:
        return url
    url = url.strip('"').strip("'")
    parsed = urlparse(url)
    port = f":{parsed.port}" if parsed.port else ""
    clean_url = f"{parsed.scheme}://{parsed.username}:{parsed.password}@{parsed.hostname}{port}{parsed.path}"
    return clean_url

def is_iphone_13_or_later(model_name):
    """iPhone 13以降（SE 第3世代含む）か判定する。2021年10月以降発売モデルは原則SIMロックなし。"""
    # 13, 14, 15, 16 シリーズ
    if re.search(r'iPhone\s?(1[3-9])', model_name, re.IGNORECASE):
        return True
    # SE 第3世代
    if "SE" in model_name and "第3世代" in model_name:
        return True
    return False

# にこスマでスクレイピング対象とするiPhoneコレクション
IPHONE_COLLECTIONS = [
    # iPhone 17 Series
    "iphone-17-pro-max",
    "iphone-17-pro",
    "iphone-17e",
    "iphone-17",
    "iphone-air",
    # iPhone 16 Series
    "iphone-16e",
    "iphone-16-pro-max",
    "iphone-16-pro",
    "iphone-16-plus",
    "iphone-16",
    # iPhone 15 Series
    "iphone-15-pro-max",
    "iphone-15-pro",
    "iphone-15-plus",
    "iphone-15",
    # iPhone 14 Series
    "iphone-14-pro-max",
    "iphone-14-pro",
    "iphone-14-plus",
    "iphone-14",
    # iPhone 13 Series
    "iphone-se-3rd-gen",
    "iphone-13-pro-max",
    "iphone-13-pro",
    "iphone-13-mini",
    "iphone-13",
    # iPhone 12 Series
    "iphone-12-pro-max",
    "iphone-12-pro",
    "iphone-12-mini",
    "iphone-12",
    # iPhone 11 Series
    "iphone-11-pro-max",
    "iphone-11-pro",
    "iphone-11",
    # iPhone SE
    "iphone-se-2nd-gen",
]


def extract_products_from_page(html_content):
    """HTMLから __NEXT_DATA__ を解析して商品リストを返す"""
    soup = BeautifulSoup(html_content, "html.parser")
    script_tag = soup.find("script", {"id": "__NEXT_DATA__"})

    if not script_tag or not script_tag.string:
        return [], False

    try:
        data = json.loads(script_tag.string)
    except json.JSONDecodeError:
        return [], False

    props = data.get("props", {})
    page_props = props.get("pageProps", {})
    collection = page_props.get("collection", {})
    products = collection.get("products", [])

    items = []
    for product in products:
        meta = product.get("metafield", {}) or {}

        # モデル名
        model_name = meta.get("model", "iPhone")

        # ストレージ
        storage_str = meta.get("storage", "0GB")
        storage = 0
        m = re.search(r"(\d+)\s*(GB|TB)", storage_str, re.IGNORECASE)
        if m:
            val = int(m.group(1))
            storage = val * 1024 if m.group(2).upper() == "TB" else val

        # カラー
        color = meta.get("color", "不明")
        if not color:
            color = "不明"

        # グレード
        grade = meta.get("grade", "不明")
        if grade:
            grade = grade.strip()

        # バッテリー
        battery = meta.get("battery")
        if grade == 'S' or grade == '未使用品':
            battery = 100
        elif battery is not None:
            try:
                battery = int(battery)
            except (ValueError, TypeError):
                battery = None

        # ネットワーク / SIMロック
        mno = meta.get("mno", "")
        sim_unlocked = True # にこスマは基本SIMフリー/ロック解除済み
        
        # 利用制限の判定
        # にこスマは販路が不明なため、利用制限もNone（Null）とする
        network_status = None
            
        # iPhone 13以降のルール
        if is_iphone_13_or_later(model_name):
            sim_unlocked = True

        # 価格
        price = product.get("price", 0)
        if price is None:
            price = 0

        # 商品URL
        handle = product.get("handle", "")
        url = f"https://www.nicosuma.com/products/{handle}" if handle else ""

        # 在庫 (totalInventory が 0 または null なら売り切れの可能性)
        total_inventory = product.get("totalInventory")
        is_sold_out = total_inventory == 0

        # にこスマは販路が不明なため、carrierはNone（Null）とする
        mno = None
            
        items.append({
            "manufacturer": "Apple",
            "modelName": model_name,
            "storage": storage,
            "color": color,
            "conditionRank": grade,
            "batteryHealth": battery,
            "networkStatus": network_status,
            "simUnlocked": sim_unlocked,
            "carrier": mno,
            "price": price,
            "url": url,
            "shopName": "にこスマ",
            "isSoldOut": is_sold_out,
        })

    # ページネーション判定: 商品が存在すれば次のページがあるかも
    has_more = len(products) > 0
    return items, has_more


def scrape_nicosuma_collection(collection_handle):
    """1つのコレクション(例: iphone-15)の全商品をスクレイピング
    にこスマの__NEXT_DATA__は1ページ目で全商品を返すためページネーション不要"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    }

    url = f"https://www.nicosuma.com/iphone/{collection_handle}"
    print(f"  Fetching: {url}")
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        if response.status_code == 404:
            print(f"  404 Not Found - skipping '{collection_handle}'")
            return []
        print(f"  HTTP Error: {e}")
        return []
    except Exception as e:
        print(f"  Request Error: {e}")
        return []

    items, _ = extract_products_from_page(response.text)
    print(f"  Found {len(items)} items")
    return items


def scrape_nicosuma(max_collections=None):
    """全コレクションを並列スクレイピングし、URLベースで重複排除"""
    print(f"=== にこスマ スクレイピング開始 (max_collections={max_collections}) ===")
    all_items = []
    seen_urls = set()
    
    target_collections = IPHONE_COLLECTIONS
    if max_collections:
        target_collections = IPHONE_COLLECTIONS[:max_collections]

    # 最大15並列でフェッチ（高速化）
    with ThreadPoolExecutor(max_workers=15) as executor:
        future_to_collection = {
            executor.submit(scrape_nicosuma_collection, col): col
            for col in target_collections
        }

        for future in as_completed(future_to_collection):
            collection = future_to_collection[future]
            try:
                items = future.result()
            except Exception as e:
                print(f"  [{collection}] Error: {e}")
                continue

            new_count = 0
            for item in items:
                if item["url"] not in seen_urls:
                    seen_urls.add(item["url"])
                    all_items.append(item)
                    new_count += 1

            print(f"  [{collection}] New: {new_count} / Total so far: {len(all_items)}")

    print(f"\n=== 合計: {len(all_items)} 件の商品を取得（重複排除済み） ===")
    return all_items


def main():
    print("--- にこスマ スクレイピング開始 ---")

    max_collections = None
    if len(sys.argv) > 1:
        try:
            max_collections = int(sys.argv[1])
        except ValueError:
            pass
            
    # 1. データのスクレイピング
    try:
        items = scrape_nicosuma(max_collections=max_collections)
    except Exception as e:
        print(f"Scraping failed: {e}")
        sys.exit(1)

    if not items:
        print("No items found. Exiting.")
        sys.exit(1)

    # 2. データベース接続
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    db_url = None
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    db_url = line.split("=", 1)[1].strip()
                    break
    except Exception as e:
        print(f"Failed to read .env file: {e}")
        sys.exit(1)

    if not db_url:
        print("DATABASE_URL not found in .env")
        sys.exit(1)

    clean_url = clean_database_url(db_url)

    # 3. データベースの更新 (洗い替え方式)
    conn = None
    try:
        print("Connecting to PostgreSQL...")
        conn = psycopg2.connect(clean_url)
        cur = conn.cursor()

        conn.autocommit = False

        # 古いにこスマのデータを削除
        ensure_safe_to_replace(cur, 'にこスマ', len(items))

        print("Deleting old 'にこスマ' data...")
        cur.execute(
            'DELETE FROM "DeviceInventory" WHERE "shopName" = %s', ("にこスマ",)
        )

        print(f"Inserting {len(items)} new items...")
        insert_query = """
            INSERT INTO "DeviceInventory" (
                "id", "manufacturer", "modelName", "storage", "color",
                "conditionRank", "batteryHealth", "networkStatus", "simUnlocked", "carrier",
                "shopName", "price", "url", "isSoldOut", "createdAt", "updatedAt"
            ) VALUES %s
        """
        
        # バルクインサート用のデータ作成
        values = [
            (
                item["manufacturer"],
                item["modelName"],
                item["storage"],
                item["color"],
                item["conditionRank"],
                item["batteryHealth"],
                item["networkStatus"],
                item["simUnlocked"],
                item["carrier"],
                item["shopName"],
                item["price"],
                item["url"],
                item["isSoldOut"],
            )
            for item in items
        ]
        
        # gen_random_uuid() と NOW() を含めるためのテンプレート
        template = "(gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())"
        
        execute_values(cur, insert_query, values, template=template)

        conn.commit()
        print("Database update complete! 洗い替え完了。")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Database error occurred. Rollback executed: {e}")
        sys.exit(1)
    finally:
        if conn:
            cur.close()
            conn.close()
            print("Database connection closed.")

    print("--- スクレイピング処理完了 ---")


if __name__ == "__main__":
    main()
