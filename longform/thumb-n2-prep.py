"""サムネ N2（thumb-n2-edge.tsx）の下ごしらえ。  python longform/thumb-n2-prep.py [cut|layer|check]（引数なし＝ぜんぶ）
（rembg がユーザーの site-packages にあるので -I は付けない。読むのは assets/ の画像だけ）

cut  : commons/iphone16promax-desert-rear.png → commons/iphone16promax-desert-cut2.png（端末だけ・透過・まっすぐに立てる・高さ 1500px）
       rembg（isnet-general-use）の大まかなマスク → いちばん大きい輪郭 → 凸包 → 周方向にならす → 内側へ 2px → 4倍で描いて縮小
       → 縁から 3px の色を内側の色で置き換える（にじみ取り）。白ふちは付けない
layer: assets/n2-layers/duo-16pm.png（1280x720 の透過 PNG・落ち影つき）
check: .claude/tmp/n2-cut-check.png（赤・黄・紺の地に置いた確認画像）
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
COMMONS = HERE / "assets" / "commons"
SRC = COMMONS / "iphone16promax-desert-rear.png"
CUT = COMMONS / "iphone16promax-desert-cut2.png"
# 端末の中心 x, 上の端 y, 高さ, 傾き（度・時計回りが正）
PLACE = (1088, 80, 570, 4)
ROT_FIX = -12.0  # PIL の rotate（反時計回りが正）に渡す角度。cut の結果を check で見て決めた


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
    from rembg import new_session, remove
    im = Image.open(SRC).convert("RGB")
    rgb = np.asarray(im)
    m = np.asarray(remove(im, session=new_session("isnet-general-use"), only_mask=True))
    _, b = cv2.threshold(m, 127, 255, cv2.THRESH_BINARY)
    cs, _ = cv2.findContours(b, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    hull = cv2.convexHull(c).reshape(-1, 2).astype(np.float64)
    pts = smooth_closed(resample(hull, 1600), 4)
    # 傾き: 最小外接長方形の角度 → まっすぐに立てる
    (cx, cy), (w, h), ang = cv2.minAreaRect(pts.astype(np.float32))
    if w > h:
        ang -= 90
    print("輪郭", round(w), "x", round(h), "傾き", round(ang, 2))
    # 斜めから撮った写真で左右の辺の傾きが違う（左 約7°・右 約16°）。正面化はせず、左右が対称の台形になる 12° だけ回す
    ang = ROT_FIX
    # 4倍で塗る → 内側へ 2px（元の画素で）
    S = 4
    big = np.zeros((rgb.shape[0] * S, rgb.shape[1] * S), np.uint8)
    cv2.fillPoly(big, [np.round(pts * S).astype(np.int32)], 255, lineType=cv2.LINE_AA)
    big = cv2.erode(big, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * 2 * S + 1, 2 * 2 * S + 1)))
    alpha = cv2.resize(big, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_AREA)
    # にじみ取り: 縁から 3px の色を、内側（さらに 3px 内側）のいちばん近い画素の色に
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
    # まっすぐに立てて、端末の箱で切る
    rgba = rgba.rotate(ang, Image.BICUBIC, expand=True, center=(cx, cy))
    rgba = rgba.crop(rgba.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    rgba = rgba.resize((round(rgba.width * 1500 / rgba.height), 1500), Image.LANCZOS)
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
    cx, top, h, rot = PLACE
    im = Image.open(CUT).convert("RGBA")
    im = im.resize((round(im.width * h * 2 / im.height), h * 2), Image.LANCZOS)
    im = im.rotate(-rot, Image.BICUBIC, expand=True)
    im = im.resize((round(im.width / 2), round(im.height / 2)), Image.LANCZOS)
    x, y = round(cx - im.width / 2), round(top + h / 2 - im.height / 2)
    L = Image.new("RGBA", (1280, 720), (0, 0, 0, 0)); with_shadow(L, im, x, y)
    L.save(out / "duo-16pm.png"); print("duo-16pm x", x, "-", x + im.width, "y", y, "-", y + im.height)


def check():
    im = Image.open(CUT).convert("RGBA"); im = im.resize((round(im.width * 700 / im.height), 700), Image.LANCZOS)
    sheet = Image.new("RGB", (im.width * 3 + 80 + 600, 760), (40, 40, 44))
    for i, c in enumerate([(225, 29, 29), (255, 225, 0), (21, 10, 38)]):
        bg = Image.new("RGBA", im.size, c + (255,)); bg.alpha_composite(im)
        sheet.paste(bg.convert("RGB"), (20 + i * (im.width + 20), 30))
    # 右上の角を 3倍
    bg = Image.new("RGBA", im.size, (21, 10, 38, 255)); bg.alpha_composite(im)
    z = bg.crop((im.width - 200, 0, im.width, 200)).resize((600, 600), Image.NEAREST)
    sheet.paste(z.convert("RGB"), (im.width * 3 + 70, 30))
    p = HERE.parent / ".claude" / "tmp" / "n2-cut-check.png"; sheet.save(p); print(p)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("cut", "all"): cut()
    if what in ("layer", "all"): layer()
    if what in ("check", "all"): check()
