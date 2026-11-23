---
name: longform-video
description: used.gadelog.com の YouTube（@used_gadelog「中古スマホ一括検索」）の横動画（8分以上）を作って公開する。構成案 → 数字の集計 → 公式の値の確認 → 台本 → data.json（グラフ・写真・差し替え）→ 声 → 書き出し（並べて作る・使い回し）→ 確認 → サムネ → Studio でアップロード・終了画面・公開 → 固定コメント → lib/videos.ts まで。ユーザーが「横動画作って」「◯◯の動画の台本」「書き出して」「公開して」などと言ったときに使う。
---

# 横動画（longform/）を作って出す（11/23 まとめ）

細かい決まりは `longform/README.md`（台本と画面の決まり・配置 d2・部品・動き・書き出しの速さ）。ネタは スキル `video-ideas`、サムネは スキル `youtube-thumbnail`、競合の型は `docs/video-competitors.md`。報告は日本語・短く。

## 守ること

- **8分以上**。数字を読むだけにしない。**声に出す数字は1章1〜2個**、ほかは横棒（グラフ）で見せる。機種の違いは「何ができるか」で言う
- 値は**公式で確かめたものだけ**（Apple の技術仕様・修理料金・新品価格・iOS の対応＝各版の iPhone ユーザガイド・公開日＝support.apple.com のセキュリティリリース）。確かめられない機能・年は台詞に入れない
- 年の目安（あと何年）は「Apple は約束していない・これまでの記録から数えた見込み」と断る
- 言わないこと: 値動きの予想・店の良し悪し・「最安」「必ず」「絶対」「お得」
- 構成の型: ①ずんだもんの困りごと（最初の15秒）②今日の◯つの道（地図）③機能の紹介 ④決め方 ⑤ずんだもんが決める（決着）⑥終了画面
- 画像は CC（作者・ライセンス・URL）・いらすとや（1作品20点まで・表記は任意）・公式は引用。生成画像は画面を写さない・AI の注釈は画面に出さない（本物に見えるなら Studio の「改変または合成」をオン）
- YouTube の予約は2日後まで（ユーザーが「今日公開」と言えばすぐ公開）。固定コメントはユーザーの OK のあと

## 手順

1. **構成案** `longform/<公開予定日>-<名前>/outline.md`: ねらい（どの型・誰向け）・数字・機能の表（公式の出典つき）・タイトル案3つ・チャプター案
2. **数字**: 前の回の `data-query.ts` を写して `MAIN`・`PEERS` を変える → `npx tsx <dir>/data-query.ts > <dir>/data-query.log`。足りない値は groupBy／median の一時スクリプト（findMany しない）
3. **公式の値**: web-fetch のサブエージェントで Apple の技術仕様（support.apple.com/ja-jp/<番号>・lib/iphoneSpecs.ts の specId）を読む。記載なしは「載っていない」と扱う
4. **台本** `script.md`: 章ごとに `## m:ss 題`・`【画面】…`・台詞（つむぎ＝解説・ずんだもん＝聞き手「〜のだ」）。最後に概要欄（下書き）と出どころのメモ
5. **data.json**: 章ごとの scene（bigNumber・bars（単位 円・年・時間・g、`pickLabel`、`say`）・table・checklist・photo（`images` で差し替え・`crop` で拡大）・endScreen）。cue は台詞の一部
6. **声**: VOICEVOX を起動（`curl -s http://127.0.0.1:50021/version`）→ `npx tsx longform/voice-draft.ts <dir>`。読み違いは `shorts/voice.ts` の READING_FIXES か `longform/script.ts` の forVoice（例: 6s→ロクエス・MP→メガピクセル・電池の値→あたい）。キャッシュの json の `spoken`・`kana` で確かめる
7. **時間割と見本**: `npx tsx longform/timeline.ts <dir>` → `npx tsx longform/render.ts <dir> stills`（contact.png を見る。文字のはみ出し・重なり・罫線）。1コマは `render.ts <dir> frame <秒>`
8. **書き出し**: `npx tsx longform/video.tsx <dir>`（PNG は22本並べて・指紋が同じ PNG は使い回し・映像は CPU 16スレッド・チャンネル登録の GB 素材とクリック音も自動）→ `npx tsx longform/video.tsx <dir> check`（長さ・-14 LUFS・同期3か所）。見せるときは 720p の確認用（30MB 超はスマホに届かない）
9. **公開の前日に数字を取り直す**（2 を再実行）。変わったら台詞・data.json・概要欄を直して書き出し直す（使い回しで数分）
10. **サムネ**: スキル `youtube-thumbnail`（同じシリーズは同じ形。アップロード用は thumbnail.png 以外の名前）
11. **アップロード**: `video.mp4` を `upload-<日付>-<名前>.mp4` にコピー → Chrome の Studio（チャンネル「中古スマホ一括検索」UChEMmzg1RvjZ1LpiTxleGMA。別のチャンネルが開いたらアカウントの切り替えで直す）でアップロードの画面を開き、エクスプローラーでファイルを見せて**ユーザーにドラッグしてもらう**（10MB 超は file_upload できない）
12. **Studio**（サブエージェント）: タイトル（youtube.txt の1行目）・説明（3行目以降をキー入力。JS で入れない）・サムネ・子ども向けでない・AI の使用・タグ・カテゴリ「科学と技術」・終了画面（endscreen.txt の位置・最後の20秒。近すぎの警告が出たら少しずらす）・公開
13. **公開のあと**: 固定コメントの文面を見せて OK をもらってから投稿（README「固定コメント」）・`lib/videos.ts` に動画を足して同じテーマのページに載せる（push はユーザーの OK）・`npx tsx scripts/video-index.ts` で docs/videos.md・STATE（確認台帳）と docs/changes.md
