import time
import re
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
from common import run_scraper

def get_detail_info(url, headers):
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            description = soup.select_one(".product__description")
            if not description:
                description = soup.select_one(".product-single__description")
            
            desc_text = description.text if description else ""
            
            # Network Status Extraction
            network_status = "-"
            m_status = re.search(r'利用制限[：:\s]?([〇△▲×－\-])', desc_text)
            if m_status:
                status_char = m_status.group(1)
                if status_char == '▲': network_status = '△'
                elif status_char == '－': network_status = '-'
                else: network_status = status_char
            
            # Battery Health Extraction from Description (as fallback/verification)
            battery_health = None
            if "交換済" in desc_text or "バッテリー100" in desc_text or "新品バッテリー" in desc_text:
                battery_health = 100
            else:
                m_battery = re.search(r'(?:最大容量|残量)[：:\s]?(\d+)%', desc_text)
                if m_battery:
                    battery_health = int(m_battery.group(1))

            return {
                'networkStatus': network_status,
                'batteryHealthFromDesc': battery_health
            }
    except Exception as e:
        print(f"    Error fetching detail {url}: {e}")
    return {'networkStatus': "-", 'batteryHealthFromDesc': None}

def parse_mmoba_html(html_content, headers):
    soup = BeautifulSoup(html_content, "html.parser")
    raw_items = []
    
    li_items = soup.select("li.grid__item")
    if not li_items:
        return []
        
    for li in li_items:
        # Title and URL
        title_tag = li.select_one(".card__heading a.full-unstyled-link")
        if not title_tag:
            continue
            
        raw_name = title_tag.text.strip()
        url = "https://ec.emcom.site" + title_tag['href']
        
        # Price
        price_tag = li.select_one(".price-item--regular")
        price = 0
        if price_tag:
            p_text = re.sub(r'[^\d]', '', price_tag.text)
            try:
                price = int(p_text)
            except:
                pass
        
        if price < 2000: # Filter out accessories
            continue

        # Data parsing from title
        # Example: "iPhone 15 128GB ブルー ランクB"
        
        model_name = "iPhone"
        storage = 0
        color = "不明"
        rank = "不明"
        
        # Storage
        m_storage = re.search(r'(\d+)(GB|TB)', raw_name)
        if m_storage:
            val = int(m_storage.group(1))
            storage = val * 1024 if m_storage.group(2) == 'TB' else val
            
        # Model Name
        # Handle "iPhone14" -> "iPhone 14", "12mini" -> "12 mini"
        m_model = re.search(r'(iPhone\s?(\d+e?|X[SR]?|SE|8|7)\s?(Pro\sMax|Pro|Plus|mini)?)', raw_name, re.IGNORECASE)
        if m_model:
            full_model = m_model.group(1).strip()
            # 正規化: iPhone[スペース]モデル番号[スペース]サフィックス
            # 1. iPhone[スペース]モデル番号
            full_model = re.sub(r'iPhone\s?(\d+e?|X[SR]?|SE|8|7)', r'iPhone \1', full_model, flags=re.IGNORECASE)
            # 2. モデル番号[スペース]サフィックス
            full_model = re.sub(r'(\d+e?|X[SR]?|SE|8|7)\s?(Pro\sMax|Pro|Plus|mini)', r'\1 \2', full_model, flags=re.IGNORECASE)
            model_name = full_model
            
            # SE generation normalization
            if "SE3" in raw_name or ("SE" in model_name and "第3世代" in raw_name):
                model_name = "iPhone SE (第3世代)"
            elif "SE2" in raw_name or ("SE" in model_name and "第2世代" in raw_name):
                model_name = "iPhone SE (第2世代)"
            elif "SE" in model_name and "(第" not in model_name:
                if "SE3" in raw_name: model_name = "iPhone SE (第3世代)"
        
        # Rank
        m_rank = re.search(r'(?:ランク|中古)([SABCDJ])', raw_name.upper())
        if not m_rank:
            m_rank = re.search(r'([SABCDJ])ランク', raw_name.upper())
            
        if m_rank:
            rank = m_rank.group(1)
        
        # Battery Health
        battery_health = None
        if "交換済" in raw_name or "バッテリー100" in raw_name:
            battery_health = 100
        else:
            m_battery = re.search(r'(\d+)%', raw_name)
            if m_battery:
                battery_health = int(m_battery.group(1))

        # Color and Network Status from title
        network_status_from_title = None
        if m_storage:
            parts = raw_name.split(m_storage.group(0))
            if len(parts) > 1:
                after_storage = parts[1].strip()
                # Split by space and look for color/network status
                words = after_storage.split()
                for word in words:
                    word = word.strip()
                    if not word: continue
                    
                    # Check for network restriction symbols
                    m_status = re.search(r'([〇△▲×－\-])', word)
                    if m_status:
                        status_char = m_status.group(1)
                        if status_char == '▲': network_status_from_title = '△'
                        elif status_char == '－': network_status_from_title = '-'
                        else: network_status_from_title = status_char
                        continue

                    if any(x in word for x in ["ランク", "中古", "SIMフリー", "バッテリー", "交換済", "限定", "保証"]):
                        continue
                    if color == "不明":
                        color = word
                    
        raw_items.append({
            'manufacturer': 'Apple',
            'modelName': model_name,
            'storage': storage,
            'color': color,
            'conditionRank': rank,
            'batteryHealth': battery_health,
            'networkStatusFromTitle': network_status_from_title,
            'simUnlocked': True, # Em-moba usually sells SIM-free/unlocked
            'carrier': None, # Set to None to display as "SIMフリー" in UI (like NicoSuma)
            'price': price,
            'url': url,
            'shopName': 'エムモバ'
        })
        
    # Fetch details in parallel
    final_items = []
    print(f"    Fetching details for {len(raw_items)} items...")
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(get_detail_info, item['url'], headers): item for item in raw_items}
        for future in futures:
            item = futures[future]
            details = future.result()
            # If details confirm 100% or replaced, use it
            if details.get('batteryHealthFromDesc') == 100:
                item['batteryHealth'] = 100
            elif item['batteryHealth'] is None and details.get('batteryHealthFromDesc'):
                item['batteryHealth'] = details.get('batteryHealthFromDesc')
                
            item['networkStatus'] = details['networkStatus']
            # If title had status and detail has "-", prefer title status
            if item.get('networkStatusFromTitle') and (item['networkStatus'] == "-" or not item['networkStatus']):
                item['networkStatus'] = item['networkStatusFromTitle']
            
            if item.get('conditionRank') == 'S':
                item['batteryHealth'] = 100
                
            final_items.append(item)
            
    return final_items

def scrape_mmoba(max_pages=10):
    print("Starting scraper for Em-moba...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
    
    all_items = []
    for page in range(1, max_pages + 1):
        url = f"https://ec.emcom.site/collections/iphone?filter.v.availability=1&filter.v.price.gte=2000&sort_by=best-selling&page={page}"
        try:
            print(f"  Fetching Page {page}...")
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            items = parse_mmoba_html(response.text, headers)
            if not items:
                print("  No more items found.")
                break
            print(f"  Page {page}: Found {len(items)} items")
            all_items.extend(items)
            time.sleep(1) # Polite delay
        except Exception as e:
            print(f"  Error on Page {page}: {e}")
            break
            
    print(f"Finished scraping. Total items found: {len(all_items)}")
    return all_items


if __name__ == "__main__":
    run_scraper("エムモバ", lambda limit: scrape_mmoba(max_pages=limit), 20)
