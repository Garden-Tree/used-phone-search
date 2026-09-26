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
from concurrent.futures import ThreadPoolExecutor

def clean_database_url(url: str) -> str:
    if not url:
        return url
    url = url.strip('"').strip("'")
    parsed = urlparse(url)
    port = f":{parsed.port}" if parsed.port else ""
    clean_url = f"{parsed.scheme}://{parsed.username}:{parsed.password}@{parsed.hostname}{port}{parsed.path}"
    return clean_url

def get_detail_info(url, headers, session):
    try:
        response = session.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            
            network_status = "-"
            battery_health = None
            
            product_block = soup.select_one(".ty-product-block")
            if product_block:
                block_text = product_block.get_text(separator=' ')
                
                m_status = re.search(r'ネットワーク利用制限\s*[：:\s]*\s*([〇△▲×－\-])', block_text)
                if m_status:
                    status_char = m_status.group(1)
                    if status_char == '▲': network_status = '△'
                    elif status_char == '－': network_status = '-'
                    else: network_status = status_char

                m_battery = re.search(r'(?:バッテリー|最大容量|残量)\s*[：:\s]*\s*(\d+)[%％]', block_text)
                if m_battery:
                    battery_health = int(m_battery.group(1))
                
                if not battery_health:
                    if "80%を下回っております" in block_text or "80％を下回っております" in block_text:
                        battery_health = 79
                    elif "100％の状態です" in block_text or "100%の状態です" in block_text or "バッテリー交換済" in block_text or "新品バッテリー" in block_text:
                        battery_health = 100
                
                if battery_health is None:
                    features = product_block.select(".ty-product-feature, .ut2-pb__product-features .ty-product-feature, tr")
                    for feature in features:
                        label = feature.select_one(".ty-product-feature__label, th")
                        value = feature.select_one(".ty-product-feature__variant, td")
                        if label and value:
                            l_text = label.text.strip()
                            v_text = value.text.strip()
                            if "利用制限" in l_text and network_status == "-":
                                if "〇" in v_text: network_status = "〇"
                                elif "△" in v_text: network_status = "△"
                                elif "×" in v_text: network_status = "×"
                            elif ("バッテリー" in l_text or "特記事項" in l_text) and battery_health is None:
                                m_v = re.search(r'(\d+)%', v_text)
                                if m_v: battery_health = int(m_v.group(1))
                                elif "100％の状態です" in v_text or "100%の状態です" in v_text or "バッテリー交換済" in v_text or "新品バッテリー" in v_text:
                                    battery_health = 100
                                elif "80%を下回っております" in v_text or "80％を下回っております" in v_text:
                                    battery_health = 79

            return {
                'networkStatus': network_status,
                'batteryHealth': battery_health
            }
    except Exception:
        pass
    return {'networkStatus': None, 'batteryHealth': None}

def parse_daiwan_item(item, headers):
    title_tag = item.select_one("a.product-title")
    if not title_tag:
        return None
        
    raw_name = title_tag.text.strip()
    url = title_tag['href']
    if not url.startswith('http'):
        url = "https://www.dai-one.jp" + url
        
    price_tag = item.select_one("span.ty-price-num")
    price = 0
    if price_tag:
        p_text = re.sub(r'[^\d]', '', price_tag.text)
        try:
            price = int(p_text)
        except Exception:
            pass
    
    if price < 2000:
        return None

    model_name = "iPhone"
    storage = 0
    color = "不明"
    rank = "不明"
    carrier = "不明"
    sim_unlocked = False
    
    m_storage = re.search(r'(\d+)(GB|TB)', raw_name)
    if m_storage:
        val = int(m_storage.group(1))
        storage = val * 1024 if m_storage.group(2) == 'TB' else val
        
    m_model = re.search(r'(iPhone\s?(\d+e?|X[SR]?|SE|8|7)\s?(Pro\sMax|Pro|Plus|mini)?)', raw_name, re.IGNORECASE)
    if m_model:
        full_model = m_model.group(1).strip()
        # iPhoneとモデル番号の間にスペースを挿入
        full_model = re.sub(r'iPhone\s?(\d+e?|X[SR]?|SE|8|7)', r'iPhone \1', full_model, flags=re.IGNORECASE)
        # モデル番号とPro/Maxなどの間にスペースを挿入
        full_model = re.sub(r'(\d+e?|X[SR]?|SE|8|7)\s?(Pro\sMax|Pro|Plus|mini)', r'\1 \2', full_model, flags=re.IGNORECASE)
        model_name = full_model
        
        if "SE3" in raw_name or ("SE" in model_name and "第3世代" in raw_name):
            model_name = "iPhone SE (第3世代)"
        elif "SE2" in raw_name or ("SE" in model_name and "第2世代" in raw_name):
            model_name = "iPhone SE (第2世代)"
        elif "SE" in model_name and "(第" not in model_name:
            if "SE3" in raw_name: model_name = "iPhone SE (第3世代)"
    
    rank_tag = item.select_one(".c-rank")
    if rank_tag:
        rank_text = rank_tag.text.strip().upper()
        m_rank = re.search(r'([SABCDJ])', rank_text)
        if m_rank:
            rank = m_rank.group(1)
    
    if rank == "不明":
        m_rank = re.search(r'([SABCDJ])ランク', raw_name.upper())
        if not m_rank:
            m_rank = re.search(r'ランク([SABCDJ])', raw_name.upper())
        if m_rank:
            rank = m_rank.group(1)
    
    if "SIMフリー" in raw_name or "SIMロック解除" in raw_name:
        sim_unlocked = True
        carrier = None
    elif "SoftBank" in raw_name or "ソフトバンク" in raw_name:
        carrier = "SoftBank"
    elif "au" in raw_name:
        carrier = "au"
    elif "docomo" in raw_name or "ドコモ" in raw_name:
        carrier = "docomo"
    elif "UQ" in raw_name:
        carrier = "UQ mobile"
    elif "Y!mobile" in raw_name or "ワイモバイル" in raw_name:
        carrier = "Y!mobile"
    elif "楽天" in raw_name:
        carrier = "楽天モバイル"

    if m_storage:
        parts = raw_name.split(m_storage.group(0))
        if len(parts) > 1:
            after_storage = parts[1].strip()
            words = after_storage.split()
            for word in words:
                word = word.strip()
                if not word or any(x in word for x in ["ランク", "SIM", "SoftBank", "au", "docomo", "解除", "バッテリー", "交換"]):
                    continue
                color = word
                break

    return {
        'manufacturer': 'Apple',
        'modelName': model_name,
        'storage': storage,
        'color': color,
        'conditionRank': rank,
        'batteryHealth': None,
        'networkStatus': None,
        'simUnlocked': sim_unlocked,
        'carrier': carrier,
        'price': price,
        'url': url,
        'shopName': 'ダイワンテレコム'
    }

