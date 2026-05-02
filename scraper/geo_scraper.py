import os
import sys
import time
import re
from urllib.parse import urlparse
import psycopg2
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

def clean_database_url(url: str) -> str:
    """PrismaのDATABASE_URLからpsycopg2用に不要なパラメータを削除する"""
    if not url:
        return url
    url = url.strip('"').strip("'")
    parsed = urlparse(url)
    clean_url = f"{parsed.scheme}://{parsed.username}:{parsed.password}@{parsed.hostname}:{parsed.port}{parsed.path}"
    return clean_url

def parse_geo_html(html_content):
    """HTMLから商品情報を抽出する"""
    soup = BeautifulSoup(html_content, 'html.parser')
    items = []
    
    for li in soup.find_all('li'):
        name_tag = li.find(class_='itemName')
        if not name_tag:
            continue
        
        a_tag = li.find('a', class_='sendDatalayer')
        if not a_tag:
            continue
        url = a_tag.get('href')
        if not url or '/shop/g/g' not in url:
            continue
        
        price_tag = li.find(class_='sellPtnLeftPrice')
        if not price_tag:
            continue
        price_str = price_tag.find('b').text.replace(',', '')
        try:
            price = int(price_str)
        except ValueError:
            price = 0
            
        condition_tag = li.find(class_='labelSituation')
        condition = condition_tag.text.replace('状態', '') if condition_tag else '不明'
        
        capacity_tag = li.find(class_='labelCapacity')
        capacity_str = capacity_tag.text if capacity_tag else ''
        storage_match = re.search(r'(\d+)(GB|TB)', capacity_str)
        storage = 0
        if storage_match:
            val = int(storage_match.group(1))
            storage = val * 1024 if storage_match.group(2) == 'TB' else val
                
        carrier_tag = li.find(class_='itemCarrier')
        carrier = carrier_tag.text if carrier_tag else ''
        sim_unlocked = 'SIMフリー' in carrier or 'ロック解除' in name_tag.text
        
        raw_name = name_tag.text.replace('【中古】', '').strip()
        m = re.match(r'([a-zA-Z0-9\s]+)(?:\[[^\]]+\])?\s+([^\s]+)\s+(.+)', raw_name)
        if m:
            model_name = m.group(1).strip()
            color = m.group(3).replace('【安心保…', '').replace('【安心保証…', '').replace('【安心保証】', '').strip()
        else:
            model_name = raw_name.split('[')[0].strip()
            color = '不明'
            
        items.append({
            'manufacturer': 'Apple',
            'modelName': model_name,
            'storage': storage,
            'color': color,
            'conditionRank': condition,
            'networkStatus': carrier,
            'simUnlocked': sim_unlocked,
            'price': price,
            'url': url,
            'shopName': 'ゲオモバイル'
        })
        
    return items

import random
import time

def scrape_geo_page(page_num, browser_type):
    """1ページ分だけ取得する（ブラウザ起動・終了を含む）"""
    url = f"https://ec.geo-online.co.jp/shop/goods/search.aspx?flg=gkb02&search.x=0&tree=1001&ps=50&p={page_num}"
    print(f"Navigating to page {page_num}: {url}")
    
    with browser_type.launch(headless=False) as browser:
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 800}
        )
        page = context.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(random.randint(5000, 8000))
            
            # 商品名のセレクタが出るまで待機
            try:
                page.wait_for_selector(".itemName", timeout=25000)
            except:
                print(f"  Timeout waiting for .itemName on page {page_num}.")
                return [], False
            
            html_content = page.content()
            items = parse_geo_html(html_content)
            
            has_next = page.query_selector("a[rel='next']") is not None
            return items, has_next
        except Exception as e:
            print(f"  Error on page {page_num}: {e}")
            return [], False

def scrape_geo_mobile():
    """ゲオモバイルからiPhoneの商品データを取得
    """
    print("Starting Geo Mobile Scraper (Per-page browser restart mode)...")
    all_items = []
    
    with sync_playwright() as p:
        page_num = 1
        while True:
            items, has_next = scrape_geo_page(page_num, p.chromium)
            
            if not items:
                print(f"  No items found on page {page_num}. Stopping.")
                break
                
            all_items.extend(items)
            print(f"  Found {len(items)} items on page {page_num}. (Total: {len(all_items)})")
            
            if not has_next:
                print("  Reached the last page.")
                break
            
            page_num += 1
            if page_num > 10: # 動作確認のため10ページまでにする
                break
                
            # 次のページへ行く前に少し休む
            time.sleep(random.uniform(0.5, 3))
            
    print(f"Finished scraping. Total items found: {len(all_items)}")
    return all_items

def main():
    print("--- ゲオモバイル スクレイピング開始 ---")
    
    try:
        items = scrape_geo_mobile()
    except Exception as e:
        print(f"Scraping failed: {e}")
        sys.exit(1)
        
    if not items:
        print("No items found. Exiting.")
        sys.exit(0)

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
    
    conn = None
    try:
        print("Connecting to PostgreSQL...")
        conn = psycopg2.connect(clean_url)
        cur = conn.cursor()
        conn.autocommit = False
        
        print("Deleting old 'ゲオモバイル' data...")
        cur.execute("DELETE FROM \"DeviceInventory\" WHERE \"shopName\" = %s", ('ゲオモバイル',))
        
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
