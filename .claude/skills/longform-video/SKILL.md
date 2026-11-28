---
name: longform-video
description: used.gadelog.com の YouTube（@used_gadelog「中古スマホ一括検索」）の横動画（8分以上）を作って公開する。構成案 → 数字の集計 → 公式の値の確認 → 台本 → data.json（グラフ・写真・差し替え）→ 声 → 書き出し（並べて作る・使い回し）→ 確認 → サムネ → Studio でアップロード・終了画面・公開 → 固定コメント → lib/videos.ts まで。ユーザーが「横動画作って」「◯◯の動画の台本」「書き出して」「公開して」などと言ったときに使う。
---

# 横動画を作って出す

決まりは `longform/README.md`「1.」、コマンドは「2.」。ネタはスキル `video-ideas`、サムネは `youtube-thumbnail`。報告は日本語・短く。

## 手順

1. **構成案** `longform/<公開予定日>-<名前>/outline.md`: ねらい・数字・機能の表（公式の出典）・タイトル案3つ・チャプター案
2. **数字**: 前の回の `data-query.ts` を写して `MAIN`・`PEERS` を変える → `npx tsx <dir>/data-query.ts > <dir>/data-query.log`（findMany しない）
3. **公式の値**: web-fetch のサブエージェントで Apple の技術仕様（`lib/iphoneSpecs.ts` の specId）
4. **台本** `script.md`: `## m:ss 題`・`【画面】…`・台詞（つむぎ＝解説・ずんだもん＝聞き手「〜のだ」）。最後に概要欄（下書き）と出どころ
5. **data.json**: 章ごとの scene。cue は台詞の一部
6. **声**: VOICEVOX を起動 → `voice-draft.ts`。読み違いは READING_FIXES か forVoice
7. **見本**: `timeline.ts` → `render.ts <dir> stills`（contact.png ではみ出し・重なりを見る）
8. **書き出し**: `video.tsx <dir>` → `video.tsx <dir> check`
9. **公開の前日に数字を取り直す**（2）。変わったら直して書き出し直す
10. **サムネ**: スキル `youtube-thumbnail`
11. **アップロード**: `video.mp4` を `upload-<日付>-<名前>.mp4` にコピー → Chrome の専用プロファイル「used」（list_connected_browsers の Browser 1 を select_browser）の Studio。チャンネル「中古スマホ一括検索」か確かめる。エクスプローラーでファイルを見せ**ユーザーにドラッグしてもらう**（10MB 超は file_upload できない）。上げた後に長さを確かめる
12. **Studio**（サブエージェント）: タイトル・説明（README「説明欄」の形でキー入力）・サムネ（A/B）・子ども向けでない・AI の使用・タグ・カテゴリ「科学と技術」・終了画面（endscreen.txt）・公開／予約（2日後まで）
13. **公開のあと**: 固定コメント・`lib/videos.ts` に足す（push はユーザーの OK）・`npx tsx scripts/video-index.ts`・STATE.md と docs/changes.md

## 台本で気をつけること

- 乗り換えの手間（eSIM はクイックスタートで移せる・公式の条件つき）に触れる
- 1本に話を詰めない（別の切り口は別の回に）
- 例は見る人の場面で言う（「お子さんがいる人なら、運動会で離れた席から」）
- 相づちの「そう」は直前の相手の台詞に答えるときだけ
- 「効く」は使わない。何がどう良くなるかを言う
- 読みの直しの例: 山や海→やまやうみ・少し上→すこしうえ・保険に入れる→はいれる
- 別の画面配置のスキル（anything-frontend-art-direction）は使わない
