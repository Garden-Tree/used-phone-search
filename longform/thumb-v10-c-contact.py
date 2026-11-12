"""一覧 longform/thumb-v10-c-contact.png（いまの thumbnail.png・新しい thumb-N.png と、168x94 に縮めたもの）
   python -I longform/thumb-v10-c-contact.py"""
import os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__))
KEYS = ["2026-11-03-m1-air", "2026-11-01-mbp-vs-mba", "2026-10-31-mbp-proled", "2026-11-02-macbook", "2026-10-29-mbp-m6"]
W, H, G = 480, 270, 12
rowh = H + G + 94 + G * 2
S = Image.new("RGB", (G + (W + G) * 2, G + rowh * len(KEYS)), "#DDDDDD")
for r, k in enumerate(KEYS):
    for c, n in enumerate(["thumbnail.png", "thumb-N.png"]):
        im = Image.open(os.path.join(D, k, n)).convert("RGB")
        x, y = G + c * (W + G), G + r * rowh
        S.paste(im.resize((W, H), Image.LANCZOS), (x, y))
        S.paste(im.resize((168, 94), Image.LANCZOS), (x, y + H + G))
S.save(os.path.join(D, "thumb-v10-c-contact.png"))
