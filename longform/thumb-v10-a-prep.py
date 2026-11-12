"""横動画のサムネ・第10弾 a 組の下ごしらえ（2026-11-13）。軽い処理だけ（rembg は使わない）
  python -I longform/thumb-v10-a-prep.py
出力: longform/assets/v10-layers/
  a-monthly.png       … 1280x720 の透過。切り抜き済みの iPhone 13（赤）と iPhone 14（青）を最終の大きさで置き、落ち影を付けた層
  a-storage-flip.jpg  … pexels-3295213.jpg の左右反転（手が右下から出るように）
"""
import os
from PIL import Image, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets", "v10-layers")
os.makedirs(OUT, exist_ok=True)
W, H = 1280, 720

def place(canvas, path, height, angle, cx, cy):
    """切り抜き（透過 PNG）を height に縮め、angle 度まわして (cx, cy) を中心に、影つきで置く"""
    im = Image.open(path).convert("RGBA")
    w = round(im.width * height / im.height)
    im = im.resize((w, height), Image.LANCZOS).rotate(angle, resample=Image.BICUBIC, expand=True)
    x, y = round(cx - im.width / 2), round(cy - im.height / 2)
    alpha = im.getchannel("A")
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sh.paste((0, 0, 0, 120), (x + 10, y + 16), alpha)
    canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    canvas.alpha_composite(im, (x, y)) if x >= 0 and y >= 0 else canvas.paste(im, (x, y), im)
    print(f"  {os.path.basename(path)}: x {x}〜{x + im.width} / y {y}〜{y + im.height}")

# 2026-11-01-monthly: うしろに iPhone 13（赤）、手前に iPhone 14（青）。文字は x800 より左
c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
print("a-monthly.png")
place(c, os.path.join(HERE, "assets", "stock-photo", "iphone13-red-cut2.png"), 540, 6, 962, 322)
place(c, os.path.join(HERE, "assets", "stock-photo", "iphone14-blue-cut2.png"), 610, -4, 1100, 372)
c.save(os.path.join(OUT, "a-monthly.png"))

ImageOps.mirror(Image.open(os.path.join(HERE, "assets", "stock-photo", "pexels-3295213.jpg")).convert("RGB")).save(os.path.join(OUT, "a-storage-flip.jpg"), quality=92)
print("a-storage-flip.jpg")
