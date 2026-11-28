---
name: youtube-thumbnail
description: used.gadelog.com の YouTube（@used_gadelog「中古スマホ一括検索」）の横動画のサムネを作る。型（まだ使う？・発見が最大）を選び、写真を切り抜いて層にし、文字を置いて書き出し、検査してユーザーに見せるまで。ユーザーが「サムネ作って」「サムネを◯◯に似せて」「サムネ直して」などと言ったときに使う。
---

# 横動画のサムネ

報告は日本語・短く。出す前に必ずユーザーに見せる。数字は data-query.log にあるものだけ。

## 守ること

- **文字は 104px 以上**（1280x720）・1枚 2〜3 要素
- **文字と札は端から 60px 以上**。**右下（x1030〜・y600〜）に文字を置かない**（再生時間）
- 文字どうし・文字と端末を重ねない（札が端末に少しかかるのは可）
- **写真**: 実物を優先（自分の写真・Commons の CC（BY-SA も可・クレジット必須）・Unsplash）。公式の製品画像も引用として可（説明欄に「画像：出典：Apple（URL）」・手を加えない・切り抜きは可）。写真と文字の機種を食い違わせない。クレジットは説明欄か `thumb-credit.txt`
- 切り抜きは rembg（isnet-general-use）→ 縁をならす。暗い地で沈むときは SETS に bright=(1.6, 1.1)・sat・glow。太い白ふち・無理な正面化はしない
- 168x94 に縮めて読めるか、縁を拡大して見る
- `thumbnail.png` は video.tsx が上書きする → **アップロードは別の名前**（thumb-S1.png など）

## 型

| 型 | 中身 | 作り方 |
| --- | --- | --- |
| **まだ使う？**（持っている人向け） | 暗い紺のグラデーション・白「iPhone ◯◯」116px・黄「まだ使う？」172px（黒ふち）・白い札に赤「電池◯万円」104px・右に端末（大きく・少し傾けてはみ出す） | `thumb-bf-finding.tsx` の k3・s1 |
| 発見が最大 | 暗い地に、その回だけの発見の数字をいちばん大きく | 同 r1・e1 |

- 明るい地は弱い（13 の緑の地は CTR 1.6%）。暗い地にする
| 2択の値段（未作成） | 「まだ使える？」の下に2択のカード（電池交換 ◯円／替える ◯円） | 作るなら同ファイルに |

同じシリーズは同じ形にそろえる。

## 手順

1. `longform/thumb-bf-prep.py` の SETS にセットを足す（13keep・se3keep を写す。dir・src・cut・cutline・edges・layers・place）
2. 切り抜き: `python longform/thumb-bf-prep.py cut --set=<名前>`（rembg・cv2 はユーザーの site-packages なので -I を付けない）
3. 層: `python longform/thumb-bf-prep.py layer --set=<名前>`。端末が小さすぎないか（目安 x860〜1280・y48〜672）
4. 文字: `thumb-bf-finding.tsx` の DIR・LAYERS・plans に足す → `npx tsx longform/thumb-bf-finding.tsx --set=<名前>`
5. 検査: `npx tsx longform/thumb-bf-finding.tsx --set=<名前> --check <dir>` → `python -I longform/thumb-bf-check.py --set=<名前> <dir>`（新しいセットは check.py の SETS にも）
6. ユーザーに見せる
7. コミットは `thumb-*.tsx`・`thumb-*.py` だけ（素材の PNG と assets は入れない）

## A/B テスト（毎回）

- 違いが1つの2〜3枚を Studio の「テストと比較」に入れる
- 結果は ideas/YYYY-MM-DD.md と docs/video-metrics.tsv に書き、勝った型をこの表に反映する
