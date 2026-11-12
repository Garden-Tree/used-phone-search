"""サムネ第7弾の一覧: 1行に G（いま YouTube に入っている絵の版）・I（実機を並べる）・J（実機を大きく）、その下に 168x94（スマホの関連動画の大きさ）
  python -I longform/thumb-v7-contact.py  →  longform/thumb-v7-contact.png"""
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROWS = ["2026-10-21-iphone-dore", "2026-10-24-where-to-buy"]
BW, BH, SW, SH, GAP, PAD = 448, 252, 168, 94, 16, 16
ROW = BH + 10 + SH + 26
out = Image.new("RGB", (PAD * 2 + 3 * BW + 2 * GAP, PAD + len(ROWS) * ROW), "#F3F4F6")
draw = ImageDraw.Draw(out)
for r, d in enumerate(ROWS):
    y = PAD + r * ROW
    for c, label in enumerate(["G", "I", "J"]):
        im = Image.open(HERE / d / f"thumb-{label}.png").convert("RGB")
        x = PAD + c * (BW + GAP)
        out.paste(im.resize((BW, BH), Image.LANCZOS), (x, y))
        out.paste(im.resize((SW, SH), Image.LANCZOS), (x, y + BH + 10))
        draw.text((x + SW + 12, y + BH + 10 + 40), label + "  " + d, fill="#111827")
out.save(HERE / "thumb-v7-contact.png")
print(out.size)
