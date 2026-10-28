"""
iPhone の買取価格（店が客から買い取る値段・BuybackPrice・2026-10-28〜）

- ネットオフ: 一覧 /mobilebuy/smartphone/iphone/ から機種ページを拾い、各ページの `let data = [...]`（容量 × s/a/ab/b/c）を読む。1ページずつ5秒あける
- にこスマ: /sell の __NEXT_DATA__ に全機種（容量ごとに A 良品／B 割れ／C 故障・キャリアは1つ）。1リクエスト
- モバステ（運営 パステック）: pastec.net/iphone の価格表（容量ごとに 未開封・中古の上限〜下限）。1リクエスト
- 週1回（前回から BUYBACK_MIN_HOURS 経っていなければ何もしない。FORCE_BUYBACK=1 で無視）。店ごとに洗い替え（取得が前回の半分未満なら止める）
- 403・429 などで取れなかった店は回避せずに飛ばす（前回の値のまま）
- 調べた経緯は ideas/2026-10-28.md（「b: 買取価格のデータ源の調査」）

  python buyback_scraper.py --dry   # 取り込まずに件数と先頭を出す
"""
import html
import json
import os
import re
import sys
import time

import psycopg2
import requests
from psycopg2.extras import execute_values

from common import DEFAULT_MIN_RATIO, MIN_EXISTING_TO_CHECK, ReplaceGuardError, load_database_url

BUYBACK_MIN_HOURS = 6 * 24
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; used.gadelog.com price comparison; +https://used.gadelog.com/about)"}
COLUMNS = ["shopName", "model", "storage", "grade", "gradeLabel", "carrier", "price", "url"]

NETOFF_LIST = "https://www.netoff.co.jp/mobilebuy/smartphone/iphone/"
NETOFF_GRADES = {"s": "未開封", "a": "美品", "ab": "使用感小", "b": "キズあり", "c": "目立つキズ"}
NICOSUMA_URL = "https://www.nicosuma.com/sell"
NICOSUMA_GRADES = {"GRADE_A": ("A", "良品"), "GRADE_B": ("B", "本体割れ"), "GRADE_C": ("C", "機能不良")}
MOBASTE_URL = "https://pastec.net/iphone"


def canonical_iphone(raw: str) -> str | None:
    """店の表記を lib/catalog.ts の機種名に（例: iPhone15 Pro Max → iPhone 15 Pro Max・iphone16e → iPhone 16e・iPhone SE 第3世代 → iPhone SE (第3世代)）"""
    s = html.unescape(raw).replace("　", " ").strip()
    s = re.sub(r"(?i)^iphone\s*", "", s)
    m = re.match(r"(?i)se\s*[\(（]?\s*第?\s*([23])\s*世代", s) or re.match(r"(?i)se\s*([23])\b", s)
    if m:
        return f"iPhone SE (第{m.group(1)}世代)"
    if re.match(r"(?i)air\b", s):
        return "iPhone Air"
    m = re.match(r"(?i)x\s*s\s*max\b|xsmax\b", s)
    if m:
        return "iPhone XS Max"
    for name in ("XS", "XR", "X"):
        if re.match(rf"(?i){name}\b", s):
            return f"iPhone {name}"
    m = re.match(r"(?i)(\d{1,2})\s*(e|mini|plus|pro\s*max|promax|pro)?\b", s)
    if not m:
        return None
    num, suf = m.group(1), (m.group(2) or "").lower().replace(" ", "")
    tail = {"": "", "e": "e", "mini": " mini", "plus": " Plus", "pro": " Pro", "promax": " Pro Max"}[suf]
    return f"iPhone {num}{tail}"


def storage_gb(text: str) -> int | None:
    m = re.search(r"(\d+)\s*(GB|TB)", text, re.I)
    if not m:
        return None
    n = int(m.group(1))
    return n * 1024 if m.group(2).upper() == "TB" else n


def get(url: str) -> str | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
    except requests.RequestException as e:
        print(f"::warning::買取: {url} を取れない（{e}）")
        return None
    if r.status_code != 200:
        print(f"::warning::買取: {url} が {r.status_code}（回避しない・前回の値のまま）")
        return None
    r.encoding = r.encoding or "utf-8"
    return r.text


def scrape_netoff() -> list[dict]:
    top = get(NETOFF_LIST)
    if not top:
        return []
    pages = sorted(set(re.findall(r'href="\./(iphone[^/"]+/iphone[a-z0-9]+\.html)"', top)))
    items = []
    for path in pages:
        slug = path.split("/")[-1][: -len(".html")]
        model = canonical_iphone(slug)
        if not model:
            continue
        time.sleep(5)
        url = NETOFF_LIST + path
        page = get(url)
        if not page:
            continue
        m = re.search(r"let data = (\[.*?\]);", page, re.S)
        if not m:
            print(f"::warning::買取: ネットオフ {slug} に価格の JSON がない")
            continue
        for row in json.loads(m.group(1)):
            gb = storage_gb(row.get("storage", ""))
            grade = str(row.get("rank", "")).lower()
            if gb is None or grade not in NETOFF_GRADES or not row.get("price"):
                continue
            items.append({"shopName": "ネットオフ", "model": model, "storage": gb, "grade": grade, "gradeLabel": NETOFF_GRADES[grade],
                          "carrier": row.get("carrier") or None, "price": int(row["price"]), "url": url})
    return items


