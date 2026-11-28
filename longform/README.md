# 横動画（longform/）

横動画の決まりはこのファイルだけ（手順はスキル `longform-video`・サムネは `youtube-thumbnail`・ネタは `video-ideas`）。script.md（つむぎとずんだもんの掛け合い）と data.json から 1920x1080 を作る（React の1コマ → `ImageResponse` で PNG → ffmpeg）。色は `lib/brandColors.ts` だけ。

**題を決める前に `docs/videos.md` を読む。**

# 1. 今の決まり

## 台本

- **8分以上**。声は「なぜ・どう選ぶ・誰に向く」。**声に出す数字は1章1〜2個**、丸めて言う（「約3万円」）。並べ読みしない。ほかは画面（横棒・表）
- **機能の紹介を入れる**: 何ができるようになるか（カメラ・端子・画面・チップ・電池の持ち・Apple Intelligence など）を使う場面で言う
- 値は**公式で確かめたものだけ**（Apple の技術仕様・修理料金・新品価格・iOS の対応＝iPhone ユーザガイド・`lib/iphoneSpecs.ts` ほか）。仕様にない機能は「ない」「ついていない」（「仕様に載っていない」は使わない）
- 構成: ①ずんだもんの困りごと（最初の15秒）②今日の◯つの道 ③機能の紹介 ④決め方 ⑤ずんだもんが決める ⑥終了画面
- 「まだ使う？」: 持っている人向け。電池交換・売って買い替え・新しい機種で増える機能の3つ。個別の回が先、まとめ版は後。比べる相手は**チップが同じ機種を外し**、足すお金が約5万円の機種が中心（名機は最後に「もう少し出せるなら」）
- 数字は data.json だけに書く。**公開の前日に取り直し**、台詞・data.json・説明欄を直す

### 冒頭の1分（最初の1分で半分が離れる）

- 困りごとのあと、題の問いへの答えを短く。**「結論から」と言わない**。会話の自然さを優先。**答えを全部は言わない**（「ここが今日いちばん大事な話」と残す）
- 本編の意外な数字を1つ先に出し、最後に「この先で分かること」を1行
- 冒頭でチャンネル登録を頼まない（いちばん強い発見の章の終わりで。途中1回は可）
- 画面は台詞に合わせて数字が1つずつ出る（10秒前後ごと）

## 配置 d2（既定）

- 立ち絵は字幕の左右（下の角・バストアップ・カードの上）。名札は立ち絵の上に出してフェード
- 字幕の帯 x212〜1708・62px（袋文字・話し手の色の縁）・2行まで（長い台詞はページに分ける）・下は再生バーの分あける
- カード 1888x782（余白16px）・文字の上限 1.3 倍・章の題は上寄せ・本文は大きく
- **脚注（note）は出さない**（出典は説明欄。画像の出典だけ画面）
- 文字の最小 34px（`MIN_FONT`）。**項目の下の補足も 34px 以上**（クレジット・目盛りは MIN_FOOT）
- **見出しに（）を付けない**（中身は文にする）。但し書きは台詞と説明欄で
- 収まらないときは縮めず data.json を短くする（`render.ts stills`・`video.tsx` が止まる）
- 丸数字は数字が真ん中か拡大して見る

## 動き

- 項目・字幕・話し始めは少し下から浮いて止まる（ease-out 約0.27秒・項目6px・字幕3px・立ち絵6px。`animAt`）。控えめに
- 項目は**台詞が触れ始めたときに出す**（ラベルの先頭の語か `say`）。出ている項目に触れたら小さく震える（`resolveMentions`）
- 横棒は約0.6秒で伸び値も数え上がる（同じ秒は0.2秒ずつずらす）。**切り替わった瞬間に伸び切った棒を見せない**。表の金額も数え上がる
- 字幕の残り時間: 話し手の色の線が帯の上辺を伸びる
- 口と立ち絵は声の波形で揺らす（0.1秒ごと・1段2px）。動く所は 30fps
- リップシンク: モーラの時刻から母音の口（ん・っ・間は閉じる。`visemesOf`・口の絵は chara-video-expr.py）
- 表情: 台詞の言葉で替える（`lineExpr`）
- ✓・×: 表の「○」「×」は緑の ✓・赤の ×。チェックリストは説明した順に上から緑の ✓（前は灰色。赤の ✓ は使わない）。自動か checkCue
- 効果音: 項目・写真・✓＝pop、揺れ＝shake1、蛍光ペン＝mark1。0.7秒以内の連続・ジングルの前後は鳴らさない（`seEvents`・`LONGFORM_SE=0` で止める）
- 蛍光ペン: 台詞の頭（10字以内）で触れた項目の行に薄い黄色（`resolveMarks`）
- 章の切り替え: カードが右から 90px 寄る。2章目から章の頭にジングル
- 図解: problems・costs（積み上げ横棒）・flow・versus（ない機能は crosses）・lineup（tab＋丸はんこ・大きく出して自分の場所へ）・stamp・trend・years（divider）・notes・gauges・screen。見本 `longform/fx-sample*`
- 使わない: カメラの寄り・差の札・値のポップ・集中線・think・source

