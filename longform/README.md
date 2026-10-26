# 横動画（longform/）

台本（`<フォルダ>/script.md`・つむぎとずんだもんの掛け合い）と数字（`<フォルダ>/data.json`）から、横 1920x1080 の動画を作るための土台。
作り方はショート（`shorts/`）と同じ: React の1コマ → `ImageResponse`（next/og）で PNG → ffmpeg。色は `lib/brandColors.ts` だけ。

## コマンド

```
python -I longform/chara.py                                                 # 立ち絵（assets/src の PSD → assets/chara の PNG。下の「立ち絵」）
npx tsx longform/voice-draft.ts longform/2026-10-21-iphone-dore            # 声だけの試作（voice-draft.m4a・chapters.txt）。VOICEVOX（CPU）が要る
npx tsx longform/timeline.ts    longform/2026-10-21-iphone-dore            # 時間割 timeline.json（エンジン不要。声の長さはキャッシュから）
npx tsx longform/render.ts      longform/2026-10-21-iphone-dore stills     # 章ごとの見本 stills/ch01〜12.png と一覧 stills/contact.png
npx tsx longform/render.ts      longform/2026-10-21-iphone-dore frame 95.5 # その秒の1枚（stills/at-95.5.png。--open で口を開けた絵）
npx tsx longform/video.tsx      longform/2026-10-21-iphone-dore plan       # 区切りの数・PNG の枚数・見積もりだけ
npx tsx longform/video.tsx      longform/2026-10-21-iphone-dore            # 動画全体（video.mp4・chapters.txt・youtube.txt・thumbnail.png）
npx tsx longform/video.tsx      longform/2026-10-21-iphone-dore check      # 長さ・音量・同期3か所・見本6枚（stills/check-*.png）
```

書き出す順: **voice-draft.ts（今の辞書で合成し直す）→ timeline.ts → video.tsx**。新しい回は**終了画面前提**（下の「終了画面」）。古い声（stale）や見積もりの行が残っていると video.tsx は止まる。

- video.tsx は絵が変わるところ（章・台詞・字幕のページ・項目が出る秒）だけ PNG にして（約10分で約110枚）、ffmpeg の concat（1枚ごとの長さ）で 30fps の H.264 にする。項目はふわっと出さず切り替え
- PC が重い処理で落ちるので: 1つずつ順に・ffmpeg は1本ずつ `-threads 2`・優先度「低」。段だけやり直すときは `frames` / `encode` / `audio` / `mux` / `meta`。`--preset medium` で少し小さくなる
- 音: 声（voice-draft/joined.wav）を -16 LUFS に → BGM（shorts/assets/bgm.mp3）をくり返して 0.07 倍・頭2秒で上げ最後4秒で下げる → loudnorm 2パスで -14 LUFS・真のピーク -1。最後の台詞のあと 1.5 秒残す（終了画面があれば、最後の章の絵が出てから 20 秒になるまで BGM だけで残す）。2章目からは章の頭に短いジングル（video.tsx の makeJingle がその場で合成する E5→G#5→B5 の3音・0.75秒・ピーク -18 dBFS。外の音源は使わない）
- 説明文（youtube.txt）: タイトルは script.md の「タイトル案」の 1.、チャプターは実測、リンクは utm_campaign=long_20261021、クレジットは VOICEVOX の2人と BGM、立ち絵があれば「立ち絵：春日部つむぎ公式立ち絵(KASUKABEproject)」「ずんだもん立ち絵：坂本アヒル様」
- `timeline.json`・`frames/`・`video.mp4`・`stills/check-*.png`・`longform/assets/` は Git に入れない（.gitignore）。`stills/`・chapters.txt・youtube.txt・thumbnail.png は残す

## 立ち絵（任意）

`longform/assets/chara/` に置くと話し手の枠に描く（置かなければ名前の札だけ）。**第三者の絵なので Git に入れない（.gitignore）。二次配布は禁止。クレジットは youtube.txt に自動で入る。**

- 元の PSD（各自で配布元から落として `longform/assets/src/` に展開。データとして読むだけ）
  - つむぎ: 春日部つむぎ公式立ち絵素材 v2.0（春日部つくし）`tsumugi/春日部つむぎ立ち絵_公式_v2.0/*.psd`。動画・サムネに使える（収益化可）・加工可・**脱がせた状態は禁止**・二次配布禁止
  - ずんだもん: ずんだもん立ち絵素材 V3.2 基本版（坂本アヒル）`zundamon/ずんだもん立ち絵素材V3.2/*_基本版.psd`。東北ずん子の公式ガイドラインに従う
- `python -I longform/chara.py`（psd-tools が要る）で PNG にする。選ぶレイヤーは chara.py の `CHARAS` に書く（PSDTool の「*」＝兄弟で1つだけ・「!」＝いつも表示）
  - つむぎ: 目「普通」・眉「普通」・服は既定の制服（私服は非表示のまま）・閉じ口「ω」／開き口「わ」
  - ずんだもん: 目「基本目」・眉「基本眉2」・頬「ほっぺ基本」・腕は既定（腰に手）・閉じ口「ほほえみ」／開き口「ほあ」
  - 頭〜腰を切り抜き、高さ 1000px。2枚は同じ切り抜き・同じ大きさ

