"""
ゲオモバイル (ec.geo-online.co.jp) スクレイパー
- curl_cffi を使用してブラウザのTLSフィンガープリントを模倣しWAFを回避
- Playwright不要で高速に動作
"""
import os
import sys
import time
import re
import random
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import psycopg2
from db_guard import ensure_safe_to_replace
from psycopg2.extras import execute_values
from bs4 import BeautifulSoup
from curl_cffi import requests

STOP_SCRAPING = False


def clean_database_url(url: str) -> str:
    """PrismaのDATABASE_URLからpsycopg2用に不要なパラメータを削除する"""
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

def fetch_geo_detail(session, item):
    """個別ページから利用制限情報を取得する"""
    global STOP_SCRAPING
    if STOP_SCRAPING:
        return item

    if not item['url']:
        return item
    
    # URLが相対パスの場合はベースURLを追加
    detail_url = item['url']
    if detail_url.startswith('/'):
        detail_url = "https://ec.geo-online.co.jp" + detail_url
        item['url'] = detail_url
        
    try:
        # WAF回避・負荷軽減のため待機時間を長めに設定（低速化）
        time.sleep(random.uniform(1.0, 2.5))
        resp = session.get(detail_url, timeout=10)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            # スペック表から「ネットワーク利用制限」を探す
            # ゲオの詳細は table の th に項目名、td に値が入っている形式が多い
            rows = soup.find_all('tr')
            for row in rows:
                th = row.find('th')
                td = row.find('td')
                if th and td and 'ネットワーク利用制限' in th.text:
                    status = td.text.strip()
                    # ▲ を △ に変換
                    item['networkStatus'] = status.replace('▲', '△')
                    break
        else:
            STOP_SCRAPING = True
            print(f"  --> HTTP {resp.status_code} fetching detail. Stopping.")
    except Exception as e:
        print(f"  Error fetching detail {detail_url}: {e}")
        STOP_SCRAPING = True
        print("  --> Timeout/Error detected in detail fetching. Stopping further scraping.")
        
    return item

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
        m_rank = re.search(r'([SABCDJ])', condition_tag.text) if condition_tag else None
        condition = m_rank.group(1) if m_rank else '不明'
        
        capacity_tag = li.find(class_='labelCapacity')
        capacity_str = capacity_tag.text if capacity_tag else ''
        storage_match = re.search(r'(\d+)(GB|TB)', capacity_str)
        storage = 0
        if storage_match:
            val = int(storage_match.group(1))
            storage = val * 1024 if storage_match.group(2) == 'TB' else val
                
        carrier_tag = li.find(class_='itemCarrier')
        carrier = carrier_tag.text if carrier_tag else ''
        
        # 利用制限の推測
        # 一覧ページに記号がないため、SIMフリーの場合は「-」、それ以外は一旦「〇」とする
        network_status = "〇"
        if "SIMフリー" in carrier:
            network_status = "-"
            
        sim_unlocked = 'SIMフリー' in carrier or 'ロック解除' in name_tag.text
        
        # 商品名のクリーンアップ
        raw_name = name_tag.text.replace('【中古】', '').replace('【安心保証】', '').strip()
        
        # モデル名と色の抽出
        # 形式例: iPhone13[128GB] SIMフリー ピンク
        # 形式例: iPhoneSE 第2世代[64GB] au ホワイト
        model_name = raw_name
        color = '不明'
        
        if '[' in raw_name and ']' in raw_name:
            model_name = raw_name.split('[')[0].strip()
            after_storage = raw_name.split(']')[-1].strip()
            if after_storage:
                # 最後の単語を色とみなす（例: "SIMフリー ピンク" -> "ピンク", "au ブラック" -> "ブラック"）
                parts = after_storage.split()
                color = parts[-1]
                # 「安心保証」などが残っている場合の最終防衛ライン
                color = color.replace('【安心保証】', '').replace('【安心保…', '').strip()
        else:
            # [GB] がない場合
            parts = raw_name.split()
            if len(parts) > 1:
                color = parts[-1]
                model_name = " ".join(parts[:-1])
        
        # iPhone 13以降のルール (model_name確定後に判定)
        if is_iphone_13_or_later(model_name):
            sim_unlocked = True
            
        # キャリア名の正規化
        if carrier == "SIMフリー" or not carrier:
            carrier = "国内版SIMフリー"
            
        items.append({
            'manufacturer': 'Apple',
            'modelName': model_name,
            'storage': storage,
            'color': color,
            'conditionRank': condition,
            'networkStatus': network_status,
            'simUnlocked': sim_unlocked,
            'carrier': carrier,
            'price': price,
            'url': url,
            'shopName': 'ゲオモバイル'
        })
        
    return items