def scrape_nicosuma() -> list[dict]:
    page = get(NICOSUMA_URL)
    if not page:
        return []
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', page, re.S)
    if not m:
        print("::warning::買取: にこスマの __NEXT_DATA__ がない")
        return []
    found = []

    def walk(o):
        if isinstance(o, dict):
            if "specVariants" in o and "value" in o:
                found.append(o)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(json.loads(m.group(1)))
    items = []
    for o in found:
        if (o.get("series") or {}).get("key") != "iphone":
            continue
        model = canonical_iphone(o["value"])
        if not model:
            continue
        for v in o["specVariants"]:
            gb = storage_gb((v.get("storage") or {}).get("value", ""))
            if gb is None:
                continue
            carrier = (v.get("carrier") or {}).get("value") or None
            for g in v.get("gradePrices", []):
                if g.get("grade") not in NICOSUMA_GRADES or not g.get("price"):
                    continue
                grade, label = NICOSUMA_GRADES[g["grade"]]
                items.append({"shopName": "にこスマ", "model": model, "storage": gb, "grade": grade, "gradeLabel": label,
                              "carrier": carrier, "price": int(float(g["price"])), "url": NICOSUMA_URL})
    return items


def _text(fragment: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def scrape_mobaste() -> list[dict]:
    page = get(MOBASTE_URL)
    if not page:
        return []
    items = []
    for row in re.findall(r'<tr class="js-targetStorage"(.*?)</tr>', page, re.S):
        name = re.search(r'p-priceTable__name">(.*?)</div>', row, re.S)
        if not name:
            continue
        name_text = _text(name.group(1))
        model = canonical_iphone(name_text)
        gb = storage_gb(name_text)
        if not model or gb is None:
            continue
        carrier = (re.search(r'data-carrier-key="([^"]*)"', row) or [None, None])[1]
        unopened = re.search(r"price--unopened\">\s*([\d,]+)円", row)
        used = re.search(r"中古買取価格</span>\s*<span class=\"price\">\s*([\d,]+)円(?:〜([\d,]+)円)?", row)
        rows = []
        if unopened:
            rows.append(("unopened", "未開封", unopened.group(1)))
        if used:
            rows.append(("used_max", "中古（上限）", used.group(1)))
            if used.group(2):
                rows.append(("used_min", "中古（下限）", used.group(2)))
        for grade, label, price in rows:
            items.append({"shopName": "モバステ", "model": model, "storage": gb, "grade": grade, "gradeLabel": label,
                          "carrier": carrier, "price": int(price.replace(",", "")), "url": MOBASTE_URL})
    return items


SHOPS = [("ネットオフ", scrape_netoff), ("にこスマ", scrape_nicosuma), ("モバステ", scrape_mobaste)]


def recently_updated(cur, shop: str) -> bool:
    if os.environ.get("FORCE_BUYBACK") == "1":
        return False
    cur.execute(
        'SELECT MAX("updatedAt") > (NOW() AT TIME ZONE \'UTC\') - make_interval(hours => %s) FROM "BuybackPrice" WHERE "shopName" = %s',
        (BUYBACK_MIN_HOURS, shop),
    )
    return bool(cur.fetchone()[0])


def replace(conn, shop: str, items: list[dict]) -> None:
    with conn:
        with conn.cursor() as cur:
            if os.environ.get("FORCE_REPLACE") != "1":
                cur.execute('SELECT COUNT(*) FROM "BuybackPrice" WHERE "shopName" = %s', (shop,))
                existing = cur.fetchone()[0]
                if existing >= MIN_EXISTING_TO_CHECK and len(items) < existing * DEFAULT_MIN_RATIO:
                    raise ReplaceGuardError(f"[買取 {shop}] 取得 {len(items)} 件が既存 {existing} 件の半分未満のため中止")
            cur.execute('DELETE FROM "BuybackPrice" WHERE "shopName" = %s', (shop,))
            cols = ", ".join(f'"{c}"' for c in COLUMNS)
            execute_values(
                cur,
                f'INSERT INTO "BuybackPrice" ("id", {cols}, "createdAt", "updatedAt") VALUES %s',
                [tuple(i.get(c) for c in COLUMNS) for i in items],
                template=f"(gen_random_uuid(), {', '.join(['%s'] * len(COLUMNS))}, NOW(), NOW())",
            )
    print(f"[買取 {shop}] {len(items)} 件を取り込みました")


def main() -> None:
    dry = "--dry" in sys.argv
    conn = None if dry else psycopg2.connect(load_database_url())
    failed = 0
    try:
        for shop, scrape in SHOPS:
            if conn:
                with conn.cursor() as cur:
                    if recently_updated(cur, shop):
                        print(f"[買取 {shop}] 前回から {BUYBACK_MIN_HOURS // 24} 日たっていないので飛ばす")
                        continue
            items = scrape()
            models = sorted({i["model"] for i in items})
            print(f"[買取 {shop}] {len(items)} 件・{len(models)} 機種")
            if dry:
                for i in items[:12]:
                    print("  ", i["model"], i["storage"], i["grade"], i["gradeLabel"], i["carrier"], i["price"])
                print("   機種:", " / ".join(models))
                continue
            if not items:
                failed += 1
                continue
            try:
                replace(conn, shop, items)
            except ReplaceGuardError as e:
                print(f"::warning::{e}")
                failed += 1
    finally:
        if conn:
            conn.close()
    # 3店とも取れなかったときだけ失敗にする（1店だけの失敗は警告で続ける）
    if failed == len(SHOPS):
        sys.exit(1)


if __name__ == "__main__":
    main()