| ファイル | 中身 |
| --- | --- |
| `tsumugi.png` / `zundamon.png` | 口を閉じた絵（背景は透明の PNG。高さ 1300px を超えると 1200px に縮めて使う） |
| `tsumugi-talk.png` / `zundamon-talk.png` | 口を開けた絵（任意。同じ大きさ・同じ位置）。あれば話している間 0.2 秒ごとに開閉 |

- 画面の端からカードの手前まで（左 x0〜280・右 x1640〜1920）に高さ 560px で下ぞろえ。はみ出た左右は切る。名前の札は絵の下に重ねる
- 話している人は濃く、もう1人は 0.92 倍・暗く
- 口の開閉は PNG を2枚だけ作り、ffmpeg の一覧で交互に並べる（コマは増やさない）
- サムネ（thumbnail.png）は つむぎ の立ち絵があれば右に置く
- 立ち絵の入ったコマ（stills/ch*.png）とサムネは動画の一部としての利用（規約の範囲）。素材の PNG そのものは Git に入れない

## ファイル

| ファイル | 役割 |
| --- | --- |
| `script.ts` | script.md を章・【画面】・台詞に分ける。行の間 0.25 秒・章の間 1.1 秒（ジングルの分）・速さ 1.15・読みの直し（forVoice。「十分」→じゅうぶん（「で十分」がジュップンになる）など） |
| `voice-draft.ts` | 声だけの試作（script.ts を使う） |
| `types.ts` | data.json と timeline.json の型 |
| `timeline.ts` | 台詞ごとの声の長さ → 開始秒・字幕のページ（2行まで）・各項目の出る秒 |
| `scenes.tsx` | 1コマ（`frameAt(timeline, t)`）。いつも出る枠と、中央のカードの部品 |
| `render.ts` | PNG にする（見本の静止画・1枚） |
| `video.tsx` | 動画全体・説明文・チャプター・サムネ・確かめ（check） |
| `art.ts` | 立ち絵（assets/chara/）を読む（video.tsx・render.ts） |
| `chara.py` | 立ち絵を PSD から作る（assets/src/ → assets/chara/） |
| `fonts.ts` | コマ用のフォント（render.ts と video.tsx で共有） |

## 画面の配置（いつも同じ）

- 2章目からは、声の 0.9 秒前（章の間）に章の絵とジングルが出る（その間は字幕なし。cue が章の頭の項目も一緒に出る）
- 左上: 章の帯（`03/12 3万円台`）・右上: used.gadelog.com
- 中央: 白いカード（部品は下の5つ。data.json の `scene.type`）
- 左右: 話し手の枠（左＝ずんだもん・右＝つむぎ）。立ち絵がなければ名前の札だけ（話している人を塗る）。立ち絵は下の「立ち絵」
- 下: 字幕（話し手の名前と色。つむぎ inspect-700・ずんだもん safe）。2行まで、長い台詞はページに分ける。英数字の語・カタカナの語・「1.5万円」は行の途中で切らない
- 最下: 「2026/10/21 時点・大手中古ショップ17店の在庫から」

## 部品（data.json の scene）

| type | 中身 | 例 |
| --- | --- | --- |
| `bigNumber` | 大きな数字・言葉（2〜3個） | 結論（5万円なら iPhone 13）・調べ方（17店・約7万件・1日4回） |
| `bars` | 横棒（機種×相場）＋最安の赤い点・在庫数・おすすめ札。unit は 万円・円・件・機種（件・機種は店ごとの在庫数など。5行以上は文字を小さく） | 予算別の4章・店ごとの在庫（4本目） |
| `pairs` | 2本ずつの棒と差（色は SITE のキー） | Proと無印・新品と中古 |
| `table` | 表（emphasis の列を赤く） | 値下がり・電池の書き方・まとめ |
| `checklist` | 番号つきの行を1つずつ出す | 買う前に見る3つのこと |
| `endScreen` | 終了画面（最後の章だけ）。見出し・動画2枠（`videos` に lib/videos.ts の id と題）・チャンネル登録の丸 | 6本目「次におすすめの動画」 |

- 各項目の `cue` は「この文字列を含む台詞が始まったら出す」。見つからなければ timeline.ts が警告して最初から出す
- 数字は data.json だけに書く（台本の数字をそのまま写す。作る日に取り直したら両方直す）

## 声のキャッシュ

timeline.ts は `shorts/voice.ts` の `synthesize`（オフライン）で声の長さを読む。キャッシュの鍵に辞書（`shorts/voice-dict.json`）が入るため、
ショートで辞書を足すと当たらなくなる。そのときは同じ文・話し手・速さの古いキャッシュで長さだけ測る（`stale: true`）。
書き出す前に voice-draft.ts を回して、今の辞書で合成し直す。

