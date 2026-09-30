"""
にこスマ (nicosuma.com) スクレイパー
- Next.js の __NEXT_DATA__ JSON から商品データを抽出
- ページネーションは ?cb_page=N パラメータ
- metafield に model, storage, color, grade, battery, mno が構造化されている
"""
import re
import json
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup
from common import WIFI_MODEL, PIXEL_ONLY_STORAGE, canonical_galaxy_model, canonical_pixel_model, run_scraper, is_iphone_13_or_later


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

# にこスマの iPad コレクション（機種名は npm run normalize:ipad で lib/ipadCatalog.ts の正式名にそろえる）。
# カタログにない古い機種（iPad Air 2・mini 4 など）は取らない
IPAD_COLLECTIONS = [
    "ipad-pro-13-inch-m4", "ipad-pro-11-inch-m4",
    "ipad-pro-12dot9-inch-6th-gen", "ipad-pro-11-inch-4gen",
    "ipad-pro-12dot9-inch-5th-gen", "ipad-pro-11-inch-3rd-gen",
    "ipad-pro-12dot9-inch-4th-gen", "ipad-pro-11-inch-2nd-gen",
    "ipad-pro-12dot9-inch-3rd-gen", "ipad-pro-11-inch",
    "ipad-pro-10dot5-inch", "ipad-pro-9dot7-inch",
    "ipad-air-13-inch-m3", "ipad-air-11-inch-m3", "ipad-air-13-inch-m2", "ipad-air-11-inch-m2",
    "ipad-air-5th-gen", "ipad-air-4th-gen", "ipad-air-3",
    "ipad-mini-7th-gen", "ipad-mini-6th-gen", "ipad-mini-5th-gen",
    "ipad-11th-gen", "ipad-10gen", "ipad-9th-gen", "ipad-8th-gen", "ipad-7th-gen", "ipad-6th-gen",
]

# Pixel（2026-09-30〜）。アップデート保証の対象の Pixel 6 以降だけ（https://www.nicosuma.com/android/pixel の一覧から）
PIXEL_COLLECTIONS = [
    "pixel-6", "pixel-6-pro", "pixel-6a", "pixel-7", "pixel-7-pro", "pixel-7a", "pixel-fold",
    "pixel-8", "pixel-8-pro", "pixel-8a", "pixel-9", "pixel-9-pro", "pixel-9-pro-xl", "pixel-9-pro-fold", "pixel-9a",
    "pixel-10", "pixel-10-pro", "pixel-10-pro-xl", "pixel-10-pro-fold", "pixel-10a",
    "pixel-11", "pixel-11-pro", "pixel-11-pro-xl", "pixel-11-pro-fold",
]

# Galaxy（2026-09-30〜）。カタログ（2022年以降）の機種だけ（https://www.nicosuma.com/android/galaxy の一覧から）
GALAXY_COLLECTIONS = [
    "galaxy-s22-5g", "galaxy-s22-ultra-5g", "galaxy-s23", "galaxy-s23-ultra", "galaxy-s24", "galaxy-s24-fe", "galaxy-s24-ultra",
    "galaxy-s25", "galaxy-s25-ultra",
    "galaxy-z-fold4", "galaxy-z-fold5", "galaxy-z-fold6", "galaxy-z-fold7-ram-12gb", "galaxy-z-fold7-ram-16gb",
    "galaxy-z-flip4", "galaxy-z-flip5", "galaxy-z-flip6", "galaxy-z-flip7",
    "galaxy-a23-5g", "galaxy-a25-5g", "galaxy-a53-5g", "galaxy-a54-5g", "galaxy-a55-5g",
]

# iPad の mno（販路）→ 他ショップと揃えた carrier
IPAD_CARRIERS = {
    "Wi-Fiモデル": WIFI_MODEL,
    "NTTドコモ": "docomo",
    "au": "au",
    "ソフトバンク": "SoftBank",
    "SIMフリー版": "国内版SIMフリー",
    "楽天モバイル": "楽天モバイル",
}


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

        # iPhone は販路が不明なため carrier は None（Null）。iPad は Wi-Fi/セルラーの区別に必要なので mno から入れる
        is_ipad = model_name.startswith("iPad")
        mno = IPAD_CARRIERS.get(mno) if is_ipad else None

        # Pixel は Google の表記にそろえる（Pixel 5a 以前・読み取れないものは入れない）
        manufacturer = "Apple"
        if "pixel" in model_name.lower():
            model_name = canonical_pixel_model(model_name)
            if not model_name:
                continue
            manufacturer = "Google"
            if not storage:
                storage = PIXEL_ONLY_STORAGE.get(model_name, 0)
            if not storage:
                continue  # 容量が読めない Pixel は表で「0GB」になるので入れない
        elif "galaxy" in model_name.lower():
            model_name = canonical_galaxy_model(model_name)
            if not model_name or not storage:
                continue  # カタログ外（2021年以前）・容量が読めないものは入れない
            manufacturer = "Samsung"

        items.append({
            "manufacturer": manufacturer,
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


def scrape_nicosuma_collection(collection_handle, category="iphone"):
    """1つのコレクション(例: iphone-15)の全商品をスクレイピング
    にこスマの__NEXT_DATA__は1ページ目で全商品を返すためページネーション不要"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    }

    url = f"https://www.nicosuma.com/{category}/{collection_handle}"
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
    
    # (カテゴリ, コレクション) の組。max_collections はテスト用に先頭から絞る
    target_collections = (
        [("iphone", c) for c in IPHONE_COLLECTIONS]
        + [("ipad", c) for c in IPAD_COLLECTIONS]
        + [("android/pixel", c) for c in PIXEL_COLLECTIONS]
        + [("android/galaxy", c) for c in GALAXY_COLLECTIONS]
    )
    if max_collections:
        target_collections = target_collections[:max_collections]

    # 最大15並列でフェッチ（高速化）
    with ThreadPoolExecutor(max_workers=15) as executor:
        future_to_collection = {
            executor.submit(scrape_nicosuma_collection, handle, category): f"{category}/{handle}"
            for category, handle in target_collections
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


if __name__ == "__main__":
    run_scraper("にこスマ", lambda limit: scrape_nicosuma(max_collections=limit), None)