## 画像

- 画像は多く。`photo`（画像＋機能の行）で話が変わるたびに `images` で差し替え。`credit` は画像の下と説明欄（「画像：」）
- 素材: CC（作者・ライセンス・URL。`longform/assets/commons/`）・いらすとや（1作品20点まで）・自分のスクショ
- **公式の画像は引用**: その章に要る分だけ・credit「出典：Apple（URL）」・手を加えない（切り抜きは可・重ねない）
- 生成画像（ComfyUI）は既定で使わない。使うなら機種を特定しない・画面とロゴを写さない・注釈は説明欄・本物に見えれば Studio の「改変または合成」をオン（`longform/assets/ai/`）
- 拡大 `crop: { x, y, w, h }`（割合）は**その話のときだけ**（最初の1枚はしない）。端末の写真は上下の余白を削る
- グラフの単位: 万円・円・件・機種・年・時間・g。札は `pickLabel`（なければ「おすすめ」）

## 言わないこと

- 「あと何年」は「Apple は約束していない。記録からの見込み」と**声と画面で断って**から
- 値動きの予想・店の良し悪し・「最安」「必ず」「絶対」「お得」・確かめていない機能

## 説明欄

順に: ①サイトへのリンク（utm つき）②紹介1文（何を・どの公式の値と何店の相場（日付）で）③チャプター（実測）④クレジット（声・BGM・効果音・立ち絵・素材・画像・サムネの写真）⑤iPhone の回は楽天モバイルの PR ⑥ハッシュタグ。

- **結論・数字の箇条書き・※は入れない**。`video.tsx` の meta がこの形で youtube.txt を組む。Studio にはキー入力（JS で入れない）
- 楽天モバイル（iPhone の回）: 最後に「中古スマホにするなら回線も見直す【PR】」の1行（楽天モバイルの回だけ先頭と冒頭にも）。月額・リンクは `lib/simPlans.ts`（確認日つき）。iPad・Mac の回は入れない。ポイント・値引きで誘わない・解約や転売を促さない・コメント欄には貼らない

## 固定コメント（公開したら必ず）

- 伸びている横動画すべてに入れてよい。先に固定済みがないか見る
- 「動画の数字は公開時点です。<テーマ>の今日の相場…は、サイトで毎日更新しています → <URL>」（1行）
- URL は同じテーマのページ＋`?utm_source=youtube&utm_medium=comment&utm_campaign=pin_<日付>`（説明欄は utm_medium=social）
- computer の type で入力 → ⋮ →「固定」→「固定」

## 予約・終了画面・サムネ

- 公開予約は2日後まで。「今日公開」と言われたらすぐ
- 終了画面（必ず）: 最後の章 `## m:ss 次におすすめの動画`・scene `{"type": "endScreen", "heading": "次はこちらの動画がおすすめ", "videos": [{"id", "title"}×2]}`（`lib/videos.ts` から近い2本）
  - 台詞**20秒以内**（約90字）。何の回か＋チャンネル登録。**左・右と言わない**。高評価・コメントは まとめ の章で
  - 枠は `END_SCREEN`（動画 624x351×2・登録 296px）。絵が出てから終わりまで20秒（`tailOf`）
  - `endscreen.txt` の開始秒・位置で Studio に「動画」2つ（出ないときは「他のチャンネルの動画を検索」に URL）＋「登録」。YouTube の決まり: 最後の5〜20秒・要素4つまで
- サムネはスキル `youtube-thumbnail`。アップロードは `thumbnail.png` 以外の名前

# 2. 仕組みとコマンド

