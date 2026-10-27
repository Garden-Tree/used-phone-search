"""
中古パソコン（Windows のノート・デスクトップ）の条件の読み取り（2026-10-27〜）

店の表記（商品名・一覧のスペック欄）から CPU・メモリ・ストレージ・画面・ランクを読む。
読み取れない商品は取り込まない（相場をゆがめないため）。確かめ方は scraper/test_pc_spec.py
"""
import re

# CPU の表記。「Core i5-1.6GHz(10210U)」（Qualit）・「Core i5 10210U」（PC WRAP）・「Core Ultra 5 125U」「Ryzen 5 5500U」
_INTEL_RE = re.compile(r"Core\s?(i[3579])[\s-]*(?:[\d.]+G(?:Hz)?)?\s*\(?\s*(\d{4,5})([A-Z]{0,2}\d?)\)?", re.IGNORECASE)
_ULTRA_RE = re.compile(r"Core\s?Ultra\s?([579])[\s-]*(?:[\d.]+G(?:Hz)?)?\s*\(?\s*(\d{3}[A-Z]{0,2})\)?", re.IGNORECASE)
_RYZEN_RE = re.compile(r"Ryzen\s?([3579])[\s-]*(?:PRO)?\s*(?:[\d.]+GHz)?\s*\(?\s*(?:PRO\s)?(\d{4})([A-Z]{0,2}\d?)\)?", re.IGNORECASE)
_LOW_RE = re.compile(r"(Celeron|Pentium|Atom|Core\s?m3)", re.IGNORECASE)


def parse_cpu(text: str):
    """(CPU の表記, 系統, Intel の世代) を返す。読めなければ None。
    系統は「Core i5」「Core Ultra 5」「Ryzen 5」「Celeron」など。世代は Intel Core i だけ（Core Ultra・Ryzen は None）"""
    m = _ULTRA_RE.search(text)
    if m:
        return f"Core Ultra {m.group(1)} {m.group(2).upper()}", f"Core Ultra {m.group(1)}", None
    m = _INTEL_RE.search(text)
    if m:
        digits, suffix = m.group(2), m.group(3).upper()
        # 5桁は先頭2桁（10210U→10）、4桁で1から始まるものも先頭2桁（1135G7→11・1235U→12）、それ以外は先頭1桁（8350U→8）
        gen = int(digits[:2]) if len(digits) == 5 or digits[0] == "1" else int(digits[0])
        return f"Core {m.group(1).lower()}-{digits}{suffix}", f"Core {m.group(1).lower()}", gen
    m = _RYZEN_RE.search(text)
    if m:
        return f"Ryzen {m.group(1)} {m.group(2)}{m.group(3).upper()}", f"Ryzen {m.group(1)}", None
    m = _LOW_RE.search(text)
    if m:
        name = m.group(1).title().replace("Core M3", "Core m3").replace("Corem3", "Core m3")
        return name, name, None
    return None


def windows11_ok(cpu_family: str, gen, cpu: str) -> bool:
    """Windows 11 の対応 CPU か（Microsoft の対応プロセッサ一覧: Intel 第8世代以降・Core Ultra・AMD Ryzen 2000 以降）。
    Celeron・Pentium などは型番ごとに違うので False（載せるときは「要確認」）"""
    if cpu_family.startswith("Core Ultra"):
        return True
    if cpu_family.startswith("Core i"):
        return gen is not None and gen >= 8
    if cpu_family.startswith("Ryzen"):
        m = re.search(r"(\d)\d{3}", cpu)
        return bool(m) and int(m.group(1)) >= 2
    return False


def parse_memory(text: str):
    m = re.search(r"メモリ\s?(\d{1,3})\s?GB", text) or re.search(r"(\d{1,3})\s?GB\s?メモリ", text)
    return int(m.group(1)) if m else None


