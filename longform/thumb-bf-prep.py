"""横動画 2026-11-26-blackfriday のサムネ（thumb-bf-finding.tsx）の下ごしらえ。
  python longform/thumb-bf-prep.py [cut|layer|check] [層の名前...]（rembg・cv2 がユーザーの site-packages にあるので -I は付けない。読むのは assets/ の画像だけ）
写真: assets/stock-photo/pixel10a-berry-box-unsplash.jpg（3000x2000）
      Unsplash「Google pixel 10a box with a smartphone」Gavin Phillips・Unsplash License https://unsplash.com/photos/QihL97z4oZ8
      机に置いた Pixel 10a（Berry）の上半分を斜め上から。奥に「Google Pixel 10a」の箱
cut  : → assets/stock-photo/pixel10a-berry-cut.png（端末だけ・透過）と pixel10a-berry-cutline.png（写真の下の端＝切り口の印）
       rembg（isnet-general-use）のマスク → いちばん大きい輪郭 → 凸包 → 周方向にならす → 内側へ 2px → 4倍で描いて縮小 → 縁 3px の色を内側の色で置き換え。
       端末は写真の下の端で切れている（左・右・上は端末の本当の縁）ので、サムネでは切り口を画像の外（下か右）に出して見せない
layer: assets/bf-layers/<名前>.png（1280x720 の透過・落ち影つき）。切り口がキャンバスの中に残っていないかを数える
check: .claude/tmp/bf-cut-check.png（暗い地・黄の地に置いた切り抜きと角の拡大）
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
STOCK = HERE / "assets" / "stock-photo"
SRC = STOCK / "pixel10a-berry-box-unsplash.jpg"
CUT = STOCK / "pixel10a-berry-cut.png"
CUTLINE = STOCK / "pixel10a-berry-cutline.png"
# 名前: (切り抜きの幅 px, 回す角度（度・反時計回りが正）, 回したあとの左上 x, y)
PLACE = {"bf-bottom": (1000, 0, 300, 440), "bf-bottom2": (1000, 0, 360, 400), "bf-small": (700, 0, 680, 470)}
ONLY = sys.argv[2:]


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
    H, W = rgb.shape[:2]
    m = np.asarray(remove(im, session=new_session("isnet-general-use"), only_mask=True))
    _, b = cv2.threshold(m, 127, 255, cv2.THRESH_BINARY)
    cs, _ = cv2.findContours(b, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    hull = cv2.convexHull(c).reshape(-1, 2).astype(np.float64)
    pts = smooth_closed(resample(hull, 2000), 4)
    print("輪郭", cv2.boundingRect(pts.astype(np.float32)))
    S = 4
    big = np.zeros((H * S, W * S), np.uint8)
    cv2.fillPoly(big, [np.round(pts * S).astype(np.int32)], 255, lineType=cv2.LINE_AA)
    big = cv2.erode(big, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * 2 * S + 1, 2 * 2 * S + 1)))
    alpha = cv2.resize(big, (W, H), interpolation=cv2.INTER_AREA)
    # 写真の下の端（切り口）までは不透明に戻す（erode で下の端が 2px 透けるのを防ぐ）
    col = alpha[H - 8] > 0
    alpha[H - 8:, col] = np.maximum(alpha[H - 8:, col], alpha[H - 8, col])
    core = (alpha > 250).astype(np.uint8)
    inner = cv2.erode(core, np.ones((7, 7), np.uint8))
    _, lab = cv2.distanceTransformWithLabels(1 - inner, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(inner)
    lut = np.zeros((lab.max() + 1, 3), np.uint8)
    lut[lab[ys, xs]] = rgb[ys, xs]
    fixed = rgb.copy()
    ring = (alpha > 0) & (inner == 0)
    fixed[ring] = lut[lab[ring]]
    # 切り口の印: 写真の下の端から 6px 以内で端末にかかる画素
    line = np.zeros_like(alpha); line[H - 6:] = (alpha[H - 6:] > 0) * 255
    box = Image.fromarray(alpha).point(lambda v: 255 if v > 8 else 0).getbbox()
    Image.fromarray(np.dstack([fixed, alpha]), "RGBA").crop(box).save(CUT)
    Image.fromarray(line).crop(box).save(CUTLINE)
    print(CUT.name, box)


def with_shadow(layer, im, x, y):
    a = Image.new("L", layer.size, 0); a.paste(im.getchannel("A"), (x, y))
    for dx, dy, blur, k in ((14, 20, 26, 0.55), (3, 5, 5, 0.40)):
        sh = Image.new("L", layer.size, 0); sh.paste(a, (dx, dy))
        sh = sh.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * k))
        layer.alpha_composite(Image.merge("RGBA", (Image.new("L", layer.size, 0),) * 3 + (sh,)))
    layer.alpha_composite(im, (x, y))


def place(img, w, rot, resample):
    im = img.resize((w * 2, round(img.height * w * 2 / img.width)), resample)
    im = im.rotate(rot, Image.BICUBIC, expand=True)
    return im.resize((round(im.width / 2), round(im.height / 2)), Image.LANCZOS)


def layer():
    out = HERE / "assets" / "bf-layers"; out.mkdir(exist_ok=True)
    src = Image.open(CUT).convert("RGBA"); ln = Image.open(CUTLINE).convert("L")
    for name, (w, rot, x, y) in PLACE.items():
        if ONLY and name not in ONLY:
            continue
        im = place(src, w, rot, Image.LANCZOS)
        lim = ln.resize((w * 2, round(ln.height * w * 2 / ln.width)), Image.NEAREST).rotate(rot, Image.NEAREST, expand=True)
        lim = lim.resize((round(lim.width / 2), round(lim.height / 2)), Image.NEAREST)
        L = Image.new("RGBA", (1280, 720), (0, 0, 0, 0)); with_shadow(L, im, x, y)
        L.save(out / f"{name}.png")
        canvas = Image.new("L", (1280 + 4000, 720 + 4000), 0); canvas.paste(lim, (x + 2000, y + 2000))
        inside = canvas.crop((2000, 2000, 2000 + 1280, 2000 + 720)).point(lambda v: 255 if v > 0 else 0)
        n = sum(1 for v in inside.getdata() if v)
        a = L.getchannel("A").point(lambda v: 255 if v > 200 else 0).getbbox()
        print(name, "端末 x", a[0], "-", a[2], "y", a[1], "-", a[3], " 切り口の画素（キャンバス内）", n, "OK" if n == 0 else "見える!")


def check():
    im = Image.open(CUT).convert("RGBA"); im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
    sheet = Image.new("RGB", (im.width * 2 + 60 + 600, max(im.height, 600) + 60), (40, 40, 44))
    for i, c in enumerate([(10, 18, 36), (255, 225, 0)]):
        bg = Image.new("RGBA", im.size, c + (255,)); bg.alpha_composite(im)
        sheet.paste(bg.convert("RGB"), (20 + i * (im.width + 20), 30))
    big = Image.open(CUT).convert("RGBA")
    bg = Image.new("RGBA", big.size, (10, 18, 36, 255)); bg.alpha_composite(big)
    bb = big.getchannel("A").getbbox()
    z = bg.crop((bb[2] - 300, 0, bb[2], 300)).resize((600, 600), Image.NEAREST)
    sheet.paste(z.convert("RGB"), (im.width * 2 + 50, 30))
    p = HERE.parent / ".claude" / "tmp" / "bf-cut-check.png"; p.parent.mkdir(exist_ok=True); sheet.save(p); print(p)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("cut", "all"): cut()
    if what in ("layer", "all"): layer()
    if what in ("check", "all"): check()
