# YouTube ショート（shorts/）

サイトの相場と同じ数字から、縦 1080x1920・約40秒のショート動画（mp4）を作る。方針と根拠は `ideas/youtube-shorts.md`。

## コマンド

```
npx tsx shorts/make-short.tsx drops plan            # 台本 shorts/out/<日付>-drops/script.json を作る（あれば止まる。上書きは --force）
npx tsx shorts/make-short.tsx drops render          # 最新の台本から short.mp4 と youtube.txt を作る
npx tsx shorts/make-short.tsx drops render --dir shorts/out/2026-10-17-drops --keep-frames
```

テーマは今のところ `drops`（今週いちばん値下がりした中古iPhone）だけ。追加するときは `shorts/themes/` に「データ → 台本」を足し、`scenes.tsx` に場面を足す。

## 毎週の流れ

1. `plan` で台本を作る（DB の既存の集計だけ読む）
2. `script.json` の `scenes.comment.lines`（検品担当のひと言）を**自分の判断で書き換える**（3行まで・1行16字以内）。タイトル・説明文も確認
3. 声を入れる週は `<出力先>/voice.m4a`（mp3・wav も可）を置く。コメント場面（22秒）から再生され、BGM は自動で下がる
4. `render` で `short.mp4` と `youtube.txt`（タイトル・説明・ハッシュタグ）を作る。mp4 を再生して確認
5. YouTube に手動でアップロード（API の自動投稿はしない）。同じ動画を X にも投稿する

## BGM

YouTube オーディオライブラリで曲を選んでダウンロードし、`shorts/assets/bgm.mp3` に置く（Git には入らない）。なければ無音の音声トラックが付く。

## セーフエリア

YouTube の画面表示に隠れる上 220px・下 420px・右 140px には文字を置かない（`scenes.tsx` の `SAFE`）。

## 運用の決まり

- 型（見た目・長さ）は統一し、**テーマは毎週ローテーション**（値下がり → 予算 → 2機種比較 → 豆知識）。
- **毎回、検品担当のひと言を人が書く**。テンプレートだけの繰り返し動画は収益化の対象外になりうる（ideas/youtube-shorts.md）。
