import os
import sys
import time
import re
import requests
from urllib.parse import urlparse
import psycopg2
from bs4 import BeautifulSoup

def clean_database_url(url: str) -> str:
    if not url:
        return url
    url = url.strip('"').strip("'")
    parsed = urlparse(url)
    clean_url = f"{parsed.scheme}://{parsed.username}:{parsed.password}@{parsed.hostname}:{parsed.port}{parsed.path}"
    return clean_url

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
        
        name_input = li.select_one("input[name='name']")
        raw_name = name_input['value'] if name_input else ""
        if not raw_name:
            name_h3 = li.select_one("h3.name")
            if name_h3:
                raw_name = name_h3.text.strip()
                
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
            
        if "au" in raw_name.lower(): network = "au"
        elif "docomo" in raw_name.lower(): network = "docomo"
        elif "softbank" in raw_name.lower(): network = "SoftBank"
        elif "楽天" in raw_name: network = "楽天モバイル"
        elif "国内版" in raw_name: network = "国内版SIMフリー"
        else: network = "SIMフリー"
        
        if "ロック解除" in raw_name or "SIMフリー" in raw_name:
            sim_unlocked = True
            
        if m_storage:
            parts = raw_name.split(m_storage.group(0))
            if len(parts) > 1:
                after_storage = parts[1]
                color_part = after_storage.split('【')[0].strip()
                if color_part:
                    color = color_part
                    
        items.append({
            'manufacturer': 'Apple',
            'modelName': model_name,
            'storage': storage,
            'color': color,
            'conditionRank': rank,
            'networkStatus': network,
            'simUnlocked': sim_unlocked,
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
            items = parse_iosis_html(response.text)
            print(f"  Page {page_num}: {len(items)} items")
            return items
        except Exception as e:
            print(f"  Page {page_num}: Error - {e}")
            return []
    
    # 最大5並列でページ取得
    all_items = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(fetch_page, i): i for i in range(1, max_pages + 1)}
        for future in as_completed(futures):
            items = future.result()
            if items:
                all_items.extend(items)
            
    print(f"Finished scraping. Total items found: {len(all_items)}")
    return all_items

def main():
    print("--- イオシス スクレイピング開始 ---")
    
    # 1. データのスクレイピング
    try:
        items = scrape_iosis(max_pages=5)
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
        with open(env_path, 'r') as f:
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
        print("Deleting old 'イオシス' data...")
        cur.execute("DELETE FROM \"DeviceInventory\" WHERE \"shopName\" = %s", ('イオシス',))
        
        print(f"Inserting {len(items)} new items...")
        insert_query = """
            INSERT INTO "DeviceInventory" (
                "id", "manufacturer", "modelName", "storage", "color",
                "conditionRank", "batteryHealth", "networkStatus", "simUnlocked",
                "shopName", "price", "url", "isSoldOut", "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid(), %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, NOW(), NOW()
            )
        """
        
        for item in items:
            cur.execute(insert_query, (
                item['manufacturer'],
                item['modelName'],
                item['storage'],
                item['color'],
                item['conditionRank'],
                None,
                item['networkStatus'],
                item['simUnlocked'],
                item['shopName'],
                item['price'],
                item['url'],
                False
            ))
            
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
