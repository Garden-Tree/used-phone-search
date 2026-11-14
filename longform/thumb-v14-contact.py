"""サムネ第14弾（thumb-v14-finding.tsx）の一覧と検査。  python -I longform/thumb-v14-contact.py [<文字だけの画像のフォルダ>]
一覧: longform/thumb-v14-contact.png（上段 13・下段 16。いまの Q1 と R1・R2 を 640x360、その下に 168x94）
検査: `npx tsx longform/thumb-v14-finding.tsx --check <dir>` の文字だけの画像から、端からの余白・右下・端末との重なりを測る
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROWS = [("2026-11-14-iphone13", "13"), ("2026-11-20-iphone16", "16")]
COLS = [("thumb-Q1.png", "いまの Q1"), ("thumb-R1.png", "R1"), ("thumb-R2.png", "R2")]
DEVICE = {"13-R1": "13-narrow", "13-R2": "13-wide", "16-R1": "16-wide", "16-R2": "16-narrow"}


def contact():
    CW, CH, GAP, SW, SH, LH = 640, 360, 16, 168, 94, 32
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/meiryob.ttc", 22)
    except OSError:
        font = ImageFont.load_default()
    rh = LH + CH + GAP + SH + GAP * 2
    sheet = Image.new("RGB", (GAP + (CW + GAP) * len(COLS), GAP + rh * len(ROWS)), (40, 40, 44))
    d = ImageDraw.Draw(sheet)
    for r, (folder, model) in enumerate(ROWS):
        for c, (n, label) in enumerate(COLS):
            im = Image.open(HERE / folder / n).convert("RGB"); x = GAP + c * (CW + GAP); y = GAP + r * rh
            d.text((x, y), f"{model}: {label}", fill=(230, 230, 230), font=font)
            sheet.paste(im.resize((CW, CH), Image.LANCZOS), (x, y + LH))
            sheet.paste(im.resize((SW, SH), Image.LANCZOS), (x, y + LH + CH + GAP))
    sheet.save(HERE / "thumb-v14-contact.png"); print("longform/thumb-v14-contact.png")


def check(folder):
    for key, layer in DEVICE.items():
        text = Image.open(Path(folder) / f"{key}.png").convert("RGB")
        ink = text.convert("L").point(lambda v: 255 if v > 24 else 0)  # 文字と札（黒いふちは数えない＝字面）
        # ふちも含めた範囲: 黒地に黒ふちは見えないので、字面の箱にふちの太さ 11px を足して読む
        l, t, r, b = ink.getbbox()
        dev = Image.open(HERE / "assets" / "v13-layers" / f"{layer}.png").getchannel("A").point(lambda v: 255 if v > 200 else 0)
        dl = dev.getbbox()
        both = Image.new("L", ink.size, 0); both.paste(ink, mask=dev)
        over = sum(1 for v in both.getdata() if v)
        corner = ink.crop((1030, 600, 1280, 720)).getbbox()
        # 行ごとの範囲（空の行で区切る）
        rows, start = [], None
        proj = [ink.crop((0, y, 1280, y + 1)).getbbox() for y in range(720)]
        for y, p in enumerate(proj + [None]):
            if p and start is None:
                start = y
            if not p and start is not None:
                bb = ink.crop((0, start, 1280, y)).getbbox(); rows.append((bb[0], start, bb[2], y)); start = None
        print(f"{key}: 字面 x {l}-{r} y {t}-{b}  余白 左{l} 上{t} 右{1280 - r} 下{720 - b}  端末({layer}) x {dl[0]}-{dl[2]} y {dl[1]}-{dl[3]}  端末と重なる画素 {over}  右下 {corner}")
        for bb in rows:
            print("   行", bb)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        check(sys.argv[1])
    contact()
