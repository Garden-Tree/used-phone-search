#!/bin/bash
# Vercel の Ignored Build Step（vercel.json の ignoreCommand から呼ぶ）。
# 終了コードは 0 = ビルドしない・1 = ビルドする だけを返す（それ以外は Vercel がデプロイの失敗として扱う。10/4 に 128 で失敗した）
# - main 以外のブランチはビルドしない（cloudflare-pages など。プレビューのビルドで Neon を使わない）
# - 前回デプロイから記録・手順・スクレイパーなどサイトの表示に関係しないファイルしか変わっていなければビルドしない
# - 前回デプロイのコミットが手元（浅い clone）に無いときは、念のためビルドする
[ "$VERCEL_GIT_COMMIT_REF" != "main" ] && exit 0
prev="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
git cat-file -e "${prev}^{commit}" 2>/dev/null || exit 1
if git diff --quiet "$prev" HEAD -- . \
  ':(exclude)ideas' ':(exclude)docs' ':(exclude)brain' ':(exclude)scratch' \
  ':(exclude)scraper' ':(exclude)rakuten-sync' ':(exclude).github' ':(exclude)*.md'; then
  exit 0
fi
exit 1
