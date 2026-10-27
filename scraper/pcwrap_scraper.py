"""
PC WRAP（エスエヌシー・pcwrap.com）の中古ノート・デスクトップパソコン（2026-10-27〜）

- 一覧ページ /item/index/?category1=<2: ノート / 1: デスクトップ>&nojunk=true&stock_min=1&o=<オフセット>（16件ずつ）の
  メーカー・機種・OS・CPU・メモリ・ストレージ・GPU・画面・状態ランク・在庫数・価格（税込）だけを読む。商品ページは開かない
- 1ページずつ2秒あける。1日2回まで（pc_common.PC_MIN_HOURS）
- リンクは A8（lib/affiliate.ts。飛び先は pcwrap.com の中）
"""
import html
import re
import time

import requests

from pc_common import run_pc_scraper
from pc_spec import parse_common, parse_gpu, pcwrap_rank

SHOP_NAME = "PC WRAP"
BASE = "https://www.pcwrap.com"
LIST_URL = BASE + "/item/index/?category1={category}&nojunk=true&stock_min=1&o={offset}"
CATEGORIES = [("2", "note"), ("1", "desktop")]
PER_PAGE = 16
MAX_PAGES = 40
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}


def _text(fragment: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def parse_list(page_html: str, form_factor: str) -> list[dict]:
    items = []
    for li in re.findall(r'<li style="text-align: center;">(.*?)</li>', page_html, re.S):
        href = re.search(r'href="(?:/)?(item/detail/\d+)"', li)
        price = re.search(r"￥([\d,]+)", li)
        if not href or not price:
            continue
        specs = [_text(x) for x in re.findall(r'<span class="subspec">(.*?)</span>', li, re.S)]
        joined = " / ".join(specs)
        if "Windows" not in joined:
            continue  # Mac・OS なしは載せない
        spec = parse_common(joined)
        rank = pcwrap_rank(joined)
        if not spec or not rank:
            continue
        maker = specs[0] if specs else ""
        model = specs[1] if len(specs) > 1 else ""
        stock = re.search(r"在庫数\s?[:：]\s?(\d+)", joined)
        items.append({
            **spec,
            # メーカーは店の表記（LENOVO・富士通）を優先して、読めなければ機種名から
            "maker": spec["maker"] if spec["maker"] != "その他" else maker.title(),
            "shopName": SHOP_NAME,
            "formFactor": form_factor,
            "productName": f"{maker} {model}".strip(),
            "gpu": parse_gpu(joined),
            "conditionRank": rank[0],
            "rankLabel": rank[1],
            "stock": int(stock.group(1)) if stock else None,
            "price": int(price.group(1).replace(",", "")),
            "url": f"{BASE}/{href.group(1)}",
        })
    return items


def scrape() -> list[dict]:
    items = []
    session = requests.Session()
    for category, form_factor in CATEGORIES:
        for page in range(MAX_PAGES):
            res = session.get(LIST_URL.format(category=category, offset=page * PER_PAGE), headers=HEADERS, timeout=30)
            res.raise_for_status()
            text = res.text
            raw_count = text.count('<li style="text-align: center;">')
            page_items = parse_list(text, form_factor)
            print(f"{form_factor} o={page * PER_PAGE}: {raw_count} 件中 {len(page_items)} 件を読めた")
            items.extend(page_items)
            time.sleep(2.0)
            if raw_count < PER_PAGE:
                break
    return list({it["url"]: it for it in items}.values())


if __name__ == "__main__":
    run_pc_scraper(SHOP_NAME, scrape)