```
python -I longform/chara.py                         # 立ち絵（assets/src の PSD → assets/chara）
npx tsx longform/voice-draft.ts <dir>               # 声（VOICEVOX が要る）
npx tsx longform/timeline.ts    <dir>               # timeline.json（声の長さはキャッシュから）
npx tsx longform/render.ts      <dir> stills        # stills/ch*.png・contact.png
npx tsx longform/render.ts      <dir> frame 95.5    # その秒の1枚（--open で口を開けた絵）
npx tsx longform/video.tsx      <dir> plan          # 見積もりだけ
npx tsx longform/video.tsx      <dir>               # video.mp4・chapters.txt・youtube.txt・endscreen.txt・thumbnail.png
npx tsx longform/video.tsx      <dir> check         # 長さ・音量・同期3か所
npx tsx longform/clip-short.tsx <dir> <開始-終了,…> "<題1>" "<題2>" <名前> <サムネ.png>   # 切り抜きショート clip-<名前>.mp4
```

- 順は **voice-draft.ts → timeline.ts → video.tsx**。古い声（stale）や見積もりの行があると video.tsx は止まる。段だけ: `frames`/`encode`/`audio`/`mux`/`meta`
- Git に入れない: `timeline.json`・`frames/`・`video.mp4`・`stills/check-*.png`・`longform/assets/`。残す: `stills/`・chapters.txt・youtube.txt
- 書き出し: 土台と立ち絵・字幕の線の層に分け、PNG は並べて作り（`LONGFORM_JOBS`）同じ絵は使い回す。音も同じなら使い回す。concat に `option framerate 30` を入れる。**15Hz にしない**。GPU は遅い。見せるときは 720p（30MB 超はスマホに届かない）
- 切り抜き: 区間は timeline.json の start・end。ラリー3〜5つ・合計59秒未満・上に元のサムネ。横動画のない日の 18:00 に予約・関連動画に元の横動画
- 音: 声 -16 LUFS → BGM（`longform/assets/sound/`、なければ `shorts/assets/bgm.mp3`）0.07倍 → loudnorm 2パスで -14 LUFS・ピーク -1。ジングルは `makeJingle`
- youtube.txt: タイトルは script.md「タイトル案」の1.、本文は「概要欄（下書き）」、utm_campaign=`long_YYYYMMDD`
- チャンネル登録の重ね: 最初に「チャンネル登録」と言う台詞で `longform/assets/gb/` を8秒重ねる。縁に緑が残っていないか見る

## data.json の scene

| type | 中身 |
| --- | --- |
| `bigNumber` | 大きな数字・言葉 2〜3個（大きさをそろえる） |
| `bars` | 横棒・最安の点・在庫数・`pickLabel`。2行ラベルなら5行まで |
| `pairs` | 2本ずつの棒と差 |
| `table` | emphasis の列を赤く。列の最長文字の合計 2列 約33em・3列 約32em・5列 約29em まで |
| `checklist` | 番号つきの行 |
| `photo` | 画像＋機能の行・`images`・`crop` |
| `endScreen` | 最後の章だけ |

各項目の `cue` は「この文字列を含む台詞で出す」（無ければ警告して最初から）。

## 声と読み

- `script.ts` が章・【画面】・台詞に分ける（行の間0.25秒・章の間1.1秒・速さ1.15）
- 読み違いは `shorts/voice.ts` の READING_FIXES か `script.ts` の forVoice。キャッシュの `spoken`・`kana` で確かめる
- 辞書（`shorts/voice-dict.json`）を足すとキャッシュが外れる（`stale`）→ 書き出す前に voice-draft.ts。VOICEVOX まわりは `shorts/README.md`

## 立ち絵

`longform/assets/chara/`（なければ名札だけ）。**第三者の絵なので Git に入れない・二次配布禁止**。クレジットは youtube.txt に自動。

- つむぎ: 公式立ち絵素材 v2.0（春日部つくし）・収益化可・加工可・**脱がせた状態は禁止**
- ずんだもん: 立ち絵素材 V3.2（坂本アヒル）・東北ずん子の公式ガイドラインに従う
- レイヤーは `chara.py` の `CHARAS`。声を変えると立ち絵も変わるので保留

## ファイル

`script.ts`（分ける・forVoice）・`voice-draft.ts`・`types.ts`・`timeline.ts`（開始秒・ページ・出る秒）・`scenes.tsx`（`frameAt`・`LAYOUTS`・`END_SCREEN`）・`render.ts`・`video.tsx`・`art.ts`／`chara.py`・`fonts.ts`・`thumb-*`（サムネ）

# 3. 旧配置（作り直すときだけ）

- d1（10/29〜11/22 の回）: `LONGFORM_LAYOUT=d1`
- legacy（10/21〜10/29 の回）: `LONGFORM_LAYOUT=legacy`
