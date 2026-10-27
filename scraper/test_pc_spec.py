"""
pc_spec の読み取りの確かめ（python scraper/test_pc_spec.py）。店の表記の実例（2026-10-27 の一覧）と期待値
"""
import sys

from pc_spec import parse_common, parse_gpu, pcwrap_rank, qualit_rank

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# (表記, CPU, Intel の世代, Windows 11, メモリ, ストレージ, 種類, 画面)
CASES = [
    ("Lenovo X1 Carbon (Win11x64)  中古 Core i5-1.7GHz(10310U)/メモリ8GB/SSD256GB/フルHD14インチ [C:並品] 2020年頃購入",
     "Core i5-10310U", 10, True, 8, 256, "SSD", 14.0),
    ("Lenovo ThinkPad X13 Gen 1(Win11x64)  中古 Core i5-1.6GHz(10210U)/メモリ8GB/SSD256GB/FHD13.3 [C:並品] 2021年頃購入",
     "Core i5-10210U", 10, True, 8, 256, "SSD", 13.3),
    ("HP ProBook 450 G5 (Win11x64)  中古 Core i5-1.6GHz(8250U)/メモリ8GB/HDD500GB/15.6インチ [訳あり品] 2018年",
     "Core i5-8250U", 8, True, 8, 500, "HDD", 15.6),
    ("VAIO VAIO Pro PJ (Win11x64) 中古 Core i5-2.4G(1135G7)/メモリ16GB/SSD256GB/フルHD12.5/Wi-Fi6対応 [C:並品] 2020年",
     "Core i5-1135G7", 11, True, 16, 256, "SSD", 12.5),
    ("Microsoft SurfacePro8(8PU-00041:Win11x64) 中古 Core i5(1145G7)/メモリ16GB/SSD256GB/13インチ [C:並品] 2021年",
     "Core i5-1145G7", 11, True, 16, 256, "SSD", 13.0),
    ("NEC VersaPro タイプVB (Win11x64) 中古 Core i5-1.7GHz(10310U)/8GBメモリ/SSD256GB/13.3インチ/Wi-Fi6対応 [訳あり品] 2020年",
     "Core i5-10310U", 10, True, 8, 256, "SSD", 13.3),
    ("DELL Alienware m15 R7 (Win11x64) 中古 Core i7-1.9GHz(12700H)/メモリ32GB/SSD512G/RTX3060/フルHD15.6/Wi-Fi6対応/ゲーミング [B:良品]",
     "Core i7-12700H", 12, True, 32, 512, "SSD", 15.6),
    ("Lenovo ThinkPad X13 Gen5 (Win11x64) 中古 Core Ultra 5 125U/CU5-125U/メモリ16GB/SSD256G/13.3インチ/Wi-Fi6対応 [A:美品] 2025年頃購入",
     "Core Ultra 5 125U", None, True, 16, 256, "SSD", 13.3),
    # PC WRAP（一覧のスペック欄を「 / 」でつないだもの）
    ("LENOVO / THINKPAD X13 GEN1 / Windows 11 Pro / Core i3 10110U / メモリ 8GB SSD 256GB / Intel Graphics / 13.3 インチ / 状態ランク:特選 / 在庫数:1",
     "Core i3-10110U", 10, True, 8, 256, "SSD", 13.3),
    ("HP / ELITEDESK 800 G4 SF / Windows 11 Pro / Core i7 8700 / メモリ 16GB SSD 256GB / Intel Graphics / 状態ランク:特選 / 在庫数:3",
     "Core i7-8700", 8, True, 16, 256, "SSD", None),
    ("DELL / LATITUDE 5420 / Windows 10 Pro / Core i5 7300U / メモリ 8GB SSD 1TB / 14 インチ / 状態ランク:標準",
     "Core i5-7300U", 7, False, 8, 1000, "SSD", 14.0),
    ("HP / 255 G8 / Windows 11 Home / Ryzen 5 5500U / メモリ 8GB SSD 256GB / 15.6 インチ / 状態ランク:特選",
     "Ryzen 5 5500U", None, True, 8, 256, "SSD", 15.6),
]

RANKS = [
    (qualit_rank, "[C:並品]", ("C", "C:並品")),
    (qualit_rank, "[S:超美品] 2025年頃購入", ("S", "S:超美品")),
    (qualit_rank, "[訳あり品] 2018年", ("J", "訳あり品")),
    (pcwrap_rank, "状態ランク:特選 / 在庫数:1", ("B", "特選")),
    (pcwrap_rank, "状態ランク:標準 / 在庫数:15", ("C", "標準")),
    (pcwrap_rank, "状態ランク:美麗", ("A", "美麗")),
    (pcwrap_rank, "状態ランク:新品", None),
]

GPUS = [
    ("/SSD512G/RTX3060/フルHD15.6", "RTX3060"),
    ("GeForce GTX 1650 / 15.6 インチ", "GeForce GTX 1650"),
    ("Intel Graphics", None),
]


def main() -> int:
    failed = 0
    for text, cpu, gen, win11, mem, sto, kind, inch in CASES:
        got = parse_common(text)
        want = (cpu, gen, win11, mem, sto, kind, inch)
        have = got and (got["cpu"], got["cpuGen"], got["win11"], got["memoryGB"], got["storageGB"], got["storageType"], got["screenInch"])
        if have != want:
            failed += 1
            print(f"NG {text}\n   want {want}\n   got  {have}")
    for fn, text, want in RANKS:
        if fn(text) != want:
            failed += 1
            print(f"NG rank {text}: {fn(text)} != {want}")
    for text, want in GPUS:
        if parse_gpu(text) != want:
            failed += 1
            print(f"NG gpu {text}: {parse_gpu(text)} != {want}")
    total = len(CASES) + len(RANKS) + len(GPUS)
    print(f"{total - failed}/{total} OK")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
