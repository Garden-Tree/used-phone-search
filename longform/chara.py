"""
横動画の立ち絵を PSD から作る（longform/assets/src/ → longform/assets/chara/。どちらも Git に入れない）

    python -I longform/chara.py

- 立ち絵の PSD は利用者が各配布元から落として longform/assets/src/ に展開しておく（二次配布になるので Git に入れない）
    つむぎ:     tsumugi/春日部つむぎ立ち絵_公式_v2.0/春日部つむぎ立ち絵_公式_v2.0.psd（春日部つくし・KASUKABEproject）
    ずんだもん: zundamon/ずんだもん立ち絵素材V3.2/ずんだもん立ち絵素材V3.2_基本版.psd（坂本アヒル）
- PSD はデータとして読むだけ（レイヤーの表示を切り替えて重ねる）。psd-tools が要る（pip install psd-tools）
- PSDTool の決まり: 名前が「*」で始まるレイヤーは兄弟のうち1つだけ表示（ラジオ）・「!」で始まるグループはいつも表示。
  それ以外は PSD に保存された表示のまま（つむぎは制服・私服は非表示のまま。服は変えない）
- 出力: <name>.png（口を閉じた絵）と <name>-talk.png（口を開けた絵）。同じ切り抜き・同じ大きさ（話している間の口の開閉で絵がずれない）
  胸から上（腰まで）を縦長に切り抜き、高さ HEIGHT px に縮める。透明な余白は2枚の合わせた範囲で詰める
"""
import site
import sys

# -I（分離モード）ではユーザーの site-packages が外れるので、psd-tools のために足す
sys.path.append(site.getusersitepackages())

from pathlib import Path  # noqa: E402

from PIL import Image  # noqa: E402
from psd_tools import PSDImage  # noqa: E402

HERE = Path(__file__).resolve().parent
SRC = HERE / "assets" / "src"
OUT = HERE / "assets" / "chara"
HEIGHT = 1000

# 表示するレイヤー: {グループ名: 表示する子（ラジオなので1つ）}。書いていないグループは PSD の既定のまま
CHARAS = {
    "tsumugi": {
        "psd": SRC / "tsumugi/春日部つむぎ立ち絵_公式_v2.0/春日部つむぎ立ち絵_公式_v2.0.psd",
        "pose": {"!目": "*普通", "!眉": "*普通"},
        "closed": {"!口": "*ω"},  # 既定の口（閉じたω）
        "talk": {"!口": "*わ"},  # 開いた口
        # 切り抜き（PSD の座標 x0, y0, x1, y1）: 頭の上〜スカートのすそ。顔（x 1054〜1437）を真ん中に
        "crop": (650, 110, 1790, 2200),
    },
    "zundamon": {
        "psd": SRC / "zundamon/ずんだもん立ち絵素材V3.2/ずんだもん立ち絵素材V3.2_基本版.psd",
        # 既定は怒り眉・口「ほう」なので、にこやかな顔に変える。腕は既定（腰に手）・枝豆も既定
        "pose": {"!目": "*基本目", "!眉": "*基本眉2", "!顔色": "*ほっぺ基本"},
        "closed": {"!口": "*ほほえみ"},
        "talk": {"!口": "*ほあ"},
        # 頭の枝豆の先〜腰
        "crop": (230, 100, 800, 1100),
    },
}


def select(psd: PSDImage, choice: dict[str, str]) -> None:
    for g in psd:
        if g.name not in choice:
            continue
        names = [c.name for c in g]
        if choice[g.name] not in names:
            raise SystemExit(f"レイヤーがありません: {g.name}/{choice[g.name]}（あるもの: {names}）")
        for c in g:
            if c.name.startswith("*"):
                c.visible = c.name == choice[g.name]


def compose(spec: dict, mouth: str) -> Image.Image:
    psd = PSDImage.open(spec["psd"])
    select(psd, {**spec["pose"], **spec[mouth]})
    img = psd.composite(force=True)
    return img.convert("RGBA").crop(spec["crop"])


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, spec in CHARAS.items():
        closed, talk = compose(spec, "closed"), compose(spec, "talk")
        # 2枚を合わせた不透明の範囲で余白を詰める（同じ位置のまま）
        box = closed.getbbox()
        tb = talk.getbbox()
        box = (min(box[0], tb[0]), min(box[1], tb[1]), max(box[2], tb[2]), max(box[3], tb[3]))
        for img, suffix in ((closed, ""), (talk, "-talk")):
            img = img.crop(box)
            w = round(img.width * HEIGHT / img.height)
            img = img.resize((w, HEIGHT), Image.LANCZOS)
            path = OUT / f"{name}{suffix}.png"
            img.save(path, optimize=True)
            print(f"{path.relative_to(HERE.parent)}  {w}x{HEIGHT}")


if __name__ == "__main__":
    main()
