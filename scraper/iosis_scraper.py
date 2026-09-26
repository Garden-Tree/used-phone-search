import os
import sys
import time
import re
import requests
from urllib.parse import urlparse
import psycopg2
from db_guard import ensure_safe_to_replace
from psycopg2.extras import execute_values
from bs4 import BeautifulSoup

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

def parse_iosis_html(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    items = []
    
    li_items = soup.select("li.item")
    if not li_items:
        return []
        
    for li in li_items:
        # url
        a_tag = li.select_one("a[href^='/items/smartphone/']")
        url = "https://iosys.co.jp" + a_tag['href'] if a_tag else ""
        
        # 商品名の取得
        # input[name='name'] よりも p.name の方が情報が豊富な場合がある
        name_p = li.select_one("p.name")
        raw_name = name_p.text.strip() if name_p else ""
        
        if not raw_name:
            name_input = li.select_one("input[name='name']")
            raw_name = name_input['value'] if name_input else ""
                
        rank_input = li.select_one("input[name='rank']")
        rank_raw = rank_input['value'] if rank_input else ""
        rank = "不明"
        if "未使用" in rank_raw or "Sランク" in rank_raw:
            rank = "S"
        elif "Aランク" in rank_raw:
            rank = "A"
        elif "Bランク" in rank_raw:
            rank = "B"
        elif "Cランク" in rank_raw:
            rank = "C"
            
        price_div = li.select_one(".price")
        price = 0
        if price_div:
            p_text = re.sub(r'[^\d]', '', price_div.text)
            try:
                price = int(p_text)
            except:
                pass
                
        model_name = "iPhone"
        storage = 0
        color = "不明"
        network = "SIMフリー"
        sim_unlocked = True
        
        m_storage = re.search(r'(\d+)(GB|TB)', raw_name)
        if m_storage:
            val = int(m_storage.group(1))
            storage = val * 1024 if m_storage.group(2) == 'TB' else val
            
        m_model = re.search(r'(iPhone\s?[a-zA-Z0-9]+(?:\s(?:Pro\sMax|Pro|Plus|mini))?)', raw_name, re.IGNORECASE)
        model_name = m_model.group(1).strip() if m_model else "iPhone"
        
        m_gen = re.search(r'(第\d世代)', raw_name)
        if m_gen and "世代" not in model_name:
            model_name += f" ({m_gen.group(1)})"
            
        if "au" in raw_name.lower():
            network_label = "au"
        elif "docomo" in raw_name.lower():
            network_label = "docomo"
        elif "softbank" in raw_name.lower():
            network_label = "SoftBank"
        elif "楽天" in raw_name:
            network_label = "楽天モバイル"
        elif "国内版" in raw_name:
            network_label = "Apple"
        else:
            network_label = None # 特定のキャリア指定がない場合はNone
        
        # 利用制限記号の抽出
        # 【ネットワーク利用制限〇】 や ネットワーク利用制限(〇) のパターンに対応に対応
        network_status = "-"
        m_status = re.search(r'ネットワーク利用制限[\(]?([〇△▲×－\-])[\)]?', raw_name)
        if m_status:
            status_char = m_status.group(1)
            # 記号の正規化
            if status_char == '▲':
                network_status = '△'
            elif status_char == '－':
                network_status = '-'
            else:
                network_status = status_char
        elif network_label == "Apple":
            # 国内版(Apple)は利用制限なし(None)
            network_status = None
        elif network_label is None and "SIMフリー" in raw_name:
            # キャリア指定なしのSIMフリーも利用制限なし(None)
            network_status = None
        else:
            # キャリア品、またはキャリア不明品はデフォルトで"-"
            network_status = "-"
        
        # SIMロック解除判定
        sim_unlocked = False
        if "ロック解除" in raw_name or "SIMフリー" in raw_name or "国内版" in raw_name:
            sim_unlocked = True
        
        # iPhone 13以降のルール
        if is_iphone_13_or_later(model_name):
            sim_unlocked = True
            
        if m_storage:
            parts = raw_name.split(m_storage.group(0))
            if len(parts) > 1:
                after_storage = parts[1]
                color_part = after_storage.split('【')[0].strip()
                if color_part:
                    color = color_part
                    
        # イオシスでは「80%未満」の表記がない商品は、原則「80%以上」扱い
        if rank == 'S':
            battery_health = 100
        elif "80%未満" in raw_name or "バッテリー劣化" in raw_name:
            battery_health = 79
        else:
            battery_health = 80
            
        items.append({
            'manufacturer': 'Apple',
            'modelName': model_name,
            'storage': storage,
            'color': color,
            'conditionRank': rank,
            'batteryHealth': battery_health,
            'networkStatus': network_status,
            'simUnlocked': sim_unlocked,
            'carrier': network_label,
            'price': price,
            'url': url,
            'shopName': 'イオシス'
        })
        
    return items

def scrape_iosis(max_pages=20):
    """イオシスからiPhoneの商品データを取得（並列フェッチ対応）"""
    print("Starting requests scraper for Iosis...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
    
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    def fetch_page(page_num):
        search_url = f"https://iosys.co.jp/items/smartphone/iphone?page={page_num}"
        try:
            response = requests.get(search_url, headers=headers, timeout=10)
            response.raise_for_status()
            # エンコーディングを明示的に指定
            response.encoding = 'utf-8'
            items = parse_iosis_html(response.text)
            print(f"  Page {page_num}: {len(items)} items")
            return items
        except Exception as e:
            print(f"  Page {page_num}: Error - {e}")
            return []
    
    # 最大15並列でページ取得（高速化）
    all_items = []
    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = {executor.submit(fetch_page, i): i for i in range(1, max_pages + 1)}
        for future in as_completed(futures):
            items = future.result()
            if items:
                all_items.extend(items)
            
    print(f"Finished scraping. Total items found: {len(all_items)}")
    return all_items

def main():
    print("--- イオシス スクレイピング開始 ---")
    
    max_pages = 5
    if len(sys.argv) > 1:
        try:
            max_pages = int(sys.argv[1])
        except ValueError:
            pass
            
    # 1. データのスクレイピング
    try:
        items = scrape_iosis(max_pages=max_pages)
    except Exception as e:
        print(f"Scraping failed: {e}")
        sys.exit(1)
        
    if not items:
        print("No items found. Exiting.")
        sys.exit(0)

    # 2. データベース接続
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    db_url = None
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    db_url = line.split('=', 1)[1].strip()
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
        
        # 古いイオシスのデータを削除
        ensure_safe_to_replace(cur, 'イオシス', len(items))

        print("Deleting old 'イオシス' data...")
        cur.execute("DELETE FROM \"DeviceInventory\" WHERE \"shopName\" = %s", ('イオシス',))
        
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
                item['manufacturer'],
                item['modelName'],
                item['storage'],
                item['color'],
                item['conditionRank'],
                item.get('batteryHealth'),
                item['networkStatus'],
                item['simUnlocked'],
                item['carrier'],
                item['shopName'],
                item['price'],
                item['url'],
                False
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
    finally:
        if conn:
            cur.close()
            conn.close()
            print("Database connection closed.")
            
    print("--- スクレイピング処理完了 ---")

if __name__ == '__main__':
    main()
