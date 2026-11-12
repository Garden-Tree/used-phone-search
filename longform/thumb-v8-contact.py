"""サムネ第8弾の一覧: 1行に「v7 の I か J・v8 の K か L」、その下に 168x94（スマホの関連動画の大きさ）。4行
  python -I longform/thumb-v8-contact.py  →  longform/thumb-v8-contact.png"""
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROWS = [("2026-10-21-iphone-dore", "I", "K"), ("2026-10-21-iphone-dore", "J", "L"), ("2026-10-24-where-to-buy", "I", "K"), ("2026-10-24-where-to-buy", "J", "L")]
BW, BH, SW, SH, GAP, PAD = 560, 315, 168, 94, 16, 16
ROW = BH + 10 + SH + 26
out = Image.new("RGB", (PAD * 2 + 2 * BW + GAP, PAD + len(ROWS) * ROW), "#F3F4F6")
draw = ImageDraw.Draw(out)
for r, (d, old, new) in enumerate(ROWS):
    y = PAD + r * ROW
    for c, label in enumerate([old, new]):
        im = Image.open(HERE / d / f"thumb-{label}.png").convert("RGB")
        x = PAD + c * (BW + GAP)
        out.paste(im.resize((BW, BH), Image.LANCZOS), (x, y))
        out.paste(im.resize((SW, SH), Image.LANCZOS), (x, y + BH + 10))
        draw.text((x + SW + 12, y + BH + 10 + 40), ("v7 " if c == 0 else "v8 ") + label + "  " + d, fill="#111827")
out.save(HERE / "thumb-v8-contact.png")
print(out.size)