def parse_storage(text: str):
    """(容量GB, "SSD" | "HDD")。SSD と HDD の両方があれば SSD を返す"""
    for kind in ("SSD", "HDD"):
        m = re.search(kind + r"\s?(\d+(?:\.\d+)?)\s?(GB|TB|G|T)(?![A-Za-z])", text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            return int(val * 1000 if m.group(2).upper().startswith("T") else val), kind
    return None


def parse_screen(text: str):
    """画面のインチ。「13.3インチ」「FHD13.3」「15.6 インチ」"""
    m = re.search(r"(1[0-9](?:\.\d)?|2[0-9](?:\.\d)?)\s?(?:インチ|型)", text)
    if not m:
        m = re.search(r"(?:FHD|フルHD|HD\+?|WUXGA|4K)\s?(1[0-9](?:\.\d)?)(?![\d.])", text, re.IGNORECASE)
    return float(m.group(1)) if m else None


# ランクの表記を A・B・C・J（訳あり）にそろえる。店の表記は original に残す
QUALIT_RANKS = {"S": "S", "A": "A", "B": "B", "C": "C"}
# PC WRAP の「商品ランク比較表」（/guide）: 美麗品＝使用感が極めて少ない・特選品＝一般的な中古・標準品＝電池が短い／画面の傷など・
# 訳あり品＝動作に不具合（保証なし）。新品は載せない（None）
PCWRAP_RANKS = {"美麗": "A", "特選": "B", "標準": "C", "訳あり": "J"}


def qualit_rank(text: str):
    """「[S:超美品]」「[A:美品]」「[B:良品]」「[C:並品]」「[訳あり品]」→ (S/A/B/C/J, 店の表記)"""
    m = re.search(r"\[([SABC]):([^\]]+)\]", text)
    if m:
        return QUALIT_RANKS[m.group(1)], f"{m.group(1)}:{m.group(2)}"
    if "訳あり" in text:
        return "J", "訳あり品"
    return None


def pcwrap_rank(text: str):
    """「状態ランク:特選」→ (A/B/C/J, 店の表記)。新品・知らない表記は None"""
    m = re.search(r"状態ランク\s?[:：]\s?(\S+)", text)
    if not m:
        return None
    raw = m.group(1)
    for key, rank in PCWRAP_RANKS.items():
        if key in raw:
            return rank, raw
    return None


MAKERS = [
    ("Lenovo", r"Lenovo|レノボ|ThinkPad|ThinkCentre"),
    ("HP", r"\bHP\b|Hewlett|ProBook|EliteBook|EliteDesk|ProDesk"),
    ("Dell", r"Dell|Latitude|OptiPlex|Vostro|Inspiron"),
    ("富士通", r"富士通|Fujitsu|LIFEBOOK|ESPRIMO"),
    ("NEC", r"\bNEC\b|VersaPro|Mate\b|LAVIE"),
    ("Dynabook", r"dynabook|東芝|Toshiba"),
    ("Panasonic", r"Panasonic|パナソニック|Let'?s ?note|CF-[A-Z]{2}"),
    ("Microsoft", r"Surface|Microsoft"),
    ("VAIO", r"VAIO"),
    ("ASUS", r"ASUS"),
    ("Acer", r"Acer"),
    ("MSI", r"\bMSI\b"),
]


def parse_gpu(text: str):
    """専用の GPU（ゲーミング）。「RTX3060」「GeForce GTX 1650」。内蔵だけなら None"""
    m = re.search(r"((?:GeForce\s?)?(?:RTX|GTX|MX)\s?A?\d{3,4}(?:\s?Ti)?|Radeon\s?RX\s?\d{3,4}[A-Z]?|Quadro\s?\S+|RTX\s?A\d{3,4})", text, re.IGNORECASE)
    return m.group(1) if m else None


def parse_maker(text: str) -> str:
    for name, pattern in MAKERS:
        if re.search(pattern, text, re.IGNORECASE):
            return name
    return "その他"


def parse_common(text: str):
    """店に関係なく読む項目。どれか（CPU・メモリ・ストレージ）が読めなければ None"""
    cpu = parse_cpu(text)
    memory = parse_memory(text)
    storage = parse_storage(text)
    if not cpu or not memory or not storage:
        return None
    cpu_name, family, gen = cpu
    return {
        "maker": parse_maker(text),
        "cpu": cpu_name,
        "cpuFamily": family,
        "cpuGen": gen,
        "win11": windows11_ok(family, gen, cpu_name),
        "memoryGB": memory,
        "storageGB": storage[0],
        "storageType": storage[1],
        "screenInch": parse_screen(text),
    }
