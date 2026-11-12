"""サムネ第11弾（thumb-v11-iphone13.tsx）の端末の層と一覧。  python -I longform/thumb-v11-iphone13-prep.py [layers|contact]
（切り抜き済みの *-cut2.png を置くだけ。rembg は使わない＝軽い）
layers : assets/v11-layers/<案>.png（1280x720 の透過 PNG・やわらかい落ち影つき。thumb-v11-iphone13.tsx が地と文字のあいだに敷く）
contact: longform/thumb-v11-contact.png（N・N2 と、その 168x94）
"""
import sys
from pathlib import Path
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
CUT = HERE / "assets" / "stock-photo"
DIR = HERE / "2026-11-14-iphone13"

# (名前, 端末の中心 x, 上の端 y, 高さ, 傾き（度・時計回りが正）)。先に書いたものが奥
LAYERS = {
    # N: 右の列に3色をななめに重ねる（奥の2台もカメラが見える）
    "N": [("iphone13-blue", 1020, 28, 414, -3), ("iphone13-starlight", 1090, 142, 414, 0), ("iphone13-red", 1160, 256, 414, 3)],
    # N2: 右上に3色を横に並べる（下の帯は主役の文字）
    "N2": [("iphone13-blue", 884, 18, 424, -3), ("iphone13-starlight", 1018, 18, 424, 0), ("iphone13-red", 1152, 18, 424, 3)],
}


def with_shadow(layer, im, x, y):
    """やわらかい落ち影（右下へ・大きくぼかす）＋きわの細い影 → その上に端末（thumb-v8-prep.py と同じ）"""
    a = Image.new("L", layer.size, 0); a.paste(im.getchannel("A"), (x, y))
    for dx, dy, blur, k in ((14, 20, 26, 0.50), (3, 5, 5, 0.38)):
        sh = Image.new("L", layer.size, 0); sh.paste(a, (dx, dy))
        sh = sh.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * k))
        layer.alpha_composite(Image.merge("RGBA", (Image.new("L", layer.size, 0),) * 3 + (sh,)))
    layer.alpha_composite(im, (x, y))


def layers():
    out = HERE / "assets" / "v11-layers"; out.mkdir(exist_ok=True)
    for key, items in LAYERS.items():
        layer = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
        for name, cx, top, h, rot in items:
            im = Image.open(CUT / f"{name}-cut2.png").convert("RGBA")
            im = im.resize((round(im.width * h * 2 / im.height), h * 2), Image.LANCZOS)  # 2倍で回して半分に（ぎざぎざを消す）
            if rot:
                im = im.rotate(-rot, Image.BICUBIC, expand=True)
            im = im.resize((round(im.width / 2), round(im.height / 2)), Image.LANCZOS)
            x, y = round(cx - im.width / 2), round(top + h / 2 - im.height / 2)
            with_shadow(layer, im, x, y)
            print(key, name, "x", x, "-", x + im.width, "y", y, "-", y + im.height)
        layer.save(out / f"{key}.png")


def contact():
    CW, CH, GAP, SW, SH = 640, 360, 16, 168, 94
    names = ["thumb-N.png", "thumb-N2.png"]
    sheet = Image.new("RGB", (GAP + (CW + GAP) * len(names), GAP * 3 + CH + SH), (40, 40, 44))
    for c, n in enumerate(names):
        im = Image.open(DIR / n).convert("RGB"); x = GAP + c * (CW + GAP)
        sheet.paste(im.resize((CW, CH), Image.LANCZOS), (x, GAP))
        sheet.paste(im.resize((SW, SH), Image.LANCZOS), (x, GAP * 2 + CH))
    sheet.save(HERE / "thumb-v11-contact.png"); print("longform/thumb-v11-contact.png")


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "layers"
    layers() if what == "layers" else contact()
