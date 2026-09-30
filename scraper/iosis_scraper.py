"""
イオシス (iosys.co.jp) スクレイパー
- 一覧ページ（li.item）の商品名・ランク・価格から在庫を作る
- iPhone: /items/smartphone/iphone?page=N
- iPad:   /items/tablet/ipad?page=N（機種名は店の表記のまま入れ、npm run normalize:ipad で正式名にそろえる）
"""
import re
from concurrent.futures import ThreadPoolExecutor

import requests
from bs4 import BeautifulSoup

from common import WIFI_MODEL, PIXEL_ONLY_STORAGE, canonical_pixel_model, run_scraper, is_iphone_13_or_later

SHOP_NAME = "イオシス"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}
# (一覧の URL, 読み取り関数, 最大ページ数) はファイル末尾の CATEGORIES


def parse_rank(li) -> str:
    rank_input = li.select_one("input[name='rank']")
    rank_raw = rank_input["value"] if rank_input else ""
    if "未使用" in rank_raw or "Sランク" in rank_raw:
        return "S"
    for r in ("A", "B", "C"):
        if f"{r}ランク" in rank_raw:
            return r
    return "不明"


def parse_price(li) -> int:
    price_div = li.select_one(".price")
    digits = re.sub(r"[^\d]", "", price_div.text) if price_div else ""
    return int(digits) if digits else 0


def parse_name(li) -> str:
    # input[name='name'] よりも p.name の方が情報が豊富な場合がある
    name_p = li.select_one("p.name")
    raw_name = name_p.text.strip() if name_p else ""
    if not raw_name:
        name_input = li.select_one("input[name='name']")
        raw_name = name_input["value"] if name_input else ""
    return raw_name


def parse_storage(raw_name: str):
    """(容量GB, 容量の表記) を返す。見つからなければ (0, None)"""
    m = re.search(r"(\d+)(GB|TB)", raw_name)
    if not m:
        return 0, None
    val = int(m.group(1))
    return (val * 1024 if m.group(2) == "TB" else val), m.group(0)


def parse_carrier(raw_name: str):
    """商品名のキャリア表記。国内版は "Apple"（DeviceCard が「SIMフリー（Apple版）」と表示）"""
    lower = raw_name.lower()
    if "au" in lower:
        return "au"
    if "docomo" in lower:
        return "docomo"
    if "softbank" in lower:
        return "SoftBank"
    if "楽天" in raw_name:
        return "楽天モバイル"
    if "国内版" in raw_name:
        return "Apple"
    return None


def parse_network_status(raw_name: str, carrier):
    """【ネットワーク利用制限〇】や ネットワーク利用制限(〇) を読み取る"""
    m = re.search(r"ネットワーク利用制限[\(]?([〇△▲×－\-])[\)]?", raw_name)
    if m:
        return {"▲": "△", "－": "-"}.get(m.group(1), m.group(1))
    if carrier == "Apple" or (carrier is None and "SIMフリー" in raw_name):
        return None  # 国内版・キャリア指定なしの SIM フリーは利用制限なし
    return "-"  # キャリア品、またはキャリア不明品


def parse_color(raw_name: str, storage_label):
    if not storage_label:
        return "不明"
    after = raw_name.split(storage_label, 1)[1] if storage_label in raw_name else ""
    # 色の後ろの型番（MM9C3J/A）・機種番号（A2588）・【…】を落とす
    color = after.split("【")[0]
    color = re.sub(r"\s*[A-Z0-9]{4,6}(?:J|ZA|LL|CH)?/A.*$", "", color).strip()
    return color or "不明"


def parse_battery(raw_name: str, rank: str) -> int:
    # イオシスでは「80%未満」の表記がない商品は、原則「80%以上」扱い（DeviceCard が「80%以上」と表示）
    if rank == "S":
        return 100
    if "80%未満" in raw_name or "バッテリー劣化" in raw_name:
        return 79
    return 80


def base_item(li, raw_name: str, link_prefix: str) -> dict:
    a_tag = li.select_one(f"a[href^='{link_prefix}']")
    rank = parse_rank(li)
    storage, storage_label = parse_storage(raw_name)
    return {
        "manufacturer": "Apple",
        "storage": storage,
        "color": parse_color(raw_name, storage_label),
        "conditionRank": rank,
        "batteryHealth": parse_battery(raw_name, rank),
        "price": parse_price(li),
        "url": "https://iosys.co.jp" + a_tag["href"] if a_tag else "",
        "shopName": SHOP_NAME,
        "_storage_label": storage_label,
    }


def parse_iphone(li) -> dict | None:
    raw_name = parse_name(li)
    item = base_item(li, raw_name, "/items/smartphone/")

    m_model = re.search(r"(iPhone\s?[a-zA-Z0-9]+(?:\s(?:Pro\sMax|Pro|Plus|mini))?)", raw_name, re.IGNORECASE)
    model_name = m_model.group(1).strip() if m_model else "iPhone"
    m_gen = re.search(r"(第\d世代)", raw_name)
    if m_gen and "世代" not in model_name:
        model_name += f" ({m_gen.group(1)})"

    carrier = parse_carrier(raw_name)
    unlocked = any(w in raw_name for w in ("ロック解除", "SIMフリー", "国内版")) or is_iphone_13_or_later(model_name)
    item.update({
        "modelName": model_name,
        "carrier": carrier,
        "networkStatus": parse_network_status(raw_name, carrier),
        "simUnlocked": unlocked,
    })
    return item


