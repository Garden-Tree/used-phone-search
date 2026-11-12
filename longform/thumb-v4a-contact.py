"""サムネ第4弾の一覧: 1行に A（いまの thumbnail.png）・D・E、その下に 168x94（スマホの関連動画の大きさ）
  python -I longform/thumb-v4a-contact.py  →  longform/thumb-v4a-contact.png"""
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
DIRS = ["2026-10-21-iphone-dore", "2026-10-26-how-old", "2026-10-27-dont-buy"]
BW, BH, SW, SH, GAP, PAD = 480, 270, 168, 94, 20, 20
ROW = BH + 12 + SH + 30
out = Image.new("RGB", (PAD * 2 + 3 * BW + 2 * GAP, PAD + len(DIRS) * ROW), "#F3F4F6")
draw = ImageDraw.Draw(out)
for r, d in enumerate(DIRS):
    y = PAD + r * ROW
    for c, f in enumerate(["thumbnail.png", "thumb-D.png", "thumb-E.png"]):
        im = Image.open(HERE / d / f).convert("RGB")
        x = PAD + c * (BW + GAP)
        out.paste(im.resize((BW, BH), Image.LANCZOS), (x, y))
        out.paste(im.resize((SW, SH), Image.LANCZOS), (x, y + BH + 12))
        draw.text((x + SW + 12, y + BH + 12 + 40), "ADE"[c] + "  " + d, fill="#111827")
out.save(HERE / "thumb-v4a-contact.png")
print(out.size)
