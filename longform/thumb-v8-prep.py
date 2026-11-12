"""サムネ第8弾（thumb-v8.tsx）の写真の下ごしらえ。  python longform/thumb-v8-prep.py [cut|layers|check]（引数なし＝ぜんぶ）
（rembg がユーザーの site-packages にあるので -I は付けない。読むのは assets/ の画像だけ）

1. cut   : 元写真 → 端末だけの透過 PNG `<名前>-cut2.png`（高さ 1500px）
   - rembg（isnet-general-use）で大まかなマスク → いちばん大きい輪郭
   - 輪郭の各点を、法線の向きに ±SNAP px さがして「色がいちばん変わる所」＝本当の縁に寄せる
   - 4辺は直線を当てはめ（Huber）、四隅は輪郭を周方向にガウシアンでならす → 2辺のあいだをなめらかにつなぐ
   - 内側へ INSET px 縮めて背景のにじみを落とし、4倍で描いて縮小（アンチエイリアス）
   - 縁から FRINGE px の色は、内側のいちばん近い画素の色に置き換える（defringe）
2. layers: サムネごとに、端末を最終の大きさ・傾きで置いて、やわらかい落ち影を焼き込んだ 1280x720 の透過 PNG
           → assets/v8-layers/<フォルダ>-<案>.png（thumb-v8.tsx が地と文字のあいだに敷く。置き場所は下の LAYERS）
3. check : 切り抜きを 赤・黄・黒 の地に置き、縁を 200% に拡大した確認画像 → .claude/thumb-ref/cutout-check.png
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
ASSETS = HERE / "assets"
OUT_H = 1500  # 切り抜きの高さ

# name: (元写真, 端末を囲む枠 x0,y0,x1,y1（元写真の座標）, 処理するときの縮尺, 出力先フォルダ)
PHOTOS = {
    "iphone13-starlight": ("stock-photo/unsplash-JSQva3za368-iphone13-colors.jpg", (1500, 300, 2230, 1580), 2.0, "stock-photo"),
    "iphone13-blue": ("stock-photo/unsplash-JSQva3za368-iphone13-colors.jpg", (2790, 300, 3520, 1580), 2.0, "stock-photo"),
    "iphone13-red": ("stock-photo/unsplash-JSQva3za368-iphone13-colors.jpg", (860, 300, 1570, 1580), 2.0, "stock-photo"),
    "iphone14-blue": ("stock-photo/unsplash-zNDH3l4tMs0-iphone14-blue.jpg", (4200, 750, 6300, 4650), 0.5, "stock-photo"),
    "iphone16-ultramarine": ("commons/iphone16-ultramarine.png", (290, 90, 1560, 2090), 1.0, "commons", True),
    "iphone15-black": ("commons/iphone15-black-back.jpg", (650, 120, 2520, 3470), 0.5, "commons"),  # CC BY-SA 4.0
}
SNAP, INSET, FRINGE = 7, 2.2, 3
SIZE_MM = {"iphone13": (71.5, 146.7), "iphone14": (71.5, 146.7), "iphone15": (71.6, 147.6), "iphone16": (71.6, 147.6)}  # 公式の幅・高さ（当てはめる板の縦横比）

_session = None
def rough_mask(rgb: np.ndarray, grabcut: bool = False) -> np.ndarray:
    global _session
    if grabcut:  # isnet が端末の一部（カメラ）しか拾わない写真用（暗い布の上の明るい端末）: 明るさを大津のしきい値で分ける
        v = cv2.GaussianBlur(rgb.max(axis=2), (0, 0), 3)
        _, m = cv2.threshold(v, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        out = np.zeros_like(m); cv2.drawContours(out, [cv2.convexHull(max(cs, key=cv2.contourArea))], -1, 255, -1)
        return out
    from rembg import new_session, remove
    if _session is None:
        _session = new_session("isnet-general-use")
    m = remove(Image.fromarray(rgb), session=_session, only_mask=True)
    return np.asarray(m)

def resample(pts: np.ndarray, n: int) -> np.ndarray:
    """閉じた輪郭を、弧の長さで等間隔の n 点に"""
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(np.r_[pts, pts[:1]], axis=0), axis=1))]
    t = np.linspace(0, d[-1], n, endpoint=False)
    return np.c_[np.interp(t, d, np.r_[pts[:, 0], pts[0, 0]]), np.interp(t, d, np.r_[pts[:, 1], pts[0, 1]])]

def smooth_closed(pts: np.ndarray, sigma: float) -> np.ndarray:
    n = len(pts); k = int(sigma * 4) | 1
    g = cv2.getGaussianKernel(k, sigma).ravel()
    out = np.empty_like(pts)
    for c in range(2):
        v = np.r_[pts[-k:, c], pts[:, c], pts[:k, c]]
        out[:, c] = np.convolve(v, g, mode="same")[k:k + n]
    return out

def normals(pts: np.ndarray) -> np.ndarray:
    t = np.roll(pts, -3, axis=0) - np.roll(pts, 3, axis=0)
    t /= np.linalg.norm(t, axis=1, keepdims=True) + 1e-9
    nrm = np.c_[t[:, 1], -t[:, 0]]
    c = pts.mean(axis=0)
    if np.mean(np.sum(nrm * (pts - c), axis=1)) < 0:
        nrm = -nrm
    return nrm  # 外向き

def snap_to_edge(pts: np.ndarray, rgb: np.ndarray, reach: int) -> np.ndarray:
    """各点を法線にそって ±reach px さがし、色の変化がいちばん大きい所へ"""
    lab = cv2.cvtColor(cv2.GaussianBlur(rgb, (0, 0), 1.2), cv2.COLOR_RGB2LAB).astype(np.float32)
    nrm = normals(smooth_closed(pts, 6))
    offs = np.arange(-reach - 2, reach + 3, dtype=np.float32)
    xs = pts[:, 0:1] + nrm[:, 0:1] * offs; ys = pts[:, 1:2] + nrm[:, 1:2] * offs
    prof = cv2.remap(lab, xs.astype(np.float32), ys.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    grad = np.linalg.norm(prof[:, 4:] - prof[:, :-4], axis=2)  # 幅4の差分 → offs[2:-2] の位置
    grad *= np.exp(-0.5 * (offs[2:-2] / (reach * 0.9)) ** 2)  # 遠いほど少し割り引く
    best = offs[2:-2][np.argmax(grad, axis=1)]
    best = cv2.medianBlur(np.tile(best.astype(np.float32)[None], (3, 1)), 5)[1] if len(best) > 5 else best  # 飛び値を落とす
    return pts + nrm * best[:, None]

def side_lines(sm: np.ndarray):
    """4辺それぞれに直線を当てはめる（角の丸みにかからない範囲・Huber）→ 四隅＝となりの直線の交点（上左・上右・下右・下左）"""
    quad = cv2.boxPoints(cv2.minAreaRect(sm.astype(np.float32)))
    lines = []
    for i in range(4):
        a, b = quad[i], quad[(i + 1) % 4]
        ab = b - a; L = np.linalg.norm(ab); u = ab / L
        rel = sm - a; t = rel @ u / L; dist = np.abs(rel @ np.array([-u[1], u[0]]))
        other = np.linalg.norm(quad[(i + 2) % 4] - b); r = 0.24 * min(L, other) / L
        on = (dist < 0.06 * min(L, other)) & (t > r) & (t < 1 - r)
        pts = sm[on].astype(np.float32)
        for _ in range(3):  # 外れ（葉・ボタン・影）を落としながら当てはめ直す
            vx, vy, x0, y0 = cv2.fitLine(pts, cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
            res = np.abs((pts[:, 0] - x0) * -vy + (pts[:, 1] - y0) * vx)
            keep = res < max(1.0, 2.0 * np.median(res) + 0.5)
            if keep.sum() < 30: break
            pts = pts[keep]
        lines.append((np.array([x0, y0], np.float64), np.array([vx, vy], np.float64)))
    def cross(l1, l2):
        (p, d), (q, e) = l1, l2
        t = np.linalg.solve(np.c_[d, -e], q - p)[0]
        return p + d * t
    corners = np.array([cross(lines[i - 1], lines[i]) for i in range(4)])
    # 上左から時計回りに並べ直す
    c = corners.mean(axis=0); ang = np.arctan2(corners[:, 1] - c[1], corners[:, 0] - c[0])
    corners = corners[np.argsort(ang)]  # 画像の座標（y 下向き）では角度の小さい順＝上左→上右→下右→下左
    return corners

def model_outline(w: float, h: float, r: float, n: float, inset: float = 0.0, per: int = 160) -> np.ndarray:
    """幅 w・高さ h・角の丸み r の「角丸の板」の輪郭（n=2 が円弧、大きいほど Apple の角に近い四角ばった丸み）"""
    w2, h2, r2 = w - inset * 2, h - inset * 2, max(r - inset, 1e-3)
    th = np.linspace(0, np.pi / 2, per)
    a = np.c_[r2 - r2 * np.cos(th) ** (2 / n), r2 - r2 * np.sin(th) ** (2 / n)]  # 上左の角: (0,r)→(r,0)。以下、時計回り
    tl = a
    tr = np.c_[w2 - a[::-1, 0], a[::-1, 1]]
    br = np.c_[w2 - a[:, 0], h2 - a[:, 1]]
    bl = np.c_[a[::-1, 0], h2 - a[::-1, 1]]
    return np.r_[tl, tr, br, bl] + inset

def fit_model(pts: np.ndarray, size_mm, inset_px: float) -> np.ndarray:
    """輪郭の点に「角丸の板を透視でゆがめた形」を当てはめる。4辺＝直線、角＝丸み r と形 n を総当たりで"""
    sm = smooth_closed(pts, 3)
    corners = side_lines(sm)
    w, h = size_mm
    Hm = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), corners.astype(np.float32))
    back = cv2.perspectiveTransform(sm[None].astype(np.float32), np.linalg.inv(Hm))[0]  # 輪郭を板の座標（mm）へ
    # 角のあたりの点だけで r・n を決める
    near = (np.minimum(back[:, 0], w - back[:, 0]) < 0.3 * w) & (np.minimum(back[:, 1], h - back[:, 1]) < 0.3 * w)
    cpts = back[near]
    best = None
    for n in (2.0, 2.2, 2.4, 2.7, 3.0):
        for r in np.arange(0.10, 0.30, 0.004) * w:
            m = model_outline(w, h, r, n, per=120)
            d = np.sqrt(((cpts[:, None, :] - m[None, ::2, :]) ** 2).sum(-1)).min(axis=1)
            e = np.median(d)
            if best is None or e < best[0]: best = (e, r, n)
    _, r, n = best
    px_per_mm = np.linalg.norm(corners[1] - corners[0]) / w
    out = model_outline(w, h, r, n, inset=inset_px / px_per_mm, per=400)
    print(f"   角の丸み r={r / w:.3f}w  n={n}  ずれ(中央値) {best[0] * px_per_mm:.2f}px")
    return cv2.perspectiveTransform(out[None].astype(np.float32), Hm)[0].astype(np.float64)

def defringe(rgb: np.ndarray, alpha: np.ndarray, px: int) -> np.ndarray:
    """縁から px の帯の色を、内側の色をならしたもの（正規化したぼかし）に置き換える"""
    inner = cv2.erode((alpha > 250).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (px * 2 + 1, px * 2 + 1))).astype(np.float32)
    num = cv2.GaussianBlur(rgb.astype(np.float32) * inner[..., None], (0, 0), px * 1.2)
    den = cv2.GaussianBlur(inner, (0, 0), px * 1.2)[..., None]
    fill = num / np.maximum(den, 1e-4)
    w = np.clip(den * 4, 0, 1) * (1 - inner[..., None])  # 帯のうち、内側の色が届く所だけ
    return np.clip(rgb * (1 - w) + fill * w, 0, 255).astype(np.uint8)

def fix_leaf(out: np.ndarray) -> np.ndarray:
    """iPhone 14: 手前のぼけた葉が左上の縁（フレーム）にかぶって緑がのっている → 縁からの距離ごとの色を、葉のかからない下の行から取って塗り直す"""
    rgb, alpha = out[..., :3].astype(np.float32), out[..., 3]
    d = cv2.distanceTransform((alpha > 128).astype(np.uint8), cv2.DIST_L2, 5)
    H, W = alpha.shape; D = 40
    clean = slice(int(H * 0.42), int(H * 0.50))  # 左の縁がきれいに見えている行
    prof = np.array([rgb[clean, :W // 4][(d[clean, :W // 4] >= k) & (d[clean, :W // 4] < k + 1)].mean(axis=0) for k in range(D)])
    yy, xx = np.mgrid[:H, :W]
    green = rgb[..., 1] > rgb[..., 2] - 14  # 端末は青（B > G）。葉は G が勝つ
    m = ((d < D - 1) & (d > 0) & (xx < W * 0.2) & (yy < H * 0.40) & (yy > H * 0.02) & green).astype(np.float32)
    m = cv2.GaussianBlur(cv2.dilate(m, np.ones((9, 9), np.uint8)), (0, 0), 4) * ((d < D - 1) & (xx < W * 0.2) & (yy < H * 0.42))
    fill = prof[np.clip(d.astype(int), 0, D - 1)]
    out[..., :3] = np.clip(rgb * (1 - m[..., None]) + fill * m[..., None], 0, 255).astype(np.uint8)
    return out

def cut(name: str) -> None:
    rel, (x0, y0, x1, y1), scale, folder, *gc = PHOTOS[name]
    src = Image.open(ASSETS / rel).convert("RGB").crop((x0, y0, x1, y1))
    if scale != 1.0:
        src = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    rgb = np.asarray(src)
    m = rough_mask(rgb, bool(gc))
    cs, _ = cv2.findContours((m > 127).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea).reshape(-1, 2).astype(np.float64)
    pts = resample(c, 2400)
    pts = smooth_closed(pts, 4)
    pts = snap_to_edge(pts, rgb, SNAP)
    pts = fit_model(pts, SIZE_MM[name.split("-")[0]], INSET)
    # まっすぐ立てる（最小の外接長方形の傾きを戻す）→ 高さ OUT_H に
    (cx, cy), (rw, rh), ang = cv2.minAreaRect(pts.astype(np.float32))
    if rw > rh:
        rw, rh, ang = rh, rw, ang - 90
    while ang > 45: ang -= 90
    while ang < -45: ang += 90
    k = OUT_H / rh; S = 4
    M = cv2.getRotationMatrix2D((cx, cy), ang, k)
    W, H = int(np.ceil(rw * k)) + 8, OUT_H + 8
    M[0, 2] += W / 2 - cx; M[1, 2] += H / 2 - cy
    warped = cv2.warpAffine(rgb, M, (W, H), flags=cv2.INTER_LANCZOS4 if k > 1 else cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)
    p2 = (np.c_[pts, np.ones(len(pts))] @ M.T)
    big = np.zeros((H * S, W * S), np.uint8)
    cv2.fillPoly(big, [np.round(p2 * S * 16).astype(np.int32)], 255, lineType=cv2.LINE_AA, shift=4)
    alpha = cv2.resize(big, (W, H), interpolation=cv2.INTER_AREA)
    out = np.dstack([defringe(warped, alpha, FRINGE), alpha])
    ys, xs = np.nonzero(alpha)
    out = np.ascontiguousarray(out[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    if name == "iphone14-blue":
        out = fix_leaf(out)
    Image.fromarray(out, "RGBA").save(ASSETS / folder / f"{name}-cut2.png")
    print(name, out.shape[1], "x", out.shape[0], f"rot {ang:.2f} x{k * scale:.2f}（元写真比）")

# ───────────────────────── サムネごとの端末の層 ─────────────────────────
# (名前, 端末の中心 x, 上の端 y, 高さ, 傾き（度・時計回りが正）)
LAYERS = {
    "2026-10-21-iphone-dore-K": [("iphone13-starlight", 996, 236, 440, -3), ("iphone14-blue", 1150, 236, 440, 3)],
    "2026-10-21-iphone-dore-K-sa": [("iphone13-starlight", 214, 372, 400, 0), ("iphone14-blue", 640, 372, 400, 0), ("iphone15-black", 1066, 372, 400, 0)],
    "2026-10-21-iphone-dore-L": [("iphone13-starlight", 1078, 26, 668, 5)],
    "2026-10-24-where-to-buy-K": [("iphone13-starlight", 806, 204, 486, -4), ("iphone16-ultramarine", 1100, 204, 486, 4)],
    "2026-10-24-where-to-buy-L": [("iphone13-starlight", 846, 204, 480, -7), ("iphone16-ultramarine", 1088, 56, 540, 6)],
}

def find(name: str) -> Path:
    return ASSETS / PHOTOS[name][3] / f"{name}-cut2.png"

def with_shadow(layer: Image.Image, im: Image.Image, x: int, y: int) -> None:
    """やわらかい落ち影（右下へ・大きくぼかす）＋きわの細い影 → その上に端末"""
    a = Image.new("L", layer.size, 0); a.paste(im.getchannel("A"), (x, y))
    for dx, dy, blur, k in ((14, 20, 26, 0.50), (3, 5, 5, 0.38)):
        sh = Image.new("L", layer.size, 0); sh.paste(a, (dx, dy))
        sh = sh.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * k))
        layer.alpha_composite(Image.merge("RGBA", (Image.new("L", layer.size, 0),) * 3 + (sh,)))
    layer.alpha_composite(im, (x, y))

def layers() -> None:
    out_dir = ASSETS / "v8-layers"; out_dir.mkdir(exist_ok=True)
    for key, items in LAYERS.items():
        layer = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
        for name, cx, top, h, rot in items:
            im = Image.open(find(name)).convert("RGBA")
            # 2倍で縮めてから回し、最後に半分に（回転のぎざぎざを消す）
            w2, h2 = round(im.width * h * 2 / im.height), h * 2
            im = im.resize((w2, h2), Image.LANCZOS)
            if rot:
                im = im.rotate(-rot, Image.BICUBIC, expand=True)
            im = im.resize((round(im.width / 2), round(im.height / 2)), Image.LANCZOS)
            with_shadow(layer, im, round(cx - im.width / 2), round(top + h / 2 - im.height / 2))
        layer.save(out_dir / f"{key}.png")
        print("layer", key)

def check() -> None:
    """切り抜きを 赤・黄・黒 の地に。左＝全体、右＝四隅と左右の辺を 200%（サムネで高さ 690 に置いたときの倍）で"""
    names = list(PHOTOS)
    bgs = [(122, 20, 20), (255, 225, 0), (11, 11, 15)]
    TH, Z = 456, 224
    cellw = 310 + Z * 3 + 30
    sheet = Image.new("RGB", (cellw * len(bgs), (TH + 24) * len(names)), "white")
    for r, name in enumerate(names):
        im = Image.open(find(name)).convert("RGBA")
        small = im.resize((round(im.width * TH / im.height), TH), Image.LANCZOS)
        z = im.resize((round(im.width * 1380 / im.height), 1380), Image.LANCZOS)
        zw, zh = z.size
        spots = [(-24, -24), (zw - Z + 24, -24), (-24, zh // 2 - Z // 2), (zw - Z + 24, zh // 2 - Z // 2), (-24, zh - Z + 24), (zw - Z + 24, zh - Z + 24)]
        for c, bg in enumerate(bgs):
            cell = Image.new("RGBA", (cellw, TH + 24), bg + (255,))
            cell.alpha_composite(small, (12, 12))
            for i, (zx, zy) in enumerate(spots):
                win = Image.new("RGBA", (Z, Z), bg + (255,))
                canvas = Image.new("RGBA", (zw + 400, zh + 400), (0, 0, 0, 0)); canvas.alpha_composite(z, (200, 200))
                win.alpha_composite(canvas.crop((zx + 200, zy + 200, zx + 200 + Z, zy + 200 + Z)))
                cell.alpha_composite(win, (250 + (i % 2) * (Z + 8) + (0 if i < 4 else 0), 12) if False else (310 + (i // 2) * (Z + 8), 12 + (i % 2) * (Z + 8)))
            sheet.paste(cell.convert("RGB"), (c * cellw, r * (TH + 24)))
    ref = HERE.parent / ".claude" / "thumb-ref"; ref.mkdir(parents=True, exist_ok=True)
    sheet.save(ref / "cutout-check.png"); print(sheet.size)

if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    only = sys.argv[2:] or list(PHOTOS)
    if what in ("cut", "all"):
        for n in only: cut(n)
    if what in ("layers", "all"): layers()
    if what in ("check", "all"): check()
