"""
横動画の表情違いの立ち絵（11/27〜）。chara.py のふだんの絵と同じ切り抜き・同じ大きさで、表情ごとに口を閉じた絵と開けた絵を作る
（話している間の口の開閉はそのまま。絵の位置もずれない）。腕は変えない（切り抜きの外に出るため）
  python longform/chara-video-expr.py
出力: longform/assets/chara/<名前>-<表情>.png と <名前>-<表情>-talk.png（Git に入れない・二次配布しない）
"""
from PIL import Image
from psd_tools import PSDImage
import chara

EXPR = {
    "zundamon": {
        # 驚き（目〇〇・上がり眉）
        "surprised": ({"!目": "*〇〇", "!眉": "*上がり眉", "!顔色": "*ほっぺ基本"}, "*ほう", "*うわー"),
        # 青ざめ（困り眉）
        "shock": ({"!目": "*基本目", "!眉": "*困り眉", "!顔色": "*青ざめ"}, "*うへえ", "*ほあ"),
    },
    "tsumugi": {
        # 驚き（見開く・困る眉）
        "surprised": ({"!目": "*見開く", "!眉": "*困る"}, "*ω", "*わあ！"),
        # 得意げ（ウインク）
        "wink": ({"!目": "*ウインク", "!眉": "*普通"}, "*へっ", "*わ"),
    },
}


def comp(spec: dict, choice: dict) -> Image.Image:
    psd = PSDImage.open(spec["psd"])
    chara.select(psd, {**spec["pose"], **choice})
    return psd.composite(force=True).convert("RGBA").crop(spec["crop"])


def main() -> None:
    for name, exprs in EXPR.items():
        spec = chara.CHARAS[name]
        # ふだんの絵（chara.py）と同じ余白の詰め方
        closed, talk = comp(spec, spec["closed"]), comp(spec, spec["talk"])
        box = closed.getbbox()
        tb = talk.getbbox()
        box = (min(box[0], tb[0]), min(box[1], tb[1]), max(box[2], tb[2]), max(box[3], tb[3]))
        for ex, (face, mouth_closed, mouth_talk) in exprs.items():
            for mouth, suffix in ((mouth_closed, ""), (mouth_talk, "-talk")):
                img = comp(spec, {**face, "!口": mouth}).crop(box)
                w = round(img.width * chara.HEIGHT / img.height)
                img = img.resize((w, chara.HEIGHT), Image.LANCZOS)
                path = chara.OUT / f"{name}-{ex}{suffix}.png"
                img.save(path, optimize=True)
                print(path.name, img.size)


if __name__ == "__main__":
    main()