def scrape_geo_page(page_num, session):
    """1ページ分のデータを取得する"""
    global STOP_SCRAPING
    if STOP_SCRAPING:
        return [], False

    url = f"https://ec.geo-online.co.jp/shop/goods/search.aspx?flg=gkb02&search.x=0&tree=1001&ps=50&p={page_num}"
    print(f"Navigating to page {page_num}: {url}")
    
    try:
        response = session.get(url, timeout=15)
        if response.status_code != 200:
            print(f"  HTTP {response.status_code} on page {page_num}")
            STOP_SCRAPING = True
            return [], False
        
        html_content = response.text
        items = parse_geo_html(html_content)
        
        # 個別詳細ページから利用制限を取得
        if items:
            updated_items = []
            for item in items:
                if STOP_SCRAPING:
                    break
                updated_items.append(fetch_geo_detail(session, item))
            items = updated_items
        
        # 次のページの存在判定
        soup = BeautifulSoup(html_content, 'html.parser')
        has_next = soup.find('a', rel='next') is not None
        
        return items, has_next
    except Exception as e:
        print(f"  Error on page {page_num}: {e}")
        STOP_SCRAPING = True
        return [], False


def scrape_geo_mobile(max_pages=20):
    """ゲオモバイルからiPhoneの商品データを取得（curl_cffi版）"""
    print(f"Starting Geo Mobile Scraper (curl_cffi mode) with max_pages={max_pages}...")
    all_items = []
    
    session = requests.Session(impersonate="chrome124")
    
    global STOP_SCRAPING
    STOP_SCRAPING = False
    
    for page_num in range(1, max_pages + 1):
        if STOP_SCRAPING:
            print("Scraping stopped due to an error/timeout. Exiting page loop.")
            break
            
        if page_num > 1:
            time.sleep(random.uniform(2.0, 4.0))
            
        items, has_next = scrape_geo_page(page_num, session)
        if items:
            all_items.extend(items)
            
        if STOP_SCRAPING or not has_next:
            print(f"Stopping after page {page_num} (has_next={has_next}, STOP_SCRAPING={STOP_SCRAPING}).")
            break
                
    print(f"Finished scraping. Total items found: {len(all_items)}")
    return all_items

def main():
    print("--- ゲオモバイル スクレイピング開始 ---")
    
    max_pages = 20
    if len(sys.argv) > 1:
        try:
            max_pages = int(sys.argv[1])
        except ValueError:
            pass
            
    try:
        items = scrape_geo_mobile(max_pages=max_pages)
    except Exception as e:
        print(f"Scraping failed: {e}")
        sys.exit(1)
        
    if not items:
        print("No items found. Exiting.")
        sys.exit(1)

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
        
        ensure_safe_to_replace(cur, 'ゲオモバイル', len(items))

        print("Deleting old 'ゲオモバイル' data...")
        cur.execute("DELETE FROM \"DeviceInventory\" WHERE \"shopName\" = %s", ('ゲオモバイル',))
        
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
                100 if item.get('conditionRank') in ['S', '未使用品'] else None,
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
        sys.exit(1)
    finally:
        if conn:
            cur.close()
            conn.close()
            print("Database connection closed.")
            
    print("--- スクレイピング処理完了 ---")

if __name__ == '__main__':
    main()
