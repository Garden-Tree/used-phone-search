"""サムネ第9弾の一覧: 1行に「いまの thumb-H.png・新しい thumb-M.png」、その下に 168x94 に縮めたもの。
python -I longform/thumb-v9-contact.py → longform/thumb-v9-contact.png
"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).parent
DIRS = ["2026-10-26-how-old", "2026-10-27-dont-buy", "2026-10-23-ipad-dore"]
BW, BH, SW, SH, GAP = 640, 360, 168, 94, 16
ROW = BH + GAP + SH + GAP * 2

sheet = Image.new("RGB", (GAP + (BW + GAP) * 2, GAP + ROW * len(DIRS)), "#DDDDDD")
for r, d in enumerate(DIRS):
    for c, name in enumerate(["thumb-H.png", "thumb-M.png"]):
        im = Image.open(HERE / d / name).convert("RGB")
        x, y = GAP + c * (BW + GAP), GAP + r * ROW
        sheet.paste(im.resize((BW, BH), Image.LANCZOS), (x, y))
        sheet.paste(im.resize((SW, SH), Image.LANCZOS), (x, y + BH + GAP))
sheet.save(HERE / "thumb-v9-contact.png")
print("→ longform/thumb-v9-contact.png", sheet.size)
