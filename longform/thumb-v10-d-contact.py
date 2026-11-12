"""一覧 longform/thumb-v10-d-contact.png（いまの thumbnail.png・新しい thumb-N.png と、168x94 に縮めたもの）
   python -I longform/thumb-v10-d-contact.py"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).parent
DIRS = ["2026-11-11-apple-watch", "2026-11-07-pixel", "2026-11-06-ipad-how-old", "2026-10-30-ipad-mini", "2026-11-04-foldables"]
BW, BH, SW, SH, GAP = 640, 360, 168, 94, 12
ROW = BH + GAP + SH + GAP * 2
sheet = Image.new("RGB", (BW * 2 + GAP * 3, ROW * len(DIRS) + GAP), "#f1f1f1")
for r, d in enumerate(DIRS):
    for c, name in enumerate(["thumbnail.png", "thumb-N.png"]):
        im = Image.open(HERE / d / name).convert("RGB")
        x, y = GAP + c * (BW + GAP), GAP + r * ROW
        sheet.paste(im.resize((BW, BH), Image.LANCZOS), (x, y))
        sheet.paste(im.resize((SW, SH), Image.LANCZOS), (x, y + BH + GAP))
sheet.save(HERE / "thumb-v10-d-contact.png")
print("→ longform/thumb-v10-d-contact.png", sheet.size)
