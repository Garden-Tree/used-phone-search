"""「中古iPhone 12は今買い？」のサムネの写真の下ごしらえ。  python longform/2026-11-21-iphone12/thumb-prep.py [cut|layer|contact|series]（引数なし＝ぜんぶ）
（rembg・cv2 がユーザーの site-packages にあるので -I は付けない。読むのは assets/ の画像だけ）

cut    : assets/stock-photo/unsplash-IegLpS8Eay8-iphone12-purple.jpg（Thai Nguyen・Unsplash License。SOURCES.md）
         → 端末だけの透過 PNG assets/stock-photo/iphone12-purple-cut2.png（高さ 1500px）
         切り抜きの本体は thumb-v8-prep.py（縁へ寄せる・角丸の板を当てはめる・defringe）。
         指は端末のうしろにあり、rembg だと手ごと拾うので、大まかなマスクだけ色（ラベンダー＝青が緑より強い）で作る
layer  : assets/v13-layers/12-wide.png（1280x720・落ち影つき。13・16 の wide と同じ作り＝thumb-v13-imakai-prep.py）
         → このあと npx tsx longform/2026-11-21-iphone12/thumb.tsx
contact: thumb-contact.png（A・B の 640x360 と 168x94）
series : thumb-series.png（13・16・12 を並べる。上 427x240・下 168x94）
"""
import importlib.util
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
LONG = HERE.parent
STOCK = LONG / "assets" / "stock-photo"


def load(name: str):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), LONG / f"{name}.py")
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod


def color_mask(rgb: np.ndarray, _grabcut: bool = False) -> np.ndarray:
    """ラベンダーの背面と紫の側面（B が G より強い）。肌・木・灰色の背景は落ちる。レンズとリンゴの穴は外側の輪郭で埋まる"""
    f = cv2.GaussianBlur(rgb, (0, 0), 2).astype(np.int16)
    m = ((f[..., 2] - f[..., 1] > 26) & (f[..., 2] > f[..., 0])).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(m); cv2.drawContours(out, [max(cs, key=cv2.contourArea)], -1, 255, -1)
    return out


def cut():
    v8 = load("thumb-v8-prep")
    v8.PHOTOS["iphone12-purple"] = ("stock-photo/unsplash-IegLpS8Eay8-iphone12-purple.jpg", (1250, 420, 2850, 3060), 0.5, "stock-photo")
    v8.SIZE_MM["iphone12"] = (71.5, 146.7)  # 公式の幅・高さ（当てはめる板の縦横比）
    v8.rough_mask = color_mask
    v8.cut("iphone12-purple")


def layer():
    v13 = load("thumb-v13-imakai-prep")
    # 16-wide と同じ置き方（1台・少し右へ傾ける）。文字は x 〜890 まで
    v13.LAYERS.clear()
    v13.LAYERS["12-wide"] = [(STOCK / "iphone12-purple-cut2.png", 1092, 54, 610, 2)]
    v13.layers()


def font(size: int):
    try:
        return ImageFont.truetype("C:/Windows/Fonts/meiryob.ttc", size)
    except OSError:
        return ImageFont.load_default()


def sheet(items, cw: int, ch: int, out: Path):
    GAP, SW, SH, LH = 14, 168, 94, 30
    im = Image.new("RGB", (GAP + (cw + GAP) * len(items), GAP + LH + ch + GAP + SH + GAP), (40, 40, 44))
    d = ImageDraw.Draw(im)
    for i, (path, label) in enumerate(items):
        t = Image.open(path).convert("RGB"); x = GAP + i * (cw + GAP)
        d.text((x, GAP), label, fill=(230, 230, 230), font=font(20))
        im.paste(t.resize((cw, ch), Image.LANCZOS), (x, GAP + LH))
        im.paste(t.resize((SW, SH), Image.LANCZOS), (x, GAP + LH + ch + GAP))
    im.save(out); print(out)


def contact():
    sheet([(HERE / "thumb-A.png", "A 相場の札"), (HERE / "thumb-B.png", "B 修理の赤札（決定）")], 640, 360, HERE / "thumb-contact.png")


def series():
    sheet([(LONG / "2026-11-14-iphone13" / "thumbnail.png", "13（11/14）"), (LONG / "2026-11-20-iphone16" / "thumbnail.png", "16（11/20）"), (HERE / "thumb-B.png", "12（11/21）B 案")], 427, 240, HERE / "thumb-series.png")


if __name__ == "__main__":
    what = sys.argv[1:] or ["cut", "layer"]
    for w in what:
        {"cut": cut, "layer": layer, "contact": contact, "series": series}[w]()
