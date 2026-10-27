"""
Qualit（横河レンタ・リース・yrl-qualit.com）の中古ノートパソコン（2026-10-27〜）

- 一覧ページ /shopbrand/ct01/page<N>/recommend/（50件ずつ・EUC-JP）の商品名・在庫・価格（税込）だけを読む
- 商品の画像・説明文は使わない（利用規約 第3条）。商品ページは開かない
- 1ページずつ2秒あける。1日2回まで（pc_common.PC_MIN_HOURS）
- リンクは A8（lib/affiliate.ts。飛び先は yrl-qualit.com の中）
"""
import html
import re
import time

import requests

from pc_common import run_pc_scraper
from pc_spec import parse_common, parse_gpu, qualit_rank

SHOP_NAME = "Qualit"
BASE = "https://www.yrl-qualit.com"
LIST_URL = BASE + "/shopbrand/ct01/page{page}/recommend/"
MAX_PAGES = 30
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

_ITEM_RE = re.compile(
    r'<p class="name"><a href="(/shopdetail/\d+)/[^"]*">(.*?)</a></p>(.*?)<em class="price">([\d,]+)</em>', re.S
)


def parse_list(page_html: str) -> list[dict]:
    items = []
    for m in _ITEM_RE.finditer(page_html):
        title = " ".join(html.unescape(re.sub(r"<[^>]+>", "", m.group(2))).split())
        rest = m.group(3)
        if not re.search(r"Win1[01]", title):
            continue  # Windows 以外（Chromebook など）は載せない
        spec = parse_common(title)
        rank = qualit_rank(title)
        if not spec or not rank:
            continue
        stock = re.search(r"残りあと(\d+)個", rest)
        if re.search(r"売り切れ|SOLD ?OUT|品切れ", rest, re.IGNORECASE):
            continue
        product = re.split(r"\s*\(", title)[0].strip()
        items.append({
            **spec,
            "shopName": SHOP_NAME,
            "formFactor": "note",
            "productName": product,
            "gpu": parse_gpu(title),
            "conditionRank": rank[0],
            "rankLabel": rank[1],
            "stock": int(stock.group(1)) if stock else None,
            "price": int(m.group(4).replace(",", "")),
            "url": BASE + m.group(1) + "/",
        })
    return items


def scrape() -> list[dict]:
    items = []
    session = requests.Session()
    for page in range(1, MAX_PAGES + 1):
        res = session.get(LIST_URL.format(page=page), headers=HEADERS, timeout=30)
        res.raise_for_status()
        page_items = parse_list(res.content.decode("euc-jp", errors="replace"))
        raw_count = res.content.count(b'class="name"')
        print(f"page {page}: {raw_count} 件中 {len(page_items)} 件を読めた")
        items.extend(page_items)
        # 一覧は売り切れが後ろにまとまる。全部読めない（売り切れの）ページが出たら、その先は開かない
        if raw_count == 0 or not page_items:
            break
        time.sleep(2.0)
    # 同じ商品が複数ページに出ることがあるので URL で1件に
    return list({it["url"]: it for it in items}.values())


if __name__ == "__main__":
    run_pc_scraper(SHOP_NAME, scrape)