## 終了画面（10/25〜。新しい回は必ず）

登録者が少ないうちは、横動画どうしを YouTube の**終了画面**でつなぐ。最後の章を `endScreen` にして、Studio で要素を重ねる場所を空けておく（5本目までは作り直さない）。

- YouTube の決まり（ヘルプ support.google.com/youtube/answer/6388789・10/25 確認）: 動画の**最後の 5〜20 秒**に置ける・動画は **25 秒以上**・16:9 なら要素は **4つまで**（動画・再生リスト・チャンネル登録など）・位置はプレーヤーの上でドラッグ（グリッドに合わせられる）・**要素の大きさの決まりはヘルプにない**・子ども向けの動画やモバイルのウェブでは出ない・表示中はカードと透かしが消える。ヘルプのコツは「最後の 20 秒を考えて編集する」「要素を声で案内する」
- 台本: 最後の章を「## m:ss 次におすすめの動画」にし、台詞は**20 秒以内**（約3行・90字）。「次はこちらの動画がおすすめ」＋その動画が何の回か＋チャンネル登録。**左・右とは言わない**（YouTube は要素の出し方を変えることがある）。高評価・コメントのお願いは まとめ の章に
- data.json: 最後の章の scene を `{"type": "endScreen", "heading": "次はこちらの動画がおすすめ", "videos": [{"id", "title"}, {"id", "title"}], "note"}`。動画は lib/videos.ts から、テーマが近い順に2本（題は公開時の題）
- 画面の決まり（scenes.tsx の `END_SCREEN`。字幕・立ち絵・章の帯には重ねない）:

| 要素 | 画面の位置（1920x1080） | 割合 |
| --- | --- | --- |
| 動画1 | x342 y324・600x338（16:9） | 左 17.8%・上 30.0%・幅 31.3% |
| 動画2 | x978 y324・600x338 | 左 50.9%・上 30.0%・幅 31.3% |
| チャンネル登録（丸） | x1446 y168・132x132 | 左 75.3%・上 15.6% |

- 枠の中には動画の題を描いておく（終了画面が出ない環境でも何の回かわかる）。Studio で要素をこの点線の枠に重ねる
- **枠の大きさは Studio の要素の実寸**（10/25 に6本目の本番で測った値）: 動画は幅 32.5%（624px）・16:9（351px）、チャンネル登録は約 296px 四方。横一列に「動画・動画・登録」（scenes.tsx の END_SCREEN）。5・6本目は 600px と 132px の枠をカードの中に描いていたため、要素が収まらず2本目と登録が重なり、動画を下にずらして字幕の帯にかかった（6本目は 上44.6%）
- 時間: `tailOf`（scenes.tsx）が、最後の章の絵が出てから動画の終わりまでを **20 秒**にそろえる（台詞のあとは BGM だけ）。台詞が 20 秒を超えると timeline.ts が警告する
- 書き出すと `endscreen.txt`（開始秒・各要素の動画の URL と位置）ができる。`video.tsx check` は `stills/check-endscreen.png` も作る
- Studio: 動画 → 編集 → 終了画面 → 要素「動画」を2つ（「特定の動画を選択」で endscreen.txt の URL）と「登録」を足し、3つとも endscreen.txt の開始秒から終わりまで。枠に合わせて大きさと位置を直し、プレビューで確かめて保存

## 説明欄の楽天モバイル（10/26〜。iPhone の回）

- 最後に「中古スマホにするなら回線も見直す【PR】」と楽天モバイルの1行（PR はリンクのところだけ。先頭の1行は 10/26 にユーザーの判断で外した。動画の中身は楽天モバイルの宣伝ではなく、広告はこの行だけのため。楽天モバイルの回だけは先頭と冒頭に PR）（月額は lib/simPlans.ts の公式の値・確認日つき、リンクは同じファイルの楽天アフィのリンク）。iPad・Mac の回には入れない
- 楽天アフィの決まり: ポイント・値引きで誘わない・解約や転売を促さない・他人の投稿やコメント欄には貼らない（YouTube は認定 SNS）

## 固定コメント（10/25〜。公開したら必ず）

ショートの説明欄・コメントのリンクは押せないので、YouTube からサイトへの道は「ショート → 関連動画（横動画）→ 横動画の説明欄・固定コメント」だけ（10/18〜24 の YouTube からの訪問は0）。公開後、動画のページでコメントを1つ書いて「固定」する。

- 文面: 「動画の数字は<月/日>時点です。<テーマ>の今日の相場と最安値は、サイトで毎日更新しています → <URL>」（1行。リンクは押せる）
- URL: 同じテーマのページに `?utm_source=youtube&utm_medium=comment&utm_campaign=pin_<説明欄と同じ日付>`（説明欄は utm_medium=social なので GA で分けて見られる）
- 入力は computer の type（JS で文字を入れない）。投稿後、⋮ →「固定」→ 確認の「固定」