def parse_ipad(li) -> dict | None:
    # 例: 【第5世代】 iPad Air5 Wi-Fi 64GB スペースグレイ MM9C3J/A A2588
    #     【SIMロック解除済】【第8世代】 au iPad2020 Wi-Fi+Cellular 32GB ゴールド MYMK2J/A A2429
    raw_name = parse_name(li)
    if "iPad" not in raw_name:
        return None  # タブレット一覧には Android も混ざる
    item = base_item(li, raw_name, "/items/tablet/")

    # 機種を表す部分: 容量より前から【…】と通信方式を除き、【第N世代】を足す（正式名へは normalize:ipad でそろえる）
    before_storage = raw_name.split(item["_storage_label"], 1)[0] if item["_storage_label"] else raw_name
    model_part = re.sub(r"【[^】]*】", "", before_storage)
    model_part = re.sub(r"Wi-Fi(\+Cellular)?|\b(au|docomo|SoftBank)\b", "", model_part, flags=re.IGNORECASE)
    m_gen = re.search(r"第\d+世代", raw_name)
    model_name = re.sub(r"\s+", " ", model_part).strip() + (f" {m_gen.group(0)}" if m_gen else "")

    cellular = "Cellular" in raw_name
    carrier = parse_carrier(raw_name) if cellular else WIFI_MODEL
    item.update({
        "modelName": model_name,
        "carrier": carrier,
        "networkStatus": parse_network_status(raw_name, carrier) if cellular else None,
        "simUnlocked": (not cellular) or any(w in raw_name for w in ("ロック解除", "SIMフリー", "国内版")),
    })
    return item


def parse_pixel(li) -> dict | None:
    # 例: Google Pixel8a G576D 128GB ポーセリン 【国内版SIMフリー】
    #     Google Pixel7a G82U8 シー 【国内版SIMフリー】（容量が1種類の機種は容量が書かれない）
    raw_name = parse_name(li)
    model_name = canonical_pixel_model(raw_name)
    if not model_name:
        return None  # Pixel 5a 以前など
    item = base_item(li, raw_name, "/items/smartphone/")
    if not item["storage"] and model_name in PIXEL_ONLY_STORAGE:
        item["storage"] = PIXEL_ONLY_STORAGE[model_name]
    if item["color"] == "不明":
        # 容量が書かれないときは、Google の型番（G82U8 など）の後ろが色
        m_color = re.search(r"\bG[0-9A-Z]{4}\s+([^\s【]+)", raw_name)
        if m_color:
            item["color"] = m_color.group(1)

    carrier = parse_carrier(raw_name)
    domestic = carrier == "Apple"  # parse_carrier は「国内版」を "Apple" で返す（iPhone 向け）
    item.update({
        "manufacturer": "Google",
        "modelName": model_name,
        "carrier": "Google" if domestic else carrier,
        "networkStatus": parse_network_status(raw_name, carrier),
        "simUnlocked": any(w in raw_name for w in ("ロック解除", "SIMフリー", "国内版")),
    })
    return item


# (URL, 読み取り関数, 最大ページ数)。Pixel は 9/30 時点で16ページなので 40 で打ち切る（毎回100ページ取りに行かない）
CATEGORIES = [
    ("https://iosys.co.jp/items/smartphone/iphone?page={page}", parse_iphone, None),
    ("https://iosys.co.jp/items/tablet/ipad?page={page}", parse_ipad, None),
    ("https://iosys.co.jp/items/smartphone/android/pixel?page={page}", parse_pixel, 40),
]


def fetch_page(url_template: str, parse, page: int) -> list[dict]:
    url = url_template.format(page=page)
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        response.encoding = "utf-8"
    except Exception as e:
        print(f"  {url}: Error - {e}")
        return []
    soup = BeautifulSoup(response.text, "html.parser")
    items = [item for li in soup.select("li.item") if (item := parse(li))]
    for item in items:
        item.pop("_storage_label", None)
    print(f"  {url}: {len(items)} items")
    return items


def scrape_iosis(max_pages=20):
    """iPhone・iPad・Pixel の一覧を max_pages ページずつ並列取得する（在庫のないページは0件で返る）"""
    print("Starting requests scraper for Iosis...")
    jobs = [
        (tpl, parse, page)
        for tpl, parse, cap in CATEGORIES
        for page in range(1, min(max_pages, cap or max_pages) + 1)
    ]
    all_items = []
    with ThreadPoolExecutor(max_workers=15) as executor:
        for items in executor.map(lambda job: fetch_page(*job), jobs):
            all_items.extend(items)
    print(f"Finished scraping. Total items found: {len(all_items)}")
    return all_items


if __name__ == "__main__":
    run_scraper(SHOP_NAME, lambda limit: scrape_iosis(max_pages=limit), 5)
