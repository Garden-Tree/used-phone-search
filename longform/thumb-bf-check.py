"""サムネ（thumb-bf-finding.tsx）の一覧と検査。  python -I longform/thumb-bf-check.py [<文字だけの画像のフォルダ>]
一覧: longform/2026-11-26-blackfriday/thumb-contact.png（R1〜R3 を 640x360 で横に並べ、その下に 168x94 とその 2倍拡大）
検査: `npx tsx longform/thumb-bf-finding.tsx --check <dir>` の文字だけの画像（黒ふちは灰色）から、端からの余白・右下（x1030〜・y600〜）・
      行の範囲（高さ）・端末の層（assets/bf-layers/）との重なり（端末の透明度 > 200 の画素と文字の画素）を数える
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
DIR = HERE / "2026-11-26-blackfriday"
NAMES = ["R1", "R2", "R3"]
LAYER = {"R1": "bf-bottom", "R2": "bf-bottom2", "R3": "bf-small"}


def contact():
    CW, CH, GAP, SW, SH, LH = 640, 360, 16, 168, 94, 32
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/meiryob.ttc", 22)
    except OSError:
        font = ImageFont.load_default()
    names = [n for n in NAMES if (DIR / f"thumb-{n}.png").exists()]
    sheet = Image.new("RGB", (GAP + (CW + GAP) * len(names), GAP + LH + CH + GAP + SH * 2 + GAP), (40, 40, 44))
    d = ImageDraw.Draw(sheet)
    for c, n in enumerate(names):
        im = Image.open(DIR / f"thumb-{n}.png").convert("RGB"); x = GAP + c * (CW + GAP); y = GAP
        d.text((x, y), f"thumb-{n}.png", fill=(230, 230, 230), font=font)
        sheet.paste(im.resize((CW, CH), Image.LANCZOS), (x, y + LH))
        small = im.resize((SW, SH), Image.LANCZOS)
        sheet.paste(small, (x, y + LH + CH + GAP))
        sheet.paste(small.resize((SW * 2, SH * 2), Image.LANCZOS), (x + SW + GAP, y + LH + CH + GAP))
    sheet.save(DIR / "thumb-contact.png"); print(DIR / "thumb-contact.png")


def check(folder):
    for n in NAMES:
        p = Path(folder) / f"{n}.png"
        if not p.exists():
            continue
        ink = Image.open(p).convert("L").point(lambda v: 255 if v > 24 else 0)
        l, t, r, b = ink.getbbox()
        corner = ink.crop((1030, 600, 1280, 720)).getbbox()
        dev = Image.open(HERE / "assets" / "bf-layers" / f"{LAYER[n]}.png").getchannel("A").point(lambda v: 255 if v > 200 else 0)
        both = Image.new("L", ink.size, 0); both.paste(ink, mask=dev)
        over = sum(1 for v in both.getdata() if v)
        ok = min(l, t, 1280 - r, 720 - b) >= 60 and corner is None and over == 0
        print(f"{n}: 文字 x {l}-{r} y {t}-{b}  余白 左{l} 上{t} 右{1280 - r} 下{720 - b}  右下 {corner}  端末と重なる画素 {over}  {'OK' if ok else 'NG'}")
        start = None
        for y in range(721):
            row = ink.crop((0, y, 1280, y + 1)).getbbox() if y < 720 else None
            if row and start is None:
                start = y
            if not row and start is not None:
                bb = ink.crop((0, start, 1280, y)).getbbox(); print(f"   行 x {bb[0]}-{bb[2]} y {start}-{y}（高さ {y - start}）"); start = None


if __name__ == "__main__":
    if len(sys.argv) > 1:
        check(sys.argv[1])
    contact()
