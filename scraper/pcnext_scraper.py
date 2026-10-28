"""
PC next（ポンデテック・pcnext.shop・Shopify）の中古（再生）パソコン（2026-10-28〜）

- 商品の一覧は Shopify の公開の /products.json（250件ずつ）。在庫あり・非公開商品でない・周辺機器でない・新品でないものだけ残す
- スペック（CPU・メモリ・SSD・画面）は商品ページの仕様表にしかないので、残した商品のページを2秒おきに1本ずつ読む（2026-10-28 時点で約30台）。
  robots.txt は商品ページの取得を許可
- 1日2回まで（pc_common.PC_MIN_HOURS）
- 状態ランクは店にない（全品「再生パソコン」で1年保証・15日返金）。conditionRank は "-"、店の表記は「表記なし」
- リンクは A8（lib/affiliate.ts。飛び先は pcnext.shop の中）
"""
import html
import re
import time

import requests

from pc_common import run_pc_scraper
from pc_spec import parse_common, parse_gpu

SHOP_NAME = "PC next"
BASE = "https://pcnext.shop"
PRODUCTS_URL = BASE + "/products.json?limit=250&page={page}"
SKIP_TAGS = {"非公開商品", "周辺機器", "phone_order", "電話注文"}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}


def _text(fragment: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def candidates(products: list[dict]) -> list[dict]:
    """在庫があって、非公開・周辺機器・新品・電話注文用・無料回収キットでない商品"""
    out = []
    for p in products:
        variant = next((v for v in p["variants"] if v.get("available")), None)
        if not variant or SKIP_TAGS & set(p.get("tags") or []):
            continue
        if re.search(r"新品|電話注文", p["title"]) or float(variant["price"]) < 10000:
            continue
        out.append({"handle": p["handle"], "title": p["title"], "price": int(float(variant["price"])), "tags": p.get("tags") or []})
    return out


def parse_spec_table(page_html: str) -> dict:
    """商品ページの仕様表（<th>メーカー</th><td>Panasonic</td> …）"""
    return {
        _text(k): _text(v)
        for k, v in re.findall(r"<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>", page_html, re.S)
    }


def product_name(maker: str, model: str) -> str:
    """「HP」「HP ZBook 15G6」のように型番にメーカーが入っていれば重ねない"""
    return model.strip() if maker and model.lower().startswith(maker.lower()) else f"{maker} {model}".strip()


def build_item(c: dict, spec: dict) -> dict | None:
    if "Windows" not in spec.get("OS", ""):
        return None
    storage = spec.get("容量", "")
    kind = "SSD" if "SSD" in storage else "HDD"
    size = re.search(r"(\d+(?:\.\d+)?)\s?(GB|TB)", storage)
    joined = " / ".join([
        f"{spec.get('メーカー', '')} {spec.get('型番', '')}",
        spec.get("CPU", ""),
        f"メモリ{re.sub(r'GB.*', 'GB', spec.get('メモリ', ''))}",
        f"{kind}{size.group(1)}{size.group(2)}" if size else "",
        spec.get("画面サイズ", ""),
    ])
    common = parse_common(joined)
    if not common:
        return None
    return {
        **common,
        "shopName": SHOP_NAME,
        "formFactor": "desktop" if "デスクトップ" in c["tags"] or re.search(r"ProDesk|EliteDesk|Mate|Mini PC|SFF", c["title"]) else "note",
        "productName": product_name(spec.get("メーカー", ""), spec.get("型番", ""))[:80] or c["title"][:80],
        "gpu": parse_gpu(joined),
        "conditionRank": "-",
        "rankLabel": "表記なし",
        "stock": None,
        "price": c["price"],
        "url": f"{BASE}/products/{c['handle']}",
    }


def scrape() -> list[dict]:
    session = requests.Session()
    products = []
    for page in range(1, 6):
        res = session.get(PRODUCTS_URL.format(page=page), headers=HEADERS, timeout=30)
        res.raise_for_status()
        batch = res.json().get("products", [])
        products.extend(batch)
        time.sleep(2.0)
        if len(batch) < 250:
            break
    cands = candidates(products)
    print(f"商品 {len(products)} 件のうち、在庫ありのパソコンの候補 {len(cands)} 件")
    items = []
    for c in cands:
        res = session.get(f"{BASE}/products/{c['handle']}", headers=HEADERS, timeout=30)
        time.sleep(2.0)
        if res.status_code != 200:
            print(f"  {res.status_code} {c['handle']}")
            continue
        item = build_item(c, parse_spec_table(res.text))
        if item:
            items.append(item)
        else:
            print(f"  読めない: {c['title']}")
    return list({it["url"]: it for it in items}.values())


if __name__ == "__main__":
    run_pc_scraper(SHOP_NAME, scrape)
