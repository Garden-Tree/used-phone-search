"""
サムネ用の表情違いの立ち絵を作る（2026-10-23〜）。chara.py と同じ PSD・同じ切り抜きの考え方
  python longform/chara-expr.py
出力: longform/assets/chara/expr/<名前>.png（Git に入れない・二次配布しない）
"""
from pathlib import Path
from psd_tools import PSDImage
import chara

OUT = chara.OUT / "expr"
EXPR = {
    # ずんだもん: 驚き（目〇〇・上がり眉・口うわー・右手で指差し）
    "zundamon-surprised": ("zundamon", {"!目": "*〇〇", "!眉": "*上がり眉", "!口": "*うわー", "!右腕": "*指差し横", "!顔色": "*ほっぺ基本"}),
    # ずんだもん: 青ざめ（困り眉・口うへえ）
    "zundamon-shock": ("zundamon", {"!目": "*基本目", "!眉": "*困り眉", "!口": "*うへえ", "!顔色": "*青ざめ"}),
    # つむぎ: 驚き（見開く・困る眉・口わあ！）
    "tsumugi-surprised": ("tsumugi", {"!目": "*見開く", "!眉": "*困る", "!口": "*わあ！"}),
    # つむぎ: 得意げ（ウインク・口へっ）
    "tsumugi-wink": ("tsumugi", {"!目": "*ウインク", "!眉": "*普通", "!口": "*へっ"}),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for out, (name, choice) in EXPR.items():
        spec = chara.CHARAS[name]
        psd = PSDImage.open(spec["psd"])
        chara.select(psd, {**spec["pose"], **choice})
        # 指差しの腕が切れないよう、ずんだもんの驚きは左を広く切り抜く
        crop = (60, 100, 800, 1100) if out == "zundamon-surprised" else spec["crop"]
        img = psd.composite(force=True).convert("RGBA").crop(crop)
        img = img.crop(img.getbbox())
        if img.height > chara.HEIGHT:
            img = img.resize((round(img.width * chara.HEIGHT / img.height), chara.HEIGHT))
        img.save(OUT / f"{out}.png")
        print(out, img.size)


if __name__ == "__main__":
    main()
