"""サムネ第7弾（thumb-v7.tsx）の写真の下ごしらえ。 python -I longform/thumb-v7-prep.py
- iphone13-tora.jpg（箱の上に斜めに置いた背面）→ 背面の四隅を正面に引き伸ばして角丸で切り抜く → iphone13-tora-flat.png
- iphone-se3-red-back.jpg（正面から撮った背面）→ 角丸の四角で切り抜く → iphone-se3-red-back-cut.png
ほかの *-cut.png は以前 rembg で切り抜いたもの（assets/photos/ から写した）"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent / "assets" / "commons"

def rounded(im: Image.Image, radius: int) -> Image.Image:
    s = 4
    m = Image.new("L", (im.width * s, im.height * s), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width * s - 1, im.height * s - 1], radius * s, fill=255)
    im = im.convert("RGBA"); im.putalpha(m.resize(im.size, Image.LANCZOS))
    return im

# iPhone 13: 背面ガラスの四隅（1920x1440 の写真の座標。辺をのばした交点）→ 71.5 x 146.7mm の比
W, H = 720, 1477
src = np.float32([[1122, 55], [1642, 341], [509, 1118], [73, 731]])  # カメラ側の上・上の反対・下の反対・下
dst = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
# PIL の PERSPECTIVE は「出力の座標 → 元の座標」の係数 8つ
A = []
for (x, y), (u, v) in zip(dst, src):
    A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
coef = np.linalg.solve(np.float64(A), np.float64(src).reshape(8))
flat = Image.open(HERE / "iphone13-tora.jpg").convert("RGB").transform((W, H), Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
flat = flat.crop((12, 0, W - 4, H - 12))  # 左と下に写り込んだ背景・箱を落とす
rounded(flat, 116).save(HERE / "iphone13-tora-flat.png")

# iPhone SE 第3世代: 端末の外形（x160〜893・y120〜1627）
se = Image.open(HERE / "iphone-se3-red-back.jpg").convert("RGB").crop((163, 122, 891, 1625))
rounded(se, 112).save(HERE / "iphone-se3-red-back-cut.png")
print("ok")

# 白いふちと影を付けた「ステッカー」（高さ 900px。satori は透過画像に影を付けられないので先に焼き込む）→ *-st.png
def sticker(name: str, out: str, h: int = 900, stroke: int = 9, pad: int = 40) -> None:
    im = Image.open(HERE / name).convert("RGBA")
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    a = im.getchannel("A").point(lambda v: 255 if v > 200 else 0).filter(ImageFilter.MinFilter(3))  # 切り抜きの端の半透明（背景の色が残る）を1px削る
    im.putalpha(a.filter(ImageFilter.GaussianBlur(0.8)))
    canvas = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    big = Image.new("L", canvas.size, 0); big.paste(a, (pad, pad))
    ring = big.filter(ImageFilter.MaxFilter(stroke * 2 + 1)).filter(ImageFilter.GaussianBlur(1.2))
    shadow = Image.new("L", canvas.size, 0); shadow.paste(ring, (10, 14))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12)).point(lambda v: int(v * 0.55))
    canvas.paste(Image.new("RGBA", canvas.size, (0, 0, 0, 255)), (0, 0), shadow)
    canvas.paste(Image.new("RGBA", canvas.size, (255, 255, 255, 255)), (0, 0), ring)
    canvas.alpha_composite(im, (pad, pad))
    canvas.save(HERE / out)

for src_name in ["iphone-se3-red-back-cut", "iphone13-tora-flat", "iphone14-red-cut", "iphone15-pd-single-cut", "iphone16-ultramarine-cut"]:
    sticker(src_name + ".png", src_name.replace("-cut", "").replace("-flat", "") + "-st.png")
print("stickers ok")
