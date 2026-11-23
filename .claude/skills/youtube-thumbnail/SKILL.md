---
name: youtube-thumbnail
description: used.gadelog.com の YouTube（@used_gadelog「中古スマホ一括検索」）の横動画のサムネを作る。型（まだ使う？・今買い？・発見が最大）を選び、写真を切り抜いて層にし、文字を置いて書き出し、検査してユーザーに見せるまで。ユーザーが「サムネ作って」「サムネを◯◯に似せて」「サムネ直して」などと言ったときに使う。
---

# 横動画のサムネ（11/23 まとめ）

報告は日本語・短く。出す前に必ずユーザーに見せる（[[og-image-style]] と同じ）。数字は script.md（data-query.log）にあるものだけ。

## 守ること

- **文字は 104px 以上**（1280x720）。小さい字は置かない。1枚 2〜3 要素まで
- **文字と札は画面の端から 60px 以上**（EDGE）。**右下（x1030〜・y600〜）に文字を置かない**（再生時間の表示が重なる）
- 文字どうし・文字と端末は重ねない（札が端末に少しかかるのは可）
- **写真**: 実物を優先。自分で撮った写真・Wikimedia Commons の CC（CC0／BY を優先。BY-SA も可・クレジット必須）・Unsplash など。公式の画像は引用のときだけ（サムネでは使わない）。写真の機種と文字の機種を食い違わせない。クレジットは説明欄（画像：…）か各フォルダの `thumb-credit.txt`
- 切り抜きは rembg（isnet-general-use）でマスク → 縁をならす。太い白ふち・無理な正面化はしない
- 出す前に 168x94 に縮めて全部読めるか、縁を拡大して切り抜きが汚くないかを見る
- `thumbnail.png` は video.tsx の meta が上書きする → **アップロードに使うサムネは別の名前**（thumb-S1.png など）

## 型（伸びた順。docs/video-competitors.md の 6 も見る）

| 型 | 中身 | 例 | 作り方 |
| --- | --- | --- | --- |
| **まだ使う？**（持っている人向け・11/22〜） | 暗い紺の地（グラデーション）に、白「iPhone ◯◯」116px・黄「まだ使う？」172px（黒ふち）・白い札に赤「電池◯万円」104px・右に端末の切り抜き（大きく・少し傾けて端からはみ出す） | 13（K3・1日半で1,289回）・SE 3（S1） | `thumb-bf-finding.tsx` の k3・s1 |
| 今買い？（買う人向け） | 同じ配置で「今買い？」＋相場の札 | 15（F1） | 同上の f1 |
| 発見が最大（型R） | 暗い地に、その回だけの発見の数字をいちばん大きく | BF（R1〜R3）・16e（R1〜R5）・地雷・Watch（CTR 4〜5%） | 同上の r1・e1 |
| 2択の値段（競合の型） | 「まだ使える？」の下に2択のカード（電池交換 ◯円／替える ◯円） | タコの 37万回 | 未作成（作るなら thumb-bf-finding.tsx に足す） |

- 明るい地＋問いが最大（13 の今買い？ 緑の地）は CTR 1.6% で弱かった
- 同じシリーズは同じ形にそろえる（ユーザー 11/23「13 まだ使う？のサムネに似せて」）

## 手順（thumb-bf-prep.py → thumb-bf-finding.tsx → thumb-bf-check.py）

1. **セットを足す**: `longform/thumb-bf-prep.py` の SETS に `"<名前>": dict(dir=写真のフォルダ, src=写真, cut=切り抜きの名前, cutline=切り口の印, edges=(写真で端末が切れている辺), layers="<名前>-layers", place={"<層>": (幅px, 角度, 左上x, 左上y)})`。13keep・se3keep を写す
2. **切り抜き**: `python longform/thumb-bf-prep.py cut --set=<名前>`（rembg・cv2 はユーザーの site-packages にあるので -I を付けない）
3. **層**: `python longform/thumb-bf-prep.py layer --set=<名前>` → `assets/<名前>-layers/<層>.png`（落ち影つき）。出力の x・y の範囲を見て、端末が小さすぎないか（13 は x860〜1280・y48〜672 くらい）
4. **文字**: `longform/thumb-bf-finding.tsx` の DIR・LAYERS に `SET === "<名前>"` を足し、`<Frame><Layer/><T><Outlined/></T><Tag/></Frame>` を1枚ずつ書いて plans に足す → `npx tsx longform/thumb-bf-finding.tsx --set=<名前>` で `<フォルダ>/thumb-<案>.png`
5. **検査**: `npx tsx longform/thumb-bf-finding.tsx --set=<名前> --check <dir>` → `python -I longform/thumb-bf-check.py --set=<名前> <dir>`（端からの余白・右下・端末との重なりを数える。新しいセットは check.py の SETS にも足す）
6. ユーザーに見せる（SendUserFile）→ OK ならアップロードのときにこの画像を入れる
7. コミット（`longform/thumb-*.tsx`・`thumb-*.py`。素材の PNG と assets は Git に入れない）

## 記録

- 型を変えたら、このスキルと longform/README.md の「サムネ」の行を直す
- CTR は Studio のアナリティクス（インプレッションのクリック率）。STATE の確認台帳「横動画サムネ」で前後4週を比べる
