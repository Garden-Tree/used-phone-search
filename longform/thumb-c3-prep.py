"""サムネ C3（thumb-n2-edge.tsx の「2026-11-07-pixel-C3a/b」）の下ごしらえ。  python longform/thumb-c3-prep.py [cut|layer|check]（cv2 がユーザーの site-packages にあるので -I は付けない）
cut  : commons/pixel8a-front-hand.jpg → commons/pixel8a-front-cut.png（端末だけ・透過）
       手は端末の下半分にかかっている（親指は左の縁 y≈1470〜・指は右の縁 y≈1550〜）ので、手より上（y < CUT_Y）だけを使う。
       暗い画素（端末の黒い縁）のいちばん大きいかたまり → 凸包 → 周方向にならす → 内側へ 2px → 4倍で描いて縮小 → 縁 3px の色を内側の色で置き換え。
       下の切り口はまっすぐなので、サムネでは画像の下の端（y=720）より下に出して見せない
layer: assets/n2-layers/pixel-c3a.png・pixel-c3b.png（1280x720 の透過 PNG・落ち影つき）。切り口が y=720 より下にあるかを確かめる
check: .claude/tmp/c3-cut-check.png（赤・黄・紺の地に置いた確認画像と角の拡大）
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
COMMONS = HERE / "assets" / "commons"
SRC = COMMONS / "pixel8a-front-hand.jpg"
CUT = COMMONS / "pixel8a-front-cut.png"
CUT_Y = 1430  # これより下は手がかかる（元画像の y）
# 端末の中心 x, 上の端 y, 幅, 傾き（度・時計回りが正）
PLACE = {"pixel-c3a": (1166, 285, 560, 4), "pixel-c3b": (1158, 252, 600, 3)}


def smooth_closed(pts, sigma):
    n = len(pts); k = int(sigma * 4) | 1
    g = cv2.getGaussianKernel(k, sigma).ravel()
    out = np.empty_like(pts)
    for c in range(2):
        v = np.r_[pts[-k:, c], pts[:, c], pts[:k, c]]
        out[:, c] = np.convolve(v, g, mode="same")[k:k + n]
    return out


def resample(pts, n):
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(np.r_[pts, pts[:1]], axis=0), axis=1))]
    t = np.linspace(0, d[-1], n, endpoint=False)
    return np.c_[np.interp(t, d, np.r_[pts[:, 0], pts[0, 0]]), np.interp(t, d, np.r_[pts[:, 1], pts[0, 1]])]


def cut():
    rgb = np.asarray(Image.open(SRC).convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    b = (gray < 110).astype(np.uint8) * 255
    b[CUT_Y + 40:] = 0  # 凸包が切り口の少し下まで届くように 40px 余分に取り、あとで CUT_Y で切る
    b = cv2.morphologyEx(b, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    cs, _ = cv2.findContours(b, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    hull = cv2.convexHull(c).reshape(-1, 2).astype(np.float64)
    pts = smooth_closed(resample(hull, 1600), 3)
    x0, y0, w, h = cv2.boundingRect(pts.astype(np.float32))
    print("輪郭", x0, y0, w, h)
    S = 4
    big = np.zeros((rgb.shape[0] * S, rgb.shape[1] * S), np.uint8)
    cv2.fillPoly(big, [np.round(pts * S).astype(np.int32)], 255, lineType=cv2.LINE_AA)
    big = cv2.erode(big, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * 2 * S + 1, 2 * 2 * S + 1)))
    alpha = cv2.resize(big, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_AREA)
    alpha[CUT_Y:] = 0
    core = (alpha > 250).astype(np.uint8)
    inner = cv2.erode(core, np.ones((7, 7), np.uint8))
    _, lab = cv2.distanceTransformWithLabels(1 - inner, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(inner)
    lut = np.zeros((lab.max() + 1, 3), np.uint8)
    lut[lab[ys, xs]] = rgb[ys, xs]
    fixed = rgb.copy()
    ring = (alpha > 0) & (inner == 0)
    fixed[ring] = lut[lab[ring]]
    rgba = Image.fromarray(np.dstack([fixed, alpha]), "RGBA")
    rgba = rgba.crop(rgba.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    rgba.save(CUT); print(CUT.name, rgba.size)


def with_shadow(layer, im, x, y):
    a = Image.new("L", layer.size, 0); a.paste(im.getchannel("A"), (x, y))
    for dx, dy, blur, k in ((14, 20, 26, 0.55), (3, 5, 5, 0.40)):
        sh = Image.new("L", layer.size, 0); sh.paste(a, (dx, dy))
        sh = sh.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * k))
        layer.alpha_composite(Image.merge("RGBA", (Image.new("L", layer.size, 0),) * 3 + (sh,)))
    layer.alpha_composite(im, (x, y))


def layer():
    out = HERE / "assets" / "n2-layers"; out.mkdir(exist_ok=True)
    src = Image.open(CUT).convert("RGBA")
    for name, (cx, top, w, rot) in PLACE.items():
        im = src.resize((w * 2, round(src.height * w * 2 / src.width)), Image.LANCZOS)
        h = im.height // 2
        im = im.rotate(-rot, Image.BICUBIC, expand=True)
        im = im.resize((round(im.width / 2), round(im.height / 2)), Image.LANCZOS)
        x, y = round(cx - im.width / 2), round(top + h / 2 - im.height / 2)
        # 切り口（下の辺）の両端が y=720 より下にあるか
        r = np.radians(rot); hw, hh = w / 2, h / 2
        ends = [(cx + dx * np.cos(r) - hh * np.sin(r), top + hh + dx * np.sin(r) + hh * np.cos(r)) for dx in (-hw, hw)]
        L = Image.new("RGBA", (1280, 720), (0, 0, 0, 0)); with_shadow(L, im, x, y)
        L.save(out / f"{name}.png")
        print(name, "x", x, "-", x + im.width, "y", y, "-", y + im.height, "切り口の両端の y", [round(e[1]) for e in ends], "OK" if min(e[1] for e in ends) > 724 else "見える!")


def check():
    im = Image.open(CUT).convert("RGBA"); im = im.resize((560, round(im.height * 560 / im.width)), Image.LANCZOS)
    sheet = Image.new("RGB", (im.width * 3 + 80 + 600, im.height + 60), (40, 40, 44))
    for i, c in enumerate([(225, 29, 29), (255, 225, 0), (21, 10, 38)]):
        bg = Image.new("RGBA", im.size, c + (255,)); bg.alpha_composite(im)
        sheet.paste(bg.convert("RGB"), (20 + i * (im.width + 20), 30))
    big = Image.open(CUT).convert("RGBA")
    bg = Image.new("RGBA", big.size, (225, 29, 29, 255)); bg.alpha_composite(big)
    z = bg.crop((0, 0, 300, 300)).resize((600, 600), Image.NEAREST)
    sheet.paste(z.convert("RGB"), (im.width * 3 + 70, 30))
    p = HERE.parent / ".claude" / "tmp" / "c3-cut-check.png"; p.parent.mkdir(exist_ok=True); sheet.save(p); print(p)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("cut", "all"): cut()
    if what in ("layer", "all"): layer()
    if what in ("check", "all"): check()
