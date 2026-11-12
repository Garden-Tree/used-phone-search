"""横動画のサムネ・第10弾 a 組の一覧（2026-11-13）
  python -I longform/thumb-v10-a-contact.py
出力: longform/thumb-v10-a-contact.png … 1行に「いまの thumbnail.png・新しい thumb-N.png」、その下に 168x94 に縮めたもの
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DIRS = ["2026-11-06-jirai", "2026-11-01-monthly", "2026-11-02-storage", "2026-10-29-battery", "2026-10-28-big-screen"]
CW, CH, GAP, SW, SH = 640, 360, 16, 168, 94
ROW = CH + GAP + SH + GAP * 2

sheet = Image.new("RGB", (GAP + (CW + GAP) * 2, GAP + ROW * len(DIRS)), (40, 40, 44))
for r, d in enumerate(DIRS):
    y = GAP + r * ROW
    for c, name in enumerate(["thumbnail.png", "thumb-N.png"]):
        im = Image.open(os.path.join(HERE, d, name)).convert("RGB")
        x = GAP + c * (CW + GAP)
        sheet.paste(im.resize((CW, CH), Image.LANCZOS), (x, y))
        sheet.paste(im.resize((SW, SH), Image.LANCZOS), (x, y + CH + GAP))
sheet.save(os.path.join(HERE, "thumb-v10-a-contact.png"))
print("longform/thumb-v10-a-contact.png")
