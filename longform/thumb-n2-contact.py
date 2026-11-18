"""サムネ N2（thumb-n2-edge.tsx）の一覧と検査。  python -I longform/thumb-n2-contact.py [<文字だけの画像のフォルダ>]
一覧: longform/thumb-n2-contact.png（1行に1本。いまの thumb-N と新しい thumb-N2 を 640x360、その下に 168x94）
検査: `npx tsx longform/thumb-n2-edge.tsx --check <dir>` の文字だけの画像（黒ふちは灰色）から、端からの余白・右下・行の範囲を測る。
      Duo の回は端末の層（assets/n2-layers/duo-16pm.png）との重なりも数える
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROWS = ["2026-11-02-storage", "2026-11-03-duo-vs-mini", "2026-11-01-mbp-vs-mba", "2026-11-02-macbook",
        "2026-11-01-monthly", "2026-11-03-m1-air", "2026-11-07-pixel"]  # 下の3本は 11/18 に足した
DEVICE = {"2026-11-03-duo-vs-mini": "n2-layers/duo-16pm", "2026-11-01-monthly": "v10-layers/a-monthly"}
# 11/18: キーとフォルダ・ファイル名が違う行（一覧は 元 → 新）。立ち絵との重なりは CHARA の位置に置いて数える（thumb-n2-edge.tsx の C2_CHARA と合わせる）
EXTRA = {"2026-11-07-pixel-C2": ("2026-11-07-pixel", "thumb-C.png", "thumb-C2.png")}
ROWS += list(EXTRA)
CHARA = {"2026-11-07-pixel-C2": ("zundamon-shock", 920, 140, 640)}


def files(key):
    return EXTRA.get(key, (key, "thumb-N.png", "thumb-N2.png"))


def layer(key):
    """端末か立ち絵の 1280x720 の透明度（文字との重なりを数える）"""
    if key in DEVICE:
        return Image.open(HERE / "assets" / f"{DEVICE[key]}.png").getchannel("A")
    name, left, top, h = CHARA[key]
    im = Image.open(HERE / "assets" / "chara" / "expr" / f"{name}.png").getchannel("A")
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    out = Image.new("L", (1280, 720), 0); out.paste(im, (left, top)); return out


def contact():
    CW, CH, GAP, SW, SH, LH = 640, 360, 16, 168, 94, 32
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/meiryob.ttc", 22)
    except OSError:
        font = ImageFont.load_default()
    rh = LH + CH + GAP + SH + GAP * 2
    sheet = Image.new("RGB", (GAP + (CW + GAP) * 2, GAP + rh * len(ROWS)), (40, 40, 44))
    d = ImageDraw.Draw(sheet)
    for r, key in enumerate(ROWS):
        folder, *names = files(key)
        for c, n in enumerate(names):
            if not (HERE / folder / n).exists():
                continue
            im = Image.open(HERE / folder / n).convert("RGB"); x = GAP + c * (CW + GAP); y = GAP + r * rh
            d.text((x, y), f"{folder}: {n}", fill=(230, 230, 230), font=font)
            sheet.paste(im.resize((CW, CH), Image.LANCZOS), (x, y + LH))
            sheet.paste(im.resize((SW, SH), Image.LANCZOS), (x, y + LH + CH + GAP))
    sheet.save(HERE / "thumb-n2-contact.png"); print("longform/thumb-n2-contact.png")


def check(folder):
    for key in ROWS:
        if not (Path(folder) / f"{key}.png").exists():
            continue
        ink = Image.open(Path(folder) / f"{key}.png").convert("L").point(lambda v: 255 if v > 24 else 0)
        l, t, r, b = ink.getbbox()
        corner = ink.crop((1030, 600, 1280, 720)).getbbox()
        line = f"{key}: x {l}-{r} y {t}-{b}  余白 左{l} 上{t} 右{1280 - r} 下{720 - b}  右下 {corner}"
        if key in DEVICE or key in CHARA:
            dev = layer(key).point(lambda v: 255 if v > 200 else 0)
            both = Image.new("L", ink.size, 0); both.paste(ink, mask=dev)
            dl = dev.getbbox()
            line += f"  端末 x {dl[0]}-{dl[2]}  重なる画素 {sum(1 for v in both.getdata() if v)}"
        print(line)
        rows, start = [], None
        proj = [ink.crop((0, y, 1280, y + 1)).getbbox() for y in range(720)]
        for y, p in enumerate(proj + [None]):
            if p and start is None:
                start = y
            if not p and start is not None:
                bb = ink.crop((0, start, 1280, y)).getbbox(); rows.append((bb[0], start, bb[2], y)); start = None
        for bb in rows:
            print("   行", bb)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        check(sys.argv[1])
    contact()
