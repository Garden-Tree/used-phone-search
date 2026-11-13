"""サムネ第13弾（thumb-v13-imakai.tsx）「◯◯ 今買い？」の端末の層と一覧。  python -I longform/thumb-v13-imakai-prep.py [layers|contact]
（切り抜き済みの *-cut2.png を置くだけ。rembg は使わない＝軽い）
layers : assets/v13-layers/<機種>-<幅>.png（1280x720 の透過 PNG・落ち影つき）
contact: longform/thumb-v13-contact.png（上段 13・下段 16。いまの N・Q1〜Q4 と、その 168x94）
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
STOCK = HERE / "assets" / "stock-photo"
COMMONS = HERE / "assets" / "commons"

# (切り抜き, 端末の中心 x, 上の端 y, 高さ, 傾き（度・時計回りが正）)。先に書いたものが奥
LAYERS = {
    # wide: 文字は x 〜890 まで（型1・3・4）
    "13-wide": [(STOCK / "iphone13-blue-cut2.png", 1020, 28, 414, -3), (STOCK / "iphone13-starlight-cut2.png", 1090, 142, 414, 0), (STOCK / "iphone13-red-cut2.png", 1160, 256, 414, 3)],
    "16-wide": [(COMMONS / "iphone16-ultramarine-cut2.png", 1088, 54, 610, 2)],
    # narrow: ○△を置くので端末は x 1000〜（型2）
    "13-narrow": [(STOCK / "iphone13-starlight-cut2.png", 1118, 40, 420, -2), (STOCK / "iphone13-red-cut2.png", 1166, 250, 420, 2)],
    "16-narrow": [(COMMONS / "iphone16-ultramarine-cut2.png", 1138, 130, 440, 2)],
}


def with_shadow(layer, im, x, y):
    """やわらかい落ち影＋きわの細い影 → その上に端末（thumb-v8-prep.py と同じ）"""
    a = Image.new("L", layer.size, 0); a.paste(im.getchannel("A"), (x, y))
    for dx, dy, blur, k in ((14, 20, 26, 0.50), (3, 5, 5, 0.38)):
        sh = Image.new("L", layer.size, 0); sh.paste(a, (dx, dy))
        sh = sh.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * k))
        layer.alpha_composite(Image.merge("RGBA", (Image.new("L", layer.size, 0),) * 3 + (sh,)))
    layer.alpha_composite(im, (x, y))


def layers():
    out = HERE / "assets" / "v13-layers"; out.mkdir(exist_ok=True)
    for key, items in LAYERS.items():
        layer = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
        for path, cx, top, h, rot in items:
            im = Image.open(path).convert("RGBA")
            im = im.resize((round(im.width * h * 2 / im.height), h * 2), Image.LANCZOS)  # 2倍で回して半分に
            if rot:
                im = im.rotate(-rot, Image.BICUBIC, expand=True)
            im = im.resize((round(im.width / 2), round(im.height / 2)), Image.LANCZOS)
            x, y = round(cx - im.width / 2), round(top + h / 2 - im.height / 2)
            with_shadow(layer, im, x, y)
            print(key, path.name, "x", x, "-", x + im.width, "y", y, "-", y + im.height)
        layer.save(out / f"{key}.png")


def contact():
    CW, CH, GAP, SW, SH, LH = 480, 270, 14, 168, 94, 30
    rows = [("2026-11-14-iphone13", "13"), ("2026-11-20-iphone16", "16")]
    cols = [("thumb-N.png", "いまの N"), ("thumb-Q1.png", "型1 問い＋数字の札"), ("thumb-Q2.png", "型2 問い＋答えの印"), ("thumb-Q3.png", "型3 数字だけ大きく"), ("thumb-Q4.png", "型4 言い切り")]
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/meiryob.ttc", 20)
    except OSError:
        font = ImageFont.load_default()
    rh = LH + CH + GAP + SH + GAP * 2
    sheet = Image.new("RGB", (GAP + (CW + GAP) * len(cols), GAP + rh * len(rows)), (40, 40, 44))
    d = ImageDraw.Draw(sheet)
    for r, (folder, model) in enumerate(rows):
        for c, (n, label) in enumerate(cols):
            im = Image.open(HERE / folder / n).convert("RGB"); x = GAP + c * (CW + GAP); y = GAP + r * rh
            d.text((x, y), f"{model}: {label}", fill=(230, 230, 230), font=font)
            sheet.paste(im.resize((CW, CH), Image.LANCZOS), (x, y + LH))
            sheet.paste(im.resize((SW, SH), Image.LANCZOS), (x, y + LH + CH + GAP))
    sheet.save(HERE / "thumb-v13-contact.png"); print("longform/thumb-v13-contact.png")


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "layers"
    layers() if what == "layers" else contact()