def parse_daiwan_html(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    items = soup.select("div.ty-grid-list__item")
    return items if items else []

def scrape_daiwan(max_pages=5):
    print("Starting scraper for Daiwan Telecom (Optimized)...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
    
    session = requests.Session()
    raw_item_nodes = []
    
    for page in range(1, max_pages + 1):
        url = f"https://www.dai-one.jp/smartphone/iphone/page-{page}/?items_per_page=128"
        try:
            print(f"  Fetching Listing Page {page}...")
            response = session.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            nodes = parse_daiwan_html(response.text)
            if not nodes:
                print("  No more items found.")
                break
            print(f"  Page {page}: Found {len(nodes)} item nodes")
            raw_item_nodes.extend(nodes)
            time.sleep(0.5)
        except Exception as e:
            print(f"  Error on Page {page}: {e}")
            break
            
    if not raw_item_nodes:
        return []

    print(f"  Parsing {len(raw_item_nodes)} item nodes...")
    basic_items = []
    for node in raw_item_nodes:
        item = parse_daiwan_item(node, headers)
        if item:
            basic_items.append(item)
            
    print(f"  Fetching details for {len(basic_items)} items in parallel...")
    all_items = []
    with ThreadPoolExecutor(max_workers=25) as executor:
        futures = {executor.submit(get_detail_info, item['url'], headers, session): item for item in basic_items}
        for future in futures:
            item = futures[future]
            try:
                details = future.result()
                item.update(details)
                if item.get('conditionRank') == 'S':
                    item['batteryHealth'] = 100
                all_items.append(item)
            except Exception as e:
                print(f"  Error fetching detail: {e}")
                all_items.append(item)
                
    print(f"Finished scraping. Total items found: {len(all_items)}")
    return all_items

def main():
    print("--- ダイワンテレコム スクレイピング開始 ---")
    max_pages = 10
    if len(sys.argv) > 1:
        try:
            max_pages = int(sys.argv[1])
        except ValueError:
            pass
            
    try:
        items = scrape_daiwan(max_pages=max_pages)
    except Exception as e:
        print(f"Scraping failed: {e}")
        sys.exit(1)
        
    if not items:
        print("No items found. Exiting.")
        sys.exit(0)

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
    
    conn = None
    try:
        print("Connecting to PostgreSQL...")
        conn = psycopg2.connect(clean_url)
        cur = conn.cursor()
        conn.autocommit = False
        
        ensure_safe_to_replace(cur, 'ダイワンテレコム', len(items))

        print("Deleting old 'ダイワンテレコム' data...")
        cur.execute("DELETE FROM \"DeviceInventory\" WHERE \"shopName\" = %s", ('ダイワンテレコム',))
        
        print(f"Inserting {len(items)} new items...")
        insert_query = """
            INSERT INTO "DeviceInventory" (
                "id", "manufacturer", "modelName", "storage", "color",
                "conditionRank", "batteryHealth", "networkStatus", "simUnlocked", "carrier",
                "shopName", "price", "url", "isSoldOut", "createdAt", "updatedAt"
            ) VALUES %s
        """
        
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
        
        template = "(gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())"
        execute_values(cur, insert_query, values, template=template)
        conn.commit()
        print("Database update complete!")
        
    except Exception as e:
        if conn: conn.rollback()
        print(f"Database error: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()
            print("Database connection closed.")
            
    print("--- スクレイピング処理完了 ---")

if __name__ == '__main__':
    main()
