"""サムネ第10弾・b 組（thumb-v10-b.tsx）の下ごしらえ。  python -I longform/thumb-v10-b-prep.py [layers|contact]（引数なし＝両方）
PIL だけ（rembg などの重い処理は無い。切り抜きは thumb-v8-prep.py が作った *-cut2.png をそのまま使う）

1. layers : 端末を最終の大きさ・傾きで置いて、やわらかい落ち影を焼き込んだ 1280x720 の透過 PNG
            → assets/v10-b-layers/<フォルダ>.png（thumb-v10-b.tsx が地と文字のあいだに敷く。置き場所は下の LAYERS）
            ＋ 左右を返した写真 assets/v10-b-layers/pexels-3295213-flip.jpg（腕を右下へ逃がす。前面・画面は黒でロゴも文字も無い）
2. contact: 一覧 longform/thumb-v10-b-contact.png（1行に「いまの thumbnail.png・新しい thumb-N.png」、その下に 168x94）
"""
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

HERE = Path(__file__).resolve().parent
ASSETS = HERE / "assets"
OUT = ASSETS / "v10-b-layers"

CUT = {
    "iphone13-red": ASSETS / "stock-photo" / "iphone13-red-cut2.png",
    "iphone13-starlight": ASSETS / "stock-photo" / "iphone13-starlight-cut2.png",
    "iphone14-blue": ASSETS / "stock-photo" / "iphone14-blue-cut2.png",
}
# (名前, 端末の中心 x, 上の端 y, 高さ, 傾き（度・時計回りが正）)。**文字の位置を変えたら重ならないか確かめる**
LAYERS = {
    "2026-11-05-sell-swap": [("iphone13-red", 968, 206, 480, -4), ("iphone14-blue", 1146, 206, 480, 4)],
    "2026-10-31-rakuten-mobile": [("iphone14-blue", 1130, 196, 490, 5)],
}
DIRS = ["2026-10-25-pro-or-standard", "2026-10-23-iphone-priority", "2026-11-05-sell-swap", "2026-10-31-rakuten-mobile", "2026-11-03-duo-vs-mini"]


def with_shadow(layer: Image.Image, im: Image.Image, x: int, y: int) -> None:
    """やわらかい落ち影（右下へ・大きくぼかす）＋きわの細い影 → その上に端末（thumb-v8-prep.py と同じ）"""
    a = Image.new("L", layer.size, 0); a.paste(im.getchannel("A"), (x, y))
    for dx, dy, blur, k in ((14, 20, 26, 0.50), (3, 5, 5, 0.38)):
        sh = Image.new("L", layer.size, 0); sh.paste(a, (dx, dy))
        sh = sh.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * k))
        layer.alpha_composite(Image.merge("RGBA", (Image.new("L", layer.size, 0),) * 3 + (sh,)))
    layer.alpha_composite(im, (x, y))


def layers() -> None:
    OUT.mkdir(exist_ok=True)
    for key, items in LAYERS.items():
        layer = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
        for name, cx, top, h, rot in items:
            im = Image.open(CUT[name]).convert("RGBA")
            w2, h2 = round(im.width * h * 2 / im.height), h * 2  # 2倍で縮めてから回し、最後に半分に
            im = im.resize((w2, h2), Image.LANCZOS)
            if rot:
                im = im.rotate(-rot, Image.BICUBIC, expand=True)
            im = im.resize((round(im.width / 2), round(im.height / 2)), Image.LANCZOS)
            x, y = round(cx - im.width / 2), round(top + h / 2 - im.height / 2)
            with_shadow(layer, im, x, y)
            print(f"  {name}: x {x}〜{x + im.width} y {y}〜{y + im.height}")
        layer.save(OUT / f"{key}.png")
        print("layer", key)
    ImageOps.mirror(Image.open(ASSETS / "stock-photo" / "pexels-3295213.jpg").convert("RGB")).save(OUT / "pexels-3295213-flip.jpg", quality=92)
    print("flip pexels-3295213")


def contact() -> None:
    BW, BH, SW, SH, GAP = 640, 360, 168, 94, 16
    ROW = BH + GAP + SH + GAP * 2
    sheet = Image.new("RGB", (GAP + (BW + GAP) * 2, GAP + ROW * len(DIRS)), "#DDDDDD")
    for r, d in enumerate(DIRS):
        for c, name in enumerate(["thumbnail.png", "thumb-N.png"]):
            im = Image.open(HERE / d / name).convert("RGB")
            x, y = GAP + c * (BW + GAP), GAP + r * ROW
            sheet.paste(im.resize((BW, BH), Image.LANCZOS), (x, y))
            sheet.paste(im.resize((SW, SH), Image.LANCZOS), (x, y + BH + GAP))
    sheet.save(HERE / "thumb-v10-b-contact.png")
    print("→ longform/thumb-v10-b-contact.png", sheet.size)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("layers", "all"): layers()
    if what in ("contact", "all"): contact()
