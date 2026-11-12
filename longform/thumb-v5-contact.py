"""サムネ第5弾の一覧: 1行に A（いまの thumbnail.png）・第1案でよかった方（D か E）・F・G、その下に 168x94（スマホの関連動画の大きさ）
  python -I longform/thumb-v5-contact.py  →  longform/thumb-v5-contact.png"""
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROWS = [("2026-10-21-iphone-dore", "D"), ("2026-10-26-how-old", "E"), ("2026-10-27-dont-buy", "E"), ("2026-10-24-where-to-buy", "E"), ("2026-10-23-ipad-dore", "D")]
BW, BH, SW, SH, GAP, PAD = 448, 252, 168, 94, 16, 16
ROW = BH + 10 + SH + 26
out = Image.new("RGB", (PAD * 2 + 4 * BW + 3 * GAP, PAD + len(ROWS) * ROW), "#F3F4F6")
draw = ImageDraw.Draw(out)
for r, (d, first) in enumerate(ROWS):
    y = PAD + r * ROW
    for c, (label, f) in enumerate([("A", "thumbnail.png"), (first, f"thumb-{first}.png"), ("F", "thumb-F.png"), ("G", "thumb-G.png")]):
        im = Image.open(HERE / d / f).convert("RGB")
        x = PAD + c * (BW + GAP)
        out.paste(im.resize((BW, BH), Image.LANCZOS), (x, y))
        out.paste(im.resize((SW, SH), Image.LANCZOS), (x, y + BH + 10))
        draw.text((x + SW + 12, y + BH + 10 + 40), label + "  " + d, fill="#111827")
out.save(HERE / "thumb-v5-contact.png")
print(out.size)
