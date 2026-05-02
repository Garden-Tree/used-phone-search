from curl_cffi import requests
from bs4 import BeautifulSoup
import re

session = requests.Session(impersonate="chrome124")
r = session.get('https://ec.geo-online.co.jp/shop/goods/search.aspx?flg=gkb02&search.x=0&tree=1001&ps=50&p=1')
soup = BeautifulSoup(r.text, 'html.parser')
for item in soup.find_all(class_='itemName'):
    text = item.text.strip()
    print(f"RAW: {text}")
    # clean
    clean = text.replace('【中古】', '').replace('【安心保証】', '').strip()
    print(f"CLEAN: {clean}")
    
    # try to split
    # iPhone11 [64GB] ホワイト SIMフリー
    # or
    # 【安心保証】iPhone16 [128GB] ...
    m = re.search(r'([a-zA-Z0-9\s]+)(?:\[([^\]]+)\])?\s*([^\s]+)?\s*(.*)', clean)
    if m:
        model = m.group(1).strip()
        storage = m.group(2)
        color = m.group(3)
        rest = m.group(4)
        print(f"MODEL: {model}, STORAGE: {storage}, COLOR: {color}, REST: {rest}")
    print("-" * 20)
