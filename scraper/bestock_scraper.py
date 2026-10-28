"""
Be-Stock（アイ・ティー・エス・ジャパン・be-stock.com/shop2）の中古ノート・デスクトップパソコン（2026-10-28〜）

- 一覧ページ /shop2/<note|desktop>.html?p=<ページ>（20件ずつ）の商品名・CPU・メモリ・ストレージ・画面・OS・ランク・価格（税込）だけを読む。
  商品ページは開かない。robots.txt は /shop2/ を許可（検索・カテゴリの view・カートなどは不許可で、使わない）
- 1ページずつ2秒あける。1日2回まで（pc_common.PC_MIN_HOURS）
- ランクは店の「表記項目の説明」（/shop2/notation・2026-10-28 に確認）: 1つ目の札が商品全体（S 最高の状態・A 全体的に良い・
  B 目立つキズや欠け・C 筐体に破損のあるわけあり品）、2つ目が画面（HP・DELL は付かない）。C と「動作ランク：B」（何らかの機能障害）は訳あり（J）にする
- Windows だけ（Mac・iPad・スマホは載せない。スマホは Yahoo! の Be-Stock 店で取っている）
- リンクは A8（lib/affiliate.ts。飛び先は be-stock.com/shop2 の中）
"""
import html
import re
import time

import requests

from pc_common import run_pc_scraper
from pc_spec import parse_common, parse_gpu

SHOP_NAME = "Be-Stock"
BASE = "https://www.be-stock.com/shop2"
LIST_URL = BASE + "/{category}.html?p={page}"
CATEGORIES = [("note", "note"), ("desktop", "desktop")]
PER_PAGE = 20
MAX_PAGES = 60
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}
ITEM_START = '<li class="item product product-item">'
# 商品全体のランク（店の表記 → S/A/B/C/J）。C は「わけあり品」なので J
BESTOCK_RANKS = {"S": "S", "A": "A", "B": "B", "C": "J"}


def _text(fragment: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def bestock_rank(cond_html: str, comment: str):
    """(S/A/B/J, 店の表記)。1つ目の札が商品全体、2つ目（あれば）が画面。読めなければ None"""
    labels = re.findall(r"<span class='label label-(?:inverse|info)'>([^<]+)</span>", cond_html)
    if not labels:
        return None
    m = re.match(r"([SABC])ランク", labels[0])
    if not m:
        return ("J", labels[0]) if "ジャンク" in labels[0] else None
    label = f"本体{m.group(1)}" + (f"・画面{labels[1].replace('ランク', '')}" if len(labels) > 1 else "")
    rank = BESTOCK_RANKS[m.group(1)]
    if re.search(r"動作ランク\s?[:：]\s?B", comment):
        rank, label = "J", label + "・動作B"
    return rank, label


def parse_list(page_html: str, form_factor: str) -> list[dict]:
    items = []
    for chunk in page_html.split(ITEM_START)[1:]:
        href = re.search(r'class="product-item-link"\s+href="([^"]+)"', chunk)
        name = re.search(r'class="product-item-link"[^>]*>(.*?)</a>', chunk, re.S)
        price = re.search(r'data-price-amount="(\d+)"', chunk) or re.search(r"￥\s*</?[^>]*>?\s*([\d,]+)", chunk)
        if not href or not name or not price:
            continue
        specs = dict(
            (_text(k), _text(v))
            for k, v in re.findall(r'<strong class="type">(.*?)</strong></div>\s*<div class="value">(.*?)</div>', chunk, re.S)
        )
        if not re.search(r"Win", specs.get("OS", "")):
            continue  # Mac・iPad・OS なしは載せない
        storage = specs.get("HDD", "")
        kind = "SSD" if "SSD" in storage else "HDD"
        size = re.search(r"(\d+(?:\.\d+)?)\s?(GB|TB)", storage)
        title = _text(name.group(1))
        # 共通の読み取り（pc_spec）に合う形の文にする: 「Core i5 8365U / メモリ8GB / SSD256GB / 13.3インチ」
        joined = " / ".join([
            title,
            specs.get("CPU", ""),
            f"メモリ{re.sub(r'GB.*', 'GB', specs.get('メモリ', ''))}",
            f"{kind}{size.group(1)}{size.group(2)}" if size else "",
            specs.get("ディスプレイ", ""),
        ])
        spec = parse_common(joined)
        cond = re.search(r'product-item-cond">(.*?)</dl>', chunk, re.S)
        comment = re.search(r'product-item-description">(.*?)</div>', chunk, re.S)
        rank = bestock_rank(cond.group(1) if cond else "", _text(comment.group(1)) if comment else "")
        if not spec or not rank:
            continue
        product = re.sub(r"\s*【中古】.*$", "", title).strip()
        items.append({
            **spec,
            "shopName": SHOP_NAME,
            "formFactor": form_factor,
            "productName": product[:80],
            "gpu": parse_gpu(joined),
            "conditionRank": rank[0],
            "rankLabel": rank[1],
            "stock": None,
            "price": int(price.group(1).replace(",", "")),
            "url": href.group(1),
        })
    return items


def scrape() -> list[dict]:
    items = []
    session = requests.Session()
    for category, form_factor in CATEGORIES:
        for page in range(1, MAX_PAGES + 1):
            res = session.get(LIST_URL.format(category=category, page=page), headers=HEADERS, timeout=30)
            res.raise_for_status()
            text = res.text
            raw_count = text.count(ITEM_START)
            page_items = parse_list(text, form_factor)
            print(f"{form_factor} p={page}: {raw_count} 件中 {len(page_items)} 件を読めた")
            items.extend(page_items)
            time.sleep(2.0)
            # 最後のページの次は Magento が最後のページを返すので、件数が足りないか「次へ」がなければ終わり
            if raw_count < PER_PAGE or 'class="action  next"' not in text and "action next" not in text:
                break
    return list({it["url"]: it for it in items}.values())


if __name__ == "__main__":
    run_pc_scraper(SHOP_NAME, scrape)
