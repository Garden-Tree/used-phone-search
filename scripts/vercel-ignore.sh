#!/bin/bash
# Vercel の Ignored Build Step（vercel.json の ignoreCommand から呼ぶ）。終了コード 0 = ビルドしない、1 = ビルドする
# - main 以外のブランチはビルドしない（static-export など。プレビューのビルドで Neon を使わない）
# - 前回デプロイから記録・手順・スクレイパーなどサイトの表示に関係しないファイルしか変わっていなければビルドしない
#   （前回の SHA が見つからないときは git diff が失敗して 0 以外 → ビルドする）
[ "$VERCEL_GIT_COMMIT_REF" != "main" ] && exit 0
git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- . \
  ':(exclude)ideas' ':(exclude)docs' ':(exclude)brain' ':(exclude)scratch' \
  ':(exclude)scraper' ':(exclude)rakuten-sync' ':(exclude).github' ':(exclude)*.md'
